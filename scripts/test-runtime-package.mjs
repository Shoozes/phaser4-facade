#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = ROOT;
const PACKAGE_JSON = path.join(ROOT, "package.json");

function fail(message) {
    throw new Error(message);
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function requireFile(relativePath) {
    const filePath = path.join(PACKAGE_ROOT, relativePath);
    if (!fs.existsSync(filePath)) fail(`missing package file: ${relativePath}`);
}

function assertSyntax(relativePath) {
    const filePath = path.join(PACKAGE_ROOT, relativePath);
    const result = spawnSync(process.execPath, ["--check", filePath], {
        cwd: ROOT,
        encoding: "utf8"
    });
    if (result.status !== 0) {
        fail(`generated runtime artifact failed syntax check: ${relativePath}\n${result.stderr || result.stdout}`);
    }
}

function assertNoUnresolvedRuntimeAliases(relativePath) {
    const filePath = path.join(PACKAGE_ROOT, relativePath);
    const source = fs.readFileSync(filePath, "utf8");
    if (/\bnormalizeDelayMsFromInput\b/.test(source)) {
        fail(`generated runtime artifact contains an unresolved imported alias: ${relativePath}`);
    }
}

function assertNoImageAssets(relativePath) {
    const root = path.join(PACKAGE_ROOT, relativePath);
    if (!fs.existsSync(root)) return;
    const stack = [root];
    while (stack.length > 0) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const filePath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(filePath);
                continue;
            }
            if (/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(entry.name)) {
                fail(`facade package docs/examples must remain procedural; image asset found: ${path.relative(PACKAGE_ROOT, filePath)}`);
            }
        }
    }
}

function assertNoImageReferences(relativePath) {
    const root = path.join(PACKAGE_ROOT, relativePath);
    if (!fs.existsSync(root)) return;
    const stack = [root];
    const imageReference = /(?:src|href|url)\s*\(?\s*["']?[^"')\s]+\.(?:png|jpe?g|gif|webp|avif|svg)(?:[?#][^"')\s]*)?["']?\s*\)?/i;
    while (stack.length > 0) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const filePath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(filePath);
                continue;
            }
            if (!/\.(html?|css|js|mjs|md|txt)$/i.test(entry.name)) continue;
            if (imageReference.test(fs.readFileSync(filePath, "utf8"))) {
                fail(`facade package docs/examples must remain procedural; image reference found: ${path.relative(PACKAGE_ROOT, filePath)}`);
            }
        }
    }
}

const pkg = readJson(PACKAGE_JSON);
if (pkg.name !== "phaser4-facade") fail(`unexpected package name: ${pkg.name}`);
if (pkg.license !== "MIT") fail("facade package must remain MIT licensed.");
if (pkg.type !== "module") fail("facade package must remain an ES module.");
if (pkg.publishConfig?.access !== "public") fail("facade package must publish with public access.");
if (pkg.repository?.url !== "git+https://github.com/Shoozes/phaser4-facade.git") {
    fail("facade package repository must point at the public phaser4-facade repository.");
}

const requiredExports = [".", "./global", "./global.min.js", "./types", "./package.json"];
for (const exportName of requiredExports) {
    if (!pkg.exports?.[exportName]) fail(`facade package missing export: ${exportName}`);
}

for (const relativePath of [
    "LICENSE",
    "README.md",
    "SKILL.md",
    "llms.txt",
    "docs/getting-started.md",
    "docs/how-to-procedural-ui.md",
    "examples/README.md",
    "dist/gm-phaser4.module.js",
    "dist/gm-phaser4.global.js",
    "dist/gm-phaser4.global.min.js",
    "dist/gm-phaser4.d.ts"
]) {
    requireFile(relativePath);
}

const moduleExample = fs.readFileSync(path.join(PACKAGE_ROOT, "examples", "prototype-module.html"), "utf8");
if (!moduleExample.includes('import "../dist/gm-phaser4.module.js"')) {
    fail("module example must use the packaged dist module entrypoint.");
}

for (const artifact of [
    "dist/gm-phaser4.module.js",
    "dist/gm-phaser4.global.js",
    "dist/gm-phaser4.global.min.js"
]) {
    assertSyntax(artifact);
    assertNoUnresolvedRuntimeAliases(artifact);
}

assertNoImageAssets("examples");
assertNoImageAssets("docs");
assertNoImageReferences("examples");
assertNoImageReferences("docs");
console.log("[ok] Public phaser4-facade package contract passed.");
