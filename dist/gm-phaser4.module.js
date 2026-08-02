const DEFAULTS = {
    parent: "game",
    width: 720,
    height: 1280,
    minHeight: 1280,
    // Design reference height used for portrait profile labeling.
    targetHeight: 1560,
    maxHeight: 1680,
    desktopBreakpoint: 1000,
    desktopMinWidth: 1280,
    desktopHeight: 720,
    desktopMaxWidth: 1920,
    responsive: false,
    bleed: 300,
    background: 0x111111,
    safeColor: 0x333333,
    bleedColor: 0x222222,
    stage: true,
    globals: true,
    renderQuality: "smooth",
    pixelArt: false,
    antialias: true,
    roundPixels: false,
    renderResolution: 1,
    maxRenderResolution: 3,
    curtain: false,
    curtainText: "TAP TO START",
    curtainFadeMs: 350
};
const DEFAULT_MODAL_INPUT_BLOCK_MS = 650;
const DEFAULT_MODAL_OPEN_MS = 300;
const DEFAULT_MODAL_CLOSE_MS = 260;
const COLORS = {
    c_black: 0x000000,
    c_white: 0xffffff,
    c_gray: 0x808080,
    c_grey: 0x808080,
    c_dkgray: 0x404040,
    c_dkgrey: 0x404040,
    c_ltgray: 0xc0c0c0,
    c_ltgrey: 0xc0c0c0,
    c_red: 0xff0000,
    c_green: 0x008000,
    c_lime: 0x00ff00,
    c_blue: 0x0000ff,
    c_yellow: 0xffff00,
    c_orange: 0xffa500,
    c_purple: 0x800080,
    c_aqua: 0x00ffff,
    c_fuchsia: 0xff00ff
};
const ALIGN = {
    fa_left: "left",
    fa_center: "center",
    fa_right: "right",
    fa_top: "top",
    fa_middle: "middle",
    fa_bottom: "bottom"
};
const INPUT = {
    mb_left: "left",
    mb_right: "right",
    mb_middle: "middle",
    vk_left: "LEFT",
    vk_right: "RIGHT",
    vk_up: "UP",
    vk_down: "DOWN",
    vk_space: "SPACE",
    vk_enter: "ENTER",
    vk_escape: "ESCAPE",
    vk_shift: "SHIFT",
    vk_control: "CTRL",
    vk_alt: "ALT"
};

// @ts-check

/**
 * @param {any} state
 * @param {(reason?: string) => void} fn
 */
function addRuntimeCleanup(state, fn) {
    if (typeof fn === "function") state.cleanup.push(fn);
    return fn;
}

/**
 * @param {any} state
 * @param {any} emitter
 * @param {string} eventName
 * @param {Function} handler
 */
function onRuntimeEvent(state, emitter, eventName, handler) {
    if (!emitter || typeof emitter.on !== "function" || typeof handler !== "function") return handler;
    emitter.on(eventName, handler);
    addRuntimeCleanup(state, () => {
        if (typeof emitter.off === "function") {
            emitter.off(eventName, handler);
        } else if (typeof emitter.removeListener === "function") {
            emitter.removeListener(eventName, handler);
        }
    });
    return handler;
}

/**
 * @param {any} state
 * @param {any} emitter
 * @param {string} eventName
 * @param {Function} handler
 */
function onceRuntimeEvent(state, emitter, eventName, handler) {
    if (!emitter || typeof handler !== "function") return handler;
    if (typeof emitter.once === "function") {
        emitter.once(eventName, handler);
        addRuntimeCleanup(state, () => {
            if (typeof emitter.off === "function") {
                emitter.off(eventName, handler);
            } else if (typeof emitter.removeListener === "function") {
                emitter.removeListener(eventName, handler);
            }
        });
        return handler;
    }
    return onRuntimeEvent(state, emitter, eventName, handler);
}

/**
 * @param {any} state
 * @param {string} [reason]
 */
function runRuntimeCleanup(state, reason) {
    if (state.cleanedUp) return false;
    state.cleanedUp = true;
    const callbacks = state.cleanup.slice().reverse();
    state.cleanup.length = 0;
    for (const cleanup of callbacks) {
        try {
            cleanup(reason);
        } catch {
            // Cleanup must be best-effort during scene shutdown.
        }
    }
    return true;
}

// @ts-check

/** @type {Record<string, number>} */
const NAMED_COLORS = COLORS;

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function toColor(value, fallback = 0xffffff) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return fallback;

    const named = NAMED_COLORS[String(value)];
    if (named !== undefined) return named;

    let hex = value.trim();
    if (hex[0] === "#") hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split("").map((part) => part + part).join("");

    const parsed = parseInt(hex, 16);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * @param {unknown} value
 * @param {string} fallback
 */
