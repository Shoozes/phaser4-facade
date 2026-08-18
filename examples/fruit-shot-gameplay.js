import { PIXEL_3X5 } from "./fruit-shot/art.js";

const PIXEL_SOURCE_SCALE = 4;
const PIXEL_GLYPHS = PIXEL_3X5;

function glyphName(character) {
    return character === " " ? "glyph-space" : "glyph-" + character;
}

function glyphRows(character) {
    return PIXEL_GLYPHS[character] || PIXEL_GLYPHS[" "];
}

function glyphWidth(character) {
    return glyphRows(character)[0].length * PIXEL_SOURCE_SCALE;
}

function pixelGlyphAsset(character) {
    const rows = glyphRows(character);
    const steps = [];
    for (let y = 0; y < rows.length; y += 1) {
        for (let x = 0; x < rows[y].length; x += 1) {
            if (rows[y][x] !== "1") continue;
            steps.push({
                type: "rect_filled",
                x: x * PIXEL_SOURCE_SCALE,
                y: y * PIXEL_SOURCE_SCALE,
                w: PIXEL_SOURCE_SCALE,
                h: PIXEL_SOURCE_SCALE,
                col: 0xffffff
            });
        }
    }
    return {
        name: glyphName(character),
        spec: {
            w: rows[0].length * PIXEL_SOURCE_SCALE,
            h: rows.length * PIXEL_SOURCE_SCALE,
            steps
        }
    };
}

function pixelRect(steps, x, y, w, h, color) {
    steps.push({ type: "rect_filled", x: x * PIXEL_SOURCE_SCALE, y: y * PIXEL_SOURCE_SCALE, w: w * PIXEL_SOURCE_SCALE, h: h * PIXEL_SOURCE_SCALE, col: color });
}

function fruitAsset(name, size, colors) {
    const cells = size / PIXEL_SOURCE_SCALE;
    const center = (cells - 1) * 0.5;
    const bodyRadius = cells * 0.44;
    const steps = [];
    for (let y = 0; y < cells; y += 1) {
        for (let x = 0; x < cells; x += 1) {
            const dx = (x - center) / bodyRadius;
            const dy = (y - (center + 0.35)) / bodyRadius;
            const distance = dx * dx + dy * dy;
            if (distance > 1) continue;
            let color = colors.body;
            if (distance > 0.72 || x < center - cells * 0.17 || y > center + cells * 0.31) color = colors.shade;
            if (distance < 0.43 && x < center - cells * 0.08 && y < center - cells * 0.19) color = colors.shine;
            pixelRect(steps, x, y, 1, 1, color);
        }
    }
    const stemX = Math.floor(center);
    pixelRect(steps, stemX, 0, 1, Math.max(2, Math.floor(cells * 0.19)), 0x633a20);
    pixelRect(steps, stemX + 1, 1, Math.max(2, Math.floor(cells * 0.23)), 1, 0x54d66d);
    return { name, spec: { w: size, h: size, steps } };
}

function createAssets() {
    const fruit = [
        { name: "fruit-0", size: 64, body: 0xff4d5d, shade: 0xa71d3a, shine: 0xffd166 },
        { name: "fruit-1", size: 80, body: 0xffd166, shade: 0xb87900, shine: 0xfff1a6 },
        { name: "fruit-2", size: 96, body: 0x5ee173, shade: 0x15834b, shine: 0xd6ffdf }
    ];
    const assets = fruit.map((item) => fruitAsset(item.name, item.size, item));
    const cueSteps = [];
    const cueCells = 16;
    const cueCenter = (cueCells - 1) * 0.5;
    const cueRadius = cueCells * 0.46;
    for (let y = 0; y < cueCells; y += 1) {
        for (let x = 0; x < cueCells; x += 1) {
            const dx = (x - cueCenter) / cueRadius;
            const dy = (y - cueCenter) / cueRadius;
            const distance = dx * dx + dy * dy;
            if (distance > 1) continue;
            let color = distance > 0.76 ? 0x8b8ba8 : 0xffffff;
            if (distance < 0.33 && x < cueCenter - 1 && y < cueCenter - 1) color = 0xd8f7ff;
            pixelRect(cueSteps, x, y, 1, 1, color);
        }
    }
    assets.push(
        { name: "cue", spec: { w: 64, h: 64, steps: cueSteps } },
        { name: "aim-dot", spec: { w: 16, h: 16, steps: [
            { type: "rect_filled", x: 0, y: 4, w: 16, h: 8, col: 0x696985 },
            { type: "rect_filled", x: 4, y: 0, w: 8, h: 16, col: 0x696985 },
            { type: "rect_filled", x: 4, y: 4, w: 8, h: 8, col: 0xffffff }
        ] } }
    );
    return assets.concat(Object.keys(PIXEL_GLYPHS).map(pixelGlyphAsset));
}

