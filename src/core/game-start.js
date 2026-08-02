// @ts-check

import { DEFAULTS } from "./constants.js";
import { resolveRenderQuality } from "./game-config.js";
import { toColor } from "./math.js";

/**
 * @param {Record<string, any> | undefined} config
 */
function mergeConfig(config) {
    return Object.assign({}, DEFAULTS, config || {});
}

/**
 * @param {{ root: any, Phaser: any, makeScene: (config: any) => any, installGlobals: () => void }} deps
 */
export function createGameStarter({ root, Phaser, makeScene, installGlobals }) {
    /**
     * @param {Record<string, any>} [config]
     */
    return function start(config) {
        if (!root.Phaser) {
            throw new Error("Phaser must be loaded before gm-phaser4.js starts a game.");
        }

        const cfg = mergeConfig(config);
        if (cfg.globals) installGlobals();
        const renderQuality = resolveRenderQuality(cfg);

        return new Phaser.Game({
            type: Phaser.AUTO,
            parent: cfg.parent,
            width: root.innerWidth,
            height: root.innerHeight,
            backgroundColor: toColor(cfg.background),
            pixelArt: renderQuality.pixelArt,
            antialias: renderQuality.antialias,
            antialiasGL: renderQuality.antialiasGL,
            roundPixels: renderQuality.roundPixels,
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            scene: makeScene(cfg)
        });
    };
}
