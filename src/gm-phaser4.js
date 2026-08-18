// @ts-check

import {
    ALIGN,
    COLORS,
    INPUT,
    RUNTIME_VERSION
} from "./core/constants.js";
import {
    onRuntimeDomEvent,
    onRuntimeEvent,
    onceRuntimeEvent,
    recordRuntimeCleanupError,
    runRuntimeCleanup
} from "./core/cleanup.js";
import { createMathApi } from "./core/math-api.js";
import {
    applyPointerDown,
    applyPointerRelease,
    buttonFromPointer,
    consumeInputEvent,
    createPointerRecord,
    endPointerFrame,
    inferPointerKind,
    normalizeDelayMs,
    normalizeKey,
    pointerGateKey,
    rememberPrimaryPointerId
} from "./core/input.js";
import { createRuntimeButtonClass } from "./core/button.js";
import {
    applyRuntimeFill,
    applyRuntimeStroke,
    drawRuntimeCircle,
    drawRuntimeLine,
    drawRuntimePolyline,
    drawRuntimeRectangle,
    drawRuntimeRoundRect,
    drawRuntimeSpriteExt,
    drawRuntimeStage,
    drawRuntimeText,
    drawRuntimeTextExt,
    drawRuntimeTextFit,
    resetRuntimeDrawState,
    setRuntimeDrawAlpha,
    setRuntimeDrawColor,
    setRuntimeDrawFont,
    setRuntimeDrawHAlign,
    setRuntimeDrawLineWidth,
    setRuntimeDrawVAlign
} from "./core/draw.js";
import {
    countRuntimeInstances,
    createRuntimeInstance,
    destroyRuntimeInstance,
    drawRuntimeInstances,
    findRuntimeInstance,
    runtimeInstanceExists,
    setRuntimeAlarm,
    stepRuntimeInstances
} from "./core/entity.js";
import { resolveRoomLayout } from "./core/layout.js";
import { readSafeInsets } from "./core/viewport.js";
import { createModal } from "./core/modal.js";
import { makeTextPool } from "./core/pools.js";
import {
    beginRuntimePerfFrame,
    beginRuntimePerfSection,
    endRuntimePerfSection,
    finalizeRuntimePerfFrame
} from "./core/perf-metrics.js";
import { syncRenderResolution } from "./core/render-resolution.js";
import { createWorldLayerManager } from "./core/render-layers.js";
import { createUiToolkit } from "./core/ui-toolkit.js";
import { installFacadeNamespaces } from "./core/facade-namespaces.js";
import { createGameStarter } from "./core/game-start.js";
import { createLegacyGlobalInstaller } from "./core/legacy-globals.js";
import { createRuntimeState } from "./core/runtime-state.js";
import { curtain, curtain_active, dismissCurtain } from "./core/curtain.js";
import { logDebugMessage } from "./core/debug.js";

/**
 * @typedef {Omit<typeof globalThis, "Phaser" | "GM"> & Record<string, unknown> & { Phaser?: unknown, GM?: unknown }} RuntimeRoot
 * @typedef {{ Game: new (...args: any[]) => any, Scene: new (...args: any[]) => any, VERSION?: string, Scale?: Record<string, unknown> }} PhaserRuntime
 * @typedef {{ width: number, height: number, curtain?: boolean, [key: string]: any }} RuntimeConfig
 * @typedef {Record<string, any>} DynamicRecord
 * @typedef {object} RuntimeApi
 * @property {DynamicRecord} state
 * @property {any} scene
 * @property {RuntimeConfig} cfg
 * @property {any} game
 * @property {number} room_width
 * @property {number} room_height
 * @property {number} display_width
 * @property {number} display_height
 * @property {string} layout_profile
 * @property {string} orientation
 * @property {number} layout_scale
 * @property {number} mouse_x
 * @property {number} mouse_y
 * @property {number} current_time
 * @property {number} delta_time
 * @property {number} delta_sec
 * @property {(...args: any[]) => any} cleanup
 * @property {(...args: any[]) => any} mount
 * @property {(...args: any[]) => any} layout
 * @property {(...args: any[]) => any} updatePointer
 * @property {(...args: any[]) => any} input_blocked
 * @property {(...args: any[]) => any} update_input_blocker
 * @property {(...args: any[]) => any} clear_pointer_state
 * @property {(...args: any[]) => any} pause_input
 * @property {(...args: any[]) => any} consume_pointer
 * @property {(...args: any[]) => any} release_pointer
 * @property {(...args: any[]) => any} get_pointer
 * @property {(...args: any[]) => any} active_pointers
 * @property {(...args: any[]) => any} capture_pointer
 * @property {(...args: any[]) => any} release_pointer_id
 * @property {(...args: any[]) => any} define_layer
 * @property {(...args: any[]) => any} begin_input_transition
 * @property {(...args: any[]) => any} clear_input_gate
 * @property {(...args: any[]) => any} beginDraw
 * @property {(...args: any[]) => any} endFrame
 * @property {(...args: any[]) => any} resetDrawState
 * @property {(...args: any[]) => any} applyFill
 * @property {(...args: any[]) => any} applyStroke
 * @property {(...args: any[]) => any} drawStage
 * @property {(...args: any[]) => any} tick
 * @property {(...args: any[]) => any} stepInstances
 * @property {(...args: any[]) => any} drawInstances
 * @property {(...args: any[]) => any} load_sprite
 * @property {(...args: any[]) => any} load_sound
 * @property {(...args: any[]) => any} load_spritesheet
 * @property {(...args: any[]) => any} draw_set_color
 * @property {(...args: any[]) => any} draw_set_alpha
 * @property {(...args: any[]) => any} draw_set_line_width
 * @property {(...args: any[]) => any} draw_set_font
 * @property {(...args: any[]) => any} draw_set_halign
 * @property {(...args: any[]) => any} draw_set_valign
 * @property {(...args: any[]) => any} draw_rectangle
 * @property {(...args: any[]) => any} draw_roundrect
 * @property {(...args: any[]) => any} draw_circle
 * @property {(...args: any[]) => any} draw_line
 * @property {(...args: any[]) => any} draw_polyline
 * @property {(...args: any[]) => any} draw_text
 * @property {(...args: any[]) => any} draw_text_ext
 * @property {(...args: any[]) => any} draw_text_fit
 * @property {(...args: any[]) => any} draw_gui_rectangle
 * @property {(...args: any[]) => any} draw_gui_text
 * @property {(...args: any[]) => any} draw_gui_text_ext
 * @property {(...args: any[]) => any} draw_gui_text_fit
 * @property {(...args: any[]) => any} draw_sprite
 * @property {(...args: any[]) => any} draw_sprite_ext
 * @property {(...args: any[]) => any} button
 * @property {(...args: any[]) => any} button_center
 * @property {(...args: any[]) => any} nineslice_window
 * @property {(...args: any[]) => any} modal_notice
 * @property {(...args: any[]) => any} modal_close_all
 * @property {(...args: any[]) => any} ui_set_theme
 * @property {(...args: any[]) => any} ui_get_theme
 * @property {(...args: any[]) => any} ui_export_textures
 * @property {(...args: any[]) => any} ui_download_textures
 * @property {(...args: any[]) => any} curtain
 * @property {(...args: any[]) => any} curtain_active
 * @property {(...args: any[]) => any} instance_create_layer
 * @property {(...args: any[]) => any} instance_destroy
 * @property {(...args: any[]) => any} instance_exists
 * @property {(...args: any[]) => any} instance_number
 * @property {(...args: any[]) => any} instance_find
 * @property {(...args: any[]) => any} alarm_set
 * @property {(...args: any[]) => any} keyboard_check
 * @property {(...args: any[]) => any} keyboard_check_pressed
 * @property {(...args: any[]) => any} keyboard_check_pressed_raw
 * @property {(...args: any[]) => any} keyboard_check_released
 * @property {(...args: any[]) => any} mouse_check_button
 * @property {(...args: any[]) => any} mouse_check_button_pressed
 * @property {(...args: any[]) => any} mouse_check_button_released
 * @property {(...args: any[]) => any} mouse_check_button_pressed_raw
 * @property {(...args: any[]) => any} show_debug_message
 * @property {(...args: any[]) => any} tween
 * @property {(...args: any[]) => any} wait
 * @property {(...args: any[]) => any} every
 * @property {(...args: any[]) => any} sound_play
 * @property {(name: string, depth?: number) => RuntimeApi} render_layer
 */

