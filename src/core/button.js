// @ts-check

import { consumeInputEvent, pointerGateKey } from "./input.js";
import {
    point_in_rectangle,
    toColor,
    toCssColor
} from "./math.js";
import { countRuntimePerf } from "./perf-metrics.js";

/**
 * @typedef {{
 *   alpha?: number,
 *   activeColor?: unknown,
 *   activeFill?: unknown,
 *   activeTint?: unknown,
 *   color?: unknown,
 *   downScale?: number,
 *   fill?: unknown,
 *   flashMs?: number,
 *   font?: string,
 *   frame?: unknown,
 *   hoverColor?: unknown,
 *   hoverFill?: unknown,
 *   hoverScale?: number,
 *   hoverTint?: unknown,
 *   labelOffsetY?: number,
 *   left?: number,
 *   right?: number,
 *   top?: number,
 *   bottom?: number,
 *   radius?: number,
 *   shadow?: boolean,
 *   shadowAlpha?: number,
 *   shadowOffsetX?: number,
 *   shadowOffsetY?: number,
 *   size?: number,
 *   texture?: string,
 *   tint?: unknown
 * }} RuntimeButtonOptions
 *
 * @typedef {{
 *   currentTime: number,
 *   frameId?: number,
 *   mouse: { x: number, y: number },
 *   render?: { resolution?: number }
 * }} RuntimeButtonState
 *
 * @typedef {{
 *   input_blocked: () => boolean,
 *   curtain_active: () => boolean
 * }} RuntimeButtonApi
 */

/**
 * @param {any} Phaser
 */
