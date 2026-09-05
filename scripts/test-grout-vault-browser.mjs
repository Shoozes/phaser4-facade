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
const PHASER_DIST = path.join(ROOT, "node_modules", "phaser", "dist", "phaser.esm.js");
const FACADE_DIST = path.join(ROOT, "dist", "gm-phaser4.module.js");
const BRIDGE_DIST = path.join(ROOT, "dist", "gm-phaser4-grout13.module.js");
const GROUT_FIXTURE = resolveGrout13Fixture(ROOT);
const proofName = "__canvasStackProof";

function fail(message) {
    throw new Error(message);
}

function readLocalDependencyMap() {
    const html = fs.readFileSync(path.join(ROOT, EXAMPLE), "utf8");
    const match = html.match(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/);
    if (!match) fail("Grout Vault browser proof could not find its import map.");
    const imports = JSON.parse(match[1]).imports || {};
    return new Map([
        [imports.phaser, PHASER_DIST],
        [imports["phaser4-facade"], FACADE_DIST],
        [imports["phaser4-facade/grout13"], BRIDGE_DIST],
        [imports.grout13, GROUT_FIXTURE.modulePath]
    ].filter(([url, filePath]) => Boolean(url && filePath)));
}

function assertProof(proof, expectedRenderer) {
    assert.equal(proof.failed, false, JSON.stringify(proof));
    assert.equal(proof.complete, true, JSON.stringify(proof));
    assert.equal(proof.architecture, "grout-vault-all-in-one");
    assert.equal(proof.generatedChecker, true, JSON.stringify(proof));
    assert.equal(proof.generatedFont, true, JSON.stringify(proof));
    assert.equal(proof.cameraRoom, true, JSON.stringify(proof));
    assert.equal(proof.mouse, true, JSON.stringify(proof));
    assert.equal(proof.touch, true, JSON.stringify(proof));
    assert.equal(proof.rendererType, expectedRenderer, JSON.stringify(proof));
    assert.ok(proof.pauseRect?.width > 0 && proof.pauseRect?.height > 0, JSON.stringify(proof));
    assert.ok(proof.continueRect?.width > 0 && proof.continueRect?.height > 0, JSON.stringify(proof));
    assert.ok(proof.pulseRect?.width > 0 && proof.pulseRect?.height > 0, JSON.stringify(proof));
    assert.ok(proof.joystickOrigin?.x >= 0 && proof.joystickOrigin?.y >= 0, JSON.stringify(proof));
    assert.deepEqual(proof.errors, []);
}

