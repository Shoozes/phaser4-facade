#!/usr/bin/env node
import assert from "node:assert/strict";
import { createWorldLayerManager } from "../src/core/render-layers.js";

function displayObject() {
    return {
        setVisible() { return this; },
        setPosition() { return this; },
        setOrigin() { return this; },
        setAlpha() { return this; },
        setAngle() { return this; },
        setScale() { return this; },
        setBlendMode() { return this; },
        clearMask() { return this; },
        setCrop() { return this; }
    };
}

function container() {
    const value = displayObject();
    value.list = [];
    value.setDepth = (depth) => {
        value.depth = depth;
        return value;
    };
    value.add = (items) => {
        value.list.push(...(Array.isArray(items) ? items : [items]));
        return value;
    };
    return value;
}

const scene = {
    add: {
        container,
        graphics: displayObject,
        text: displayObject,
        sprite: displayObject
    }
};
const world = container();
const state = { world, worldLayers: new Map() };
const manager = createWorldLayerManager(scene, state);

manager.ensure("late", 20);
manager.ensure("world", 0);
manager.ensure("actors", 10);
assert.deepEqual(
    world.list.map((item) => [...state.worldLayers.values()].find((layer) => layer.container === item)?.name),
    ["world", "actors", "late"],
    "world-layer children should render by registered depth, not first-use order"
);

manager.ensure("late", -10);
assert.deepEqual(
    world.list.map((item) => [...state.worldLayers.values()].find((layer) => layer.container === item)?.name),
    ["late", "world", "actors"],
    "changing a layer depth should reorder its effective render position"
);

manager.ensure("same-depth-first", 30);
manager.ensure("same-depth-second", 30);
assert.deepEqual(
    world.list.map((item) => [...state.worldLayers.values()].find((layer) => layer.container === item)?.name),
    ["late", "world", "actors", "same-depth-first", "same-depth-second"],
    "equal-depth layers should retain stable creation order"
);

console.log("[ok] World layer depth ordering tests passed.");
