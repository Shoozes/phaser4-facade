#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHELL_CSS = path.join(ROOT, "examples", "native-app-shell.css");
const CSS_CDN = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/examples/native-app-shell.css";
const CORE_HTML = "examples/fruit-shot.html";
const GROUT_HTML = "examples/fruit-shot-grout13.html";
const MODULAR_HTML = "examples/fruit-shot-modular.html";
const MODULAR_JS = "examples/fruit-shot-modular.js";

function fail(message) {
    throw new Error(message);
}

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function getExecutableInlineScript(html, label) {
    const matches = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
        .filter((match) => {
            const openingTag = match[0].slice(0, match[0].indexOf(">") + 1);
            return !/\bsrc\s*=/i.test(openingTag) && !/\btype\s*=\s*["']importmap["']/i.test(openingTag);
        });
    if (matches.length !== 1) fail(label + " must contain one executable inline script, found " + matches.length + ".");
    return matches[0][1];
}

function checkNativeShell() {
    const css = fs.readFileSync(SHELL_CSS, "utf8");
    for (const marker of [
        "--gm-native-app-shell-version: 1",
        "@supports (height: 100dvh)",
        "env(safe-area-inset-top, 0px)",
        "-webkit-text-size-adjust: 100%",
        "body[data-gm-app-shell=\"locked\"]",
        ".gm-app-safe-area",
        ".gm-app-scroll-region",
        ".gm-app-surface--pixel-art",
        "image-rendering: pixelated"
    ]) {
        if (!css.includes(marker)) fail("Native app shell CSS is missing marker: " + marker);
    }
}

function checkAllInOne(relativePath, label, markers) {
    const html = read(relativePath);
    if (/<script\s+type=["']module["']/i.test(html) || /<script\s+type=["']importmap["']/i.test(html)) {
        fail(label + " must remain a plain-script all-in-one CDN example.");
    }
    if (/\bimport\s+/.test(html)) fail(label + " must not use module import syntax.");
    for (const marker of [
        "href=\"" + CSS_CDN + "\"",
        "data-gm-app-shell=\"locked\"",
        "gm-app-surface gm-app-safe-area gm-app-surface--pixel-art",
        "viewport-fit=cover",
        "function loadScriptCandidates",
        "SCRIPT_TIMEOUT_MS",
        "validateRuntime",
        "if (launched) return;",
        "GM.app.start",
        "GM.draw.spriteExt",
        "responsive: true",
        "renderQuality: \"pixel-art\"",
        "pixelArt: true",
        "antialias: false",
        "roundPixels: true",
        ...markers
    ]) {
        if (!html.includes(marker)) fail(label + " is missing marker: " + marker);
    }
    const script = getExecutableInlineScript(html, label);
    try {
        new Function(script);
    } catch (error) {
        fail(label + " inline script has a syntax error: " + (error instanceof Error ? error.message : String(error)));
    }
    assert.ok(fs.statSync(path.join(ROOT, relativePath)).size > 4000, label + " should retain a complete standalone implementation.");
}

function checkModular() {
    const html = read(MODULAR_HTML);
    const source = read(MODULAR_JS);
    for (const marker of [
        "href=\"" + CSS_CDN + "\"",
        "data-gm-app-shell=\"locked\"",
        "gm-app-surface gm-app-safe-area gm-app-surface--pixel-art",
        "viewport-fit=cover",
        "type=\"importmap\"",
        "\"phaser\": \"https://cdn.jsdelivr.net/npm/phaser@4.1.0/dist/phaser.esm.js\"",
        "\"phaser4-facade\": \"https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4.module.js\"",
        "\"phaser4-facade/grout13\": \"https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4-grout13.module.js\"",
        "\"grout13\": \"https://cdn.jsdelivr.net/gh/Shoozes/grout13@main/dist/grout13.mjs\"",
        "<script type=\"module\" src=\"./fruit-shot-modular.js\"></script>"
    ]) {
        if (!html.includes(marker)) fail("Modular Fruit Shot HTML is missing marker: " + marker);
    }
    for (const marker of [
        "import { GM } from \"phaser4-facade\";",
        "import { installGrout13Bridge } from \"phaser4-facade/grout13\";",
        "import * as GROUT13 from \"grout13\";",
        "architecture: \"module-grout13\"",
        "installGrout13Bridge(GM, GROUT13)",
        "bridge.addAtlas",
        "responsive: true",
        "renderQuality: \"pixel-art\"",
        "bitmap_text",
        "function drawPixelLabel",
        "flipY: true",
        "pixelTextSeen",
        "GM.draw.spriteExt"
    ]) {
        if (!source.includes(marker)) fail("Modular Fruit Shot source is missing marker: " + marker);
    }
    const syntax = new Function(source.replace(/^import .*$/gm, ""));
    assert.ok(syntax, "Modular Fruit Shot should parse after import declarations are removed.");
}

checkNativeShell();
assert.equal(fs.existsSync(path.join(ROOT, "examples", "fruit-shot.js")), false, "The retired Fruit Shot companion script must not return.");
checkAllInOne(CORE_HTML, "Core Fruit Shot", [
    "architecture: \"all-in-one-core\"",
    "grout13: false",
    "https://cdn.jsdelivr.net/npm/phaser@4.1.0/dist/phaser.min.js",
    "https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4.global.min.js",
    "../dist/gm-phaser4.global.min.js",
    "../main-files/runtime/gm-phaser4/gm-phaser4.global.min.js",
    "GM.asset.addAtlas",
    "GM.draw.textExt",
    "GM.draw.textFit",
    "GM.gui.textExt",
    "GM.gui.textFit"
]);
const coreSource = read(CORE_HTML);
assert.equal(coreSource.includes("GROUT13"), false, "Core Fruit Shot must not load or require Grout13.");
checkAllInOne(GROUT_HTML, "Grout13 Fruit Shot", [
    "architecture: \"all-in-one-grout13\"",
    "__fruitShotGrout13Proof",
    "https://cdn.jsdelivr.net/gh/Shoozes/grout13@main/dist/grout13.global.min.js",
    "https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4-grout13.global.min.js",
    "../dist/gm-phaser4-grout13.global.min.js",
    "../main-files/runtime/gm-phaser4/gm-phaser4-grout13.global.min.js",
    "validateGrout13",
    "validateBridge",
    "createFruitSpecs",
    "GM.grout13.addAtlas",
    "preset: \"pixel\"",
    "bitmap_text",
    "fruit-shot-title",
    "function drawPixelLabel",
    "flipY: true",
    "pixelTextSeen"
]);
checkModular();
console.log("[ok] Fruit Shot core, all-in-one Grout13, modular, CDN CSS, and native-shell contracts passed.");
