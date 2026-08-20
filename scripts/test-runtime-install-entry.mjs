#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previousGM = globalThis.GM;
const previousPhaser = globalThis.Phaser;
try {
    delete globalThis.GM;
    delete globalThis.Phaser;
    const artifact = fs.readFileSync(path.join(ROOT, "dist", "gm-phaser4.install.module.js"), "utf8");
    const fakePhaserSource = "const PhaserImport = { Game: class Game {}, Scene: class Scene {}, GameObjects: { Container: class Container {} }, VERSION: \"test\" };";
    const source = artifact.replace('import * as PhaserImport from "phaser";', fakePhaserSource);
    assert.notEqual(source, artifact, "install artifact should retain a replaceable Phaser peer import");
    const entry = await import(`data:text/javascript,${encodeURIComponent(source)}`);
    assert.equal(globalThis.GM, undefined, "pure install entry must not install GM during import");
    assert.equal(globalThis.Phaser, undefined, "pure install entry must not install Phaser during import");

    const fakeRoot = {};
    const fakePhaser = { Game: class Game {}, Scene: class Scene {}, GameObjects: { Container: class Container {} }, VERSION: "test" };
    const facade = entry.createGMRuntime(fakeRoot, fakePhaser);
    assert.equal(fakeRoot.GM, facade, "explicit install should attach the facade to the selected root");
    assert.equal(fakeRoot.Phaser, fakePhaser, "explicit install should attach the selected Phaser to the root");
    assert.equal(typeof entry.installGMRuntime, "function");
    console.log("[ok] Pure runtime install entry contract passed.");
} finally {
    if (previousGM === undefined) delete globalThis.GM;
    else globalThis.GM = previousGM;
    if (previousPhaser === undefined) delete globalThis.Phaser;
    else globalThis.Phaser = previousPhaser;
}
