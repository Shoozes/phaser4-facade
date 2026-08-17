// @ts-check

/**
 * @typedef {{
 *   viewport: { width: number, height: number },
 *   regions: { hudHeight: number, launcherHeight: number, dangerY: number },
 *   launcher: { cueRadius: number, cueBottomMargin: number, minimumFruitGap: number },
 *   tiers: Array<{ frame: string, score: number }>
 * }} FruitShotSpec
 */

/**
 * @param {FruitShotSpec} spec
 */
export function defineFruitShot(spec) {
    const width = Number(spec.viewport.width);
    const height = Number(spec.viewport.height);
    const hudHeight = Number(spec.regions.hudHeight);
    const launcherHeight = Number(spec.regions.launcherHeight);
    const dangerY = Number(spec.regions.dangerY);
    const cueRadius = Number(spec.launcher.cueRadius);
    const cueBottomMargin = Number(spec.launcher.cueBottomMargin);
    const minimumFruitGap = Number(spec.launcher.minimumFruitGap);
    const floorY = height - launcherHeight;
    const cueY = height - cueBottomMargin;
    const game = {
        viewport: { width, height },
        regions: { hudHeight, launcherHeight, dangerY },
        launcher: { cueRadius, cueBottomMargin, minimumFruitGap },
        tiers: spec.tiers.slice(),
        floorY,
        cueY,
        dangerY,
        hudHeight
    };
    assertFruitShot(game);
    return Object.freeze(game);
}

/**
 * @param {{
 *   hudHeight: number,
 *   dangerY: number,
 *   floorY: number,
 *   cueY: number,
 *   launcher: { cueRadius: number, minimumFruitGap: number }
 * }} game
 */
export function assertFruitShot(game) {
    if (!(game.hudHeight < game.dangerY)) throw new Error("Fruit Shot hudHeight must sit above dangerY.");
    if (!(game.dangerY < game.floorY)) throw new Error("Fruit Shot dangerY must sit above floorY.");
    if (!(game.floorY < game.cueY)) throw new Error("Fruit Shot floorY must sit above cueY.");
    const launchRoom = game.cueY - game.floorY;
    const needed = game.launcher.cueRadius * 2 + game.launcher.minimumFruitGap;
    if (launchRoom < needed) {
        throw new Error("Fruit Shot launcher gap is too small for the cue and minimum fruit clearance.");
    }
}

export const DEFAULT_FRUIT_SHOT = defineFruitShot({
    viewport: { width: 720, height: 720 },
    regions: { hudHeight: 74, launcherHeight: 220, dangerY: 160 },
    launcher: { cueRadius: 31, cueBottomMargin: 80, minimumFruitGap: 70 },
    tiers: [
        { frame: "fruit-0", score: 25 },
        { frame: "fruit-1", score: 55 },
        { frame: "fruit-2", score: 105 },
        { frame: "fruit-3", score: 190 },
        { frame: "fruit-4", score: 330 },
        { frame: "fruit-5", score: 560 }
    ]
});
