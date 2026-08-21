#!/usr/bin/env node
import assert from "node:assert/strict";
import { createScreenLayerManager } from "../src/core/screen-layers.js";

function chainable() {
    return {
        setDepth(value) { this.depth = value; return this; },
        setVisible() { return this; },
        setPosition() { return this; },
        setOrigin() { return this; },
        setScale() { return this; },
        clear() { this.cleared = true; return this; },
        add() { return this; }
    };
}

const scene = {
    add: {
        container() {
            const container = chainable();
            container.children = [];
            container.add = (items) => {
                for (const item of Array.isArray(items) ? items : [items]) {
                    if (item) container.children.push(item);
                }
                return container;
            };
            return container;
        },
        graphics: chainable,
        text: chainable,
        sprite: chainable
    }
};
const state = { screen: scene.add.container(), screenLayers: new Map(), activeScreenLayer: "hud" };
const manager = createScreenLayerManager(scene, state);

for (const [name, depth] of Object.entries({ hud: 0, controls: 100, overlay: 200, modal: 300, fade: 400, debug: 500 })) {
    manager.ensure(name, depth);
}

assert.deepEqual(manager.names(), ["hud", "controls", "overlay", "modal", "fade", "debug"]);
assert.deepEqual(Array.from(state.screenLayers.values()).map((layer) => layer.depth), [0, 100, 200, 300, 400, 500]);
manager.select("controls");
assert.equal(state.activeScreenLayer, "controls");
assert.equal(state.screenGfx, state.screenLayers.get("controls").gfx);
manager.beginFrame();
assert.equal(state.activeScreenLayer, "hud");
manager.publishTextDiagnostics();
assert.ok(Array.isArray(state.screenTextDiagnostics));
console.log("[ok] Screen layer ordering tests passed.");
