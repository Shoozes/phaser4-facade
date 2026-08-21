#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(ROOT, "examples", "virtual-joystick.html");
const html = fs.readFileSync(file, "utf8");

for (const marker of [
    "GM.input.createVirtualJoystick",
    "GM.gui.layer(\"controls\")",
    "viewport.safeScreenRect",
    "movementFixed.setEnabled",
    "movementDynamic.setEnabled",
    "GM.input.keyDown",
    "GM.ui.notice",
    "pointerKinds",
    "__virtualJoystickProof"
]) {
    assert.ok(html.includes(marker), `virtual joystick example is missing ${marker}`);
}
assert.equal(/<button\b|<input\b|<select\b|<textarea\b/i.test(html), false, "example must not add DOM controls");
assert.equal(/\.(?:png|jpe?g|gif|webp|svg)(?:[?#'"\s])/i.test(html), false, "example must remain procedural");
assert.equal((html.match(/<canvas\b/gi) || []).length, 0, "Phaser must own the canvas");
console.log("[ok] Virtual joystick example contract passed.");
