#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { ensureFrontendDeps, launchBrowser, startStaticServer, stopServer } from "./smoke/smoke-server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT, "runtime-data", "screenshots", "facade-fruit-shot");
const PORT = 4520;
const CSS_CDN = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/examples/native-app-shell.css";
const PHASER_GLOBAL_CDN = "https://cdn.jsdelivr.net/npm/phaser@4.1.0/dist/phaser.min.js";
const FACADE_GLOBAL_CDN = "https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4.global.min.js";
const GROUT_GLOBAL_CDN = "https://cdn.jsdelivr.net/gh/Shoozes/grout13@main/dist/grout13.global.min.js";
const BRIDGE_GLOBAL_CDN = "https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4-grout13.global.min.js";
const PHASER_MODULE_CDN = "https://cdn.jsdelivr.net/npm/phaser@4.1.0/dist/phaser.esm.js";
const FACADE_MODULE_CDN = "https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4.module.js";
const BRIDGE_MODULE_CDN = "https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4-grout13.module.js";
const GROUT_MODULE_CDN = "https://cdn.jsdelivr.net/gh/Shoozes/grout13@main/dist/grout13.mjs";
const SOURCE_RUNTIME = "../dist/gm-phaser4.global.min.js";
const PHASER_GLOBAL_DIST = path.join(ROOT, "node_modules", "phaser", "dist", "phaser.min.js");
const PHASER_MODULE_DIST = path.join(ROOT, "node_modules", "phaser", "dist", "phaser.esm.js");
const FACADE_GLOBAL_DIST = path.join(ROOT, "dist", "gm-phaser4.global.min.js");
const BRIDGE_GLOBAL_DIST = path.join(ROOT, "dist", "gm-phaser4-grout13.global.min.js");
const FACADE_MODULE_DIST = path.join(ROOT, "dist", "gm-phaser4.module.js");
const BRIDGE_MODULE_DIST = path.join(ROOT, "dist", "gm-phaser4-grout13.module.js");
const SHELL_CSS = path.join(ROOT, "examples", "native-app-shell.css");
const DEFAULT_GROUT_ROOT = path.resolve(ROOT, "..", "grout13", "dist");
const GROUT_GLOBAL_DIST = process.env.GROUT13_GLOBAL_PATH || path.join(DEFAULT_GROUT_ROOT, "grout13.global.min.js");
const GROUT_MODULE_DIST = process.env.GROUT13_MODULE_PATH || path.join(DEFAULT_GROUT_ROOT, "grout13.mjs");

const TEST_CASES = [
    { name: "grout13-portrait-canvas", kind: "grout13", relPath: "examples/fruit-shot-grout13.html", proofName: "__fruitShotGrout13Proof", render: "canvas", viewport: { width: 720, height: 1280, deviceScaleFactor: 1 } },
    { name: "grout13-portrait-webgl", kind: "grout13", relPath: "examples/fruit-shot-grout13.html", proofName: "__fruitShotGrout13Proof", render: "webgl", viewport: { width: 720, height: 1280, deviceScaleFactor: 1 } },
    { name: "grout13-phone-3x", kind: "grout13", relPath: "examples/fruit-shot-grout13.html", proofName: "__fruitShotGrout13Proof", render: "canvas", viewport: { width: 390, height: 844, deviceScaleFactor: 3 } },
    { name: "grout13-desktop", kind: "grout13", relPath: "examples/fruit-shot-grout13.html", proofName: "__fruitShotGrout13Proof", render: "canvas", viewport: { width: 1366, height: 768, deviceScaleFactor: 1 } },
    { name: "grout13-source-fallback", kind: "grout13", relPath: "examples/fruit-shot-grout13.html", proofName: "__fruitShotGrout13Proof", render: "canvas", viewport: { width: 720, height: 1280, deviceScaleFactor: 1 }, runtimeFallback: "source" },
    { name: "core-phone-2x", kind: "core", relPath: "examples/fruit-shot.html", proofName: "__fruitShotProof", render: "canvas", viewport: { width: 390, height: 844, deviceScaleFactor: 2 } },
    { name: "modular-phone-3x", kind: "module", relPath: "examples/fruit-shot-modular.html", proofName: "__fruitShotModularProof", render: "canvas", viewport: { width: 390, height: 844, deviceScaleFactor: 3 } },
    { name: "modular-desktop-webgl", kind: "module", relPath: "examples/fruit-shot-modular.html", proofName: "__fruitShotModularProof", render: "webgl", viewport: { width: 1366, height: 768, deviceScaleFactor: 1 } }
];

function fail(message) {
    throw new Error(message);
}

