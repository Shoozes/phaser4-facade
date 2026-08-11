/**
 * Smoke test server infrastructure extracted from smoke-browser.mjs.
 * Handles port finding, Vite dev server startup, static file serving,
 * and server lifecycle management for browser smoke tests.
 */
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";

const SERVER_TIMEOUT_MS = 30000;

function quoteCmdArg(value) {
    const text = String(value);
    if (/^[A-Za-z0-9_./:=+-]+$/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
}

function resolveCommand(name, args) {
    if (process.platform === "win32" && name === "npm") {
        const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
        if (fs.existsSync(npmCli)) {
            return { executable: process.execPath, args: [npmCli, ...args] };
        }
        const commandLine = ["npm", ...args].map(quoteCmdArg).join(" ");
        return { executable: "cmd.exe", args: ["/d", "/s", "/c", commandLine] };
    }

    return { executable: name, args };
}

export function ensureFrontendDeps(frontendRoot) {
    const deps = path.join(frontendRoot, "node_modules");
    const playwrightCore = path.join(deps, "playwright-core");
    if (!fs.existsSync(deps) || !fs.existsSync(playwrightCore)) {
        throw new Error("Facade browser dependencies are missing. Run npm install in the public phaser4-facade repository.");
    }
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

function startFrontendServer(frontendRoot, port) {
    const command = resolveCommand("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"]);
    const child = spawn(command.executable, command.args, {
        cwd: frontendRoot,
        env: Object.assign({}, process.env, { BROWSER: "none" }),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
    });

    let output = "";
    const collect = (chunk) => {
        output += chunk.toString();
        if (output.length > 12000) output = output.slice(-12000);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);

    return { child, getOutput: () => output };
}

function contentTypeFor(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".html") return "text/html; charset=utf-8";
    if (ext === ".js") return "text/javascript; charset=utf-8";
    if (ext === ".css") return "text/css; charset=utf-8";
    if (ext === ".svg") return "image/svg+xml";
    if (ext === ".json") return "application/json; charset=utf-8";
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".webp") return "image/webp";
    return "application/octet-stream";
}

function shouldFallbackToIndex(request, requestedPath) {
    const accept = String(request.headers.accept || "");
    return path.extname(requestedPath) === "" || accept.includes("text/html");
}

function startStaticServer(rootDir, port) {
    if (!fs.existsSync(path.join(rootDir, "index.html"))) {
        throw new Error(`Static smoke target is missing index.html: ${rootDir}`);
    }

    const resolvedRoot = path.resolve(rootDir);
    const server = http.createServer((request, response) => {
        const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
        let decoded;
        try {
            decoded = decodeURIComponent(requestUrl.pathname);
        } catch {
            response.writeHead(400);
            response.end("Bad request");
            return;
        }
        const normalized = path.normalize(decoded).replace(/^([/\\])+/, "");
        const requestedPath = normalized === "" ? "index.html" : normalized;
        const filePath = path.resolve(rootDir, requestedPath);
        const relativePath = path.relative(resolvedRoot, filePath);

        if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
            response.writeHead(403);
            response.end("Forbidden");
            return;
        }

        const fileExists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
        if (!fileExists && !shouldFallbackToIndex(request, requestedPath)) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not found");
            return;
        }

        const finalPath = fileExists ? filePath : path.join(rootDir, "index.html");
        response.writeHead(200, { "Content-Type": contentTypeFor(finalPath) });
        fs.createReadStream(finalPath).pipe(response);
    });

    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
            resolve({
                close: () => new Promise((done) => server.close(done)),
                getOutput: () => `static server root: ${rootDir}`
            });
        });
    });
}

function isAddressInUseError(error, output = "") {
    return Boolean(
        error &&
        (
            error.code === "EADDRINUSE" ||
            String(error.message || "").includes("EADDRINUSE") ||
            output.includes("EADDRINUSE") ||
            output.toLowerCase().includes("address already in use")
        )
    );
}

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, getOutput) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < SERVER_TIMEOUT_MS) {
        try {
            const response = await fetch(url, { cache: "no-store" });
            if (response.ok) return;
        } catch {
            // Server is still starting.
        }
        await sleep(250);
    }
    throw new Error(`Frontend smoke server did not become ready at ${url}.\n${getOutput()}`);
}

export async function stopServer(child) {
    if (child && typeof child.close === "function") {
        await child.close();
        return;
    }
    if (!child || child.exitCode !== null) return;

    if (process.platform === "win32") {
        try {
            execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
                stdio: "ignore",
                windowsHide: true,
                timeout: 8000
            });
            releaseChildProcess(child);
            return;
        } catch {
            // Fall back to normal process termination below.
        }
    }

    child.kill("SIGTERM");
    await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        sleep(1000)
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
    releaseChildProcess(child);
}

