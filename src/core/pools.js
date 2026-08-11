// @ts-check

/**
 * @typedef {{
 *   items: any[],
 *   cursor: number,
 *   begin(): void,
 *   take(...args: any[]): any
 * }} RuntimeDrawPool
 */

import { countRuntimePerf } from "./perf-metrics.js";

function createDefaultTextStyle() {
    return {
        fontFamily: "sans-serif",
        fontSize: "24px",
        fontStyle: "",
        color: "#ffffff",
        resolution: 1,
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
 * Reset every mutable presentation field that a text draw can touch. Phaser
 * text objects are frame-borrowed, so visibility alone is not a safe reset.
 * @param {any} item
 */
export function resetRuntimeTextItem(item) {
    if (typeof item.setPosition === "function") item.setPosition(0, 0);
    if (typeof item.setOrigin === "function") item.setOrigin(0, 0);
    if (typeof item.setAlpha === "function") item.setAlpha(1);
    if (typeof item.setAngle === "function") item.setAngle(0);
    else if (typeof item.setRotation === "function") item.setRotation(0);
    if (typeof item.setScale === "function") item.setScale(1, 1);
    if (typeof item.setBlendMode === "function") item.setBlendMode(0);
    if (typeof item.clearMask === "function") item.clearMask(true);
    if (typeof item.setCrop === "function") {
        try { item.setCrop(); } catch { /* optional Phaser feature */ }
    }
    if (typeof item.setStyle === "function") item.setStyle(createDefaultTextStyle());
    item.__gmRuntimeStyleSignature = "";
}

/**
 * @param {any} scene
 * @param {any} parent
 * @param {any} [state]
 * @returns {RuntimeDrawPool}
 */
export function makeTextPool(scene, parent, state = null) {
    return {
        /** @type {any[]} */
        items: [],
        cursor: 0,

        begin() {
            this.cursor = 0;
            for (const item of this.items) item.setVisible(false);
        },

        take() {
            let item = this.items[this.cursor];
            if (!item) {
                item = scene.add.text(0, 0, "", {
                    fontFamily: "sans-serif",
                    fontSize: "24px",
                    color: "#ffffff"
                });
                parent.add(item);
                this.items.push(item);
                countRuntimePerf(state, "textObjectsAllocated");
            } else {
                countRuntimePerf(state, "textObjectsReused");
            }
            resetRuntimeTextItem(item);
            this.cursor += 1;
            item.setVisible(true);
            return item;
        }
    };
}

/**
 * @param {any} scene
 * @param {any} parent
 * @param {any} [state]
 * @returns {RuntimeDrawPool}
 */
export function makeSpritePool(scene, parent, state = null) {
    return {
        /** @type {any[]} */
        items: [],
        cursor: 0,

        begin() {
            this.cursor = 0;
            for (const item of this.items) item.setVisible(false);
        },

        /**
         * @param {string} key
         * @param {string | number | undefined | null} frame
         */
        take(key, frame) {
            const normalizedFrame = frame === undefined ? null : frame;
            let item = this.items[this.cursor];
            if (!item) {
                item = scene.add.sprite(0, 0, key, normalizedFrame);
                parent.add(item);
                this.items.push(item);
                item.__gmRuntimeTextureKey = key;
                item.__gmRuntimeFrame = normalizedFrame;
            } else if (item.__gmRuntimeTextureKey !== key || item.__gmRuntimeFrame !== normalizedFrame) {
                item.setTexture(key, normalizedFrame);
                item.__gmRuntimeTextureKey = key;
                item.__gmRuntimeFrame = normalizedFrame;
            }
            // Fully reset mutable Phaser sprite state for pool reuse safety.
            if (typeof item.setOrigin === "function") item.setOrigin(0.5, 0.5);
            if (typeof item.setFlip === "function") item.setFlip(false, false);
            else {
                if (typeof item.setFlipX === "function") item.setFlipX(false);
                if (typeof item.setFlipY === "function") item.setFlipY(false);
            }
            if (typeof item.clearTint === "function") item.clearTint();
            if (typeof item.setAlpha === "function") item.setAlpha(1);
            if (typeof item.setAngle === "function") item.setAngle(0);
            else if (typeof item.setRotation === "function") item.setRotation(0);
            if (typeof item.setScale === "function") item.setScale(1, 1);
            if (typeof item.setBlendMode === "function") item.setBlendMode(0);
            if (typeof item.clearMask === "function") item.clearMask(true);
            if (typeof item.setCrop === "function") {
                try { item.setCrop(); } catch { /* optional */ }
            }
            if (item.filters && typeof item.filters.clear === "function") {
                try { item.filters.clear(); } catch { /* optional */ }
            }
            this.cursor += 1;
            item.setVisible(true);
            countRuntimePerf(state, "sprites");
            return item;
        }
    };
}
