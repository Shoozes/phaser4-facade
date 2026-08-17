#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolveRoomLayout } from "../src/core/layout.js";
import {
    applyViewportToConfig,
    normalizeScaleStep,
    normalizeViewportConfig,
    resolveViewport
} from "../src/core/viewport.js";

function close(actual, expected, label) {
    assert.ok(Math.abs(actual - expected) < 0.000001, label + ": expected " + expected + ", received " + actual);
}

assert.equal(normalizeScaleStep(0), false);
assert.equal(normalizeScaleStep(false), false);
assert.equal(normalizeScaleStep(null), false);
assert.equal(normalizeScaleStep(0.25), 0.25);
assert.throws(() => normalizeScaleStep(-1), /non-negative/);
assert.throws(() => normalizeScaleStep(Number.NaN), /non-negative/);

const fromResponsiveFalse = normalizeViewportConfig({ width: 720, height: 720, responsive: false });
assert.equal(fromResponsiveFalse.mode, "fixed");
const fromResponsiveTrue = normalizeViewportConfig({ width: 720, height: 1280, responsive: true });
assert.equal(fromResponsiveTrue.mode, "adaptive");
const modeWins = normalizeViewportConfig({ responsive: true, viewport: { mode: "fixed", width: 720, height: 720 } });
assert.equal(modeWins.mode, "fixed");
assert.equal(modeWins.width, 720);
assert.equal(modeWins.height, 720);

const merged = applyViewportToConfig({
    width: 720,
    height: 1280,
    integerScaleStep: 0,
    viewport: {
        mode: "fixed",
        width: 720,
        height: 720,
        scaleStep: 0.25,
        align: { portrait: { x: "center", y: "top" }, landscape: { x: "center", y: "center" } }
    }
});
assert.equal(merged.responsive, false);
assert.equal(merged.height, 720);
assert.equal(merged.integerScaleStep, 0.25);

const phone = resolveRoomLayout(390, 844, {
    width: 720,
    height: 1280,
    responsive: false,
    integerScaleStep: 0.5
});
close(phone.scale, 0.5, "legacy phone scale");
close(phone.x, 15, "legacy phone x");
close(phone.y, 102, "legacy phone y");
assert.equal(phone.scaleMode, "integer");

const squareTop = resolveViewport(390, 844, {
    viewport: {
        mode: "fixed",
        width: 720,
        height: 720,
        scaleStep: 0.25,
        align: { x: "center", y: "top" }
    }
});
assert.equal(squareTop.logicalRect.width, 720);
assert.equal(squareTop.logicalRect.height, 720);
close(squareTop.scale, 0.5, "square top scale");
close(squareTop.gameScreenRect.x, 15, "square top x");
close(squareTop.gameScreenRect.y, 0, "square top y");
assert.ok(squareTop.visibleRoomRect.height > 720, "visible room includes letterbox below the square");

const landscapeCenter = resolveViewport(844, 390, {
    viewport: {
        mode: "fixed",
        width: 720,
        height: 720,
        scaleStep: 0.25,
        align: { landscape: { x: "center", y: "center" } }
    }
});
assert.equal(landscapeCenter.logicalRect.width, 720);
assert.equal(landscapeCenter.logicalRect.height, 720);
close(landscapeCenter.scale, 0.5, "landscape scale");
close(landscapeCenter.gameScreenRect.y, 15, "landscape centered y");

const asymmetric = { top: 0, right: 12, bottom: 0, left: 47 };
const inset = resolveViewport(844, 390, {
    viewport: {
        mode: "fixed",
        width: 720,
        height: 720,
        scaleStep: false,
        safeArea: "inset"
    }
}, asymmetric);
assert.equal(inset.safeScreenRect.x, 47);
assert.equal(inset.safeScreenRect.width, 785);
assert.ok(inset.gameScreenRect.x >= 47 - 0.001, "inset game stays inside the safe rectangle");

const framed = resolveViewport(844, 390, {
    viewport: {
        mode: "fixed",
        width: 720,
        height: 720,
        scaleStep: false,
        safeArea: "frame",
        align: { x: "center", y: "center" }
    }
}, asymmetric);
assert.ok(framed.gameScreenRect.x >= framed.safeScreenRect.x - 0.001, "frame protects the game rect");
assert.ok(framed.visibleRoomRect.width > 720, "frame still exposes the full physical viewport in room space");

const verticalOnly = resolveViewport(844, 390, {
    viewport: {
        mode: "fixed",
        width: 720,
        height: 720,
        scaleStep: false,
        safeArea: "vertical",
        align: { x: "center", y: "top" }
    }
}, { top: 20, right: 47, bottom: 10, left: 12 });
assert.equal(verticalOnly.safeInsets.left, 0);
assert.equal(verticalOnly.safeInsets.right, 0);
assert.equal(verticalOnly.safeInsets.top, 20);
close(verticalOnly.gameScreenRect.x, (844 - 720 * verticalOnly.scale) / 2, "vertical-only keeps physical horizontal centering");
assert.ok(verticalOnly.gameScreenRect.y >= 20 - 0.001, "vertical-only keeps the top inset");

const viewports = [
    [390, 844],
    [844, 390],
    [768, 1024],
    [1024, 768],
    [1366, 768]
];
const hashes = viewports.map(([width, height]) => {
    const next = resolveViewport(width, height, {
        viewport: { mode: "fixed", width: 720, height: 720, scaleStep: 0.25 }
    });
    return [next.logicalRect.width, next.logicalRect.height].join("x");
});
assert.ok(hashes.every((hash) => hash === "720x720"), "fixed logical size is independent of physical viewport");

console.log("[ok] viewport contract normalizes scale steps, alignment, and safe-area policies.");