function toCssColor(value, fallback = "#ffffff") {
    if (typeof value === "number" && Number.isFinite(value)) {
        return "#" + value.toString(16).padStart(6, "0");
    }
    if (typeof value === "string") {
        if (NAMED_COLORS[value] !== undefined) return toCssColor(NAMED_COLORS[value], fallback);
        return value;
    }
    return fallback;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * @param {...unknown} items
 * @returns {unknown}
 */
function choose(...items) {
    if (items.length <= 0) return undefined;
    return items[Math.floor(Math.random() * items.length)];
}

/**
 * @param {number} max
 */
function random(max) {
    return Math.random() * max;
}

/**
 * @param {number} min
 * @param {number} max
 */
function random_range(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * @param {number} max
 */
function irandom(max) {
    return Math.floor(Math.random() * (max + 1));
}

/**
 * @param {number} min
 * @param {number} max
 */
function irandom_range(min, max) {
    return Math.floor(random_range(min, max + 1));
}

/**
 * @param {number} degrees
 */
function degtorad(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * @param {number} radians
 */
function radtodeg(radians) {
    return radians * 180 / Math.PI;
}

/**
 * @param {number} degrees
 */
function dsin(degrees) {
    return Math.sin(degtorad(degrees));
}

/**
 * @param {number} degrees
 */
function dcos(degrees) {
    return Math.cos(degtorad(degrees));
}

/**
 * @param {number} degrees
 */
function dtan(degrees) {
    return Math.tan(degtorad(degrees));
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function point_distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function point_direction(x1, y1, x2, y2) {
    return radtodeg(Math.atan2(y1 - y2, x2 - x1));
}

/**
 * @param {number} length
 * @param {number} direction
 */
function lengthdir_x(length, direction) {
    return Math.cos(degtorad(direction)) * length;
}

/**
 * @param {number} length
 * @param {number} direction
 */
function lengthdir_y(length, direction) {
    return -Math.sin(degtorad(direction)) * length;
}

/**
 * @param {number} px
 * @param {number} py
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function point_in_rectangle(px, py, x1, y1, x2, y2) {
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    return px >= left && px <= right && py >= top && py <= bottom;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function numberOr(value, fallback) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
}

// @ts-check
function createMathApi() {
    return {
        clamp,
        lerp,
        choose,
        random,
        random_range,
        irandom,
        irandom_range,
        degtorad,
        radtodeg,
        dsin,
        dcos,
        dtan,
        point_distance,
        point_direction,
        lengthdir_x,
        lengthdir_y,
        point_in_rectangle
    };
}

// @ts-check

/**
 * @param {unknown} input
 * @returns {string}
 */
function normalizeKey(input) {
    if (input && typeof input === "object") {
        /** @type {{ key?: unknown, code?: unknown }} */
        const eventLike = input;
        input = eventLike.key || eventLike.code || "";
    }

    if (typeof input === "number") {
        input = String.fromCharCode(input);
    }

    const key = String(input || "").toUpperCase();

    if (key === "ARROWLEFT") return "LEFT";
    if (key === "ARROWRIGHT") return "RIGHT";
    if (key === "ARROWUP") return "UP";
    if (key === "ARROWDOWN") return "DOWN";
    if (key === " ") return "SPACE";
    if (key === "ESC") return "ESCAPE";
    if (key === "CONTROL") return "CTRL";

    return key;
}

/**
 * @param {unknown} pointer
 * @returns {string}
 */
function buttonFromPointer(pointer) {
    if (!pointer || typeof pointer !== "object") return INPUT.mb_left;

    /** @type {{ button?: number }} */
    const pointerLike = pointer;
    if (pointerLike.button === undefined) return INPUT.mb_left;

    if (pointerLike.button === 2) return INPUT.mb_right;
    if (pointerLike.button === 1) return INPUT.mb_middle;
    return INPUT.mb_left;
}

/**
 * @param {unknown} event
 */
function stopInputEvent(event) {
    if (!event || typeof event !== "object") return;

    /** @type {{ stopPropagation?: () => void }} */
    const inputEvent = event;
    if (typeof inputEvent.stopPropagation === "function") inputEvent.stopPropagation();
}

/**
 * @param {unknown} pointer
 */
function preventPointerDefault(pointer) {
    if (!pointer || typeof pointer !== "object") return;

    /** @type {{ event?: { cancelable?: boolean, preventDefault?: () => void } }} */
    const pointerLike = pointer;
    const event = pointerLike.event;
    if (event && event.cancelable && typeof event.preventDefault === "function") event.preventDefault();
}

/**
 * @param {unknown} pointer
 * @param {unknown} event
 */
function consumeInputEvent(pointer, event) {
    stopInputEvent(event);
    preventPointerDefault(pointer);
}

/**
 * @param {unknown} options
 * @param {number} defaultInputBlockMs
 * @returns {number}
 */
function modalInputBlockMs(options, defaultInputBlockMs) {
    /** @type {{ inputBlockMs?: unknown } | null } */
    const optionsLike = (options && typeof options === "object") ? options : null;
    const value = optionsLike && optionsLike.inputBlockMs !== undefined ? optionsLike.inputBlockMs : defaultInputBlockMs;
    return normalizeDelayMs(value, defaultInputBlockMs, 0);
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} [minimum]
 * @returns {number}
 */
function normalizeDelayMs(value, fallback, minimum) {
    const min = minimum === undefined ? 0 : minimum;
    const next = value === undefined || value === null || value === "" ? fallback : Number(value);
    if (!Number.isFinite(next)) return Math.max(min, fallback || 0);
    return Math.max(min, next);
}

/**
 * @param {unknown} pointer
 * @returns {string}
 */
function pointerGateKey(pointer) {
    if (!pointer || typeof pointer !== "object") return "default";

    /** @type {{ id?: unknown, pointerId?: unknown }} */
    const pointerLike = pointer;
    if (pointerLike.id !== undefined) return String(pointerLike.id);
    if (pointerLike.pointerId !== undefined) return String(pointerLike.pointerId);
    return "default";
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function hasObjectKeys(value) {
    if (!value || typeof value !== "object") return false;
    for (const key in value) return true;
    return false;
}

// @ts-check

/**
 * @typedef {{
 *   drawText: number,
 *   fittedText: number,
 *   buttons: number,
 *   panels: number,
 *   sprites: number,
 *   nineSlices: number,
 *   declarativeNodes: number,
 *   layoutReads: number,
 *   textSetCalls: number,
 *   textStyleSetCalls: number,
 *   textObjectsAllocated: number,
 *   textObjectsReused: number
 * }} RuntimePerfCounts
 *
 * @typedef {{
 *   enabled: boolean,
 *   frame: { stepMs: number, drawMs: number, uiMs: number, totalMs: number, fpsEstimate: number },
 *   counts: RuntimePerfCounts,
 *   topLabels: { text: string, count: number }[],
 *   _frameStartedAt: number,
 *   _stepStartedAt: number,
 *   _drawStartedAt: number,
 *   _uiStartedAt: number,
 *   _labels: Map<string, number>
 * }} RuntimePerfState
 */

function nowMs() {
    const perf = typeof performance !== "undefined" ? performance : null;
    return perf && typeof perf.now === "function" ? perf.now() : Date.now();
}

/**
 * @param {Record<string, any>} cfg
 */
function shouldEnableRuntimePerfProbe(cfg) {
    if (cfg && cfg.perfProbe === true) return true;
    try {
        return typeof globalThis.location?.search === "string" &&
            new URLSearchParams(globalThis.location.search).has("perfProbe");
    } catch {
        return false;
    }
}

/**
 * @returns {RuntimePerfCounts}
 */
function createCounts() {
    return {
        drawText: 0,
        fittedText: 0,
        buttons: 0,
        panels: 0,
        sprites: 0,
        nineSlices: 0,
        declarativeNodes: 0,
        layoutReads: 0,
        textSetCalls: 0,
        textStyleSetCalls: 0,
        textObjectsAllocated: 0,
        textObjectsReused: 0
    };
}

/**
 * @returns {RuntimePerfState}
 */
function createRuntimePerfState() {
    return {
        enabled: true,
        frame: {
            stepMs: 0,
            drawMs: 0,
            uiMs: 0,
            totalMs: 0,
            fpsEstimate: 0
        },
        counts: createCounts(),
        topLabels: [],
        _frameStartedAt: 0,
        _stepStartedAt: 0,
        _drawStartedAt: 0,
        _uiStartedAt: 0,
        _labels: new Map()
    };
}

/**
 * @param {any} state
 */
function beginRuntimePerfFrame(state) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled) return;
    perf.counts = createCounts();
    perf.topLabels = [];
    perf._labels.clear();
    perf._frameStartedAt = nowMs();
    perf.frame.stepMs = 0;
    perf.frame.drawMs = 0;
    perf.frame.uiMs = 0;
    perf.frame.totalMs = 0;
}

/**
 * @param {any} state
 * @param {"step" | "draw" | "ui"} section
 */
function beginRuntimePerfSection(state, section) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled) return;
    const current = nowMs();
    if (section === "step") perf._stepStartedAt = current;
    else if (section === "draw") perf._drawStartedAt = current;
    else perf._uiStartedAt = current;
}

/**
 * @param {any} state
 * @param {"step" | "draw" | "ui"} section
 */
function endRuntimePerfSection(state, section) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled) return;
    const current = nowMs();
    if (section === "step" && perf._stepStartedAt > 0) perf.frame.stepMs += current - perf._stepStartedAt;
    else if (section === "draw" && perf._drawStartedAt > 0) perf.frame.drawMs += current - perf._drawStartedAt;
    else if (section === "ui" && perf._uiStartedAt > 0) perf.frame.uiMs += current - perf._uiStartedAt;
}

/**
 * @param {any} state
 * @param {keyof RuntimePerfCounts} key
 * @param {number} [amount]
 */
function countRuntimePerf(state, key, amount = 1) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled || !(key in perf.counts)) return;
    perf.counts[key] += amount;
}

/**
 * @param {any} state
 * @param {unknown} text
 */
function countRuntimeTextLabel(state, text) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled) return;
    const label = String(text ?? "").replace(/\s+/g, " ").trim();
    if (!label) return;
    const key = label.length > 48 ? `${label.slice(0, 45)}...` : label;
    perf._labels.set(key, (perf._labels.get(key) || 0) + 1);
}

/**
 * @param {any} state
 */
function finalizeRuntimePerfFrame(state) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled) return;
    const elapsed = Math.max(0, nowMs() - perf._frameStartedAt);
    perf.frame.totalMs = elapsed;
    perf.frame.fpsEstimate = elapsed > 0 ? 1000 / elapsed : 0;
    perf.topLabels = Array.from(perf._labels.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([text, count]) => ({ text, count }));
}

// @ts-check



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
function createRuntimeButtonClass(Phaser) {
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
            });
            this.hitZone.on("pointerdown", (
                /** @type {unknown} */ pointer,
                /** @type {unknown} */ localX,
                /** @type {unknown} */ localY,
                /** @type {unknown} */ event
            ) => {
                consumeInputEvent(pointer, event);
                if (this.api.input_blocked() || this.api.curtain_active()) return;
                this.hovered = true;
                this.down = true;
            });
            this.hitZone.on("pointerup", (
                /** @type {unknown} */ pointer,
                /** @type {unknown} */ localX,
                /** @type {unknown} */ localY,
                /** @type {unknown} */ event
            ) => {
                consumeInputEvent(pointer, event);
                const canPress = this.down && !this.api.input_blocked() && !this.api.curtain_active();
                this.down = false;
                if (!canPress) return;
                this.pendingPress = true;
                const flashMs = Number(this.options.flashMs);
                const flashDuration = Number.isFinite(flashMs) ? Math.max(0, flashMs) : 100;
                this.activeUntil = this.state.currentTime + flashDuration;
            });
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

// @ts-check



/**
 * @param {unknown} value
 * @param {number} fallback
 */
function clampDrawAlpha(value, fallback = 1) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? clamp(numeric, 0, 1) : fallback;
}

/**
 * @param {any} state
 */
function resetRuntimeDrawState(state) {
    state.draw.color = 0xffffff;
    state.draw.alpha = 1;
    state.draw.lineWidth = 1;
    state.draw.font = "sans-serif";
    state.draw.size = 24;
    state.draw.bold = false;
    state.draw.halign = "left";
    state.draw.valign = "top";
}

/**
 * @param {any} state
 * @param {any} gfx
 */
function applyRuntimeFill(state, gfx) {
    gfx.fillStyle(toColor(state.draw.color), state.draw.alpha);
}

/**
 * @param {any} state
 * @param {any} gfx
 */
function applyRuntimeStroke(state, gfx) {
    gfx.lineStyle(state.draw.lineWidth, toColor(state.draw.color), state.draw.alpha);
}

/**
 * @param {any} state
 * @param {any} cfg
 * @param {any} gfx
 * @param {number} roomWidth
 * @param {number} roomHeight
 */
function drawRuntimeStage(state, cfg, gfx, roomWidth, roomHeight) {
    gfx.fillStyle(toColor(cfg.bleedColor), 1);
    gfx.fillRect(-cfg.bleed, -cfg.bleed, roomWidth + cfg.bleed * 2, roomHeight + cfg.bleed * 2);
    gfx.fillStyle(toColor(cfg.safeColor), 1);
    gfx.fillRect(0, 0, roomWidth, roomHeight);
}

/**
 * @param {any} state
 * @param {any} value
 */
function setRuntimeDrawColor(state, value) {
    state.draw.color = toColor(value);
}

/**
 * @param {any} state
 * @param {any} value
 */
function setRuntimeDrawAlpha(state, value) {
    state.draw.alpha = clampDrawAlpha(value, state.draw.alpha);
}

/**
 * @param {any} state
 * @param {any} value
 */
function setRuntimeDrawLineWidth(state, value) {
    const numeric = Number(value);
    const fallback = Number.isFinite(Number(state.draw.lineWidth)) ? Number(state.draw.lineWidth) : 1;
    state.draw.lineWidth = Number.isFinite(numeric) ? Math.max(1, numeric) : fallback;
}

/**
 * @param {any} state
 * @param {string=} font
 * @param {number=} size
 * @param {boolean=} bold
 */