function assertFinite(value, label) {
    if (!Number.isFinite(Number(value))) fail(label + " is not finite: " + value);
}

function compatGroutSource(asModule) {
    const body = [
        "const compileGrout13Atlas = (assets) => {",
        "  const width = Math.max(20, assets.length * 20);",
        "  const height = 20;",
        "  const rgba = new Uint8ClampedArray(width * height * 4);",
        "  const colors = { strawberry: [239, 71, 111], lemon: [255, 209, 102], lime: [6, 214, 160] };",
        "  const frames = assets.map((asset, index) => {",
        "    const x0 = index * 20 + 2;",
        "    const color = colors[asset.name] || [255, 255, 255];",
        "    for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) {",
        "      const dx = x - 7.5;",
        "      const dy = y - 8;",
        "      if (dx * dx / 54 + dy * dy / 58 <= 1) {",
        "        const offset = ((y + 2) * width + x0 + x) * 4;",
        "        rgba[offset] = color[0]; rgba[offset + 1] = color[1]; rgba[offset + 2] = color[2]; rgba[offset + 3] = 255;",
        "      }",
        "    }",
        "    return { name: asset.name, x: x0, y: 2, width: 16, height: 16, sourceWidth: 16, sourceHeight: 16 };",
        "  });",
        "  const payload = [width, height, '', '', [], assets.map((asset) => asset.name).join('|')];",
        "  return { payload, atlas: { width, height, rgba }, frames, frameOrder: assets.map((asset) => asset.name), runtimeContract: { formatVersion: 1 }, bytes: { payload: JSON.stringify(payload).length } };",
        "};",
        "const decodeGrout13Atlas = () => { throw new Error('Compatibility Grout13 fixture should use direct RGBA atlases.'); };",
        "const getGrout13PayloadBytes = (payload) => JSON.stringify(payload).length;",
        "const GROUT13_FORMAT_VERSION = 1;",
        "const API = { compileGrout13Atlas, decodeGrout13Atlas, getGrout13PayloadBytes, GROUT13_FORMAT_VERSION };"
    ];
    if (asModule) return body.concat([
        "export { compileGrout13Atlas, decodeGrout13Atlas, getGrout13PayloadBytes, GROUT13_FORMAT_VERSION };"
    ]).join("\n");
    return ["(() => {", ...body, "globalThis.GROUT13 = API;", "})();"].join("\n");
}

function routePayload(filePath, fallback, contentType) {
    return fs.existsSync(filePath)
        ? { path: filePath, contentType }
        : { body: fallback, contentType };
}

