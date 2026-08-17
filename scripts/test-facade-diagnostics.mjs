#!/usr/bin/env node
import assert from "node:assert/strict";
import { inferPointerKind, pickPrimaryPointer } from "../src/core/input.js";
import { assertFinite, formatInvalidDraw } from "../src/core/debug.js";
import { drawRuntimeSpriteExt } from "../src/core/draw.js";
import { normalizeAtlasFrames } from "../src/core/assets.js";

assert.equal(inferPointerKind({ pointerType: "touch" }), "touch");
assert.equal(inferPointerKind({ type: "pen" }), "pen");
assert.equal(inferPointerKind({ wasTouch: true }), "touch");
assert.equal(inferPointerKind({}), "mouse");

const primary = pickPrimaryPointer([
    { id: "1", active: true, down: false },
    { id: "2", active: true, down: true },
    { id: "3", active: false, down: true }
]);
assert.equal(primary && primary.id, "2");

assert.throws(() => assertFinite("fruit", { x: 1, radius: Number.NaN }), /radius: NaN/);
assert.equal(assertFinite("fruit", { x: 1, radius: 4 }), true);

const message = formatInvalidDraw({
    texture: "fruit-shot-atlas",
    frame: "fruit-2",
    layer: "Balls",
    frameNumber: 418,
    values: { x: Number.NaN, y: 502, scaleX: 1, scaleY: 1, rotation: 0 }
});
assert.match(message, /Texture: fruit-shot-atlas/);
assert.match(message, /Frame: fruit-2/);
assert.match(message, /Layer: Balls/);
assert.match(message, /x: NaN/);

const state = {
    draw: { color: 0xffffff, alpha: 1, lineWidth: 1 },
    activeWorldLayer: "Balls",
    frameId: 418,
    cfg: { drawValidation: "report" },
    diagnostics: { invalidDraws: 0, lastInvalidDraw: null, nonFiniteSimulationValues: 0 },
    scene: { textures: { exists: () => true, get: () => ({ has: () => true }) } }
};
const skipped = drawRuntimeSpriteExt(state, { take() { throw new Error("should not draw"); } }, "fruit-shot-atlas", "fruit-2", Number.NaN, 502);
assert.equal(skipped, null);
assert.equal(state.diagnostics.invalidDraws, 1);
assert.equal(state.diagnostics.lastInvalidDraw.frame, "fruit-2");

const frames = normalizeAtlasFrames([
    { name: "fruit-2", x: 0, y: 0, w: 88, h: 88, meta: { tier: 2, collision: { shape: "circle", radius: 44 } } }
]);
assert.equal(frames["fruit-2"].frame.w, 88);
assert.equal(frames["fruit-2"].meta.tier, 2);
assert.equal(frames["fruit-2"].meta.collision.radius, 44);

console.log("[ok] facade diagnostics, primary-pointer selection, and frame metadata contracts passed.");