function setRuntimeDrawFont(state, font, size, bold) {
    if (font !== undefined) state.draw.font = font;
    if (size !== undefined) state.draw.size = size;
    if (bold !== undefined) state.draw.bold = !!bold;
}

/**
 * @param {any} state
 * @param {string} value
 */
function setRuntimeDrawHAlign(state, value) {
    state.draw.halign = value;
}

/**
 * @param {any} state
 * @param {string} value
 */
function setRuntimeDrawVAlign(state, value) {
    state.draw.valign = value;
}

/**
 * @param {any} state
 * @param {any} gfx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {boolean=} outline
 */
function drawRuntimeRectangle(state, gfx, x1, y1, x2, y2, outline) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    if (outline) {
        applyRuntimeStroke(state, gfx);
        gfx.strokeRect(x, y, w, h);
    } else {
        applyRuntimeFill(state, gfx);
        gfx.fillRect(x, y, w, h);
    }
}

/**
 * @param {any} state
 * @param {any} gfx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number=} radius
 * @param {boolean=} outline
 */
function drawRuntimeRoundRect(state, gfx, x1, y1, x2, y2, radius, outline) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    const r = Math.max(0, radius || 0);

    if (outline) {
        applyRuntimeStroke(state, gfx);
        if (gfx.strokeRoundedRect) gfx.strokeRoundedRect(x, y, w, h, r);
        else gfx.strokeRect(x, y, w, h);
    } else {
        applyRuntimeFill(state, gfx);
        if (gfx.fillRoundedRect) gfx.fillRoundedRect(x, y, w, h, r);
        else gfx.fillRect(x, y, w, h);
    }
}

/**
 * @param {any} state
 * @param {any} gfx
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {boolean=} outline
 */
function drawRuntimeCircle(state, gfx, x, y, radius, outline) {
    if (outline) {
        applyRuntimeStroke(state, gfx);
        gfx.strokeCircle(x, y, radius);
    } else {
        applyRuntimeFill(state, gfx);
        gfx.fillCircle(x, y, radius);
    }
}

/**
 * @param {any} state
 * @param {any} gfx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function drawRuntimeLine(state, gfx, x1, y1, x2, y2) {
    applyRuntimeStroke(state, gfx);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    gfx.lineTo(x2, y2);
    gfx.strokePath();
}

/**
 * @param {any} state
 * @param {any} pool
 * @param {any} parent
 * @param {number} x
 * @param {number} y
 * @param {any} text
 */
function drawRuntimeText(state, pool, parent, x, y, text) {
    const item = pool.take();
    const originX = state.draw.halign === "center" ? 0.5 : state.draw.halign === "right" ? 1 : 0;
    const originY = state.draw.valign === "middle" ? 0.5 : state.draw.valign === "bottom" ? 1 : 0;
    const label = String(text);
    const style = {
        fontFamily: state.draw.font,
        fontSize: state.draw.size + "px",
        fontStyle: state.draw.bold ? "bold" : "",
        color: toCssColor(state.draw.color),
        resolution: state.render?.resolution || 1
    };

    countRuntimePerf(state, "drawText");
    countRuntimeTextLabel(state, label);
    if (item.text !== label) {
        item.setText(label);
        countRuntimePerf(state, "textSetCalls");
    }
    item.setPosition(x, y);
    item.setOrigin(originX, originY);
    item.setAlpha(state.draw.alpha);
    if (item.__gmRuntimeStyleSignature !== JSON.stringify(style)) {
        item.setStyle(style);
        item.__gmRuntimeStyleSignature = JSON.stringify(style);
        countRuntimePerf(state, "textStyleSetCalls");
    }
    if (parent && typeof parent.bringToTop === "function") parent.bringToTop(item);

    return item;
}

/**
 * @param {any} state
 * @param {any} pool
 * @param {string} key
 * @param {any} frame
 * @param {number} x
 * @param {number} y
 * @param {number=} xscale
 * @param {number=} yscale
 * @param {number=} rotation
 * @param {any=} color
 * @param {number=} alpha
 */
function drawRuntimeSpriteExt(state, pool, key, frame, x, y, xscale, yscale, rotation, color, alpha) {
    const item = pool.take(key, frame);
    item.setPosition(x, y);
    item.setScale(xscale === undefined ? 1 : xscale, yscale === undefined ? 1 : yscale);
    item.setRotation(rotation || 0);
    item.setAlpha(clampDrawAlpha(alpha === undefined ? state.draw.alpha : alpha, state.draw.alpha));
    item.setTint(toColor(color === undefined ? COLORS.c_white : color));
    return item;
}

// @ts-check

/**
 * @param {any} state
 * @param {any} api
 * @param {any} inst
 */
function stepRuntimeAlarms(state, api, inst) {
    if (!inst.alarm) return;
    for (let i = 0; i < inst.alarm.length; i += 1) {
        if (inst.alarm[i] === undefined || inst.alarm[i] < 0) continue;
        const setFrame = inst.__alarmSetFrame && inst.__alarmSetFrame[i] !== undefined ? inst.__alarmSetFrame[i] : -1;
        if (setFrame === state.stepFrame) continue;
        if (inst.alarm[i] > 0) inst.alarm[i] -= 1;
        if (inst.alarm[i] === 0) {
            const fn = inst["alarm" + i];
            inst.alarm[i] = -1;
            if (typeof fn === "function") fn.call(inst, api);
        }
        if (!inst.__active) return;
    }
}

/**
 * @param {any} state
 * @param {any} api
 */
function stepRuntimeInstances(state, api) {
    state.stepFrame = (state.stepFrame || 0) + 1;
    const snapshot = state.instances.slice();
    for (const inst of snapshot) {
        if (!inst.__active) continue;
        state.currentInstance = inst;
        if (typeof inst.step === "function") inst.step.call(inst, api);
        if (!inst.__active) continue;
        stepRuntimeAlarms(state, api, inst);
    }
    state.currentInstance = null;
    state.instances = state.instances.filter((/** @type {any} */ inst) => inst.__active);
}

/**
 * @param {any} state
 * @param {any} api
 */
function drawRuntimeInstances(state, api) {
    const snapshot = state.instances.slice();
    for (const inst of snapshot) {
        if (!inst.__active || inst.visible === false) continue;
        state.currentInstance = inst;
        if (typeof inst.draw === "function") inst.draw.call(inst, api);
    }
    state.currentInstance = null;
}

/**
 * @param {any} state
 * @param {any} api
 * @param {number} x
 * @param {number} y
 * @param {string} layer
 * @param {any} objectDef
 */
function createRuntimeInstance(state, api, x, y, layer, objectDef) {
    const source = objectDef || {};
    const inst = Object.assign({}, source);
    inst.id = state.nextInstanceId++;
    inst.object_index = objectDef;
    inst.x = x;
    inst.y = y;
    inst.layer = layer || "Instances";
    inst.visible = inst.visible !== false;
    inst.__active = true;
    inst.__alarmSetFrame = [];
    inst.alarm = Array.isArray(inst.alarm) ? inst.alarm.slice() : [];

    state.instances.push(inst);

    state.currentInstance = inst;
    if (typeof inst.create === "function") inst.create.call(inst, api);
    state.currentInstance = null;

    return inst;
}

/**
 * @param {any} state
 * @param {any} api
 * @param {any} inst
 */
function destroyRuntimeInstance(state, api, inst) {
    const target = inst || state.currentInstance;
    if (!target) return;
    if (target.__active === false) return;
    target.__active = false;
    if (typeof target.destroy === "function") target.destroy.call(target, api);
}

/**
 * @param {any} state
 * @param {any} target
 */
function runtimeInstanceExists(state, target) {
    if (!target) return false;
    if (target.__active !== undefined) return !!target.__active;
    return state.instances.some((/** @type {any} */ inst) => inst.__active && inst.object_index === target);
}

/**
 * @param {any} state
 * @param {any} objectDef
 */
function countRuntimeInstances(state, objectDef) {
    return state.instances.filter((/** @type {any} */ inst) => inst.__active && inst.object_index === objectDef).length;
}

/**
 * @param {any} state
 * @param {any} objectDef
 * @param {number} index
 */
function findRuntimeInstance(state, objectDef, index) {
    const found = state.instances.filter((/** @type {any} */ inst) => inst.__active && inst.object_index === objectDef);
    return found[index] || null;
}

/**
 * @param {any} state
 * @param {number} index
 * @param {number} frames
 * @param {any} inst
 */
function setRuntimeAlarm(state, index, frames, inst) {
    const target = inst || state.currentInstance;
    if (!target) return;
    const numericFrames = Number(frames);
    const nextFrames = Number.isFinite(numericFrames) ? Math.floor(numericFrames) : -1;
    target.alarm[index] = nextFrames < 0 ? -1 : nextFrames;
    target.__alarmSetFrame = Array.isArray(target.__alarmSetFrame) ? target.__alarmSetFrame : [];
    target.__alarmSetFrame[index] = state.stepFrame || 0;
}

// @ts-check

/**
 * @param {number} w
 * @param {number} h
 * @param {Record<string, unknown>} cfg
 */
