// @ts-check

import { COLORS } from "./constants.js";

/** @type {Record<string, number>} */
const NAMED_COLORS = COLORS;

const HEX_COLOR_PATTERN = /^[0-9a-f]{3}$|^[0-9a-f]{6}$/i;

/**
 * GameMaker stores numeric colors as BGR integers while Phaser and CSS use
 * RGB ordering. String colors remain ordinary CSS/RGB values.
 * @param {number} value
 * @returns {number}
 */
function bgrToRgb(value) {
    const bgr = value >>> 0;
    return ((bgr & 0xff) << 16) | (bgr & 0xff00) | ((bgr >>> 16) & 0xff);
}

/**
 * @param {string} value
 * @returns {string | null}
 */
function normalizeHexString(value) {
    let hex = value.trim();
    if (hex.startsWith("#")) hex = hex.slice(1);
    else if (/^0x/i.test(hex)) hex = hex.slice(2);
    if (!HEX_COLOR_PATTERN.test(hex)) return null;
    if (hex.length === 3) hex = hex.split("").map((part) => part + part).join("");
    return hex.toLowerCase();
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isHexLike(value) {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    return trimmed.startsWith("#") || /^0x/i.test(trimmed) || /^[0-9a-f]+$/i.test(trimmed) || /^[0-9]/.test(trimmed);
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function toColor(value, fallback = 0xffffff) {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffffff) {
        return bgrToRgb(value);
    }
    if (typeof value !== "string") return fallback;

    const named = NAMED_COLORS[String(value).trim()];
    if (named !== undefined) return bgrToRgb(named);

    const hex = normalizeHexString(value);
    if (!hex) return fallback;
    const parsed = Number.parseInt(hex, 16);
    return Number.isInteger(parsed) ? parsed : fallback;
}

/**
 * @param {unknown} value
 * @param {string} fallback
 */
function toCssColor(value, fallback = "#ffffff") {
    if (typeof value === "number") {
        const parsed = toColor(value, Number.NaN);
        return Number.isFinite(parsed) ? "#" + parsed.toString(16).padStart(6, "0") : fallback;
    }
    if (typeof value === "string") {
        const named = NAMED_COLORS[value.trim()];
        if (named !== undefined) return toCssColor(named, fallback);
        const trimmed = value.trim();
        const hex = normalizeHexString(trimmed);
        if (hex) return "#" + hex;
        // A malformed value that looks like a hex color should fail closed;
        // regular CSS names/functions remain valid pass-through values.
        return isHexLike(trimmed) ? fallback : (trimmed || fallback);
    }
    return fallback;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Return a stable multiplicative damping factor for a frame delta. `factor`
 * is the factor applied at `referenceHz` and may be zero, but not negative.
 * @param {number} factor
 * @param {number} deltaSeconds
 * @param {number} [referenceHz=60]
 */
export function dampFactor(factor, deltaSeconds, referenceHz = 60) {
    if (!Number.isFinite(factor) || factor < 0) throw new RangeError("dampFactor factor must be finite and non-negative.");
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError("dampFactor deltaSeconds must be finite and non-negative.");
    if (!Number.isFinite(referenceHz) || referenceHz <= 0) throw new RangeError("dampFactor referenceHz must be finite and greater than zero.");
    return Math.pow(factor, deltaSeconds * referenceHz);
}

/**
 * @param {number} dx
 * @param {number} dy
 * @param {{ x?: number, y?: number, length?: number }} [out]
 * @returns {{ x: number, y: number, length: number }}
 */
export function normalize2(dx, dy, out) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new TypeError("normalize2 components must be finite numbers.");
    const length = Math.hypot(dx, dy);
    const target = out || {};
    target.x = length === 0 ? 0 : dx / length;
    target.y = length === 0 ? 0 : dy / length;
    target.length = length;
    return /** @type {{ x: number, y: number, length: number }} */ (target);
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
export function distanceSq(x1, y1, x2, y2) {
    if (![x1, y1, x2, y2].every(Number.isFinite)) throw new TypeError("distanceSq coordinates must be finite numbers.");
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

/**
 * @typedef {object} ActiveRng
 * @property {() => number} next
 * @property {(...items: unknown[]) => unknown} choose
 * @property {(max: number) => number} random
 * @property {(min: number, max: number) => number} randomRange
 * @property {(max: number) => number} irandom
 * @property {(min: number, max: number) => number} irandomRange
 */
/** @type {ActiveRng | null} */
let activeRng = null;

/**
 * Bind an optional seedable RNG used by facade random helpers.
 * Pass null to restore Math.random().
 * @param {ActiveRng | null} rng
 */
export function setActiveRng(rng) {
    activeRng = rng || null;
}

/**
 * @returns {number}
 */
function unitRandom() {
    return activeRng ? activeRng.next() : Math.random();
}

/**
 * @param {...unknown} items
 * @returns {unknown}
 */
export function choose(...items) {
    if (items.length <= 0) return undefined;
    if (activeRng) return activeRng.choose(...items);
    return items[Math.floor(unitRandom() * items.length)];
}

/**
 * @param {number} max
 */
export function random(max) {
    return unitRandom() * max;
}

/**
 * @param {number} min
 * @param {number} max
 */
export function random_range(min, max) {
    return min + unitRandom() * (max - min);
}

/**
 * @param {number} max
 */
export function irandom(max) {
    return Math.floor(unitRandom() * (max + 1));
}

/**
 * @param {number} min
 * @param {number} max
 */
export function irandom_range(min, max) {
    return Math.floor(random_range(min, max + 1));
}

/**
 * @param {number} degrees
 */
export function degtorad(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * @param {number} radians
 */
export function radtodeg(radians) {
    return radians * 180 / Math.PI;
}

/**
 * @param {number} degrees
 */
export function dsin(degrees) {
    return Math.sin(degtorad(degrees));
}

/**
 * @param {number} degrees
 */
export function dcos(degrees) {
    return Math.cos(degtorad(degrees));
}

/**
 * @param {number} degrees
 */
export function dtan(degrees) {
    return Math.tan(degtorad(degrees));
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
export function point_distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
export function point_direction(x1, y1, x2, y2) {
    // GameMaker: right=0, up=90, left=180, down=270 in [0, 360).
    const degrees = radtodeg(Math.atan2(y1 - y2, x2 - x1));
    return ((degrees % 360) + 360) % 360;
}

/**
 * @param {number} length
 * @param {number} direction
 */
export function lengthdir_x(length, direction) {
    return Math.cos(degtorad(direction)) * length;
}

/**
 * @param {number} length
 * @param {number} direction
 */
export function lengthdir_y(length, direction) {
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
export function point_in_rectangle(px, py, x1, y1, x2, y2) {
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
export function numberOr(value, fallback) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
}

export {
    toColor,
    toCssColor
};