function releaseChildProcess(child) {
    child.stdout?.destroy();
    child.stderr?.destroy();
    child.stdin?.destroy();
    child.unref?.();
}

/**
 * Read registered UI button geometry from the page using the runtime layout contract.
 * @param {import("@playwright/test").Page} page
 * @param {string[]} buttonIds
 * @param {{ minWidth?: number, minHeight?: number, expectedTextById?: Record<string, string | null> }} options
 * @returns {Promise<Array<{ id: string, isStable: boolean, clickX: number, clickY: number, x: number, y: number, width: number, height: number, effectiveWidth: number, effectiveHeight: number, text: string, visible: boolean, roomX1: number, roomY1: number, roomX2: number, roomY2: number, roomWidth: number, roomHeight: number } | null>>}
 */
export async function readUiControlStates(page, buttonIds, options = {}) {
    const normalizedIds = Array.from(new Set((buttonIds || []).map((id) => String(id))));
    const minWidth = Number(options.minWidth ?? 1);
    const minHeight = Number(options.minHeight ?? 1);
    const expectedTextById = Object.fromEntries(
        Object.entries(options.expectedTextById || {})
            .map(([id, text]) => [String(id), text != null ? String(text) : null])
    );

    return await page.evaluate(({ ids, expectedMap, widthTarget, heightTarget }) => {
        const layout = window.GM.runtime.state.layout || {};
        const scale = Number(layout.scale || 1);
        const panelX = Number(layout.x || 0);
        const panelY = Number(layout.y || 0);
        const roomWidth = Number(window.GM.runtime.roomWidth || 0);
        const roomHeight = Number(window.GM.runtime.roomHeight || 0);

        return ids.map((id) => {
            const button = window.GM.runtime.state.uiButtons.get(id);
            if (!button) return null;

            const sourceWidth = Number(button.width || 0);
            const sourceHeight = Number(button.height || 0);
            const scaledWidth = sourceWidth * scale;
            const scaledHeight = sourceHeight * scale;
            const effectiveWidth = Math.max(sourceWidth, scaledWidth);
            const effectiveHeight = Math.max(sourceHeight, scaledHeight);
            const roomX1 = button.x - sourceWidth / 2;
            const roomY1 = button.y - sourceHeight / 2;
            const roomX2 = button.x + sourceWidth / 2;
            const roomY2 = button.y + sourceHeight / 2;
            const text = String(button.label?.text || "");
            const expectedText = expectedMap[id];
            const isTextMatch = expectedText == null || expectedText === "" || expectedText === text;
            const visible = Boolean(button.visible);
            const isStable = visible &&
                roomX1 >= 0 &&
                roomY1 >= 0 &&
                roomX2 <= roomWidth &&
                roomY2 <= roomHeight &&
                effectiveWidth >= widthTarget &&
                effectiveHeight >= heightTarget &&
                isTextMatch;

            return {
                id,
                isStable,
                roomX1,
                roomY1,
                roomX2,
                roomY2,
                roomWidth,
                roomHeight,
                width: scaledWidth,
                height: scaledHeight,
                effectiveWidth,
                effectiveHeight,
                clickX: panelX + button.x * scale,
                clickY: panelY + button.y * scale,
                x: button.x,
                y: button.y,
                text,
                visible
            };
        });
    }, {
        ids: normalizedIds,
        expectedMap: expectedTextById,
        widthTarget: minWidth,
        heightTarget: minHeight
    });
}

/**
 * Wait until a button is registered, visible, and ready for click/tap.
 * @param {import("@playwright/test").Page} page
 * @param {string} buttonId
 * @param {string | null | undefined} expectedText
 * @param {number} timeoutMs
 * @param {{ minWidth?: number, minHeight?: number }} options
 * @returns {Promise<{ clickX: number, clickY: number, x: number, y: number, width: number, height: number, text: string }>}
 */
export async function waitForStableUiControl(page, buttonId, expectedText, timeoutMs, options = {}) {
    const deadline = Date.now() + timeoutMs;
    const minWidth = Number(options.minWidth ?? 1);
    const minHeight = Number(options.minHeight ?? 1);
    const normalizedExpected = expectedText != null ? String(expectedText) : null;

    while (Date.now() < deadline) {
        const [control] = await readUiControlStates(page, [buttonId], {
            minWidth,
            minHeight,
            expectedTextById: { [buttonId]: normalizedExpected }
        });

        if (control && control.isStable) {
            return {
                clickX: control.clickX,
                clickY: control.clickY,
                x: control.x,
                y: control.y,
                width: control.width,
                height: control.height,
                text: control.text
            };
        }

        await sleep(25);
    }

    const finalState = await page.evaluate((id) => {
        const button = window.GM.runtime.state.uiButtons.get(id);
        return button ? {
            id,
            visible: Boolean(button.visible),
            text: String(button.label?.text || ""),
            x: Number(button.x || 0),
            y: Number(button.y || 0),
            width: Number(button.width || 0),
            height: Number(button.height || 0),
            roomWidth: Number(window.GM.runtime.roomWidth || 0),
            roomHeight: Number(window.GM.runtime.roomHeight || 0)
        } : { id, visible: false };
    }, buttonId);

    throw new Error(`Timed out waiting for stable UI control ${JSON.stringify({
        buttonId,
        expectedText: normalizedExpected,
        minWidth,
        minHeight,
        finalState
    })}`);
}

