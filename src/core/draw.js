// @ts-check

import { COLORS } from "./constants.js";
import { clamp, toColor, toCssColor } from "./math.js";
import { countRuntimePerf, countRuntimeTextLabel } from "./perf-metrics.js";

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
    state.draw.color = 0xffffff;
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
    state.draw.color = toColor(value);
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
    if (size !== undefined) state.draw.size = size;
    if (bold !== undefined) state.draw.bold = !!bold;
}

/**
 * @param {any} state
 * @param {string} value
 */
export function setRuntimeDrawHAlign(state, value) {
    state.draw.halign = value;
}

/**
 * @param {any} state
 * @param {string} value
 */
export function setRuntimeDrawVAlign(state, value) {
    state.draw.valign = value;
}

/**
 * @param {any} state
 * @param {any} gfx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {boolean=} outline
 */
export function drawRuntimeRectangle(state, gfx, x1, y1, x2, y2, outline) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    if (outline) {
        applyRuntimeStroke(state, gfx);
        gfx.strokeRect(x, y, w, h);
    } else {
        applyRuntimeFill(state, gfx);
        gfx.fillRect(x, y, w, h);
    }
}

/**
 * @param {any} state
 * @param {any} gfx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number=} radius
 * @param {boolean=} outline
 */
export function drawRuntimeRoundRect(state, gfx, x1, y1, x2, y2, radius, outline) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    const r = Math.max(0, radius || 0);

    if (outline) {
        applyRuntimeStroke(state, gfx);
        if (gfx.strokeRoundedRect) gfx.strokeRoundedRect(x, y, w, h, r);
        else gfx.strokeRect(x, y, w, h);
    } else {
        applyRuntimeFill(state, gfx);
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
 * @param {boolean=} outline
 */
export function drawRuntimeCircle(state, gfx, x, y, radius, outline) {
    if (outline) {
        applyRuntimeStroke(state, gfx);
        gfx.strokeCircle(x, y, radius);
    } else {
        applyRuntimeFill(state, gfx);
        gfx.fillCircle(x, y, radius);
    }
}

/**
 * @param {any} state
 * @param {any} gfx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
export function drawRuntimeLine(state, gfx, x1, y1, x2, y2) {
    applyRuntimeStroke(state, gfx);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    gfx.lineTo(x2, y2);
    gfx.strokePath();
}

/**
 * @param {any} state
 * @param {any} pool
 * @param {any} parent
 * @param {number} x
 * @param {number} y
 * @param {any} text
 */
export function drawRuntimeText(state, pool, parent, x, y, text) {
    const item = pool.take();
    const originX = state.draw.halign === "center" ? 0.5 : state.draw.halign === "right" ? 1 : 0;
    const originY = state.draw.valign === "middle" ? 0.5 : state.draw.valign === "bottom" ? 1 : 0;
    const label = String(text);
    const style = {
        fontFamily: state.draw.font,
        fontSize: state.draw.size + "px",
        fontStyle: state.draw.bold ? "bold" : "",
        color: toCssColor(state.draw.color),
        resolution: state.render?.resolution || 1
    };

    countRuntimePerf(state, "drawText");
    countRuntimeTextLabel(state, label);
    if (item.text !== label) {
        item.setText(label);
        countRuntimePerf(state, "textSetCalls");
    }
    item.setPosition(x, y);
    item.setOrigin(originX, originY);
    item.setAlpha(state.draw.alpha);
    if (item.__gmRuntimeStyleSignature !== JSON.stringify(style)) {
        item.setStyle(style);
        item.__gmRuntimeStyleSignature = JSON.stringify(style);
        countRuntimePerf(state, "textStyleSetCalls");
    }
    if (parent && typeof parent.bringToTop === "function") parent.bringToTop(item);

    return item;
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
    const item = pool.take(key, frame);
    item.setPosition(x, y);
    item.setScale(xscale === undefined ? 1 : xscale, yscale === undefined ? 1 : yscale);
    item.setRotation(rotation || 0);
    item.setAlpha(clampDrawAlpha(alpha === undefined ? state.draw.alpha : alpha, state.draw.alpha));
    item.setTint(toColor(color === undefined ? COLORS.c_white : color));
    return item;
}