function resolveRoomLayout(w, h, cfg) {
    const baseWidth = Math.max(1, numberOr(cfg.width, 720));
    const baseHeight = Math.max(1, numberOr(cfg.height, 1280));
    const orientation = w >= h ? "landscape" : "portrait";

    if (!cfg.responsive) {
        const scale = Math.min(w / baseWidth, h / baseHeight);

        return {
            roomWidth: baseWidth,
            roomHeight: baseHeight,
            scale,
            x: (w - baseWidth * scale) / 2,
            y: (h - baseHeight * scale) / 2,
            profile: "fixed",
            orientation
        };
    }

    const landscape = w >= h;
    const desktopBreakpoint = numberOr(cfg.desktopBreakpoint, 1000);
    const isDesktop = landscape || w >= desktopBreakpoint;

    if (!isDesktop) {
        const minHeight = Math.max(baseHeight, numberOr(cfg.minHeight, baseHeight));
        const maxHeight = Math.max(minHeight, numberOr(cfg.maxHeight, minHeight));
        const targetHeight = clamp(numberOr(cfg.targetHeight, 1560), minHeight, maxHeight);

        let scale = w / baseWidth;
        let roomHeight = h / scale;

        roomHeight = clamp(roomHeight, minHeight, maxHeight);
        scale = Math.min(w / baseWidth, h / roomHeight);

        const profile = roomHeight < targetHeight - 120
            ? "portrait-compact"
            : roomHeight > targetHeight + 120
                ? "portrait-tall"
                : "portrait-standard";

        return {
            roomWidth: baseWidth,
            roomHeight,
            scale,
            x: (w - baseWidth * scale) / 2,
            y: (h - roomHeight * scale) / 2,
            profile,
            orientation: "portrait"
        };
    }

    const desktopHeight = Math.max(1, numberOr(cfg.desktopHeight, 720));
    const desktopMinWidth = Math.max(1, numberOr(cfg.desktopMinWidth, 1280));
    const desktopMaxWidth = Math.max(desktopMinWidth, numberOr(cfg.desktopMaxWidth, 1920));

    let scale = h / desktopHeight;
    let roomWidth = clamp(w / scale, desktopMinWidth, desktopMaxWidth);

    scale = Math.min(w / roomWidth, h / desktopHeight);

    return {
        roomWidth,
        roomHeight: desktopHeight,
        scale,
        x: (w - roomWidth * scale) / 2,
        y: (h - desktopHeight * scale) / 2,
        profile: "desktop",
        orientation: landscape ? "landscape" : "portrait-wide"
    };
}