/**
 * Press a canvas UI control long enough for frame-based input to observe both
 * pointer-down and pointer-up. Playwright's instantaneous mouse.click() can
 * dispatch both events between game updates and intermittently miss onPress.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{ clickX: number, clickY: number }} control
 * @param {{ moveDelayMs?: number, holdMs?: number, releaseDelayMs?: number }} options
 */
export async function pressUiControl(page, control, options = {}) {
    const moveDelayMs = Math.max(0, Number(options.moveDelayMs ?? 20));
    const holdMs = Math.max(0, Number(options.holdMs ?? 40));
    const releaseDelayMs = Math.max(0, Number(options.releaseDelayMs ?? 50));

    await page.mouse.move(control.clickX, control.clickY);
    await page.waitForTimeout(moveDelayMs);
    await page.mouse.down();
    await page.waitForTimeout(holdMs);
    await page.mouse.up();
    await page.waitForTimeout(releaseDelayMs);
}

/**
 * Prove the starter's custom-drawn button feedback without completing its action.
 * The pointer is moved away before release so enabled controls cannot fire.
 * @param {import("@playwright/test").Page} page
 * @param {string} buttonId
 * @param {string | null | undefined} expectedText
 * @param {number} timeoutMs
 * @param {{ minWidth?: number, minHeight?: number, disabled?: boolean, reduceMotion?: boolean }} options
 */
export async function assertUiButtonVisualResponse(page, buttonId, expectedText, timeoutMs, options = {}) {
    const control = await waitForStableUiControl(page, buttonId, expectedText, timeoutMs, options);
    const readVisual = async () => await page.evaluate(({ id, clickX, clickY }) => {
        const button = window.GM?.runtime?.state?.uiButtons?.get(id);
        const hit = document.elementFromPoint(clickX, clickY);
        const canvas = document.querySelector("canvas");
        return button?.__starterVisual ? {
            ...button.__starterVisual,
            runtimeHovered: Boolean(button.hovered),
            runtimeDown: Boolean(button.down),
            mouse: { ...window.GM.runtime.state.mouse },
            buttonCenter: { x: Number(button.x || 0), y: Number(button.y || 0) },
            clickPoint: { x: clickX, y: clickY },
            hitElement: hit?.tagName || null,
            canvasRect: canvas ? canvas.getBoundingClientRect().toJSON() : null
        } : null;
    }, { id: buttonId, clickX: control.clickX, clickY: control.clickY });
    const waitForVisual = async (predicate, label) => {
        const deadline = Date.now() + timeoutMs;
        let visual = null;
        while (Date.now() < deadline) {
            visual = await readVisual();
            if (visual && predicate(visual)) return visual;
            await sleep(20);
        }
        throw new Error(`Timed out waiting for ${label} button response: ${JSON.stringify({ buttonId, visual })}`);
    };

    await page.mouse.move(control.clickX, control.clickY);
    await page.evaluate((id) => {
        const state = window.GM.runtime.state;
        const button = state.uiButtons.get(id);
        if (button) {
            state.mouse.x = button.x;
            state.mouse.y = button.y;
            button.hovered = true;
        }
    }, buttonId);
    const hover = await waitForVisual((visual) => options.disabled ? visual.disabled === true : visual.hovered === true, "hover");

    await page.mouse.down();
    await page.evaluate((id) => {
        const button = window.GM.runtime.state.uiButtons.get(id);
        if (button) button.down = true;
    }, buttonId);
    const active = await waitForVisual((visual) => options.disabled ? visual.disabled === true && visual.active === false : visual.active === true, "press");
    await page.evaluate((id) => {
        const state = window.GM.runtime.state;
        const button = state.uiButtons.get(id);
        if (button) {
            button.hovered = false;
            button.down = false;
        }
        state.mouse.x = 0;
        state.mouse.y = 0;
    }, buttonId);
    await page.mouse.move(0, 0);
    await page.mouse.up();

    if (options.disabled) {
        if (hover.hovered || active.active) {
            throw new Error(`Disabled button exposed interactive feedback: ${JSON.stringify({ buttonId, hover, active })}`);
        }
    } else if (options.reduceMotion) {
        if (!hover.reduceMotion || hover.scale !== 1 || hover.offsetY !== 0 || active.scale !== 1 || active.offsetY !== 0) {
            throw new Error(`Reduced-motion button changed geometry: ${JSON.stringify({ buttonId, hover, active })}`);
        }
    } else if (!(hover.scale > 1) || !(active.scale < 1) || !(active.offsetY > hover.offsetY)) {
        throw new Error(`Button feedback did not visibly distinguish hover and press: ${JSON.stringify({ buttonId, hover, active })}`);
    }

    return { hover, active };
}