function assertProof(report, testCase) {
    if (!report || report.failed || !report.complete) {
        fail(testCase.name + " Fruit Shot proof did not complete: " + JSON.stringify(report, null, 2));
    }
    assert.equal(report.render, testCase.render === "canvas" ? "CANVAS" : "WEBGL", testCase.name + " render mode");
    for (const frame of ["lemon", "lime", "strawberry"]) {
        assert.ok(report.atlasFrames.includes(frame), testCase.name + " atlas frame " + frame);
    }
    const textFields = testCase.kind === "core"
        ? ["textExtSeen", "textFitSeen", "guiTextExtSeen", "guiTextFitSeen"]
        : ["pixelTextSeen", "pixelTextFlipY"];
    for (const field of [...textFields, "spriteOptionsSeen", "fixedStepsSeen"]) {
        assert.equal(report[field], true, testCase.name + " proof field " + field);
    }
    assert.ok(report.frames >= 8, testCase.name + " should report at least eight fixed steps");
    assert.ok(report.headingDraws >= report.frames, testCase.name + " must draw the heading on every proof frame");
    assert.ok(report.summaryDraws >= report.frames, testCase.name + " must draw the summary on every proof frame");
    for (const [label, value] of Object.entries(report.sprite || {})) assertFinite(value, testCase.name + " sprite " + label);
    if (testCase.kind === "core") {
        for (const [label, value] of Object.entries(report.text || {})) {
            if (label !== "fontSize") assertFinite(value, testCase.name + " text " + label);
        }
        for (const [label, value] of Object.entries(report.guiText || {})) {
            if (label !== "fontSize") assertFinite(value, testCase.name + " GUI text " + label);
        }
    } else {
        assert.ok(report.pixelTextDraws >= report.frames * 4, testCase.name + " must draw four pixel-text sprites on every proof frame");
    }
    assert.deepEqual(report.errors, [], testCase.name + " proof errors");

    if (testCase.kind === "core") {
        assert.equal(report.architecture, "all-in-one-core");
        assert.equal(report.grout13, false);
        assert.equal(report.phaserSource, PHASER_GLOBAL_CDN);
        assert.equal(report.runtimeSource, FACADE_GLOBAL_CDN);
        return;
    }
    if (testCase.kind === "grout13") {
        assert.equal(report.architecture, "all-in-one-grout13");
        assert.equal(report.grout13, true);
        assert.ok(Number(report.grout13PayloadBytes) > 0, testCase.name + " should report an encoded Grout13 payload");
        assert.equal(report.phaserSource, PHASER_GLOBAL_CDN);
        assert.equal(
            report.runtimeSource,
            testCase.runtimeFallback === "source" ? SOURCE_RUNTIME : FACADE_GLOBAL_CDN,
            testCase.name + " should select its expected facade runtime candidate"
        );
        assert.equal(report.groutSource, GROUT_GLOBAL_CDN);
        assert.equal(report.bridgeSource, BRIDGE_GLOBAL_CDN);
        return;
    }
    assert.equal(report.architecture, "module-grout13");
    assert.equal(report.grout13, true);
    assert.ok(Number(report.grout13PayloadBytes) > 0, testCase.name + " should report an encoded Grout13 payload");
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
    await page.route(CSS_CDN, (route) => route.fulfill({ path: SHELL_CSS, contentType: "text/css; charset=utf-8" }));
    if (testCase.kind === "module") {
        await page.route(PHASER_MODULE_CDN, (route) => route.fulfill({ path: PHASER_MODULE_DIST, contentType: "text/javascript; charset=utf-8" }));
        await page.route(FACADE_MODULE_CDN, (route) => route.fulfill({ path: FACADE_MODULE_DIST, contentType: "text/javascript; charset=utf-8" }));
        await page.route(BRIDGE_MODULE_CDN, (route) => route.fulfill({ path: BRIDGE_MODULE_DIST, contentType: "text/javascript; charset=utf-8" }));
        await page.route(GROUT_MODULE_CDN, (route) => route.fulfill(routePayload(
            GROUT_MODULE_DIST,
            compatGroutSource(true),
            "text/javascript; charset=utf-8"
        )));
        return;
    }

    await page.route(PHASER_GLOBAL_CDN, (route) => route.fulfill({ path: PHASER_GLOBAL_DIST, contentType: "text/javascript; charset=utf-8" }));
    await page.route(FACADE_GLOBAL_CDN, (route) => testCase.runtimeFallback === "source"
        ? route.abort("failed")
        : route.fulfill({ path: FACADE_GLOBAL_DIST, contentType: "text/javascript; charset=utf-8" }));
    if (testCase.kind === "grout13") {
        await page.route(GROUT_GLOBAL_CDN, (route) => route.fulfill(routePayload(
            GROUT_GLOBAL_DIST,
            compatGroutSource(false),
            "text/javascript; charset=utf-8"
        )));
        await page.route(BRIDGE_GLOBAL_CDN, (route) => route.fulfill({ path: BRIDGE_GLOBAL_DIST, contentType: "text/javascript; charset=utf-8" }));
    }
}

ensureFrontendDeps(ROOT);
for (const assetPath of [
    PHASER_GLOBAL_DIST,
    PHASER_MODULE_DIST,
    FACADE_GLOBAL_DIST,
    BRIDGE_GLOBAL_DIST,
    FACADE_MODULE_DIST,
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
            if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) {
                consoleErrors.push(message.text());
            }
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
            const report = await page.evaluate((name) => window[name], testCase.proofName);
            assertProof(report, testCase);
            assert.equal(await page.locator("canvas").count(), 1, testCase.name + " Fruit Shot should create one canvas");
            await assertViewportFit(page, testCase);
            assert.equal(pageErrors.length, 0, testCase.name + " page errors: " + pageErrors.join(" | "));
            assert.equal(consoleErrors.length, 0, testCase.name + " console errors: " + consoleErrors.join(" | "));
            const screenshot = "fruit-shot-" + testCase.name + ".png";
            await page.screenshot({ path: path.join(REPORT_ROOT, screenshot) });
            results.push({ ...testCase, frames: report.frames, screenshot });
        } finally {
            await context.close();
        }
    }
} finally {
    await launch.browser.close();
    await stopServer(server);
}

fs.writeFileSync(path.join(REPORT_ROOT, "report.json"), JSON.stringify({ browser: launch.label, results }, null, 2) + "\n", "utf8");
console.log("[ok] Fruit Shot core, all-in-one Grout13, and modular browser proofs passed across Canvas, WebGL, phone 3x, desktop, and fallback using " + launch.label + ".");
