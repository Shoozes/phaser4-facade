#!/usr/bin/env node
import assert from "node:assert/strict";
import { assertFruitShot, DEFAULT_FRUIT_SHOT, defineFruitShot } from "../examples/fruit-shot/config.js";
import { PIXEL_3X5, compileFruitShotFont, fruitRadiusFromFrame } from "../examples/fruit-shot/art.js";

assert.equal(DEFAULT_FRUIT_SHOT.viewport.width, 720);
assert.equal(DEFAULT_FRUIT_SHOT.viewport.height, 720);
assert.ok(DEFAULT_FRUIT_SHOT.hudHeight < DEFAULT_FRUIT_SHOT.dangerY);
assert.ok(DEFAULT_FRUIT_SHOT.dangerY < DEFAULT_FRUIT_SHOT.floorY);
assert.ok(DEFAULT_FRUIT_SHOT.floorY < DEFAULT_FRUIT_SHOT.cueY);

assert.throws(() => defineFruitShot({
    viewport: { width: 720, height: 720 },
    regions: { hudHeight: 400, launcherHeight: 220, dangerY: 160 },
    launcher: { cueRadius: 31, cueBottomMargin: 80, minimumFruitGap: 70 },
    tiers: DEFAULT_FRUIT_SHOT.tiers
}), /hudHeight/);

const recorded = [];
const font = compileFruitShotFont({
    compileFontAtlas(options) {
        recorded.push(options);
        return {
            name: options.name,
            glyphs: { space: { name: "space", width: 8, height: 20, advance: 8 } },
            metrics: {
                sourceScale: options.sourceScale,
                tracking: options.tracking,
                lineHeight: options.lineHeight,
                fallback: options.fallback,
                fallbackFrame: "?"
            }
        };
    }
});
assert.equal(recorded.length, 1);
assert.equal(recorded[0].name, "pixel-3x5");
assert.equal(recorded[0].sourceScale, 4);
assert.equal(recorded[0].tracking, 4);
assert.equal(recorded[0].lineHeight, 24);
assert.equal(recorded[0].fallback, "?");
assert.ok(recorded[0].glyphs.A);
assert.equal(font.name, "pixel-3x5");

const radius = fruitRadiusFromFrame({
    frameInfo() { return { sourceWidth: 88, sourceHeight: 88 }; }
}, "atlas", "fruit-2");
assert.equal(radius, 44);

assert.ok(PIXEL_3X5.A.length === 5);
assert.doesNotThrow(() => assertFruitShot(DEFAULT_FRUIT_SHOT));

console.log("[ok] Fruit Shot spec, stubbed font options, and frame-derived radius contracts passed.");