/**
 * Wait until any listed control is registered and visually stable.
 * @param {import("@playwright/test").Page} page
 * @param {string[]} buttonIds
 * @param {number} timeoutMs
 * @param {{ minWidth?: number, minHeight?: number, expectedTextById?: Record<string, string | null> }} options
 * @returns {Promise<{ buttonId: string, clickX: number, clickY: number, x: number, y: number, width: number, height: number, text: string }>}
 */
export async function waitForAnyStableUiControl(page, buttonIds, timeoutMs, options = {}) {
    const deadline = Date.now() + timeoutMs;
    const normalizedIds = Array.from(new Set((buttonIds || []).map((id) => String(id))));
    const minWidth = Number(options.minWidth ?? 1);
    const minHeight = Number(options.minHeight ?? 1);
    const expectedTextById = Object.fromEntries(
        Object.entries(options.expectedTextById || {})
            .map(([id, text]) => [String(id), text != null ? String(text) : null])
    );

    while (Date.now() < deadline) {
        const candidates = await readUiControlStates(page, normalizedIds, {
            minWidth,
            minHeight,
            expectedTextById
        });

        const control = candidates.find((item) => item && item.isStable);
        if (control) {
            return {
                buttonId: control.id,
                clickX: control.clickX,
                clickY: control.clickY,
                x: control.x,
                y: control.y,
                width: control.width,
                height: control.height,
                text: control.text
            };
        }

        await sleep(25);
    }

    const finalState = await page.evaluate((ids) => {
        return (ids || []).map((id) => {
            const button = window.GM.runtime.state.uiButtons.get(id);
            return button ? {
                id,
                visible: Boolean(button.visible),
                text: String(button.label?.text || ""),
                x: Number(button.x || 0),
                y: Number(button.y || 0),
                width: Number(button.width || 0),
                height: Number(button.height || 0),
                roomWidth: Number(window.GM.runtime.roomWidth || 0),
                roomHeight: Number(window.GM.runtime.roomHeight || 0)
            } : { id, visible: false };
        });
    }, normalizedIds);

    throw new Error(`Timed out waiting for stable UI control among ${JSON.stringify(normalizedIds)} ${JSON.stringify({
        minWidth,
        minHeight,
        expectedTextById,
        finalState
    })}`);
}

/**
 * Start a smoke test server for the given target.
 * @param {"source"|"dist"|"package"} target
 * @param {number} startPort
 * @param {object} paths
 * @param {string} paths.frontendRoot
 * @param {string} paths.frontendDistRoot
 * @param {string} paths.packageDemoRoot
 * @returns {Promise<{url: string, server: object}>}
 */
export async function startSmokeServer(target, startPort, paths) {
    let lastBindError = null;

    for (let port = startPort; port < startPort + 100; port += 1) {
        if (!(await isPortFree(port))) continue;

        const url = `http://127.0.0.1:${port}`;
        let server = null;

        try {
            if (target === "package") {
                server = await startStaticServer(paths.packageDemoRoot, port);
            } else if (target === "dist") {
                server = await startStaticServer(paths.frontendDistRoot, port);
            } else {
                server = startFrontendServer(paths.frontendRoot, port);
            }

            await waitForServer(url, server.getOutput);
            return { url, server };
        } catch (error) {
            const output = server && typeof server.getOutput === "function" ? server.getOutput() : "";
            await stopServer(server && (server.child || server));
            if (isAddressInUseError(error, output)) {
                lastBindError = error;
                continue;
            }
            throw error;
        }
    }

    const detail = lastBindError ? ` Last bind error: ${lastBindError.message}` : "";
    throw new Error(`No free smoke-test port found between ${startPort} and ${startPort + 99}.${detail}`);
}

export async function launchBrowser(chromium) {
    const attempts = [
        { channel: "chrome", label: "Chrome" },
        { channel: "msedge", label: "Microsoft Edge" }
    ];

    const errors = [];
    for (const attempt of attempts) {
        try {
            const browser = await chromium.launch({
                channel: attempt.channel,
                headless: true
            });
            return { browser, label: attempt.label };
        } catch (error) {
            errors.push(`${attempt.label}: ${error.message}`);
        }
    }

    throw new Error(`Browser smoke needs Chrome or Edge installed for playwright-core.\n${errors.join("\n")}`);
}
