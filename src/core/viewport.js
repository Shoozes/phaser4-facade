// @ts-check

import { clamp, numberOr } from "./math.js";

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} ViewportRect
 * @typedef {{ top: number, right: number, bottom: number, left: number }} ViewportInsets
 * @typedef {{ x: "left" | "center" | "right", y: "top" | "center" | "bottom" }} ViewportAlign
 * @typedef {{
 *   mode: "fixed" | "adaptive",
 *   width: number,
 *   height: number,
 *   fit: "contain" | "cover",
 *   scaleStep: number | false,
 *   fitArea: "viewport" | "safe",
 *   safeArea: "none" | "inset" | "frame" | "vertical",
 *   align: { portrait: ViewportAlign, landscape: ViewportAlign },
 *   minHeight: number,
 *   targetHeight: number,
 *   maxHeight: number,
 *   desktopBreakpoint: number,
 *   desktopMinWidth: number,
 *   desktopHeight: number,
 *   desktopMaxWidth: number
 * }} NormalizedViewport
 * @typedef {{
 *   mode: NormalizedViewport["mode"],
 *   fit: NormalizedViewport["fit"],
 *   scaleStep: number | false,
 *   fitArea: NormalizedViewport["fitArea"],
 *   safeArea: NormalizedViewport["safeArea"],
 *   logicalRect: ViewportRect,
 *   screenRect: ViewportRect,
 *   safeScreenRect: ViewportRect,
 *   gameScreenRect: ViewportRect,
 *   visibleRoomRect: ViewportRect,
 *   frameRects: { left: ViewportRect | null, right: ViewportRect | null, top: ViewportRect | null, bottom: ViewportRect | null },
 *   scale: number,
 *   scaleMode: "continuous" | "integer" | "fit-fallback",
 *   orientation: string,
 *   profile: string,
 *   safeInsets: ViewportInsets
 * }} ViewportSnapshot
 */

const ALIGN_X = new Set(["left", "center", "right"]);
const ALIGN_Y = new Set(["top", "center", "bottom"]);

/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {ViewportRect}
 */
export function makeRect(x, y, width, height) {
    return {
        x,
        y,
        width: Math.max(0, width),
        height: Math.max(0, height)
    };
}

/**
 * @param {ViewportRect | null | undefined} rect
 * @returns {ViewportRect}
 */
export function copyRect(rect) {
    if (!rect) return makeRect(0, 0, 0, 0);
    return makeRect(rect.x, rect.y, rect.width, rect.height);
}

/**
 * @param {Partial<ViewportInsets> | null | undefined} insets
 * @returns {ViewportInsets}
 */
