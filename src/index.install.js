// @ts-check

import * as PhaserImport from "phaser";
import { installGMRuntime } from "./gm-phaser4.js";

/**
 * Resolve Phaser from either namespace or default-export package shapes.
 * @param {any} mod
 */
function resolvePhaserLibrary(mod) {
    if (mod && typeof mod.Game === "function" && typeof mod.Scene === "function") {
        return mod;
    }
    const fallback = mod && mod.default;
    if (fallback && typeof fallback.Game === "function" && typeof fallback.Scene === "function") {
        return fallback;
    }
    throw new Error("gm-phaser4 install entrypoint requires a usable Phaser package export (Game + Scene).");
}

const PhaserRuntime = resolvePhaserLibrary(PhaserImport);

/**
 * Install the facade into an explicitly selected root without mutating the
 * host global merely by importing this entrypoint.
 * @param {typeof globalThis} [root]
 * @param {unknown} [Phaser]
 */
export function createGMRuntime(root = globalThis, Phaser = PhaserRuntime) {
    return installGMRuntime(root, /** @type {any} */ (Phaser));
}

export { installGMRuntime };