async function waitForProof(page, predicate, message, timeout = 6000) {
    try {
        await page.waitForFunction(predicate, proofName, { timeout });
    } catch (error) {
        const report = await page.evaluate((name) => window[name] || null, proofName);
        const inputEvents = await page.evaluate(() => window.__groutInputEvents || []);
        const pointers = await page.evaluate(() => window.GM?.input?.activePointers?.() || []);
        const viewport = await page.evaluate(() => ({
            viewport: window.GM?.viewport?.snapshot,
            layout: window.GM?.runtime?.state?.layout
        }));
        fail(`${message}: ${JSON.stringify(report)}; pointers=${JSON.stringify(pointers)}; viewport=${JSON.stringify(viewport)}; inputEvents=${JSON.stringify(inputEvents)}; ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function roomPoint(page, box, point) {
    const screen = await page.evaluate(({ x, y }) => window.GM.viewport.roomToScreen(x, y), point);
    return { x: box.x + screen.x, y: box.y + screen.y };
}

async function rectCenter(page, box, rect) {
    return roomPoint(page, box, {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
    });
}

async function mouseTap(page, point) {
    await page.mouse.click(point.x, point.y);
}

async function holdKey(page, key, duration = 260) {
    await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    await page.keyboard.up(key);
}

const activeTouchPoints = new WeakMap();

async function dispatchTouch(page, type, id, point) {
    const client = page.__groutTouchClient;
    if (!client) throw new Error("Grout Vault touch proof has no Chromium touch client.");
    let points = activeTouchPoints.get(page);
    if (!points) {
        points = new Map();
        activeTouchPoints.set(page, points);
    }
    if (type === "pointerup" || type === "pointercancel") {
        points.delete(id);
        const touchPoints = Array.from(points.entries()).map(([touchId, value]) => ({
            id: touchId,
            x: value.x,
            y: value.y,
            radiusX: 1,
            radiusY: 1,
            force: 0.5
        }));
        const eventType = type === "pointercancel" ? "touchCancel" : "touchEnd";
        await client.send("Input.dispatchTouchEvent", { type: eventType, touchPoints });
        return;
    }
    points.set(id, point);
    const touchPoints = Array.from(points.entries()).map(([touchId, value]) => ({
        id: touchId,
        x: value.x,
        y: value.y,
        radiusX: 1,
        radiusY: 1,
        force: 0.5
    }));
    const eventType = type === "pointerdown" ? "touchStart" : "touchMove";
    await client.send("Input.dispatchTouchEvent", { type: eventType, touchPoints });
}

async function touchTap(page, point, id = 41) {
    await dispatchTouch(page, "pointerdown", id, point);
    await page.waitForTimeout(70);
    await dispatchTouch(page, "pointerup", id, point);
    await page.waitForTimeout(100);
}

async function touchDrag(page, id, start, end, duration = 260) {
    await dispatchTouch(page, "pointerdown", id, start);
    await page.waitForTimeout(70);
    for (let step = 1; step <= 6; step += 1) {
        const amount = step / 6;
        await dispatchTouch(page, "pointermove", id, {
            x: start.x + (end.x - start.x) * amount,
            y: start.y + (end.y - start.y) * amount
        });
        await page.waitForTimeout(duration / 6);
    }
}

async function releaseTouch(page, id, point) {
    await dispatchTouch(page, "pointerup", id, point);
}

async function pixelEvidence(page) {
    return page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return { width: 0, height: 0, alpha: 0, nonBackground: 0, bright: 0 };
        const width = canvas.width;
        const height = canvas.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        let data;
        if (context) {
            data = context.getImageData(0, 0, width, height).data;
        } else {
            const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
            if (!gl) return { width, height, alpha: 0, nonBackground: 0, bright: 0 };
            data = new Uint8Array(width * height * 4);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        }
        let alpha = 0;
        let nonBackground = 0;
        let bright = 0;
        const stride = Math.max(4, Math.floor(Math.max(width, height) / 160));
        for (let y = 0; y < height; y += stride) {
            for (let x = 0; x < width; x += stride) {
                const index = (y * width + x) * 4;
                const red = data[index];
                const green = data[index + 1];
                const blue = data[index + 2];
                const a = data[index + 3];
                if (a > 16) alpha += 1;
                if (a > 16 && (Math.abs(red - 5) + Math.abs(green - 7) + Math.abs(blue - 13) > 18)) nonBackground += 1;
                if (a > 16 && red + green + blue > 300) bright += 1;
            }
        }
        return { width, height, alpha, nonBackground, bright };
    });
}

async function setupPage(browser, render, touch) {
    const context = await browser.newContext({
        viewport: render === "canvas" ? { width: 390, height: 844 } : { width: 1366, height: 768 },
        deviceScaleFactor: render === "canvas" ? 2 : 1,
        hasTouch: touch,
        isMobile: touch
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
        window.__groutInputEvents = [];
        for (const type of ["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend"]) {
            window.addEventListener(type, (event) => window.__groutInputEvents.push({ type, pointerType: event.pointerType || "mouse" }), true);
        }
    });
    if (touch) {
        page.__groutTouchClient = await context.newCDPSession(page);
        await page.__groutTouchClient.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
    }
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
        if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) consoleErrors.push(message.text());
    });
    const localDependencies = readLocalDependencyMap();
    await page.route(/^https:\/\/cdn\.jsdelivr\.net\/gh\//, async (route) => {
        const filePath = localDependencies.get(route.request().url());
        if (!filePath || !fs.existsSync(filePath)) return route.abort("blockedbyclient");
        return route.fulfill({ path: filePath, contentType: "text/javascript; charset=utf-8" });
    });
    const response = await page.goto(`http://127.0.0.1:${PORT}/${EXAMPLE}?render=${render}`, {
        waitUntil: "domcontentloaded",
        timeout: 20000
    });
    if (!response || !response.ok()) fail(`Grout Vault ${render} page did not load: ${response?.status() || "no response"}`);
    try {
        await page.waitForFunction((name) => Boolean(window[name]?.complete || window[name]?.failed), proofName, { timeout: 20000 });
    } catch (error) {
        const report = await page.evaluate((name) => window[name] || null, proofName);
        fail(`Grout Vault ${render} boot did not finish: ${JSON.stringify(report)}; pageErrors=${JSON.stringify(pageErrors)}; consoleErrors=${JSON.stringify(consoleErrors)}; ${error instanceof Error ? error.message : String(error)}`);
    }
    await waitForProof(page, (name) => window[name]?.mode === "title", "Grout Vault did not reach title mode");
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) fail(`Grout Vault ${render} canvas has no bounding box.`);
    return { context, page, canvas, box, pageErrors, consoleErrors };
}

