#!/usr/bin/env node
import assert from "node:assert/strict";
import { drawAtlasText, measureAtlasText } from "../src/core/atlas-text.js";

const font = {
    glyphs: {
        S: { name: "S", width: 12, height: 20, advance: 12 },
        "0": { name: "0", width: 12, height: 20, advance: 12 },
        "6": { name: "6", width: 12, height: 20, advance: 12 },
        "7": { name: "7", width: 12, height: 20, advance: 12 },
        "8": { name: "8", width: 12, height: 20, advance: 12 },
        "9": { name: "9", width: 12, height: 20, advance: 12 },
        C: { name: "C", width: 12, height: 20, advance: 12 },
        O: { name: "O", width: 12, height: 20, advance: 12 },
        R: { name: "R", width: 12, height: 20, advance: 12 },
        E: { name: "E", width: 12, height: 20, advance: 12 },
        space: { name: "space", width: 8, height: 20, advance: 8 }
    },
    metrics: { tracking: 4, lineHeight: 24, fallbackFrame: "E" }
};

const measured = measureAtlasText(font, "SCORE 006078");
assert.equal(measured.characters, 12);
assert.equal(measured.height, 24);
assert.ok(measured.width > 0);

const textureChanges = [];
const pool = {
    take(key, frame) {
        const last = this.items[this.items.length] ? null : null;
        const item = {
            key,
            frame,
            setPosition() {},
            setScale() {},
            setOrigin() {},
            setTint() {},
            setAlpha() {},
            setTexture(nextKey, nextFrame) {
                textureChanges.push(`${nextKey}:${nextFrame}`);
                this.key = nextKey;
                this.frame = nextFrame;
            }
        };
        this.items.push(item);
        return item;
    },
    items: []
};

const first = drawAtlasText({}, pool, "pixel-3x5", font, "SCORE 006078", 20, 52);
assert.equal(first.items.length, 12);
assert.equal(pool.items[0].frame, "S");

pool.items = first.items.map((item) => {
    item.__gmRuntimeTextureKey = item.key;
    item.__gmRuntimeFrame = item.frame;
    return item;
});
const reusePool = {
    items: pool.items.slice(),
    cursor: 0,
    take(key, frame) {
        const item = this.items[this.cursor];
        this.cursor += 1;
        if (item.__gmRuntimeTextureKey !== key || item.__gmRuntimeFrame !== frame) {
            item.setTexture(key, frame);
            item.__gmRuntimeTextureKey = key;
            item.__gmRuntimeFrame = frame;
        }
        return item;
    }
};
drawAtlasText({}, reusePool, "pixel-3x5", font, "SCORE 006079", 20, 52);
assert.deepEqual(textureChanges, ["pixel-3x5:9"], "only the changed digit should retarget its glyph frame");

console.log("[ok] atlas text measures runs and reuses unchanged glyph frames.");
