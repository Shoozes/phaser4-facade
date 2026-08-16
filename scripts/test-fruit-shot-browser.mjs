#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolveGrout13Fixture } from "./grout13-fixture.mjs";
import { ensureFrontendDeps, launchBrowser, startStaticServer, stopServer } from "./smoke/smoke-server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT, "runtime-data", "screenshots", "facade-fruit-shot");
const PORT = 4520;
const CSS_CDN = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/examples/native-app-shell.css";
const PHASER_GLOBAL_CDN = "https://cdn.jsdelivr.net/gh/phaserjs/phaser@v4.2.1/dist/phaser.min.js";
const PHASER_MODULE_CDN = "https://cdn.jsdelivr.net/gh/phaserjs/phaser@v4.2.1/dist/phaser.esm.js";
const FACADE_MAIN = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/dist/";
const FACADE_PIN = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@4f0a3406193a0008e29c35e27871382aa240aff0/dist/";
const GROUT_MAIN = "https://cdn.jsdelivr.net/gh/Shoozes/grout13@main/dist/";
const GROUT_PIN = "https://cdn.jsdelivr.net/gh/Shoozes/grout13@7546bfc198f16bc1c784e7c1af34de5e26550e86/dist/";
const PHASER_GLOBAL_DIST = path.join(ROOT, "node_modules", "phaser", "dist", "phaser.min.js");
const PHASER_MODULE_DIST = path.join(ROOT, "node_modules", "phaser", "dist", "phaser.esm.js");
const FACADE_GLOBAL_DIST = path.join(ROOT, "dist", "gm-phaser4.global.min.js");
const FACADE_MODULE_DIST = path.join(ROOT, "dist", "gm-phaser4.module.js");
const BRIDGE_GLOBAL_DIST = path.join(ROOT, "dist", "gm-phaser4-grout13.global.min.js");
const BRIDGE_MODULE_DIST = path.join(ROOT, "dist", "gm-phaser4-grout13.module.js");
const SHELL_CSS = path.join(ROOT, "examples", "native-app-shell.css");
const GROUT_FIXTURE = resolveGrout13Fixture(ROOT);
const GROUT_GLOBAL_DIST = GROUT_FIXTURE.globalPath;
const GROUT_MODULE_DIST = GROUT_FIXTURE.modulePath;
const HAS_LOCAL_GROUT = Boolean(GROUT_GLOBAL_DIST && GROUT_MODULE_DIST && fs.existsSync(GROUT_GLOBAL_DIST) && fs.existsSync(GROUT_MODULE_DIST));
const HEADERS = { "access-control-allow-origin": "*" };

const TEST_CASES = [
    { name: "grout13-phone-3x", kind: "grout13", relPath: "examples/fruit-shot-grout13.html", proofName: "__fruitShotGrout13Proof", render: "canvas", viewport: { width: 390, height: 844, deviceScaleFactor: 3 }, pixelScale: 0.5, pixelMode: "integer" },
    { name: "grout13-tablet-2x", kind: "grout13", relPath: "examples/fruit-shot-grout13.html", proofName: "__fruitShotGrout13Proof", render: "canvas", viewport: { width: 768, height: 1024, deviceScaleFactor: 2 }, pixelScale: 0.5, pixelMode: "integer" },
    { name: "grout13-desktop-webgl", kind: "grout13", relPath: "examples/fruit-shot-grout13.html", proofName: "__fruitShotGrout13Proof", render: "webgl", viewport: { width: 1366, height: 768, deviceScaleFactor: 1 }, pixelScale: 0.5, pixelMode: "integer" },
    { name: "grout13-pinned-fallback", kind: "grout13", relPath: "examples/fruit-shot-grout13.html", proofName: "__fruitShotGrout13Proof", render: "canvas", viewport: { width: 720, height: 1280, deviceScaleFactor: 1 }, runtimeFallback: true, pixelScale: 1, pixelMode: "integer" },
    { name: "core-phone-2x", kind: "core", relPath: "examples/fruit-shot.html", proofName: "__fruitShotProof", render: "canvas", viewport: { width: 390, height: 844, deviceScaleFactor: 2 }, pixelScale: 0.5, pixelMode: "integer" },
    { name: "core-compact-phone-2x", kind: "core", relPath: "examples/fruit-shot.html", proofName: "__fruitShotProof", render: "canvas", viewport: { width: 320, height: 568, deviceScaleFactor: 2 }, pixelScale: 568 / 1280, pixelMode: "fit-fallback" },
    { name: "core-desktop-webgl", kind: "core", relPath: "examples/fruit-shot.html", proofName: "__fruitShotProof", render: "webgl", viewport: { width: 1366, height: 768, deviceScaleFactor: 1 }, pixelScale: 0.5, pixelMode: "integer" },
    { name: "modular-phone-3x", kind: "module", relPath: "examples/fruit-shot-modular.html", proofName: "__fruitShotModularProof", render: "canvas", viewport: { width: 390, height: 844, deviceScaleFactor: 3 }, pixelScale: 0.5, pixelMode: "integer" },
    { name: "modular-desktop-webgl", kind: "module", relPath: "examples/fruit-shot-modular.html", proofName: "__fruitShotModularProof", render: "webgl", viewport: { width: 1366, height: 768, deviceScaleFactor: 1 }, pixelScale: 0.5, pixelMode: "integer" }
];

