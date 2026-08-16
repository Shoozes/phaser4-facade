#!/usr/bin/env node
/**
 * Behavioral qualification for phaser4-facade.
 * Stage 2 after scripts/test-runtime-package.mjs structural checks.
 *
 * - Packs the facade and installs it into temporary consumers with Phaser 4.2.1
 * - Serves the browser fixture with module, global, and minified-global artifacts
 * - Exercises start → frames → pointer → resize → destroy → restart
 * - Optional resolution matrix exercises responsive room mapping at DPR 1/2/3
 * - Runs WebGL and Canvas modes
 * - Fails on page errors, unhandled rejections, and failed fixture checks
 */
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { ensureFrontendDeps, launchBrowser } from "./smoke/smoke-server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = ROOT;
const FIXTURE_ROOT = path.join(PACKAGE_ROOT, "tests", "browser");
const FRONTEND_ROOT = ROOT;
const WORK_ROOT_BASE = path.resolve(
    process.env.PHASER4_RUNTIME_BEHAVIOR_ROOT || path.join(ROOT, "runtime-data", "runtime-behavior")
);
const WORK_ROOT = process.argv.includes("--skip-install")
    ? WORK_ROOT_BASE
    : path.join(WORK_ROOT_BASE, `run-${Date.now()}-${process.pid}`);
const CACHE_ROOT = path.join(WORK_ROOT, "cache");
const NPM_CACHE = path.resolve(
    process.env.PHASER4_RUNTIME_BEHAVIOR_NPM_CACHE || path.join(ROOT, "runtime-data", "npm-cache")
);
const DEFAULT_START_PORT = 4310;
const PAGE_TIMEOUT_MS = 20000;
const NPM_TIMEOUT_MS = 120000;

const PHASER_VERSIONS = ["4.2.1"];
const ARTIFACTS = ["module", "global", "global.min"];
const RENDER_MODES = ["webgl", "canvas"];
const RESOLUTION_VIEWPORTS = [
    { id: "phone-320x568", width: 320, height: 568 },
    { id: "phone-360x640", width: 360, height: 640 },
    { id: "phone-390x844", width: 390, height: 844 },
    { id: "phone-430x932", width: 430, height: 932 },
    { id: "tablet-768x1024", width: 768, height: 1024 },
    { id: "desktop-1366x768", width: 1366, height: 768 }
];
const RESOLUTION_DPRS = [1, 2, 3];
const RESOLUTION_ROOM_POINT = { x: 180, y: 320 };

