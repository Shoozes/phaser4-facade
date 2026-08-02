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
export function syncRenderResolution(scene, state, cfg, root) {
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
