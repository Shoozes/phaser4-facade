// @ts-check

import { COLORS } from "./constants.js";

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
 * @param {...unknown} items
 * @returns {unknown}
 */
export function choose(...items) {
    if (items.length <= 0) return undefined;
    return items[Math.floor(Math.random() * items.length)];
}

/**
 * @param {number} max
 */
export function random(max) {
    return Math.random() * max;
}

/**
 * @param {number} min
 * @param {number} max
 */
export function random_range(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * @param {number} max
 */
export function irandom(max) {
    return Math.floor(Math.random() * (max + 1));
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
    return radtodeg(Math.atan2(y1 - y2, x2 - x1));
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
