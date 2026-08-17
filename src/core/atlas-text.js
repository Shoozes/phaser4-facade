// @ts-check

import { toColor } from "./math.js";

/**
 * @typedef {{
 *   name?: string,
 *   atlasKey?: string,
 *   glyphs: Record<string, { name?: string, width?: number, height?: number, advance: number }>,
 *   metrics: { tracking?: number, lineHeight?: number, fallback?: string, fallbackFrame?: string }
 * }} AtlasFont
 */

/**
 * @param {unknown} font
 * @returns {AtlasFont}
 */
export function requireCompiledFont(font) {
    const candidate = /** @type {AtlasFont} */ (font);
    if (!candidate || typeof candidate !== "object" || !candidate.glyphs || !candidate.metrics) {
        throw new TypeError("GM.draw.atlasText requires a compiled font atlas.");
    }
    return candidate;
}

/**
 * @param {any} font
 * @param {unknown} character
 */
export function resolveGlyphFrame(font, character) {
    const raw = String(character ?? "");
    const name = raw === " " ? "space" : raw;
    if (font.glyphs[name]) return name;
    const fallback = font.metrics.fallbackFrame || font.metrics.fallback;
    if (fallback && font.glyphs[fallback]) return fallback;
    throw new Error(`GM.draw.atlasText missing glyph for "${raw}" and no fallback is registered.`);
}

/**
 * @param {any} font
 * @param {unknown} text
 * @param {{ scale?: number }} [options]
 */
export function measureAtlasText(font, text, options = {}) {
    const compiled = requireCompiledFont(font);
    const scale = options.scale === undefined ? 1 : Number(options.scale);
    if (!Number.isFinite(scale) || scale <= 0) {
        throw new TypeError("GM.draw.measureAtlasText scale must be a positive finite number.");
    }
    const characters = String(text ?? "");
    const tracking = Number(compiled.metrics.tracking) || 0;
    const lineHeight = Number(compiled.metrics.lineHeight) || 0;
    if (characters.length === 0) {
        return { width: 0, height: lineHeight * scale, characters: 0 };
    }
    let width = 0;
    for (let index = 0; index < characters.length; index += 1) {
        const frame = resolveGlyphFrame(compiled, characters[index]);
        const glyph = compiled.glyphs[frame];
        width += Number(glyph.advance) * scale;
        if (index < characters.length - 1) width += tracking * scale;
    }
    return { width, height: lineHeight * scale, characters: characters.length };
}

/**
 * @param {any} state
 * @param {any} pool
 * @param {string} atlasKey
 * @param {any} font
 * @param {unknown} text
 * @param {number} x
 * @param {number} y
 * @param {{ scale?: number, color?: unknown, alpha?: number, align?: "left" | "center" | "right" }} [options]
 */
export function drawAtlasText(state, pool, atlasKey, font, text, x, y, options = {}) {
    const compiled = requireCompiledFont(font);
    const scale = options.scale === undefined ? 1 : Number(options.scale);
    if (!Number.isFinite(scale) || scale <= 0) {
        throw new TypeError("GM.draw.atlasText scale must be a positive finite number.");
    }
    const originX = Number(x);
    const originY = Number(y);
    if (!Number.isFinite(originX) || !Number.isFinite(originY)) {
        throw new TypeError("GM.draw.atlasText x and y must be finite numbers.");
    }
    const measured = measureAtlasText(compiled, text, { scale });
    const align = options.align === "center" || options.align === "right" ? options.align : "left";
    let cursor = originX;
    if (align === "center") cursor -= measured.width / 2;
    if (align === "right") cursor -= measured.width;
    const characters = String(text ?? "");
    const tracking = Number(compiled.metrics.tracking) || 0;
    const tint = options.color === undefined ? undefined : toColor(options.color);
    const alpha = options.alpha === undefined ? undefined : Number(options.alpha);
    const items = [];
    for (let index = 0; index < characters.length; index += 1) {
        const frame = resolveGlyphFrame(compiled, characters[index]);
        const glyph = compiled.glyphs[frame];
        const item = pool.take(atlasKey, frame);
        const glyphWidth = Number(glyph.width || glyph.advance) * scale;
        const glyphHeight = Number(glyph.height || compiled.metrics.lineHeight) * scale;
        item.setPosition(cursor + glyphWidth / 2, originY + glyphHeight / 2);
        item.setScale(scale, scale);
        if (typeof item.setOrigin === "function") item.setOrigin(0.5, 0.5);
        if (tint !== undefined && typeof item.setTint === "function") item.setTint(tint);
        if (alpha !== undefined && Number.isFinite(alpha) && typeof item.setAlpha === "function") item.setAlpha(alpha);
        items.push(item);
        cursor += glyph.advance * scale;
        if (index < characters.length - 1) cursor += tracking * scale;
    }
    return { ...measured, items };
}

/**
 * @param {any} state
 * @param {any} pool
 * @param {string} atlasKey
 * @param {any} font
 * @param {unknown} text
 * @param {number} x
 * @param {number} y
 * @param {{ maxWidth: number, scale?: number, minScale?: number, color?: unknown, alpha?: number, align?: "left" | "center" | "right" }} options
 */
export function drawAtlasTextFit(state, pool, atlasKey, font, text, x, y, options) {
    if (!options || typeof options !== "object" || !Number.isFinite(Number(options.maxWidth)) || Number(options.maxWidth) <= 0) {
        throw new TypeError("GM.draw.atlasTextFit requires a positive maxWidth.");
    }
    const requested = options.scale === undefined ? 1 : Number(options.scale);
    const minScale = options.minScale === undefined ? 0.25 : Number(options.minScale);
    const natural = measureAtlasText(font, text, { scale: 1 });
    const fitted = Math.min(requested, Number(options.maxWidth) / Math.max(1, natural.width));
    const scale = Math.max(minScale, fitted);
    return drawAtlasText(state, pool, atlasKey, font, text, x, y, { ...options, scale });
}
