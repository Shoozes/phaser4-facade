// @ts-check

import {
    ALIGN,
    COLORS,
    INPUT
} from "./core/constants.js";
import {
    onRuntimeEvent,
    onceRuntimeEvent,
    runRuntimeCleanup
} from "./core/cleanup.js";
import { createMathApi } from "./core/math-api.js";
import {
    buttonFromPointer,
    consumeInputEvent,
    hasObjectKeys,
    normalizeDelayMs,
    normalizeKey,
    pointerGateKey
} from "./core/input.js";
import { createRuntimeButtonClass } from "./core/button.js";
import {
    applyRuntimeFill,
    applyRuntimeStroke,
    drawRuntimeCircle,
    drawRuntimeLine,
    drawRuntimeRectangle,
    drawRuntimeRoundRect,
    drawRuntimeSpriteExt,
    drawRuntimeStage,
    drawRuntimeText,
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
import { curtain, curtain_active } from "./core/curtain.js";
import { logDebugMessage } from "./core/debug.js";

/**
 * @typedef {typeof globalThis & Record<string, unknown> & { Phaser?: unknown, GM?: unknown }} RuntimeRoot
 * @typedef {{ Game: new (...args: any[]) => any, Scene: new (...args: any[]) => any, Scale?: Record<string, unknown> }} PhaserRuntime
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
 * @property {(...args: any[]) => any} draw_text
 * @property {(...args: any[]) => any} draw_gui_rectangle
 * @property {(...args: any[]) => any} draw_gui_text
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
 * @property {(...args: any[]) => any} keyboard_check_released
 * @property {(...args: any[]) => any} mouse_check_button
 * @property {(...args: any[]) => any} mouse_check_button_pressed
 * @property {(...args: any[]) => any} mouse_check_button_released
 * @property {(...args: any[]) => any} show_debug_message
 * @property {(...args: any[]) => any} tween
 * @property {(...args: any[]) => any} wait
 * @property {(...args: any[]) => any} every
 * @property {(...args: any[]) => any} sound_play
 * @property {(name: string, depth?: number) => RuntimeApi} render_layer
 */

/**
 * @param {RuntimeRoot} root
 * @param {PhaserRuntime} Phaser
 */
export function installGMRuntime(root, Phaser) {
    "use strict";

    if (!Phaser || typeof Phaser.Game !== "function") {
        throw new Error("GM runtime requires Phaser before gm-phaser4.js loads.");
    }

    root.Phaser = root.Phaser || Phaser;

    /** @type {DynamicRecord} */
    const GM = {
        version: "0.1.0",
        _active: null,
        _game: null,
        _globalsInstalled: false,
        _globalsDisposer: null
    };
    const uiToolkit = createUiToolkit();
    const GMButtonObject = createRuntimeButtonClass(Phaser);
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
                    if (typeof modal.close === "function") {
                        modal.close(reason || "cleanup");
                    } else if (typeof modal.destroy === "function") {
                        modal.destroy(reason || "cleanup");
                    }
                }

                for (const inst of state.instances.slice()) {
                    destroyRuntimeInstance(state, api, inst);
                }
                state.instances = [];

                for (const buttonObject of state.uiButtons.values()) {
                    if (buttonObject && typeof buttonObject.destroy === "function") buttonObject.destroy();
                }
                state.uiButtons.clear();

                if (state.world && typeof state.world.destroy === "function") state.world.destroy(true);
                if (state.screen && typeof state.screen.destroy === "function") state.screen.destroy(true);
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
                    api.release_pointer(pointer);
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

                onRuntimeEvent(state, scene.scale, "resize", () => api.layout());

                onRuntimeEvent(state, scene.input, "pointermove", (
                    /** @param {any} pointer */
                    (pointer) => api.updatePointer(pointer)
                ));
                onRuntimeEvent(state, scene.input, "pointerdown", (
                    /** @param {any} pointer */
                    (pointer) => {
                    api.updatePointer(pointer);
                    if (api.input_blocked()) {
                        api.consume_pointer(undefined, pointer);
                        return;
                    }
                    const button = buttonFromPointer(pointer);
                    state.mouse.down[button] = true;
                    state.mouse.pressed[button] = true;
                    }
                ));
                onRuntimeEvent(state, scene.input, "pointerup", (
                    /** @param {any} pointer */
                    (pointer) => {
                    api.updatePointer(pointer);
                    if (api.input_blocked()) {
                        api.release_pointer(pointer);
                        return;
                    }
                    const button = buttonFromPointer(pointer);
                    state.mouse.down[button] = false;
                    state.mouse.released[button] = true;
                    }
                ));

                if (scene.input.keyboard) {
                    onRuntimeEvent(state, scene.input.keyboard, "keydown", (
                        /** @param {any} event */
                        (event) => {
                        const key = normalizeKey(event);
                        if (!state.keysDown[key]) state.keysPressed[key] = true;
                        state.keysDown[key] = true;
                        }
                    ));

                    onRuntimeEvent(state, scene.input.keyboard, "keyup", (
                        /** @param {any} event */
                        (event) => {
                        const key = normalizeKey(event);
                        state.keysDown[key] = false;
                        state.keysReleased[key] = true;
                        }
                    ));
                }

                onceRuntimeEvent(state, scene.events, "shutdown", () => api.cleanup("scene_shutdown"));
                onceRuntimeEvent(state, scene.events, "destroy", () => api.cleanup("scene_destroy"));

                api.layout();
                return api;
            },

            layout() {
                const render = syncRenderResolution(scene, state, cfg, /** @type {Window & typeof globalThis} */ (/** @type {unknown} */ (root)));
                const resolution = render.resolution || 1;
                const w = render.cssWidth || scene.scale.width;
                const h = render.cssHeight || scene.scale.height;
                const next = resolveRoomLayout(w, h, cfg);

                state.layout.scale = next.scale;
                state.layout.x = next.x;
                state.layout.y = next.y;
                state.layout.roomWidth = next.roomWidth;
                state.layout.roomHeight = next.roomHeight;
                state.layout.profile = next.profile;
                state.layout.orientation = next.orientation;

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
                const scale = state.layout.scale || 1;
                const resolution = state.render.resolution || 1;
                const screenX = pointer.x / resolution;
                const screenY = pointer.y / resolution;

                state.mouse.screenX = screenX;
                state.mouse.screenY = screenY;
                state.mouse.x = (screenX - state.layout.x) / scale;
                state.mouse.y = (screenY - state.layout.y) / scale;
                return api;
            },

            input_blocked() {
                return state.modals.length > 0 ||
                    state.inputGate.transitions > 0 ||
                    hasObjectKeys(state.inputGate.capturedPointers) ||
                    state.currentTime < state.inputGate.pausedUntil;
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

            pause_input(ms) {
                const blockMs = normalizeDelayMs(ms, 120, 0);
                state.inputGate.pausedUntil = Math.max(state.inputGate.pausedUntil, state.currentTime + blockMs);
                api.clear_pointer_state();
                api.update_input_blocker();
                return api;
            },

            consume_pointer(ms, pointer) {
                if (pointer) state.inputGate.capturedPointers[pointerGateKey(pointer)] = true;
                api.pause_input(ms);
                return api;
            },

            release_pointer(pointer, ms) {
                if (pointer) delete state.inputGate.capturedPointers[pointerGateKey(pointer)];
                api.pause_input(ms);
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
                state.inputGate.capturedPointers = Object.create(null);
                state.inputGate.transitions = 0;
                api.clear_pointer_state();
                api.update_input_blocker();
                return api;
            },

            beginDraw() {
                worldLayers.beginFrame();
                state.screenGfx.clear();
                for (const button of state.uiButtons.values()) button.beginFrame();
                state.screenText.begin();
                selectWorldLayer("world", 0);
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
                state.keysReleased = Object.create(null);
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
                beginRuntimePerfFrame(state);
                state.currentTime = time;
                state.deltaMs = delta;
                api.update_input_blocker();

                beginRuntimePerfSection(state, "step");
                if (typeof cfg.step === "function") cfg.step(api, delta / 1000);
                api.stepInstances();
                endRuntimePerfSection(state, "step");

                api.beginDraw();

                beginRuntimePerfSection(state, "draw");
                if (typeof cfg.draw === "function") cfg.draw(api);
                selectWorldLayer("world", 0);
                api.drawInstances();
                endRuntimePerfSection(state, "draw");

                beginRuntimePerfSection(state, "ui");
                if (typeof cfg.ui === "function") cfg.ui(api);
                if (cfg.curtain) api.curtain(cfg.curtainText);
                if (typeof cfg.gui === "function") cfg.gui(api);
                endRuntimePerfSection(state, "ui");

                // Preserve the legacy diagnostics surface while named layers own
                // their own text pools internally.
                worldLayers.publishTextDiagnostics();

                api.endFrame();
                finalizeRuntimePerfFrame(state);
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

            draw_line(x1, y1, x2, y2) {
                drawRuntimeLine(state, state.worldGfx, x1, y1, x2, y2);
                return api;
            },

            draw_text(x, y, text) {
                return drawRuntimeText(state, state.worldText, state.world, x, y, text);
            },

            draw_gui_rectangle(x1, y1, x2, y2, outline) {
                drawRuntimeRectangle(state, state.screenGfx, x1, y1, x2, y2, outline);
                return api;
            },

            draw_gui_text(x, y, text) {
                return drawRuntimeText(state, state.screenText, state.screen, x, y, text);
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
                const item = uiToolkit.createNineSliceObject(scene, x, y, w, h, options || {});
                state.screen.add(item);
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

            instance_create_layer(x, y, layer, objectDef) {
                return createRuntimeInstance(state, api, x, y, layer, objectDef);
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
                return !!state.keysDown[normalizeKey(key)];
            },

            keyboard_check_pressed(key) {
                return !!state.keysPressed[normalizeKey(key)];
            },

            keyboard_check_released(key) {
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

    const startGame = createGameStarter({ root, Phaser, makeScene, installGlobals });
    GM.start = function start(
        /** @type {any} */
        config
    ) {
        if (GM._game) {
            throw new Error("GM.app.start cannot run while another GM game is active; destroy the current game first.");
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
}
