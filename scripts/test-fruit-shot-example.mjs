#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS_CDN = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/examples/native-app-shell.css";
const PHASER_GLOBAL_CDN = "https://cdn.jsdelivr.net/gh/phaserjs/phaser@v4.2.1/dist/phaser.min.js";
const PHASER_MODULE_CDN = "https://cdn.jsdelivr.net/gh/phaserjs/phaser@v4.2.1/dist/phaser.esm.js";
const FACADE_MAIN = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/dist/";
const GROUT_MAIN = "https://cdn.jsdelivr.net/gh/Shoozes/grout13@main/dist/";
const CORE_HTML = "examples/fruit-shot.html";
const GROUT_HTML = "examples/fruit-shot-grout13.html";
const MODULAR_HTML = "examples/fruit-shot-modular.html";
const MODULAR_JS = "examples/fruit-shot-modular.js";
const GAMEPLAY_JS = "examples/fruit-shot-gameplay.js";

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
    const css = read("examples/native-app-shell.css");
    for (const marker of [
        "--gm-native-app-shell-version: 1",
        "@supports (height: 100dvh)",
        "env(safe-area-inset-top, 0px)",
        "-webkit-text-size-adjust: 100%",
        "body[data-gm-app-shell=\"locked\"]",
        ".gm-app-safe-area",
        ".gm-app-surface--full-bleed",
        ".gm-app-overlay--safe",
        ".gm-app-content--safe",
        ".gm-app-frame--allows-unsafe-overflow",
        ".gm-app-scroll-region",
        ".gm-app-surface--pixel-art",
        ".gm-app-surface--integer-pixel-art",
        "image-rendering: pixelated"
    ]) {
        if (!css.includes(marker)) fail("Native app shell CSS is missing marker: " + marker);
    }
}

