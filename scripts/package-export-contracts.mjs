import fs from "node:fs";
import path from "node:path";

const PACKAGE_ENTRY_FIELDS = ["main", "module", "types", "unpkg", "jsdelivr"];

function collectTargets(value, label, targets) {
    if (typeof value === "string") {
        targets.push({ label, target: value });
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => collectTargets(item, `${label}[${index}]`, targets));
        return;
    }

    if (!value || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
        collectTargets(nested, `${label}.${key}`, targets);
    }
}

function isWithin(root, target) {
    const relative = path.relative(root, target);
    return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/**
 * Verify that local package entrypoints and export targets are included in a
 * package workspace. Wildcard exports are intentionally left to Node's
 * pattern resolver; the facade package currently uses concrete targets.
 *
 * @param {string} packageRoot
 * @param {string} label
 */
export function assertPackageExportTargets(packageRoot, label = "package") {
    const packageJsonPath = path.join(packageRoot, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`${label} is missing package.json.`);
    }

    let packageJson;
    try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`${label} package.json is not valid JSON: ${detail}`);
    }

    const targets = [];
    for (const field of PACKAGE_ENTRY_FIELDS) {
        collectTargets(packageJson[field], field, targets);
    }
    collectTargets(packageJson.exports, "exports", targets);

    const checked = new Set();
    for (const { label: targetLabel, target } of targets) {
        if (!target.startsWith("./") || target.includes("*")) continue;

        const resolved = path.resolve(packageRoot, target);
        if (!isWithin(path.resolve(packageRoot), resolved)) {
            throw new Error(`${label} ${targetLabel} escapes the package root: ${target}`);
        }
        if (checked.has(resolved)) continue;
        checked.add(resolved);

        if (!fs.existsSync(resolved)) {
            const relative = path.relative(packageRoot, resolved).replace(/\\/g, "/");
            throw new Error(`${label} ${targetLabel} points to a missing file: ${relative}`);
        }
    }

    return { checkedTargets: checked.size };
}
