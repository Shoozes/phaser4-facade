#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { ensureFrontendDeps, launchBrowser, startStaticServer, stopServer } from "./smoke/smoke-server.mjs";
import { resolveGrout13Fixture } from "./grout13-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4521;
const EXAMPLE = "examples/grout-vault-all-in-one.html";
const PHASER_CDN = "https://cdn.jsdelivr.net/gh/phaserjs/phaser@v4.2.1/dist/phaser.esm.js";
const FACADE_PREFIX = "https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@";
const GROUT_PREFIX = "https://cdn.jsdelivr.net/gh/Shoozes/grout13@";
const PHASER_DIST = path.join(ROOT, "node_modules", "phaser", "dist", "phaser.esm.js");
const FACADE_DIST = path.join(ROOT, "dist", "gm-phaser4.module.js");
const BRIDGE_DIST = path.join(ROOT, "dist", "gm-phaser4-grout13.module.js");
const GROUT_FIXTURE = resolveGrout13Fixture(ROOT);
const proofName = "__canvasStackProof";

function fail(message) {
    throw new Error(message);
}

ensureFrontendDeps(ROOT);
for (const filePath of [PHASER_DIST, FACADE_DIST, BRIDGE_DIST, GROUT_FIXTURE.modulePath]) {
    if (!filePath || !fs.existsSync(filePath)) fail(`Grout Vault browser proof needs local fixture: ${filePath}`);
}

const requireFromPackage = createRequire(path.join(ROOT, "package.json"));
const { chromium } = requireFromPackage("playwright-core");
const launch = await launchBrowser(chromium);
const server = await startStaticServer(ROOT, PORT, { fallbackPath: EXAMPLE });

try {
    const context = await launch.browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
        if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) consoleErrors.push(message.text());
    });
    await page.route(/^https:\/\/cdn\.jsdelivr\.net\/gh\//, async (route) => {
        const url = route.request().url();
        if (url === PHASER_CDN) return route.fulfill({ path: PHASER_DIST, contentType: "text/javascript; charset=utf-8" });
        if (url.startsWith(FACADE_PREFIX) && url.endsWith("/dist/gm-phaser4.module.js")) return route.fulfill({ path: FACADE_DIST, contentType: "text/javascript; charset=utf-8" });
        if (url.startsWith(FACADE_PREFIX) && url.endsWith("/dist/gm-phaser4-grout13.module.js")) return route.fulfill({ path: BRIDGE_DIST, contentType: "text/javascript; charset=utf-8" });
        if (url.startsWith(GROUT_PREFIX) && url.endsWith("/dist/grout13.mjs")) return route.fulfill({ path: GROUT_FIXTURE.modulePath, contentType: "text/javascript; charset=utf-8" });
        return route.abort("blockedbyclient");
    });
    try {
        const response = await page.goto(`http://127.0.0.1:${PORT}/${EXAMPLE}`, { waitUntil: "domcontentloaded", timeout: 20000 });
        if (!response || !response.ok()) fail(`Grout Vault page did not load: ${response?.status() || "no response"}`);
        try {
            await page.waitForFunction((name) => Boolean(window[name]?.complete || window[name]?.failed), proofName, { timeout: 20000 });
        } catch (error) {
            const report = await page.evaluate((name) => window[name] || null, proofName);
            fail(`Grout Vault did not finish boot: ${JSON.stringify(report)}; pageErrors=${JSON.stringify(pageErrors)}; consoleErrors=${JSON.stringify(consoleErrors)}; ${error instanceof Error ? error.message : String(error)}`);
        }
        let proof = await page.evaluate((name) => window[name], proofName);
        assert.equal(proof.failed, false, JSON.stringify(proof));
        assert.equal(proof.complete, true, JSON.stringify(proof));
        assert.equal(proof.architecture, "grout-vault-all-in-one");
        assert.equal(proof.generatedChecker, true);
        assert.equal(proof.generatedFont, true);
        assert.equal(proof.cameraRoom, true);
        assert.equal(proof.mouse, true);
        assert.equal(proof.touch, true);

        await page.waitForFunction((name) => window[name]?.mode === "title", proofName, { timeout: 6000 });
        await page.waitForTimeout(400);
        const canvas = page.locator("canvas");
        const box = await canvas.boundingBox();
        if (!box) fail("Grout Vault canvas has no bounding box");
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.waitForTimeout(60);
        await page.mouse.up();
        await page.waitForFunction((name) => window[name]?.mode === "game", proofName, { timeout: 6000 });
        await page.waitForTimeout(400);

        await page.mouse.move(box.x + box.width * 0.84, box.y + box.height * 0.52);
        await page.mouse.down();
        await page.waitForTimeout(120);
        await page.mouse.up();
        try {
            await page.waitForFunction((name) => window[name]?.cameraMoved === true, proofName, { timeout: 4000 });
        } catch (error) {
            const report = await page.evaluate((name) => window[name] || null, proofName);
            fail(`Grout Vault camera movement was not observed: ${JSON.stringify(report)}; ${error instanceof Error ? error.message : String(error)}`);
        }

        const pauseX = box.x + box.width * ((720 - 24 - 59) / 720);
        const pauseY = box.y + box.height * ((24 + 27) / 1280);
        await page.mouse.click(pauseX, pauseY);
        await page.waitForFunction((name) => window[name]?.paused === true, proofName, { timeout: 3000 });
        await page.mouse.click(centerX, centerY);
        await page.waitForFunction((name) => window[name]?.paused === false, proofName, { timeout: 3000 });

        await page.keyboard.press("x");
        await page.waitForFunction((name) => window[name]?.pulseCount >= 1 && window[name]?.outcome === "win", proofName, { timeout: 5000 });
        proof = await page.evaluate((name) => window[name], proofName);
        assert.equal(proof.collection, proof.droneCount);

        await page.mouse.click(centerX, centerY);
        await page.waitForFunction((name) => window[name]?.mode === "game" && window[name]?.restarts >= 1, proofName, { timeout: 5000 });
        await page.waitForTimeout(400);
        await page.evaluate((name) => window[name].triggerLoss(), proofName);
        await page.waitForFunction((name) => window[name]?.mode === "result" && window[name]?.outcome === "loss", proofName, { timeout: 3000 });
        await page.mouse.click(centerX, centerY);
        try {
            await page.waitForFunction((name) => window[name]?.mode === "game" && window[name]?.restarts >= 2, proofName, { timeout: 5000 });
        } catch (error) {
            const report = await page.evaluate((name) => window[name] || null, proofName);
            fail(`Grout Vault loss restart was not observed: ${JSON.stringify(report)}; ${error instanceof Error ? error.message : String(error)}`);
        }

        proof = await page.evaluate((name) => window[name], proofName);
        assert.equal(await canvas.count(), 1);
        assert.ok((await page.evaluate(() => document.querySelector("canvas")?.toDataURL("image/png") || "")).length > 1000);
        assert.deepEqual(proof.errors, []);
        assert.equal(pageErrors.length, 0, pageErrors.join(" | "));
        assert.equal(consoleErrors.length, 0, consoleErrors.join(" | "));
        console.log(`[ok] Grout Vault all-in-one browser proof passed title/game, camera, pause, pulse/collection win, loss, and two restart cycles using ${launch.label}.`);
    } finally {
        await context.close();
    }
} finally {
    await launch.browser.close();
    await stopServer(server);
}