function checkAllInOne(relativePath, label, architecture, extraMarkers) {
    const html = read(relativePath);
    if (/<script\s+type=["']module["']/i.test(html) || /<script\s+type=["']importmap["']/i.test(html)) {
        fail(label + " must remain a plain-script all-in-one CDN example.");
    }
    if (/\bimport\s+/.test(html)) fail(label + " must not use module import syntax.");
    if (/cdn\.jsdelivr\.net\/npm|phaser@4\.1\.0|file:\/\//i.test(html)) {
        fail(label + " must use GitHub-backed current CDN sources without local file fallbacks.");
    }
    for (const marker of [
        "href=\"" + CSS_CDN + "\"",
        "data-gm-app-shell=\"locked\"",
        "gm-app-surface gm-app-safe-area gm-app-surface--pixel-art",
        "viewport-fit=cover",
        "SCRIPT_TIMEOUT_MS",
        "function loadFirst",
        "GM.app.start",
        "GM.draw.spriteExt",
        "responsive: false",
        "integerScaleStep: PIXEL_SCALE_STEP",
        "renderQuality: \"pixel-art\"",
        "pixelArt: true",
        "antialias: false",
        "roundPixels: true",
        "renderResolution: \"auto\"",
        "pixelScaleStep: 0.5",
        "pixelPresentation",
        "const PIXEL_SOURCE_SCALE = 4",
        "nativeSpriteFrames: true",
        "merges",
        "architecture: \"" + architecture + "\"",
        ...extraMarkers
    ]) {
        if (!html.includes(marker)) fail(label + " is missing marker: " + marker);
    }
    if (/\bflipY\s*:\s*true\b/i.test(html)) fail(label + " must not rely on a text flip workaround.");
    const script = getExecutableInlineScript(html, label);
    try {
        new Function(script);
    } catch (error) {
        fail(label + " inline script has a syntax error: " + (error instanceof Error ? error.message : String(error)));
    }
    assert.ok(fs.statSync(path.join(ROOT, relativePath)).size > 9000, label + " should retain a complete standalone implementation.");
}

function checkModular() {
    const html = read(MODULAR_HTML);
    const launcher = read(MODULAR_JS);
    const gameplay = read(GAMEPLAY_JS);
    for (const marker of [
        "href=\"" + CSS_CDN + "\"",
        "data-gm-app-shell=\"locked\"",
        "gm-app-surface gm-app-safe-area gm-app-surface--pixel-art",
        "viewport-fit=cover",
        "type=\"importmap\"",
        "\"phaser\": \"" + PHASER_MODULE_CDN + "\"",
        "\"phaser4-facade\": \"" + FACADE_MAIN + "gm-phaser4.module.js\"",
        "\"phaser4-facade/grout13\": \"" + FACADE_MAIN + "gm-phaser4-grout13.module.js\"",
        "\"grout13\": \"" + GROUT_MAIN + "grout13.mjs\"",
        "fileMode: window.location.protocol === \"file:\"",
        "server-required",
        "module.src = \"./fruit-shot-modular.js\""
    ]) {
        if (!html.includes(marker)) fail("Modular Fruit Shot HTML is missing marker: " + marker);
    }
    if (/<script\s+type=["']module["']\s+src=/i.test(html)) {
        fail("Modular Fruit Shot must defer its module entry so a directly opened file page stays error-free.");
    }
    for (const marker of [
        "import { GM } from \"phaser4-facade\";",
        "import { installGrout13Bridge } from \"phaser4-facade/grout13\";",
        "import * as GROUT13 from \"grout13\";",
        "import { startFruitShotGame } from \"./fruit-shot-gameplay.js\";",
        "installGrout13Bridge(GM, GROUT13)",
        "startFruitShotGame"
    ]) {
        if (!launcher.includes(marker)) fail("Modular Fruit Shot launcher is missing marker: " + marker);
    }
    for (const marker of [
        "export function startFruitShotGame",
        "const PIXEL_SOURCE_SCALE = 4",
        "function pixelGlyphAsset",
        "function fruitAsset",
        "bridge.addAtlas",
        "responsive: false",
        "integerScaleStep: PIXEL_SCALE_STEP",
        "renderQuality: \"pixel-art\"",
        "renderResolution: \"auto\"",
        "pixelScaleStep: PIXEL_SCALE_STEP",
        "pixelPresentation",
        "function fire",
        "function resolveHit",
        "GM.draw.spriteExt"
    ]) {
        if (!gameplay.includes(marker)) fail("Modular Fruit Shot gameplay is missing marker: " + marker);
    }
    if (/bitmap_text|\bflipY\s*:\s*true\b/i.test(gameplay)) fail("Modular Fruit Shot must use upright direct-pixel glyph assets.");
    if (/cdn\.jsdelivr\.net\/npm|phaser@4\.1\.0/i.test(html + launcher + gameplay)) {
        fail("Modular Fruit Shot must use GitHub-backed current CDN sources.");
    }
    assert.ok(new Function(launcher.replace(/^import .*$/gm, "")), "Modular launcher should parse after import declarations are removed.");
    assert.ok(new Function(gameplay.replace(/^export /gm, "")), "Modular gameplay should parse after its export declaration is removed.");
}

checkNativeShell();
assert.equal(fs.existsSync(path.join(ROOT, "examples", "fruit-shot.js")), false, "The retired Fruit Shot companion script must not return.");
checkAllInOne(CORE_HTML, "Core Fruit Shot", "all-in-one-core", [
    PHASER_GLOBAL_CDN,
    FACADE_MAIN + "gm-phaser4.global.min.js",
    "GM.asset.addAtlas",
    "function createCoreAtlas",
    "function fire",
    "function resolveHit"
]);
const coreSource = read(CORE_HTML);
assert.equal(coreSource.includes("GROUT13"), false, "Core Fruit Shot must not load or require Grout13.");
function checkGrout13Showcase() {
    const html = read(GROUT_HTML);
    if (/<script\s+type=["']module["']/i.test(html) || /<script\s+type=["']importmap["']/i.test(html)) {
        fail("Grout13 Fruit Shot must remain a plain-script all-in-one CDN example.");
    }
    if (/\bimport\s+/.test(html)) fail("Grout13 Fruit Shot must not use module import syntax.");
    if (/cdn\.jsdelivr\.net\/npm|phaser@4\.1\.0|file:\/\//i.test(html)) {
        fail("Grout13 Fruit Shot must use GitHub-backed current CDN sources without local file fallbacks.");
    }
    for (const marker of [
        "data-gm-app-shell=\"locked\"",
        "gm-app-surface gm-app-safe-area gm-app-surface--pixel-art",
        "viewport-fit=cover",
        "function loadFirst",
        "GM.app.start",
        "const FACADE_MAIN = \"" + FACADE_MAIN + "\"",
        GROUT_MAIN + "grout13.global.min.js",
        "gm-phaser4-grout13.global.min.js",
        "GM.grout13.addAtlas",
        "architecture: \"showcase-grout13-facade-fixed-playfield\"",
        "gameplayViewport: { width: 720, height: 720 }",
        "gameplayViewportFixed: true",
        "horizontalAlign: \"center\"",
        "verticalAlign: \"top\"",
        "safeAreaPolicy: \"vertical-only\"",
        "function mergeBalls",
        "function shootToward"
    ]) {
        if (!html.includes(marker)) fail("Grout13 Fruit Shot is missing marker: " + marker);
    }
    if (/\bflipY\s*:\s*true\b/i.test(html)) fail("Grout13 Fruit Shot must not rely on a text flip workaround.");
    const script = getExecutableInlineScript(html, "Grout13 Fruit Shot");
    try {
        new Function(script);
    } catch (error) {
        fail("Grout13 Fruit Shot inline script has a syntax error: " + (error instanceof Error ? error.message : String(error)));
    }
}

checkGrout13Showcase();
checkModular();
console.log("[ok] Fruit Shot all-in-one, Grout13, modular, GitHub CDN, and pixel-source contracts passed.");
