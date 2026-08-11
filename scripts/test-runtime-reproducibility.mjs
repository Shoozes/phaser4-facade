#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACTS = [
    "dist/gm-phaser4.module.js",
    "dist/gm-phaser4.global.js",
    "dist/gm-phaser4.global.min.js",
    "dist/gm-phaser4.d.ts",
    "dist/gm-phaser4-grout13.module.js",
    "dist/gm-phaser4-grout13.global.js",
    "dist/gm-phaser4-grout13.global.min.js",
    "dist/grout13.d.ts"
];

function digest(relativePath) {
    const file = path.join(ROOT, relativePath);
    return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const before = new Map(ARTIFACTS.map((file) => [file, digest(file)]));
const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "build-runtime.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "inherit"
});
if (result.status !== 0) process.exit(result.status || 1);

const changed = ARTIFACTS.filter((file) => before.get(file) !== digest(file));
if (changed.length > 0) {
    throw new Error(`Runtime build is not deterministic; changed artifacts: ${changed.join(", ")}`);
}
console.log(`[ok] Runtime dist reproducibility passed (${ARTIFACTS.length} artifacts).`);
