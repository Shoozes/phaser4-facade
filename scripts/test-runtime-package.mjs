#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertPackageExportTargets } from "./package-export-contracts.mjs";

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
    if (/\b(?:normalizeDelayMsFromInput|computeModalInputBlockMs)\b/.test(source)) {
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
const constantsSource = fs.readFileSync(path.join(PACKAGE_ROOT, "src", "core", "constants.js"), "utf8");
const runtimeVersion = constantsSource.match(/RUNTIME_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
if (!runtimeVersion || runtimeVersion !== pkg.version) {
    fail(`package version ${pkg.version} must match runtime RUNTIME_VERSION ${runtimeVersion || "<missing>"}.`);
}
assertPackageExportTargets(PACKAGE_ROOT, "source runtime package");

const requiredExports = [".", "./install", "./global", "./global.min.js", "./grout13", "./grout13/global", "./grout13/global.min.js", "./legacy-globals", "./types", "./package.json"];
for (const exportName of requiredExports) {
    if (!pkg.exports?.[exportName]) fail(`facade package missing export: ${exportName}`);
}

for (const relativePath of [
    "LICENSE",
    "README.md",
    "SKILL.md",
    "llms.txt",
    "types/legacy-globals.d.ts",
    "docs/getting-started.md",
    "docs/how-to-procedural-ui.md",
    "examples/README.md",
    "examples/native-app-shell.css",
    "examples/fruit-shot.html",
    "examples/fruit-shot-grout13.html",
    "examples/phaser4-facade-grout13-canvas-stack-clipped.html",
    "examples/fruit-shot-modular.html",
    "examples/fruit-shot-modular.js",
    "examples/fruit-shot-gameplay.js",
    "dist/gm-phaser4.module.js",
    "dist/gm-phaser4.install.module.js",
    "dist/gm-phaser4.global.js",
    "dist/gm-phaser4.global.min.js",
    "dist/gm-phaser4.d.ts",
    "dist/gm-phaser4.install.d.ts",
    "dist/gm-phaser4-grout13.module.js",
    "dist/gm-phaser4-grout13.global.js",
    "dist/gm-phaser4-grout13.global.min.js",
    "dist/grout13.d.ts"
]) {
    requireFile(relativePath);
}

const moduleExample = fs.readFileSync(path.join(PACKAGE_ROOT, "examples", "prototype-module.html"), "utf8");
if (!moduleExample.includes('import "../dist/gm-phaser4.module.js"')) {
    fail("module example must use the packaged dist module entrypoint.");
}
if (!Array.isArray(pkg.sideEffects) || pkg.sideEffects.includes("./dist/gm-phaser4.install.module.js")) {
    fail("facade package should declare side effects explicitly while keeping the pure install entry tree-shakeable.");
}

for (const [relativePath, stylesheet] of [
    ["examples/prototype-module.html", "./native-app-shell.css"],
    ["examples/prototype-cdn.html", "./native-app-shell.css"],
    ["examples/fruit-shot.html", "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/examples/native-app-shell.css"],
    ["examples/fruit-shot-grout13.html", "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@06aba3eeadd027cb4854b6a34fde6ce454aa06a1/examples/native-app-shell.css"],
    ["examples/fruit-shot-modular.html", "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/examples/native-app-shell.css"]
]) {
    const source = fs.readFileSync(path.join(PACKAGE_ROOT, relativePath), "utf8");
    if (!source.includes(`href=\"${stylesheet}\"`) || !source.includes('data-gm-app-shell="locked"')) {
        fail(`${relativePath} must consume the shared locked native app shell.`);
    }
}

for (const artifact of [
    "dist/gm-phaser4.module.js",
    "dist/gm-phaser4.install.module.js",
    "dist/gm-phaser4.global.js",
    "dist/gm-phaser4.global.min.js"
]) {
    assertSyntax(artifact);
    assertNoUnresolvedRuntimeAliases(artifact);
}

assertSyntax("examples/fruit-shot-modular.js");
assertSyntax("examples/fruit-shot-gameplay.js");

for (const artifact of [
    "dist/gm-phaser4-grout13.module.js",
    "dist/gm-phaser4-grout13.global.js",
    "dist/gm-phaser4-grout13.global.min.js"
]) {
    assertSyntax(artifact);
}

for (const artifact of [
    "dist/gm-phaser4.module.js",
    "dist/gm-phaser4.global.js",
    "dist/gm-phaser4.global.min.js"
]) {
    const source = fs.readFileSync(path.join(PACKAGE_ROOT, artifact), "utf8");
    if (source.includes("GROUT13") || source.includes("installGrout13Bridge")) {
        fail(`${artifact} must remain independent of Grout13.`);
    }
}

assertNoImageAssets("examples");
assertNoImageAssets("docs");
assertNoImageReferences("examples");
assertNoImageReferences("docs");
const typeResult = spawnSync(process.execPath, [path.join(ROOT, "scripts", "test-runtime-types.mjs")], {
    cwd: ROOT,
    encoding: "utf8"
});
if (typeResult.status !== 0) {
    fail(`runtime package TypeScript consumer contract failed:\n${typeResult.stdout || typeResult.stderr}`);
}

const fixtureRoot = path.join(PACKAGE_ROOT, "tests", "browser");
for (const relativePath of [
    "tests/browser/index.html",
    "tests/browser/boot.js",
    "tests/browser/behavioral-fixture.js",
    "tests/runtime/README.md",
    "docs/gm-compatibility-matrix.md"
]) {
    requireFile(relativePath);
}
if (!fs.existsSync(path.join(fixtureRoot, "index.html"))) {
    fail("runtime package is missing browser behavioral fixture entry.");
}

console.log("[ok] Public phaser4-facade package contract passed.");
console.log("[info] Behavioral matrix is stage 2: node scripts/test-runtime-behavior.mjs");