/**
 * @param {any} Phaser
 * @returns {PhaserRuntime}
 */
function validatePhaserLibrary(Phaser) {
    if (!Phaser || typeof Phaser.Game !== "function" || typeof Phaser.Scene !== "function") {
        throw new Error("GM runtime requires a Phaser library with Game and Scene constructors.");
    }
    return /** @type {PhaserRuntime} */ (Phaser);
}

/**
 * @param {RuntimeRoot} root
 * @param {PhaserRuntime} Phaser
 * @returns {DynamicRecord}
 */
export function installGMRuntime(root, Phaser) {
    "use strict";

    const PhaserLibrary = validatePhaserLibrary(Phaser);

    const existing = /** @type {DynamicRecord | null} */ (root.GM || null);
    if (existing && existing.__gmFacadeMarker === true) {
        if (existing.version !== RUNTIME_VERSION) {
            throw new Error(
                `Incompatible GM facade already installed (found ${existing.version}, expected ${RUNTIME_VERSION}).`
            );
        }
        if (existing.__phaserLibrary && existing.__phaserLibrary !== PhaserLibrary) {
            throw new Error("GM facade already installed against a different Phaser instance.");
        }
        return existing;
    }
    if (existing && existing.__gmFacadeMarker !== true) {
        throw new Error("root.GM is already occupied by an incompatible object.");
    }

    if (root.Phaser && root.Phaser !== PhaserLibrary) {
        throw new Error("GM runtime received a Phaser instance that conflicts with the host global Phaser.");
    }
    root.Phaser = PhaserLibrary;

    /** @type {DynamicRecord} */
    const GM = {
        version: RUNTIME_VERSION,
        phaserVersion: PhaserLibrary.VERSION || "unknown",
        __gmFacadeMarker: true,
        __phaserLibrary: PhaserLibrary,
        _active: null,
        _game: null,
        _globalsInstalled: false,
        _globalsDisposer: null
    };
    const uiToolkit = createUiToolkit();
    const GMButtonObject = createRuntimeButtonClass(PhaserLibrary);
    const mathApi = createMathApi();

    /**
     * @returns {RuntimeApi}
     */
    function active() {
        if (!GM._active) {
            throw new Error("GM.start() must run before using facade functions.");
        }
        return GM._active;
    }

    /**
     * @returns {RuntimeApi | null}
     */
    function activeOrNull() {
        return GM._active || null;
    }

    /**
     * @param {string} method
     * @param {IArguments | any[]} args
     * @returns {any}
     */
    function callActive(method, args) {
        return /** @type {Record<string, any>} */ (active())[method].apply(null, args);
    }

    /**
     * @param {object} target
     * @param {string} name
     * @param {() => unknown} getter
     */
    function defineReadonly(target, name, getter) {
        Object.defineProperty(target, name, {
            configurable: true,
            enumerable: true,
            get: getter
        });
    }

    const installGlobals = createLegacyGlobalInstaller({
        root,
        GM,
        COLORS,
        ALIGN,
        INPUT,
        math: mathApi,
        active: /** @type {() => Record<string, Function>} */ (/** @type {unknown} */ (active))
    });

    /**
     * @param {any} scene
     * @param {RuntimeConfig} cfg
     * @returns {RuntimeApi}
     */
    function makeRuntime(scene, cfg) {
        /** @type {DynamicRecord} */
        const state = createRuntimeState(scene, cfg);

        const worldLayers = createWorldLayerManager(scene, state);
        const selectWorldLayer = worldLayers.select;

        function suppressHeldKeys() {
            for (const key of Object.keys(state.keysDown)) {
                if (state.keysDown[key]) state.suppressedKeys[key] = true;
            }
            state.keysDown = Object.create(null);
            state.keysPressed = Object.create(null);
            state.keysPressedRaw = Object.create(null);
            state.keysReleased = Object.create(null);
        }

        function clearTransientInput() {
            state.mouse.down = Object.create(null);
            state.mouse.pressed = Object.create(null);
            state.mouse.released = Object.create(null);
            state.keysDown = Object.create(null);
            state.keysPressed = Object.create(null);
            state.keysPressedRaw = Object.create(null);
            state.keysReleased = Object.create(null);
            state.physicalKeysDown = Object.create(null);
            state.suppressedKeys = Object.create(null);
            if (state.pointers instanceof Map) {
                for (const pointer of state.pointers.values()) {
                    pointer.active = false;
                    pointer.down = false;
                    pointer.pressed = false;
                    pointer.released = false;
                }
            }
            state.primaryPointerId = null;
        }

        function recoverInputFocus() {
            state.inputGate.capturedPointers = Object.create(null);
            state.inputGate.transitions = 0;
            state.inputGate.pausedUntil = 0;
            clearTransientInput();
            if (state.pointers instanceof Map) state.pointers.clear();
            state.primaryPointerId = null;
            if (api && typeof api.update_input_blocker === "function") api.update_input_blocker();
        }

        /**
         * @param {string | boolean | undefined} owner
         */
        function captureBlocksGameplay(owner) {
            if (owner === true || owner === undefined || owner === null) return true;
            const channel = String(owner);
            return channel === "modal" ||
                channel === "button" ||
                channel === "system" ||
                channel === "transition" ||
                channel === "gameplay";
        }

        function hasBlockingPointerCapture() {
            for (const owner of Object.values(state.inputGate.capturedPointers || {})) {
                if (captureBlocksGameplay(/** @type {any} */ (owner))) return true;
            }
            return false;
        }

        /**
         * @param {any} pointer
         * @param {{ down?: boolean, released?: boolean }} [flags]
         */
        function trackPointer(pointer, flags = {}) {
            if (!pointer) return null;
            const id = pointerGateKey(pointer);
            const scale = state.layout.scale || 1;
            const resolution = state.render.resolution || 1;
            const screenX = Number(pointer.x) / resolution;
            const screenY = Number(pointer.y) / resolution;
            const roomX = (screenX - state.layout.x) / scale;
            const roomY = (screenY - state.layout.y) / scale;
            let record = state.pointers.get(id);
            if (!record) {
                record = createPointerRecord(id, {
                    x: roomX,
                    y: roomY,
                    screenX,
                    screenY,
                    button: buttonFromPointer(pointer),
                    kind: inferPointerKind(pointer),
                    time: state.currentTime
                });
                state.pointers.set(id, record);
            } else {
                record.screenX = screenX;
                record.screenY = screenY;
                record.x = roomX;
                record.y = roomY;
                record.button = buttonFromPointer(pointer);
                record.kind = inferPointerKind(pointer);
                record.active = true;
            }
            if (flags.down === true) {
                applyPointerDown(record, { x: roomX, y: roomY, time: state.currentTime });
            }
            if (flags.released === true) {
                applyPointerRelease(record);
            }
            state.primaryPointerId = rememberPrimaryPointerId(state.primaryPointerId, state.pointers, id, flags);
            return record;
        }

        function pruneUiButtons() {
            for (const [id, button] of Array.from(state.uiButtons.entries())) {
                if (Number(button.configuredFrame || 0) === Number(state.frameId || 0)) continue;
                try {
                    if (typeof button.destroy === "function") button.destroy(true);
                } catch (error) {
                    recordRuntimeCleanupError(state, error, "button_prune", "end_frame");
                }
                state.uiButtons.delete(id);
            }
        }

        /**
         * @param {number} deltaSec
         * @param {string} phase
         */
        function runGameStep(deltaSec, phase) {
            try {
                if (typeof cfg.step === "function") cfg.step(api, deltaSec);
                api.stepInstances();
            } catch (error) {
                if (typeof cfg.onError === "function") {
                    cfg.onError(error, {
                        phase,
                        frame: state.frameId,
                        time: state.currentTime,
                        instanceId: state.currentInstance ? state.currentInstance.id : null,
                        objectDefinition: state.currentInstance ? state.currentInstance.object_index : null
                    });
                }
                throw error;
            } finally {
                state.currentInstance = null;
            }
        }

        function hideUiPanels() {
            state.uiPanelCursor = 0;
            for (const panel of state.uiPanels) {
                if (panel && typeof panel.setVisible === "function") panel.setVisible(false);
            }
        }

        /**
         * @param {string | undefined} reason
         */
        function destroyUiPanels(reason) {
            const panels = state.uiPanels.slice();
            state.uiPanels = [];
            state.uiPanelCursor = 0;
            for (const panel of panels) {
                try {
                    if (panel && typeof panel.destroy === "function") panel.destroy(true);
                } catch (error) {
                    recordRuntimeCleanupError(state, error, "panel_destroy", reason || "panel_reset");
                }
            }
        }

        /** @type {RuntimeApi} */
        const api = {
            state,
            scene,
            cfg,
            get game() { return scene.sys && scene.sys.game ? scene.sys.game : GM._game; },

            get room_width() { return state.layout.roomWidth || cfg.width; },
            get room_height() { return state.layout.roomHeight || cfg.height; },
            get display_width() { return state.render.cssWidth || (scene.scale ? scene.scale.width : 0); },
            get display_height() { return state.render.cssHeight || (scene.scale ? scene.scale.height : 0); },
            get layout_profile() { return state.layout.profile || "fixed"; },
            get orientation() { return state.layout.orientation || "portrait"; },
            get layout_scale() { return state.layout.scale || 1; },
            get mouse_x() { return state.mouse.x; },
            get mouse_y() { return state.mouse.y; },
            get current_time() { return state.currentTime; },
            get delta_time() { return state.deltaMs; },
            get delta_sec() { return state.deltaMs / 1000; },

            cleanup(reason) {
                if (!runRuntimeCleanup(state, reason || "cleanup")) return api;

                for (const modal of state.modals.slice()) {
                    try {
                        if (typeof modal.destroy === "function") modal.destroy(reason || "cleanup");
                    } catch (error) {
                        recordRuntimeCleanupError(state, error, "modal_destroy", reason || "cleanup");
                    }
                }
                state.modals = [];

                for (const inst of state.instances.slice()) {
                    try {
                        destroyRuntimeInstance(state, api, inst);
                    } catch (error) {
                        recordRuntimeCleanupError(state, error, "instance_destroy", reason || "cleanup");
                    }
                }
                state.instances = [];

                for (const buttonObject of state.uiButtons.values()) {
                    try {
                        if (buttonObject && typeof buttonObject.destroy === "function") buttonObject.destroy();
                    } catch (error) {
                        recordRuntimeCleanupError(state, error, "button_destroy", reason || "cleanup");
                    }
                }
                state.uiButtons.clear();
                destroyUiPanels(reason || "cleanup");

                try {
                    if (state.world && typeof state.world.destroy === "function") state.world.destroy(true);
                } catch (error) {
                    recordRuntimeCleanupError(state, error, "world_destroy", reason || "cleanup");
                }
                try {
                    if (state.screen && typeof state.screen.destroy === "function") state.screen.destroy(true);
                } catch (error) {
                    recordRuntimeCleanupError(state, error, "screen_destroy", reason || "cleanup");
                }
                state.world = null;
                state.screen = null;
                state.worldGfx = null;
                state.screenGfx = null;
                state.inputBlocker = null;
                state.currentInstance = null;
                state.worldLayers.clear();
                state.activeWorldContainer = null;

                if (GM._active === api) GM._active = null;
                return api;
            },

            mount() {
                if (state.cleanedUp) return api;
                state.world = scene.add.container(0, 0);
                selectWorldLayer("world", 0);

                state.screen = scene.add.container(0, 0);
                state.screen.setDepth(100000);
                state.screenGfx = scene.add.graphics();
                state.screen.add(state.screenGfx);

                state.inputBlocker = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0)
                    .setOrigin(0, 0)
                    .setInteractive();
                state.inputBlocker.input.enabled = false;
                /**
                 * @param {any} pointer
                 * @param {any} localX
                 * @param {any} localY
                 * @param {any} event
                */
                const onBlockerPointerDown = (pointer, localX, localY, event) => {
                    consumeInputEvent(pointer, event);
                    if (api.curtain_active()) {
                        api.updatePointer(pointer);
                        const button = buttonFromPointer(pointer);
                        state.mouse.down[button] = true;
                        state.mouse.pressed[button] = true;
                        api.consume_pointer(undefined, pointer, true);
                        return;
                    }
                    api.consume_pointer(undefined, pointer);
                };
                /**
                 * @param {any} pointer
                 * @param {any} localX
                 * @param {any} localY
                 * @param {any} event
                */
                const onBlockerPointerUp = (pointer, localX, localY, event) => {
                    consumeInputEvent(pointer, event);
                    api.release_pointer(pointer, undefined, api.curtain_active());
                };
                onRuntimeEvent(state, state.inputBlocker, "pointerdown", onBlockerPointerDown);
                onRuntimeEvent(state, state.inputBlocker, "pointerup", onBlockerPointerUp);
                state.screen.add(state.inputBlocker);

                state.screenText = makeTextPool(scene, state.screen, state);

                if (scene.input.mouse && scene.input.mouse.disableContextMenu) {
                    scene.input.mouse.disableContextMenu();
                }
                if (scene.input && typeof scene.input.setTopOnly === "function") {
                    scene.input.setTopOnly(true);
                } else if (scene.input) {
                    scene.input.topOnly = true;
                }

                onRuntimeEvent(state, scene.scale, "resize", () => api.layout("phaser-scale-resize"));

                onRuntimeEvent(state, scene.input, "pointermove", (
                    /** @param {any} pointer */
                    (pointer) => api.updatePointer(pointer)
                ));
                onRuntimeEvent(state, scene.input, "pointerdown", (
                    /** @param {any} pointer */
                    (pointer) => {
                    trackPointer(pointer, { down: true });
                    api.updatePointer(pointer);
                    const button = buttonFromPointer(pointer);
                    if (api.curtain_active()) {
                        state.mouse.down[button] = true;
                        state.mouse.pressed[button] = true;
                        api.consume_pointer(undefined, pointer, true, "system");
                        return;
                    }
                    if (api.input_blocked()) {
                        api.consume_pointer(undefined, pointer, false, "system");
                        return;
                    }
                    state.mouse.down[button] = true;
                    state.mouse.pressed[button] = true;
                    }
                ));
                onRuntimeEvent(state, scene.input, "pointerup", (
                    /** @param {any} pointer */
                    (pointer) => {
                    trackPointer(pointer, { released: true });
                    api.updatePointer(pointer);
                    const button = buttonFromPointer(pointer);
                    state.mouse.down[button] = false;
                    state.mouse.released[button] = true;
                    if (api.input_blocked()) {
                        api.release_pointer(pointer, undefined, api.curtain_active());
                        return;
                    }
                    }
                ));
                onRuntimeEvent(state, scene.input, "pointerupoutside", (
                    /** @param {any} pointer */
                    (pointer) => {
                    trackPointer(pointer, { released: true });
                    api.updatePointer(pointer);
                    const button = buttonFromPointer(pointer);
                    state.mouse.down[button] = false;
                    state.mouse.released[button] = true;
                    api.release_pointer(pointer, undefined, true);
                    }
                ));
                onRuntimeEvent(state, scene.input, "pointercancel", (
                    /** @param {any} pointer */
                    (pointer) => {
                    if (pointer) {
                        trackPointer(pointer, { released: true });
                        api.release_pointer(pointer, undefined, true);
                    } else {
                        recoverInputFocus();
                    }
                    }
                ));
                onRuntimeEvent(state, scene.input, "gameout", () => recoverInputFocus());

                if (scene.input.keyboard) {
                    onRuntimeEvent(state, scene.input.keyboard, "keydown", (
                        /** @param {any} event */
                        (event) => {
                        const key = normalizeKey(event);
                        if (!state.physicalKeysDown[key]) state.keysPressedRaw[key] = true;
                        state.physicalKeysDown[key] = true;
                        if (api.input_blocked()) {
                            state.suppressedKeys[key] = true;
                            state.keysDown[key] = false;
                            return;
                        }
                        if (!state.keysDown[key]) state.keysPressed[key] = true;
                        state.keysDown[key] = true;
                        }
                    ));

                    onRuntimeEvent(state, scene.input.keyboard, "keyup", (
                        /** @param {any} event */
                        (event) => {
                        const key = normalizeKey(event);
                        delete state.physicalKeysDown[key];
                        if (state.suppressedKeys[key]) {
                            delete state.suppressedKeys[key];
                            state.keysDown[key] = false;
                            return;
                        }
                        state.keysDown[key] = false;
                        state.keysReleased[key] = true;
                        }
                    ));
                }

                onRuntimeDomEvent(state, root, "blur", () => recoverInputFocus());
                const documentTarget = /** @type {any} */ (root).document;
                onRuntimeDomEvent(state, documentTarget, "visibilitychange", () => {
                    if (documentTarget.hidden) {
                        recoverInputFocus();
                        return;
                    }
                    // Drop accumulated simulation time after backgrounding so catch-up
                    // cannot explode when the tab becomes visible again.
                    state.simulation.accumulatorMs = 0;
                });

                onceRuntimeEvent(state, scene.events, "shutdown", () => api.cleanup("scene_shutdown"));
                onceRuntimeEvent(state, scene.events, "destroy", () => api.cleanup("scene_destroy"));

                api.layout("mount");
                return api;
            },

            layout(source = "api") {
                const render = syncRenderResolution(scene, state, cfg, /** @type {Window & typeof globalThis} */ (/** @type {unknown} */ (root)), source);
                const resolution = render.resolution || 1;
                const w = render.cssWidth || scene.scale.width;
                const h = render.cssHeight || scene.scale.height;
                const parent = scene.game && scene.game.canvas ? scene.game.canvas.parentElement : null;
                const documentLike = /** @type {any} */ (root).document;
                const insetSource = parent || (documentLike && documentLike.documentElement) || null;
                const next = resolveRoomLayout(w, h, cfg, readSafeInsets(root, insetSource));

                state.layout.scale = next.scale;
                state.layout.x = next.x;
                state.layout.y = next.y;
                state.layout.roomWidth = next.roomWidth;
                state.layout.roomHeight = next.roomHeight;
                state.layout.profile = next.profile;
                state.layout.orientation = next.orientation;
                state.layout.scaleMode = next.scaleMode;
                state.viewport = next.viewport;

                if (state.world) {
                    state.world.setPosition(state.layout.x * resolution, state.layout.y * resolution);
                    state.world.setScale(state.layout.scale * resolution);
                }
                if (state.screen) {
                    state.screen.setPosition(0, 0);
                    state.screen.setScale(resolution);
                }
                if (state.inputBlocker) {
                    state.inputBlocker.setSize(w, h);
                    state.inputBlocker.setPosition(0, 0);
                }

                scene.cameras.main.setViewport(0, 0, render.width || w, render.height || h);
                for (const modal of state.modals) modal.layout();

                return api;
            },

            updatePointer(pointer) {
                const record = trackPointer(pointer);
                if (!record) return api;
                state.mouse.screenX = record.screenX;
                state.mouse.screenY = record.screenY;
                state.mouse.x = record.x;
                state.mouse.y = record.y;
                return api;
            },

            input_blocked() {
                return state.modals.length > 0 ||
                    state.inputGate.transitions > 0 ||
                    hasBlockingPointerCapture() ||
                    state.currentTime < state.inputGate.pausedUntil ||
                    curtain_active(/** @type {any} */ (state));
            },

            update_input_blocker() {
                if (!state.inputBlocker || !state.inputBlocker.input) return api;
                state.inputBlocker.input.enabled = api.input_blocked();
                return api;
            },

            clear_pointer_state() {
                state.mouse.down = Object.create(null);
                state.mouse.pressed = Object.create(null);
                state.mouse.released = Object.create(null);
                return api;
            },

            pause_input(ms, preservePointerState) {
                const blockMs = normalizeDelayMs(ms, 120, 0);
                state.inputGate.pausedUntil = Math.max(state.inputGate.pausedUntil, state.currentTime + blockMs);
                suppressHeldKeys();
                if (!preservePointerState) api.clear_pointer_state();
                api.update_input_blocker();
                return api;
            },

            consume_pointer(ms, pointer, preservePointerState, owner) {
                if (pointer) {
                    const id = pointerGateKey(pointer);
                    const channel = owner === undefined || owner === null ? "system" : owner;
                    state.inputGate.capturedPointers[id] = channel === true ? "system" : String(channel);
                    const record = trackPointer(pointer, { down: true });
                    if (record) record.owner = state.inputGate.capturedPointers[id];
                }
                api.pause_input(ms, preservePointerState);
                return api;
            },

            release_pointer(pointer, ms, preservePointerState, owner) {
                if (pointer) {
                    const id = pointerGateKey(pointer);
                    const current = state.inputGate.capturedPointers[id];
                    if (owner === undefined || owner === null || !current || current === String(owner) || owner === true) {
                        delete state.inputGate.capturedPointers[id];
                    }
                    trackPointer(pointer, { released: true });
                }
                api.pause_input(ms, preservePointerState);
                return api;
            },

            get_pointer(id) {
                if (id === undefined || id === null) return null;
                return state.pointers.get(String(id)) || null;
            },

            active_pointers() {
                return Array.from(state.pointers.values()).filter((pointer) => pointer && pointer.active);
            },

            capture_pointer(id, owner) {
                const key = String(id);
                const channel = owner === undefined || owner === null ? "system" : String(owner);
                state.inputGate.capturedPointers[key] = channel;
                const record = state.pointers.get(key);
                if (record) record.owner = channel;
                api.update_input_blocker();
                return api;
            },

            release_pointer_id(id, owner) {
                const key = String(id);
                const current = state.inputGate.capturedPointers[key];
                if (owner === undefined || owner === null || !current || current === String(owner)) {
                    delete state.inputGate.capturedPointers[key];
                }
                const record = state.pointers.get(key);
                if (record) record.owner = null;
                api.update_input_blocker();
                return api;
            },

            define_layer(name, depth) {
                if (name && typeof name === "object" && !Array.isArray(name) && depth === undefined) {
                    const pending = Object.entries(name).map(([rawName, rawDepth]) => {
                        const layerName = String(rawName || "").trim();
                        if (!layerName) throw new TypeError("GM.layer.define requires non-empty layer names.");
                        const layerDepth = Number(rawDepth);
                        if (!Number.isFinite(layerDepth)) {
                            throw new TypeError(`GM.layer.define requires a finite depth for ${layerName}.`);
                        }
                        return /** @type {[string, number]} */ ([layerName, layerDepth]);
                    });
                    if (pending.length === 0) throw new TypeError("GM.layer.define requires at least one layer.");
                    for (const [layerName, layerDepth] of pending) {
                        state.layerRegistry.set(layerName, layerDepth);
                        worldLayers.ensure(layerName, layerDepth);
                    }
                    return api;
                }
                const layerName = String(name || "").trim();
                if (!layerName) throw new TypeError("GM.layer.define requires a non-empty layer name.");
                const layerDepth = Number(depth);
                if (!Number.isFinite(layerDepth)) throw new TypeError("GM.layer.define requires a finite depth.");
                state.layerRegistry.set(layerName, layerDepth);
                worldLayers.ensure(layerName, layerDepth);
                return api;
            },

            begin_input_transition(ms) {
                let finished = false;
                state.inputGate.transitions += 1;
                api.pause_input(ms);

                return () => {
                    if (finished) return;
                    finished = true;
                    state.inputGate.transitions = Math.max(0, state.inputGate.transitions - 1);
                    api.pause_input(ms);
                };
            },

            clear_input_gate() {
                recoverInputFocus();
                return api;
            },

            beginDraw() {
                worldLayers.beginFrame();
                state.screenGfx.clear();
                hideUiPanels();
                for (const button of state.uiButtons.values()) button.beginFrame();
                state.screenText.begin();
                selectWorldLayer("world");
                api.resetDrawState();

                if (cfg.stage) {
                    api.drawStage();
                }

                return api;
            },

            endFrame() {
                state.mouse.pressed = Object.create(null);
                state.mouse.released = Object.create(null);
                state.keysPressed = Object.create(null);
                state.keysPressedRaw = Object.create(null);
                state.keysReleased = Object.create(null);
                if (state.pointers instanceof Map) {
                    for (const record of state.pointers.values()) endPointerFrame(record);
                }
                const primary = state.primaryPointerId && state.pointers.get(state.primaryPointerId);
                if (!primary || (!primary.down && !primary.released && !primary.active)) {
                    state.primaryPointerId = null;
                }
                pruneUiButtons();
                return api;
            },

            resetDrawState() {
                resetRuntimeDrawState(state);
                return api;
            },

            applyFill(gfx) {
                applyRuntimeFill(state, gfx);
                return api;
            },

            applyStroke(gfx) {
                applyRuntimeStroke(state, gfx);
                return api;
            },

            drawStage() {
                drawRuntimeStage(state, cfg, state.worldGfx, api.room_width, api.room_height);
                return api;
            },

            tick(time, delta) {
                if (state.cleanedUp) return api;
                state.frameId += 1;
                state.currentTime = time;
                const maxDelta = Number.isFinite(Number(cfg.maxFrameDeltaMs)) ? Number(cfg.maxFrameDeltaMs) : 100;
                const clampedDelta = Math.min(Math.max(0, Number(delta) || 0), Math.max(0, maxDelta));
                state.deltaMs = clampedDelta;
                state.simulation.stepsThisFrame = 0;
                beginRuntimePerfFrame(state, clampedDelta);
                api.update_input_blocker();
                try {
                    // Consume the startup curtain before gameplay step code can
                    // observe the same pointer press.
                    if (cfg.curtain && api.curtain_active() && state.mouse.pressed[INPUT.mb_left]) {
                        dismissCurtain(/** @type {any} */ (state), scene, cfg.curtainFadeMs, /** @type {any} */ (cfg), normalizeDelayMs);
                    }

                    beginRuntimePerfSection(state, "step");
                    try {
                        const simulationHz = Number(cfg.simulationHz) || 0;
                        if (simulationHz > 0) {
                            const stepMs = 1000 / simulationHz;
                            const maxSteps = Math.max(1, Number(cfg.maxCatchUpSteps) || 5);
                            state.simulation.fixedDeltaSec = stepMs / 1000;
                            state.simulation.accumulatorMs += clampedDelta;
                            let steps = 0;
                            while (state.simulation.accumulatorMs >= stepMs && steps < maxSteps) {
                                state.simulation.accumulatorMs -= stepMs;
                                runGameStep(stepMs / 1000, "step");
                                steps += 1;
                            }
                            if (steps >= maxSteps) state.simulation.accumulatorMs = 0;
                            state.simulation.stepsThisFrame = steps;
                            state.simulation.alpha = stepMs > 0 ? state.simulation.accumulatorMs / stepMs : 0;
                        } else {
                            state.simulation.fixedDeltaSec = 0;
                            state.simulation.alpha = 0;
                            runGameStep(clampedDelta / 1000, "step");
                            state.simulation.stepsThisFrame = 1;
                        }
                    } finally {
                        endRuntimePerfSection(state, "step");
                        state.currentInstance = null;
                    }

                    api.beginDraw();

                    beginRuntimePerfSection(state, "draw");
                    try {
                        if (typeof cfg.draw === "function") cfg.draw(api);
                        selectWorldLayer("world");
                        api.drawInstances();
                    } catch (error) {
                        if (typeof cfg.onError === "function") {
                            cfg.onError(error, { phase: "draw", frame: state.frameId, time: state.currentTime });
                        }
                        throw error;
                    } finally {
                        endRuntimePerfSection(state, "draw");
                        state.currentInstance = null;
                        selectWorldLayer("world");
                    }

                    beginRuntimePerfSection(state, "ui");
                    try {
                        if (typeof cfg.ui === "function") cfg.ui(api);
                        if (cfg.curtain) api.curtain(cfg.curtainText);
                        if (typeof cfg.gui === "function") cfg.gui(api);
                    } catch (error) {
                        if (typeof cfg.onError === "function") {
                            cfg.onError(error, { phase: "ui", frame: state.frameId, time: state.currentTime });
                        }
                        throw error;
                    } finally {
                        endRuntimePerfSection(state, "ui");
                        state.currentInstance = null;
                    }

                    // Preserve the legacy diagnostics surface while named layers own
                    // their own text pools internally.
                    worldLayers.publishTextDiagnostics();
                } finally {
                    api.endFrame();
                    finalizeRuntimePerfFrame(state);
                    state.currentInstance = null;
                }
                return api;
            },

            stepInstances() {
                stepRuntimeInstances(state, api);
                return api;
            },

            drawInstances() {
                drawRuntimeInstances(state, api);
                return api;
            },

            load_sprite(key, url) {
                scene.load.image(key, url);
                return api;
            },

            load_sound(key, url) {
                scene.load.audio(key, url);
                return api;
            },

            load_spritesheet(key, url, frameWidth, frameHeight) {
                scene.load.spritesheet(key, url, { frameWidth, frameHeight });
                return api;
            },

            draw_set_color(value) {
                setRuntimeDrawColor(state, value);
                return api;
            },

            draw_set_alpha(value) {
                setRuntimeDrawAlpha(state, value);
                return api;
            },

            draw_set_line_width(value) {
                setRuntimeDrawLineWidth(state, value);
                return api;
            },

            draw_set_font(font, size, bold) {
                setRuntimeDrawFont(state, font, size, bold);
                return api;
            },

            draw_set_halign(value) {
                setRuntimeDrawHAlign(state, value);
                return api;
            },

            draw_set_valign(value) {
                setRuntimeDrawVAlign(state, value);
                return api;
            },

            draw_rectangle(x1, y1, x2, y2, outline) {
                drawRuntimeRectangle(state, state.worldGfx, x1, y1, x2, y2, outline);
                return api;
            },

            draw_roundrect(x1, y1, x2, y2, radius, outline) {
                drawRuntimeRoundRect(state, state.worldGfx, x1, y1, x2, y2, radius, outline);
                return api;
            },

            draw_circle(x, y, radius, outline) {
                drawRuntimeCircle(state, state.worldGfx, x, y, radius, outline);
                return api;
            },

            draw_line(x1, y1, x2, y2, options) {
                drawRuntimeLine(state, state.worldGfx, x1, y1, x2, y2, options);
                return api;
            },

            draw_polyline(points, options) {
                drawRuntimePolyline(state, state.worldGfx, points, options);
                return api;
            },

            draw_text(x, y, text) {
                return drawRuntimeText(state, state.worldText, state.world, x, y, text);
            },

            draw_text_ext(x, y, text, options) {
                return drawRuntimeTextExt(state, state.worldText, state.world, x, y, text, options);
            },

            draw_text_fit(x, y, text, options) {
                return drawRuntimeTextFit(state, state.worldText, state.world, x, y, text, options);
            },

            draw_gui_rectangle(x1, y1, x2, y2, outline) {
                drawRuntimeRectangle(state, state.screenGfx, x1, y1, x2, y2, outline);
                return api;
            },

            draw_gui_text(x, y, text) {
                return drawRuntimeText(state, state.screenText, state.screen, x, y, text);
            },

            draw_gui_text_ext(x, y, text, options) {
                return drawRuntimeTextExt(state, state.screenText, state.screen, x, y, text, options);
            },

            draw_gui_text_fit(x, y, text, options) {
                return drawRuntimeTextFit(state, state.screenText, state.screen, x, y, text, options);
            },

            draw_sprite(key, frame, x, y) {
                return api.draw_sprite_ext(key, frame, x, y, 1, 1, 0, 0xffffff, 1);
            },

            draw_sprite_ext(key, frame, x, y, xscale, yscale, rotation, color, alpha) {
                return drawRuntimeSpriteExt(state, state.worldSprites, key, frame, x, y, xscale, yscale, rotation, color, alpha);
            },

            render_layer(name, depth) {
                selectWorldLayer(name, depth);
                return api;
            },

            button(x, y, w, h, text, onTap, options) {
                options = options || {};

                const id = options.id || [x, y, w, h, text].join(":");
                let buttonObject = state.uiButtons.get(id);
                if (!buttonObject) {
                    buttonObject = new GMButtonObject(scene, api, /** @type {any} */ (state), id);
                    scene.add.existing(buttonObject);
                    state.activeWorldContainer.add(buttonObject);
                    state.uiButtons.set(id, buttonObject);
                }
                if (buttonObject.parentContainer !== state.activeWorldContainer) {
                    state.activeWorldContainer.add(buttonObject);
                }

                buttonObject.configure(x, y, w, h, text, options);
                const pressed = buttonObject.consumePress();
                if (pressed && typeof onTap === "function") onTap(api);

                return pressed;
            },

            button_center(x, y, w, h, text, onTap, options) {
                return api.button(x - w / 2, y - h / 2, w, h, text, onTap, options);
            },

            nineslice_window(x, y, w, h, options) {
                const panelOptions = options || {};
                const index = state.uiPanelCursor++;
                const signature = JSON.stringify(panelOptions);
                let item = state.uiPanels[index];
                if (!item || item.__gmNineSliceRuntimeSignature !== signature) {
                    if (item && typeof item.destroy === "function") item.destroy(true);
                    item = uiToolkit.createNineSliceObject(scene, x, y, w, h, panelOptions);
                    item.__gmNineSliceRuntimeSignature = signature;
                    state.uiPanels[index] = item;
                    state.screen.add(item);
                } else {
                    item.setPosition?.(x, y);
                    if (typeof item.setSize === "function") item.setSize(w, h);
                    else if (typeof item.setDisplaySize === "function") item.setDisplaySize(w, h);
                }
                item.setVisible?.(true);
                return item;
            },

            modal_notice(title, message, options) {
                if (title && typeof title === "object") {
                    return createModal(api, /** @type {any} */ (state), title, /** @type {any} */ (uiToolkit));
                }
                return createModal(api, /** @type {any} */ (state), Object.assign({}, options || {}, { title, message }), /** @type {any} */ (uiToolkit));
            },

            modal_close_all() {
                for (const modal of state.modals.slice()) modal.close("close_all");
                return api;
            },

            ui_set_theme(theme) {
                uiToolkit.setTheme(theme);
                destroyUiPanels("theme_change");
                uiToolkit.ensureTextures(scene, true);
                return api;
            },

            ui_get_theme() {
                return uiToolkit.getTheme();
            },

            ui_export_textures() {
                uiToolkit.ensureTextures(scene);
                return uiToolkit.exportTextures();
            },

            ui_download_textures(prefix) {
                uiToolkit.ensureTextures(scene);
                return uiToolkit.downloadTextures(prefix);
            },

            curtain(text, fadeMs) {
                return curtain(text, fadeMs, /** @type {any} */ (state), api, scene, /** @type {any} */ (cfg), normalizeDelayMs, COLORS, ALIGN, INPUT);
            },

            curtain_active() {
                return curtain_active(/** @type {any} */ (state));
            },

            instance_create_layer(x, y, layer, objectDef, createVars) {
                return createRuntimeInstance(state, api, x, y, layer, objectDef, createVars);
            },

            instance_destroy(inst) {
                destroyRuntimeInstance(state, api, inst);
                return api;
            },

            instance_exists(target) {
                return runtimeInstanceExists(state, target);
            },

            instance_number(objectDef) {
                return countRuntimeInstances(state, objectDef);
            },

            instance_find(objectDef, index) {
                return findRuntimeInstance(state, objectDef, index);
            },

            alarm_set(index, frames, inst) {
                setRuntimeAlarm(state, index, frames, inst);
                return api;
            },

            keyboard_check(key) {
                if (api.input_blocked()) return false;
                return !!state.keysDown[normalizeKey(key)];
            },

            keyboard_check_pressed(key) {
                if (api.input_blocked()) return false;
                return !!state.keysPressed[normalizeKey(key)];
            },

            keyboard_check_pressed_raw(key) {
                return !!state.keysPressedRaw[normalizeKey(key)];
            },

            keyboard_check_released(key) {
                if (api.input_blocked()) return false;
                return !!state.keysReleased[normalizeKey(key)];
            },

            mouse_check_button(button) {
                if (api.input_blocked()) return false;
                return !!state.mouse.down[button || INPUT.mb_left];
            },

            mouse_check_button_pressed(button) {
                if (api.input_blocked()) return false;
                return !!state.mouse.pressed[button || INPUT.mb_left];
            },

            mouse_check_button_released(button) {
                if (api.input_blocked()) return false;
                return !!state.mouse.released[button || INPUT.mb_left];
            },

            mouse_check_button_pressed_raw(button) {
                return !!state.mouse.pressed[button || INPUT.mb_left];
            },

            show_debug_message(message) {
                logDebugMessage(message);
                return api;
            },

            tween(target, options) {
                return scene.tweens.add(Object.assign({ targets: target }, options || {}));
            },

            wait(ms, fn) {
                return scene.time.delayedCall(normalizeDelayMs(ms, 0, 0), () => {
                    if (typeof fn === "function") fn(api);
                });
            },

            every(ms, fn) {
                return scene.time.addEvent({
                    delay: normalizeDelayMs(ms, 16, 1),
                    loop: true,
                    callback: () => {
                        if (typeof fn === "function") fn(api);
                    }
                });
            },

            sound_play(key, config) {
                return scene.sound.play(key, config || {});
            }
        };

        GM._active = api;
        return api;
    }

    /**
     * @param {RuntimeConfig} cfg
     * @returns {any}
     */
    function makeScene(cfg) {
        return class GMScene extends Phaser.Scene {
            constructor() {
                super("GMScene");
                this.gm = null;
            }

            ensureRuntime() {
                if (!this.gm || this.gm.state.cleanedUp) {
                    this.gm = makeRuntime(this, cfg);
                }
                return this.gm;
            }

            preload() {
                const gm = this.ensureRuntime();
                if (typeof cfg.preload === "function") cfg.preload(gm);
            }

            create() {
                const gm = this.ensureRuntime();
                gm.mount();
                if (typeof cfg.create === "function") cfg.create(gm);
            }

            /**
             * @param {number} time
             * @param {number} delta
             */
            update(time, delta) {
                if (!this.gm || this.gm.state.cleanedUp) return;
                this.gm.tick(time, delta);
            }
        };
    }

    const startGame = createGameStarter({ root, Phaser: PhaserLibrary, makeScene, installGlobals });
    GM.start = function start(
        /** @type {any} */
        config
    ) {
        if (GM._game) {
            throw new Error("GM.app.start cannot run while another GM game is active; destroy the current game first.");
        }
        if (config && config.randomSeed !== undefined && config.randomSeed !== null) {
            mathApi.setSeed(config.randomSeed);
        }
        const game = startGame(config);
        GM._game = game;
        const originalDestroy = typeof game.destroy === "function" ? game.destroy.bind(game) : null;
        let gameDestroyed = false;
        /** @param {...any} args */
        game.destroy = function destroyGMGame(...args) {
            if (gameDestroyed) return;
            gameDestroyed = true;
            try {
                if (originalDestroy) originalDestroy(...args);
            } finally {
                if (GM._active && typeof GM._active.cleanup === "function") GM._active.cleanup("game_destroy");
                GM._active = null;
                if (GM._game === game) GM._game = null;
                if (typeof GM._globalsDisposer === "function") GM._globalsDisposer();
            }
        };
        return game;
    };

    installFacadeNamespaces({
        GM,
        root,
        COLORS,
        INPUT,
        math: mathApi,
        uiToolkit: /** @type {any} */ (uiToolkit),
        installGlobals,
        active,
        activeOrNull,
        callActive,
        defineReadonly
    });

    /** @type {any} */ (root).GM = GM;
    return GM;
}
