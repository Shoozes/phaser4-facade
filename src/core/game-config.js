// @ts-check

/**
 * @param {Record<string, unknown>} cfg
 * @returns {{
 *   pixelArt: boolean,
 *   antialias: boolean,
 *   antialiasGL: boolean,
 *   roundPixels: boolean
 * }}
 */
export function resolveRenderQuality(cfg) {
    const pixelArt = cfg.renderQuality === "pixel-art" || cfg.pixelArt === true;
    const antialias = cfg.antialias === undefined ? !pixelArt : !!cfg.antialias;
    const roundPixels = cfg.roundPixels === undefined ? pixelArt : !!cfg.roundPixels;

    return {
        pixelArt,
        antialias,
        antialiasGL: antialias,
        roundPixels
    };
}
