#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/**
 * Read the private template's artifact receipt when present. The public
 * facade checkout intentionally has no private receipt, so its qualification
 * scripts fall back to the checkout's current commit.
 * @param {string} packageRoot
 * @returns {{ publicCommit: string, status: string, artifacts: Record<string, string> }}
 */
export function readArtifactQualification(packageRoot) {
    const manifestPath = path.join(packageRoot, "docs", "artifact-qualification.json");
    if (fs.existsSync(manifestPath)) return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const configuredCommit = String(process.env.FACADE_PUBLIC_COMMIT || "").trim();
    const publicCommit = configuredCommit || execFileSync("git", ["rev-parse", "HEAD"], { cwd: packageRoot, encoding: "utf8" }).trim();
    if (!/^[0-9a-f]{40}$/i.test(publicCommit)) throw new Error("FACADE_PUBLIC_COMMIT must be a full facade commit SHA.");
    return { publicCommit, status: "public-checkout", artifacts: {} };
}

/**
 * Verify the local dist fixture when the private receipt supplies hashes.
 * Public checkouts keep this a no-op because their checked-in dist files are
 * verified by their package and reproducibility contracts.
 * @param {{ status: string, artifacts?: Record<string, string> }} receipt
 * @param {string} packageRoot
 */
export function assertLocalArtifactHashes(receipt, packageRoot) {
    if (!Object.keys(receipt.artifacts || {}).length) return;
    if (!["local-fixture-before-promotion", "exact-pinned"].includes(receipt.status)) {
        throw new Error("Fruit Shot browser proof must identify its artifact qualification lane");
    }
    for (const [name, expected] of Object.entries(receipt.artifacts)) {
        const filePath = path.join(packageRoot, "dist", name);
        if (!fs.existsSync(filePath)) throw new Error(`artifact qualification fixture is missing: ${filePath}`);
        const actual = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
        if (actual !== expected) throw new Error(`local artifact hash drifted for ${name}`);
    }
}
