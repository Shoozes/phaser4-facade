#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = ROOT;
const TSC_BIN = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");

function fail(message) {
    throw new Error(message);
}

if (!fs.existsSync(TSC_BIN)) fail("TypeScript is not installed for the frontend package.");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gm-phaser4-types-"));
const packagePath = path.join(tempRoot, "node_modules", "phaser4-facade");
fs.mkdirSync(path.dirname(packagePath), { recursive: true });
fs.cpSync(PACKAGE_ROOT, packagePath, {
    recursive: true,
    filter(source) {
        return !source.includes(`${path.sep}node_modules${path.sep}`);
    }
});

function writeConsumer(name, source) {
    const filePath = path.join(tempRoot, name);
    fs.writeFileSync(filePath, source, "utf8");
    return filePath;
}

function runTsc(filePath) {
    return spawnSync(process.execPath, [
        TSC_BIN,
        "--noEmit",
        "--strict",
        "--target", "ES2020",
        "--module", "NodeNext",
        "--moduleResolution", "NodeNext",
        "--lib", "DOM,ES2020",
        filePath
    ], {
        cwd: tempRoot,
        encoding: "utf8"
    });
}

const namespaced = writeConsumer("namespaced-consumer.ts", [
    "import \"phaser4-facade\";",
    "const red: number = GM.color.RED;",
    "GM.app.start({ globals: false, width: 720, height: 1280 });",
    "void red;"
].join("\n"));
const namespacedResult = runTsc(namespaced);
if (namespacedResult.status !== 0) {
    fail(`namespaced package consumer failed to compile:\n${namespacedResult.stdout || namespacedResult.stderr}`);
}

const legacy = writeConsumer("legacy-consumer.ts", [
    "import \"phaser4-facade\";",
    "import \"phaser4-facade/legacy-globals\";",
    "const red: number = c_red;",
    "const dispose: () => void = GM.legacy.installGlobals();",
    "void red;",
    "void dispose;"
].join("\n"));
const legacyResult = runTsc(legacy);
if (legacyResult.status !== 0) {
    fail(`opt-in legacy package consumer failed to compile:\n${legacyResult.stdout || legacyResult.stderr}`);
}

const bridgeConsumer = writeConsumer("grout13-consumer.ts", [
    "import { GM } from \"phaser4-facade\";",
    "import { installGrout13Bridge } from \"phaser4-facade/grout13\";",
    "GM.draw.rect(0, 0, 10, 10, { color: \"#fff\", alpha: 0.5, outline: true, lineWidth: 2 });",
    "GM.draw.polyline([{ x: 0, y: 0 }, [2, 2]], { closed: false });",
    "GM.layer.define({ background: -100, actors: 100 });",
    "const center: number = GM.runtime.centerX + GM.runtime.centerY;",
    "const vector = GM.math.normalize2(3, 4);",
    "const damped: number = GM.math.dampFactor(0.9, 1 / 60) + GM.math.distanceSq(0, 0, vector.x, vector.y);",
    "const bridge = installGrout13Bridge(GM, {",
    "  compileGrout13Atlas: (assets) => ({ payload: assets }),",
    "  decodeGrout13Atlas: () => ({ width: 1, height: 1, canvas: {}, frames: { fruit: { x: 0, y: 0, w: 1, h: 1 } } })",
    "});",
    "GM.grout13.addPayload(\"fruit-payload\", []);",
    "bridge.addAtlas(\"fruit\", [{ name: \"fruit\" }], { replace: true });",
    "bridge.addCompiled(\"compiled\", { payload: [], atlas: { width: 1, height: 1, rgba: [0, 0, 0, 0] }, frames: [{ name: \"fruit\", x: 0, y: 0, width: 1, height: 1 }] });"
].join("\n"));
const bridgeResult = runTsc(bridgeConsumer);
if (bridgeResult.status !== 0) {
    fail(`Grout13 bridge package consumer failed to compile:\n${bridgeResult.stdout || bridgeResult.stderr}`);
}

const namespacedOnly = writeConsumer("namespaced-only-consumer.ts", [
    "import \"phaser4-facade\";",
    "const width: number = room_width;",
    "void width;"
].join("\n"));
const namespacedOnlyResult = runTsc(namespacedOnly);
const namespacedOnlyOutput = `${namespacedOnlyResult.stdout || ""}\n${namespacedOnlyResult.stderr || ""}`;
if (namespacedOnlyResult.status === 0 || !/Cannot find name ['\"]room_width['\"]/.test(namespacedOnlyOutput)) {
    fail("namespaced-only package consumer unexpectedly exposes legacy room_width types.");
}

fs.rmSync(tempRoot, { recursive: true, force: true });
console.log("[ok] Runtime package TypeScript consumer contracts passed.");