// @ts-check



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
function createModal(api, state, options, uiToolkit) {
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

// @ts-check

/**
 * @typedef {{
 *   items: any[],
 *   cursor: number,
 *   begin(): void,
 *   take(...args: any[]): any
 * }} RuntimeDrawPool
 */

/**
 * @param {any} scene
 * @param {any} parent
 * @param {any} [state]
 * @returns {RuntimeDrawPool}
 */
function makeTextPool(scene, parent, state = null) {
    return {
        /** @type {any[]} */
        items: [],
        cursor: 0,

        begin() {
            this.cursor = 0;
            for (const item of this.items) item.setVisible(false);
        },

        take() {
            let item = this.items[this.cursor];
            if (!item) {
                item = scene.add.text(0, 0, "", {
                    fontFamily: "sans-serif",
                    fontSize: "24px",
                    color: "#ffffff"
                });
                parent.add(item);
                this.items.push(item);
                countRuntimePerf(state, "textObjectsAllocated");
            } else {
                countRuntimePerf(state, "textObjectsReused");
            }
            this.cursor += 1;
            item.setVisible(true);
            return item;
        }
    };
}

/**
 * @param {any} scene
 * @param {any} parent
 * @param {any} [state]
 * @returns {RuntimeDrawPool}
 */
function makeSpritePool(scene, parent, state = null) {
    return {
        /** @type {any[]} */
        items: [],
        cursor: 0,

        begin() {
            this.cursor = 0;
            for (const item of this.items) item.setVisible(false);
        },

        /**
         * @param {string} key
         * @param {string | number | undefined | null} frame
         */
        take(key, frame) {
            const normalizedFrame = frame === undefined ? null : frame;
            let item = this.items[this.cursor];
            if (!item) {
                item = scene.add.sprite(0, 0, key, normalizedFrame);
                parent.add(item);
                this.items.push(item);
                item.__gmRuntimeTextureKey = key;
                item.__gmRuntimeFrame = normalizedFrame;
            } else if (item.__gmRuntimeTextureKey !== key || item.__gmRuntimeFrame !== normalizedFrame) {
                item.setTexture(key, normalizedFrame);
                item.__gmRuntimeTextureKey = key;
                item.__gmRuntimeFrame = normalizedFrame;
            }
            this.cursor += 1;
            item.setVisible(true);
            countRuntimePerf(state, "sprites");
            return item;
        }
    };
}

// @ts-check

/**
 * @param {Record<string, unknown>} cfg
 * @param {Window & typeof globalThis} root
 */
function resolveRenderResolution(cfg, root) {
    const max = Math.max(1, numberOr(cfg.maxRenderResolution, 3));
    if (cfg.renderResolution === "auto") {
        return clamp(numberOr(root.devicePixelRatio, 1), 1, max);
    }

    return clamp(numberOr(cfg.renderResolution, 1), 1, max);
}

/**
 * @param {number} value
 */
function cssSize(value) {
    return Math.max(1, Math.round(value));
}

/**
 * @param {any} scene
 * @param {any} state
 * @param {Record<string, unknown>} cfg
 * @param {Window & typeof globalThis} root
 */
function syncRenderResolution(scene, state, cfg, root) {
    const scale = scene.scale;
    const canvas = scale?.canvas || scene.game?.canvas;
    const parentSize = scale?.parentSize || {};
    const canvasRect = canvas?.getBoundingClientRect ? canvas.getBoundingClientRect() : null;

    const cssWidth = cssSize(parentSize.width || canvasRect?.width || root.innerWidth || scale?.width || cfg.width || 1);
    const cssHeight = cssSize(parentSize.height || canvasRect?.height || root.innerHeight || scale?.height || cfg.height || 1);
    const resolution = resolveRenderResolution(cfg, root);
    const width = Math.max(1, Math.round(cssWidth * resolution));
    const height = Math.max(1, Math.round(cssHeight * resolution));

    state.render.cssWidth = cssWidth;
    state.render.cssHeight = cssHeight;
    state.render.resolution = resolution;
    state.render.width = width;
    state.render.height = height;

    if (!canvas) return state.render;

    const styleWidth = `${cssWidth}px`;
    const styleHeight = `${cssHeight}px`;
    const shouldResize = canvas.width !== width ||
        canvas.height !== height ||
        canvas.style.width !== styleWidth ||
        canvas.style.height !== styleHeight ||
        canvas.style.marginLeft !== "0px" ||
        canvas.style.marginTop !== "0px";

    canvas.style.imageRendering = cfg.renderQuality === "pixel-art" || cfg.pixelArt ? "pixelated" : "auto";
    if (!shouldResize) return state.render;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = styleWidth;
    canvas.style.height = styleHeight;
    canvas.style.marginLeft = "0px";
    canvas.style.marginTop = "0px";

    if (scale?.gameSize?.setSize) scale.gameSize.setSize(cssWidth, cssHeight);
    if (scale?.baseSize?.setSize) scale.baseSize.setSize(width, height);
    if (scale?.displaySize?.setSize) scale.displaySize.setSize(cssWidth, cssHeight);
    if (typeof scale?.updateBounds === "function") scale.updateBounds();
    if (scale?.displayScale?.set) scale.displayScale.set(resolution, resolution);
    if (scene.renderer && typeof scene.renderer.resize === "function") scene.renderer.resize(width, height);

    return state.render;
}

// @ts-check

/**
 * Owns the runtime's named world-layer containers and their pooled draw objects.
 * @param {any} scene
 * @param {any} state
 */
function createWorldLayerManager(scene, state) {
    /** @param {string} name @param {number} depth */
    function ensure(name, depth) {
        const layerName = String(name || "world");
        let layer = state.worldLayers.get(layerName);
        if (!layer) {
            const container = scene.add.container(0, 0);
            container.setDepth(Number.isFinite(depth) ? depth : 0);
            const gfx = scene.add.graphics();
            container.add(gfx);
            layer = {
                name: layerName,
                depth: Number.isFinite(depth) ? depth : 0,
                container,
                gfx,
                text: makeTextPool(scene, container, state),
                sprites: makeSpritePool(scene, container, state)
            };
            state.world.add(container);
            state.worldLayers.set(layerName, layer);
        } else if (Number.isFinite(depth) && layer.depth !== depth) {
            layer.depth = depth;
            layer.container.setDepth(depth);
        }
        return layer;
    }

    /** @param {string} name @param {number} [depth] */
    function select(name, depth = 0) {
        const layer = ensure(name, depth);
        state.activeWorldLayer = layer.name;
        state.activeWorldContainer = layer.container;
        state.worldGfx = layer.gfx;
        state.worldText = layer.text;
        state.worldSprites = layer.sprites;
        return layer;
    }

    function beginFrame() {
        for (const layer of state.worldLayers.values()) {
            layer.gfx.clear();
            layer.text.begin();
            layer.sprites.begin();
        }
    }

    function publishTextDiagnostics() {
        state.worldText = {
            items: Array.from(state.worldLayers.values()).flatMap((layer) => layer.text.items || [])
        };
    }

    return { beginFrame, ensure, publishTextDiagnostics, select };
}

// @ts-check


/** @typedef {Record<string, any>} PlainObject */
/** @typedef {(ctx: CanvasRenderingContext2D, width: number, height: number) => void} CanvasTextureDrawer */

const DEFAULT_UI_THEME = {
    panel: {
        texture: "gm_panel_blue",
        size: 128,
        inset: 7,
        radius: 15,
        fillTop: "#305f92",
        fillBottom: "#183454",
        stroke: "#76b8f3",
        strokeWidth: 3,
        innerStroke: "rgba(255,255,255,0.55)",
        innerStrokeWidth: 1,
        shadow: "rgba(0, 0, 0, 0.45)",
        shadowBlur: 10,
        shadowOffsetY: 4,
        fallbackFill: 0x24466f,
        fallbackStroke: 0x76b8f3,
        slice: 18
    },
    button: {
        texture: "gm_button_gold",
        size: 128,
        inset: 7,
        radius: 16,
        fillTop: "#ffd56b",
        fillBottom: "#c77a22",
        stroke: "#fff2a8",
        strokeWidth: 3,
        innerStroke: "#7a3f17",
        innerStrokeWidth: 2,
        textColor: "#3a210d",
        hoverTint: 0xfff0ba,
        downTint: 0xffd071,
        slice: 18
    },
    modal: {
        titleFont: "sans-serif",
        titleSize: 34,
        titleColor: "#ffffff",
        messageFont: "sans-serif",
        messageSize: 24,
        messageColor: "#eaf5ff",
        okText: "OK",
        backdropAlpha: 0.58
    }
};

/**
 * @param {unknown} value
 * @returns {any}
 */
function clonePlain(value) {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.slice();
    /** @type {PlainObject} */
    const out = {};
    const objectValue = /** @type {PlainObject} */ (value);
    for (const key of Object.keys(objectValue)) out[key] = clonePlain(objectValue[key]);
    return out;
}

/**
 * @param {PlainObject} base
 * @param {unknown} override
 * @returns {PlainObject}
 */
function mergeTheme(base, override) {
    /** @type {PlainObject} */
    const out = clonePlain(base);
    if (!override || typeof override !== "object") return out;
    const overrideObject = /** @type {PlainObject} */ (override);
    for (const key of Object.keys(overrideObject)) {
        if (overrideObject[key] && typeof overrideObject[key] === "object" && !Array.isArray(overrideObject[key])) {
            out[key] = mergeTheme(out[key] || {}, overrideObject[key]);
        } else {
            out[key] = overrideObject[key];
        }
    }
    return out;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {PlainObject} style
 */
function drawGeneratedPanel(ctx, w, h, style) {
    const inset = style.inset === undefined ? 7 : style.inset;
    const radius = style.radius === undefined ? 15 : style.radius;
    ctx.clearRect(0, 0, w, h);
    ctx.shadowColor = style.shadow || "transparent";
    ctx.shadowBlur = style.shadowBlur || 0;
    ctx.shadowOffsetY = style.shadowOffsetY || 0;
    roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
    const fill = ctx.createLinearGradient(0, inset, 0, h - inset);
    fill.addColorStop(0, style.fillTop || "#305f92");
    fill.addColorStop(1, style.fillBottom || style.fillTop || "#183454");
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = style.strokeWidth === undefined ? 3 : style.strokeWidth;
    ctx.strokeStyle = style.stroke || "#76b8f3";
    ctx.stroke();
    if (style.innerStroke) {
        ctx.lineWidth = style.innerStrokeWidth === undefined ? 1 : style.innerStrokeWidth;
        ctx.strokeStyle = style.innerStroke;
        roundRectPath(ctx, inset + 5, inset + 5, w - (inset + 5) * 2, h - (inset + 5) * 2, Math.max(1, radius - 5));
        ctx.stroke();
    }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {PlainObject} style
 */
function drawGeneratedButton(ctx, w, h, style) {
    drawGeneratedPanel(ctx, w, h, Object.assign({
        shadow: "transparent",
        shadowBlur: 0,
        shadowOffsetY: 0,
        fillTop: "#ffd56b",
        fillBottom: "#c77a22",
        stroke: "#fff2a8",
        innerStroke: "#7a3f17",
        innerStrokeWidth: 2,
        radius: 16
    }, style || {}));
}
function createUiToolkit() {
    /** @type {Record<string, HTMLCanvasElement>} */
    const generatedUiCanvases = Object.create(null);
    /** @type {PlainObject} */
    let uiTheme = mergeTheme(DEFAULT_UI_THEME, {});

    /**
     * @param {any} scene
     * @param {string} key
     * @param {number} width
     * @param {number} height
     * @param {CanvasTextureDrawer} draw
     * @param {boolean} [force]
     */
    function addCanvasTexture(scene, key, width, height, draw, force) {
        if (scene.textures.exists(key)) {
            if (!force) return;
            if (typeof scene.textures.remove === "function") scene.textures.remove(key);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("GM UI toolkit requires a 2D canvas context.");
        draw(ctx, width, height);
        generatedUiCanvases[key] = canvas;
        scene.textures.addCanvas(key, canvas);
    }

    /**
     * @param {any} scene
     * @param {boolean} [force]
     */
    function ensureTextures(scene, force) {
        const panel = uiTheme.panel || DEFAULT_UI_THEME.panel;
        const button = uiTheme.button || DEFAULT_UI_THEME.button;
        addCanvasTexture(scene, panel.texture || "gm_panel_blue", panel.size || 128, panel.size || 128, (ctx, w, h) => {
            drawGeneratedPanel(ctx, w, h, panel);
        }, force);

        addCanvasTexture(scene, button.texture || "gm_button_gold", button.size || 128, button.size || 128, (ctx, w, h) => {
            drawGeneratedButton(ctx, w, h, button);
        }, force);
    }

    /**
     * @returns {{ key: string, width: number, height: number, mime: string, dataUrl: string }[]}
     */
    function exportTextures() {
        return Object.keys(generatedUiCanvases).map((key) => {
            const canvas = generatedUiCanvases[key];
            return {
                key,
                width: canvas.width,
                height: canvas.height,
                mime: "image/png",
                dataUrl: canvas.toDataURL("image/png")
            };
        });
    }

    /**
     * @param {string} [prefix]
     * @returns {{ key: string, width: number, height: number, mime: string, dataUrl: string }[]}
     */
    function downloadTextures(prefix) {
        const files = exportTextures();
        const namePrefix = prefix || "gm-ui";
        for (const file of files) {
            const link = document.createElement("a");
            link.href = file.dataUrl;
            link.download = `${namePrefix}-${file.key}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
        return files;
    }

    /**
     * @param {any} scene
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {PlainObject} [options]
     * @returns {any}
     */
    function createNineSliceObject(scene, x, y, w, h, options) {
        options = options || {};
        ensureTextures(scene);
        const panel = uiTheme.panel || DEFAULT_UI_THEME.panel;
        const texture = options.texture || panel.texture || "gm_panel_blue";
        const frame = options.frame === undefined ? null : options.frame;
        const left = options.left === undefined ? (panel.slice || 18) : options.left;
        const right = options.right === undefined ? left : options.right;
        const top = options.top === undefined ? (panel.slice || 18) : options.top;
        const bottom = options.bottom === undefined ? top : options.bottom;
        const tileX = !!options.tileX;
        const tileY = !!options.tileY;

        if (scene.add.nineslice) {
            return scene.add.nineslice(x, y, texture, frame, w, h, left, right, top, bottom, tileX, tileY);
        }

        const fallback = scene.add.rectangle(x, y, w, h, toColor(options.fill, panel.fallbackFill), 1);
        fallback.setStrokeStyle(3, toColor(options.stroke, panel.fallbackStroke), 1);
        return fallback;
    }

    /**
     * @param {any} scene
     * @param {string} label
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {((pointer: unknown) => void) | null | undefined} onPress
     * @param {PlainObject} [options]
     * @returns {any}
     */
    function createButton(scene, label, x, y, w, h, onPress, options) {
        options = options || {};
        const container = scene.add.container(x, y);
        const hoverScale = options.hoverScale === undefined ? 1.035 : options.hoverScale;
        const downScale = options.downScale === undefined ? 0.965 : options.downScale;
        const normalTint = options.tint === undefined ? null : toColor(options.tint);
        const buttonTheme = uiTheme.button || DEFAULT_UI_THEME.button;
        const hoverTint = options.hoverTint === undefined ? toColor(buttonTheme.hoverTint, 0xfff0ba) : toColor(options.hoverTint);
        const downTint = options.downTint === undefined ? toColor(buttonTheme.downTint, 0xffd071) : toColor(options.downTint);
        const back = createNineSliceObject(scene, 0, 0, w, h, {
            texture: options.texture || buttonTheme.texture || "gm_button_gold",
            left: options.left === undefined ? (buttonTheme.slice || 18) : options.left,
            right: options.right === undefined ? (buttonTheme.slice || 18) : options.right,
            top: options.top === undefined ? (buttonTheme.slice || 18) : options.top,
            bottom: options.bottom === undefined ? (buttonTheme.slice || 18) : options.bottom
        });
        const text = scene.add.text(0, 0, label, {
            fontFamily: options.font || "sans-serif",
            fontSize: (options.size || 28) + "px",
            fontStyle: "bold",
            color: options.color || buttonTheme.textColor || "#3a210d",
            align: "center",
            resolution: options.resolution || 1
        }).setOrigin(0.5);
        const hitZone = scene.add.zone(0, 0, w, h).setOrigin(0.5);

        container.add([back, text, hitZone]);
        container.setSize(w, h);
        hitZone.setInteractive();
        hitZone.input.cursor = "pointer";

        /** @param {unknown} value */
        const setButtonTint = (value) => {
            if (!back || typeof back.setTint !== "function") return;
            if (value === null && typeof back.clearTint === "function") {
                back.clearTint();
            } else if (value !== null) {
                back.setTint(value);
            }
        };
        /**
         * @param {number} scale
         * @param {unknown} tint
         * @param {number} duration
         * @param {string} ease
         */
        const tweenButton = (scale, tint, duration, ease) => {
            setButtonTint(tint);
            scene.tweens.killTweensOf(container);
            scene.tweens.add({ targets: container, scaleX: scale, scaleY: scale, duration, ease });
        };

        setButtonTint(normalTint);

        /**
         * @param {unknown} pointer
         * @param {unknown} localX
         * @param {unknown} localY
         * @param {unknown} event
         */
        const onPointerOver = (pointer, localX, localY, event) => {
            consumeInputEvent(pointer, event);
            tweenButton(hoverScale, hoverTint, 85, "Quad.Out");
        };
        /**
         * @param {unknown} pointer
         * @param {unknown} localX
         * @param {unknown} localY
         * @param {unknown} event
         */
        const onPointerDown = (pointer, localX, localY, event) => {
            consumeInputEvent(pointer, event);
            if (typeof options.onPointerDown === "function") options.onPointerDown(pointer);
            tweenButton(downScale, downTint, 70, "Quad.Out");
        };
        /**
         * @param {unknown} pointer
         * @param {unknown} localX
         * @param {unknown} localY
         * @param {unknown} event
         */
        const onPointerUp = (pointer, localX, localY, event) => {
            consumeInputEvent(pointer, event);
            if (typeof options.onPointerUp === "function") options.onPointerUp(pointer);
            tweenButton(hoverScale, hoverTint, 90, "Back.Out");
            if (typeof onPress === "function") onPress(pointer);
        };
        /**
         * @param {unknown} pointer
         * @param {unknown} localX
         * @param {unknown} localY
         * @param {unknown} event
         */
        const onPointerOut = (pointer, localX, localY, event) => {
            consumeInputEvent(pointer, event);
            if (typeof options.onPointerCancel === "function") options.onPointerCancel(pointer);
            tweenButton(1, normalTint, 90, "Back.Out");
        };

        hitZone.on("pointerover", onPointerOver);
        hitZone.on("pointerdown", onPointerDown);
        hitZone.on("pointerup", onPointerUp);
        hitZone.on("pointerout", onPointerOut);
        return container;
    }

    return {
        createButton,
        createNineSliceObject,
        downloadTextures,
        ensureTextures,
        exportTextures,
        getModalTheme() {
            return uiTheme.modal || DEFAULT_UI_THEME.modal;
        },
        getTheme() {
            return clonePlain(uiTheme);
        },
        /** @param {unknown} theme */
        setTheme(theme) {
            uiTheme = mergeTheme(uiTheme, theme || {});
            return uiTheme;
        }
    };
}

// @ts-check

/**
 * @typedef {{
 *   GM: Record<string, any> & {
 *     _active?: any,
 *     _game?: any,
 *     start?: (...args: any[]) => unknown
 *   },
 *   root: { Phaser?: unknown },
 *   COLORS: Record<string, unknown>,
 *   INPUT: Record<string, unknown>,
 *   math: Record<string, unknown>,
 *   uiToolkit: {
 *     setTheme: (theme: unknown) => unknown,
 *     getTheme: () => unknown,
 *     ensureTextures: (scene: unknown, refresh?: boolean) => unknown,
 *     exportTextures: () => unknown,
 *     downloadTextures: (prefix?: unknown) => unknown
 *   },
 *   installGlobals: (...args: any[]) => unknown,
 *   active: () => any,
 *   activeOrNull: () => any,
 *   callActive: (methodName: string, args: IArguments) => unknown,
 *   defineReadonly: (target: object, propertyName: string, getter: () => unknown) => void
 * }} FacadeNamespaceDeps
 */

/**
 * @param {FacadeNamespaceDeps} deps
 */
function installFacadeNamespaces(deps) {
    const {
        GM,
        root,
        COLORS,
        INPUT,
        math,
        uiToolkit,
        installGlobals,
        active,
        activeOrNull,
        callActive,
        defineReadonly
    } = deps;

    const color = {
        BLACK: COLORS.c_black,
        WHITE: COLORS.c_white,
        GRAY: COLORS.c_gray,
        GREY: COLORS.c_grey,
        DKGRAY: COLORS.c_dkgray,
        DKGREY: COLORS.c_dkgrey,
        LTGRAY: COLORS.c_ltgray,
        LTGREY: COLORS.c_ltgrey,
        RED: COLORS.c_red,
        GREEN: COLORS.c_green,
        LIME: COLORS.c_lime,
        BLUE: COLORS.c_blue,
        YELLOW: COLORS.c_yellow,
        ORANGE: COLORS.c_orange,
        PURPLE: COLORS.c_purple,
        AQUA: COLORS.c_aqua,
        FUCHSIA: COLORS.c_fuchsia
    };

    const key = {
        LEFT: INPUT.vk_left,
        RIGHT: INPUT.vk_right,
        UP: INPUT.vk_up,
        DOWN: INPUT.vk_down,
        SPACE: INPUT.vk_space,
        ENTER: INPUT.vk_enter,
        ESCAPE: INPUT.vk_escape,
        SHIFT: INPUT.vk_shift,
        CONTROL: INPUT.vk_control,
        ALT: INPUT.vk_alt
    };

    const pointer = {
        LEFT: INPUT.mb_left,
        RIGHT: INPUT.mb_right,
        MIDDLE: INPUT.mb_middle
    };

    const runtime = {
        get active() { return activeOrNull(); },
        get scene() { return activeOrNull() ? GM._active.scene : null; },
        get state() { return activeOrNull() ? GM._active.state : null; }
    };
    defineReadonly(runtime, "roomWidth", () => activeOrNull() ? GM._active.room_width : 0);
    defineReadonly(runtime, "roomHeight", () => activeOrNull() ? GM._active.room_height : 0);
    defineReadonly(runtime, "displayWidth", () => activeOrNull() ? GM._active.display_width : 0);
    defineReadonly(runtime, "displayHeight", () => activeOrNull() ? GM._active.display_height : 0);
    defineReadonly(runtime, "profile", () => activeOrNull() ? GM._active.layout_profile : "fixed");
    defineReadonly(runtime, "orientation", () => activeOrNull() ? GM._active.orientation : "portrait");
    defineReadonly(runtime, "scale", () => activeOrNull() ? GM._active.layout_scale : 1);
    defineReadonly(runtime, "mouseX", () => activeOrNull() ? GM._active.mouse_x : 0);
    defineReadonly(runtime, "mouseY", () => activeOrNull() ? GM._active.mouse_y : 0);
    defineReadonly(runtime, "currentTime", () => activeOrNull() ? GM._active.current_time : 0);
    defineReadonly(runtime, "deltaMs", () => activeOrNull() ? GM._active.delta_time : 0);
    defineReadonly(runtime, "deltaSec", () => activeOrNull() ? GM._active.delta_sec : 0);
    defineReadonly(GM, "perf", () => {
        const perf = activeOrNull() ? GM._active.state.perf : null;
        if (!perf?.enabled) return null;
        return {
            frame: { ...perf.frame },
            counts: { ...perf.counts },
            topLabels: Array.isArray(perf.topLabels) ? perf.topLabels.slice() : []
        };
    });

    const draw = {
        layer: function () { return callActive("render_layer", arguments); },
        setColor: function () { return callActive("draw_set_color", arguments); },
        setAlpha: function () { return callActive("draw_set_alpha", arguments); },
        setLineWidth: function () { return callActive("draw_set_line_width", arguments); },
        setFont: function () { return callActive("draw_set_font", arguments); },
        setHAlign: function () { return callActive("draw_set_halign", arguments); },
        setVAlign: function () { return callActive("draw_set_valign", arguments); },
        rect: function () { return callActive("draw_rectangle", arguments); },
        roundRect: function () { return callActive("draw_roundrect", arguments); },
        circle: function () { return callActive("draw_circle", arguments); },
        line: function () { return callActive("draw_line", arguments); },
        text: function () { return callActive("draw_text", arguments); },
        sprite: function () { return callActive("draw_sprite", arguments); },
        spriteExt: function () { return callActive("draw_sprite_ext", arguments); }
    };

    const gui = {
        rect: function () { return callActive("draw_gui_rectangle", arguments); },
        text: function () { return callActive("draw_gui_text", arguments); }
    };

    const input = Object.assign({}, INPUT, {
        keyDown: function () { return callActive("keyboard_check", arguments); },
        keyPressed: function () { return callActive("keyboard_check_pressed", arguments); },
        keyReleased: function () { return callActive("keyboard_check_released", arguments); },
        pointerDown: function () { return callActive("mouse_check_button", arguments); },
        pointerPressed: function () { return callActive("mouse_check_button_pressed", arguments); },
        pointerReleased: function () { return callActive("mouse_check_button_released", arguments); }
    });

    const entity = {
        /**
         * @param {unknown} objectDef
         * @param {{ x?: unknown, y?: unknown, layer?: string, name?: unknown }} [options]
         */
        spawn(objectDef, options) {
            options = options || {};
            const inst = active().instance_create_layer(
                options.x === undefined ? 0 : options.x,
                options.y === undefined ? 0 : options.y,
                options.layer || "Instances",
                objectDef
            );
            if (options.name !== undefined) inst.name = options.name;
            return inst;
        },
        spawnLayer: function () { return callActive("instance_create_layer", arguments); },
        destroy: function () { return callActive("instance_destroy", arguments); },
        exists: function () { return callActive("instance_exists", arguments); },
        count: function () { return callActive("instance_number", arguments); },
        find: function () { return callActive("instance_find", arguments); }
    };

    const asset = {
        loadImage: function () { return callActive("load_sprite", arguments); },
        loadSound: function () { return callActive("load_sound", arguments); },
        loadSheet: function () { return callActive("load_spritesheet", arguments); }
    };

    const audio = {
        play: function () { return callActive("sound_play", arguments); }
    };

    const ui = {
        button: function () { return callActive("button", arguments); },
        buttonCenter: function () { return callActive("button_center", arguments); },
        nineSliceWindow: function () { return callActive("nineslice_window", arguments); },
        notice: function () { return callActive("modal_notice", arguments); },
        closeAllModals: function () { return callActive("modal_close_all", arguments); },
        /**
         * @param {unknown} theme
         */
        setTheme(theme) {
            uiToolkit.setTheme(theme);
            const activeRuntime = activeOrNull();
            if (activeRuntime) {
                uiToolkit.ensureTextures(activeRuntime.scene, true);
                return activeRuntime;
            }
            return GM;
        },
        getTheme() {
            return uiToolkit.getTheme();
        },
        exportTextures() {
            const activeRuntime = active();
            uiToolkit.ensureTextures(activeRuntime.scene);
            return uiToolkit.exportTextures();
        },
        /**
         * @param {unknown} prefix
         */
        downloadTextures(prefix) {
            const activeRuntime = active();
            uiToolkit.ensureTextures(activeRuntime.scene);
            return uiToolkit.downloadTextures(prefix);
        },
        curtain: function () { return callActive("curtain", arguments); },
        curtainActive: function () { return callActive("curtain_active", arguments); }
    };

    const time = {
        setAlarm: function () { return callActive("alarm_set", arguments); },
        wait: function () { return callActive("wait", arguments); },
        every: function () { return callActive("every", arguments); }
    };

    const debug = {
        log: function () { return callActive("show_debug_message", arguments); },
        tween: function () { return callActive("tween", arguments); }
    };

    const legacy = {
        installGlobals,
        colors: COLORS,
        input: INPUT
    };

    const phaser = {
        get scene() { return activeOrNull() ? GM._active.scene : null; },
        get game() { return activeOrNull() ? GM._active.game : GM._game || null; },
        get library() { return root.Phaser || null; }
    };

    GM.installGlobals = installGlobals;
    GM.app = { start: GM.start };
    GM.runtime = runtime;
    GM.layout = runtime;
    GM.draw = draw;
    GM.gui = gui;
    GM.input = input;
    GM.entity = entity;
    GM.asset = asset;
    GM.audio = audio;
    GM.ui = ui;
    GM.time = time;
    GM.debug = debug;
    GM.legacy = legacy;
    GM.phaser = phaser;
    GM.color = color;
    GM.key = key;
    GM.pointer = pointer;
    GM.nineslice_window = function ninesliceWindow() {
        return active().nineslice_window.apply(null, arguments);
    };
    GM.modal_notice = function modalNotice() {
        return active().modal_notice.apply(null, arguments);
    };
    GM.modal_close_all = function modalCloseAll() {
        return active().modal_close_all.apply(null, arguments);
    };
    GM.colors = COLORS;
    GM.math = math;

    return GM;
}

// @ts-check

/**
 * @param {Record<string, unknown>} cfg
 * @returns {{
 *   pixelArt: boolean,
 *   antialias: boolean,
 *   antialiasGL: boolean,
 *   roundPixels: boolean
 * }}
 */
function resolveRenderQuality(cfg) {
    const pixelArt = cfg.renderQuality === "pixel-art" || cfg.pixelArt === true;
    const antialias = cfg.antialias === undefined ? !pixelArt : !!cfg.antialias;
    const roundPixels = cfg.roundPixels === undefined ? pixelArt : !!cfg.roundPixels;

    return {
        pixelArt,
        antialias,
        antialiasGL: antialias,
        roundPixels
    };
}

// @ts-check



/**
 * @param {Record<string, any> | undefined} config
 */
function mergeConfig(config) {
    return Object.assign({}, DEFAULTS, config || {});
}

/**
 * @param {{ root: any, Phaser: any, makeScene: (config: any) => any, installGlobals: () => void }} deps
 */
function createGameStarter({ root, Phaser, makeScene, installGlobals }) {
    /**
     * @param {Record<string, any>} [config]
     */
    return function start(config) {
        if (!root.Phaser) {
            throw new Error("Phaser must be loaded before gm-phaser4.js starts a game.");
        }

        const cfg = mergeConfig(config);
        if (cfg.globals) installGlobals();
        const renderQuality = resolveRenderQuality(cfg);

        return new Phaser.Game({
            type: Phaser.AUTO,
            parent: cfg.parent,
            width: root.innerWidth,
            height: root.innerHeight,
            backgroundColor: toColor(cfg.background),
            pixelArt: renderQuality.pixelArt,
            antialias: renderQuality.antialias,
            antialiasGL: renderQuality.antialiasGL,
            roundPixels: renderQuality.roundPixels,
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            scene: makeScene(cfg)
        });
    };
}

// @ts-check

const ACCESSOR_NAMES = [
    "room_width", "room_height", "display_width", "display_height",
    "mouse_x", "mouse_y", "current_time", "delta_time", "delta_sec"
];

/**
 * @param {Record<string, unknown>} target
 * @param {{ _active?: Record<string, unknown> | null }} GM
 */
function installGlobalAccessors(target, GM) {
    /** @type {Record<string, () => unknown>} */
    const getters = {
        room_width: () => GM._active ? GM._active.room_width : 0,
        room_height: () => GM._active ? GM._active.room_height : 0,
        display_width: () => GM._active ? GM._active.display_width : 0,
        display_height: () => GM._active ? GM._active.display_height : 0,
        mouse_x: () => GM._active ? GM._active.mouse_x : 0,
        mouse_y: () => GM._active ? GM._active.mouse_y : 0,
        current_time: () => GM._active ? GM._active.current_time : 0,
        delta_time: () => GM._active ? GM._active.delta_time : 0,
        delta_sec: () => GM._active ? GM._active.delta_sec : 0
    };

    for (const [name, getter] of Object.entries(getters)) {
        Object.defineProperty(target, name, {
            configurable: true,
            get: getter
        });
    }
}

/**
 * @param {{
 *   root: Record<string, unknown>,
 *   GM: { _globalsInstalled?: boolean, _globalsDisposer?: (() => void) | null, _active?: Record<string, unknown> | null },
 *   COLORS: Record<string, unknown>,
 *   ALIGN: Record<string, unknown>,
 *   INPUT: Record<string, unknown>,
 *   math: Record<string, Function>,
 *   active: () => Record<string, Function>
 * }} deps
 */
function createLegacyGlobalInstaller(deps) {
    const {
        root,
        GM,
        COLORS,
        ALIGN,
        INPUT,
        math,
        active
    } = deps;

    return function installGlobals() {
        if (GM._globalsInstalled) return GM._globalsDisposer || (() => {});
        GM._globalsInstalled = true;

        const values = Object.assign({}, COLORS, ALIGN, INPUT, {
            clamp: math.clamp,
            lerp: math.lerp,
            choose: math.choose,
            random: math.random,
            random_range: math.random_range,
            irandom: math.irandom,
            irandom_range: math.irandom_range,
            degtorad: math.degtorad,
            radtodeg: math.radtodeg,
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            abs: Math.abs,
            floor: Math.floor,
            ceil: Math.ceil,
            round: Math.round,
            sqrt: Math.sqrt,
            dsin: math.dsin,
            dcos: math.dcos,
            dtan: math.dtan,
            point_distance: math.point_distance,
            point_direction: math.point_direction,
            lengthdir_x: math.lengthdir_x,
            lengthdir_y: math.lengthdir_y,
            point_in_rectangle: math.point_in_rectangle,
            /** @param {unknown} value */
            ord: (value) => String(value || "").toUpperCase().charCodeAt(0),

            load_sprite: function () { return active().load_sprite.apply(null, arguments); },
            load_sound: function () { return active().load_sound.apply(null, arguments); },
            load_spritesheet: function () { return active().load_spritesheet.apply(null, arguments); },

            draw_set_color: function () { return active().draw_set_color.apply(null, arguments); },
            draw_set_alpha: function () { return active().draw_set_alpha.apply(null, arguments); },
            draw_set_line_width: function () { return active().draw_set_line_width.apply(null, arguments); },
            draw_set_font: function () { return active().draw_set_font.apply(null, arguments); },
            draw_set_halign: function () { return active().draw_set_halign.apply(null, arguments); },
            draw_set_valign: function () { return active().draw_set_valign.apply(null, arguments); },
            draw_rectangle: function () { return active().draw_rectangle.apply(null, arguments); },
            draw_roundrect: function () { return active().draw_roundrect.apply(null, arguments); },
            draw_circle: function () { return active().draw_circle.apply(null, arguments); },
            draw_line: function () { return active().draw_line.apply(null, arguments); },
            draw_text: function () { return active().draw_text.apply(null, arguments); },
            draw_gui_rectangle: function () { return active().draw_gui_rectangle.apply(null, arguments); },
            draw_gui_text: function () { return active().draw_gui_text.apply(null, arguments); },
            draw_sprite: function () { return active().draw_sprite.apply(null, arguments); },
            draw_sprite_ext: function () { return active().draw_sprite_ext.apply(null, arguments); },

            button: function () { return active().button.apply(null, arguments); },
            button_center: function () { return active().button_center.apply(null, arguments); },
            nineslice_window: function () { return active().nineslice_window.apply(null, arguments); },
            modal_notice: function () { return active().modal_notice.apply(null, arguments); },
            modal_close_all: function () { return active().modal_close_all.apply(null, arguments); },
            ui_set_theme: function () { return active().ui_set_theme.apply(null, arguments); },
            ui_get_theme: function () { return active().ui_get_theme.apply(null, arguments); },
            ui_export_textures: function () { return active().ui_export_textures.apply(null, arguments); },
            ui_download_textures: function () { return active().ui_download_textures.apply(null, arguments); },
            curtain: function () { return active().curtain.apply(null, arguments); },
            curtain_active: function () { return active().curtain_active.apply(null, arguments); },

            instance_create_layer: function () { return active().instance_create_layer.apply(null, arguments); },
            instance_destroy: function () { return active().instance_destroy.apply(null, arguments); },
            instance_exists: function () { return active().instance_exists.apply(null, arguments); },
            instance_number: function () { return active().instance_number.apply(null, arguments); },
            instance_find: function () { return active().instance_find.apply(null, arguments); },
            alarm_set: function () { return active().alarm_set.apply(null, arguments); },

            keyboard_check: function () { return active().keyboard_check.apply(null, arguments); },
            keyboard_check_pressed: function () { return active().keyboard_check_pressed.apply(null, arguments); },
            keyboard_check_released: function () { return active().keyboard_check_released.apply(null, arguments); },
            mouse_check_button: function () { return active().mouse_check_button.apply(null, arguments); },
            mouse_check_button_pressed: function () { return active().mouse_check_button_pressed.apply(null, arguments); },
            mouse_check_button_released: function () { return active().mouse_check_button_released.apply(null, arguments); },

            show_debug_message: function () { return active().show_debug_message.apply(null, arguments); },
            tween: function () { return active().tween.apply(null, arguments); },
            wait: function () { return active().wait.apply(null, arguments); },
            every: function () { return active().every.apply(null, arguments); },
            sound_play: function () { return active().sound_play.apply(null, arguments); }
        });

        const names = [...Object.keys(values), ...ACCESSOR_NAMES];
        const previousDescriptors = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(root, name)]));
        Object.assign(root, values);

        installGlobalAccessors(root, GM);
        let restored = false;
        GM._globalsDisposer = () => {
            if (restored) return;
            restored = true;
            for (const [name, descriptor] of previousDescriptors) {
                if (descriptor) Object.defineProperty(root, name, descriptor);
                else delete root[name];
            }
            GM._globalsInstalled = false;
            GM._globalsDisposer = null;
        };
        return GM._globalsDisposer;
    };
}

// @ts-check

/**
 * @param {any} scene
 * @param {{ width: number, height: number, curtain?: boolean }} cfg
 */
function createRuntimeState(scene, cfg) {
    const perf = shouldEnableRuntimePerfProbe(cfg) ? createRuntimePerfState() : null;

    return {
        scene,
        cfg,
        world: null,
        screen: null,
        worldGfx: null,
        screenGfx: null,
        inputBlocker: null,
        worldText: null,
        screenText: null,
        worldSprites: null,
        worldLayers: new Map(),
        activeWorldLayer: "world",
        activeWorldContainer: null,
        cleanup: [],
        cleanedUp: false,
        modals: [],
        instances: [],
        nextInstanceId: 1,
        currentInstance: null,
        uiButtons: new Map(),
        frameId: 0,
        currentTime: 0,
        deltaMs: 0,
        layout: {
            x: 0,
            y: 0,
            scale: 1,
            roomWidth: cfg.width,
            roomHeight: cfg.height,
            profile: "fixed",
            orientation: "portrait"
        },
        render: {
            cssWidth: 0,
            cssHeight: 0,
            width: 0,
            height: 0,
            resolution: 1
        },
        draw: {
            color: 0xffffff,
            alpha: 1,
            lineWidth: 1,
            font: "sans-serif",
            size: 24,
            bold: false,
            halign: "left",
            valign: "top"
        },
        mouse: {
            x: 0,
            y: 0,
            screenX: 0,
            screenY: 0,
            down: Object.create(null),
            pressed: Object.create(null),
            released: Object.create(null)
        },
        inputGate: {
            pausedUntil: 0,
            capturedPointers: Object.create(null),
            transitions: 0
        },
        keysDown: Object.create(null),
        keysPressed: Object.create(null),
        keysReleased: Object.create(null),
        curtain: {
            alpha: cfg.curtain ? 1 : 0,
            visible: !!cfg.curtain,
            tweening: false
        },
        perf
    };
}

// @ts-check

/**
 * @typedef {{
 *   curtain: { visible: boolean, alpha: number, tweening: boolean },
 *   draw: { alpha: number, color: unknown, size: unknown, bold: unknown, halign: unknown, valign: unknown }
 * }} CurtainState
 *
 * @typedef {{
 *   display_width: number,
 *   display_height: number,
 *   mouse_check_button_pressed: (button: unknown) => boolean,
 *   draw_set_alpha: (alpha: number) => unknown,
 *   draw_set_color: (color: unknown) => unknown,
 *   draw_gui_rectangle: (x1: number, y1: number, x2: number, y2: number, outline: boolean) => unknown,
 *   draw_set_font: (font: string, size: number, bold: boolean) => unknown,
 *   draw_set_halign: (align: unknown) => unknown,
 *   draw_set_valign: (align: unknown) => unknown,
 *   draw_gui_text: (x: number, y: number, text: unknown) => unknown
 * }} CurtainApi
 *
 * @typedef {{
 *   tweens: {
 *     add: (config: {
 *       targets: { visible: boolean, alpha: number, tweening: boolean },
 *       alpha: number,
 *       duration: number,
 *       ease: string,
 *       onComplete?: () => void
 *     }) => unknown
 *   }
 * }} CurtainScene
 */

/**
 * @param {unknown} text
 * @param {unknown} fadeMs
 * @param {CurtainState} state
 * @param {CurtainApi} api
 * @param {CurtainScene} scene
 * @param {{ curtainFadeMs: number, curtainText: string }} cfg
 * @param {(value: unknown, fallback: number, min: number) => number} normalizeDelayMs
 * @param {Record<string, unknown>} COLORS
 * @param {Record<string, unknown>} ALIGN
 * @param {Record<string, unknown>} INPUT
 */
function curtain(text, fadeMs, state, api, scene, cfg, normalizeDelayMs, COLORS, ALIGN, INPUT) {
    if (!state.curtain.visible && state.curtain.alpha <= 0) return false;

    if (!state.curtain.tweening && api.mouse_check_button_pressed(INPUT.mb_left)) {
        state.curtain.tweening = true;
        scene.tweens.add({
            targets: state.curtain,
            alpha: 0,
            duration: normalizeDelayMs(fadeMs, cfg.curtainFadeMs, 0),
            ease: "Linear",
            onComplete: () => {
                state.curtain.visible = false;
                state.curtain.tweening = false;
            }
        });
    }

    if (state.curtain.alpha > 0) {
        const previousAlpha = state.draw.alpha;
        const previousColor = state.draw.color;
        const previousSize = state.draw.size;
        const previousBold = state.draw.bold;
        const previousHalign = state.draw.halign;
        const previousValign = state.draw.valign;

        api.draw_set_alpha(state.curtain.alpha);
        api.draw_set_color(COLORS.c_black);
        api.draw_gui_rectangle(0, 0, api.display_width, api.display_height, false);

        api.draw_set_color(COLORS.c_white);
        api.draw_set_font("sans-serif", 40, true);
        api.draw_set_halign(ALIGN.fa_center);
        api.draw_set_valign(ALIGN.fa_middle);
        api.draw_gui_text(api.display_width / 2, api.display_height / 2, text || cfg.curtainText);

        state.draw.alpha = previousAlpha;
        state.draw.color = previousColor;
        state.draw.size = previousSize;
        state.draw.bold = previousBold;
        state.draw.halign = previousHalign;
        state.draw.valign = previousValign;
    }

    return state.curtain.visible;
}

/**
 * @param {CurtainState} state
 */
function curtain_active(state) {
    return state.curtain.visible && state.curtain.alpha > 0;
}

// @ts-check

/**
 * @param {unknown} message
 * @param {{ log?: (message?: unknown, ...optionalParams: unknown[]) => void }} [logger]
 */
function logDebugMessage(message, logger = console) {
    if (logger && typeof logger.log === "function") {
        logger.log(message);
    }
}

// @ts-check




















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
function installGMRuntime(root, Phaser) {
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


// @ts-check

import Phaser from "phaser";

/** @type {typeof globalThis & { Phaser?: { Game?: unknown, Scene?: unknown } }} */
const runtimeRoot = globalThis;

if (!runtimeRoot.Phaser) {
    runtimeRoot.Phaser = Phaser;
}

if (!runtimeRoot.Phaser || typeof runtimeRoot.Phaser.Game !== "function" || typeof runtimeRoot.Phaser.Scene !== "function") {
    throw new Error("gm-phaser4 module entrypoint requires a usable Phaser instance.");
}

const PhaserRuntime = /** @type {{ Game: new (...args: unknown[]) => unknown, Scene: new (...args: unknown[]) => unknown }} */ (runtimeRoot.Phaser);
installGMRuntime(runtimeRoot, PhaserRuntime);