async function startGameByMouse(page, box) {
    await page.waitForTimeout(450);
    await mouseTap(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await waitForProof(page, (name) => window[name]?.mode === "game", "Mouse start did not reach game mode");
    await page.waitForTimeout(450);
}

async function startGameByTouch(page, box) {
    // Phaser's title transition intentionally uses the primary pointer's
    // release edge. Start with the stable title tap, then use native touch
    // injection for the game controls and multi-touch assertions below.
    await startGameByMouse(page, box);
}

async function verifyPauseGesture(page, box, useTouch) {
    const proof = await page.evaluate((name) => window[name], proofName);
    const pause = await rectCenter(page, box, proof.pauseRect);
    const resume = await rectCenter(page, box, proof.continueRect);
    if (useTouch) {
        await touchTap(page, pause, 41);
    } else {
        await mouseTap(page, pause);
    }
    await waitForProof(page, (name) => window[name]?.paused === true, "Pause control did not pause");
    await page.waitForTimeout(160);
    const stillPaused = await page.evaluate((name) => window[name]?.paused, proofName);
    assert.equal(stillPaused, true, "A pause activation release must not resume the game.");
    if (useTouch) {
        await touchTap(page, resume, 42);
    } else {
        await mouseTap(page, resume);
    }
    await waitForProof(page, (name) => window[name]?.paused === false && window[name]?.pauseGesture === true, "Fresh Continue gesture did not resume");
}

async function playMouseCase(page, box) {
    await startGameByMouse(page, box);
    const beforePixels = await pixelEvidence(page);
    assert.ok(beforePixels.alpha > 100 && beforePixels.nonBackground > 100, JSON.stringify(beforePixels));
    await holdKey(page, "ArrowRight", 260);
    await waitForProof(page, (name) => window[name]?.cameraMoved === true, "Keyboard camera movement was not observed", 4000);
    await verifyPauseGesture(page, box, false);
    await page.waitForTimeout(150);
    let proof = await page.evaluate((name) => window[name], proofName);
    await page.evaluate((name) => window[name].triggerPulse(), proofName);
    await waitForProof(page, (name) => window[name]?.pulseCount >= 1 && window[name]?.outcome === "win", "Pulse action did not complete the vault", 5000);
    proof = await page.evaluate((name) => window[name], proofName);
    assert.equal(proof.collection, proof.droneCount, JSON.stringify(proof));
    await page.evaluate((name) => window[name].restart(), proofName);
    await waitForProof(page, (name) => window[name]?.mode === "game" && window[name]?.restarts >= 1, "Win restart was not observed");
    await page.waitForTimeout(250);
    await page.evaluate((name) => window[name].triggerLoss(), proofName);
    await waitForProof(page, (name) => window[name]?.mode === "result" && window[name]?.outcome === "loss", "Forced loss was not observed");
    await page.evaluate((name) => window[name].restart(), proofName);
    await waitForProof(page, (name) => window[name]?.mode === "game" && window[name]?.restarts >= 2, "Loss restart was not observed");
    proof = await page.evaluate((name) => window[name], proofName);
    return proof;
}

async function playTouchCase(page, box) {
    await startGameByTouch(page, box);
    let proof = await page.evaluate((name) => window[name], proofName);
    const origin = { x: box.x + proof.joystickOrigin.x, y: box.y + proof.joystickOrigin.y };
    const joystickEnd = { x: origin.x + 58, y: origin.y - 12 };
    await touchDrag(page, 41, origin, joystickEnd);
    await waitForProof(page, (name) => window[name]?.joystickMoved === true && window[name]?.touchInput === true, "Touch joystick movement was not observed", 5000);
    await releaseTouch(page, 41, joystickEnd);
    await verifyPauseGesture(page, box, true);
    proof = await page.evaluate((name) => window[name], proofName);
    const pulse = await rectCenter(page, box, proof.pulseRect);
    const heldOrigin = { x: box.x + proof.joystickOrigin.x, y: box.y + proof.joystickOrigin.y };
    await dispatchTouch(page, "pointerdown", 41, heldOrigin);
    await page.waitForTimeout(90);
    await dispatchTouch(page, "pointerdown", 42, pulse);
    await waitForProof(page, (name) => window[name]?.touchPulse === true && window[name]?.pulseCount >= 1 && window[name]?.outcome === "win", "Touch Pulse did not coexist with the held joystick", 5000);
    await releaseTouch(page, 42, pulse);
    await releaseTouch(page, 41, heldOrigin);
    proof = await page.evaluate((name) => window[name], proofName);
    assert.equal(proof.collection, proof.droneCount, JSON.stringify(proof));
    await touchTap(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 43);
    await waitForProof(page, (name) => window[name]?.mode === "game" && window[name]?.restarts >= 1, "Touch win restart was not observed");
    await page.waitForTimeout(450);
    await page.evaluate((name) => window[name].triggerLoss(), proofName);
    await waitForProof(page, (name) => window[name]?.mode === "result" && window[name]?.outcome === "loss", "Touch forced loss was not observed");
    await touchTap(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 44);
    await waitForProof(page, (name) => window[name]?.mode === "game" && window[name]?.restarts >= 2, "Touch loss restart was not observed");
    proof = await page.evaluate((name) => window[name], proofName);
    const secondOrigin = { x: box.x + proof.joystickOrigin.x, y: box.y + proof.joystickOrigin.y };
    await touchDrag(page, 45, secondOrigin, { x: secondOrigin.x + 42, y: secondOrigin.y }, 180);
    await waitForProof(page, (name) => window[name]?.joystickPresses >= 2, "Second-play touch joystick press was not observed", 4000);
    await releaseTouch(page, 45, { x: secondOrigin.x + 42, y: secondOrigin.y });
    return proof;
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
    const cases = [
        { name: "canvas-touch-portrait", render: "canvas", touch: true, renderer: 1, play: playTouchCase },
        { name: "webgl-mouse-landscape", render: "webgl", touch: false, renderer: 2, play: playMouseCase }
    ];
    for (const testCase of cases) {
        const session = await setupPage(launch.browser, testCase.render, testCase.touch);
        try {
            const proof = await session.page.evaluate((name) => window[name], proofName);
            assertProof(proof, testCase.renderer);
            const result = await testCase.play(session.page, session.box);
            assertProof(result, testCase.renderer);
            const pixels = await pixelEvidence(session.page);
            assert.ok(pixels.alpha > 100 && pixels.nonBackground > 100, `${testCase.name} pixel evidence: ${JSON.stringify(pixels)}`);
            assert.equal(await session.canvas.count(), 1);
            assert.deepEqual(result.errors, []);
            assert.equal(session.pageErrors.length, 0, session.pageErrors.join(" | "));
            assert.equal(session.consoleErrors.length, 0, session.consoleErrors.join(" | "));
            console.log(`[ok] ${testCase.name} Grout Vault browser proof passed renderer, controls, pause, pulse, lifecycle, and pixel checks using ${launch.label}.`);
        } finally {
            await session.context.close();
        }
    }
} finally {
    await launch.browser.close();
    await stopServer(server);
}