function fail(message) {
    throw new Error(message);
}

function assertProof(report, testCase) {
    if (!report || report.failed || !report.complete) {
        fail(testCase.name + " Fruit Shot proof did not complete: " + JSON.stringify(report, null, 2));
    }
    assert.equal(report.render, testCase.render === "canvas" ? "CANVAS" : "WEBGL", testCase.name + " render mode");
    assert.equal(report.pixelSourceScale, 4, testCase.name + " uses four-pixel authored source cells");
    assert.equal(report.nativeSpriteFrames, true, testCase.name + " uses native sprite frame dimensions");
    assert.equal(report.pixelTextSeen, true, testCase.name + " draws pixel text");
    assert.equal(report.pixelTextFlipY, false, testCase.name + " pixel text stays upright without a flip workaround");
    assert.equal(report.spriteOptionsSeen, true, testCase.name + " draws sprite frames");
    assert.equal(report.fixedStepsSeen, true, testCase.name + " advances fixed simulation steps");
    assert.equal(report.playable, true, testCase.name + " exposes a playable game");
    assert.equal(report.inputReady, true, testCase.name + " exposes player input");
    assert.ok(report.frames >= 8, testCase.name + " should report at least eight frames");
    assert.ok(report.headingDraws >= report.frames, testCase.name + " should draw its heading every frame");
    assert.ok(report.summaryDraws >= report.frames, testCase.name + " should draw its HUD every frame");
    assert.deepEqual(report.errors, [], testCase.name + " proof errors");
    assert.equal(report.pixelScaleStep, 0.5, testCase.name + " declares the half-step presentation contract");
    assert.ok(report.pixelPresentation, testCase.name + " reports its pixel presentation diagnostics");
    assert.ok(Math.abs(report.pixelPresentation.scale - testCase.pixelScale) < 0.000001, testCase.name + " uses the expected world scale");
    assert.equal(report.pixelPresentation.mode, testCase.pixelMode, testCase.name + " reports the expected presentation mode");
    if (testCase.pixelMode === "integer") {
        assert.equal(report.pixelPresentation.integer, true, testCase.name + " reports an integer pixel presentation");
        assert.ok(Number.isInteger(report.pixelPresentation.sourceCellCssPixels), testCase.name + " maps each authored cell to whole CSS pixels");
        assert.ok(Number.isInteger(report.pixelPresentation.sourceCellDevicePixels), testCase.name + " maps each authored cell to whole device pixels");
    }
    if (testCase.kind === "core") {
        assert.equal(report.architecture, "all-in-one-core");
        assert.equal(report.grout13, false);
        assert.equal(report.phaserSource, PHASER_GLOBAL_CDN);
        return;
    }
    assert.equal(report.grout13, true, testCase.name + " installs its Grout13 atlas");
    assert.ok(Number(report.grout13PayloadBytes) > 0, testCase.name + " reports a Grout13 payload");
    if (testCase.kind === "grout13") {
        assert.equal(report.architecture, "all-in-one-grout13");
        assert.equal(report.phaserSource, PHASER_GLOBAL_CDN);
        assert.equal(report.runtimeSource, testCase.runtimeFallback ? FACADE_PIN + "gm-phaser4.global.min.js" : FACADE_MAIN + "gm-phaser4.global.min.js");
        assert.equal(report.groutSource, GROUT_MAIN + "grout13.global.min.js");
        assert.equal(report.bridgeSource, testCase.runtimeFallback ? FACADE_PIN + "gm-phaser4-grout13.global.min.js" : FACADE_MAIN + "gm-phaser4-grout13.global.min.js");
        return;
    }
    assert.equal(report.architecture, "module-grout13");
}

