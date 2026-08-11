import assert from "node:assert/strict";
import { createRuntimePerfState } from "../src/core/perf-metrics.js";
import { drawRuntimeSpriteExt, drawRuntimeText, drawRuntimeTextExt, drawRuntimeTextFit } from "../src/core/draw.js";
import { makeTextPool } from "../src/core/pools.js";

function createTextItem() {
    return {
        text: "",
        style: {},
        visible: false,
        x: 0,
        y: 0,
        alpha: 1,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        originX: 0,
        originY: 0,
        setText(value) { this.text = String(value); return this; },
        styleCalls: 0,
        setStyle(value) { this.styleCalls += 1; this.style = { ...value }; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
        setAlpha(value) { this.alpha = value; return this; },
        setAngle(value) { this.angle = value; return this; },
        setScale(x, y) { this.scaleX = x; this.scaleY = y; return this; },
        setBlendMode() { return this; },
        clearMask() { return this; },
        setCrop() { return this; },
        setVisible(value) { this.visible = value; return this; },
        bringToTop() { return this; },
        get width() { return this.text.length * Number.parseFloat(this.style.fontSize || "24px") * 0.6; },
        get height() { return Number.parseFloat(this.style.fontSize || "24px"); }
    };
}

function createState() {
    return {
        draw: { color: 0x0000ff, alpha: 1, font: "Arial", size: 40, bold: false, halign: "left", valign: "top" },
        render: { resolution: 1 },
        perf: createRuntimePerfState(),
        scene: { textures: { exists: () => true, get: () => ({ has: () => true }) } }
    };
}

function createPool(item) {
    return { take: () => item };
}

const state = createState();
const item = createTextItem();
const parent = { add() {}, bringToTop(value) { this.last = value; } };

drawRuntimeTextExt(state, createPool(item), parent, 20, 30, "White", {
    color: 0xffffff,
    size: 32,
    bold: true,
    rotation: 15,
    scaleX: 1.25,
    scaleY: 0.75,
    hAlign: "center",
    vAlign: "middle"
});
assert.equal(item.style.color, "#ffffff");
assert.equal(item.style.fontSize, "32px");
assert.equal(item.angle, -15, "text rotation uses GameMaker counter-clockwise degrees");
assert.equal(item.scaleX, 1.25);
assert.equal(item.scaleY, 0.75);
assert.equal(item.originX, 0.5);
assert.equal(item.originY, 0.5);
assert.equal(state.draw.color, 0x0000ff, "textExt must not mutate persistent draw state");

drawRuntimeText(state, createPool(item), parent, 20, 60, "Still red");
assert.equal(item.style.color, "#ff0000", "simple text must inherit the persistent draw state");
assert.equal(item.angle, 0);
assert.equal(item.scaleX, 1);
assert.equal(item.scaleY, 1);
assert.equal(item.originX, 0);
assert.equal(item.originY, 0);

drawRuntimeTextFit(state, createPool(item), parent, 0, 0, "A long dynamic title", {
    size: 40,
    minSize: 8,
    maxWidth: 120,
    maxHeight: 30
});
const fittedSize = Number.parseFloat(item.style.fontSize);
assert.ok(fittedSize <= 40 && fittedSize >= 8, "fit size stays inside the requested range");
assert.ok(item.width <= 120.01, `fitted width exceeded maxWidth: ${item.width}`);
assert.ok(item.height <= 30.01, `fitted height exceeded maxHeight: ${item.height}`);
assert.equal(state.perf.counts.fittedText, 1);

const reconciledFit = createTextItem();
const reconciledFitPool = createPool(reconciledFit);
const reconciledFitOptions = { size: 40, minSize: 8, maxWidth: 50 };
drawRuntimeTextFit(state, reconciledFitPool, parent, 0, 0, "AAAA", reconciledFitOptions);
const firstReconciledSize = reconciledFit.style.fontSize;
drawRuntimeTextFit(state, reconciledFitPool, parent, 0, 0, "BBBB", reconciledFitOptions);
const secondReconciledSize = reconciledFit.style.fontSize;
assert.equal(secondReconciledSize, firstReconciledSize, "same-width text should reuse the fitted size");
assert.equal(
    secondReconciledSize,
    `${reconciledFit.__gmRuntimeFitSize}px`,
    "textFit must reconcile the pooled Phaser style after the final measurement probe"
);

const pooledItem = createTextItem();
const textPool = makeTextPool({ add: { text: () => pooledItem } }, parent, state);
textPool.take();
pooledItem.setAngle(22);
pooledItem.setScale(3, 4);
pooledItem.setAlpha(0.2);
textPool.take();
assert.equal(pooledItem.angle, 0, "text pool resets rotation");
assert.equal(pooledItem.scaleX, 1, "text pool resets scaleX");
assert.equal(pooledItem.scaleY, 1, "text pool resets scaleY");
assert.equal(pooledItem.alpha, 1, "text pool resets alpha");

const stableText = createTextItem();
const stableTextPool = makeTextPool({ add: { text: () => stableText } }, parent, state);
stableTextPool.begin();
drawRuntimeText(state, stableTextPool, parent, 0, 0, "stable");
stableTextPool.begin();
drawRuntimeText(state, stableTextPool, parent, 0, 0, "stable");
assert.equal(stableText.styleCalls, 1, "pooled text should not rewrite an unchanged style each frame");
state.draw.color = 0xff0000;
stableTextPool.begin();
drawRuntimeText(state, stableTextPool, parent, 0, 0, "stable");
assert.equal(stableText.styleCalls, 2, "pooled text should apply a changed style signature");

const sprite = {
    angle: 0,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    originX: 0.5,
    originY: 0.5,
    flipX: false,
    flipY: false,
    setPosition(x, y) { this.x = x; this.y = y; },
    setOrigin(x, y) { this.originX = x; this.originY = y; },
    setFlip(x, y) { this.flipX = x; this.flipY = y; },
    setScale(x, y) { this.scaleX = x; this.scaleY = y; },
    setAngle(value) { this.angle = value; },
    setAlpha(value) { this.alpha = value; },
    setTint(value) { this.tint = value; }
};
drawRuntimeSpriteExt(state, { take: () => sprite }, "fruit", "apple", 10, 20, {
    scale: 2,
    scaleY: 3,
    rotation: 30,
    alpha: 0.5,
    flipX: true,
    originX: 0.25
});
assert.equal(sprite.scaleX, 2);
assert.equal(sprite.scaleY, 3);
assert.equal(sprite.angle, -30);
assert.equal(sprite.alpha, 0.5);
assert.equal(sprite.flipX, true);
assert.equal(sprite.flipY, false);
assert.equal(sprite.originX, 0.25);
assert.equal(sprite.originY, 0.5);

assert.throws(() => drawRuntimeTextExt(state, createPool(item), parent, Number.NaN, 0, "bad", {}), /text x must be a finite number/);
assert.throws(() => drawRuntimeTextFit(state, createPool(item), parent, 0, 0, "bad", { maxWidth: 0 }), /text maxWidth must be greater than zero/);
assert.throws(() => drawRuntimeSpriteExt(state, { take: () => sprite }, "fruit", "apple", 10, 20, { rotation: Number.NaN }), /rotation must be a finite number/);

console.log("[ok] Text/sprite options, fit bounds, and pool state-isolation tests passed.");