export function startFruitShotGame({ GM, bridge, proof, renderType, setStatus, failProof }) {
    const VIEW = Object.freeze({ width: 720, height: 1280, top: 188, floor: 1070, cueY: 1106, wall: 26 });
    const PIXEL_SCALE_STEP = 0.5;
    const PIXEL_RENDER_GRID = PIXEL_SOURCE_SCALE * PIXEL_SCALE_STEP;
    const FRUIT_SIZES = Object.freeze([64, 80, 96]);
    const state = { targets: [], shot: null, score: 0, lives: 3, nextTier: 0, canShoot: true, spawnAge: 0, gameOver: false, restarts: 0 };
    const clamp = (value, min, max) => GM.math.clamp(value, min, max);
    const roomWidth = () => Number(GM.runtime.roomWidth) || VIEW.width;
    const centerX = () => roomWidth() * 0.5;
    const radius = (tier) => FRUIT_SIZES[tier] * 0.5;
    const snapPixelPosition = (value) => Math.round(Number(value) / PIXEL_RENDER_GRID) * PIXEL_RENDER_GRID;

    Object.assign(proof, {
        render: renderType,
        frames: 0,
        fixedSteps: 0,
        atlasFrames: [],
        grout13: false,
        grout13PayloadBytes: 0,
        pixelTextSeen: false,
        pixelTextFlipY: false,
        pixelTextDraws: 0,
        pixelScaleStep: PIXEL_SCALE_STEP,
        pixelPresentation: null,
        spriteOptionsSeen: false,
        fixedStepsSeen: false,
        headingDraws: 0,
        summaryDraws: 0,
        playable: false,
        inputReady: false,
        shotsFired: 0,
        hits: 0,
        merges: 0,
        score: 0,
        lives: 3,
        restarts: 0
    });

    function updatePixelPresentation() {
        const layout = GM.runtime.state?.layout;
        const render = GM.runtime.state?.render;
        const scale = Number(GM.runtime.scale);
        const resolution = Number(render?.resolution) || 1;
        const units = scale / PIXEL_SCALE_STEP;
        proof.pixelPresentation = {
            scale,
            scaleStep: PIXEL_SCALE_STEP,
            scaleUnits: Math.round(units),
            integer: Number.isFinite(units) && Math.abs(units - Math.round(units)) < 0.000001,
            mode: layout?.scaleMode || "pending",
            sourceCellCssPixels: PIXEL_SOURCE_SCALE * scale,
            sourceCellDevicePixels: PIXEL_SOURCE_SCALE * scale * resolution,
            renderResolution: resolution,
            displayWidth: Number(GM.runtime.displayWidth),
            displayHeight: Number(GM.runtime.displayHeight)
        };
    }

    function textWidth(text, scale) {
        const letters = String(text).toUpperCase().split("");
        return letters.reduce((width, character, index) => width + glyphWidth(character) * scale + (index < letters.length - 1 ? PIXEL_SOURCE_SCALE * scale : 0), 0);
    }

    function drawPixelText(text, x, y, scale, align, color) {
        const letters = String(text).toUpperCase().split("");
        let cursor = snapPixelPosition(x);
        const width = textWidth(text, scale);
        if (align === "center") cursor -= Math.floor(width * 0.5);
        if (align === "right") cursor -= width;
        for (const character of letters) {
            const sprite = GM.draw.spriteExt("fruit-shot-modular", glyphName(character), cursor, snapPixelPosition(y), {
                scale,
                color: color === undefined ? GM.color.WHITE : color,
                originX: 0,
                originY: 0
            });
            proof.pixelTextSeen = proof.pixelTextSeen || Boolean(sprite);
            proof.pixelTextFlipY = proof.pixelTextFlipY || Boolean(sprite && sprite.flipY === true);
            proof.pixelTextDraws += 1;
            cursor += glyphWidth(character) * scale + PIXEL_SOURCE_SCALE * scale;
        }
    }

    function addTarget(tier, x, y, vx) {
        state.targets.push({ tier, x, y, vx, phase: state.targets.length * 0.7 });
    }

    function resetGame(countRestart) {
        const cx = centerX();
        state.targets.length = 0;
        state.shot = null;
        state.score = 0;
        state.lives = 3;
        state.nextTier = 0;
        state.canShoot = true;
        state.spawnAge = 0;
        state.gameOver = false;
        if (countRestart) state.restarts += 1;
        addTarget(0, cx, 570, 0);
        addTarget(1, cx - 188, 370, 24);
        addTarget(0, cx + 170, 680, -20);
        addTarget(2, cx + 52, 272, 18);
        Object.assign(proof, { score: 0, lives: 3, restarts: state.restarts, shotsFired: 0, hits: 0, merges: 0 });
    }

    function fire() {
        if (!state.canShoot || state.shot || state.gameOver) return;
        const cx = centerX();
        const pointerX = Number(GM.runtime.mouseX);
        const dx = clamp((Number.isFinite(pointerX) ? pointerX : cx) - cx, -260, 260) / 260;
        state.shot = { tier: state.nextTier, x: cx, y: VIEW.cueY - 34, vx: dx * 620, vy: -1000 };
        state.nextTier = GM.math.irandom(1);
        state.canShoot = false;
        proof.shotsFired += 1;
    }

    function resolveHit(index) {
        const target = state.targets[index];
        const shot = state.shot;
        if (!target || !shot) return;
        proof.hits += 1;
        if (target.tier === shot.tier) {
            proof.merges += 1;
            state.score += (target.tier + 1) * 100;
            if (target.tier < 2) {
                target.tier += 1;
                target.vx *= -1;
                target.y -= 20;
            } else {
                state.targets.splice(index, 1);
            }
        } else {
            state.score += 25;
            state.targets.splice(index, 1);
        }
        state.shot = null;
        state.canShoot = true;
    }

    function stepGame(deltaSeconds) {
        if (state.gameOver) {
            if (GM.input.pointerReleased(GM.pointer.LEFT) || GM.input.keyPressed(GM.key.SPACE) || GM.input.keyPressed(GM.key.ENTER)) resetGame(true);
            return;
        }
        if (state.canShoot && (GM.input.pointerReleased(GM.pointer.LEFT) || GM.input.keyPressed(GM.key.SPACE))) fire();
        state.spawnAge += deltaSeconds;
        if (state.spawnAge >= 2.8 && state.targets.length < 7) {
            state.spawnAge = 0;
            addTarget(GM.math.irandom(2) === 2 ? 1 : 0, GM.math.random_range(VIEW.wall + 70, roomWidth() - VIEW.wall - 70), VIEW.top + 38, GM.math.random_range(-36, 36));
        }
        for (let index = state.targets.length - 1; index >= 0; index -= 1) {
            const target = state.targets[index];
            const r = radius(target.tier);
            target.phase += deltaSeconds;
            target.x += target.vx * deltaSeconds;
            target.y += (12 + target.tier * 3 + Math.sin(target.phase) * 3) * deltaSeconds;
            if (target.x < VIEW.wall + r || target.x > roomWidth() - VIEW.wall - r) target.vx *= -1;
            target.x = clamp(target.x, VIEW.wall + r, roomWidth() - VIEW.wall - r);
            if (target.y - r > VIEW.floor) {
                state.targets.splice(index, 1);
                state.lives -= 1;
                if (state.lives <= 0) {
                    state.gameOver = true;
                    state.shot = null;
                    state.canShoot = false;
                }
            }
        }
        if (state.shot) {
            const shot = state.shot;
            const shotRadius = radius(shot.tier);
            shot.x += shot.vx * deltaSeconds;
            shot.y += shot.vy * deltaSeconds;
            if (shot.x < VIEW.wall + shotRadius || shot.x > roomWidth() - VIEW.wall - shotRadius) shot.vx *= -1;
            shot.x = clamp(shot.x, VIEW.wall + shotRadius, roomWidth() - VIEW.wall - shotRadius);
            for (let index = state.targets.length - 1; index >= 0 && state.shot; index -= 1) {
                const target = state.targets[index];
                const hitRadius = shotRadius + radius(target.tier) * 0.75;
                if (GM.math.distanceSq(shot.x, shot.y, target.x, target.y) <= hitRadius * hitRadius) resolveHit(index);
            }
            if (state.shot && state.shot.y < VIEW.top - 80) {
                state.shot = null;
                state.canShoot = true;
            }
        }
        proof.score = state.score;
        proof.lives = state.lives;
    }

    function drawFruit(frame, x, y) {
        const sprite = GM.draw.spriteExt("fruit-shot-modular", frame, snapPixelPosition(x), snapPixelPosition(y), { originX: 0.5, originY: 0.5 });
        proof.spriteOptionsSeen = proof.spriteOptionsSeen || Boolean(sprite);
    }

    function drawGame() {
        const width = roomWidth();
        const cx = centerX();
        GM.draw.layer("Background");
        GM.draw.rect(0, 0, width, VIEW.height, { color: "#073b4c" });
        GM.draw.rect(VIEW.wall, VIEW.top, width - VIEW.wall * 2, VIEW.floor - VIEW.top, { color: "#0b5368" });
        GM.draw.rect(VIEW.wall, VIEW.top, width - VIEW.wall * 2, VIEW.floor - VIEW.top, { color: "#ffd166", outline: true, lineWidth: 3 });
        for (let y = VIEW.top + 48; y < VIEW.floor; y += 48) GM.draw.line(VIEW.wall, y, width - VIEW.wall, y, { color: "#0e6178", alpha: 0.5 });
        GM.draw.line(VIEW.wall, VIEW.floor, width - VIEW.wall, VIEW.floor, { color: "#ff2244", lineWidth: 4 });
        GM.draw.layer("Fruit");
        for (const target of state.targets) drawFruit("fruit-" + target.tier, target.x, target.y);
        if (state.shot) drawFruit("fruit-" + state.shot.tier, state.shot.x, state.shot.y);
        if (state.canShoot && !state.gameOver) drawFruit("cue", cx, VIEW.cueY);
        GM.draw.layer("HUD");
        drawPixelText("FRUIT SHOT", cx, 34, 2, "center");
        drawPixelText("SCORE " + String(state.score).padStart(4, "0"), VIEW.wall + 18, 100, 1);
        drawPixelText("LIVES " + state.lives, width - VIEW.wall - 18, 100, 1, "right", 0xffd166);
        proof.headingDraws += 1;
        proof.summaryDraws += 1;
        if (!state.gameOver) {
            drawPixelText(state.canShoot ? "TAP OR SPACE TO FIRE" : "SHOT ACTIVE", cx, VIEW.height - 42, 1, "center", state.canShoot ? 0xffffff : 0xffd166);
            return;
        }
        GM.draw.rect(0, 0, width, VIEW.height, { color: "#000000", alpha: 0.74 });
        drawPixelText("GAME OVER", cx, 540, 3, "center");
        drawPixelText("TAP TO RESTART", cx, 628, 1, "center", 0xffd166);
    }

    GM.app.start({
        parent: "game",
        width: VIEW.width,
        height: VIEW.height,
        responsive: false,
        integerScaleStep: PIXEL_SCALE_STEP,
        minHeight: VIEW.height,
        targetHeight: VIEW.height,
        maxHeight: VIEW.height,
        desktopHeight: VIEW.height,
        desktopMinWidth: VIEW.width,
        desktopMaxWidth: 1920,
        simulationHz: 60,
        maxFrameDeltaMs: 100,
        maxCatchUpSteps: 5,
        randomSeed: 1337,
        bleed: 80,
        stage: false,
        curtain: false,
        globals: false,
        background: "#05050c",
        renderQuality: "pixel-art",
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        renderResolution: "auto",
        maxRenderResolution: 3,
        type: renderType,
        create() {
            const atlas = bridge.addAtlas("fruit-shot-modular", createAssets(), {
                replace: true,
                preset: "pixel",
                compileOptions: { atlasOptions: { maxWidth: 512, maxHeight: 512 } }
            });
            proof.atlasFrames = [...atlas.frameNames];
            proof.grout13 = atlas.frameCount === proof.atlasFrames.length;
            proof.grout13PayloadBytes = Number(atlas.payloadBytes || 0);
            GM.layer.define({ Background: -100, Fruit: 0, HUD: 100 });
            resetGame(false);
            proof.playable = true;
            proof.inputReady = Boolean(GM.input && typeof GM.input.pointerReleased === "function");
            updatePixelPresentation();
            proof.phase = "running";
            setStatus("Ready\nPhaser 4.2.1\nModular Grout13 game");
            window.setTimeout(() => { if (!proof.failed) document.getElementById("status").hidden = true; }, 4000);
        },
        step(_api, deltaSeconds) {
            proof.frames += 1;
            proof.fixedSteps += 1;
            proof.fixedStepsSeen = proof.fixedStepsSeen || Number.isFinite(deltaSeconds) && deltaSeconds > 0;
            stepGame(deltaSeconds);
        },
        draw() {
            drawGame();
            if (!proof.failed && proof.frames >= 8 && proof.pixelTextSeen && proof.spriteOptionsSeen) {
                proof.phase = "complete";
                proof.complete = true;
            }
        },
        onError(error) {
            failProof(error);
        }
    });
}
