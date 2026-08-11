#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { minifyJavaScript } from "./runtime-minifier.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_ROOT = ROOT;
const SRC_DIR = path.join(ROOT, "src");
const DIST_DIR = path.join(ROOT, "dist");
const TYPES_SOURCE = path.join(ROOT, "types", "gm-phaser4.d.ts");
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
    const globalEntry = read(path.join(SRC_DIR, "index.global.js"));
    const coreEntry = read(path.join(SRC_DIR, "gm-phaser4.js"));

    ensureNoPhaserImport(globalEntry, "src/index.global.js");
    ensureNoPhaserImport(coreEntry, "src/gm-phaser4.js");
    ensure(PHASER_NS_IMPORT.test(moduleEntry), "src/index.module.js must use import * as Phaser from \"phaser\".");
    ensure(!moduleEntry.includes(PHASER_DEFAULT_IMPORT), "source/runtime/gm-phaser4/src/index.module.js must not default-import Phaser.");
    ensure(globalEntry.includes("installGMRuntime(root, Phaser)"), "source/runtime/gm-phaser4/src/index.global.js should install the runtime after validating root.Phaser.");
    ensure(moduleEntry.includes("installGMRuntime"), "module entry must install and re-export the runtime.");
}

async function bundleWithEsbuild(contents, sourcefile, format, externalPhaser) {
    const runtimeNamespace = "phaser4-facade-runtime";
    const result = await build({
        absWorkingDir: ROOT,
        bundle: true,
        format,
        legalComments: "none",
        platform: "browser",
        plugins: [{
            name: "local-runtime-source",
            setup(pluginBuild) {
                pluginBuild.onResolve({ filter: /.*/ }, (args) => {
                    if (externalPhaser && args.path === "phaser") {
                        return { external: true, path: args.path };
                    }
                    if (!args.path.startsWith(".")) return { external: true, path: args.path };
                    const importer = path.isAbsolute(args.importer)
                        ? args.importer
                        : path.resolve(ROOT, args.importer || sourcefile);
                    const resolved = path.resolve(path.dirname(importer), args.path);
                    if (!resolved.startsWith(`${SRC_DIR}${path.sep}`)) {
                        throw new Error(`runtime build cannot resolve outside src/: ${args.path}`);
                    }
                    // Keep esbuild's namespace comments stable across checkouts.
                    // Absolute source paths make otherwise identical artifacts differ
                    // between the public facade repo and private consumer snapshots.
                    return {
                        namespace: runtimeNamespace,
                        path: path.relative(ROOT, resolved).replaceAll(path.sep, "/")
                    };
                });
                pluginBuild.onLoad({ filter: /.*/, namespace: runtimeNamespace }, (args) => ({
                    contents: read(path.resolve(ROOT, args.path)),
                    loader: "js",
                    resolveDir: path.dirname(path.resolve(ROOT, args.path))
                }));
            }
        }],
        stdin: {
            contents: normalizeLineEndings(contents),
            loader: "js",
            resolveDir: ".",
            sourcefile
        },
        target: "es2020",
        write: false
    });
    const output = result.outputFiles?.[0]?.text;
    ensure(typeof output === "string" && output.length > 0, `esbuild produced no output for ${sourcefile}.`);
    return output;
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

    const moduleEntry = read(path.join(SRC_DIR, "index.module.js"));
    const globalEntry = read(path.join(SRC_DIR, "index.global.js"));
    const coreSource = read(path.join(SRC_DIR, "gm-phaser4.js"));

    fs.mkdirSync(DIST_DIR, { recursive: true });

    const moduleBundle = await bundleWithEsbuild(moduleEntry, "src/index.module.js", "esm", true);
    const globalBundle = await bundleWithEsbuild(`${coreSource}\n\n${globalEntry}`, "src/index.global.js", "iife", false);

    buildArtifact("gm-phaser4.module.js", syncRuntimeVersion(moduleBundle, packageVersion));
    buildArtifact("gm-phaser4.global.js", syncRuntimeVersion(globalBundle, packageVersion));
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
    ensure(moduleOut.includes("installGMRuntime"), "module dist must retain installGMRuntime.");
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
