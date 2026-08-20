#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { minifyJavaScript } from "./runtime-minifier.mjs";
import { bundleRuntimeSource } from "./esbuild-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_ROOT = ROOT;
const SRC_DIR = path.join(ROOT, "src");
const DIST_DIR = path.join(ROOT, "dist");
const TYPES_SOURCE = path.join(ROOT, "types", "gm-phaser4.d.ts");
const INSTALL_TYPES_SOURCE = path.join(ROOT, "types", "gm-phaser4.install.d.ts");
const PACKAGE_JSON = path.join(ROOT, "package.json");

const PHASER_DEFAULT_IMPORT = 'import Phaser from "phaser"';
const PHASER_NS_IMPORT = /import\s+\*\s+as\s+\w+\s+from\s+["']phaser["']/;

function read(file) {
    return fs.readFileSync(file, "utf8");
}

function write(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
}

function ensure(predicate, message) {
    if (!predicate) {
        throw new Error(message);
    }
}

function normalizeLineEndings(text) {
    return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function readRuntimeVersion(source, label) {
    const version = source.match(/(?:export\s+)?(?:const|let|var)\s+RUNTIME_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
    ensure(Boolean(version), `${label} is missing RUNTIME_VERSION.`);
    return version;
}

function ensureNoPhaserImport(text, label) {
    ensure(!text.includes(PHASER_DEFAULT_IMPORT), `${label} must not default-import Phaser.`);
    ensure(!PHASER_NS_IMPORT.test(text), `${label} must not import Phaser directly.`);
}

function syncRuntimeVersion(source, version) {
    const pattern = /(?:export\s+)?(?:const|let|var)\s+RUNTIME_VERSION\s*=\s*["'][^"']+["']/;
    if (!pattern.test(source)) {
        throw new Error("runtime constants are missing RUNTIME_VERSION.");
    }
    return source.replace(pattern, (match) => {
        const declaration = match.match(/^(?:export\s+)?(?:const|let|var)/)?.[0] || "const";
        return `${declaration} RUNTIME_VERSION = "${version}"`;
    });
}

function buildArtifact(fileName, content) {
    write(path.join(DIST_DIR, fileName), normalizeLineEndings(content));
}

function checkJavaScriptArtifact(fileName) {
    const artifact = path.join(DIST_DIR, fileName);
    const result = spawnSync(process.execPath, ["--check", artifact], {
        cwd: ROOT,
        encoding: "utf8"
    });
    if (result.status !== 0) {
        const output = (result.stderr || result.stdout || "").trim();
        throw new Error(`runtime artifact failed JavaScript syntax check: ${fileName}\n${output}`);
    }
}

function checkInputs() {
    const moduleEntry = read(path.join(SRC_DIR, "index.module.js"));
    const installEntry = read(path.join(SRC_DIR, "index.install.js"));
    const globalEntry = read(path.join(SRC_DIR, "index.global.js"));
    const coreEntry = read(path.join(SRC_DIR, "gm-phaser4.js"));

    ensureNoPhaserImport(globalEntry, "src/index.global.js");
    ensureNoPhaserImport(coreEntry, "src/gm-phaser4.js");
    ensure(PHASER_NS_IMPORT.test(moduleEntry), "src/index.module.js must use import * as Phaser from \"phaser\".");
    ensure(PHASER_NS_IMPORT.test(installEntry), "src/index.install.js must use import * as Phaser from \"phaser\".");
    ensure(!moduleEntry.includes(PHASER_DEFAULT_IMPORT), "source/runtime/gm-phaser4/src/index.module.js must not default-import Phaser.");
    ensure(!installEntry.includes("installGMRuntime(runtimeRoot"), "source/runtime/gm-phaser4/src/index.install.js must remain side-effect free on import.");
    ensure(globalEntry.includes("installGMRuntime(root, Phaser)"), "source/runtime/gm-phaser4/src/index.global.js should install the runtime after validating root.Phaser.");
    ensure(moduleEntry.includes("installGMRuntime"), "module entry must install and re-export the runtime.");
}

async function bundleWithEsbuild(contents, sourcefile, format, externalPhaser) {
    return bundleRuntimeSource({ root: ROOT, contents: normalizeLineEndings(contents), sourcefile, format, externalPhaser });
}

async function main() {
    checkInputs();

    const pkg = JSON.parse(read(PACKAGE_JSON));
    const packageVersion = String(pkg.version || "").trim();
    ensure(Boolean(packageVersion), "package.json is missing version.");

    // Source is a checked-in build input. Require an explicit version update
    // instead of rewriting it as a side effect of a build.
    const constantsPath = path.join(SRC_DIR, "core", "constants.js");
    const constantsSource = read(constantsPath);
    ensure(readRuntimeVersion(constantsSource, "src/core/constants.js") === packageVersion,
        `package.json version ${packageVersion} must match src/core/constants.js RUNTIME_VERSION before building.`);

    const moduleEntry = read(path.join(SRC_DIR, "index.module.js"));
    const installEntry = read(path.join(SRC_DIR, "index.install.js"));
    const globalEntry = read(path.join(SRC_DIR, "index.global.js"));
    const coreSource = read(path.join(SRC_DIR, "gm-phaser4.js"));

    fs.mkdirSync(DIST_DIR, { recursive: true });

    const moduleBundle = await bundleWithEsbuild(moduleEntry, "src/index.module.js", "esm", true);
    const installBundle = await bundleWithEsbuild(installEntry, "src/index.install.js", "esm", true);
    const globalBundle = await bundleWithEsbuild(`${coreSource}\n\n${globalEntry}`, "src/index.global.js", "iife", false);

    buildArtifact("gm-phaser4.module.js", syncRuntimeVersion(moduleBundle, packageVersion));
    buildArtifact("gm-phaser4.install.module.js", syncRuntimeVersion(installBundle, packageVersion));
    buildArtifact("gm-phaser4.global.js", syncRuntimeVersion(globalBundle, packageVersion));
    buildArtifact("gm-phaser4.global.min.js", await minifyJavaScript(globalBundle, "gm-phaser4.global.js"));
    fs.copyFileSync(TYPES_SOURCE, path.join(DIST_DIR, "gm-phaser4.d.ts"));
    fs.copyFileSync(INSTALL_TYPES_SOURCE, path.join(DIST_DIR, "gm-phaser4.install.d.ts"));

    const bridgeBuild = spawnSync(process.execPath, [path.join(ROOT, "scripts", "build-grout13-bridge.mjs")], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: "inherit"
    });
    ensure(bridgeBuild.status === 0, "Grout13 bridge artifact build failed.");

    for (const name of ["gm-phaser4.module.js", "gm-phaser4.install.module.js", "gm-phaser4.global.js", "gm-phaser4.global.min.js"]) {
        checkJavaScriptArtifact(name);
    }
    for (const name of ["gm-phaser4-grout13.module.js", "gm-phaser4-grout13.global.js", "gm-phaser4-grout13.global.min.js"]) {
        checkJavaScriptArtifact(name);
    }

    // Module artifact must keep a Phaser peer import for consumers.
    const moduleOut = read(path.join(DIST_DIR, "gm-phaser4.module.js"));
    ensure(PHASER_NS_IMPORT.test(moduleOut), "module dist must retain import * as ... from \"phaser\".");
    ensure(moduleOut.includes("installGMRuntime"), "module dist must retain installGMRuntime.");
    const installOut = read(path.join(DIST_DIR, "gm-phaser4.install.module.js"));
    ensure(PHASER_NS_IMPORT.test(installOut), "install module dist must retain import * as ... from \"phaser\".");
    ensure(installOut.includes("createGMRuntime"), "install module dist must retain createGMRuntime.");
    for (const name of ["gm-phaser4.module.js", "gm-phaser4.install.module.js", "gm-phaser4.global.js", "gm-phaser4.global.min.js"]) {
        const coreArtifact = read(path.join(DIST_DIR, name));
        ensure(!coreArtifact.includes("installGrout13Bridge"), `${name} must not include the optional Grout13 bridge.`);
        ensure(!coreArtifact.includes("GROUT13"), `${name} must not include the optional Grout13 dependency.`);
    }

    const artifacts = [
        "gm-phaser4.module.js",
        "gm-phaser4.install.module.js",
        "gm-phaser4.global.js",
        "gm-phaser4.global.min.js",
        "gm-phaser4.d.ts",
        "gm-phaser4.install.d.ts",
        "gm-phaser4-grout13.module.js",
        "gm-phaser4-grout13.global.js",
        "gm-phaser4-grout13.global.min.js",
        "grout13.d.ts",
    ];

    console.log(`[ok] Runtime build generated in ${path.relative(ROOT, DIST_DIR)}`);
    console.log(`  - version ${packageVersion}`);
    for (const name of artifacts) {
        const size = fs.statSync(path.join(DIST_DIR, name)).size;
        console.log(`  - ${name} (${size} bytes)`);
    }
}

main().catch((error) => {
    console.error(`[fail] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
});
