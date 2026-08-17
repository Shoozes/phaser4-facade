// @ts-check

import { INPUT } from "./constants.js";

/**
 * @param {unknown} input
 * @returns {string}
 */
export function normalizeKey(input) {
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
export function buttonFromPointer(pointer) {
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
export function stopInputEvent(event) {
    if (!event || typeof event !== "object") return;

    /** @type {{ stopPropagation?: () => void }} */
    const inputEvent = event;
    if (typeof inputEvent.stopPropagation === "function") inputEvent.stopPropagation();
}

/**
 * @param {unknown} pointer
 */
export function preventPointerDefault(pointer) {
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
export function consumeInputEvent(pointer, event) {
    stopInputEvent(event);
    preventPointerDefault(pointer);
}

/**
 * @param {unknown} options
 * @param {number} defaultInputBlockMs
 * @returns {number}
 */
export function modalInputBlockMs(options, defaultInputBlockMs) {
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
export function normalizeDelayMs(value, fallback, minimum) {
    const min = minimum === undefined ? 0 : minimum;
    const next = value === undefined || value === null || value === "" ? fallback : Number(value);
    if (!Number.isFinite(next)) return Math.max(min, fallback || 0);
    return Math.max(min, next);
}

/**
 * @param {unknown} pointer
 * @returns {string}
 */
export function pointerGateKey(pointer) {
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
export function hasObjectKeys(value) {
    if (!value || typeof value !== "object") return false;
    for (const key in value) return true;
    return false;
}

/**
 * @param {unknown} pointer
 * @returns {"mouse" | "touch" | "pen"}
 */
export function inferPointerKind(pointer) {
    if (!pointer || typeof pointer !== "object") return "mouse";
    /** @type {any} */
    const raw = pointer;
    const token = String(raw.pointerType || raw.type || raw.kind || "").toLowerCase();
    if (token.includes("touch")) return "touch";
    if (token.includes("pen") || token.includes("stylus")) return "pen";
    if (token.includes("mouse")) return "mouse";
    if (raw.wasTouch === true || raw.isTouch === true) return "touch";
    return "mouse";
}

/**
 * Latest active pointer, preferring one that is currently down.
 * @template {Record<string, any>} T
 * @param {T[]} pointers
 * @returns {T | null}
 */
export function pickPrimaryPointer(pointers) {
    if (!Array.isArray(pointers) || pointers.length === 0) return null;
    let chosen = null;
    for (const pointer of pointers) {
        if (!pointer || pointer.active === false) continue;
        if (!chosen) {
            chosen = pointer;
            continue;
        }
        if (pointer.down && !chosen.down) chosen = pointer;
        else if (pointer.down === chosen.down) chosen = pointer;
    }
    return chosen;
}
