#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLE = path.join(ROOT, "examples", "fruit-shot.js");
const HTML = path.join(ROOT, "examples", "fruit-shot.html");

function fail(message) {
    throw new Error(message);
}

function checkTypeScript() {
    const tsc = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");
    if (!fs.existsSync(tsc)) fail("Fruit Shot type check requires the package TypeScript dependency.");
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "phaser4-fruit-shot-types-"));
    try {
        const source = fs.readFileSync(EXAMPLE, "utf8")
            .replaceAll("../dist/gm-phaser4.module.js", "phaser4-facade")
            .replaceAll("../dist/gm-phaser4-grout13.module.js", "phaser4-facade/grout13");
        fs.writeFileSync(path.join(tempRoot, "fruit-shot.js"), source, "utf8");
        fs.writeFileSync(path.join(tempRoot, "tsconfig.json"), JSON.stringify({
            compilerOptions: {
                allowJs: true,
                checkJs: true,
                noEmit: true,
                module: "ESNext",
                moduleResolution: "Bundler",
                target: "ES2022",
                lib: ["ES2022", "DOM"],
                skipLibCheck: true,
                baseUrl: ROOT,
                paths: {
                    "phaser4-facade": ["types/gm-phaser4.d.ts"],
                    "phaser4-facade/grout13": ["types/grout13.d.ts"]
                }
            },
            files: ["fruit-shot.js"]
        }, null, 2), "utf8");
        const result = spawnSync(process.execPath, [tsc, "-p", path.join(tempRoot, "tsconfig.json")], {
            cwd: ROOT,
            encoding: "utf8"
        });
        if (result.status !== 0) fail(`Fruit Shot type check failed:\n${result.stdout || ""}${result.stderr || ""}`);
    } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    }
}

async function checkBundle() {
    const localNamespace = "fruit-shot-local";
    const result = await build({
        absWorkingDir: ROOT,
        bundle: true,
        format: "esm",
        metafile: true,
        platform: "browser",
        plugins: [{
            name: "fruit-shot-local-source",
            setup(pluginBuild) {
                pluginBuild.onResolve({ filter: /.*/ }, (args) => {
                    if (args.path === "phaser") return { external: true, path: args.path };
                    if (!args.path.startsWith(".")) return { external: true, path: args.path };
                    const importer = path.isAbsolute(args.importer)
                        ? args.importer
                        : path.join(ROOT, "examples", "fruit-shot.js");
                    const resolved = path.resolve(path.dirname(importer), args.path);
                    if (!resolved.startsWith(`${ROOT}${path.sep}`)) fail(`Fruit Shot import escapes package root: ${args.path}`);
                    return { namespace: localNamespace, path: resolved };
                });
                pluginBuild.onLoad({ filter: /.*/, namespace: localNamespace }, (args) => ({
                    contents: fs.readFileSync(args.path, "utf8"),
                    loader: "js",
                    resolveDir: path.dirname(args.path)
                }));
            }
        }],
        stdin: {
            contents: fs.readFileSync(EXAMPLE, "utf8"),
            loader: "js",
            resolveDir: path.dirname(EXAMPLE),
            sourcefile: "fruit-shot.js"
        },
        write: false,
        logLevel: "silent"
    });
    assert.ok(result.outputFiles?.[0]?.text.length > 0, "Fruit Shot bundle should produce JavaScript.");
    const externalImports = new Set();
    for (const input of Object.values(result.metafile?.inputs || {})) {
        for (const importRecord of input.imports || []) {
            if (importRecord.external) externalImports.add(importRecord.path);
        }
    }
    assert.deepEqual([...externalImports].sort(), ["phaser"], "Fruit Shot should only leave Phaser as a peer import.");
}

function checkSourceContract() {
    const source = fs.readFileSync(EXAMPLE, "utf8");
    const html = fs.readFileSync(HTML, "utf8");
    for (const forbidden of ["GM.time.deltaSec", "GM.time.currentTime", "GM.draw.rectangle"]) {
        if (source.includes(forbidden)) fail(`Fruit Shot still uses unsupported API: ${forbidden}`);
    }
    for (const marker of [
        "GM.runtime.deltaSec",
        "GM.runtime.currentTime",
        "GM.runtime.centerX",
        "GM.runtime.centerY",
        "GM.draw.rect",
        "GM.draw.polyline",
        "GM.draw.textExt",
        "GM.draw.textFit",
        "GM.gui.textExt",
        "GM.gui.textFit",
        "GM.draw.spriteExt",
        "width: 96",
        "__fruitShotProof",
        "id=\"game\"",
        "touch-action: none",
        "importmap"
    ]) {
        if (!source.includes(marker) && !html.includes(marker)) fail(`Fruit Shot proof is missing marker: ${marker}`);
    }
}

checkSourceContract();
checkTypeScript();
await checkBundle();
console.log("[ok] Fruit Shot source, type, and package bundle proof passed.");
