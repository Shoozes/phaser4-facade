// @ts-check

import { GM } from "../dist/gm-phaser4.module.js";
import { installGrout13Bridge } from "../dist/gm-phaser4-grout13.module.js";

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
    if (globalThis.GROUT13) {
        installGrout13Bridge(GM, globalThis.GROUT13);
        GM.grout13.addAtlas("fruit-atlas", groutAssets, {
            compileOptions: { runtimeTarget: "canvas" }
        });
        return;
    }
    const atlas = createFruitAtlas();
    GM.asset.addAtlas("fruit-atlas", atlas.canvas, atlas.frames);
}

GM.app.start({
    width: 720,
    height: 1280,
    simulationHz: 60,
    maxFrameDeltaMs: 100,
    maxCatchUpSteps: 5,
    randomSeed: 1337,
    responsive: true,
    create() {
        registerFruitAtlas();
        GM.layer.define("fruit", 100);

        GM.entity.spawn({
            create() {
                this.fruit = GM.math.choose("strawberry", "lemon", "lime") || "strawberry";
                this.spin = GM.math.random_range(-18, 18);
                this.x = GM.runtime.roomWidth / 2;
                this.y = GM.runtime.roomHeight / 2 + 80;
            },
            step() {
                this.x += this.spin * GM.time.deltaSec;
                if (this.x < 80 || this.x > GM.runtime.roomWidth - 80) this.spin *= -1;
            },
            draw() {
                GM.draw.spriteExt("fruit-atlas", this.fruit, this.x, this.y, {
                    scale: 1.5,
                    rotation: this.spin * GM.time.currentTime / 1000,
                    originX: 0.5,
                    originY: 0.5
                });
            }
        }, { layer: "fruit", name: "fruit", vars: { fruit: "strawberry" } });

        GM.draw.setColor(GM.color.WHITE);
    },
    draw() {
        GM.draw.setColor("#073b4c");
        GM.draw.rectangle(0, 0, GM.runtime.roomWidth, GM.runtime.roomHeight, false);
        GM.draw.textExt(GM.runtime.roomWidth / 2, 80, "Fruit Shot", {
            size: 46,
            bold: true,
            color: GM.color.WHITE,
            hAlign: "center",
            vAlign: "middle"
        });
        GM.draw.textFit(GM.runtime.roomWidth / 2, 150, "Fixed-step motion, seeded choice, and reusable presentation options", {
            size: 28,
            minSize: 16,
            maxWidth: GM.runtime.roomWidth - 80,
            hAlign: "center",
            vAlign: "middle",
            color: "#ffd166"
        });
    }
});
