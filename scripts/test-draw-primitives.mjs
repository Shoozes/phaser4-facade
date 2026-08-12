#!/usr/bin/env node
import assert from "node:assert/strict";
import {
    drawRuntimeCircle,
    drawRuntimeLine,
    drawRuntimePolyline,
    drawRuntimeRectangle,
    drawRuntimeRoundRect,
    drawRuntimeSpriteExt
} from "../src/core/draw.js";
import { dampFactor, distanceSq, normalize2 } from "../src/core/math.js";

const state = {
    draw: { color: 0xff00, alpha: 0.75, lineWidth: 2 },
    scene: {
        textures: {
            exists: () => true,
            get: () => ({ has: () => true, get: () => ({ sourceSize: { w: 20, h: 10 }, width: 12, height: 8 }) })
        }
    }
};

function createGfx() {
    return {
        calls: [],
        fillStyle(...args) { this.calls.push(["fillStyle", ...args]); },
        lineStyle(...args) { this.calls.push(["lineStyle", ...args]); },
        fillRect(...args) { this.calls.push(["fillRect", ...args]); },
        strokeRect(...args) { this.calls.push(["strokeRect", ...args]); },
        fillRoundedRect(...args) { this.calls.push(["fillRoundedRect", ...args]); },
        strokeRoundedRect(...args) { this.calls.push(["strokeRoundedRect", ...args]); },
        fillCircle(...args) { this.calls.push(["fillCircle", ...args]); },
        strokeCircle(...args) { this.calls.push(["strokeCircle", ...args]); },
        beginPath() { this.calls.push(["beginPath"]); },
        moveTo(...args) { this.calls.push(["moveTo", ...args]); },
        lineTo(...args) { this.calls.push(["lineTo", ...args]); },
        strokePath() { this.calls.push(["strokePath"]); }
    };
}

const gfx = createGfx();
drawRuntimeRectangle(state, gfx, 10, 20, 2, 4, { color: "#ff0000", alpha: 2, lineWidth: 5, outline: true });
assert.deepEqual(gfx.calls.at(-1), ["strokeRect", 2, 4, 8, 16]);
assert.deepEqual(gfx.calls.at(-2), ["lineStyle", 5, 0xff0000, 1]);
assert.equal(state.draw.alpha, 0.75, "primitive options must not mutate persistent alpha");
assert.equal(state.draw.lineWidth, 2, "primitive options must not mutate persistent line width");

drawRuntimeRoundRect(state, gfx, 0, 0, 40, 20, { radius: 6, color: "#00ff00" });
assert.deepEqual(gfx.calls.at(-1), ["fillRoundedRect", 0, 0, 40, 20, 6]);
drawRuntimeCircle(state, gfx, 12, 13, 4, { outline: true, alpha: -1 });
assert.deepEqual(gfx.calls.at(-2), ["lineStyle", 2, 0xff00, 0]);
assert.deepEqual(gfx.calls.at(-1), ["strokeCircle", 12, 13, 4]);

drawRuntimeLine(state, gfx, 1, 2, 3, 4, { color: "#ffffff", lineWidth: 3 });
assert.deepEqual(gfx.calls.at(-5), ["lineStyle", 3, 0xffffff, 0.75]);
drawRuntimePolyline(state, gfx, [{ x: 0, y: 0 }, [4, 2], { x: 8, y: 0 }], { closed: true });
assert.deepEqual(gfx.calls.at(-2), ["lineTo", 0, 0]);
assert.deepEqual(gfx.calls.at(-1), ["strokePath"]);
drawRuntimePolyline(state, gfx, [0, 0, 5, 5], { color: "#abcdef" });
assert.deepEqual(gfx.calls.at(-1), ["strokePath"]);

assert.throws(() => drawRuntimeRectangle(state, gfx, 0, Number.NaN, 1, 1), /finite number/);
assert.throws(() => drawRuntimeCircle(state, gfx, 0, 0, -1), /non-negative/);
assert.throws(() => drawRuntimeLine(state, gfx, 0, 0, 1, 1, { lineWidth: 0 }), /greater than zero/);
assert.throws(() => drawRuntimePolyline(state, gfx, [0, 1, 2]), /x\/y pairs/);

function sprite() {
    return {
        frame: { sourceSize: { w: 20, h: 10 }, width: 12, height: 8 },
        setPosition() {},
        setOrigin() {},
        setFlip() {},
        setScale(x, y) { this.scaleX = x; this.scaleY = y; },
        setAngle() {},
        setAlpha() {},
        setTint() {}
    };
}

let item = sprite();
drawRuntimeSpriteExt(state, { take: () => item }, "atlas", "trimmed", 0, 0, { width: 40 });
assert.equal(item.scaleX, 2);
assert.equal(item.scaleY, 2, "one display dimension preserves the source aspect ratio");
item = sprite();
drawRuntimeSpriteExt(state, { take: () => item }, "atlas", "trimmed", 0, 0, { height: 30 });
assert.equal(item.scaleX, 3);
assert.equal(item.scaleY, 3);
item = sprite();
drawRuntimeSpriteExt(state, { take: () => item }, "atlas", "trimmed", 0, 0, { width: 40, height: 30 });
assert.equal(item.scaleX, 2);
assert.equal(item.scaleY, 3);
assert.throws(() => drawRuntimeSpriteExt(state, { take: () => sprite() }, "atlas", "trimmed", 0, 0, { width: 40, scale: 2 }), /cannot be combined/);

assert.equal(distanceSq(0, 0, 3, 4), 25);
assert.deepEqual(normalize2(3, 4), { x: 0.6, y: 0.8, length: 5 });
const reusable = {};
assert.equal(normalize2(0, 0, reusable), reusable);
assert.deepEqual(reusable, { x: 0, y: 0, length: 0 });
assert.equal(dampFactor(0.9, 1 / 60), 0.9);
assert.equal(dampFactor(0.9, 0), 1);
assert.throws(() => dampFactor(-1, 1), /non-negative/);

console.log("[ok] Primitive options, polyline, display sizing, and math helper tests passed.");
