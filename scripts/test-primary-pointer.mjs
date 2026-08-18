#!/usr/bin/env node
import assert from "node:assert/strict";
import {
    applyPointerDown,
    applyPointerRelease,
    createPointerRecord,
    endPointerFrame,
    pickPrimaryPointer,
    rememberPrimaryPointerId,
    resolvePrimaryPointer
} from "../src/core/input.js";

/**
 * @param {string} id
 * @param {number} x
 * @param {number} y
 * @param {{ kind?: string, button?: string }} [extra]
 */
function seed(id, x, y, extra = {}) {
    return {
        x,
        y,
        screenX: x,
        screenY: y,
        kind: extra.kind || "mouse",
        button: extra.button || "left",
        time: 1
    };
}

function createSession() {
    const pointers = new Map();
    /** @type {string | null} */
    let primaryId = null;

    /**
     * @param {string} id
     * @param {{ x: number, y: number }} coords
     * @param {{ down?: boolean, released?: boolean }} [flags]
     * @param {{ kind?: string, button?: string, owner?: string | null }} [extra]
     */
    function track(id, coords, flags = {}, extra = {}) {
        let record = pointers.get(id);
        if (!record) {
            record = createPointerRecord(id, seed(id, coords.x, coords.y, extra));
            pointers.set(id, record);
        } else {
            record.x = coords.x;
            record.y = coords.y;
            record.screenX = coords.x;
            record.screenY = coords.y;
            record.active = true;
            if (extra.kind) record.kind = extra.kind;
            if (extra.button) record.button = extra.button;
        }
        if (flags.down === true) applyPointerDown(record, { x: coords.x, y: coords.y, time: 1 });
        if (flags.released === true) applyPointerRelease(record);
        if (extra.owner !== undefined) record.owner = extra.owner;
        primaryId = rememberPrimaryPointerId(primaryId, pointers, id, flags);
        return record;
    }

    function endFrame() {
        for (const record of pointers.values()) endPointerFrame(record);
        const primary = primaryId ? pointers.get(primaryId) : null;
        if (!primary || (!primary.down && !primary.released && !primary.active)) {
            primaryId = null;
        }
    }

    return {
        pointers,
        track,
        endFrame,
        primary() {
            return resolvePrimaryPointer(primaryId, pointers);
        },
        active() {
            return Array.from(pointers.values()).filter((pointer) => pointer && pointer.active);
        }
    };
}

const mouse = createSession();
mouse.track("mouse-1", { x: 40, y: 50 }, { down: true }, { kind: "mouse" });
const mouseDown = mouse.primary();
assert.ok(mouseDown);
assert.equal(mouseDown.id, "mouse-1");
assert.equal(mouseDown.kind, "mouse");
assert.equal(mouseDown.down, true);
assert.equal(mouseDown.pressed, true);
assert.equal(mouseDown.released, false);
assert.equal(mouseDown.active, true);

mouse.track("mouse-1", { x: 48, y: 62 });
assert.equal(mouse.primary() && mouse.primary().id, "mouse-1");
assert.equal(mouse.primary() && mouse.primary().pressed, true);

mouse.endFrame();
const held = mouse.primary();
assert.ok(held);
assert.equal(held.id, "mouse-1");
assert.equal(held.down, true);
assert.equal(held.pressed, false);
assert.equal(held.released, false);

mouse.track("mouse-1", { x: 48, y: 62 }, { released: true });
const mouseUp = mouse.primary();
assert.ok(mouseUp);
assert.equal(mouseUp.id, "mouse-1");
assert.equal(mouseUp.down, false);
assert.equal(mouseUp.released, true);
assert.equal(mouseUp.active, true);
assert.equal(pickPrimaryPointer(mouse.active()) && pickPrimaryPointer(mouse.active()).id, "mouse-1");

mouse.endFrame();
assert.equal(mouse.primary(), null);
assert.equal(mouse.active().length, 0);

const touch = createSession();
touch.track("touch-1", { x: 10, y: 12 }, { down: true }, { kind: "touch" });
assert.equal(touch.primary() && touch.primary().kind, "touch");
assert.equal(touch.primary() && touch.primary().pressed, true);
touch.track("touch-1", { x: 14, y: 18 });
touch.endFrame();
touch.track("touch-1", { x: 14, y: 18 }, { released: true });
assert.equal(touch.primary() && touch.primary().released, true);
assert.equal(touch.primary() && touch.primary().kind, "touch");
touch.endFrame();
assert.equal(touch.primary(), null);

const captured = createSession();
captured.track("aim", { x: 100, y: 200 }, { down: true }, { kind: "mouse" });
captured.track("aim", { x: 100, y: 200 }, {}, { owner: "aim" });
assert.equal(captured.primary() && captured.primary().owner, "aim");
captured.endFrame();
captured.track("aim", { x: 110, y: 210 }, { released: true });
const releaseFrame = captured.primary();
assert.ok(releaseFrame);
assert.equal(releaseFrame.id, "aim");
assert.equal(releaseFrame.released, true);
assert.equal(releaseFrame.owner, "aim");
captured.track("aim", { x: 110, y: 210 }, {}, { owner: null });
assert.equal(captured.primary() && captured.primary().id, "aim");
assert.equal(captured.primary() && captured.primary().owner, null);
assert.equal(captured.primary() && captured.primary().released, true);
captured.endFrame();
assert.equal(captured.primary(), null);

const multi = createSession();
multi.track("first", { x: 8, y: 8 }, { down: true }, { kind: "touch" });
multi.endFrame();
multi.track("second", { x: 90, y: 12 }, { down: true }, { kind: "touch" });
assert.equal(multi.primary() && multi.primary().id, "first");
assert.equal(multi.primary() && multi.primary().down, true);
assert.equal(multi.pointers.get("second") && multi.pointers.get("second").down, true);
multi.track("first", { x: 8, y: 8 }, { released: true });
assert.equal(multi.primary() && multi.primary().id, "first");
assert.equal(multi.primary() && multi.primary().released, true);
assert.equal(multi.pointers.get("second") && multi.pointers.get("second").down, true);
multi.endFrame();
assert.equal(multi.primary() && multi.primary().id, "second");
assert.equal(multi.primary() && multi.primary().down, true);
multi.track("second", { x: 90, y: 12 }, { released: true });
assert.equal(multi.primary() && multi.primary().id, "second");
assert.equal(multi.primary() && multi.primary().released, true);
multi.endFrame();
assert.equal(multi.primary(), null);

console.log("[ok] primary-pointer press, release, capture, and multi-touch lifecycle contracts passed.");
