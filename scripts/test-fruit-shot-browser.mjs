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

function fail(message) {
    throw new Error(message);
}

function assertFinite(value, label) {
    if (!Number.isFinite(Number(value))) fail(`${label} is not finite: ${value}`);
}

function assertProof(report, render) {
    if (!report || report.failed || !report.complete) {
        fail(`${render} Fruit Shot proof did not complete: ${JSON.stringify(report, null, 2)}`);
    }
    assert.deepEqual([...report.atlasFrames].sort(), ["lemon", "lime", "strawberry"]);
    for (const field of [
        "textExtSeen",
        "textFitSeen",
        "guiTextExtSeen",
        "guiTextFitSeen",
        "spriteOptionsSeen",
        "fixedStepsSeen"
    ]) assert.equal(report[field], true, `${render} proof field ${field}`);
    assert.ok(report.frames >= 8, `${render} should report at least eight fixed steps`);
    assert.equal(report.bridgeUsed, false, `${render} public proof must identify the procedural fallback path`);
    for (const [label, value] of Object.entries(report.sprite || {})) assertFinite(value, `${render} sprite ${label}`);
    for (const [label, value] of Object.entries(report.text || {})) {
        if (label !== "fontSize") assertFinite(value, `${render} text ${label}`);
    }
    for (const [label, value] of Object.entries(report.guiText || {})) {
        if (label !== "fontSize") assertFinite(value, `${render} GUI text ${label}`);
    }
    assert.ok(report.errors.length === 0, `${render} proof errors: ${report.errors.join(" | ")}`);
}

ensureFrontendDeps(ROOT);
fs.mkdirSync(REPORT_ROOT, { recursive: true });
const requireFromRoot = createRequire(path.join(ROOT, "package.json"));
const { chromium } = requireFromRoot("playwright-core");
const launch = await launchBrowser(chromium);
const browser = launch.browser;
const server = await startStaticServer(ROOT, PORT, { fallbackPath: "examples/fruit-shot.html" });
const results = [];

try {
    for (const render of ["canvas", "webgl"]) {
        const context = await browser.newContext({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
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
            await page.goto(`http://127.0.0.1:${PORT}/examples/fruit-shot.html?render=${render}`, {
                waitUntil: "domcontentloaded",
                timeout: 20000
            });
            await page.waitForFunction(() => Boolean(window.__fruitShotProof?.complete || window.__fruitShotProof?.failed), null, {
                timeout: 20000
            });
            const report = await page.evaluate(() => window.__fruitShotProof);
            assertProof(report, render);
            assert.equal(await page.locator("canvas").count(), 1, `${render} Fruit Shot should create one canvas`);
            assert.equal(pageErrors.length, 0, `${render} page errors: ${pageErrors.join(" | ")}`);
            assert.equal(consoleErrors.length, 0, `${render} console errors: ${consoleErrors.join(" | ")}`);
            await page.screenshot({ path: path.join(REPORT_ROOT, `fruit-shot-${render}.png`) });
            results.push({ render, frames: report.frames, screenshot: `fruit-shot-${render}.png` });
        } finally {
            await context.close();
        }
    }
} finally {
    await browser.close();
    await stopServer(server);
}

fs.writeFileSync(path.join(REPORT_ROOT, "report.json"), `${JSON.stringify({ browser: launch.label, results }, null, 2)}\n`, "utf8");
console.log(`[ok] Fruit Shot browser proof passed for Canvas and WebGL using ${launch.label}.`);
