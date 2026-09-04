#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolveGrout13Fixture } from "./grout13-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = resolveGrout13Fixture(ROOT);
if (!fixture.modulePath || !fs.existsSync(fixture.modulePath)) {
    throw new Error("A local Grout13 module fixture is required to regenerate payloads.");
}
const grout13 = await import(pathToFileURL(fixture.modulePath).href);

function rect(steps, x, y, w, h, col) {
    steps.push({ type: "rect_filled", x, y, w, h, col });
}

function disc(steps, cx, cy, radius, col) {
    const pixel = 4;
    const x0 = Math.floor(cx - radius);
    const x1 = Math.ceil(cx + radius);
    const y0 = Math.floor(cy - radius);
    const y1 = Math.ceil(cy + radius);
    const radiusSquared = radius * radius;
    for (let y = y0; y <= y1; y += pixel) {
        let start = -1;
        for (let x = x0; x <= x1 + pixel; x += pixel) {
            const inside = x <= x1 && (x - cx) ** 2 + (y - cy) ** 2 <= radiusSquared;
            if (inside && start < 0) start = x;
            if (!inside && start >= 0) {
                rect(steps, start, y, x - start, pixel, col);
                start = -1;
            }
        }
    }
}

const tiers = [
    ["BERRY", 58, 0xff4f75, 0x9d2449, 0xffc2d0],
    ["PEACH", 68, 0xff9a62, 0xb94d38, 0xffd7b5],
    ["PLUM", 78, 0xb86bff, 0x6530a4, 0xe8c9ff],
    ["LEMON", 88, 0xffdc58, 0xb48516, 0xfff4b8],
    ["LIME", 98, 0x61e985, 0x198b4f, 0xc9ffda],
    ["MELON", 108, 0x47d7ff, 0x176b9d, 0xc1f4ff]
];

function fruitAsset([, size, body, shade, light], type) {
    const center = size / 2;
    const radius = size * 0.42;
    const steps = [];
    disc(steps, center, center + 3, radius + 4, 0x251b38);
    disc(steps, center + 3, center + 6, radius, shade);
    disc(steps, center - 2, center, radius - 3, body);
    disc(steps, center - radius * 0.28, center - radius * 0.30, Math.max(6, radius * 0.21), light);
    rect(steps, Math.floor(center - 2), 0, 5, Math.max(8, size * 0.18 | 0), 0x69432e);
    rect(steps, Math.floor(center + 2), 5, Math.max(8, size * 0.18 | 0), 5, 0x67dc75);
    rect(steps, Math.floor(center + 5), 9, Math.max(6, size * 0.13 | 0), 4, 0x2f9d55);
    return { name: `fruit-${type}`, spec: { w: size, h: size, steps } };
}

function circleAsset(name, size, rings) {
    const steps = [];
    const center = size / 2;
    for (const [radius, color, dx = 0, dy = 0] of rings) disc(steps, center + dx, center + dy, radius, color);
    return { name, spec: { w: size, h: size, steps } };
}

const fruitAssets = tiers.map(fruitAsset);
const cue = circleAsset("cue", 64, [[30, 0x26243b], [27, 0xf4fbff], [8, 0xbfeeff, -9, -10]]);
rect(cue.spec.steps, 15, 42, 34, 4, 0xc9d4e3);
fruitAssets.push(
    cue,
    circleAsset("disc", 32, [[15, 0xffffff]]),
    { name: "spark", spec: { w: 24, h: 24, steps: [
        { type: "rect_filled", x: 10, y: 0, w: 4, h: 24, col: 0xffffff },
        { type: "rect_filled", x: 0, y: 10, w: 24, h: 4, col: 0xffffff },
        { type: "rect_filled", x: 6, y: 6, w: 12, h: 12, col: 0xffffff }
    ] } },
    circleAsset("aim-dot", 16, [[7, 0x4b4d68], [4, 0xffffff]])
);

