import { GM } from "phaser4-facade";
import { installGrout13Bridge } from "phaser4-facade/grout13";
import * as GROUT13 from "grout13";

const renderType = new URLSearchParams(window.location.search).get("render") === "canvas"
    ? "CANVAS"
    : "WEBGL";
const proof = window.__fruitShotModularProof = {
    architecture: "module-grout13",
    phase: "booting",
    complete: false,
    failed: false,
    errors: [],
    frames: 0,
    atlasFrames: [],
    render: renderType,
    grout13: false,
    grout13PayloadBytes: 0,
    pixelTextSeen: false,
    pixelTextFlipY: false,
    pixelTextDraws: 0,
    spriteOptionsSeen: false,
    fixedStepsSeen: false,
    headingDraws: 0,
    summaryDraws: 0,
    sprite: null
};

function setStatus(text) {
    const status = document.getElementById("status");
    if (!status) return;
    status.hidden = false;
    status.textContent = text;
}

function hideStatus() {
    const status = document.getElementById("status");
    if (status) status.hidden = true;
}

function failProof(error) {
    const message = error instanceof Error ? error.message : String(error);
    proof.failed = true;
    proof.complete = false;
    proof.phase = "failed";
    proof.errors.push(message);
    setStatus("Fruit Shot modular CDN failed: " + message);
    const errorNode = document.getElementById("proof-error");
    if (errorNode) {
        errorNode.hidden = false;
        errorNode.textContent = message;
    }
}

