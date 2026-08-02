// @ts-check

// Runtime global entrypoint:
// this validates `window.Phaser` first. `build-runtime.mjs` combines this file
// with the runtime implementation, so keep this file as a pure bootstrap check.
/** @type {typeof globalThis & { Phaser?: { Game?: unknown, Scene?: unknown } }} */
const runtimeRoot = globalThis;

/**
 * @param {typeof globalThis & { Phaser?: { Game?: unknown, Scene?: unknown } }} root
 */
(function (root) {
    "use strict";

    if (!root.Phaser || typeof root.Phaser.Game !== "function" || typeof root.Phaser.Scene !== "function") {
        throw new Error("gm-phaser4 global entrypoint requires a global Phaser runtime before loading gm-phaser4.");
    }

    const Phaser = /** @type {{ Game: new (...args: unknown[]) => unknown, Scene: new (...args: unknown[]) => unknown }} */ (root.Phaser);
    installGMRuntime(root, Phaser);
})(runtimeRoot);
