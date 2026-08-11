#!/usr/bin/env node
/**
 * Deterministic long-run runtime resource soak.
 *
 * This uses the local Phaser-shaped contract harness so 10,000 frames can be
 * checked in seconds without making browser wall time part of the proof.
 */
import assert from "node:assert/strict";
import { createFakeRuntimeHarness } from "./runtime-contract-harness.mjs";

const { installGMRuntime } = await import("../src/gm-phaser4.js");
const FRAME_COUNT = Number(process.argv[2] || 10000);
if (!Number.isInteger(FRAME_COUNT) || FRAME_COUNT < 1000) {
    throw new Error("Usage: node scripts/test-runtime-soak.mjs [frame-count >= 1000]");
}

function createCanvas() {
    const context = {
        clearRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        quadraticCurveTo() {},
        closePath() {},
        fill() {},
        stroke() {},
        putImageData() {},
        createLinearGradient() {
            return { addColorStop() {} };
        }
    };
    return {
        width: 1,
        height: 1,
        getContext() { return context; },
        toDataURL() { return "data:image/png;base64,soak"; }
    };
}

function createTextureManager() {
    const records = new Map();
    return {
        records,
        exists(key) { return records.has(String(key)); },
        remove(key) { records.delete(String(key)); },
        addCanvas(key, canvas) {
            const record = { key: String(key), source: [{ image: canvas }] };
            records.set(record.key, record);
            return record;
        },
        addAtlasJSONHash(key, source, data) {
            const record = {
                key: String(key),
                source: [{ image: source }],
                frames: data.frames,
                hasFrame(frame) { return Object.prototype.hasOwnProperty.call(this.frames, frame); }
            };
            records.set(record.key, record);
            return record;
        },
        get(key) { return records.get(String(key)) || null; }
    };
}

const previousDocument = globalThis.document;
const previousImageData = globalThis.ImageData;
globalThis.document = {
    createElement(type) {
        if (type !== "canvas") throw new Error(`soak document cannot create ${type}`);
        return createCanvas();
    }
};
globalThis.ImageData = class ImageData {
    constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
    }
};

try {
    const { fakeRoot } = createFakeRuntimeHarness(installGMRuntime);
    const textureManager = createTextureManager();
    let frame = 0;
    const sourceCanvas = globalThis.document.createElement("canvas");
    sourceCanvas.width = 32;
    sourceCanvas.height = 32;

    const game = fakeRoot.GM.app.start({
        parent: "game",
        width: 720,
        height: 1280,
        responsive: true,
        minHeight: 1280,
        targetHeight: 1560,
        maxHeight: 1900,
        stage: false,
        curtain: false,
        globals: false,
        create(api) {
            api.scene.textures = textureManager;
            fakeRoot.GM.asset.addCanvas("soak-source", sourceCanvas);
            fakeRoot.GM.asset.addAtlas("soak-atlas", "soak-source", {
                base: { frame: { x: 0, y: 0, w: 16, h: 16 } }
            });
        },
        step() {
            frame += 1;
            if (frame % 60 === 0) {
                fakeRoot.GM.asset.addRgba("soak-rgba", 2, 2, [252, 224, 168, 255, 35, 75, 110, 255, 25, 40, 80, 255, 255, 255, 255, 255], { replace: true });
            }
            if (frame % 120 === 0) {
                fakeRoot.GM.ui.setTheme({ button: { fillTop: frame % 240 === 0 ? "#fff0ba" : "#ffd56b" } });
                fakeRoot.GM.ui.exportTextures();
            }
        },
        draw(api) {
            api.draw_set_font("sans-serif", 18 + (frame % 3), false);
            for (let index = 0; index < 24; index += 1) {
                api.button(
                    24 + (index % 6) * 108,
                    80 + Math.floor(index / 6) * 72,
                    96,
                    54,
                    `B${frame % 17}-${index}`,
                    undefined,
                    { id: `soak-button-${index}`, size: 20 + (index % 3) }
                );
            }
            for (let index = 0; index < 12; index += 1) {
                api.nineslice_window(
                    24 + (index % 4) * 160,
                    420 + Math.floor(index / 4) * 96,
                    144,
                    76,
                    { kind: `soak-panel-${index % 3}` }
                );
            }
            for (let index = 0; index < 16; index += 1) {
                api.draw_sprite_ext("soak-atlas", "base", 120 + index * 12, 760, 1 + (index % 2) * 0.1, 1, index % 360, 0xffffff, 0.65 + (index % 3) * 0.1);
            }
            for (let index = 0; index < 20; index += 1) api.draw_text(24, 840 + index * 16, `world-${frame % 23}-${index}`);
            for (let index = 0; index < 10; index += 1) api.draw_gui_text(24, 24 + index * 18, `gui-${frame % 11}-${index}`);
        }
    });

    const state = fakeRoot.GM.runtime.state;
    const samples = [];
    function resourceCounts() {
        return {
            buttons: state.uiButtons.size,
            panels: state.uiPanels.length,
            worldText: state.worldText.items.length,
            screenText: state.screenText.items.length,
            sprites: state.worldSprites.items.length,
            textures: textureManager.records.size,
            cleanupErrors: state.cleanupErrors.length
        };
    }

    for (let index = 1; index <= FRAME_COUNT; index += 1) {
        game.tick(index * 16.666, 16.666);
        if (index === 120 || index === FRAME_COUNT || index % 1000 === 0) samples.push({ frame: index, ...resourceCounts() });
    }

    const baseline = samples[0];
    const terminal = samples[samples.length - 1];
    for (const key of ["buttons", "panels", "worldText", "screenText", "sprites", "textures", "cleanupErrors"]) {
        assert.equal(terminal[key], baseline[key], `${key} count must plateau after warm-up`);
    }
    assert.equal(baseline.buttons, 24, "button pool should retain one object per stable button id");
    assert.equal(baseline.panels, 12, "panel pool should retain one object per stable panel slot");
    assert.equal(baseline.worldText, 20, "world text pool should retain one object per active label");
    assert.equal(baseline.screenText, 10, "screen text pool should retain one object per active label");
    assert.equal(baseline.sprites, 16, "sprite pool should retain one object per active sprite");
    assert.equal(baseline.cleanupErrors, 0, "soak must not accumulate cleanup errors");

    game.destroy();
    console.log(`[ok] Runtime resource soak passed (${FRAME_COUNT} frames).`);
    console.log(JSON.stringify({ warmup: baseline, terminal, samples }));
} finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousImageData === undefined) delete globalThis.ImageData;
    else globalThis.ImageData = previousImageData;
}
