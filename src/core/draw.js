// @ts-check

import { COLORS } from "./constants.js";
import { clamp, toColor, toCssColor } from "./math.js";
import { countRuntimePerf, countRuntimeTextLabel } from "./perf-metrics.js";
import { collectNonFiniteValues, formatInvalidDraw } from "./debug.js";

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
export function resetRuntimeDrawState(state) {
    state.draw.color = COLORS.c_white;
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
export function applyRuntimeFill(state, gfx) {
    gfx.fillStyle(toColor(state.draw.color), state.draw.alpha);
}

/**
 * @param {any} state
 * @param {any} gfx
 */
export function applyRuntimeStroke(state, gfx) {
    gfx.lineStyle(state.draw.lineWidth, toColor(state.draw.color), state.draw.alpha);
}

/**
 * @param {any} state
 * @param {any} cfg
 * @param {any} gfx
 * @param {number} roomWidth
 * @param {number} roomHeight
 */
export function drawRuntimeStage(state, cfg, gfx, roomWidth, roomHeight) {
    gfx.fillStyle(toColor(cfg.bleedColor), 1);
    gfx.fillRect(-cfg.bleed, -cfg.bleed, roomWidth + cfg.bleed * 2, roomHeight + cfg.bleed * 2);
    gfx.fillStyle(toColor(cfg.safeColor), 1);
    gfx.fillRect(0, 0, roomWidth, roomHeight);
}

/**
 * @param {any} state
 * @param {any} value
 */
export function setRuntimeDrawColor(state, value) {
    const parsed = toColor(value, Number.NaN);
    state.draw.color = Number.isFinite(parsed) ? value : COLORS.c_white;
}

/**
 * @param {any} state
 * @param {any} value
 */
export function setRuntimeDrawAlpha(state, value) {
    state.draw.alpha = clampDrawAlpha(value, state.draw.alpha);
}

/**
 * @param {any} state
 * @param {any} value
 */
export function setRuntimeDrawLineWidth(state, value) {
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
export function setRuntimeDrawFont(state, font, size, bold) {
    if (font !== undefined) state.draw.font = font;
    if (size !== undefined) state.draw.size = positiveDrawValue(size, state.draw.size, "draw font size");
    if (bold !== undefined) state.draw.bold = !!bold;
}

/**
 * @param {any} state
 * @param {string} value
 */
export function setRuntimeDrawHAlign(state, value) {
    state.draw.halign = normalizeAlignment(value, H_ALIGNMENTS, "left");
}

/**
 * @param {any} state
 * @param {string} value
 */
export function setRuntimeDrawVAlign(state, value) {
    state.draw.valign = normalizeAlignment(value, V_ALIGNMENTS, "top");
}

/**
 * @typedef {object} RuntimePrimitiveDrawOptions
 * @property {unknown=} color
 * @property {number=} alpha
 * @property {boolean=} outline
 * @property {number=} lineWidth
 * @property {boolean=} closed
 */

/**
 * Resolve per-call primitive presentation without changing the persistent
 * draw state. Legacy boolean outline arguments remain supported.
 * @param {any} state
 * @param {boolean | RuntimePrimitiveDrawOptions | undefined} candidate
 * @param {boolean} fallbackOutline
 */
function normalizePrimitiveOptions(state, candidate, fallbackOutline = false) {
    const options = candidate && typeof candidate === "object" ? candidate : {};
    const outline = typeof candidate === "boolean"
        ? candidate
        : options.outline === undefined ? fallbackOutline : !!options.outline;
    const lineWidth = positiveDrawValue(
        options.lineWidth === undefined ? state.draw.lineWidth : options.lineWidth,
        1,
        "draw lineWidth"
    );
    return {
        color: options.color === undefined ? state.draw.color : options.color,
        alpha: clampDrawAlpha(options.alpha === undefined ? state.draw.alpha : options.alpha, 1),
        outline,
        lineWidth,
        closed: options.closed === true
    };
}

/**
 * @param {unknown} value
 * @param {string} label
 */
function requiredPrimitiveValue(value, label) {
    return finiteDrawValue(value, 0, label, true);
}

/**
 * @param {any} gfx
 * @param {RuntimePrimitiveDrawOptions & { color: unknown, alpha: number, lineWidth: number }} options
 */
function applyPrimitiveStyle(gfx, options) {
    if (options.outline) gfx.lineStyle(options.lineWidth, toColor(options.color), options.alpha);
    else gfx.fillStyle(toColor(options.color), options.alpha);
}

/**
 * @param {any} state
 * @param {any} gfx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {boolean | RuntimePrimitiveDrawOptions=} outline
 */
export function drawRuntimeRectangle(state, gfx, x1, y1, x2, y2, outline) {
    const options = normalizePrimitiveOptions(state, outline);
    const firstX = requiredPrimitiveValue(x1, "draw rectangle x1");
    const firstY = requiredPrimitiveValue(y1, "draw rectangle y1");
    const secondX = requiredPrimitiveValue(x2, "draw rectangle x2");
    const secondY = requiredPrimitiveValue(y2, "draw rectangle y2");
    const x = Math.min(firstX, secondX);
    const y = Math.min(firstY, secondY);
    const w = Math.abs(secondX - firstX);
    const h = Math.abs(secondY - firstY);

    applyPrimitiveStyle(gfx, options);
    if (options.outline) {
        gfx.strokeRect(x, y, w, h);
    }
    else gfx.fillRect(x, y, w, h);
}

/**
 * @param {any} state
 * @param {any} gfx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number | (RuntimePrimitiveDrawOptions & { radius?: number })=} radius
 * @param {boolean | RuntimePrimitiveDrawOptions=} outline
 */
export function drawRuntimeRoundRect(state, gfx, x1, y1, x2, y2, radius, outline) {
    const radiusOptions = radius && typeof radius === "object" ? radius : null;
    const optionCandidate = radiusOptions
        ? {
            ...radiusOptions,
            ...(outline && typeof outline === "object" ? outline : {}),
            ...(typeof outline === "boolean" ? { outline } : {})
        }
        : outline;
    const options = normalizePrimitiveOptions(state, optionCandidate);
    const firstX = requiredPrimitiveValue(x1, "draw roundRect x1");
    const firstY = requiredPrimitiveValue(y1, "draw roundRect y1");
    const secondX = requiredPrimitiveValue(x2, "draw roundRect x2");
    const secondY = requiredPrimitiveValue(y2, "draw roundRect y2");
    const x = Math.min(firstX, secondX);
    const y = Math.min(firstY, secondY);
    const w = Math.abs(secondX - firstX);
    const h = Math.abs(secondY - firstY);
    const requestedRadius = radiusOptions?.radius === undefined ? radius : radiusOptions.radius;
    const r = Math.max(0, finiteDrawValue(requestedRadius, 0, "draw roundRect radius"));

    applyPrimitiveStyle(gfx, options);
    if (options.outline) {
        if (gfx.strokeRoundedRect) gfx.strokeRoundedRect(x, y, w, h, r);
        else gfx.strokeRect(x, y, w, h);
    }
    else {
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
 * @param {boolean | RuntimePrimitiveDrawOptions=} outline
 */
export function drawRuntimeCircle(state, gfx, x, y, radius, outline) {
    const options = normalizePrimitiveOptions(state, outline);
    const centerX = requiredPrimitiveValue(x, "draw circle x");
    const centerY = requiredPrimitiveValue(y, "draw circle y");
    const circleRadius = finiteDrawValue(radius, 0, "draw circle radius", true);
    if (circleRadius < 0) throw new RangeError("draw circle radius must be non-negative.");
    applyPrimitiveStyle(gfx, options);
    if (options.outline) {
        gfx.strokeCircle(centerX, centerY, circleRadius);
    }
    else gfx.fillCircle(centerX, centerY, circleRadius);
}

/**
 * @param {any} state
 * @param {any} gfx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {RuntimePrimitiveDrawOptions=} options
 */
export function drawRuntimeLine(state, gfx, x1, y1, x2, y2, options) {
    const style = normalizePrimitiveOptions(state, {
        ...(options || {}),
        outline: true
    }, true);
    const firstX = requiredPrimitiveValue(x1, "draw line x1");
    const firstY = requiredPrimitiveValue(y1, "draw line y1");
    const secondX = requiredPrimitiveValue(x2, "draw line x2");
    const secondY = requiredPrimitiveValue(y2, "draw line y2");
    applyPrimitiveStyle(gfx, style);
    gfx.beginPath();
    gfx.moveTo(firstX, firstY);
    gfx.lineTo(secondX, secondY);
    gfx.strokePath();
}

/**
 * Draw a connected line through object points or a flat [x, y, ...] array.
 * @param {any} state
 * @param {any} gfx
 * @param {Array<{x: number, y: number} | [number, number] | number>} points
 * @param {RuntimePrimitiveDrawOptions=} options
 */
export function drawRuntimePolyline(state, gfx, points, options = {}) {
    if (!Array.isArray(points)) throw new TypeError("draw polyline points must be an array.");
    const coordinates = [];
    if (points.length > 0 && typeof points[0] === "number") {
        if (points.length < 4 || points.length % 2 !== 0) {
            throw new TypeError("draw polyline flat points require at least two x/y pairs.");
        }
        for (const value of points) coordinates.push(requiredPrimitiveValue(value, "draw polyline coordinate"));
    } else {
        if (points.length < 2) throw new TypeError("draw polyline requires at least two points.");
        for (const point of points) {
            const x = Array.isArray(point) ? point[0] : point && typeof point === "object" ? point.x : undefined;
            const y = Array.isArray(point) ? point[1] : point && typeof point === "object" ? point.y : undefined;
            coordinates.push(requiredPrimitiveValue(x, "draw polyline point x"));
            coordinates.push(requiredPrimitiveValue(y, "draw polyline point y"));
        }
    }
    const style = normalizePrimitiveOptions(state, {
        ...options,
        outline: true
    }, true);
    applyPrimitiveStyle(gfx, style);
    gfx.beginPath();
    gfx.moveTo(coordinates[0], coordinates[1]);
    for (let index = 2; index < coordinates.length; index += 2) {
        gfx.lineTo(coordinates[index], coordinates[index + 1]);
    }
    if (style.closed) gfx.lineTo(coordinates[0], coordinates[1]);
    gfx.strokePath();
}

const H_ALIGNMENTS = new Set(["left", "center", "right"]);
const V_ALIGNMENTS = new Set(["top", "middle", "bottom"]);

/**
 * @typedef {object} RuntimeTextOptions
 * @property {string=} font
 * @property {number=} size
 * @property {boolean=} bold
 * @property {unknown=} color
 * @property {number=} alpha
 * @property {"left"|"center"|"right"=} hAlign
 * @property {"top"|"middle"|"bottom"=} vAlign
 * @property {number=} rotation
 * @property {number=} scale
 * @property {number=} scaleX
 * @property {number=} scaleY
 * @property {number=} originX
 * @property {number=} originY
 * @property {number=} maxWidth
 * @property {number=} maxHeight
 * @property {number=} minSize
 */

/**
 * @typedef {object} RuntimeTextPresentation
 * @property {string} font
 * @property {number} size
 * @property {boolean} bold
 * @property {unknown} color
 * @property {number} alpha
 * @property {string} hAlign
 * @property {string} vAlign
 * @property {number} rotation
 * @property {number} scaleX
 * @property {number} scaleY
 * @property {number} originX
 * @property {number} originY
 * @property {number} resolution
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {object} RuntimeSpriteOptions
 * @property {number=} scale
 * @property {number=} scaleX
 * @property {number=} scaleY
 * @property {number=} width
 * @property {number=} height
 * @property {number=} rotation
 * @property {unknown=} color
 * @property {number=} alpha
 * @property {number=} originX
 * @property {number=} originY
 * @property {boolean=} flipX
 * @property {boolean=} flipY
 */

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {string} label
 * @param {boolean=} required
 */
function finiteDrawValue(value, fallback, label, required = false) {
    if (value === undefined || value === null) {
        if (required) throw new TypeError(`${label} must be a finite number.`);
        return fallback;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new TypeError(`${label} must be a finite number.`);
    return numeric;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {string} label
 */
function positiveDrawValue(value, fallback, label) {
    const numeric = finiteDrawValue(value, fallback, label);
    if (!(numeric > 0)) throw new RangeError(`${label} must be greater than zero.`);
    return numeric;
}

/**
 * @param {unknown} value
 * @param {Set<string>} allowed
 * @param {string} fallback
 */
function normalizeAlignment(value, allowed, fallback) {
    const normalized = String(value ?? fallback).toLowerCase();
    return allowed.has(normalized) ? normalized : fallback;
}

/**
 * @param {any} state
 * @param {RuntimeTextOptions=} options
 * @returns {RuntimeTextPresentation}
 */
function normalizeTextPresentation(state, options = {}) {
    const draw = state.draw || {};
    const hAlign = normalizeAlignment(options.hAlign === undefined ? draw.halign : options.hAlign, H_ALIGNMENTS, "left");
    const vAlign = normalizeAlignment(options.vAlign === undefined ? draw.valign : options.vAlign, V_ALIGNMENTS, "top");
    const size = positiveDrawValue(options.size === undefined ? draw.size : options.size, 24, "text size");
    const scale = finiteDrawValue(options.scale, 1, "text scale");
    const scaleX = finiteDrawValue(options.scaleX, scale, "text scaleX");
    const scaleY = finiteDrawValue(options.scaleY, scale, "text scaleY");
    const rotation = finiteDrawValue(options.rotation, 0, "text rotation");
    const originX = options.originX === undefined
        ? (hAlign === "center" ? 0.5 : hAlign === "right" ? 1 : 0)
        : finiteDrawValue(options.originX, 0, "text originX");
    const originY = options.originY === undefined
        ? (vAlign === "middle" ? 0.5 : vAlign === "bottom" ? 1 : 0)
        : finiteDrawValue(options.originY, 0, "text originY");
    return {
        font: options.font === undefined ? String(draw.font || "sans-serif") : String(options.font),
        size,
        bold: options.bold === undefined ? !!draw.bold : !!options.bold,
        color: options.color === undefined ? draw.color : options.color,
        alpha: clampDrawAlpha(options.alpha === undefined ? draw.alpha : options.alpha, 1),
        hAlign,
        vAlign,
        rotation,
        scaleX,
        scaleY,
        originX,
        originY,
        resolution: positiveDrawValue(state.render?.resolution, 1, "text resolution"),
        x: 0,
        y: 0
    };
}

/** @param {RuntimeTextPresentation} presentation */
function textStyleFor(presentation) {
    return {
        fontFamily: presentation.font,
        fontSize: `${presentation.size}px`,
        fontStyle: presentation.bold ? "bold" : "",
        color: toCssColor(presentation.color),
        resolution: presentation.resolution,
        stroke: "transparent",
        strokeThickness: 0,
        shadow: {
            offsetX: 0,
            offsetY: 0,
            color: "#000000",
            blur: 0,
            stroke: false,
            fill: false
        },
        wordWrap: { width: 0, useAdvancedWrap: false },
        fixedWidth: 0,
        fixedHeight: 0,
        lineSpacing: 0,
        padding: 0
    };
}

/**
 * @param {any} state
 * @param {any} item
 * @param {string} label
 * @param {RuntimeTextPresentation} presentation
 * @param {any} parent
 * @param {boolean} [forceStyle]
 */
function applyTextPresentation(state, item, label, presentation, parent, forceStyle = false) {
    const style = textStyleFor(presentation);
    const styleSignature = JSON.stringify(style);
    countRuntimePerf(state, "drawText");
    countRuntimeTextLabel(state, label);
    if (item.text !== label) {
        item.setText(label);
        countRuntimePerf(state, "textSetCalls");
    }
    if (forceStyle || item.__gmRuntimeStyleSignature !== styleSignature) {
        item.setStyle(style);
        item.__gmRuntimeStyleSignature = styleSignature;
        countRuntimePerf(state, "textStyleSetCalls");
    }
    item.setPosition(presentation.x, presentation.y);
    item.setOrigin(presentation.originX, presentation.originY);
    item.setAlpha(presentation.alpha);
    if (typeof item.setAngle === "function") item.setAngle(presentation.rotation === 0 ? 0 : -presentation.rotation);
    else if (typeof item.setRotation === "function") item.setRotation(-presentation.rotation * Math.PI / 180);
    item.setScale(presentation.scaleX, presentation.scaleY);
    if (parent && typeof parent.bringToTop === "function") parent.bringToTop(item);
    return item;
}

/**
 * @param {any} item
 * @param {RuntimeTextPresentation} presentation
 */
function measuredTextBounds(item, presentation) {
    const width = Math.abs(Number(item.width)) * Math.abs(presentation.scaleX);
    const height = Math.abs(Number(item.height)) * Math.abs(presentation.scaleY);
    return {
        width: Number.isFinite(width) ? width : Number.POSITIVE_INFINITY,
        height: Number.isFinite(height) ? height : Number.POSITIVE_INFINITY
    };
}

/**
 * @param {any} item
 * @param {string} label
 * @param {RuntimeTextPresentation} presentation
 * @param {RuntimeTextOptions} options
 */
function resolveFitSize(item, label, presentation, options) {
    const maxWidth = positiveDrawValue(options.maxWidth, 0, "text maxWidth");
    const maxHeight = options.maxHeight === undefined ? null : positiveDrawValue(options.maxHeight, 0, "text maxHeight");
    const requestedMinSize = positiveDrawValue(options.minSize, Math.max(1, Math.min(presentation.size, 8)), "text minSize");
    const preferredSize = presentation.size;
    const minSize = Math.min(requestedMinSize, preferredSize);
    const signature = JSON.stringify([
        label,
        maxWidth,
        maxHeight,
        minSize,
        preferredSize,
        presentation.font,
        presentation.bold,
        presentation.color,
        presentation.scaleX,
        presentation.scaleY,
        presentation.resolution
    ]);
    if (item.__gmRuntimeFitSignature === signature && Number.isFinite(item.__gmRuntimeFitSize)) {
        return { size: item.__gmRuntimeFitSize, measured: false };
    }

    const fits = /** @param {number} size */ (size) => {
        const candidate = { ...presentation, size };
        item.setText(label);
        item.setStyle(textStyleFor(candidate));
        const bounds = measuredTextBounds(item, candidate);
        return bounds.width <= maxWidth && (maxHeight === null || bounds.height <= maxHeight);
    };

    let result = preferredSize;
    if (!fits(preferredSize)) {
        if (fits(minSize)) {
            let low = minSize;
            let high = preferredSize;
            for (let iteration = 0; iteration < 12; iteration += 1) {
                const middle = (low + high) / 2;
                if (fits(middle)) low = middle;
                else high = middle;
            }
            result = low;
        } else {
            result = minSize;
        }
    }
    item.__gmRuntimeFitSignature = signature;
    item.__gmRuntimeFitSize = result;
    return { size: result, measured: true };
}

/**
 * Shared world/GUI text path for simple, extended, and fitted text.
 * @param {any} state
 * @param {any} pool
 * @param {any} parent
 * @param {number} x
 * @param {number} y
 * @param {any} text
 * @param {RuntimeTextOptions=} options
 * @param {boolean=} fit
 */
export function drawRuntimeTextWithOptions(state, pool, parent, x, y, text, options = {}, fit = false) {
    const presentation = normalizeTextPresentation(state, options);
    presentation.x = finiteDrawValue(x, 0, "text x", true);
    presentation.y = finiteDrawValue(y, 0, "text y", true);
    const label = String(text);
    const item = pool.take();
    let forceStyle = false;
    if (fit) {
        const fitResult = resolveFitSize(item, label, presentation, options);
        presentation.size = fitResult.size;
        forceStyle = fitResult.measured;
        countRuntimePerf(state, "fittedText");
    }
    return applyTextPresentation(state, item, label, presentation, parent, forceStyle);
}

/** @param {any} state @param {any} pool @param {any} parent @param {number} x @param {number} y @param {any} text */
export function drawRuntimeText(state, pool, parent, x, y, text) {
    return drawRuntimeTextWithOptions(state, pool, parent, x, y, text);
}

/** @param {any} state @param {any} pool @param {any} parent @param {number} x @param {number} y @param {any} text @param {RuntimeTextOptions=} options */
export function drawRuntimeTextExt(state, pool, parent, x, y, text, options) {
    return drawRuntimeTextWithOptions(state, pool, parent, x, y, text, options || {});
}

/** @param {any} state @param {any} pool @param {any} parent @param {number} x @param {number} y @param {any} text @param {RuntimeTextOptions} options */
export function drawRuntimeTextFit(state, pool, parent, x, y, text, options) {
    if (!options || typeof options !== "object") throw new TypeError("textFit options are required.");
    return drawRuntimeTextWithOptions(state, pool, parent, x, y, text, options, true);
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {string} label
 */
function finiteOr(value, fallback, label) {
    if (value === undefined || value === null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        throw new TypeError(`draw_sprite_ext ${label} must be a finite number.`);
    }
    return numeric;
}

/**
 * @param {any} state
 * @param {unknown} key
 * @param {unknown} frame
 * @param {Record<string, unknown>} values
 */
function rejectInvalidSpriteTransform(state, key, frame, values) {
    const invalid = collectNonFiniteValues(values);
    if (Object.keys(invalid).length === 0) return false;
    const report = {
        texture: key,
        frame,
        layer: state.activeWorldLayer || "world",
        frameNumber: state.frameId,
        values
    };
    if (!state.diagnostics) {
        state.diagnostics = { invalidDraws: 0, lastInvalidDraw: null, nonFiniteSimulationValues: 0 };
    }
    state.diagnostics.invalidDraws += 1;
    state.diagnostics.lastInvalidDraw = report;
    const error = new TypeError(formatInvalidDraw(report));
    const mode = state.cfg && state.cfg.drawValidation === "report" ? "report" : "strict";
    if (mode === "report") {
        if (state.cfg && typeof state.cfg.onError === "function") {
            try {
                state.cfg.onError(error, { phase: "draw", frame: state.frameId });
            } catch {
                /* keep the frame alive */
            }
        }
        return true;
    }
    throw error;
}

/**
 * Phaser tint is a 24-bit RGB integer after BGR conversion at the color boundary.
 * @param {unknown} color
 */
function clampTintColor(color) {
    const converted = toColor(color === undefined ? COLORS.c_white : color);
    if (!Number.isFinite(converted)) return 0xffffff;
    return converted >>> 0 & 0xffffff;
}

/**
 * @param {any} state
 * @param {string} key
 * @param {any} frame
 */
function assertSpriteSource(state, key, frame) {
    const textures = state.scene?.textures;
    if (!textures || typeof textures.exists !== "function") return;
    if (!textures.exists(key)) {
        throw new Error(`[phaser4-facade] draw_sprite_ext texture not found: ${String(key)}`);
    }
    if (frame === undefined || frame === null || typeof textures.get !== "function") return;
    const texture = textures.get(key);
    if (texture && typeof texture.has === "function" && !texture.has(frame)) {
        throw new Error(`[phaser4-facade] draw_sprite_ext frame not found: ${String(key)}:${String(frame)}`);
    }
}

/**
 * Read the logical source dimensions Phaser keeps for a frame. `sourceSize`
 * is intentionally preferred so trimmed atlas frames retain their original
 * display aspect ratio.
 * @param {any} state
 * @param {any} item
 * @param {string} key
 * @param {any} frame
 * @returns {{ width: number, height: number }}
 */
function resolveSpriteSourceSize(state, item, key, frame) {
    /** @type {any[]} */
    const candidates = [item?.frame];
    const textures = state.scene?.textures;
    const texture = textures && typeof textures.get === "function" ? textures.get(key) : null;
    if (texture && typeof texture.get === "function") {
        try { candidates.push(texture.get(frame === undefined || frame === null ? "__BASE" : frame)); } catch { /* optional lookup */ }
    }
    if (texture?.source?.[0]) candidates.push(texture.source[0].image || texture.source[0].source);

    /** @param {any} candidate @param {"width"|"height"} dimension */
    const readDimension = (candidate, dimension) => {
        if (!candidate || typeof candidate !== "object") return 0;
        const sourceSize = candidate.sourceSize;
        const sourceValue = sourceSize?.[dimension === "width" ? "w" : "h"] ?? sourceSize?.[dimension];
        const values = [sourceValue, candidate[dimension], candidate[dimension === "width" ? "realWidth" : "realHeight"], candidate[dimension === "width" ? "cutWidth" : "cutHeight"]];
        for (const value of values) {
            const numeric = Number(value);
            if (Number.isFinite(numeric) && numeric > 0) return numeric;
        }
        return 0;
    };

    let width = 0;
    let height = 0;
    for (const candidate of candidates) {
        if (!width) width = readDimension(candidate, "width");
        if (!height) height = readDimension(candidate, "height");
        if (width > 0 && height > 0) return { width, height };
    }
    throw new Error(`draw_sprite_ext display sizing could not resolve source dimensions for ${String(key)}:${String(frame)}`);
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
export function drawRuntimeSpriteExt(state, pool, key, frame, x, y, xscale, yscale, rotation, color, alpha) {
    /** @type {RuntimeSpriteOptions | null} */
    const options = xscale && typeof xscale === "object"
        ? /** @type {RuntimeSpriteOptions} */ (xscale)
        : null;
    const requestedRotation = options ? options.rotation : rotation;
    const preview = {
        x: x === undefined || x === null ? 0 : Number(x),
        y: y === undefined || y === null ? 0 : Number(y),
        scaleX: Number(options ? (options.scaleX ?? options.scale ?? 1) : (xscale === undefined || typeof xscale === "object" ? 1 : xscale)),
        scaleY: Number(options ? (options.scaleY ?? options.scale ?? 1) : (yscale === undefined ? 1 : yscale)),
        rotation: requestedRotation === undefined || requestedRotation === null ? 0 : Number(requestedRotation)
    };
    if (rejectInvalidSpriteTransform(state, key, frame, preview)) return null;
    const posX = finiteOr(x, 0, "x");
    const posY = finiteOr(y, 0, "y");
    assertSpriteSource(state, key, frame);
    const hasWidth = options?.width !== undefined;
    const hasHeight = options?.height !== undefined;
    const hasDisplaySize = hasWidth || hasHeight;
    const hasExplicitScale = options && (options.scale !== undefined || options.scaleX !== undefined || options.scaleY !== undefined);
    if (hasDisplaySize && hasExplicitScale) {
        throw new TypeError("draw_sprite_ext display width/height cannot be combined with scale, scaleX, or scaleY.");
    }
    let scaleX;
    let scaleY;
    if (hasDisplaySize) {
        scaleX = 1;
        scaleY = 1;
    } else {
        const baseScale = finiteOr(options?.scale, 1, "scale");
        scaleX = finiteOr(options ? options.scaleX : xscale, baseScale, "xscale");
        scaleY = finiteOr(options ? options.scaleY : yscale, baseScale, "yscale");
    }
    const requestedColor = options ? options.color : color;
    const requestedAlpha = options ? options.alpha : alpha;
    const item = pool.take(key, frame);
    if (hasDisplaySize) {
        const sourceSize = resolveSpriteSourceSize(state, item, key, frame);
        const width = hasWidth ? positiveDrawValue(options.width, 0, "draw_sprite_ext width") : sourceSize.width * (hasHeight ? positiveDrawValue(options.height, 0, "draw_sprite_ext height") / sourceSize.height : 1);
        const height = hasHeight ? positiveDrawValue(options.height, 0, "draw_sprite_ext height") : sourceSize.height * (hasWidth ? positiveDrawValue(options.width, 0, "draw_sprite_ext width") / sourceSize.width : 1);
        scaleX = width / sourceSize.width;
        scaleY = height / sourceSize.height;
    }
    item.setPosition(posX, posY);
    if (options?.originX !== undefined || options?.originY !== undefined) {
        item.setOrigin(
            finiteOr(options.originX, 0.5, "originX"),
            finiteOr(options.originY, 0.5, "originY")
        );
    }
    if (options && typeof item.setFlip === "function") item.setFlip(!!options.flipX, !!options.flipY);
    item.setScale(scaleX, scaleY);
    // GameMaker degrees: positive rotation is counter-clockwise; Phaser angles are clockwise.
    const numericRotation = finiteOr(requestedRotation, 0, "rotation");
    const degrees = ((numericRotation % 360) + 360) % 360;
    if (typeof item.setAngle === "function") item.setAngle(degrees === 0 ? 0 : -degrees);
    else if (typeof item.setRotation === "function") item.setRotation(-degrees * Math.PI / 180);
    item.setAlpha(clampDrawAlpha(requestedAlpha === undefined ? state.draw.alpha : requestedAlpha, state.draw.alpha));
    item.setTint(clampTintColor(requestedColor));
    return item;
}
