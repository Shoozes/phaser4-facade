// Shared behavioral qualification for global and module facade artifacts.
// Exposes window.__gmRuntimeQualification for Playwright assertions.

/**
 * @typedef {{
 *   artifact: string,
 *   render: "webgl" | "canvas" | "auto",
 *   phaserVersion: string,
 *   targetFrames?: number,
 *   resolutionMode?: boolean
 * }} QualificationOptions
 */

/**
 * @param {QualificationOptions} options
 */
export async function runQualification(options) {
    const artifact = String(options.artifact || "global");
    const render = String(options.render || "webgl").toLowerCase();
    const phaserVersion = String(options.phaserVersion || "unknown");
    const targetFrames = Number(options.targetFrames) > 0 ? Number(options.targetFrames) : 8;
    const resolutionMode = options.resolutionMode === true;
    const responsive = resolutionMode;

    /** @type {any} */
    const report = {
        phase: "booting",
        artifact,
        render,
        phaserVersion,
        frames: 0,
        restartFrames: 0,
        restarts: 0,
        complete: false,
        failed: false,
        errors: [],
        warnings: [],
        checks: {},
        pointer: {
            requested: false,
            seenDown: false,
            seenPressed: false,
            x: 0,
            y: 0
        },
        layout: {
            responsive,
            probes: []
        },
        keyboard: {
            requested: false,
            seenDown: false,
            seenPressed: false
        },
        resized: false
    };
    window.__gmRuntimeQualification = report;

    function fail(message) {
        report.failed = true;
        report.errors.push(String(message));
        report.phase = "failed";
        throw new Error(message);
    }

    function recordCheck(name, ok, detail) {
        report.checks[name] = { ok: Boolean(ok), detail: detail === undefined ? null : detail };
        if (!ok) fail(`check failed: ${name}${detail ? ` (${detail})` : ""}`);
    }

    function dispatchResolutionProbe(request) {
        const canvas = document.querySelector("canvas");
        if (!canvas) fail("canvas missing before resolution pointer probe.");

        const roomX = Number(request.roomX);
        const roomY = Number(request.roomY);
        const roomWidth = Number(GM.runtime.roomWidth);
        const roomHeight = Number(GM.runtime.roomHeight);
        const scale = Number(GM.runtime.scale);
        const displayWidth = Number(GM.runtime.displayWidth);
        const displayHeight = Number(GM.runtime.displayHeight);
        if (![roomX, roomY, roomWidth, roomHeight, scale, displayWidth, displayHeight].every(Number.isFinite) ||
            roomWidth <= 0 || roomHeight <= 0 || scale <= 0) {
            fail(`invalid resolution probe layout: ${JSON.stringify({ roomX, roomY, roomWidth, roomHeight, scale, displayWidth, displayHeight })}`);
        }
        if (roomX < 0 || roomX > roomWidth || roomY < 0 || roomY > roomHeight) {
            fail(`resolution probe point is outside the room: ${JSON.stringify({ roomX, roomY, roomWidth, roomHeight })}`);
        }

        const rect = canvas.getBoundingClientRect();
        const layoutX = (displayWidth - roomWidth * scale) / 2;
        const layoutY = (displayHeight - roomHeight * scale) / 2;
        const clientX = rect.left + layoutX + roomX * scale;
        const clientY = rect.top + layoutY + roomY * scale;
        request.expected = { x: roomX, y: roomY };
        request.screen = { x: clientX, y: clientY };
        request.layout = {
            roomWidth,
            roomHeight,
            scale,
            displayWidth,
            displayHeight,
            profile: GM.runtime.profile,
            orientation: GM.runtime.orientation
        };

        const pointerId = Number(request.pointerId) || 1000 + report.layout.probes.length;
        const pointerInit = {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            pointerId,
            pointerType: "touch",
            isPrimary: true,
            buttons: 1
        };
        canvas.dispatchEvent(new PointerEvent("pointerdown", pointerInit));
        canvas.dispatchEvent(new MouseEvent("mousedown", {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            buttons: 1
        }));
        canvas.dispatchEvent(new PointerEvent("pointerup", {
            ...pointerInit,
            buttons: 0
        }));
        canvas.dispatchEvent(new MouseEvent("mouseup", {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            buttons: 0
        }));
        request.status = "dispatched";
    }

    function captureResolutionProbe() {
        const request = report.probeRequest;
        if (!resolutionMode || !request || request.status === "complete") return;

        if (request.status === "requested") {
            dispatchResolutionProbe(request);
            return;
        }

        if (request.status !== "dispatched") return;
        const actual = {
            x: Number(GM.runtime.mouseX),
            y: Number(GM.runtime.mouseY)
        };
        const expected = request.expected || { x: Number(request.roomX), y: Number(request.roomY) };
        const result = {
            id: String(request.id || `probe-${report.layout.probes.length + 1}`),
            expected,
            actual,
            error: {
                x: actual.x - expected.x,
                y: actual.y - expected.y
            },
            screen: request.screen,
            layout: request.layout
        };
        report.layout.probes.push(result);
        report.probeResult = result;
        request.status = "complete";
    }

    const GM = window.GM;
    const Phaser = window.Phaser;
    if (!Phaser || typeof Phaser.Game !== "function") fail("Phaser.Game is missing after artifact load.");
    if (!GM || !GM.app || typeof GM.app.start !== "function") fail("GM.app.start is missing after artifact load.");

    recordCheck("gmVersion", typeof GM.version === "string" && GM.version.length > 0, GM.version);
    recordCheck("phaserLibrary", Boolean(GM.phaser && GM.phaser.library), null);

    const ATLAS_KEY = "gm_qual_atlas";
    const FRAME_A = "cell_a";
    const FRAME_B = "cell_b";

    /**
     * Register a two-frame synthetic atlas through the facade-owned API,
     * including a null-prototype frame map (the Grout crash shape).
     */
    function registerSyntheticAtlas() {
        if (!GM.asset || typeof GM.asset.addAtlas !== "function") {
            fail("GM.asset.addAtlas is unavailable.");
        }

        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (!ctx) fail("2d canvas context unavailable.");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = "#00ff66";
        ctx.fillRect(16, 0, 16, 16);

        const frames = Object.create(null);
        frames[FRAME_A] = { frame: { x: 0, y: 0, w: 16, h: 16 } };
        frames[FRAME_B] = { frame: { x: 16, y: 0, w: 16, h: 16 } };

        const manifest = GM.asset.addAtlas(ATLAS_KEY, canvas, frames, { replace: true });
        recordCheck("atlasExists", GM.asset.exists(ATLAS_KEY), ATLAS_KEY);
        recordCheck("atlasFrameA", GM.asset.frameExists(ATLAS_KEY, FRAME_A), FRAME_A);
        recordCheck("atlasFrameB", GM.asset.frameExists(ATLAS_KEY, FRAME_B), FRAME_B);
        recordCheck("atlasManifest", Boolean(manifest && manifest.key === ATLAS_KEY), JSON.stringify(manifest && manifest.frames));

        const tupleAtlasKey = "gm_qual_tuple_atlas";
        const tupleManifest = GM.asset.addAtlas(tupleAtlasKey, canvas, [
            ["tuple_a", { x: 0, y: 0, w: 8, h: 8 }],
            ["tuple_b", { frame: { x: 16, y: 0, w: 8, h: 8 } }]
        ], { replace: true });
        recordCheck("atlasTupleFrame", GM.asset.frameExists(tupleAtlasKey, "tuple_a"), tupleAtlasKey);
        recordCheck("atlasTupleManifest", Boolean(tupleManifest && tupleManifest.frameCount === 2), JSON.stringify(tupleManifest && tupleManifest.frames));

        const mapAtlasKey = "gm_qual_map_atlas";
        const mapManifest = GM.asset.addAtlas(mapAtlasKey, canvas, new Map([
            ["map_a", { frame: { x: 0, y: 0, w: 8, h: 8 } }]
        ]), { replace: true });
        recordCheck("atlasMapFrame", GM.asset.frameExists(mapAtlasKey, "map_a"), mapAtlasKey);
        recordCheck("atlasMapManifest", Boolean(mapManifest && mapManifest.frameCount === 1), JSON.stringify(mapManifest && mapManifest.frames));

        const canvasManifest = GM.asset.addCanvas("gm_qual_canvas", canvas, { replace: true });
        recordCheck("canvasAsset", GM.asset.exists("gm_qual_canvas") && canvasManifest.key === "gm_qual_canvas", null);
        const stringAtlasManifest = GM.asset.addAtlas("gm_qual_string_atlas", "gm_qual_canvas", [
            ["string_a", { x: 0, y: 0, w: 8, h: 8 }]
        ], { replace: true });
        recordCheck("atlasStringFrame", GM.asset.frameExists("gm_qual_string_atlas", "string_a"), "gm_qual_string_atlas");
        recordCheck("atlasStringManifest", Boolean(stringAtlasManifest && stringAtlasManifest.source === "gm_qual_canvas"), JSON.stringify(stringAtlasManifest && stringAtlasManifest.frames));
        const rgbaManifest = GM.asset.addRgba("gm_qual_rgba", 1, 1, [252, 224, 168, 255], { replace: true });
        recordCheck("rgbaAsset", GM.asset.exists("gm_qual_rgba") && rgbaManifest.key === "gm_qual_rgba", null);
    }

    /**
     * @param {"primary" | "restart"} runId
     */
    function startRun(runId) {
        report.phase = runId === "primary" ? "primary-running" : "restart-running";
        let entitySeen = false;
        let layerSeen = false;
        let drawPrimitiveSeen = false;
        let drawSpriteSeen = false;
        let drawTextSeen = false;

        const game = GM.app.start({
            parent: "game",
            width: responsive ? 720 : 360,
            height: responsive ? 1280 : 640,
            responsive,
            renderResolution: "auto",
            maxRenderResolution: 3,
            ...(responsive ? {
                minHeight: 1280,
                targetHeight: 1560,
                maxHeight: 1900,
                desktopBreakpoint: 1000,
                desktopMinWidth: 1280,
                desktopHeight: 720,
                desktopMaxWidth: 1920
            } : {}),
            curtain: false,
            globals: false,
            stage: true,
            simulationHz: 60,
            maxFrameDeltaMs: 100,
            maxCatchUpSteps: 5,
            randomSeed: 42,
            type: render === "canvas" ? "CANVAS" : render === "auto" ? "AUTO" : "WEBGL",
            create(api) {
                if (typeof GM.layer?.define === "function") {
                    GM.layer.define("Instances", 100);
                    GM.layer.define("actors", 200);
                }
                registerSyntheticAtlas();

                const right = GM.math.point_direction(0, 0, 1, 0);
                const up = GM.math.point_direction(0, 0, 0, -1);
                const left = GM.math.point_direction(0, 0, -1, 0);
                const down = GM.math.point_direction(0, 0, 0, 1);
                recordCheck("pointDirectionRight", Math.abs(right - 0) < 0.001, right);
                recordCheck("pointDirectionUp", Math.abs(up - 90) < 0.001, up);
                recordCheck("pointDirectionLeft", Math.abs(left - 180) < 0.001, left);
                recordCheck("pointDirectionDown", Math.abs(down - 270) < 0.001, down);

                let createSawVars = false;
                const objectDef = {
                    create() {
                        this.label = this.label || "qual-entity";
                        this.pulse = 0;
                        createSawVars = this.team === "player" && this.health === 10 && this.name === "hero";
                    },
                    step() {
                        this.pulse += 1;
                        entitySeen = this.pulse > 0;
                        if (this.layer) layerSeen = String(this.layer).length > 0;
                    },
                    draw() {
                        GM.draw.setColor(GM.color.LIME);
                        GM.draw.circle(this.x, this.y, 12, false);
                    }
                };
                GM.entity.spawn(objectDef, {
                    x: 180,
                    y: 200,
                    layer: "actors",
                    name: "hero",
                    vars: { health: 10, team: "player" }
                });

                const entityCount = typeof GM.entity.count === "function" ? GM.entity.count(objectDef) : 0;
                recordCheck("entitySpawned", entityCount >= 1, `count=${entityCount} run=${runId}`);
                recordCheck("spawnVarsBeforeCreate", createSawVars, runId);

                // Joystick-owned capture must not globally block keyboard/gameplay channels.
                if (typeof GM.input.capturePointer === "function") {
                    GM.input.capturePointer("joy-1", "joystick");
                    const blocked = typeof api.input_blocked === "function" ? api.input_blocked() : false;
                    recordCheck("joystickCaptureNonBlocking", blocked === false, blocked);
                    GM.input.releasePointer("joy-1", "joystick");
                }
                if (typeof GM.input.createVirtualStick === "function") {
                    const stick = GM.input.createVirtualStick({
                        mode: "fixed",
                        origin: { x: 100, y: 100 },
                        maxRadius: 100,
                        deadzone: 0.1
                    });
                    stick.press("stick-1", 100, 100).move("stick-1", 200, 100);
                    recordCheck("virtualStickVector", Math.abs(stick.vector.x - 1) < 0.001 && Math.abs(stick.vector.y) < 0.001, JSON.stringify(stick.vector));
                    stick.move("stick-2", 100, 200).cancel("stick-2");
                    recordCheck("virtualStickSingleOwner", stick.active && stick.pointerId === "stick-1", stick.pointerId);
                    stick.cancel("stick-1");
                    recordCheck("virtualStickCancelSafe", stick.active === false && stick.magnitude === 0, JSON.stringify(stick.vector));
                }
            },
            step(api, deltaSec) {
                if (runId === "primary") report.frames += 1;
                else report.restartFrames += 1;

                if (report.pointer.requested) {
                    if (typeof api.mouse_check_button === "function" && api.mouse_check_button()) {
                        report.pointer.seenDown = true;
                    }
                    if (typeof api.mouse_check_button_pressed === "function" && api.mouse_check_button_pressed()) {
                        report.pointer.seenPressed = true;
                    }
                    report.pointer.x = api.mouse_x;
                    report.pointer.y = api.mouse_y;
                }
                if (report.keyboard.requested) {
                    report.keyboard.seenDown = report.keyboard.seenDown || api.keyboard_check(GM.key.RIGHT);
                    report.keyboard.seenPressed = report.keyboard.seenPressed || api.keyboard_check_pressed(GM.key.RIGHT);
                }
                captureResolutionProbe();

                report.checks.deltaSecFinite = {
                    ok: Number.isFinite(deltaSec) && deltaSec >= 0,
                    detail: deltaSec
                };
                if (!Number.isFinite(deltaSec) || deltaSec < 0) fail(`invalid deltaSec: ${deltaSec}`);

                report.checks.entityStepped = { ok: entitySeen, detail: runId };
                report.checks.entityLayer = { ok: layerSeen, detail: runId };
            },
            draw(api) {
                api.draw_set_color(0x4488ff);
                api.draw_rectangle(20, 20, 80, 80, false);
                drawPrimitiveSeen = true;

                api.draw_sprite_ext(ATLAS_KEY, FRAME_A, 120, 60, 2, 2, 0, 0xffffff, 1);
                api.draw_sprite_ext(ATLAS_KEY, FRAME_B, 180, 60, -2, 2, 90, 0xff00ff, 0.8);
                drawSpriteSeen = true;

                api.draw_set_color(0xffffff);
                api.draw_set_font("monospace", 16, false);
                api.draw_text(24, 100, `qual ${artifact} ${render}`);
                drawTextSeen = true;

                report.checks.drawPrimitive = { ok: drawPrimitiveSeen, detail: runId };
                report.checks.drawSprite = { ok: drawSpriteSeen, detail: runId };
                report.checks.drawText = { ok: drawTextSeen, detail: runId };
            }
        });

        recordCheck("gameInstance", Boolean(game), runId);
        recordCheck("phaserGameHandle", GM.phaser.game === game, runId);
        recordCheck("singleCanvas", document.querySelectorAll("canvas").length === 1, document.querySelectorAll("canvas").length);

        const rendererType = game && game.renderer ? game.renderer.type : null;
        const expectedType = render === "canvas"
            ? Phaser.CANVAS
            : render === "webgl"
                ? Phaser.WEBGL
                : null;
        if (expectedType !== null) {
            recordCheck(
                "rendererType",
                rendererType === expectedType,
                `expected=${expectedType} actual=${rendererType}`
            );
        } else {
            report.checks.rendererType = { ok: true, detail: `auto actual=${rendererType}` };
        }

        return game;
    }

    // Primary run
    let game = startRun("primary");

    if (resolutionMode) {
        report.phase = "resolution-ready";
        await waitFor(() => report.stopRequested === true, 120000, "resolution matrix completion");
        report.phase = "destroy";
        if (typeof game.destroy !== "function") fail("game.destroy is not a function");
        game.destroy(true);
        await delay(50);
        recordCheck("resolutionCleanup", !GM._game && !GM.phaser.game, Boolean(GM._game));
        report.phase = "complete";
        report.complete = true;
        report.failed = report.errors.length > 0;
        return report;
    }

    await waitFor(() => report.frames >= targetFrames, 8000, "primary frames");
    recordCheck("primaryFrames", report.frames >= targetFrames, report.frames);

    // Pointer sample during the live game
    report.pointer.requested = true;
    report.phase = "pointer";
    const canvas = document.querySelector("canvas");
    if (!canvas) fail("canvas missing before pointer sample.");
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    canvas.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: cx,
        clientY: cy,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        buttons: 1
    }));
    canvas.dispatchEvent(new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: cx,
        clientY: cy,
        buttons: 1
    }));
    await waitFor(() => report.pointer.seenDown || report.pointer.seenPressed || report.frames > targetFrames + 4, 2000, "pointer sample");
    recordCheck(
        "pointerObserved",
        report.pointer.seenDown || report.pointer.seenPressed,
        JSON.stringify(report.pointer)
    );

    report.keyboard.requested = true;
    window.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        key: "ArrowRight",
        code: "ArrowRight",
        keyCode: 39,
        which: 39
    }));
    await waitFor(() => report.keyboard.seenDown || report.keyboard.seenPressed || report.frames > targetFrames + 8, 2000, "keyboard sample");
    window.dispatchEvent(new KeyboardEvent("keyup", {
        bubbles: true,
        key: "ArrowRight",
        code: "ArrowRight",
        keyCode: 39,
        which: 39
    }));
    recordCheck(
        "keyboardObserved",
        report.keyboard.seenDown || report.keyboard.seenPressed,
        JSON.stringify(report.keyboard)
    );

    // Resize sample
    report.phase = "resize";
    const beforeWidth = GM.runtime.roomWidth;
    const beforeHeight = GM.runtime.roomHeight;
    window.dispatchEvent(new Event("resize"));
    await delay(100);
    report.resized = true;
    report.checks.resizeRoomStable = {
        ok: Number(GM.runtime.roomWidth) > 0 && Number(GM.runtime.roomHeight) > 0,
        detail: {
            beforeWidth,
            beforeHeight,
            afterWidth: GM.runtime.roomWidth,
            afterHeight: GM.runtime.roomHeight
        }
    };
    if (!(Number(GM.runtime.roomWidth) > 0 && Number(GM.runtime.roomHeight) > 0)) {
        fail("room size invalid after resize");
    }

    // Destroy and restart
    report.phase = "destroy";
    if (typeof game.destroy !== "function") fail("game.destroy is not a function");
    game.destroy(true);
    await delay(50);
    recordCheck("clearedAfterDestroy", !GM._game && !GM.phaser.game, Boolean(GM._game));

    report.restarts += 1;
    game = startRun("restart");
    await waitFor(() => report.restartFrames >= Math.max(3, Math.floor(targetFrames / 2)), 8000, "restart frames");
    recordCheck("restartFrames", report.restartFrames >= 3, report.restartFrames);
    recordCheck("restartGameHandle", GM.phaser.game === game, null);

    report.phase = "complete";
    report.complete = true;
    report.failed = report.errors.length > 0;
    return report;
}

/**
 * @param {() => boolean} predicate
 * @param {number} timeoutMs
 * @param {string} label
 */
function waitFor(predicate, timeoutMs, label) {
    const started = performance.now();
    return new Promise((resolve, reject) => {
        function tick() {
            if (predicate()) {
                resolve(true);
                return;
            }
            if (performance.now() - started > timeoutMs) {
                reject(new Error(`timed out waiting for ${label}`));
                return;
            }
            requestAnimationFrame(tick);
        }
        tick();
    });
}

/**
 * @param {number} ms
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
