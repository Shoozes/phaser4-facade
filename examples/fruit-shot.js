// @ts-check

import { GM } from "../dist/gm-phaser4.module.js";
import { installGrout13Bridge } from "../dist/gm-phaser4-grout13.module.js";

const runtimeRoot = /** @type {any} */ (globalThis);
const proof = runtimeRoot.__fruitShotProof = {
    phase: "booting",
    complete: false,
    failed: false,
    errors: [],
    frames: 0,
    atlasFrames: [],
    textExtSeen: false,
    textFitSeen: false,
    guiTextExtSeen: false,
    guiTextFitSeen: false,
    spriteOptionsSeen: false,
    fixedStepsSeen: false,
    bridgeUsed: false,
    sprite: null,
    text: null,
    guiText: null
};

function setStatus(text) {
    const status = document.getElementById("status");
    if (status) status.textContent = text;
}

function failProof(error) {
    const message = error instanceof Error ? error.message : String(error);
    proof.failed = true;
    proof.complete = false;
    proof.phase = "failed";
    proof.errors.push(message);
    setStatus(`Fruit Shot failed: ${message}`);
    const errorNode = document.getElementById("proof-error");
    if (errorNode) {
        errorNode.hidden = false;
        errorNode.textContent = message;
    }
}

globalThis.addEventListener?.("error", (event) => {
    failProof(event.error || event.message || "window error");
});
globalThis.addEventListener?.("unhandledrejection", (event) => {
    failProof(event.reason || "unhandled rejection");
});

