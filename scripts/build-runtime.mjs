#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "src");
const DIST_DIR = path.join(ROOT, "dist");
const TYPES_SOURCE = path.join(ROOT, "types", "gm-phaser4.d.ts");

const CORE_IMPORT = /^\s*import\s+\{\s*installGMRuntime\s*\}\s+from\s+["']\.\/gm-phaser4\.js["'];?\s*$/m;
const LOCAL_IMPORT = /^\s*import\s+\{[\s\S]*?\}\s+from\s+["'](\.\/[^"']+\.js)["'];?\s*$/gm;
const PHASER_IMPORT = 'import Phaser from "phaser"';

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
            throw new Error(`runtime build can only inline local runtime imports: ${specifier}`);
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
    ensure(!text.includes(PHASER_IMPORT), `${label} must not import Phaser directly.`);
}

function minimalMinify(source) {
    const text = normalizeLineEndings(source);
    const noBlockComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
    const noLineComments = noBlockComments.replace(/(^|[^:])\/\/.*(?=\n|$)/g, "$1");
    return noLineComments
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{2,}/g, "\n")
        .replace(/;+\n/g, ";\n")
        .trim();
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
    ensure(globalEntry.includes("installGMRuntime(root, Phaser)"), "src/index.global.js should install the runtime after validating root.Phaser.");
}

function main() {
    checkInputs();

    const moduleEntry = stripCoreImport(read(path.join(SRC_DIR, "index.module.js")));
    const globalEntry = read(path.join(SRC_DIR, "index.global.js"));
    const core = bundleCore(inlineRuntimeImports(path.join(SRC_DIR, "gm-phaser4.js")));

    fs.mkdirSync(DIST_DIR, { recursive: true });

    const moduleBundle = `${normalizeLineEndings(core)}\n\n${moduleEntry}\n`;
    const globalBundle = `${normalizeLineEndings(core)}\n\n${normalizeLineEndings(globalEntry)}\n`;

    buildArtifact("gm-phaser4.module.js", moduleBundle);
    buildArtifact("gm-phaser4.global.js", globalBundle);
    buildArtifact("gm-phaser4.global.min.js", minimalMinify(globalBundle));
    fs.copyFileSync(TYPES_SOURCE, path.join(DIST_DIR, "gm-phaser4.d.ts"));

    for (const name of ["gm-phaser4.module.js", "gm-phaser4.global.js", "gm-phaser4.global.min.js"]) {
        checkJavaScriptArtifact(name);
    }

    const artifacts = [
        "gm-phaser4.module.js",
        "gm-phaser4.global.js",
        "gm-phaser4.global.min.js",
        "gm-phaser4.d.ts",
    ];

    console.log(`[ok] Runtime build generated in ${path.relative(ROOT, DIST_DIR)}`);
    for (const name of artifacts) {
        const size = fs.statSync(path.join(DIST_DIR, name)).size;
        console.log(`  - ${name} (${size} bytes)`);
    }
}

main();