async function assertViewportFit(page, testCase) {
    const metrics = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        const rect = canvas?.getBoundingClientRect();
        const style = getComputedStyle(document.documentElement);
        return {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            shellVersion: style.getPropertyValue("--gm-native-app-shell-version").trim(),
            canvas: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null
        };
    });
    const { width, height } = testCase.viewport;
    assert.equal(metrics.innerWidth, width, testCase.name + " viewport width");
    assert.equal(metrics.innerHeight, height, testCase.name + " viewport height");
    assert.equal(metrics.shellVersion, "1", testCase.name + " should load the native app shell stylesheet");
    assert.ok(metrics.scrollWidth <= width, testCase.name + " must not create horizontal page scroll");
    assert.ok(metrics.scrollHeight <= height, testCase.name + " must not create vertical page scroll");
    assert.ok(metrics.canvas, testCase.name + " must expose a canvas");
    assert.ok(metrics.canvas.x >= -1 && metrics.canvas.y >= -1, testCase.name + " canvas starts inside the viewport");
    assert.ok(metrics.canvas.x + metrics.canvas.width <= width + 1, testCase.name + " canvas ends inside the viewport");
    assert.ok(metrics.canvas.y + metrics.canvas.height <= height + 1, testCase.name + " canvas ends inside the viewport");
}

async function installRoutes(page, testCase) {
    await page.route(/^https:\/\/cdn\.jsdelivr\.net\/gh\//, async (route) => {
        const url = route.request().url();
        const fulfill = (filePath, contentType) => route.fulfill({ path: filePath, contentType, headers: HEADERS });
        if (url === CSS_CDN) return fulfill(SHELL_CSS, "text/css; charset=utf-8");
        if (url === PHASER_GLOBAL_CDN) return fulfill(PHASER_GLOBAL_DIST, "text/javascript; charset=utf-8");
        if (url === PHASER_MODULE_CDN) return fulfill(PHASER_MODULE_DIST, "text/javascript; charset=utf-8");
        if (url === GROUT_MAIN + "grout13.global.min.js" || url === GROUT_PIN + "grout13.global.min.js") {
            return HAS_LOCAL_GROUT ? fulfill(GROUT_GLOBAL_DIST, "text/javascript; charset=utf-8") : route.continue();
        }
        if (url === GROUT_MAIN + "grout13.mjs" || url === GROUT_PIN + "grout13.mjs") {
            return HAS_LOCAL_GROUT ? fulfill(GROUT_MODULE_DIST, "text/javascript; charset=utf-8") : route.continue();
        }
        if (url === FACADE_MAIN + "gm-phaser4.global.min.js") {
            return testCase.runtimeFallback ? route.abort("failed") : fulfill(FACADE_GLOBAL_DIST, "text/javascript; charset=utf-8");
        }
        if (url === FACADE_PIN + "gm-phaser4.global.min.js") return fulfill(FACADE_GLOBAL_DIST, "text/javascript; charset=utf-8");
        if (url === FACADE_MAIN + "gm-phaser4-grout13.global.min.js") {
            return testCase.runtimeFallback ? route.abort("failed") : fulfill(BRIDGE_GLOBAL_DIST, "text/javascript; charset=utf-8");
        }
        if (url === FACADE_PIN + "gm-phaser4-grout13.global.min.js") return fulfill(BRIDGE_GLOBAL_DIST, "text/javascript; charset=utf-8");
        if (url === FACADE_MAIN + "gm-phaser4.module.js") return fulfill(FACADE_MODULE_DIST, "text/javascript; charset=utf-8");
        if (url === FACADE_MAIN + "gm-phaser4-grout13.module.js") return fulfill(BRIDGE_MODULE_DIST, "text/javascript; charset=utf-8");
        return route.abort("blockedbyclient");
    });
}

