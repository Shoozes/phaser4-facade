// @ts-check

import { clamp, numberOr } from "./math.js";

/**
 * Preserve an exact source-pixel grid whenever the viewport can contain a
 * whole configured scale quantum. A smaller viewport still fits safely, but
 * is intentionally labeled as a fallback for diagnostics and visual QA.
 * @param {number} scale
 * @param {Record<string, unknown>} cfg
 */
function quantizeScale(scale, cfg) {
    const step = numberOr(cfg.integerScaleStep, 0);
    if (!(step > 0)) return { scale, scaleMode: "continuous" };
    const units = Math.floor((scale + Number.EPSILON) / step);
    if (units < 1) return { scale, scaleMode: "fit-fallback" };
    return { scale: units * step, scaleMode: "integer" };
}

/**
 * @param {number} w
 * @param {number} h
 * @param {Record<string, unknown>} cfg
 */
export function resolveRoomLayout(w, h, cfg) {
    const baseWidth = Math.max(1, numberOr(cfg.width, 720));
    const baseHeight = Math.max(1, numberOr(cfg.height, 1280));
    const orientation = w >= h ? "landscape" : "portrait";

    if (!cfg.responsive) {
        const scaled = quantizeScale(Math.min(w / baseWidth, h / baseHeight), cfg);
        const scale = scaled.scale;

        return {
            roomWidth: baseWidth,
            roomHeight: baseHeight,
            scale,
            x: (w - baseWidth * scale) / 2,
            y: (h - baseHeight * scale) / 2,
            profile: "fixed",
            orientation,
            scaleMode: scaled.scaleMode
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
        const scaled = quantizeScale(scale, cfg);
        scale = scaled.scale;

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
            orientation: "portrait",
            scaleMode: scaled.scaleMode
        };
    }

    const desktopHeight = Math.max(1, numberOr(cfg.desktopHeight, 720));
    const desktopMinWidth = Math.max(1, numberOr(cfg.desktopMinWidth, 1280));
    const desktopMaxWidth = Math.max(desktopMinWidth, numberOr(cfg.desktopMaxWidth, 1920));

    let scale = h / desktopHeight;
    let roomWidth = clamp(w / scale, desktopMinWidth, desktopMaxWidth);

    scale = Math.min(w / roomWidth, h / desktopHeight);
    const scaled = quantizeScale(scale, cfg);
    scale = scaled.scale;

    return {
        roomWidth,
        roomHeight: desktopHeight,
        scale,
        x: (w - roomWidth * scale) / 2,
        y: (h - desktopHeight * scale) / 2,
        profile: "desktop",
        orientation: landscape ? "landscape" : "portrait-wide",
        scaleMode: scaled.scaleMode
    };
}
