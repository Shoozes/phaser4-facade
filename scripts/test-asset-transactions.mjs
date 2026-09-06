#!/usr/bin/env node
import assert from "node:assert/strict";
import { addAtlasTexture, addCanvasTexture } from "../src/core/assets.js";

function createTextureManager({ failCanvas = false, failAtlas = false } = {}) {
    const list = Object.create(null);
    return {
        list,
        lastAllocated: null,
        exists(key) { return Object.prototype.hasOwnProperty.call(list, key); },
        get(key) { return list[key] || null; },
        removeKey(key) { delete list[key]; },
        addCanvas(key) {
            if (failCanvas) {
                this.lastAllocated = { key, partial: true, destroyed: false, destroy() { this.destroyed = true; } };
                list[key] = this.lastAllocated;
                return null;
            }
            if (this.exists(key)) return null;
            const texture = { key, kind: "canvas", destroyed: false, destroy() { this.destroyed = true; } };
            this.lastAllocated = texture;
            list[key] = texture;
            return texture;
        },
        addAtlasJSONHash(key) {
            if (failAtlas) {
                this.lastAllocated = { key, partial: true, destroyed: false, destroy() { this.destroyed = true; } };
                list[key] = this.lastAllocated;
                throw new Error("simulated atlas registration failure");
            }
            if (this.exists(key)) return null;
            const texture = { key, kind: "atlas", customData: {}, destroyed: false, destroy() { this.destroyed = true; } };
            this.lastAllocated = texture;
            list[key] = texture;
            return texture;
        }
    };
}

const canvas = { width: 4, height: 4 };
const frames = { hero: { frame: { x: 0, y: 0, w: 2, h: 2 } } };

const invalidCanvasTextures = createTextureManager();
const oldCanvas = { key: "hero", kind: "old-canvas", destroyed: false };
invalidCanvasTextures.list.hero = oldCanvas;
assert.throws(() => addCanvasTexture({ textures: invalidCanvasTextures }, "hero", { width: 0, height: 4 }, { replace: true }), /positive width and height/);
assert.equal(invalidCanvasTextures.list.hero, oldCanvas);

const failedCanvasTextures = createTextureManager({ failCanvas: true });
const oldFailedCanvas = { key: "hero", kind: "old-canvas", destroyed: false };
failedCanvasTextures.list.hero = oldFailedCanvas;
assert.throws(() => addCanvasTexture({ textures: failedCanvasTextures }, "hero", canvas, { replace: true }), /registration failed/);
assert.equal(failedCanvasTextures.list.hero, oldFailedCanvas);
assert.equal(failedCanvasTextures.lastAllocated.destroyed, true);

const successfulCanvasTextures = createTextureManager();
const oldSuccessfulCanvas = { key: "hero", kind: "old-canvas", destroyed: false, destroy() { this.destroyed = true; } };
successfulCanvasTextures.list.hero = oldSuccessfulCanvas;
const canvasResult = addCanvasTexture({ textures: successfulCanvasTextures }, "hero", canvas, { replace: true });
assert.equal(successfulCanvasTextures.list.hero, canvasResult.texture);
assert.equal(oldSuccessfulCanvas.destroyed, true);

const retiringFailureTextures = createTextureManager();
const retiringFailureOld = { key: "hero", destroyed: false, destroy() { this.destroyed = true; throw new Error("simulated retirement failure"); } };
retiringFailureTextures.list.hero = retiringFailureOld;
let retiringFailureNew;
const addCanvas = retiringFailureTextures.addCanvas;
retiringFailureTextures.addCanvas = (...args) => {
    retiringFailureNew = addCanvas.apply(retiringFailureTextures, args);
    return retiringFailureNew;
};
assert.throws(() => addCanvasTexture({ textures: retiringFailureTextures }, "hero", canvas, { replace: true }), /retirement failure/);
assert.equal(retiringFailureTextures.list.hero, retiringFailureNew);
assert.equal(retiringFailureOld.destroyed, true);

const outOfBoundsTextures = createTextureManager();
const oldAtlas = { key: "atlas", kind: "old-atlas", destroyed: false };
outOfBoundsTextures.list.atlas = oldAtlas;
assert.throws(() => addAtlasTexture({ textures: outOfBoundsTextures }, "atlas", canvas, { bad: { frame: { x: 3, y: 3, w: 2, h: 2 } } }, { replace: true }), /outside source bounds/);
assert.equal(outOfBoundsTextures.list.atlas, oldAtlas);

const failedAtlasTextures = createTextureManager({ failAtlas: true });
const oldFailedAtlas = { key: "atlas", kind: "old-atlas", destroyed: false };
failedAtlasTextures.list.atlas = oldFailedAtlas;
assert.throws(() => addAtlasTexture({ textures: failedAtlasTextures }, "atlas", canvas, frames, { replace: true }), /simulated atlas registration failure/);
assert.equal(failedAtlasTextures.list.atlas, oldFailedAtlas);

const successfulAtlasTextures = createTextureManager();
const oldSuccessfulAtlas = { key: "atlas", kind: "old-atlas", destroyed: false, destroy() { this.destroyed = true; } };
successfulAtlasTextures.list.atlas = oldSuccessfulAtlas;
const atlasResult = addAtlasTexture({ textures: successfulAtlasTextures }, "atlas", canvas, frames, { replace: true });
assert.equal(successfulAtlasTextures.list.atlas, atlasResult.texture);
assert.deepEqual(atlasResult.texture.customData.gmFrameMeta.hero, { width: 2, height: 2, sourceWidth: 2, sourceHeight: 2, pivot: null, meta: null });
assert.equal(oldSuccessfulAtlas.destroyed, true);

const aliasTextures = createTextureManager();
const aliasSource = { width: 4, height: 4 };
const aliasedAtlas = { key: "atlas", source: [{ image: aliasSource }], destroyed: false, destroy() { this.destroyed = true; } };
aliasTextures.list.atlas = aliasedAtlas;
assert.throws(() => addAtlasTexture({ textures: aliasTextures }, "atlas", aliasSource, frames, { replace: true }), /aliases existing texture/);
assert.equal(aliasTextures.list.atlas, aliasedAtlas);
assert.equal(aliasedAtlas.destroyed, false);

console.log("[ok] Asset replacement transaction tests passed.");