async function playOneShot(page, testCase) {
    const box = await page.locator("canvas").boundingBox();
    if (!box) fail(testCase.name + " canvas has no bounding box.");
    const centerX = box.x + box.width * 0.5;
    if (testCase.kind === "grout13") {
        await page.mouse.move(centerX, box.y + box.height * 0.87);
        await page.mouse.down();
        await page.mouse.move(centerX, box.y + box.height * 0.33, { steps: 6 });
        await page.mouse.up();
    } else {
        await page.mouse.move(centerX, box.y + box.height * 0.84);
        await page.mouse.down();
        await page.mouse.up();
    }
    await page.waitForFunction((name) => window[name]?.shotsFired >= 1, testCase.proofName, { timeout: 10000 });
    if (testCase.kind !== "grout13") {
        await page.waitForFunction((name) => window[name]?.merges >= 1, testCase.proofName, { timeout: 10000 });
    }
}

ensureFrontendDeps(ROOT);
if (GROUT_FIXTURE.hasOverride && !HAS_LOCAL_GROUT) {
    fail("Fruit Shot browser proof received an incomplete GROUT13_* fixture override.");
}
for (const assetPath of [
    PHASER_GLOBAL_DIST,
    PHASER_MODULE_DIST,
    FACADE_GLOBAL_DIST,
    FACADE_MODULE_DIST,
    BRIDGE_GLOBAL_DIST,
    BRIDGE_MODULE_DIST,
    SHELL_CSS
]) {
    if (!fs.existsSync(assetPath)) fail("Fruit Shot browser proof needs local fixture: " + assetPath);
}
fs.mkdirSync(REPORT_ROOT, { recursive: true });

const requireFromRoot = createRequire(path.join(ROOT, "package.json"));
const { chromium } = requireFromRoot("playwright-core");
const launch = await launchBrowser(chromium);
const server = await startStaticServer(ROOT, PORT, { fallbackPath: "examples/fruit-shot-grout13.html" });
const results = [];

try {
    for (const testCase of TEST_CASES) {
        const context = await launch.browser.newContext({
            viewport: { width: testCase.viewport.width, height: testCase.viewport.height },
            deviceScaleFactor: testCase.viewport.deviceScaleFactor
        });
        const page = await context.newPage();
        const pageErrors = [];
        const consoleErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("console", (message) => {
            if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) consoleErrors.push(message.text());
        });
        try {
            await installRoutes(page, testCase);
            await page.goto("http://127.0.0.1:" + PORT + "/" + testCase.relPath + "?render=" + testCase.render, {
                waitUntil: "domcontentloaded",
                timeout: 20000
            });
            await page.waitForFunction((name) => {
                const proof = window[name];
                return Boolean(proof?.complete || proof?.failed);
            }, testCase.proofName, { timeout: 20000 });
            let report = await page.evaluate((name) => window[name], testCase.proofName);
            assertProof(report, testCase);
            await playOneShot(page, testCase);
            report = await page.evaluate((name) => window[name], testCase.proofName);
            assert.ok(report.shotsFired >= 1, testCase.name + " must accept a player shot");
            if (testCase.kind !== "grout13") assert.ok(report.merges >= 1, testCase.name + " player shot must resolve a merge");
            assert.equal(await page.locator("canvas").count(), 1, testCase.name + " Fruit Shot should create one canvas");
            await assertViewportFit(page, testCase);
            assert.equal(pageErrors.length, 0, testCase.name + " page errors: " + pageErrors.join(" | "));
            assert.equal(consoleErrors.length, 0, testCase.name + " console errors: " + consoleErrors.join(" | "));
            await page.locator("#status").evaluate((element) => { element.hidden = true; });
            const screenshot = "fruit-shot-" + testCase.name + ".png";
            await page.screenshot({ path: path.join(REPORT_ROOT, screenshot) });
            results.push({ name: testCase.name, frames: report.frames, shotsFired: report.shotsFired, merges: report.merges, screenshot });
        } finally {
            await context.close();
        }
    }
} finally {
    await launch.browser.close();
    await stopServer(server);
}

fs.writeFileSync(path.join(REPORT_ROOT, "report.json"), JSON.stringify({ browser: launch.label, results }, null, 2) + "\n", "utf8");
console.log("[ok] Fruit Shot all-in-one, Grout13, and modular playable browser proofs passed across Canvas, WebGL, phone, tablet, desktop, compact-fallback, and pinned-fallback lanes using " + launch.label + " with " + (HAS_LOCAL_GROUT ? "the " + GROUT_FIXTURE.source + " Grout13 fixture." : "the GitHub Grout13 CDN."));
