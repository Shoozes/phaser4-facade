#!/usr/bin/env node
import assert from "node:assert/strict";
import { installGrout13Bridge } from "../src/bridges/grout13.js";
import { runRuntimeCleanup } from "../src/core/cleanup.js";
import { makeSpritePool } from "../src/core/pools.js";

const source = { width: 4, height: 2 };
const frames = Object.assign(Object.create(null), {
    apple: { x: 0, y: 0, w: 2, h: 2 }
});
const fontFrames = Object.fromEntries(["S", "C", "O", "R", "E", "space"].map((name) => [
    name, { x: 0, y: 0, w: 2, h: 2 }
]));
const compiled = { payload: [4, 2, "ffffff", "0", [0, 0, 2, 2], "apple"] };

function makeRuntime({ missingFrames = false, failSource = false, failCalls = 0 } = {}) {
    const registered = new Map();
    let addCalls = 0;
    const textures = {
        exists(key) { return registered.has(String(key)); },
        get(key) { return registered.get(String(key)) || null; },
        addAtlasJSONHash(key, atlasSource, data) {
            addCalls += 1;
            if ((failSource && atlasSource.fail) || addCalls <= failCalls) {
                throw new Error(addCalls <= failCalls ? "failure before registration" : "simulated replacement failure");
            }
            const texture = {
                key,
                source: atlasSource,
                frames: new Set(Object.keys(data.frames)),
                has(frame) { return !missingFrames && this.frames.has(String(frame)); }
            };
            registered.set(String(key), texture);
            return texture;
        },
        remove(key) {
            registered.delete(String(key));
            return true;
        }
    };
    const owner = {
        scene: { textures },
        state: { cleanup: [], cleanedUp: false }
    };
    return { owner, textures, registered, get addCalls() { return addCalls; } };
}

const runtimeA = makeRuntime();
const gm = { _active: runtimeA.owner };
const grout13 = {
    compileGrout13Atlas(assets, options) {
        assert.deepEqual(assets, [{ name: "apple" }]);
        assert.deepEqual(options, { runtimeTarget: "canvas" });
        return compiled;
    },
    decodeGrout13Atlas(payload, options) {
        assert.equal(typeof options.canvasFactory, "function");
        if (payload[0] !== "font") assert.deepEqual(payload, compiled.payload);
        return { width: 4, height: 2, canvas: source, frames: payload[0] === "font" ? fontFrames : frames };
    }
};

const bridge = installGrout13Bridge(gm, grout13);
assert.equal(installGrout13Bridge(gm, grout13), bridge, "same GM/GROUT13 install must be idempotent");
assert.equal(gm.grout13, bridge);
assert.deepEqual(bridge.capabilities, { decode: true, compile: true, payloadBytes: false, fontPayload: true });

const result = bridge.addAtlas("fruit", [{ name: "apple" }], {
    compileOptions: { runtimeTarget: "canvas" },
    decodeOptions: { canvasFactory: () => source },
    replace: true
});
assert.equal(result.asset.key, "fruit");
assert.equal(result.payload, compiled.payload);
assert.equal(runtimeA.addCalls, 1);
assert.deepEqual(result.frameNames, ["apple"]);
assert.equal(result.frameCount, 1);
assert.equal(result.hasFrame("apple"), true);
assert.equal(result.hasFrame("missing"), false);
assert.equal(result.payloadBytes, JSON.stringify(compiled.payload).length);

const payloadResult = bridge.addPayload("fruit-payload", compiled.payload, {
    decodeOptions: { canvasFactory: () => source }
});
assert.equal(payloadResult.asset.key, "fruit-payload");
assert.throws(() => bridge.addPayload("fruit-payload", compiled.payload, { decodeOptions: { canvasFactory: () => source } }), /already exists/);
assert.equal(payloadResult.dispose(), true);
assert.equal(payloadResult.dispose(), false);

const directCompiled = {
    payload: ["direct"],
    atlas: { width: 2, height: 2, rgba: new Uint8ClampedArray(16) },
    frames: [{ name: "direct", x: 0, y: 0, width: 2, height: 2, sourceWidth: 2, sourceHeight: 2 }],
    runtimeContract: { formatVersion: 13 },
    bytes: { payload: 7 }
};
globalThis.ImageData = class {
    constructor(data, width, height) { this.data = data; this.width = width; this.height = height; }
};
globalThis.document = {
    createElement() {
        return { width: 0, height: 0, getContext() { return { putImageData() {} }; } };
    }
};
const directResult = bridge.addCompiled("direct", directCompiled);
assert.equal(directResult.source.rgba.length, 16);
assert.equal(directResult.decoded.canvas, undefined, "compiled RGBA path should not require a decode canvas");
assert.equal(directResult.runtimeContract.formatVersion, 13);
assert.equal(directResult.payloadBytes, 7);
assert.equal(directResult.hasFrame("direct"), true);

