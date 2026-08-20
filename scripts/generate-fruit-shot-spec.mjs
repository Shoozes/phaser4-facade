#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_FRUIT_SHOT } from "../examples/fruit-shot/config.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(ROOT, "examples", "fruit-shot-grout13.html");
const START = "/* fruit-shot-spec:start */";
const END = "/* fruit-shot-spec:end */";

function formatGameBlock() {
    const game = DEFAULT_FRUIT_SHOT;
    return [
        START,
        "                const GAME = Object.freeze({",
        `                    viewport: { width: ${game.viewport.width}, height: ${game.viewport.height} },`,
        `                    hudHeight: ${game.hudHeight},`,
        `                    dangerY: ${game.dangerY},`,
        `                    floorY: ${game.floorY},`,
        `                    cueY: ${game.cueY},`,
        `                    launcher: { cueRadius: ${game.launcher.cueRadius}, cueBottomMargin: ${game.launcher.cueBottomMargin}, minimumFruitGap: ${game.launcher.minimumFruitGap} }`,
        "                });",
        "                " + END
    ].join("\n");
}

const html = fs.readFileSync(TARGET, "utf8");
const start = html.indexOf(START);
const end = html.indexOf(END);
if (start < 0 || end < 0 || end < start) {
    if (html.includes('import { DEFAULT_FRUIT_SHOT as GAME } from "fruit-shot/config";') && html.includes("GAME.floorY")) {
        console.log("[ok] Fruit Shot Grout13 module example consumes the shared GAME spec.");
        process.exit(0);
    }
    throw new Error("fruit-shot-grout13.html is missing the fruit-shot-spec markers or shared GAME config import.");
}
const next = html.slice(0, start) + formatGameBlock() + html.slice(end + END.length);
if (next !== html) fs.writeFileSync(TARGET, next);

const written = fs.readFileSync(TARGET, "utf8");
assert.ok(written.includes(`floorY: ${DEFAULT_FRUIT_SHOT.floorY}`));
assert.ok(written.includes(`dangerY: ${DEFAULT_FRUIT_SHOT.dangerY}`));
assert.ok(written.includes(`cueY: ${DEFAULT_FRUIT_SHOT.cueY}`));
assert.equal(written.includes("runtime-data"), false);

console.log("[ok] Fruit Shot Grout13 HTML GAME spec matches examples/fruit-shot/config.js.");
