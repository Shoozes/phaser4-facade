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

/**
 * @param {string} id
 * @param {{ x: number, y: number, screenX: number, screenY: number, button?: string, kind?: string, time?: number }} seed
 */
export function createPointerRecord(id, seed) {
    return {
        id: String(id),
        screenX: seed.screenX,
        screenY: seed.screenY,
        x: seed.x,
        y: seed.y,
        startX: seed.x,
        startY: seed.y,
        button: seed.button || "left",
        kind: seed.kind || "mouse",
        down: false,
        active: true,
        pressed: false,
        released: false,
        owner: null,
        downTime: Number(seed.time) || 0
    };
}

/**
 * @param {Record<string, any>} record
 * @param {{ x: number, y: number, time?: number }} coords
 */
export function applyPointerDown(record, coords) {
    if (!record.down) {
        record.startX = coords.x;
        record.startY = coords.y;
        record.downTime = Number(coords.time) || record.downTime || 0;
        record.pressed = true;
    }
    record.down = true;
    record.released = false;
    record.active = true;
    return record;
}

/**
 * @param {Record<string, any>} record
 */
export function applyPointerRelease(record) {
    record.down = false;
    record.released = true;
    record.active = true;
    return record;
}

/**
 * @param {Record<string, any>} record
 */
export function endPointerFrame(record) {
    record.pressed = false;
    record.released = false;
    if (!record.down) record.active = false;
    return record;
}

/**
 * Keep one primary id from press through the end of the release frame.
 * @param {string | null | undefined} currentId
 * @param {Map<string, Record<string, any>> | Iterable<Record<string, any>>} pointers
 * @param {string} candidateId
 * @param {{ down?: boolean }} [flags]
 */
export function rememberPrimaryPointerId(currentId, pointers, candidateId, flags = {}) {
    const records = pointers instanceof Map ? pointers : new Map(
        Array.from(pointers || []).filter(Boolean).map((pointer) => [String(pointer.id), pointer])
    );
    if (currentId) {
        const current = records.get(String(currentId));
        if (current && (current.down || current.released || current.active)) return String(currentId);
    }
    if (flags.down === true) return String(candidateId);
    return currentId ? String(currentId) : null;
}

/**
 * @param {string | null | undefined} primaryId
 * @param {Map<string, Record<string, any>>} pointers
 */
export function resolvePrimaryPointer(primaryId, pointers) {
    if (primaryId && pointers.has(String(primaryId))) {
        const record = pointers.get(String(primaryId));
        if (record && (record.down || record.released || record.active)) return record;
    }
    return pickPrimaryPointer(Array.from(pointers.values()));
}