const font = {
    glyphs: Object.fromEntries(Object.keys(fontFrames).map((name) => [name, { name, width: 12, height: 20, advance: 12 }])),
    metrics: { tracking: 4, lineHeight: 24, fallback: "E", fallbackFrame: "E" },
    compiled: {
        payload: ["font"],
        frames: Object.keys(fontFrames).map((name) => ({ name, x: 0, y: 0, width: 2, height: 2 }))
    }
};
const addedFont = bridge.addFont("pixel-3x5", font, { decodeOptions: { canvasFactory: () => source } });
assert.equal(addedFont.atlasKey, "grout13-font-pixel-3x5");
assert.equal(bridge.getFont("pixel-3x5").atlasKey, "grout13-font-pixel-3x5");
assert.throws(() => bridge.addFont("pixel-3x5", font), /already exists/);
const payloadFont = bridge.addFontPayload("payload-font", compiled.payload, { apple: { name: "apple" } }, { lineHeight: 8 }, { decodeOptions: { canvasFactory: () => source } });
assert.deepEqual(bridge.listFonts().map((item) => item.name), ["pixel-3x5", "payload-font"]);
assert.equal(bridge.removeFont("payload-font"), true);
assert.equal(bridge.removeFont("payload-font"), false);
assert.throws(
    () => bridge.addFontPayload("invalid-font", compiled.payload, { P: { name: "P" } }, { lineHeight: 8 }, { decodeOptions: { canvasFactory: () => source } }),
    /references missing atlas frames: P/
);
assert.equal(bridge.addFontPayload("pixel-3x5", compiled.payload, { apple: { name: "apple" } }, { lineHeight: 8 }, { replace: true, decodeOptions: { canvasFactory: () => source } }).name, "pixel-3x5");
assert.throws(() => installGrout13Bridge(gm, { ...grout13 }), /already installed with a different bridge/);

assert.throws(() => installGrout13Bridge({ _active: null }, {
    decodeGrout13Atlas() { return { canvas: source, frames }; }
}).addPayload("bad", compiled.payload), /active GM runtime/);

const missingFramesRuntime = makeRuntime({ missingFrames: true });
const missingFramesBridge = installGrout13Bridge({ _active: missingFramesRuntime.owner }, {
    decodeGrout13Atlas() { return { canvas: source, frames }; }
});
assert.throws(() => missingFramesBridge.addPayload("bad", compiled.payload), /missing frames/);
assert.equal(missingFramesRuntime.textures.exists("bad"), false, "frame parity failure should remove the registered texture");

const rollbackRuntime = makeRuntime({ failSource: true });
const rollbackBridge = installGrout13Bridge({ _active: rollbackRuntime.owner }, {
    decodeGrout13Atlas(payload) { return { canvas: payload[0] === "bad" ? { ...source, fail: true } : source, frames }; }
});
rollbackBridge.addPayload("rollback", ["good"]);
assert.throws(() => rollbackBridge.addPayload("rollback", ["bad"], { replace: true }), /simulated replacement failure/);
assert.throws(() => rollbackBridge.addPayload("rollback", ["good"]), /already exists/);
assert.equal(rollbackRuntime.textures.get("rollback").source.fail, undefined, "failed replacement must restore the previous atlas");

const lifecycleA = makeRuntime();
const lifecycleB = makeRuntime();
const lifecycleGm = { _active: lifecycleA.owner };
const lifecycleBridge = installGrout13Bridge(lifecycleGm, {
    decodeGrout13Atlas(payload) { return { canvas: source, frames: payload[0] === "font" ? fontFrames : frames }; }
});
const oldRecord = lifecycleBridge.addPayload("shared", ["a"]);
lifecycleGm._active = lifecycleB.owner;
const newRecord = lifecycleBridge.addPayload("shared", ["b"]);
assert.equal(oldRecord.dispose(), false, "a stale runtime handle must not delete a newer runtime texture");
assert.equal(lifecycleB.textures.exists("shared"), true);
assert.equal(newRecord.dispose(), true);
const externalRecord = lifecycleBridge.addPayload("external", ["a"]);
lifecycleB.textures.remove("external");
const externalTexture = { key: "external", has() { return true; } };
lifecycleB.registered.set("external", externalTexture);
assert.equal(externalRecord.dispose(), false, "a stale handle must not delete an externally reused key");
assert.equal(lifecycleB.textures.get("external"), externalTexture);

