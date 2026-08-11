// @ts-check

import { clamp, numberOr } from "./math.js";

/**
 * @param {Record<string, unknown>} cfg
 * @param {Window & typeof globalThis} root
 */
export function resolveRenderResolution(cfg, root) {
    const max = Math.max(1, numberOr(cfg.maxRenderResolution, 3));
    if (cfg.renderResolution === "auto") {
        return clamp(numberOr(root.devicePixelRatio, 1), 1, max);
    }

    return clamp(numberOr(cfg.renderResolution, 1), 1, max);
}

/**
 * @param {unknown[]} values
 */
function cssSize(values) {
    for (const value of values) {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric > 0) return Math.max(1, Math.round(numeric));
    }
    return 1;
}

/**
 * @param {any} target
 * @param {string} key
 * @param {number} expected
 */
function dimensionMatches(target, key, expected) {
    if (!target || (typeof target !== "object" && typeof target !== "function") || !(key in target)) return true;
    return Number(target[key]) === expected;
}

/**
 * @param {any} target
 * @param {number} width
 * @param {number} height
 */
function sizeMatches(target, width, height) {
    return dimensionMatches(target, "width", width) && dimensionMatches(target, "height", height);
}

/**
 * @param {any} target
 * @param {number} resolution
 */
function displayScaleMatches(target, resolution) {
    return dimensionMatches(target, "x", resolution) && dimensionMatches(target, "y", resolution);
}

/**
 * @param {any} scene
 * @param {number} width
 * @param {number} height
 */
function rendererMatches(scene, width, height) {
    return dimensionMatches(scene.renderer, "width", width) && dimensionMatches(scene.renderer, "height", height);
}

/**
 * @param {any} scene
 * @param {any} state
 * @param {Record<string, unknown>} cfg
 * @param {Window & typeof globalThis} root
 * @param {string} [source]
 */
export function syncRenderResolution(scene, state, cfg, root, source = "layout") {
    state.render = state.render || {};
    const renderState = state.render;
    const diagnostics = renderState.resizeDiagnostics || {
        events: 0,
        applied: 0,
        reentrySkips: 0,
        last: null,
        lastSignature: null
    };
    renderState.resizeDiagnostics = diagnostics;
    diagnostics.events += 1;

    if (renderState.resizeInProgress) {
        diagnostics.reentrySkips += 1;
        diagnostics.last = {
            source,
            changed: false,
            reentrant: true
        };
        return renderState;
    }

    renderState.resizeInProgress = true;
    const scale = scene.scale;
    const canvas = scale?.canvas || scene.game?.canvas;
    const parentSize = scale?.parentSize || {};
    const canvasRect = canvas?.getBoundingClientRect ? canvas.getBoundingClientRect() : null;

    try {
        const cssWidth = cssSize([
            parentSize.width,
            canvasRect?.width,
            root.innerWidth,
            scale?.width,
            cfg.width
        ]);
        const cssHeight = cssSize([
            parentSize.height,
            canvasRect?.height,
            root.innerHeight,
            scale?.height,
            cfg.height
        ]);
        const resolution = resolveRenderResolution(cfg, root);
        const width = Math.max(1, Math.round(cssWidth * resolution));
        const height = Math.max(1, Math.round(cssHeight * resolution));

        renderState.cssWidth = cssWidth;
        renderState.cssHeight = cssHeight;
        renderState.resolution = resolution;
        renderState.width = width;
        renderState.height = height;

        if (!canvas) {
            diagnostics.last = { source, changed: false, reason: "canvas-unavailable" };
            return renderState;
        }

        const styleWidth = `${cssWidth}px`;
        const styleHeight = `${cssHeight}px`;
        const imageRendering = cfg.renderQuality === "pixel-art" || cfg.pixelArt ? "pixelated" : "auto";
        const signature = [cssWidth, cssHeight, resolution, width, height, imageRendering].join(":");
        const shouldResize = diagnostics.lastSignature !== signature ||
            canvas.width !== width ||
            canvas.height !== height ||
            canvas.style.width !== styleWidth ||
            canvas.style.height !== styleHeight ||
            canvas.style.marginLeft !== "0px" ||
            canvas.style.marginTop !== "0px" ||
            canvas.style.imageRendering !== imageRendering ||
            !sizeMatches(scale?.gameSize, cssWidth, cssHeight) ||
            !sizeMatches(scale?.baseSize, width, height) ||
            !sizeMatches(scale?.displaySize, cssWidth, cssHeight) ||
            !displayScaleMatches(scale?.displayScale, resolution) ||
            !rendererMatches(scene, width, height);

        if (!shouldResize) {
            diagnostics.last = { source, changed: false, signature };
            return renderState;
        }

        canvas.style.imageRendering = imageRendering;
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

        diagnostics.applied += 1;
        diagnostics.lastSignature = signature;
        diagnostics.last = {
            source,
            changed: true,
            cssWidth,
            cssHeight,
            width,
            height,
            resolution,
            signature
        };
        return renderState;
    } finally {
        renderState.resizeInProgress = false;
    }
}