const stackAssets = [
    { name: "checker", spec: { w: 32, h: 32, steps: [
        { type: "rect_filled", x: 0, y: 0, w: 16, h: 16, col: 0x101522 },
        { type: "rect_filled", x: 16, y: 16, w: 16, h: 16, col: 0x101522 },
        { type: "rect_filled", x: 16, y: 0, w: 16, h: 16, col: 0x182236 },
        { type: "rect_filled", x: 0, y: 16, w: 16, h: 16, col: 0x182236 }
    ] } },
    { name: "player", spec: { w: 48, h: 48, steps: [
        { type: "rect_filled", x: 4, y: 8, w: 40, h: 36, col: 0x3b2f1f },
        { type: "rect_filled", x: 8, y: 4, w: 32, h: 36, col: 0xffd84f },
        { type: "rect_filled", x: 12, y: 8, w: 24, h: 24, col: 0xffef91 },
        { type: "rect_filled", x: 14, y: 14, w: 6, h: 6, col: 0x182236 },
        { type: "rect_filled", x: 28, y: 14, w: 6, h: 6, col: 0x182236 },
        { type: "rect_filled", x: 16, y: 28, w: 16, h: 4, col: 0xa26f16 }
    ] } },
    { name: "target", spec: { w: 24, h: 24, steps: [
        { type: "rect_filled", x: 10, y: 0, w: 4, h: 24, col: 0x71f6ff },
        { type: "rect_filled", x: 0, y: 10, w: 24, h: 4, col: 0x71f6ff },
        { type: "rect_filled", x: 6, y: 6, w: 12, h: 12, col: 0xffffff }
    ] } },
    { name: "marker", spec: { w: 40, h: 40, steps: [
        { type: "rect_filled", x: 0, y: 0, w: 40, h: 8, col: 0xffffff },
        { type: "rect_filled", x: 0, y: 0, w: 8, h: 40, col: 0xffffff },
        { type: "rect_filled", x: 32, y: 0, w: 8, h: 40, col: 0xffffff },
        { type: "rect_filled", x: 0, y: 32, w: 40, h: 8, col: 0xffffff }
    ] } },
    { name: "logo", spec: { w: 64, h: 64, steps: [
        { type: "rect_filled", x: 8, y: 8, w: 48, h: 48, col: 0x15233a },
        { type: "rect_filled", x: 12, y: 12, w: 40, h: 40, col: 0x56d4ff },
        { type: "rect_filled", x: 20, y: 4, w: 24, h: 56, col: 0xffdf5c },
        { type: "rect_filled", x: 4, y: 20, w: 56, h: 24, col: 0xffdf5c },
        { type: "rect_filled", x: 24, y: 24, w: 16, h: 16, col: 0xffffff }
    ] } }
];

function compilePayload(assets, atlasOptions) {
    return grout13.compileGrout13Atlas(assets, {
        strict: true,
        runtimeTarget: "canvas",
        runtimeDrawMode: "row",
        runtimeFrameMode: "object",
        atlasOptions
    }).payload;
}

function writePayload(relativePath, exportName, payload) {
    const target = path.join(ROOT, relativePath);
    const source = `// Generated by scripts/generate-grout13-payloads.mjs. Do not hand-edit.\nexport const ${exportName} = Object.freeze(${JSON.stringify(payload)});\n`;
    fs.writeFileSync(target, source, "utf8");
}

writePayload("examples/fruit-shot/atlas-payload.js", "FRUIT_SHOT_ATLAS_PAYLOAD", compilePayload(fruitAssets, { maxWidth: 512, maxHeight: 512 }));
writePayload("examples/fruit-shot/canvas-stack-payload.js", "CANVAS_STACK_ATLAS_PAYLOAD", compilePayload(stackAssets, { maxWidth: 256, maxHeight: 256 }));
console.log("[ok] Generated Fruit Shot and canvas-stack Grout13 atlas payloads.");