const lifecycleFontOptions = { decodeOptions: { canvasFactory: () => source } };
lifecycleGm._active = lifecycleA.owner;
const apiFontA = lifecycleBridge.addFont("lifecycle-api", font, lifecycleFontOptions);
lifecycleGm._active = lifecycleB.owner;
const apiFontB = lifecycleBridge.addFont("lifecycle-api", font, lifecycleFontOptions);
assert.equal(apiFontA.dispose(), false, "a stale compiled-font handle must not delete a new runtime font");
assert.equal(lifecycleBridge.getFont("lifecycle-api"), apiFontB);
assert.deepEqual(lifecycleBridge.listFonts().map((item) => item.name), ["lifecycle-api"]);

const lifecycleC = makeRuntime();
const payloadFontA = lifecycleBridge.addFontPayload(
    "lifecycle-payload",
    ["font"],
    font.glyphs,
    font.metrics,
    lifecycleFontOptions
);
lifecycleGm._active = lifecycleC.owner;
const payloadFontB = lifecycleBridge.addFontPayload(
    "lifecycle-payload",
    ["font"],
    font.glyphs,
    font.metrics,
    lifecycleFontOptions
);
assert.equal(payloadFontA.dispose(), false, "a stale payload-font handle must not delete a new runtime font");
assert.equal(lifecycleBridge.getFont("lifecycle-payload"), payloadFontB);

const externallyReusedFont = lifecycleBridge.addFontPayload(
    "external-font",
    ["font"],
    font.glyphs,
    font.metrics,
    { ...lifecycleFontOptions, atlasKey: "external-font-atlas" }
);
lifecycleC.textures.remove(externallyReusedFont.atlasKey);
const externalFontTexture = { key: externallyReusedFont.atlasKey, has() { return true; } };
lifecycleC.registered.set(externallyReusedFont.atlasKey, externalFontTexture);
assert.equal(externallyReusedFont.dispose(), false, "stale font disposal must not remove an externally reused atlas");
assert.equal(lifecycleC.textures.get(externallyReusedFont.atlasKey), externalFontTexture);

const cleanupFont = lifecycleBridge.addFontPayload(
    "cleanup-font",
    ["font"],
    font.glyphs,
    font.metrics,
    lifecycleFontOptions
);
assert.equal(runRuntimeCleanup(lifecycleC.owner.state, "font_cleanup"), true);
assert.equal(lifecycleBridge.getFont(cleanupFont.name), null, "runtime cleanup must hide stale fonts");
assert.equal(lifecycleBridge.listFonts().length, 0, "runtime cleanup must remove all stale font listings");
assert.equal(payloadFontB.dispose(), false, "runtime cleanup must invalidate payload-font handles");

lifecycleGm._active = lifecycleB.owner;
const cleanupRecord = lifecycleBridge.addPayload("cleanup", ["a"]);
assert.equal(runRuntimeCleanup(lifecycleB.owner.state, "game_destroy"), true);
assert.equal(cleanupRecord.dispose(), false, "runtime cleanup must invalidate bridge records");
assert.equal(lifecycleB.textures.exists("cleanup"), true, "cleanup invalidation must not remove consumer-owned textures");

const preRemovalRuntime = makeRuntime({ failCalls: 1 });
const preRemovalBridge = installGrout13Bridge({ _active: preRemovalRuntime.owner }, {
    decodeGrout13Atlas() { return { canvas: source, frames }; }
});
assert.throws(() => preRemovalBridge.addPayload("pre-removal", ["good"]), /failure before registration/);
assert.equal(preRemovalRuntime.textures.exists("pre-removal"), false);

const poolCalls = [];
const poolTextures = new Map([["fruit", { id: "a" }]]);
const poolItem = {
    setTexture(key, frame) { poolCalls.push([key, frame]); },
    setOrigin() {}, setFlip() {}, clearTint() {}, setAlpha() {}, setAngle() {}, setScale() {}, setBlendMode() {}, clearMask() {}, setCrop() {}, setVisible() {}
};
const poolScene = {
    textures: { get(key) { return poolTextures.get(key); } },
    add: { sprite() { return poolItem; } }
};
const poolParent = { add() {} };
const pool = makeSpritePool(poolScene, poolParent);
pool.begin(); pool.take("fruit", "apple");
pool.begin(); pool.take("fruit", "apple");
poolTextures.set("fruit", { id: "b" });
pool.begin(); pool.take("fruit", "apple");
assert.deepEqual(poolCalls, [["fruit", "apple"]], "same-key texture replacement must rebind pooled sprites");

console.log("[ok] Grout13 bridge runtime ownership, replacement rollback, stale handles, fonts, and pool identity tests passed.");