function createFruitSpecs() {
    return [
        {
            name: "strawberry",
            spec: {
                w: 16,
                h: 16,
                steps: [
                    { type: "heart_filled", x: 2, y: 2, w: 12, h: 12, col: 0xef476f },
                    { type: "rect_filled", x: 6, y: 0, w: 4, h: 4, col: 0x06d6a0 },
                    { type: "plot", x: 6, y: 7, col: 0xffd166 },
                    { type: "plot", x: 10, y: 9, col: 0xffd166 }
                ]
            }
        },
        {
            name: "lemon",
            spec: {
                w: 16,
                h: 16,
                steps: [
                    { type: "circle_filled", x: 1, y: 3, w: 14, h: 10, col: 0xffd166 },
                    { type: "rect_filled", x: 6, y: 1, w: 4, h: 3, col: 0x06d6a0 }
                ]
            }
        },
        {
            name: "lime",
            spec: {
                w: 16,
                h: 16,
                steps: [
                    { type: "circle_filled", x: 1, y: 2, w: 14, h: 14, col: 0x06d6a0 },
                    { type: "circle", x: 3, y: 4, w: 10, h: 10, col: 0xffffff },
                    { type: "rect_filled", x: 7, y: 0, w: 2, h: 3, col: 0x118ab2 }
                ]
            }
        },
        {
            name: "fruit-shot-title",
            spec: {
                w: 180,
                h: 21,
                steps: [
                    { type: "bitmap_text", x: 0, y: 0, w: 180, align: "center", text: "FRUIT SHOT", col: 0xffffff, scale: 3 }
                ]
            }
        },
        {
            name: "fruit-shot-subtitle",
            spec: {
                w: 180,
                h: 14,
                steps: [
                    { type: "bitmap_text", x: 0, y: 0, w: 180, align: "center", text: "IMPORT MAP", col: 0xffd166, scale: 2 }
                ]
            }
        },
        {
            name: "fruit-shot-caption",
            spec: {
                w: 84,
                h: 7,
                steps: [
                    { type: "bitmap_text", x: 0, y: 0, text: "GROUT13 ATLAS", col: 0xffffff }
                ]
            }
        },
        {
            name: "fruit-shot-proof",
            spec: {
                w: 72,
                h: 7,
                steps: [
                    { type: "bitmap_text", x: 0, y: 0, text: "MODULE CDN", col: 0xffd166 }
                ]
            }
        }
    ];
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

function drawPixelLabel(frame, x, y, options) {
    const sprite = GM.draw.spriteExt("fruit-atlas", frame, x, y, { ...options, flipY: true });
    proof.pixelTextSeen = proof.pixelTextSeen || Boolean(sprite);
    proof.pixelTextFlipY = proof.pixelTextFlipY || sprite?.flipY === true;
    proof.pixelTextDraws += 1;
    return sprite;
}

try {
    const bridge = installGrout13Bridge(GM, GROUT13);
    GM.app.start({
        parent: "game",
        width: 720,
        height: 1280,
        simulationHz: 60,
        maxFrameDeltaMs: 100,
        maxCatchUpSteps: 5,
        randomSeed: 1337,
        responsive: true,
        renderQuality: "pixel-art",
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        type: renderType,
        create() {
            const atlas = bridge.addAtlas("fruit-atlas", createFruitSpecs(), {
                preset: "pixel"
            });
            proof.atlasFrames = [...atlas.frameNames];
            proof.grout13 = atlas.frameCount === proof.atlasFrames.length;
            proof.grout13PayloadBytes = Number(atlas.payloadBytes || 0);
            GM.layer.define("fruit", 100);
            GM.entity.spawn({
                create() {
                    this.fruit = GM.math.choose("strawberry", "lemon", "lime") || "strawberry";
                    this.spin = GM.math.random_range(-18, 18);
                    this.x = GM.runtime.centerX;
                    this.y = GM.runtime.centerY + 80;
                },
                step() {
                    this.x += this.spin * GM.runtime.deltaSec;
                    if (this.x < 80 || this.x > GM.runtime.roomWidth - 80) this.spin *= -1;
                },
                draw() {
                    const rotation = Math.round((this.spin * GM.runtime.currentTime / 1000) / 15) * 15;
                    const sprite = GM.draw.spriteExt("fruit-atlas", this.fruit, this.x, this.y, {
                        width: 96,
                        rotation,
                        originX: 0.5,
                        originY: 0.5
                    });
                    proof.spriteOptionsSeen = proof.spriteOptionsSeen || Boolean(sprite);
                    observeSprite(sprite);
                }
            }, { layer: "fruit", name: "fruit" });
        },
        step(_api, deltaSec) {
            proof.frames += 1;
            proof.fixedStepsSeen = proof.fixedStepsSeen || Number.isFinite(deltaSec) && deltaSec > 0;
            proof.phase = "running";
        },
        draw() {
            GM.draw.rect(0, 0, GM.runtime.roomWidth, GM.runtime.roomHeight, { color: "#073b4c" });
            GM.draw.polyline([
                { x: 48, y: 220 },
                { x: GM.runtime.centerX, y: 190 },
                { x: GM.runtime.roomWidth - 48, y: 220 }
            ], { color: "#ffd166", lineWidth: 2 });
            const heading = drawPixelLabel("fruit-shot-title", GM.runtime.centerX, 82, {
                scale: 1,
                originX: 0.5,
                originY: 0.5
            });
            proof.headingDraws += 1;
            const summary = drawPixelLabel("fruit-shot-subtitle", GM.runtime.centerX, 152, {
                scale: 1,
                originX: 0.5,
                originY: 0.5
            });
            proof.summaryDraws += 1;
            drawPixelLabel("fruit-shot-caption", 28, GM.runtime.roomHeight - 76, {
                scale: 2,
                originX: 0,
                originY: 0
            });
            drawPixelLabel("fruit-shot-proof", GM.runtime.roomWidth - 28, GM.runtime.roomHeight - 76, {
                scale: 2,
                originX: 1,
                originY: 0
            });
            if (proof.frames >= 8 && !proof.failed) {
                proof.phase = "complete";
                proof.complete = true;
                hideStatus();
            }
        },
        onError(error) {
            failProof(error);
        }
    });
} catch (error) {
    failProof(error);
}