export function createRuntimeButtonClass(Phaser) {
    return class GMButtonObject extends Phaser.GameObjects.Container {
        /**
         * @param {any} scene
         * @param {RuntimeButtonApi} api
         * @param {RuntimeButtonState} state
         * @param {unknown} id
         */
        constructor(scene, api, state, id) {
            super(scene, 0, 0);
            this.api = api;
            this.state = state;
            this.id = id;
            this.hovered = false;
            this.down = false;
            /** @type {string | null} */
            this.activePointerId = null;
            this.pendingPress = false;
            this.activeUntil = 0;
            this.visualScale = 1;
            this.lastScaleTime = 0;
            this.configuredFrame = -1;
            /** @type {RuntimeButtonOptions} */
            this.options = {};
            this.back = scene.add.graphics();
            /** @type {any} */
            this.imageShadow = null;
            /** @type {any} */
            this.imageBack = null;
            this.hitZone = scene.add.zone(0, 0, 1, 1).setOrigin(0.5);
            this.label = scene.add.text(0, 0, "", {
                fontFamily: "sans-serif",
                fontSize: "30px",
                fontStyle: "bold",
                color: "#ffffff",
                align: "center"
            }).setOrigin(0.5);

            this.add([this.back, this.label, this.hitZone]);
            this.setSize(1, 1);
            this.hitZone.setInteractive();
            this.hitZone.input.cursor = "pointer";

            this.hitZone.on("pointerover", (
                /** @type {unknown} */ pointer,
                /** @type {unknown} */ localX,
                /** @type {unknown} */ localY,
                /** @type {unknown} */ event
            ) => {
                consumeInputEvent(pointer, event);
                this.hovered = true;
            });
            this.hitZone.on("pointermove", (
                /** @type {unknown} */ pointer,
                /** @type {unknown} */ localX,
                /** @type {unknown} */ localY,
                /** @type {unknown} */ event
            ) => {
                consumeInputEvent(pointer, event);
                this.hovered = true;
            });
            this.hitZone.on("pointerout", (
                /** @type {unknown} */ pointer,
                /** @type {unknown} */ localX,
                /** @type {unknown} */ localY,
                /** @type {unknown} */ event
            ) => {
                consumeInputEvent(pointer, event);
                this.hovered = false;
                this.down = false;
                this.activePointerId = null;
            });
            this.hitZone.on("pointerdown", (
                /** @type {unknown} */ pointer,
                /** @type {unknown} */ localX,
                /** @type {unknown} */ localY,
                /** @type {unknown} */ event
            ) => {
                consumeInputEvent(pointer, event);
                if (this.api.input_blocked() || this.api.curtain_active()) return;
                const pointerId = pointerGateKey(pointer);
                if (this.down && this.activePointerId !== pointerId) return;
                this.hovered = true;
                this.down = true;
                this.activePointerId = pointerId;
            });
            this.hitZone.on("pointerup", (
                /** @type {unknown} */ pointer,
                /** @type {unknown} */ localX,
                /** @type {unknown} */ localY,
                /** @type {unknown} */ event
            ) => {
                consumeInputEvent(pointer, event);
                const samePointer = this.activePointerId !== null && this.activePointerId === pointerGateKey(pointer);
                if (!samePointer) return;
                const canPress = samePointer && this.down && !this.api.input_blocked() && !this.api.curtain_active();
                this.down = false;
                this.activePointerId = null;
                if (!canPress) return;
                this.pendingPress = true;
                const flashMs = Number(this.options.flashMs);
                const flashDuration = Number.isFinite(flashMs) ? Math.max(0, flashMs) : 100;
                this.activeUntil = this.state.currentTime + flashDuration;
            });
            const cancelPointer = (
                /** @type {unknown} */ pointer,
                /** @type {unknown} */ localX,
                /** @type {unknown} */ localY,
                /** @type {unknown} */ event
            ) => {
                consumeInputEvent(pointer, event);
                this.down = false;
                this.activePointerId = null;
            };
            this.hitZone.on("pointercancel", cancelPointer);
            this.hitZone.on("pointerupoutside", cancelPointer);
        }

        beginFrame() {
            // Pointer releases can arrive between draw passes; retain them for one
            // configured frame, then clear state when this pooled control is absent.
            const frameId = Number(this.state.frameId || 0);
            const wasConfiguredLastFrame = this.configuredFrame === frameId - 1;
            if (Number(this.state.currentTime || 0) >= this.activeUntil) {
                this.activeUntil = 0;
            }
            if (!wasConfiguredLastFrame) {
                this.hovered = false;
                this.down = false;
                this.activePointerId = null;
                this.pendingPress = false;
                this.activeUntil = 0;
                this.visualScale = 1;
                this.lastScaleTime = 0;
                this.setScale(1);
            }
            this.configuredFrame = -1;
            this.setVisible(false);
            if (this.hitZone.input) this.hitZone.input.enabled = false;
            this.options = {};
        }

        /**
         * @param {number} x
         * @param {number} y
         * @param {number} w
         * @param {number} h
         * @param {unknown} text
         * @param {RuntimeButtonOptions} [options]
         */
        configure(x, y, w, h, text, options) {
            this.configuredFrame = Number(this.state.frameId || 0);
            this.options = options || {};
            this.setAlpha(this.options.alpha ?? 1);
            this.setVisible(true);
            this.setPosition(x + w / 2, y + h / 2);
            this.setSize(w, h);
            this.hitZone.setSize(w, h);
            const labelText = String(text);
            if (this.label.text !== labelText) {
                this.label.setText(labelText);
                countRuntimePerf(this.state, "textSetCalls");
            }
            this.label.setPosition(0, this.options.labelOffsetY || 0);
            const labelStyle = {
                fontFamily: this.options.font || "sans-serif",
                fontSize: (this.options.size || 30) + "px",
                fontStyle: "bold",
                color: toCssColor(this.options.color, "#ffffff"),
                align: "center",
                resolution: this.state.render?.resolution || 1
            };
            const labelStyleSignature = JSON.stringify(labelStyle);
            if (this.label.__gmRuntimeStyleSignature !== labelStyleSignature) {
                this.label.setStyle(labelStyle);
                this.label.__gmRuntimeStyleSignature = labelStyleSignature;
                countRuntimePerf(this.state, "textStyleSetCalls");
            }
            countRuntimePerf(this.state, "buttons");

            const canInteract = !this.api.input_blocked() && !this.api.curtain_active();
            if (this.hitZone.input) this.hitZone.input.enabled = canInteract;
            const activeButton = this.down || this.state.currentTime < this.activeUntil;
            const pointerInside = point_in_rectangle(this.state.mouse.x, this.state.mouse.y, x, y, x + w, y + h);
            if (!pointerInside && !this.down) this.hovered = false;
            const hover = canInteract && (this.hovered || pointerInside);
            const label = activeButton
                ? toCssColor(this.options.activeColor, "#000000")
                : hover
                    ? toCssColor(this.options.hoverColor, toCssColor(this.options.color, "#ffffff"))
                    : toCssColor(this.options.color, "#ffffff");

            const useImageBack = typeof this.options.texture === "string" &&
                this.scene.textures.exists(this.options.texture) &&
                typeof this.scene.add.nineslice === "function";

            if (useImageBack) {
                const frame = this.options.frame === undefined ? null : this.options.frame;
                const left = this.options.left === undefined ? 18 : this.options.left;
                const right = this.options.right === undefined ? left : this.options.right;
                const top = this.options.top === undefined ? left : this.options.top;
                const bottom = this.options.bottom === undefined ? top : this.options.bottom;
                const tint = activeButton
                    ? this.options.activeTint
                    : hover
                        ? this.options.hoverTint
                        : this.options.tint;
                this.back.clear();
                this.back.setVisible(false);
                const imageSignature = JSON.stringify([this.options.texture, frame, left, right, top, bottom]);
                if (!this.imageBack
                    || this.imageBack.texture?.key !== this.options.texture
                    || this.imageBack.__gmNineSliceSignature !== imageSignature) {
                    if (this.imageBack) this.imageBack.destroy();
                    this.imageBack = this.scene.add.nineslice(0, 0, this.options.texture, frame, w, h, left, right, top, bottom);
                    this.imageBack.__gmNineSliceSignature = imageSignature;
                    this.addAt(this.imageBack, this.imageShadow ? 1 : 0);
                }
                countRuntimePerf(this.state, "nineSlices");
                this.imageBack.setVisible(true);
                if (typeof this.imageBack.setSize === "function") this.imageBack.setSize(w, h);
                else this.imageBack.setDisplaySize(w, h);
                if (tint === undefined || tint === null) {
                    if (typeof this.imageBack.clearTint === "function") this.imageBack.clearTint();
                } else if (typeof this.imageBack.setTint === "function") {
                    this.imageBack.setTint(toColor(tint));
                }

                if (this.options.shadow) {
                    if (!this.imageShadow
                        || this.imageShadow.texture?.key !== this.options.texture
                        || this.imageShadow.__gmNineSliceSignature !== imageSignature) {
                        if (this.imageShadow) this.imageShadow.destroy();
                        this.imageShadow = this.scene.add.nineslice(0, 0, this.options.texture, frame, w, h, left, right, top, bottom);
                        this.imageShadow.__gmNineSliceSignature = imageSignature;
                        this.addAt(this.imageShadow, 0);
                    }
                    countRuntimePerf(this.state, "nineSlices");
                    this.imageShadow.setVisible(true);
                    this.imageShadow.setPosition(this.options.shadowOffsetX ?? 5, this.options.shadowOffsetY ?? 5);
                    if (typeof this.imageShadow.setSize === "function") this.imageShadow.setSize(w, h);
                    else this.imageShadow.setDisplaySize(w, h);
                    this.imageShadow.setAlpha(this.options.shadowAlpha ?? 0.3);
                    if (typeof this.imageShadow.setTint === "function") this.imageShadow.setTint(0x000000);
                } else if (this.imageShadow) {
                    this.imageShadow.setVisible(false);
                }
            } else {
                const fill = activeButton
                    ? toColor(this.options.activeFill, 0xffffff)
                    : hover
                        ? toColor(this.options.hoverFill, 0x777777)
                        : toColor(this.options.fill, 0x555555);
                if (this.imageBack) this.imageBack.setVisible(false);
                if (this.imageShadow) this.imageShadow.setVisible(false);
                this.back.setVisible(true);
                this.back.clear();
                this.back.fillStyle(fill, 1);
                this.back.fillRoundedRect(-w / 2, -h / 2, w, h, this.options.radius === undefined ? 20 : this.options.radius);
            }
            this.label.setColor(label);

            const targetScale = activeButton ? (this.options.downScale ?? 0.98) : hover ? (this.options.hoverScale ?? 1.03) : 1;
            const currentTime = Number(this.state.currentTime || 0);
            const deltaSec = this.lastScaleTime > 0
                ? Math.max(0, Math.min(0.05, (currentTime - this.lastScaleTime) / 1000))
                : 0;
            this.lastScaleTime = currentTime;
            if (!Number.isFinite(this.visualScale) || this.visualScale <= 0) this.visualScale = targetScale;
            if (deltaSec <= 0) {
                this.visualScale = targetScale;
            } else {
                const rate = activeButton ? 28 : hover ? 22 : 18;
                this.visualScale += (targetScale - this.visualScale) * (1 - Math.exp(-rate * deltaSec));
            }
            this.setScale(this.visualScale);
            return this;
        }

        consumePress() {
            if (!this.pendingPress) return false;
            this.pendingPress = false;
            return !this.api.input_blocked() && !this.api.curtain_active();
        }
    };
}
