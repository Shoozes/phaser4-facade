#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minifyJavaScript } from "./runtime-minifier.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const bridgeSource = fs.readFileSync(path.join(ROOT, "src", "bridges", "grout13.js"), "utf8")
    .replace(/^\s*export\s+function\s+/gm, "function ")
    .replace(/^\s*export\s+\{[^}]+\};?\s*$/gm, "")
    .trim();
const moduleEntry = fs.readFileSync(path.join(ROOT, "src", "index.grout13.js"), "utf8")
    .replace(/^\s*export\s+\{\s*installGrout13Bridge\s*\}\s+from\s+["']\.\/bridges\/grout13\.js["'];?\s*$/m, "")
    .trim();
const globalEntry = fs.readFileSync(path.join(ROOT, "src", "index.grout13.global.js"), "utf8")
    .replace(/^\s*import\s+\{\s*installGrout13Bridge\s*\}\s+from\s+["']\.\/bridges\/grout13\.js["'];?\s*/m, "")
    .trim();

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(
    path.join(DIST, "gm-phaser4-grout13.module.js"),
    `${bridgeSource}\n\n${moduleEntry}\nexport { installGrout13Bridge };\n`,
    "utf8"
);

const globalBundle = `(function () {\n"use strict";\n${bridgeSource}\n\n${globalEntry}\n})();\n`;
fs.writeFileSync(path.join(DIST, "gm-phaser4-grout13.global.js"), globalBundle, "utf8");
fs.writeFileSync(
    path.join(DIST, "gm-phaser4-grout13.global.min.js"),
    await minifyJavaScript(globalBundle, "gm-phaser4-grout13.global.js"),
    "utf8"
);
fs.copyFileSync(path.join(ROOT, "types", "grout13.d.ts"), path.join(DIST, "grout13.d.ts"));

console.log("[ok] Grout13 bridge artifacts generated in dist");
