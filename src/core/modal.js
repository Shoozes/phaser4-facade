// @ts-check

import {
    DEFAULT_MODAL_CLOSE_MS,
    DEFAULT_MODAL_INPUT_BLOCK_MS,
    DEFAULT_MODAL_OPEN_MS
} from "./constants.js";
import {
    consumeInputEvent,
    modalInputBlockMs as computeModalInputBlockMs,
    normalizeDelayMs
} from "./input.js";
import { clamp } from "./math.js";

/**
 * @typedef {Record<string, any>} RuntimeModalOptions
 * @typedef {Record<string, any>} RuntimeModal
 * @typedef {{
 *   display_width: number,
 *   display_height: number,
 *   consume_pointer: (blockMs: number, pointer?: unknown) => unknown,
 *   release_pointer: (pointer: unknown, blockMs: number) => unknown,
 *   begin_input_transition: (blockMs: number) => (() => void),
 *   pause_input: (blockMs: number) => unknown,
 *   clear_input_gate: () => unknown
 * }} RuntimeModalApi
 * @typedef {{
 *   scene: any,
 *   screen: { add: (items: unknown[]) => unknown },
 *   modals: RuntimeModal[],
 *   render?: { resolution?: number }
 * }} RuntimeModalState
 * @typedef {{
 *   ensureTextures: (scene: unknown) => unknown,
 *   getModalTheme: () => RuntimeModalOptions,
 *   createNineSliceObject: (scene: unknown, x: number, y: number, w: number, h: number, options: unknown) => unknown,
 *   createButton: (scene: unknown, text: unknown, x: number, y: number, w: number, h: number, callback: () => void, options: RuntimeModalOptions) => unknown
 * }} RuntimeModalToolkit
 */

/**
 * @param {RuntimeModalOptions} options
 */
function resolveModalInputBlockMs(options) {
    return computeModalInputBlockMs(options, DEFAULT_MODAL_INPUT_BLOCK_MS);
}

/**
 * @param {RuntimeModal} modal
 * @param {unknown} explicitSize
 * @param {unknown} themedSize
 * @param {number} wideSize
 * @param {number} narrowSize
 */
function responsiveModalSize(modal, explicitSize, themedSize, wideSize, narrowSize) {
    if (explicitSize !== undefined) return Number(explicitSize);
    const preferred = Number(themedSize || wideSize);
    const t = clamp((modal.width - 320) / 220, 0, 1);
    return Math.round(narrowSize + (preferred - narrowSize) * t);
}

/**
 * @param {RuntimeModalApi} api
 * @param {RuntimeModalState} state
 * @param {RuntimeModalOptions | undefined} options
 * @param {RuntimeModalToolkit} uiToolkit
 */
