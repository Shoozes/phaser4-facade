#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = ROOT;
const CACHE_ROOT = path.join(ROOT, "runtime-data", "npm-cache");

function resolveNpm() {
    const bundledCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    if (fs.existsSync(bundledCli)) {
        return { executable: process.execPath, args: [bundledCli] };
    }
    return { executable: process.platform === "win32" ? "npm.cmd" : "npm", args: [] };
}

fs.mkdirSync(CACHE_ROOT, { recursive: true });
const npm = resolveNpm();
const result = spawnSync(
    npm.executable,
    [...npm.args, "pack", "--dry-run"],
    {
        cwd: PACKAGE_ROOT,
        env: {
            ...process.env,
            npm_config_cache: CACHE_ROOT,
            npm_config_audit: "false",
            npm_config_fund: "false",
            npm_config_update_notifier: "false"
        },
        stdio: "inherit"
    }
);

if (result.error) {
    console.error(`[error] Unable to run npm pack: ${result.error.message}`);
    process.exit(1);
}
process.exit(result.status ?? 1);