function fail(message) {
    throw new Error(message);
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function rimraf(target) {
    fs.rmSync(target, { recursive: true, force: true });
}

function cleanupWorkRoot() {
    if (WORK_ROOT === WORK_ROOT_BASE || !fs.existsSync(WORK_ROOT)) return;
    try {
        fs.rmSync(WORK_ROOT, { recursive: true, force: true });
    } catch (error) {
        console.warn(`[warn] Runtime behavior cleanup deferred for ${path.relative(ROOT, WORK_ROOT)}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

process.on("exit", cleanupWorkRoot);

function copyFile(from, to) {
    ensureDir(path.dirname(to));
    fs.copyFileSync(from, to);
}

function copyDir(from, to) {
    ensureDir(to);
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const source = path.join(from, entry.name);
        const dest = path.join(to, entry.name);
        if (entry.isDirectory()) copyDir(source, dest);
        else copyFile(source, dest);
    }
}

function resolveNpm() {
    const bundledCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    if (fs.existsSync(bundledCli)) {
        return { executable: process.execPath, args: [bundledCli] };
    }
    return { executable: process.platform === "win32" ? "npm.cmd" : "npm", args: [] };
}

function runNpm(args, cwd, label) {
    const npm = resolveNpm();
    const result = spawnSync(npm.executable, [...npm.args, ...args], {
        cwd,
        encoding: "utf8",
        env: {
            ...process.env,
            npm_config_cache: NPM_CACHE,
            npm_config_audit: "false",
            npm_config_fund: "false",
            npm_config_update_notifier: "false",
            npm_config_progress: "false"
        },
        timeout: NPM_TIMEOUT_MS,
        killSignal: "SIGTERM"
    });
    if (result.error?.code === "ETIMEDOUT" || result.signal) {
        fail(`${label} timed out after ${NPM_TIMEOUT_MS}ms.`);
    }
    if (result.status !== 0) {
        fail(`${label} failed:\n${result.stdout || ""}\n${result.stderr || ""}`);
    }
    return result;
}

function contentTypeFor(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".html") return "text/html; charset=utf-8";
    if (ext === ".js" || ext === ".mjs") return "text/javascript; charset=utf-8";
    if (ext === ".css") return "text/css; charset=utf-8";
    if (ext === ".json") return "application/json; charset=utf-8";
    if (ext === ".map") return "application/json; charset=utf-8";
    return "application/octet-stream";
}

function isPortFree(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
            server.close(() => resolve(true));
        });
        server.listen(port, "127.0.0.1");
    });
}

function startStaticServer(rootDir, port) {
    const resolvedRoot = path.resolve(rootDir);
    const server = http.createServer((request, response) => {
        const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
        let decoded;
        try {
            decoded = decodeURIComponent(requestUrl.pathname);
        } catch {
            response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Bad request");
            return;
        }
        const normalized = path.normalize(decoded).replace(/^([/\\])+/, "");
        const requestedPath = normalized === "" ? "index.html" : normalized;
        const filePath = path.resolve(resolvedRoot, requestedPath);
        const relativePath = path.relative(resolvedRoot, filePath);
        if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
            response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Forbidden");
            return;
        }
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not found");
            return;
        }
        response.writeHead(200, {
            "Content-Type": contentTypeFor(filePath),
            "Cache-Control": "no-store"
        });
        fs.createReadStream(filePath).pipe(response);
    });

    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
            resolve({
                close: () => new Promise((done) => server.close(done))
            });
        });
    });
}

async function startServer(rootDir, startPort) {
    for (let port = startPort; port < startPort + 100; port += 1) {
        if (!(await isPortFree(port))) continue;
        const server = await startStaticServer(rootDir, port);
        return { server, url: `http://127.0.0.1:${port}`, port };
    }
    fail(`No free runtime-behavior port found between ${startPort} and ${startPort + 99}.`);
}

function packFacade(pkg) {
    ensureDir(CACHE_ROOT);
    ensureDir(NPM_CACHE);
    const packResult = runNpm(["pack", "--json"], PACKAGE_ROOT, "npm pack phaser4-facade");
    let packedName = `${pkg.name}-${pkg.version}.tgz`;
    try {
        const parsed = JSON.parse(packResult.stdout || "[]");
        if (Array.isArray(parsed) && parsed[0]?.filename) packedName = parsed[0].filename;
        else if (parsed?.filename) packedName = parsed.filename;
    } catch {
        // Fall back to conventional tarball name.
    }
    const packedPath = path.join(PACKAGE_ROOT, packedName);
    if (!fs.existsSync(packedPath)) fail(`npm pack did not produce ${packedName}`);
    const cachePath = path.join(CACHE_ROOT, packedName);
    fs.renameSync(packedPath, cachePath);
    return cachePath;
}

function installConsumer(phaserVersion, tarballPath, skipInstall = false) {
    const consumerRoot = path.join(WORK_ROOT, "consumers", `phaser-${phaserVersion}`);
    if (skipInstall) {
        const installedPhaserPath = path.join(consumerRoot, "node_modules", "phaser", "package.json");
        const installedFacadePath = path.join(consumerRoot, "node_modules", "phaser4-facade", "package.json");
        if (!fs.existsSync(installedPhaserPath) || !fs.existsSync(installedFacadePath)) {
            fail(`--skip-install requested but cached consumer is incomplete for phaser@${phaserVersion}.`);
        }
        const installedPhaser = readJson(installedPhaserPath);
        if (installedPhaser.version !== phaserVersion) {
            fail(`cached consumer has phaser ${installedPhaser.version}, expected ${phaserVersion}`);
        }
        const installedFacade = readJson(installedFacadePath);
        if (installedFacade.name !== "phaser4-facade") {
            fail(`cached consumer has unexpected package: ${installedFacade.name}`);
        }
        copyDir(path.join(PACKAGE_ROOT, "dist"), path.join(consumerRoot, "node_modules", "phaser4-facade", "dist"));
        return consumerRoot;
    }
    rimraf(consumerRoot);
    ensureDir(consumerRoot);
    const packageJson = {
        name: `phaser4-facade-behavior-consumer-${phaserVersion.replace(/\./g, "-")}`,
        private: true,
        type: "module",
        dependencies: {
            phaser: phaserVersion,
            "phaser4-facade": `file:${tarballPath.replace(/\\/g, "/")}`
        }
    };
    fs.writeFileSync(path.join(consumerRoot, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
    runNpm(["install", "--no-save", "--no-package-lock"], consumerRoot, `npm install consumer phaser@${phaserVersion}`);
    return consumerRoot;
}

function stageServeRoot(phaserVersion, consumerRoot) {
    const serveRoot = path.join(WORK_ROOT, "serve", `phaser-${phaserVersion}`);
    rimraf(serveRoot);
    ensureDir(serveRoot);

    copyDir(FIXTURE_ROOT, serveRoot);

    const facadeDist = path.join(consumerRoot, "node_modules", "phaser4-facade", "dist");
    if (!fs.existsSync(facadeDist)) fail(`packed facade dist missing for phaser@${phaserVersion}`);
    copyDir(facadeDist, path.join(serveRoot, "dist"));

    const phaserDist = path.join(consumerRoot, "node_modules", "phaser", "dist");
    const phaserMin = path.join(phaserDist, "phaser.min.js");
    const phaserEsm = path.join(phaserDist, "phaser.esm.js");
    if (!fs.existsSync(phaserMin)) fail(`phaser.min.js missing for phaser@${phaserVersion}`);
    if (!fs.existsSync(phaserEsm)) fail(`phaser.esm.js missing for phaser@${phaserVersion}`);
    copyFile(phaserMin, path.join(serveRoot, "vendor", "phaser.min.js"));
    copyFile(phaserEsm, path.join(serveRoot, "vendor", "phaser.esm.js"));

    const installedPhaser = readJson(path.join(consumerRoot, "node_modules", "phaser", "package.json"));
    if (installedPhaser.version !== phaserVersion) {
        fail(`consumer installed phaser ${installedPhaser.version}, expected ${phaserVersion}`);
    }
    const installedFacade = readJson(path.join(consumerRoot, "node_modules", "phaser4-facade", "package.json"));
    if (installedFacade.name !== "phaser4-facade") {
        fail(`consumer installed unexpected package: ${installedFacade.name}`);
    }

    return serveRoot;
}

function isBenignConsoleText(text) {
    const value = String(text || "");
    if (!value) return true;
    if (value.startsWith("Failed to load resource:")) return true;
    // Phaser version banner is informational.
    if (/^%c %c %c %c %c Phaser v/i.test(value)) return true;
    if (/Phaser v\d+/i.test(value) && value.includes("https://phaser.io")) return true;
    return false;
}

/**
 * @param {import('playwright-core').Browser} browser
 * @param {string} baseUrl
 * @param {{ phaserVersion: string, artifact: string, render: string, resolution?: boolean, viewport?: { id: string, width: number, height: number }, deviceScaleFactor?: number }} cell
 */
async function runCell(browser, baseUrl, cell) {
    const context = await browser.newContext({
        viewport: cell.viewport || { width: 390, height: 844 },
        deviceScaleFactor: cell.deviceScaleFactor || 2
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const consoleWarnings = [];
    const pageErrors = [];

    page.on("console", (message) => {
        const text = message.text();
        if (isBenignConsoleText(text)) return;
        if (message.type() === "error") consoleErrors.push(text);
        if (message.type() === "warning") consoleWarnings.push(text);
    });
    page.on("pageerror", (error) => {
        pageErrors.push(error.message);
    });

    const url = new URL(baseUrl);
    url.searchParams.set("artifact", cell.artifact);
    url.searchParams.set("render", cell.render);
    url.searchParams.set("phaser", cell.phaserVersion);
    url.searchParams.set("frames", "8");
    if (cell.resolution) url.searchParams.set("resolution", "1");

    const label = `phaser@${cell.phaserVersion} artifact=${cell.artifact} render=${cell.render}` +
        (cell.resolution ? ` viewport=${cell.viewport.id} dpr=${cell.deviceScaleFactor}` : "");
    try {
        await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS });
        await page.waitForFunction(() => {
            const report = window.__gmRuntimeQualification;
            return Boolean(report && (report.phase === "primary-running" || report.phase === "resolution-ready" || report.complete || report.failed));
        }, null, { timeout: PAGE_TIMEOUT_MS });

        if (cell.resolution) {
            const snapshots = [];
            const probes = [];

            async function waitForViewport(viewport) {
                await page.waitForFunction(({ width, height }) => {
                    const canvas = document.querySelector("canvas");
                    const rect = canvas?.getBoundingClientRect();
                    const runtime = window.GM?.runtime;
                    return Boolean(
                        rect && runtime &&
                        Math.abs(rect.width - width) <= 1 &&
                        Math.abs(rect.height - height) <= 1 &&
                        Math.abs(Number(runtime.displayWidth) - width) <= 1 &&
                        Math.abs(Number(runtime.displayHeight) - height) <= 1
                    );
                }, viewport, { timeout: PAGE_TIMEOUT_MS });
            }

            async function captureSnapshot(id, viewport) {
                await waitForViewport(viewport);
                const snapshot = await page.evaluate(({ id: snapshotId, width, height, dpr }) => {
                    const canvas = document.querySelector("canvas");
                    const rect = canvas?.getBoundingClientRect();
                    const runtime = window.GM?.runtime;
                    return {
                        id: snapshotId,
                        viewport: { width, height, dpr },
                        canvas: rect ? {
                            x: rect.x,
                            y: rect.y,
                            width: rect.width,
                            height: rect.height,
                            pixelWidth: canvas.width,
                            pixelHeight: canvas.height
                        } : null,
                        room: runtime ? {
                            width: Number(runtime.roomWidth),
                            height: Number(runtime.roomHeight),
                            scale: Number(runtime.scale),
                            profile: runtime.profile,
                            orientation: runtime.orientation
                        } : null
                    };
                }, { id, width: viewport.width, height: viewport.height, dpr: cell.deviceScaleFactor });
                if (!snapshot.canvas || !snapshot.room) fail(`${label}: missing resolution snapshot at ${id}`);
                const expectedResolution = Math.min(cell.deviceScaleFactor, 3);
                if (Math.abs(snapshot.canvas.width - viewport.width) > 1 || Math.abs(snapshot.canvas.height - viewport.height) > 1) {
                    fail(`${label}: canvas CSS box drift at ${id}: ${JSON.stringify(snapshot)}`);
                }
                if (snapshot.canvas.pixelWidth !== Math.round(viewport.width * expectedResolution) ||
                    snapshot.canvas.pixelHeight !== Math.round(viewport.height * expectedResolution)) {
                    fail(`${label}: canvas backing-size drift at ${id}: ${JSON.stringify(snapshot)}`);
                }
                if (snapshot.room.width <= 0 || snapshot.room.height <= 0 || snapshot.room.scale <= 0) {
                    fail(`${label}: invalid room metrics at ${id}: ${JSON.stringify(snapshot)}`);
                }
                snapshots.push(snapshot);
            }

            async function runProbe(id) {
                await page.evaluate((request) => {
                    const report = window.__gmRuntimeQualification;
                    if (!report) throw new Error("runtime qualification report missing before pointer probe");
                    report.probeResult = null;
                    report.probeRequest = {
                        ...request,
                        status: "requested"
                    };
                }, { id, roomX: RESOLUTION_ROOM_POINT.x, roomY: RESOLUTION_ROOM_POINT.y });
                await page.waitForFunction((probeId) => window.__gmRuntimeQualification?.probeResult?.id === probeId, id, { timeout: PAGE_TIMEOUT_MS });
                const result = await page.evaluate(() => window.__gmRuntimeQualification?.probeResult || null);
                if (!result) fail(`${label}: missing pointer probe result at ${id}`);
                // Phaser normalizes DOM pointer coordinates to integer display pixels before
                // the facade converts them back to room space. Allow one display-pixel of
                // quantization while still catching DPR or layout-scale mistakes.
                const tolerance = 2.5;
                if (Math.abs(result.actual.x - RESOLUTION_ROOM_POINT.x) > tolerance ||
                    Math.abs(result.actual.y - RESOLUTION_ROOM_POINT.y) > tolerance) {
                    fail(`${label}: pointer room mapping drift at ${id}: ${JSON.stringify(result)}`);
                }
                probes.push(result);
            }

            const initial = cell.viewport;
            await captureSnapshot("initial", initial);
            await runProbe("initial");

            const flipped = { id: `${initial.id}-flipped`, width: initial.height, height: initial.width };
            await page.setViewportSize({ width: flipped.width, height: flipped.height });
            await page.evaluate(() => window.dispatchEvent(new Event("resize")));
            await captureSnapshot("flipped", flipped);
            await runProbe("flipped");

            await page.setViewportSize({ width: initial.width, height: initial.height });
            await page.evaluate(() => window.dispatchEvent(new Event("resize")));
            await captureSnapshot("restored", initial);
            await runProbe("restored");

            const first = snapshots[0].room;
            const restored = snapshots[2].room;
            if (Math.abs(first.width - restored.width) > 0.01 || Math.abs(first.height - restored.height) > 0.01) {
                fail(`${label}: room metrics did not restore after orientation flip: ${JSON.stringify({ first, restored })}`);
            }

            await page.evaluate(() => {
                if (window.__gmRuntimeQualification) window.__gmRuntimeQualification.stopRequested = true;
            });
            await page.waitForFunction(() => Boolean(window.__gmRuntimeQualification?.complete || window.__gmRuntimeQualification?.failed), null, { timeout: PAGE_TIMEOUT_MS });
            const report = await page.evaluate(() => window.__gmRuntimeQualification || null);
            if (!report || report.failed || !report.complete) {
                fail(`${label}: resolution fixture failed\n${JSON.stringify(report, null, 2)}\npageErrors=${JSON.stringify(pageErrors)}\nconsoleErrors=${JSON.stringify(consoleErrors)}`);
            }
            if (pageErrors.length > 0) fail(`${label}: page errors\n${pageErrors.join("\n")}`);
            if (consoleErrors.length > 0) fail(`${label}: console errors\n${consoleErrors.join("\n")}`);
            if (consoleWarnings.length > 0) fail(`${label}: console warnings\n${consoleWarnings.join("\n")}`);
            return { label, probes: probes.length, snapshots: snapshots.length, warnings: [...(report.warnings || []), ...consoleWarnings] };
        }

        if (await page.evaluate(() => Boolean(window.__gmRuntimeQualification?.phase === "primary-running"))) {
            await page.setViewportSize({ width: 1280, height: 720 });
            await page.evaluate(() => {
                window.dispatchEvent(new Event("resize"));
                window.__gmRuntimeQualification.checks.desktopResize = {
                    ok: window.innerWidth >= 1024 && window.innerHeight <= 900,
                    detail: { width: window.innerWidth, height: window.innerHeight }
                };
            });
            await page.setViewportSize({ width: 390, height: 844 });
            await page.evaluate(() => window.dispatchEvent(new Event("resize")));
        }
        await page.waitForFunction(() => {
            const report = window.__gmRuntimeQualification;
            return Boolean(report && (report.complete || report.failed || (report.errors && report.errors.length)));
        }, null, { timeout: PAGE_TIMEOUT_MS });

        const report = await page.evaluate(() => window.__gmRuntimeQualification || null);
        if (!report) fail(`${label}: missing __gmRuntimeQualification report`);
        if (report.failed || !report.complete) {
            fail(`${label}: fixture failed\n${JSON.stringify(report, null, 2)}\npageErrors=${JSON.stringify(pageErrors)}\nconsoleErrors=${JSON.stringify(consoleErrors)}`);
        }
        if (pageErrors.length > 0) {
            fail(`${label}: page errors\n${pageErrors.join("\n")}`);
        }
        if (consoleErrors.length > 0) {
            fail(`${label}: console errors\n${consoleErrors.join("\n")}`);
        }
        if (consoleWarnings.length > 0) {
            fail(`${label}: console warnings\n${consoleWarnings.join("\n")}`);
        }
        if (Array.isArray(report.warnings) && report.warnings.length > 0) {
            fail(`${label}: fixture warnings\n${report.warnings.join("\n")}`);
        }

        const requiredChecks = [
            "gmVersion",
            "atlasExists",
            "atlasFrameA",
            "atlasManifest",
            "atlasTupleFrame",
            "atlasMapFrame",
            "atlasStringFrame",
            "canvasAsset",
            "rgbaAsset",
            "pointDirectionUp",
            "spawnVarsBeforeCreate",
            "joystickCaptureNonBlocking",
            "virtualStickVector",
            "virtualStickSingleOwner",
            "virtualStickCancelSafe",
            "primaryFrames",
            "pointerObserved",
            "keyboardObserved",
            "desktopResize",
            "resizeRoomStable",
            "clearedAfterDestroy",
            "restartFrames",
            "rendererType",
            "drawPrimitive",
            "drawSprite",
            "drawText",
            "drawTextExt",
            "drawTextFit",
            "drawSpriteOptions",
            "guiTextExt",
            "guiTextFit",
            "crossFrameTextReset",
            "crossFrameSpriteReset",
            "entitySpawned",
            "entityStepped"
        ];
        for (const checkName of requiredChecks) {
            const check = report.checks?.[checkName];
            if (!check || !check.ok) {
                fail(`${label}: required check missing or failed: ${checkName}\n${JSON.stringify(report.checks, null, 2)}`);
            }
        }

        if (report.frames < 8) fail(`${label}: expected at least 8 primary frames, got ${report.frames}`);
        if (report.restartFrames < 3) fail(`${label}: expected at least 3 restart frames, got ${report.restartFrames}`);

        return {
            label,
            frames: report.frames,
            restartFrames: report.restartFrames,
            warnings: [...(report.warnings || []), ...consoleWarnings]
        };
    } finally {
        await context.close();
    }
}

function parseArgs(argv) {
    const options = {
        phaserVersions: PHASER_VERSIONS.slice(),
        artifacts: ARTIFACTS.slice(),
        renders: RENDER_MODES.slice(),
        skipInstall: false,
        resolutionMatrix: false,
        phaserVersionsExplicit: false,
        artifactsExplicit: false,
        rendersExplicit: false
    };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === "--phaser") {
            options.phaserVersions = String(argv[++i] || "").split(",").map((v) => v.trim()).filter(Boolean);
            options.phaserVersionsExplicit = true;
        } else if (arg === "--artifact") {
            options.artifacts = String(argv[++i] || "").split(",").map((v) => v.trim()).filter(Boolean);
            options.artifactsExplicit = true;
        } else if (arg === "--render") {
            options.renders = String(argv[++i] || "").split(",").map((v) => v.trim()).filter(Boolean);
            options.rendersExplicit = true;
        } else if (arg === "--resolution-matrix") {
            options.resolutionMatrix = true;
        } else if (arg === "--skip-install") {
            options.skipInstall = true;
        } else if (arg === "--help" || arg === "-h") {
            console.log("Usage: node scripts/test-runtime-behavior.mjs [--phaser 4.2.1] [--artifact module,global,global.min] [--render webgl,canvas] [--resolution-matrix]");
            process.exit(0);
        } else {
            fail(`Unknown option: ${arg}`);
        }
    }
    if (options.resolutionMatrix) {
        if (!options.phaserVersionsExplicit) options.phaserVersions = ["4.2.1"];
        if (!options.artifactsExplicit) options.artifacts = ["module"];
        if (!options.rendersExplicit) options.renders = ["canvas"];
    }
    return options;
}

function buildCells(options) {
    const cells = [];
    for (const phaserVersion of options.phaserVersions) {
        for (const artifact of options.artifacts) {
            for (const render of options.renders) {
                if (!options.resolutionMatrix) {
                    cells.push({ phaserVersion, artifact, render });
                    continue;
                }
                for (const viewport of RESOLUTION_VIEWPORTS) {
                    for (const deviceScaleFactor of RESOLUTION_DPRS) {
                        cells.push({ phaserVersion, artifact, render, resolution: true, viewport, deviceScaleFactor });
                    }
                }
            }
        }
    }
    return cells;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    ensureFrontendDeps(FRONTEND_ROOT);

    for (const relative of [
        "tests/browser/index.html",
        "tests/browser/boot.js",
        "tests/browser/behavioral-fixture.js",
        "dist/gm-phaser4.module.js",
        "dist/gm-phaser4.global.js",
        "dist/gm-phaser4.global.min.js"
    ]) {
        if (!fs.existsSync(path.join(PACKAGE_ROOT, relative))) {
            fail(`missing required path before behavior matrix: ${relative} (run build-runtime first)`);
        }
    }

    const pkg = readJson(path.join(PACKAGE_ROOT, "package.json"));
    ensureDir(WORK_ROOT);
    console.log(`[runtime-behavior] packing ${pkg.name}@${pkg.version}`);
    const tarballPath = packFacade(pkg);
    console.log(`[runtime-behavior] packed ${path.relative(ROOT, tarballPath)}`);

    const requireFromFrontend = createRequire(path.join(FRONTEND_ROOT, "package.json"));
    const { chromium } = requireFromFrontend("playwright-core");
    const launch = await launchBrowser(chromium);
    const browser = launch.browser;
    const results = [];
    const allWarnings = [];

    try {
        for (const phaserVersion of options.phaserVersions) {
            console.log(`[runtime-behavior] installing consumer with phaser@${phaserVersion}`);
            const consumerRoot = installConsumer(phaserVersion, tarballPath, options.skipInstall);
            const serveRoot = stageServeRoot(phaserVersion, consumerRoot);
            const { server, url } = await startServer(serveRoot, DEFAULT_START_PORT + Number(phaserVersion.replace(/\D/g, "")) % 50);
            try {
                for (const cell of buildCells({ ...options, phaserVersions: [phaserVersion] })) {
                    process.stdout.write(`[runtime-behavior] run ${cell.phaserVersion} ${cell.artifact} ${cell.render}${cell.resolution ? ` ${cell.viewport.id}@dpr${cell.deviceScaleFactor}` : ""} ... `);
                    const result = await runCell(browser, url, cell);
                    results.push(result);
                    allWarnings.push(...result.warnings.map((warning) => `${result.label}: ${warning}`));
                    console.log(cell.resolution ? `ok (probes=${result.probes}, snapshots=${result.snapshots})` : `ok (frames=${result.frames}, restart=${result.restartFrames})`);
                }
            } finally {
                await server.close();
            }
        }
    } finally {
        await browser.close();
    }

    console.log(`[ok] Runtime behavior matrix passed (${results.length} cells) using ${launch.label}.`);
    if (allWarnings.length > 0) {
        console.log(`[runtime-behavior] warnings (${allWarnings.length}):`);
        for (const warning of allWarnings.slice(0, 20)) {
            console.log(`  - ${warning}`);
        }
        if (allWarnings.length > 20) console.log(`  - ... ${allWarnings.length - 20} more`);
    }
}

main().catch((error) => {
    console.error(`[fail] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
});