export function copyInsets(insets) {
    return {
        top: numberOr(insets && insets.top, 0),
        right: numberOr(insets && insets.right, 0),
        bottom: numberOr(insets && insets.bottom, 0),
        left: numberOr(insets && insets.left, 0)
    };
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function parseCssPx(value) {
    const numeric = parseFloat(String(value || "").trim());
    return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Zero, false, and null all mean "continuous scaling".
 * @param {unknown} value
 * @param {string} [label]
 * @returns {number | false}
 */
export function normalizeScaleStep(value, label = "scaleStep") {
    if (value === false || value === null || value === undefined || value === "") return false;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        throw new TypeError(`GM.app.start requires ${label} to be a non-negative finite number, false, or null.`);
    }
    return numeric === 0 ? false : numeric;
}

/**
 * @param {unknown} value
 * @param {"left" | "center" | "right" | "top" | "bottom"} fallback
 * @param {Set<string>} allowed
 * @param {string} label
 */
function normalizeAlignToken(value, fallback, allowed, label) {
    if (value === undefined || value === null || value === "") return fallback;
    const token = String(value);
    if (!allowed.has(token)) {
        throw new TypeError(`GM.app.start viewport.${label} must be one of: ${Array.from(allowed).join(", ")}.`);
    }
    return /** @type {any} */ (token);
}

/**
 * @param {unknown} value
 * @param {ViewportAlign} fallback
 * @returns {ViewportAlign}
 */
function normalizeAlign(value, fallback) {
    if (!value || typeof value !== "object") return { x: fallback.x, y: fallback.y };
    const raw = /** @type {{ x?: unknown, y?: unknown }} */ (value);
    return {
        x: normalizeAlignToken(raw.x, fallback.x, ALIGN_X, "align.x"),
        y: normalizeAlignToken(raw.y, fallback.y, ALIGN_Y, "align.y")
    };
}

/**
 * @param {unknown} value
 * @returns {{ portrait: ViewportAlign, landscape: ViewportAlign }}
 */
function normalizeAlignByOrientation(value) {
    const centered = { x: /** @type {const} */ ("center"), y: /** @type {const} */ ("center") };
    if (!value || typeof value !== "object") {
        return { portrait: { ...centered }, landscape: { ...centered } };
    }
    const raw = /** @type {{ portrait?: unknown, landscape?: unknown, x?: unknown, y?: unknown }} */ (value);
    if (raw.portrait !== undefined || raw.landscape !== undefined) {
        return {
            portrait: normalizeAlign(raw.portrait, centered),
            landscape: normalizeAlign(raw.landscape, centered)
        };
    }
    const shared = normalizeAlign(raw, centered);
    return { portrait: { ...shared }, landscape: { ...shared } };
}

/**
 * @param {unknown} value
 * @param {string} fallback
 * @param {string[]} allowed
 * @param {string} label
 */
function normalizeEnum(value, fallback, allowed, label) {
    if (value === undefined || value === null || value === "") return fallback;
    const token = String(value);
    if (!allowed.includes(token)) {
        throw new TypeError(`GM.app.start viewport.${label} must be one of: ${allowed.join(", ")}.`);
    }
    return token;
}

/**
 * Fold `viewport` plus the legacy `responsive` / `integerScaleStep` fields
 * into one object that layout math can trust.
 * @param {Record<string, any>} cfg
 * @returns {NormalizedViewport}
 */
export function normalizeViewportConfig(cfg) {
    const source = cfg && typeof cfg === "object" ? cfg : {};
    const raw = source.viewport && typeof source.viewport === "object" ? source.viewport : {};
    const width = numberOr(raw.width, numberOr(source.width, 720));
    const height = numberOr(raw.height, numberOr(source.height, 1280));
    if (!(width > 0) || !(height > 0)) {
        throw new TypeError("GM.app.start viewport width and height must be positive finite numbers.");
    }

    let mode = raw.mode;
    if (mode === undefined || mode === null || mode === "") {
        mode = source.responsive ? "adaptive" : "fixed";
    }
    mode = normalizeEnum(mode, "fixed", ["fixed", "adaptive"], "mode");

    const scaleStep = normalizeScaleStep(
        raw.scaleStep !== undefined ? raw.scaleStep : source.integerScaleStep,
        raw.scaleStep !== undefined ? "viewport.scaleStep" : "integerScaleStep"
    );

    return {
        mode: /** @type {NormalizedViewport["mode"]} */ (mode),
        width,
        height,
        fit: /** @type {NormalizedViewport["fit"]} */ (normalizeEnum(raw.fit, "contain", ["contain", "cover"], "fit")),
        scaleStep,
        fitArea: /** @type {NormalizedViewport["fitArea"]} */ (normalizeEnum(raw.fitArea, "viewport", ["viewport", "safe"], "fitArea")),
        safeArea: /** @type {NormalizedViewport["safeArea"]} */ (normalizeEnum(raw.safeArea, "none", ["none", "inset", "frame", "vertical"], "safeArea")),
        align: normalizeAlignByOrientation(raw.align),
        minHeight: Math.max(1, numberOr(raw.minHeight, numberOr(source.minHeight, height))),
        targetHeight: Math.max(1, numberOr(raw.targetHeight, numberOr(source.targetHeight, height))),
        maxHeight: Math.max(1, numberOr(raw.maxHeight, numberOr(source.maxHeight, height))),
        desktopBreakpoint: Math.max(1, numberOr(raw.desktopBreakpoint, numberOr(source.desktopBreakpoint, 1000))),
        desktopMinWidth: Math.max(1, numberOr(raw.desktopMinWidth, numberOr(source.desktopMinWidth, 1280))),
        desktopHeight: Math.max(1, numberOr(raw.desktopHeight, numberOr(source.desktopHeight, 720))),
        desktopMaxWidth: Math.max(1, numberOr(raw.desktopMaxWidth, numberOr(source.desktopMaxWidth, 1920)))
    };
}

/**
 * Keep legacy fields in lockstep with the normalized viewport object.
 * @param {Record<string, any>} cfg
 * @returns {Record<string, any>}
 */
export function applyViewportToConfig(cfg) {
    const viewport = normalizeViewportConfig(cfg);
    cfg.viewport = viewport;
    cfg.width = viewport.width;
    cfg.height = viewport.height;
    cfg.responsive = viewport.mode === "adaptive";
    cfg.integerScaleStep = viewport.scaleStep === false ? null : viewport.scaleStep;
    cfg.minHeight = viewport.minHeight;
    cfg.targetHeight = viewport.targetHeight;
    cfg.maxHeight = viewport.maxHeight;
    cfg.desktopBreakpoint = viewport.desktopBreakpoint;
    cfg.desktopMinWidth = viewport.desktopMinWidth;
    cfg.desktopHeight = viewport.desktopHeight;
    cfg.desktopMaxWidth = viewport.desktopMaxWidth;
    return cfg;
}

/**
 * @param {number} scale
 * @param {number | false} step
 */
export function quantizeScale(scale, step) {
    if (!(typeof step === "number" && step > 0)) return { scale, scaleMode: /** @type {const} */ ("continuous") };
    const units = Math.floor((scale + Number.EPSILON) / step);
    if (units < 1) return { scale, scaleMode: /** @type {const} */ ("fit-fallback") };
    return { scale: units * step, scaleMode: /** @type {const} */ ("integer") };
}

/**
 * @param {unknown} root
 * @param {unknown} [element]
 * @returns {ViewportInsets}
 */
export function readSafeInsets(root, element) {
    const empty = { top: 0, right: 0, bottom: 0, left: 0 };
    /** @type {any} */
    const host = root;
    if (!host || typeof host.getComputedStyle !== "function") return empty;
    const documentLike = host.document || host;
    const target = element
        || documentLike.documentElement
        || documentLike.body
        || null;
    if (!target) return empty;
    const style = host.getComputedStyle(target);
    if (!style) return empty;
    return {
        top: parseCssPx(style.getPropertyValue("--gm-app-safe-area-top")),
        right: parseCssPx(style.getPropertyValue("--gm-app-safe-area-right")),
        bottom: parseCssPx(style.getPropertyValue("--gm-app-safe-area-bottom")),
        left: parseCssPx(style.getPropertyValue("--gm-app-safe-area-left"))
    };
}

/**
 * @param {ViewportRect} screen
 * @param {ViewportInsets} insets
 * @returns {ViewportRect}
 */
function insetRect(screen, insets) {
    const left = Math.max(0, insets.left);
    const top = Math.max(0, insets.top);
    const right = Math.max(0, insets.right);
    const bottom = Math.max(0, insets.bottom);
    return makeRect(
        screen.x + left,
        screen.y + top,
        screen.width - left - right,
        screen.height - top - bottom
    );
}

/**
 * @param {ViewportAlign} align
 */
function alignFactor(align) {
    return {
        x: align.x === "left" ? 0 : align.x === "right" ? 1 : 0.5,
        y: align.y === "top" ? 0 : align.y === "bottom" ? 1 : 0.5
    };
}

/**
 * @param {ViewportRect} screen
 * @param {ViewportRect} game
 */
function frameRectsFrom(screen, game) {
    const gameRight = game.x + game.width;
    const gameBottom = game.y + game.height;
    const screenRight = screen.x + screen.width;
    const screenBottom = screen.y + screen.height;
    const topHeight = game.y - screen.y;
    const bottomHeight = screenBottom - gameBottom;
    const leftWidth = game.x - screen.x;
    const rightWidth = screenRight - gameRight;
    return {
        top: topHeight > 0.000001 ? makeRect(screen.x, screen.y, screen.width, topHeight) : null,
        bottom: bottomHeight > 0.000001 ? makeRect(screen.x, gameBottom, screen.width, bottomHeight) : null,
        left: leftWidth > 0.000001 ? makeRect(screen.x, game.y, leftWidth, game.height) : null,
        right: rightWidth > 0.000001 ? makeRect(gameRight, game.y, rightWidth, game.height) : null
    };
}

/**
 * @param {ViewportRect} screen
 * @param {ViewportRect} game
 * @param {number} scale
 */
export function visibleRoomRectFrom(screen, game, scale) {
    const safeScale = scale > 0 ? scale : 1;
    return makeRect(
        (screen.x - game.x) / safeScale,
        (screen.y - game.y) / safeScale,
        screen.width / safeScale,
        screen.height / safeScale
    );
}

/**
 * @param {number} screenX
 * @param {number} screenY
 * @param {ViewportRect} game
 * @param {number} scale
 */
export function screenToRoom(screenX, screenY, game, scale) {
    const safeScale = scale > 0 ? scale : 1;
    return {
        x: (Number(screenX) - game.x) / safeScale,
        y: (Number(screenY) - game.y) / safeScale
    };
}

/**
 * @param {number} roomX
 * @param {number} roomY
 * @param {ViewportRect} game
 * @param {number} scale
 */
export function roomToScreen(roomX, roomY, game, scale) {
    return {
        x: game.x + Number(roomX) * scale,
        y: game.y + Number(roomY) * scale
    };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {ViewportRect} rect
 */
export function containsPoint(x, y, rect) {
    return x >= rect.x && y >= rect.y && x <= rect.x + rect.width && y <= rect.y + rect.height;
}

/**
 * @returns {ViewportSnapshot}
 */
export function createEmptyViewportSnapshot() {
    const zero = makeRect(0, 0, 0, 0);
    return {
        mode: "fixed",
        fit: "contain",
        scaleStep: false,
        fitArea: "viewport",
        safeArea: "none",
        logicalRect: makeRect(0, 0, 0, 0),
        screenRect: zero,
        safeScreenRect: zero,
        gameScreenRect: zero,
        visibleRoomRect: zero,
        frameRects: { left: null, right: null, top: null, bottom: null },
        scale: 1,
        scaleMode: "continuous",
        orientation: "portrait",
        profile: "fixed",
        safeInsets: { top: 0, right: 0, bottom: 0, left: 0 }
    };
}

/**
 * @param {ViewportSnapshot} snapshot
 * @returns {ViewportSnapshot}
 */
export function copyViewportSnapshot(snapshot) {
    const source = snapshot || createEmptyViewportSnapshot();
    return {
        mode: source.mode,
        fit: source.fit,
        scaleStep: source.scaleStep,
        fitArea: source.fitArea,
        safeArea: source.safeArea,
        logicalRect: copyRect(source.logicalRect),
        screenRect: copyRect(source.screenRect),
        safeScreenRect: copyRect(source.safeScreenRect),
        gameScreenRect: copyRect(source.gameScreenRect),
        visibleRoomRect: copyRect(source.visibleRoomRect),
        frameRects: {
            left: source.frameRects.left ? copyRect(source.frameRects.left) : null,
            right: source.frameRects.right ? copyRect(source.frameRects.right) : null,
            top: source.frameRects.top ? copyRect(source.frameRects.top) : null,
            bottom: source.frameRects.bottom ? copyRect(source.frameRects.bottom) : null
        },
        scale: source.scale,
        scaleMode: source.scaleMode,
        orientation: source.orientation,
        profile: source.profile,
        safeInsets: copyInsets(source.safeInsets)
    };
}

/**
 * @param {NormalizedViewport} viewport
 * @param {number} fitWidth
 * @param {number} fitHeight
 */
function resolveAdaptiveRoom(viewport, fitWidth, fitHeight) {
    const landscape = fitWidth >= fitHeight;
    const isDesktop = landscape || fitWidth >= viewport.desktopBreakpoint;

    if (!isDesktop) {
        const minHeight = Math.max(viewport.height, viewport.minHeight);
        const maxHeight = Math.max(minHeight, viewport.maxHeight);
        const targetHeight = clamp(viewport.targetHeight, minHeight, maxHeight);
        let scale = fitWidth / viewport.width;
        let roomHeight = clamp(fitHeight / scale, minHeight, maxHeight);
        scale = Math.min(fitWidth / viewport.width, fitHeight / roomHeight);
        const profile = roomHeight < targetHeight - 120
            ? "portrait-compact"
            : roomHeight > targetHeight + 120
                ? "portrait-tall"
                : "portrait-standard";
        return {
            roomWidth: viewport.width,
            roomHeight,
            rawScale: scale,
            profile,
            orientation: "portrait"
        };
    }

    let scale = fitHeight / viewport.desktopHeight;
    const roomWidth = clamp(fitWidth / scale, viewport.desktopMinWidth, viewport.desktopMaxWidth);
    scale = Math.min(fitWidth / roomWidth, fitHeight / viewport.desktopHeight);
    return {
        roomWidth,
        roomHeight: viewport.desktopHeight,
        rawScale: scale,
        profile: "desktop",
        orientation: landscape ? "landscape" : "portrait-wide"
    };
}

/**
 * @param {number} screenWidth
 * @param {number} screenHeight
 * @param {Record<string, any> | NormalizedViewport} cfg
 * @param {Partial<ViewportInsets>} [safeInsets]
 * @returns {ViewportSnapshot}
 */
export function resolveViewport(screenWidth, screenHeight, cfg, safeInsets) {
    const viewport = /** @type {NormalizedViewport} */ (
        cfg && typeof cfg === "object" && cfg.mode && cfg.align && cfg.safeArea
            ? cfg
            : normalizeViewportConfig(/** @type {Record<string, any>} */ (cfg || {}))
    );
    const rawInsets = copyInsets(safeInsets);
    const insets = viewport.safeArea === "vertical"
        ? { top: rawInsets.top, right: 0, bottom: rawInsets.bottom, left: 0 }
        : rawInsets;
    const screenRect = makeRect(0, 0, Math.max(1, numberOr(screenWidth, 1)), Math.max(1, numberOr(screenHeight, 1)));
    const safeScreenRect = viewport.safeArea === "none" ? copyRect(screenRect) : insetRect(screenRect, insets);
    const useSafeFit = viewport.safeArea === "inset"
        || viewport.safeArea === "frame"
        || viewport.safeArea === "vertical"
        || viewport.fitArea === "safe";
    const fitRect = useSafeFit ? copyRect(safeScreenRect) : copyRect(screenRect);
    const orientationKey = screenRect.width >= screenRect.height ? "landscape" : "portrait";
    const align = viewport.align[orientationKey] || viewport.align.portrait;

    let roomWidth = viewport.width;
    let roomHeight = viewport.height;
    let rawScale = viewport.fit === "cover"
        ? Math.max(fitRect.width / roomWidth, fitRect.height / roomHeight)
        : Math.min(fitRect.width / roomWidth, fitRect.height / roomHeight);
    let profile = "fixed";
    let orientation = orientationKey;

    if (viewport.mode === "adaptive") {
        const adaptive = resolveAdaptiveRoom(viewport, fitRect.width, fitRect.height);
        roomWidth = adaptive.roomWidth;
        roomHeight = adaptive.roomHeight;
        rawScale = viewport.fit === "cover"
            ? Math.max(fitRect.width / roomWidth, fitRect.height / roomHeight)
            : adaptive.rawScale;
        profile = adaptive.profile;
        orientation = adaptive.orientation;
    }

    const scaled = quantizeScale(rawScale, viewport.scaleStep);
    const factor = alignFactor(align);
    const gameWidth = roomWidth * scaled.scale;
    const gameHeight = roomHeight * scaled.scale;
    const gameScreenRect = makeRect(
        fitRect.x + (fitRect.width - gameWidth) * factor.x,
        fitRect.y + (fitRect.height - gameHeight) * factor.y,
        gameWidth,
        gameHeight
    );

    return {
        mode: viewport.mode,
        fit: viewport.fit,
        scaleStep: viewport.scaleStep,
        fitArea: viewport.fitArea,
        safeArea: viewport.safeArea,
        logicalRect: makeRect(0, 0, roomWidth, roomHeight),
        screenRect,
        safeScreenRect,
        gameScreenRect,
        visibleRoomRect: visibleRoomRectFrom(screenRect, gameScreenRect, scaled.scale),
        frameRects: frameRectsFrom(screenRect, gameScreenRect),
        scale: scaled.scale,
        scaleMode: scaled.scaleMode,
        orientation,
        profile,
        safeInsets: insets
    };
}
