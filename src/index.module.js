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
    throw new Error("gm-phaser4 module entrypoint requires a usable Phaser package export (Game + Scene).");
}

const PhaserRuntime = resolvePhaserLibrary(PhaserImport);

/** @type {typeof globalThis & { Phaser?: { Game?: unknown, Scene?: unknown }, GM?: unknown }} */
const runtimeRoot = globalThis;

// Module consumers own the peer dependency. Only install onto root.Phaser when
// unset; never silently replace an unrelated global Phaser instance.
if (runtimeRoot.Phaser && typeof runtimeRoot.Phaser.Scene !== "function") {
    throw new Error("gm-phaser4 module entrypoint found an unusable global Phaser instance.");
}
if (runtimeRoot.Phaser && runtimeRoot.Phaser !== PhaserRuntime) {
    throw new Error("gm-phaser4 module entrypoint found a conflicting global Phaser instance.");
}

export { installGMRuntime };
export const GM = installGMRuntime(runtimeRoot, PhaserRuntime);
export default GM;
