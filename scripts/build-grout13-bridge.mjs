#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleRuntimeSource } from "./esbuild-runtime.mjs";
import { minifyJavaScript } from "./runtime-minifier.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const moduleEntry = fs.readFileSync(path.join(ROOT, "src", "index.grout13.js"), "utf8");
const globalEntry = fs.readFileSync(path.join(ROOT, "src", "index.grout13.global.js"), "utf8");

const moduleBundle = await bundleRuntimeSource({
    root: ROOT,
    contents: moduleEntry,
    sourcefile: "src/index.grout13.js",
    format: "esm"
});
const globalBundle = await bundleRuntimeSource({
    root: ROOT,
    contents: globalEntry,
    sourcefile: "src/index.grout13.global.js",
    format: "iife"
});

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, "gm-phaser4-grout13.module.js"), moduleBundle, "utf8");
fs.writeFileSync(path.join(DIST, "gm-phaser4-grout13.global.js"), globalBundle, "utf8");
fs.writeFileSync(
    path.join(DIST, "gm-phaser4-grout13.global.min.js"),
    await minifyJavaScript(globalBundle, "gm-phaser4-grout13.global.js"),
    "utf8"
);
fs.copyFileSync(path.join(ROOT, "types", "grout13.d.ts"), path.join(DIST, "grout13.d.ts"));

console.log("[ok] Grout13 bridge artifacts generated in dist");
