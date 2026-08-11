#!/usr/bin/env node
import assert from "node:assert/strict";
import { drawRuntimeSpriteExt, drawRuntimeTextExt, drawRuntimeTextFit } from "../src/core/draw.js";
import { createRuntimePerfState } from "../src/core/perf-metrics.js";

function makeSprite() {
    return {
        setPosition() { return this; },
        setOrigin() { return this; },
        setFlip() { return this; },
        setScale() { return this; },
        setAngle() { return this; },
        setAlpha() { return this; },
        setTint() { return this; }
    };
}

function makeText() {
    return {
        text: "",
        style: { fontSize: "24px" },
        setText(value) { this.text = String(value); return this; },
        setStyle(value) { this.style = { ...value }; return this; },
        setPosition() { return this; },
        setOrigin() { return this; },
        setAlpha() { return this; },
        setAngle() { return this; },
        setScale() { return this; },
        get width() { return this.text.length * Number.parseFloat(this.style.fontSize || "24px") * 0.6; },
        get height() { return Number.parseFloat(this.style.fontSize || "24px"); }
    };
}

function measure(label, count, callback) {
    const start = performance.now();
    for (let index = 0; index < count; index += 1) callback(index);
    const durationMs = performance.now() - start;
    assert.ok(Number.isFinite(durationMs) && durationMs >= 0, `${label} duration must be finite`);
    return { label, count, durationMs: Number(durationMs.toFixed(3)) };
}

const state = {
    draw: { color: 0xffffff, alpha: 1, font: "Arial", size: 24, bold: false, halign: "left", valign: "top" },
    render: { resolution: 1 },
    perf: createRuntimePerfState(),
    scene: { textures: { exists: (key) => key === "fruit", get: () => ({ has: () => true }) } }
};
const parent = { bringToTop() {} };
const sprite = makeSprite();
const spritePool = { take: () => sprite };
const text = makeText();
const textPool = { take: () => text };
const spriteOptions = { scale: 1.1, scaleY: 0.9, rotation: 12, alpha: 0.9, flipX: true };
const textOptions = { size: 22, bold: true, color: 0xffff00, rotation: 5, scale: 1.1 };
const fitOptions = { size: 32, minSize: 10, maxWidth: 220, maxHeight: 40 };

// Warm the same pooled paths that the browser fixture exercises before timing.
for (let index = 0; index < 100; index += 1) {
    drawRuntimeSpriteExt(state, spritePool, "fruit", "apple", index, index, spriteOptions);
    drawRuntimeTextExt(state, textPool, parent, index, index, "warm", textOptions);
    drawRuntimeTextFit(state, textPool, parent, index, index, "warm fit", fitOptions);
}

const samples = [
    measure("spriteExt-100", 100, (index) => drawRuntimeSpriteExt(state, spritePool, "fruit", "apple", index, index, spriteOptions)),
    measure("spriteExt-500", 500, (index) => drawRuntimeSpriteExt(state, spritePool, "fruit", "apple", index, index, spriteOptions)),
    measure("spriteExt-2000", 2000, (index) => drawRuntimeSpriteExt(state, spritePool, "fruit", "apple", index, index, spriteOptions)),
    measure("textExt-2000", 2000, (index) => drawRuntimeTextExt(state, textPool, parent, index, index, "stable", textOptions)),
    measure("textFit-hit-1000", 1000, () => drawRuntimeTextFit(state, textPool, parent, 0, 0, "stable fit", fitOptions)),
    measure("textFit-miss-1000", 1000, (index) => drawRuntimeTextFit(state, textPool, parent, 0, 0, `dynamic-${index}`, fitOptions))
];

assert.ok(samples.every((sample) => sample.durationMs < 2000), "2,000-call samples must complete within the bounded local budget");
assert.ok(state.perf.counts.drawText >= 4000, "text benchmark must exercise the draw path");
assert.ok(state.perf.counts.fittedText >= 2000, "textFit benchmark must exercise hit and miss paths");
console.log(`[ok] Runtime performance smoke passed (${samples.map((sample) => `${sample.label}=${sample.durationMs}ms`).join(", ")}).`);