export function createModal(api, state, options, uiToolkit) {
    options = options || {};
    const scene = state.scene;
    uiToolkit.ensureTextures(scene);
    const modalTheme = uiToolkit.getModalTheme();

    /** @type {RuntimeModal} */
    const modal = {
        closed: false,
        closing: false,
        ready: false,
        overlay: null,
        container: null,
        handlePointerUp: null,
        finishTransition: null,
        /**
         * @param {unknown} reason
         */
        close(reason) {
            if (modal.closed || modal.closing) return modal;
            modal.closing = true;
            modal.ready = false;
            api.consume_pointer(resolveModalInputBlockMs(options));
            modal.finishTransition = api.begin_input_transition(resolveModalInputBlockMs(options));
            const closeMs = normalizeDelayMs(options.closeMs, DEFAULT_MODAL_CLOSE_MS, 0);
            const completeClose = () => {
                if (modal.closed) return;
                if (modal.finishTransition) {
                    modal.finishTransition();
                    modal.finishTransition = null;
                }
                modal.destroy(reason || "close");
            };
            scene.tweens.killTweensOf([modal.overlay, modal.container]);
            scene.tweens.add({
                targets: modal.overlay,
                alpha: 0,
                duration: closeMs,
                ease: "Expo.Out"
            });
            scene.tweens.add({
                targets: modal.container,
                alpha: 0,
                scaleX: options.closeScale || 0.28,
                scaleY: options.closeScale || 0.28,
                y: modal.centerY + 26,
                duration: closeMs,
                ease: "Expo.Out",
                onComplete: completeClose
            });
            scene.time.delayedCall(closeMs + 80, completeClose);
            return modal;
        },
        /**
         * @param {unknown} reason
         */
        destroy(reason) {
            if (modal.closed) return modal;
            modal.closed = true;
            const blockMs = resolveModalInputBlockMs(options);
            if (!modal.closing) api.pause_input(blockMs);
            if (modal.finishTransition) {
                modal.finishTransition();
                modal.finishTransition = null;
            }
            state.modals = state.modals.filter((item) => item !== modal);
            if (state.modals.length === 0) {
                api.clear_input_gate();
            }
            if (modal.handlePointerUp) scene.input.off("pointerup", modal.handlePointerUp);
            if (modal.container) modal.container.destroy(true);
            if (modal.overlay) modal.overlay.destroy();
            if (typeof options.onClose === "function") options.onClose(reason || "destroy", modal);
            return modal;
        },
        layout() {
            const margin = options.margin === undefined ? 28 : options.margin;
            const maxW = Math.max(260, api.display_width - margin * 2);
            const width = Math.min(options.width || 560, maxW);
            const defaultHeight = api.display_width < 420 ? 340 : 420;
            const height = Math.min(options.height || defaultHeight, Math.max(260, api.display_height - margin * 2));
            modal.width = width;
            modal.height = height;
            modal.centerX = api.display_width / 2;
            modal.centerY = api.display_height / 2;

            if (modal.overlay) {
                modal.overlay.setSize(api.display_width, api.display_height);
                modal.overlay.setPosition(0, 0);
            }
            if (modal.container) {
                modal.container.setPosition(modal.centerX, modal.centerY);
            }
            modal.panelRect = {
                x1: modal.centerX - modal.width / 2,
                y1: modal.centerY - modal.height / 2,
                x2: modal.centerX + modal.width / 2,
                y2: modal.centerY + modal.height / 2
            };
            modal.closeRect = {
                x1: modal.centerX + modal.width / 2 - 68,
                y1: modal.centerY - modal.height / 2 + 16,
                x2: modal.centerX + modal.width / 2 - 16,
                y2: modal.centerY - modal.height / 2 + 68
            };
            const okW = Math.min(options.okWidth || 220, modal.width - 96);
            const okH = Math.min(options.okHeight || (modal.width < 360 ? 60 : 68), modal.height - 150);
            modal.okRect = {
                x1: modal.centerX - okW / 2,
                y1: modal.centerY + modal.height / 2 - 28 - okH,
                x2: modal.centerX + okW / 2,
                y2: modal.centerY + modal.height / 2 - 28
            };
            modal.okHeight = okH;
            return modal;
        }
    };

    modal.overlay = scene.add.rectangle(0, 0, api.display_width, api.display_height, 0x000000, 0)
        .setOrigin(0, 0)
        .setInteractive();
    modal.overlay.on("pointerdown", (
        /** @type {unknown} */ pointer,
        /** @type {unknown} */ localX,
        /** @type {unknown} */ localY,
        /** @type {unknown} */ event
    ) => {
        consumeInputEvent(pointer, event);
        api.consume_pointer(resolveModalInputBlockMs(options), pointer);
        if (modal.ready && options.closeOnBackdrop) modal.close("backdrop");
    });
    modal.overlay.on("pointerup", (
        /** @type {unknown} */ pointer,
        /** @type {unknown} */ localX,
        /** @type {unknown} */ localY,
        /** @type {unknown} */ event
    ) => {
        consumeInputEvent(pointer, event);
        api.release_pointer(pointer, resolveModalInputBlockMs(options));
    });

    modal.layout();
    modal.container = scene.add.container(modal.centerX, modal.centerY + 36);
    modal.container.setAlpha(0);
    modal.container.setScale(options.openStartScale || 0.28);

    const panel = uiToolkit.createNineSliceObject(scene, 0, 0, modal.width, modal.height, options.window || {});
    const hasCloseButton = options.showClose !== false;
    const textResolution = state.render?.resolution || 1;
    const titleSize = responsiveModalSize(modal, options.titleSize, modalTheme.titleSize, 34, 23);
    const messageSize = responsiveModalSize(modal, options.messageSize, modalTheme.messageSize, 24, 20);
    const okSize = responsiveModalSize(modal, options.okSize, undefined, 28, 24);
    const titleWrapWidth = Math.max(168, modal.width - (hasCloseButton ? 150 : 56));
    const messageWrapWidth = Math.max(190, modal.width - 76);
    const title = scene.add.text(0, -modal.height / 2 + 50, options.title || "Notice", {
        fontFamily: options.titleFont || modalTheme.titleFont || "sans-serif",
        fontSize: titleSize + "px",
        fontStyle: "bold",
        color: options.titleColor || modalTheme.titleColor || "#ffffff",
        align: "center",
        resolution: textResolution,
        wordWrap: { width: titleWrapWidth }
    }).setOrigin(0.5, 0.5);

    const messageY = Math.max(-modal.height / 2 + 88, title.y + title.displayHeight / 2 + 18);
    const message = scene.add.text(0, messageY, options.message || "", {
        fontFamily: options.messageFont || modalTheme.messageFont || "sans-serif",
        fontSize: messageSize + "px",
        color: options.messageColor || modalTheme.messageColor || "#eaf5ff",
        align: "center",
        resolution: textResolution,
        lineSpacing: modal.width < 360 ? 5 : 8,
        wordWrap: { width: messageWrapWidth }
    }).setOrigin(0.5, 0);

    modal.container.add([panel, title, message]);

    if (hasCloseButton) {
        const closeButton = uiToolkit.createButton(scene, "X", modal.width / 2 - 42, -modal.height / 2 + 42, 52, 52, () => {
            if (!modal.ready) return;
            api.consume_pointer(resolveModalInputBlockMs(options));
            modal.close("x");
        }, {
            size: 22,
            resolution: textResolution,
            onPointerDown: (/** @type {unknown} */ pointer) => api.consume_pointer(resolveModalInputBlockMs(options), pointer),
            onPointerUp: (/** @type {unknown} */ pointer) => api.release_pointer(pointer, resolveModalInputBlockMs(options)),
            onPointerCancel: (/** @type {unknown} */ pointer) => api.release_pointer(pointer, resolveModalInputBlockMs(options))
        });
        modal.container.add(closeButton);
    }

    if (options.showOk !== false) {
        const okW = Math.min(options.okWidth || 220, modal.width - 96);
        const okH = modal.okHeight || Math.min(options.okHeight || (modal.width < 360 ? 60 : 68), modal.height - 150);
        const okButton = uiToolkit.createButton(scene, options.okText || modalTheme.okText || "OK", 0, modal.height / 2 - 28 - okH / 2, okW, okH, () => {
            if (!modal.ready) return;
            api.consume_pointer(resolveModalInputBlockMs(options));
            if (typeof options.onOk === "function") options.onOk(modal);
            modal.close("ok");
        }, {
            size: okSize,
            resolution: textResolution,
            onPointerDown: (/** @type {unknown} */ pointer) => api.consume_pointer(resolveModalInputBlockMs(options), pointer),
            onPointerUp: (/** @type {unknown} */ pointer) => api.release_pointer(pointer, resolveModalInputBlockMs(options)),
            onPointerCancel: (/** @type {unknown} */ pointer) => api.release_pointer(pointer, resolveModalInputBlockMs(options))
        });
        modal.container.add(okButton);
    }

    state.screen.add([modal.overlay, modal.container]);
    state.modals.push(modal);

    const openMs = normalizeDelayMs(options.openMs, DEFAULT_MODAL_OPEN_MS, 0);
    const backdropMs = normalizeDelayMs(options.backdropMs, openMs * 2, 0);
    scene.tweens.add({
        targets: modal.overlay,
        alpha: options.backdropAlpha === undefined ? (modalTheme.backdropAlpha === undefined ? 0.58 : modalTheme.backdropAlpha) : options.backdropAlpha,
        duration: backdropMs,
        ease: "Expo.Out"
    });
    scene.tweens.add({
        targets: modal.container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        y: modal.centerY,
        duration: openMs,
        ease: options.openEase || "Expo.Out",
        onComplete: () => {
            modal.ready = true;
        }
    });

    return modal;
}
