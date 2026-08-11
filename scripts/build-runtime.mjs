#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { minifyJavaScript } from "./runtime-minifier.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_ROOT = ROOT;
const SRC_DIR = path.join(ROOT, "src");
const DIST_DIR = path.join(ROOT, "dist");
const TYPES_SOURCE = path.join(ROOT, "types", "gm-phaser4.d.ts");
const PACKAGE_JSON = path.join(ROOT, "package.json");

const CORE_IMPORT = /^\s*import\s+\{\s*installGMRuntime\s*\}\s+from\s+["']\.\/gm-phaser4\.js["'];?\s*$/m;
const LOCAL_IMPORT = /^\s*import\s+\{[\s\S]*?\}\s+from\s+["'](\.\/[^"']+\.js)["'];?\s*$/gm;
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

function stripCoreImport(entryPoint) {
    if (!CORE_IMPORT.test(entryPoint)) {
        throw new Error("module entry point must import installGMRuntime from ./gm-phaser4.js.");
    }
    return entryPoint.replace(CORE_IMPORT, "").trim();
}

function stripExports(source) {
    return source
        .replace(/^\s*export\s+(const|let|var|class)\s+/gm, "$1 ")
        .replace(/^\s*export\s+function\s+/gm, "function ")
        .replace(/^\s*export\s+\{[\s\S]*?\};?\s*$/gm, "")
        .replace(/^\s*export\s+default\s+/gm, "");
}

function inlineRuntimeImports(filePath, seen = new Set()) {
    const normalized = normalizeLineEndings(read(filePath));
    let prelude = "";
    const withoutImports = normalized.replace(LOCAL_IMPORT, (match, specifier) => {
        const dependency = path.resolve(path.dirname(filePath), specifier);
        if (!dependency.startsWith(SRC_DIR)) {
            throw new Error(`runtime build can only inline local source imports: ${specifier}`);
        }
        if (seen.has(dependency)) return "";
        seen.add(dependency);
        prelude += `${stripExports(inlineRuntimeImports(dependency, seen)).trim()}\n\n`;
        return "";
    });

    return `${prelude}${withoutImports}`;
}

function bundleCore(core) {
    const normalized = normalizeLineEndings(core);
    if (!/^\s*export\s+function\s+installGMRuntime\s*\(/m.test(normalized)) {
        throw new Error("runtime core must export installGMRuntime(root, Phaser).");
    }
    const bundled = normalized.replace(/^\s*export\s+function\s+installGMRuntime\s*\(/m, "function installGMRuntime(");
    if (/\bimport\s+/.test(bundled) || /\bexport\s+/.test(bundled)) {
        throw new Error("runtime bundle still contains import/export syntax after inlining local modules.");
    }
    return bundled;
}

function ensureNoPhaserImport(text, label) {
    ensure(!text.includes(PHASER_DEFAULT_IMPORT), `${label} must not default-import Phaser.`);
    ensure(!PHASER_NS_IMPORT.test(text), `${label} must not import Phaser directly.`);
}

function syncRuntimeVersion(source, version) {
    if (!/export const RUNTIME_VERSION\s*=\s*["'][^"']+["']/.test(source) &&
        !/const RUNTIME_VERSION\s*=\s*["'][^"']+["']/.test(source)) {
        throw new Error("runtime constants are missing RUNTIME_VERSION.");
    }
    return source
        .replace(/export const RUNTIME_VERSION\s*=\s*["'][^"']+["']/, `export const RUNTIME_VERSION = "${version}"`)
        .replace(/const RUNTIME_VERSION\s*=\s*["'][^"']+["']/, `const RUNTIME_VERSION = "${version}"`);
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
    const globalEntry = read(path.join(SRC_DIR, "index.global.js"));
    const coreEntry = read(path.join(SRC_DIR, "gm-phaser4.js"));

    ensureNoPhaserImport(globalEntry, "src/index.global.js");
    ensureNoPhaserImport(coreEntry, "src/gm-phaser4.js");
    ensure(CORE_IMPORT.test(moduleEntry), "src/index.module.js missing installGMRuntime import.");
    ensure(PHASER_NS_IMPORT.test(moduleEntry), "src/index.module.js must use import * as Phaser from \"phaser\".");
    ensure(!moduleEntry.includes(PHASER_DEFAULT_IMPORT), "source/runtime/gm-phaser4/src/index.module.js must not default-import Phaser.");
    ensure(globalEntry.includes("installGMRuntime(root, Phaser)"), "source/runtime/gm-phaser4/src/index.global.js should install the runtime after validating root.Phaser.");
    ensure(moduleEntry.includes("export { installGMRuntime }"), "module entry must re-export installGMRuntime.");
    ensure(moduleEntry.includes("export const GM"), "module entry must export installed GM.");
}

async function main() {
    checkInputs();

    const pkg = JSON.parse(read(PACKAGE_JSON));
    const packageVersion = String(pkg.version || "").trim();
    ensure(Boolean(packageVersion), "package.json is missing version.");

    // Keep source constants synchronized with package.json at build time.
    const constantsPath = path.join(SRC_DIR, "core", "constants.js");
    const constantsSource = read(constantsPath);
    const syncedConstants = syncRuntimeVersion(constantsSource, packageVersion);
    if (syncedConstants !== constantsSource) {
        write(constantsPath, syncedConstants);
    }

    const moduleEntry = stripCoreImport(read(path.join(SRC_DIR, "index.module.js")));
    const globalEntry = read(path.join(SRC_DIR, "index.global.js"));
    let core = bundleCore(inlineRuntimeImports(path.join(SRC_DIR, "gm-phaser4.js")));
    core = syncRuntimeVersion(core, packageVersion);

    fs.mkdirSync(DIST_DIR, { recursive: true });

    const moduleBundle = `${normalizeLineEndings(core)}\n\n${moduleEntry}\n`;
    const globalBundle = `${normalizeLineEndings(core)}\n\n${normalizeLineEndings(globalEntry)}\n`;

    buildArtifact("gm-phaser4.module.js", moduleBundle);
    buildArtifact("gm-phaser4.global.js", globalBundle);
    buildArtifact("gm-phaser4.global.min.js", await minifyJavaScript(globalBundle, "gm-phaser4.global.js"));
    fs.copyFileSync(TYPES_SOURCE, path.join(DIST_DIR, "gm-phaser4.d.ts"));

    const bridgeBuild = spawnSync(process.execPath, [path.join(ROOT, "scripts", "build-grout13-bridge.mjs")], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: "inherit"
    });
    ensure(bridgeBuild.status === 0, "Grout13 bridge artifact build failed.");

    for (const name of ["gm-phaser4.module.js", "gm-phaser4.global.js", "gm-phaser4.global.min.js"]) {
        checkJavaScriptArtifact(name);
    }
    for (const name of ["gm-phaser4-grout13.module.js", "gm-phaser4-grout13.global.js", "gm-phaser4-grout13.global.min.js"]) {
        checkJavaScriptArtifact(name);
    }

    // Module artifact must keep a Phaser peer import for consumers.
    const moduleOut = read(path.join(DIST_DIR, "gm-phaser4.module.js"));
    ensure(PHASER_NS_IMPORT.test(moduleOut), "module dist must retain import * as ... from \"phaser\".");
    ensure(moduleOut.includes("export { installGMRuntime }"), "module dist must export installGMRuntime.");
    ensure(moduleOut.includes("export const GM"), "module dist must export GM.");
    for (const name of ["gm-phaser4.module.js", "gm-phaser4.global.js", "gm-phaser4.global.min.js"]) {
        const coreArtifact = read(path.join(DIST_DIR, name));
        ensure(!coreArtifact.includes("installGrout13Bridge"), `${name} must not include the optional Grout13 bridge.`);
        ensure(!coreArtifact.includes("GROUT13"), `${name} must not include the optional Grout13 dependency.`);
    }

    const artifacts = [
        "gm-phaser4.module.js",
        "gm-phaser4.global.js",
        "gm-phaser4.global.min.js",
        "gm-phaser4.d.ts",
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
