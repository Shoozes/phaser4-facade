#!/usr/bin/env node
import assert from "node:assert/strict";
import { installGrout13Bridge } from "../src/bridges/grout13.js";

const source = { width: 4, height: 2 };
const frames = Object.assign(Object.create(null), {
    apple: { x: 0, y: 0, w: 2, h: 2 }
});
const decoded = { width: 4, height: 2, canvas: source, frames };
const calls = [];
const gm = {
    asset: {
        addAtlas(...args) {
            calls.push(args);
            return { key: args[0], frameCount: Object.keys(args[2]).length };
        }
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

const payloadResult = bridge.addPayload("fruit-payload", compiled.payload, {
    decodeOptions: { canvasFactory: () => source }
});
assert.equal(payloadResult.asset.key, "fruit-payload");
assert.deepEqual(calls[1][3], {});

assert.throws(
    () => installGrout13Bridge(gm, { ...grout13 }),
    /already installed with a different bridge/
);
const missingCanvasBridge = installGrout13Bridge({ asset: gm.asset }, {
    compileGrout13Atlas() { return compiled; },
    decodeGrout13Atlas() { return { frames }; }
});
assert.throws(() => missingCanvasBridge.addPayload("bad", compiled.payload), /missing a canvas source/);

const missingFramesGm = {
    asset: { addAtlas() {} }
};
const missingFramesBridge = installGrout13Bridge(missingFramesGm, {
    compileGrout13Atlas() { return compiled; },
    decodeGrout13Atlas() { return { canvas: source }; }
});
assert.throws(() => missingFramesBridge.addPayload("bad", compiled.payload), /missing frames/);

console.log("[ok] Grout13 bridge injection, isolation, registration, and rejection tests passed.");
