// @ts-check

import Phaser from "phaser";
import { installGMRuntime } from "./gm-phaser4.js";

/** @type {typeof globalThis & { Phaser?: { Game?: unknown, Scene?: unknown } }} */
const runtimeRoot = globalThis;

if (!runtimeRoot.Phaser) {
    runtimeRoot.Phaser = Phaser;
}

if (!runtimeRoot.Phaser || typeof runtimeRoot.Phaser.Game !== "function" || typeof runtimeRoot.Phaser.Scene !== "function") {
    throw new Error("gm-phaser4 module entrypoint requires a usable Phaser instance.");
}

const PhaserRuntime = /** @type {{ Game: new (...args: unknown[]) => unknown, Scene: new (...args: unknown[]) => unknown }} */ (runtimeRoot.Phaser);
installGMRuntime(runtimeRoot, PhaserRuntime);
