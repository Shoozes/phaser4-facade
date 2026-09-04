// @ts-check

import { makeSpritePool, makeTextPool } from "./pools.js";

/**
 * Owns the runtime's named world-layer containers and their pooled draw objects.
 * @param {any} scene
 * @param {any} state
 */
export function createWorldLayerManager(scene, state) {
    let nextCreationIndex = 0;

    function sortWorldLayers() {
        const children = Array.isArray(state.world?.list)
            ? state.world.list
            : Array.isArray(state.world?.children) ? state.world.children : null;
        if (!children) return;

        const managed = Array.from(state.worldLayers.values())
            .sort((left, right) => left.depth - right.depth || left.creationIndex - right.creationIndex);
        const managedContainers = new Set(managed.map((layer) => layer.container));
        let nextManagedIndex = 0;
        for (let index = 0; index < children.length; index += 1) {
            if (managedContainers.has(children[index])) {
                children[index] = managed[nextManagedIndex].container;
                nextManagedIndex += 1;
            }
        }
    }

    /** @param {string} name @param {number | undefined} depth */
    function ensure(name, depth) {
        const layerName = String(name || "world");
        let layer = state.worldLayers.get(layerName);
        if (!layer) {
            const container = scene.add.container(0, 0);
            container.setDepth(Number.isFinite(depth) ? depth : 0);
            const gfx = scene.add.graphics();
            container.add(gfx);
            layer = {
                name: layerName,
                depth: Number.isFinite(depth) ? depth : 0,
                creationIndex: nextCreationIndex,
                container,
                gfx,
                text: makeTextPool(scene, container, state),
                sprites: makeSpritePool(scene, container, state)
            };
            state.world.add(container);
            state.worldLayers.set(layerName, layer);
            nextCreationIndex += 1;
            sortWorldLayers();
        } else if (Number.isFinite(depth) && layer.depth !== depth) {
            layer.depth = depth;
            layer.container.setDepth(depth);
            sortWorldLayers();
        }
        return layer;
    }

    /** @param {string} name @param {number} [depth] */
    function select(name, depth) {
        const layer = ensure(name, depth);
        state.activeWorldLayer = layer.name;
        state.activeWorldContainer = layer.container;
        state.worldGfx = layer.gfx;
        state.worldText = layer.text;
        state.worldSprites = layer.sprites;
        return layer;
    }

    function beginFrame() {
        for (const layer of state.worldLayers.values()) {
            layer.gfx.clear();
            layer.text.begin();
            layer.sprites.begin();
        }
    }

    function publishTextDiagnostics() {
        state.worldText = {
            items: Array.from(state.worldLayers.values()).flatMap((layer) => layer.text.items || [])
        };
    }

    return { beginFrame, ensure, publishTextDiagnostics, select };
}
