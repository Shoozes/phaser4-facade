#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message) {
    throw new Error(message);
}

const pkg = readJson("package.json");
const lock = readJson("package-lock.json");
const version = String(pkg.version || "").trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`package.json has no release version: ${version || "<missing>"}`);
if (String(lock.version || "") !== version || String(lock.packages?.[""].version || "") !== version) {
    fail(`package-lock.json root version does not match package.json ${version}.`);
}

const constants = read("src/core/constants.js");
const runtimeMatch = constants.match(/RUNTIME_VERSION\s*=\s*["']([^"']+)["']/);
if (!runtimeMatch || runtimeMatch[1] !== version) {
    fail(`src/core/constants.js RUNTIME_VERSION must match package version ${version}.`);
}

const versionedReferences = [
    "docs/getting-started.md",
    "examples/prototype-cdn.html",
    "examples/fruit-shot.html",
    "examples/fruit-shot-grout13.html",
    "examples/fruit-shot-modular.html"
];
const packageUrlPattern = /phaser4-facade@(\d+\.\d+\.\d+)/g;
for (const relativePath of versionedReferences) {
    const source = read(relativePath);
    for (const match of source.matchAll(packageUrlPattern)) {
        if (match[1] !== version) {
            fail(`${relativePath} references phaser4-facade@${match[1]}, expected ${version}.`);
        }
    }
}

const prototype = read("examples/prototype-cdn.html");
if (!prototype.includes(`const RUNTIME_VERSION = "${version}"`)) {
    fail(`examples/prototype-cdn.html must validate runtime version ${version}.`);
}

const migration = read("docs/migrations/0.2.0.md");
if (!/migration boundary, not a release/i.test(migration)) {
    fail("docs/migrations/0.2.0.md must remain explicit that 0.2.0 is not released.");
}

console.log(`[ok] Version consistency passed for phaser4-facade ${version}; 0.2.0 remains a documented migration boundary.`);
