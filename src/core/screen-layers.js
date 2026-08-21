// @ts-check

import { makeSpritePool, makeTextPool } from "./pools.js";

/**
 * Built-in screen-space planes. The parent screen container is already above
 * the world container, so the relative order here is the complete GUI order.
 */
export const DEFAULT_SCREEN_LAYERS = Object.freeze({
    hud: 0,
    controls: 100,
    overlay: 200,
    modal: 300,
    fade: 400,
    debug: 500
});

/**
 * Owns named screen-space containers and their pooled draw objects.
 * @param {any} scene
 * @param {any} state
 */
export function createScreenLayerManager(scene, state) {
    /** @param {unknown} name */
    function normalizeName(name) {
        const value = String(name || "hud").trim().toLowerCase();
        if (!value) throw new TypeError("GM.gui.layer requires a non-empty layer name.");
        return value;
    }

    /** @param {string} name @param {number | undefined} [depth] */
    function ensure(name, depth) {
        if (!state.screen) throw new Error("GM.gui.layer is unavailable before the runtime is mounted.");
        const layerName = normalizeName(name);
        let layer = state.screenLayers.get(layerName);
        if (!layer) {
            const defaultDepth = /** @type {Record<string, number | undefined>} */ (DEFAULT_SCREEN_LAYERS)[layerName];
            const layerDepth = Number.isFinite(depth)
                ? Number(depth)
                : Number.isFinite(defaultDepth)
                    ? defaultDepth
                    : state.screenLayers.size * 10;
            const container = scene.add.container(0, 0);
            container.setDepth(layerDepth);
            const gfx = scene.add.graphics();
            container.add(gfx);
            layer = {
                name: layerName,
                depth: layerDepth,
                container,
                gfx,
                text: makeTextPool(scene, container, state),
                sprites: makeSpritePool(scene, container, state)
            };
            state.screen.add(container);
            state.screenLayers.set(layerName, layer);
        } else if (Number.isFinite(depth) && layer.depth !== Number(depth)) {
            layer.depth = Number(depth);
            layer.container.setDepth(layer.depth);
        }
        return layer;
    }

    /** @param {string} name */
    function select(name) {
        const layer = ensure(name);
        state.activeScreenLayer = layer.name;
        state.screenGfx = layer.gfx;
        state.screenText = layer.text;
        state.screenSprites = layer.sprites;
        return layer;
    }

    function beginFrame() {
        for (const layer of state.screenLayers.values()) {
            layer.gfx.clear();
            layer.text.begin();
            layer.sprites.begin();
        }
        select("hud");
    }

    function publishTextDiagnostics() {
        state.screenTextDiagnostics = Array.from(state.screenLayers.values())
            .flatMap((layer) => layer.text.items || []);
    }

    return {
        beginFrame,
        ensure,
        publishTextDiagnostics,
        select,
        names() { return Array.from(state.screenLayers.keys()); }
    };
}
