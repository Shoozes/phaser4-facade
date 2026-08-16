#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ensureFrontendDeps, launchBrowser } from "./smoke/smoke-server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT, "runtime-data", "screenshots", "facade-fruit-shot");
const CSS_CDN = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/examples/native-app-shell.css";
const PHASER_CDN = "https://cdn.jsdelivr.net/gh/phaserjs/phaser@v4.2.1/dist/phaser.min.js";
const FACADE_MAIN = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/dist/";
const FACADE_PIN = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@4f0a3406193a0008e29c35e27871382aa240aff0/dist/";
const GROUT_MAIN = "https://cdn.jsdelivr.net/gh/Shoozes/grout13@main/dist/grout13.global.min.js";
const GROUT_PIN = "https://cdn.jsdelivr.net/gh/Shoozes/grout13@7546bfc198f16bc1c784e7c1af34de5e26550e86/dist/grout13.global.min.js";
const PHASER_DIST = path.join(ROOT, "node_modules", "phaser", "dist", "phaser.min.js");
const FACADE_DIST = path.join(ROOT, "dist", "gm-phaser4.global.min.js");
const BRIDGE_DIST = path.join(ROOT, "dist", "gm-phaser4-grout13.global.min.js");
const CSS_DIST = path.join(ROOT, "examples", "native-app-shell.css");
const GROUT_DIST = process.env.GROUT13_GLOBAL_PATH || path.resolve(ROOT, "..", "grout13", "dist", "grout13.global.min.js");
const HAS_LOCAL_GROUT = fs.existsSync(GROUT_DIST);
const HEADERS = { "access-control-allow-origin": "*" };

function fail(message) {
    throw new Error(message);
}

async function installRoutes(page) {
    await page.route(/^https:\/\/cdn\.jsdelivr\.net\/gh\//, (route) => {
        const url = route.request().url();
        const fulfill = (filePath, contentType) => route.fulfill({ path: filePath, contentType, headers: HEADERS });
        if (url === CSS_CDN) return fulfill(CSS_DIST, "text/css; charset=utf-8");
        if (url === PHASER_CDN) return fulfill(PHASER_DIST, "text/javascript; charset=utf-8");
        if (url === FACADE_MAIN + "gm-phaser4.global.min.js" || url === FACADE_PIN + "gm-phaser4.global.min.js") return fulfill(FACADE_DIST, "text/javascript; charset=utf-8");
        if (url === FACADE_MAIN + "gm-phaser4-grout13.global.min.js" || url === FACADE_PIN + "gm-phaser4-grout13.global.min.js") return fulfill(BRIDGE_DIST, "text/javascript; charset=utf-8");
        if (url === GROUT_MAIN || url === GROUT_PIN) {
            return HAS_LOCAL_GROUT ? fulfill(GROUT_DIST, "text/javascript; charset=utf-8") : route.continue();
        }
        return route.abort("blockedbyclient");
    });
}

async function assertAllInOneFile(page, fileName, proofName) {
    const pageErrors = [];
    const consoleErrors = [];
    const childFileRequests = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
        if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) consoleErrors.push(message.text());
    });
    page.on("request", (request) => {
        if (request.url().startsWith("file:") && request.resourceType() !== "document") childFileRequests.push(request.url());
    });
    await installRoutes(page);
    await page.goto(pathToFileURL(path.join(ROOT, "examples", fileName)).href, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForFunction((name) => Boolean(window[name]?.complete || window[name]?.failed), proofName, { timeout: 20000 });
    const proof = await page.evaluate((name) => window[name], proofName);
    assert.equal(proof.fileMode, true, fileName + " runs in file mode");
    assert.equal(proof.failed, false, fileName + " does not report a file-origin error: " + JSON.stringify(proof));
    assert.equal(proof.complete, true, fileName + " completes from a direct file URL");
    assert.deepEqual(proof.errors, [], fileName + " proof errors");
    assert.equal(childFileRequests.length, 0, fileName + " must not request a child file URL");
    assert.equal(pageErrors.length, 0, fileName + " page errors: " + pageErrors.join(" | "));
    assert.equal(consoleErrors.length, 0, fileName + " console errors: " + consoleErrors.join(" | "));
    return proof;
}

ensureFrontendDeps(ROOT);
if (process.env.GROUT13_GLOBAL_PATH && !HAS_LOCAL_GROUT) {
    fail("Fruit Shot file-origin proof received a missing GROUT13_GLOBAL_PATH fixture override.");
}
for (const assetPath of [PHASER_DIST, FACADE_DIST, BRIDGE_DIST, CSS_DIST]) {
    if (!fs.existsSync(assetPath)) fail("Fruit Shot file-origin proof needs local fixture: " + assetPath);
}
fs.mkdirSync(REPORT_ROOT, { recursive: true });
const requireFromRoot = createRequire(path.join(ROOT, "package.json"));
const { chromium } = requireFromRoot("playwright-core");
const launch = await launchBrowser(chromium);

try {
    const desktop = await launch.browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    try {
        const grout = await desktop.newPage();
        const groutProof = await assertAllInOneFile(grout, "fruit-shot-grout13.html", "__fruitShotGrout13Proof");
        assert.equal(groutProof.pixelTextFlipY, false, "Grout13 direct-file text stays upright");
        await grout.screenshot({ path: path.join(REPORT_ROOT, "fruit-shot-grout13-direct-file.png") });
        const core = await desktop.newPage();
        const coreProof = await assertAllInOneFile(core, "fruit-shot.html", "__fruitShotProof");
        assert.equal(coreProof.pixelTextFlipY, false, "Core direct-file text stays upright");
        await core.screenshot({ path: path.join(REPORT_ROOT, "fruit-shot-core-direct-file.png") });
    } finally {
        await desktop.close();
    }

    const modularContext = await launch.browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    try {
        const page = await modularContext.newPage();
        const childFileRequests = [];
        const pageErrors = [];
        page.on("request", (request) => {
            if (request.url().startsWith("file:") && request.resourceType() !== "document") childFileRequests.push(request.url());
        });
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await page.goto(pathToFileURL(path.join(ROOT, "examples", "fruit-shot-modular.html")).href, { waitUntil: "domcontentloaded", timeout: 20000 });
        const proof = await page.evaluate(() => window.__fruitShotModularProof);
        assert.equal(proof.phase, "server-required", "Modular direct-file page gives server guidance");
        assert.equal(proof.serverRequired, true, "Modular direct-file page records the server prerequisite");
        assert.equal(proof.failed, false, "Modular direct-file page does not falsely report a runtime failure");
        assert.equal(childFileRequests.length, 0, "Modular direct-file page must not request its module child");
        assert.equal(pageErrors.length, 0, "Modular direct-file page errors: " + pageErrors.join(" | "));
    } finally {
        await modularContext.close();
    }
} finally {
    await launch.browser.close();
}

console.log("[ok] Fruit Shot direct-file all-in-one pages load without child file requests; the modular page gives safe HTTP-server guidance using " + launch.label + " with " + (HAS_LOCAL_GROUT ? "a local Grout13 fixture." : "the GitHub Grout13 CDN."));
