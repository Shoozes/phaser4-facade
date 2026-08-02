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
            this.cursor += 1;
            item.setVisible(true);
            countRuntimePerf(state, "sprites");
            return item;
        }
    };
}
