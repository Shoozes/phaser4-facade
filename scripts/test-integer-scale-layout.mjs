#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolveRoomLayout } from "../src/core/layout.js";

const base = Object.freeze({ width: 720, height: 1280, responsive: false, integerScaleStep: 0.5 });

function close(actual, expected, label) {
    assert.ok(Math.abs(actual - expected) < 0.000001, label + ": expected " + expected + ", received " + actual);
}

const phone = resolveRoomLayout(390, 844, base);
close(phone.scale, 0.5, "phone scale");
close(phone.x, 15, "phone letterbox x");
close(phone.y, 102, "phone letterbox y");
assert.equal(phone.scaleMode, "integer", "phone uses the configured discrete scale");

const desktop = resolveRoomLayout(1366, 768, base);
close(desktop.scale, 0.5, "desktop scale");
close(desktop.x, 503, "desktop letterbox x");
close(desktop.y, 64, "desktop letterbox y");
assert.equal(desktop.scaleMode, "integer", "desktop uses the configured discrete scale");

const native = resolveRoomLayout(720, 1280, base);
close(native.scale, 1, "native scale");
assert.equal(native.scaleMode, "integer", "native surface uses an exact scale");

const compactFallback = resolveRoomLayout(320, 568, base);
close(compactFallback.scale, 568 / 1280, "compact fallback scale");
assert.equal(compactFallback.scaleMode, "fit-fallback", "undersized viewport remains usable instead of cropping");

const continuous = resolveRoomLayout(390, 844, { width: 720, height: 1280, responsive: false });
close(continuous.scale, 390 / 720, "unchanged continuous scale");
assert.equal(continuous.scaleMode, "continuous", "default layout behavior remains continuous");

console.log("[ok] integerScaleStep preserves exact fitted pixel-grid steps and reports compact fallbacks.");
