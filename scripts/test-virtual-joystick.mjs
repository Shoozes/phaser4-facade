#!/usr/bin/env node
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { createVirtualJoystick } = await import(pathToFileURL(path.join(ROOT, "src", "core", "virtual-joystick.js")));

let now = 0;
const pointers = new Map();
const calls = [];
const drawn = [];
const viewport = {
    safeScreenRect: { x: 0, y: 0, width: 640, height: 360 }
};
const gui = {
    layer(name) { drawn.push(["layer", name]); },
    circle(...args) { drawn.push(["circle", ...args]); },
    line(...args) { drawn.push(["line", ...args]); }
};

function addPointer(id, x, y, kind = "touch") {
    const pointer = {
        id: String(id),
        screenX: x,
        screenY: y,
        kind,
        down: true,
        active: true,
        pressed: true,
        released: false,
        owner: null
    };
    pointers.set(pointer.id, pointer);
    return pointer;
}

function makeDeps(pointerStore = pointers) {
    return {
        activePointers: () => Array.from(pointerStore.values()),
        capturePointer(id, owner) {
            calls.push(["capture", id, owner]);
            pointerStore.get(String(id)).owner = owner;
        },
        releasePointer(id, owner) {
            calls.push(["release", id, owner]);
            const pointer = pointerStore.get(String(id));
            if (pointer) pointer.owner = null;
        },
        inputBlocked: () => false,
        currentTime: () => now,
        viewport: () => viewport,
        gui
    };
}

const fixed = createVirtualJoystick({
    id: "movement",
    mode: "fixed",
    radius: 72,
    deadzone: 0.14,
    layout: () => ({
        origin: { x: 100, y: 260 },
        zone: { x: 0, y: 120, width: 320, height: 240 }
    })
}, makeDeps());

const first = addPointer("left", 100, 260);
fixed.update();
assert.equal(fixed.active, true);
assert.equal(fixed.pressed, true);
assert.equal(fixed.pointerId, "left");
assert.deepEqual(fixed.origin, { x: 100, y: 260 });

first.pressed = false;
first.screenX = 250;
first.screenY = 260;
now = 100;
fixed.update();
assert.equal(fixed.pointerPosition.x, 250);
assert.equal(fixed.distance, 150);
assert.equal(fixed.clampedDistance, 72);
assert.equal(fixed.knobPosition.x, 172);
assert.equal(fixed.knobPosition.y, 260);
assert.ok(Math.abs(fixed.vector.x - 1) < 0.001);
assert.equal(fixed.directionDeg, 0);
fixed.draw();
assert.equal(drawn[0][0], "layer");
assert.equal(drawn[0][1], "controls");
assert.ok(drawn.some((entry) => entry[0] === "line"));

const second = addPointer("right", 560, 260);
const dynamic = createVirtualJoystick({
    id: "aim",
    mode: "dynamic",
    radius: 60,
    pointerKinds: ["touch"],
    layout: () => ({
        zone: { x: 320, y: 120, width: 320, height: 240 }
    })
}, makeDeps());
dynamic.update();
assert.equal(dynamic.active, true);
assert.equal(dynamic.pointerId, "right");
assert.deepEqual(dynamic.origin, { x: 560, y: 260 });
assert.equal(fixed.pointerId, "left", "a second joystick must not steal the first pointer");

second.pressed = false;
second.screenX = 500;
now = 200;
dynamic.update();
assert.equal(dynamic.vector.x < 0, true);
assert.equal(dynamic.directionDeg, 180);

const blocked = addPointer("blocked", 140, 260);
blocked.owner = "button";
const horizontal = createVirtualJoystick({
    axis: "horizontal",
    layout: () => ({ origin: { x: 140, y: 260 }, zone: { x: 0, y: 0, width: 320, height: 360 } })
}, makeDeps());
horizontal.update();
assert.equal(horizontal.active, false, "an already-owned pointer must remain available to its owner");
blocked.owner = null;
horizontal.update();
assert.equal(horizontal.active, true);
blocked.pressed = false;
blocked.screenX = 140;
blocked.screenY = 340;
now = 300;
horizontal.update();
assert.equal(horizontal.vector.y, 0, "horizontal axis lock must suppress vertical output");

const fadePointers = new Map();
let fadeNow = 0;
const fading = createVirtualJoystick({
    visibility: "active",
    fadeInMs: 90,
    fadeOutMs: 150,
    layout: () => ({ origin: { x: 80, y: 80 }, zone: { x: 0, y: 0, width: 200, height: 200 } })
}, {
    ...makeDeps(fadePointers),
    currentTime: () => fadeNow
});
const fadePointer = {
    id: "fade",
    screenX: 80,
    screenY: 80,
    kind: "touch",
    down: true,
    active: true,
    pressed: true,
    released: false,
    owner: null
};
fadePointers.set("fade", fadePointer);
fading.update();
fadeNow = 30;
fading.update();
const opacityAt30 = fading.opacity;
fading.draw();
assert.equal(fading.opacity, opacityAt30, "repeated draw at one timestamp must not advance fade");
fadeNow = 90;
fading.update();
assert.ok(Math.abs(fading.opacity - 0.82) < 0.001);
fadePointer.down = false;
fadePointer.released = true;
fadeNow = 540;
fading.update();
assert.equal(fading.released, true);
fadeNow = 690;
fading.update();
assert.ok(fading.opacity < 0.01, "fade-out must use elapsed time, not draw-call count");

fixed.reset();
dynamic.destroy();
horizontal.destroy();
fading.destroy();
assert.deepEqual(calls.filter(([kind]) => kind === "release").map(([, id]) => id).sort(), ["blocked", "fade", "left", "right"].sort());
console.log("[ok] Virtual joystick contract tests passed.");
