import fs from "node:fs";
import path from "node:path";

function makeFixture(distRoot, source) {
    return {
        source,
        globalPath: path.join(distRoot, "grout13.global.min.js"),
        modulePath: path.join(distRoot, "grout13.mjs")
    };
}

/**
 * Finds an optional local Grout13 test fixture without making it a runtime dependency.
 * @param {string} root Facade package root.
 */
export function resolveGrout13Fixture(root) {
    const globalOverride = process.env.GROUT13_GLOBAL_PATH;
    const moduleOverride = process.env.GROUT13_MODULE_PATH;
    if (globalOverride || moduleOverride) {
        return {
            source: "environment override",
            globalPath: globalOverride || null,
            modulePath: moduleOverride || null,
            hasOverride: true
        };
    }

    const candidateRoots = [
        path.resolve(root, "..", "grout13", "dist"),
        path.resolve(root, "..", "..", "..", "runtime-data", "coordination", "grout13", "dist")
    ];
    const candidates = [...new Set(candidateRoots)].map((distRoot, index) => makeFixture(distRoot, index === 0 ? "sibling coordination" : "repository coordination"));
    const fixture = candidates.find((candidate) => fs.existsSync(candidate.globalPath) && fs.existsSync(candidate.modulePath))
        || candidates.find((candidate) => fs.existsSync(candidate.globalPath))
        || candidates[0];
    return { ...fixture, hasOverride: false };
}
