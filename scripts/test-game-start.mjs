#!/usr/bin/env node
import assert from "node:assert/strict";
import { createGameStarter } from "../src/core/game-start.js";

function makeStyle() {
    const values = new Map();
    return {
        setProperty(name, value, priority = "") { values.set(name, { value: String(value), priority }); },
        getPropertyValue(name) { return values.get(name)?.value || ""; },
        getPropertyPriority(name) { return values.get(name)?.priority || ""; },
        removeProperty(name) { values.delete(name); }
    };
}

const html = { style: makeStyle() };
const body = { style: makeStyle() };
const parent = {
    style: makeStyle(),
    getBoundingClientRect() { return { width: 480, height: 320 }; }
};
const root = {
    Phaser: {},
    innerWidth: 1024,
    innerHeight: 768,
    document: {
        documentElement: html,
        body,
        getElementById(id) { return id === "game" ? parent : null; },
        querySelector(selector) {
            if (selector === "#[") throw new SyntaxError("invalid selector");
            return parent;
        }
    }
};
let globalsDisposed = 0;
let gameAttempts = 0;
const Phaser = {
    AUTO: 0,
    CANVAS: 1,
    WEBGL: 2,
    Scale: { RESIZE: 3, CENTER_BOTH: 4 },
    Game: class {
        constructor() {
            gameAttempts += 1;
            throw new Error("simulated Phaser startup failure");
        }
    }
};

const start = createGameStarter({
    root,
    Phaser,
    makeScene() { return {}; },
    installGlobals() {
        return () => { globalsDisposed += 1; };
    }
});

assert.throws(
    () => start({ host: "fullscreen", parent: "game", globals: true }),
    /simulated Phaser startup failure/
);
assert.equal(gameAttempts, 1);
assert.equal(globalsDisposed, 1, "failed startup must dispose installed globals");
assert.equal(html.style.getPropertyValue("overflow-x"), "");
assert.equal(html.style.getPropertyValue("overflow-y"), "");
assert.equal(body.style.getPropertyValue("position"), "");
assert.equal(parent.style.getPropertyValue("touch-action"), "");

assert.throws(
    () => start({ host: "fullscreen", parent: "#[", globals: true }),
    /invalid selector|Failed to execute|not a valid selector/i
);
assert.equal(globalsDisposed, 2, "selector startup failure must dispose installed globals");
assert.equal(html.style.getPropertyValue("overflow-x"), "");
assert.equal(body.style.getPropertyValue("overflow-y"), "");

console.log("game starter rollback contract passed");
