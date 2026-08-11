// @ts-check

import { DEFAULTS } from "./constants.js";
import { resolveRenderQuality } from "./game-config.js";
import { toColor } from "./math.js";

/**
 * Resolve Phaser renderer type from config. Accepts Phaser constants or
 * case-insensitive "AUTO" | "CANVAS" | "WEBGL" strings for tests and hosts.
 * @param {any} Phaser
 * @param {any} raw
 */
function resolveGameType(Phaser, raw) {
    if (raw === undefined || raw === null) return Phaser.AUTO;
    if (raw === Phaser.AUTO || raw === Phaser.CANVAS || raw === Phaser.WEBGL) return raw;
    const label = String(raw).trim().toUpperCase();
    if (label === "AUTO") return Phaser.AUTO;
    if (label === "CANVAS") return Phaser.CANVAS;
    if (label === "WEBGL") return Phaser.WEBGL;
    throw new TypeError("GM.app.start type must be AUTO, CANVAS, or WEBGL.");
}

/**
 * @param {Record<string, any> | undefined} config
 */
function mergeConfig(config) {
    /** @type {Record<string, any>} */
    const merged = Object.assign({}, DEFAULTS, config || {});
    const positiveFields = [
        "width", "height", "minHeight", "targetHeight", "maxHeight",
        "desktopBreakpoint", "desktopMinWidth", "desktopHeight", "desktopMaxWidth"
    ];
    for (const field of positiveFields) {
        if (!Number.isFinite(Number(merged[field])) || Number(merged[field]) <= 0) {
            throw new TypeError(`GM.app.start requires a positive finite ${field}.`);
        }
    }
    if (merged.minHeight > merged.maxHeight || merged.targetHeight < merged.minHeight || merged.targetHeight > merged.maxHeight) {
        throw new RangeError("GM.app.start requires minHeight <= targetHeight <= maxHeight.");
    }
    if (merged.desktopMinWidth > merged.desktopMaxWidth) {
        throw new RangeError("GM.app.start requires desktopMinWidth <= desktopMaxWidth.");
    }
    if (merged.renderResolution !== "auto" &&
        (!Number.isFinite(Number(merged.renderResolution)) || Number(merged.renderResolution) <= 0)) {
        throw new TypeError("GM.app.start requires renderResolution to be a positive number or 'auto'.");
    }
    if (!Number.isFinite(Number(merged.maxRenderResolution)) || Number(merged.maxRenderResolution) <= 0) {
        throw new TypeError("GM.app.start requires a positive finite maxRenderResolution.");
    }
    for (const callbackName of ["preload", "create", "step", "draw", "ui", "gui", "onCleanupError", "onError"]) {
        if (merged[callbackName] !== undefined && typeof merged[callbackName] !== "function") {
            throw new TypeError(`GM.app.start requires ${callbackName} to be a function when provided.`);
        }
    }
    if (merged.globals !== undefined && typeof merged.globals !== "boolean") {
        throw new TypeError("GM.app.start requires globals to be a boolean.");
    }
    if (merged.simulationHz !== undefined &&
        (!Number.isFinite(Number(merged.simulationHz)) || Number(merged.simulationHz) < 0)) {
        throw new TypeError("GM.app.start requires simulationHz to be a non-negative finite number.");
    }
    if (merged.maxFrameDeltaMs !== undefined &&
        (!Number.isFinite(Number(merged.maxFrameDeltaMs)) || Number(merged.maxFrameDeltaMs) <= 0)) {
        throw new TypeError("GM.app.start requires maxFrameDeltaMs to be a positive finite number.");
    }
    if (merged.maxCatchUpSteps !== undefined &&
        (!Number.isFinite(Number(merged.maxCatchUpSteps)) || Number(merged.maxCatchUpSteps) < 1)) {
        throw new TypeError("GM.app.start requires maxCatchUpSteps to be a finite number >= 1.");
    }
    return merged;
}

/**
 * Prefer the configured parent element's box over the full window so the
 * facade does not assume it owns the entire browser chrome.
 * @param {any} root
 * @param {unknown} parent
 * @param {number} fallbackWidth
 * @param {number} fallbackHeight
 */
function resolveStartSize(root, parent, fallbackWidth, fallbackHeight) {
    /** @type {any} */
    let element = null;
    if (typeof parent === "string" && root.document) {
        element = root.document.getElementById(parent) || root.document.querySelector(parent);
    } else if (parent && typeof parent === "object" && typeof /** @type {any} */ (parent).getBoundingClientRect === "function") {
        element = parent;
    }
    if (element && typeof element.getBoundingClientRect === "function") {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            return { width: Math.round(rect.width), height: Math.round(rect.height) };
        }
        const clientWidth = Number(element.clientWidth);
        const clientHeight = Number(element.clientHeight);
        if (clientWidth > 0 && clientHeight > 0) {
            return { width: Math.round(clientWidth), height: Math.round(clientHeight) };
        }
    }
    const windowWidth = Number(root.innerWidth);
    const windowHeight = Number(root.innerHeight);
    return {
        width: Number.isFinite(windowWidth) && windowWidth > 0 ? windowWidth : fallbackWidth,
        height: Number.isFinite(windowHeight) && windowHeight > 0 ? windowHeight : fallbackHeight
    };
}

/**
 * @param {{ root: any, Phaser: any, makeScene: (config: any) => any, installGlobals: () => (() => void) | undefined }} deps
 */
export function createGameStarter({ root, Phaser, makeScene, installGlobals }) {
    /**
     * @param {Record<string, any>} [config]
     */
    return function start(config) {
        if (!root.Phaser) {
            throw new Error("Phaser must be loaded before gm-phaser4.js starts a game.");
        }

        const cfg = mergeConfig(config);
        const globalsDisposer = cfg.globals ? installGlobals() : null;
        const renderQuality = resolveRenderQuality(cfg);
        const startSize = resolveStartSize(root, cfg.parent, cfg.width, cfg.height);
        try {
            return new Phaser.Game({
                type: resolveGameType(Phaser, cfg.type),
                parent: cfg.parent,
                width: startSize.width,
                height: startSize.height,
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
        } catch (error) {
            if (typeof globalsDisposer === "function") globalsDisposer();
            throw error;
        }
    };
}