function createFruitAtlas() {
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Fruit Shot requires a 2D canvas context.");

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ef476f";
    context.beginPath();
    context.arc(32, 32, 24, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffd166";
    context.beginPath();
    context.arc(96, 32, 24, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#06d6a0";
    context.beginPath();
    context.arc(160, 32, 24, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#073b4c";
    context.fillRect(24, 4, 16, 8);
    context.fillRect(88, 4, 16, 8);
    context.fillRect(152, 4, 16, 8);

    return {
        canvas,
        frames: {
            strawberry: { x: 0, y: 0, w: 64, h: 64 },
            lemon: { x: 64, y: 0, w: 64, h: 64 },
            lime: { x: 128, y: 0, w: 64, h: 64 }
        }
    };
}

function registerFruitAtlas() {
    const groutAssets = [
        { name: "strawberry", spec: { w: 8, h: 8, steps: [{ type: "fill", col: 48 }] } },
        { name: "lemon", spec: { w: 8, h: 8, steps: [{ type: "fill", col: 64 }] } },
        { name: "lime", spec: { w: 8, h: 8, steps: [{ type: "fill", col: 80 }] } }
    ];
const injectedGrout13 = runtimeRoot.GROUT13;
    if (injectedGrout13) {
        const bridge = installGrout13Bridge(GM, injectedGrout13);
        const result = bridge.addAtlas("fruit-atlas", groutAssets, {
            compileOptions: { runtimeTarget: "canvas" }
        });
        proof.bridgeUsed = true;
        proof.atlasFrames = Object.keys(result.frames || {});
        return result;
    }
    const atlas = createFruitAtlas();
    const result = GM.asset.addAtlas("fruit-atlas", atlas.canvas, atlas.frames);
    proof.atlasFrames = Object.keys(atlas.frames);
    return result;
}

function observeSprite(sprite) {
    proof.sprite = sprite ? {
        x: Number(sprite.x),
        y: Number(sprite.y),
        angle: Number(sprite.angle),
        scaleX: Number(sprite.scaleX),
        scaleY: Number(sprite.scaleY)
    } : null;
}

function observeText(text) {
    proof.text = text ? {
        width: Number(text.width),
        height: Number(text.height),
        fontSize: String(text.style?.fontSize || "")
    } : null;
}

const renderType = new URLSearchParams(window.location.search).get("render") === "canvas"
    ? "CANVAS"
    : "WEBGL";

try {
    GM.app.start({
        parent: "game",
        width: 720,
        height: 1280,
        simulationHz: 60,
        maxFrameDeltaMs: 100,
        maxCatchUpSteps: 5,
        randomSeed: 1337,
        responsive: true,
        type: renderType,
        create() {
            registerFruitAtlas();
            GM.layer.define("fruit", 100);

            GM.entity.spawn({
                create() {
                    const fruitState = /** @type {any} */ (this);
                    fruitState.fruit = GM.math.choose("strawberry", "lemon", "lime") || "strawberry";
                    fruitState.spin = GM.math.random_range(-18, 18);
                    fruitState.x = GM.runtime.centerX;
                    fruitState.y = GM.runtime.centerY + 80;
                },
                step() {
                    const fruitState = /** @type {any} */ (this);
                    fruitState.x += fruitState.spin * GM.runtime.deltaSec;
                    if (fruitState.x < 80 || fruitState.x > GM.runtime.roomWidth - 80) fruitState.spin *= -1;
                },
                draw() {
                    const fruitState = /** @type {any} */ (this);
                    const sprite = /** @type {any} */ (GM.draw.spriteExt("fruit-atlas", fruitState.fruit, fruitState.x, fruitState.y, {
                        width: 96,
                        rotation: fruitState.spin * GM.runtime.currentTime / 1000,
                        originX: 0.5,
                        originY: 0.5
                    }));
                    proof.spriteOptionsSeen = proof.spriteOptionsSeen || Boolean(sprite);
                    observeSprite(sprite);
                }
            }, { layer: "fruit", name: "fruit", vars: { fruit: "strawberry" } });

            GM.draw.setColor(GM.color.WHITE);
        },
        step(_api, deltaSec) {
            proof.frames += 1;
            proof.fixedStepsSeen = proof.fixedStepsSeen || Number.isFinite(deltaSec) && deltaSec > 0;
            proof.phase = "running";
            setStatus(`Fruit Shot running: ${proof.frames} fixed steps`);
        },
        draw() {
            GM.draw.rect(0, 0, GM.runtime.roomWidth, GM.runtime.roomHeight, {
                color: "#073b4c",
                alpha: 1
            });
            GM.draw.polyline([
                { x: 48, y: 220 },
                { x: GM.runtime.centerX, y: 190 },
                { x: GM.runtime.roomWidth - 48, y: 220 }
            ], { color: "#ffd166", lineWidth: 2 });
            const heading = GM.draw.textExt(GM.runtime.centerX, 80, "Fruit Shot", {
                size: 46,
                bold: true,
                color: GM.color.WHITE,
                hAlign: "center",
                vAlign: "middle"
            });
            const fitted = GM.draw.textFit(GM.runtime.centerX, 150, "Fixed-step motion, seeded choice, and reusable presentation options", {
                size: 28,
                minSize: 16,
                maxWidth: GM.runtime.roomWidth - 80,
                hAlign: "center",
                vAlign: "middle",
                color: "#ffd166"
            });
            proof.textExtSeen = proof.textExtSeen || Boolean(heading);
            proof.textFitSeen = proof.textFitSeen || Boolean(fitted);
            observeText(fitted);
            if (proof.frames >= 8 && !proof.failed) {
                proof.phase = "complete";
                proof.complete = true;
                setStatus(`Fruit Shot complete: ${proof.frames} fixed steps`);
            }
        },
        gui() {
            const guiHeading = GM.gui.textExt(20, 20, proof.bridgeUsed ? "Grout13 atlas" : "Procedural atlas", {
                size: 16,
                color: "#ffffff"
            });
            const guiSummary = /** @type {any} */ (GM.gui.textFit(20, 44, "Canvas/WebGL proof", {
                size: 16,
                minSize: 10,
                maxWidth: 180,
                color: "#ffd166"
            }));
            proof.guiTextExtSeen = proof.guiTextExtSeen || Boolean(guiHeading);
            proof.guiTextFitSeen = proof.guiTextFitSeen || Boolean(guiSummary);
            proof.guiText = guiSummary ? {
                width: Number(guiSummary.width),
                height: Number(guiSummary.height),
                fontSize: String(guiSummary.style?.fontSize || "")
            } : null;
        },
        onError(error) {
            failProof(error);
        }
    });
} catch (error) {
    failProof(error);
}
