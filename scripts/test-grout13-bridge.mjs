#!/usr/bin/env node
import assert from "node:assert/strict";
import { installGrout13Bridge } from "../src/bridges/grout13.js";

const source = { width: 4, height: 2 };
const frames = Object.assign(Object.create(null), {
    apple: { x: 0, y: 0, w: 2, h: 2 }
});
const decoded = { width: 4, height: 2, canvas: source, frames };
const calls = [];
const registered = new Map();
const gm = {
    asset: {
        addAtlas(...args) {
            calls.push(args);
            registered.set(args[0], new Set(Object.keys(args[2])));
            return { key: args[0], frameCount: Object.keys(args[2]).length };
        },
        frameExists(key, frame) { return registered.get(key)?.has(String(frame)) === true; },
        remove(key) { registered.delete(key); return true; }
    }
};
const compiled = { payload: [4, 2, "ffffff", "0", [0, 0, 2, 2], "apple"] };
const grout13 = {
    compileGrout13Atlas(assets, options) {
        assert.deepEqual(assets, [{ name: "apple" }]);
        assert.deepEqual(options, { runtimeTarget: "canvas" });
        return compiled;
    },
    decodeGrout13Atlas(payload, options) {
        assert.deepEqual(payload, compiled.payload);
        assert.equal(typeof options.canvasFactory, "function");
        return decoded;
    }
};

const bridge = installGrout13Bridge(gm, grout13);
assert.equal(installGrout13Bridge(gm, grout13), bridge, "same GM/GROUT13 install must be idempotent");
assert.equal(gm.grout13, bridge);

const result = bridge.addAtlas("fruit", [{ name: "apple" }], {
    compileOptions: { runtimeTarget: "canvas" },
    decodeOptions: { canvasFactory: () => source },
    replace: true
});
assert.equal(result.asset.key, "fruit");
assert.equal(result.payload, compiled.payload);
assert.equal(calls.length, 1);
assert.equal(calls[0][0], "fruit");
assert.equal(calls[0][1], source);
assert.equal(calls[0][2], frames);
assert.deepEqual(calls[0][3], { replace: true });
assert.deepEqual(result.frameNames, ["apple"]);
assert.equal(result.frameCount, 1);
assert.equal(result.hasFrame("apple"), true);
assert.equal(result.hasFrame("missing"), false);
assert.equal(result.payloadBytes, JSON.stringify(compiled.payload).length);

const payloadResult = bridge.addPayload("fruit-payload", compiled.payload, {
    decodeOptions: { canvasFactory: () => source }
});
assert.equal(payloadResult.asset.key, "fruit-payload");
assert.deepEqual(calls[1][3], {});

const directCompiled = {
    payload: ["direct"],
    atlas: { width: 2, height: 2, rgba: new Uint8ClampedArray(16) },
    frames: [{ name: "direct", x: 0, y: 0, width: 2, height: 2, sourceWidth: 2, sourceHeight: 2 }],
    runtimeContract: { formatVersion: 13 },
    bytes: { payload: 7 }
};
const directResult = bridge.addCompiled("direct", directCompiled);
assert.equal(directResult.source.rgba.length, 16);
assert.equal(directResult.decoded.canvas, undefined, "compiled RGBA path should not require a decode canvas");
assert.equal(directResult.runtimeContract.formatVersion, 13);
assert.equal(directResult.payloadBytes, 7);
assert.equal(directResult.hasFrame("direct"), true);

const font = {
    glyphs: {
        S: { name: "S", width: 12, height: 20, advance: 12 },
        C: { name: "C", width: 12, height: 20, advance: 12 },
        O: { name: "O", width: 12, height: 20, advance: 12 },
        R: { name: "R", width: 12, height: 20, advance: 12 },
        E: { name: "E", width: 12, height: 20, advance: 12 },
        space: { name: "space", width: 8, height: 20, advance: 8 }
    },
    metrics: { tracking: 4, lineHeight: 24, fallback: "E", fallbackFrame: "E" },
    compiled: {
        payload: ["font"],
        atlas: { width: 8, height: 8, rgba: new Uint8ClampedArray(256) },
        frames: Object.keys({ S: 1, C: 1, O: 1, R: 1, E: 1, space: 1 }).map((name) => ({
            name, x: 0, y: 0, width: 8, height: 8
        }))
    }
};
const addedFont = bridge.addFont("pixel-3x5", font);
assert.equal(addedFont.atlasKey, "grout13-font-pixel-3x5");
assert.equal(bridge.getFont("pixel-3x5").atlasKey, "grout13-font-pixel-3x5");

assert.throws(
    () => installGrout13Bridge(gm, { ...grout13 }),
    /already installed with a different bridge/
);
const missingCanvasBridge = installGrout13Bridge({ asset: gm.asset }, {
    compileGrout13Atlas() { return compiled; },
    decodeGrout13Atlas() { return { frames }; }
});
assert.throws(() => missingCanvasBridge.addPayload("bad", compiled.payload), /missing a canvas or RGBA source/);

const missingFramesGm = {
    asset: { addAtlas() {} }
};
missingFramesGm.asset.frameExists = () => false;
missingFramesGm.asset.remove = () => true;
const missingFramesBridge = installGrout13Bridge(missingFramesGm, {
    compileGrout13Atlas() { return compiled; },
    decodeGrout13Atlas() { return { canvas: source }; }
});
assert.throws(() => missingFramesBridge.addPayload("bad", compiled.payload), /missing frames/);

let parityCleanup = false;
const parityBridge = installGrout13Bridge({
    asset: {
        addAtlas() { return { key: "parity" }; },
        frameExists() { return false; },
        remove() { parityCleanup = true; return true; }
    }
}, {
    compileGrout13Atlas() { return compiled; },
    decodeGrout13Atlas() { return decoded; }
});
assert.throws(() => parityBridge.addPayload("parity", compiled.payload), /missing frames/);
assert.equal(parityCleanup, true, "frame parity failure should remove the registered texture");

console.log("[ok] Grout13 bridge injection, isolation, registration, and rejection tests passed.");
