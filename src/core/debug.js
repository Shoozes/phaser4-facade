// @ts-check

/**
 * @param {unknown} message
 * @param {{ log?: (message?: unknown, ...optionalParams: unknown[]) => void }} [logger]
 */
export function logDebugMessage(message, logger = console) {
    if (logger && typeof logger.log === "function") {
        logger.log(message);
    }
}

/**
 * @param {unknown} values
 * @returns {Record<string, unknown>}
 */
export function collectNonFiniteValues(values) {
    /** @type {Record<string, unknown>} */
    const invalid = {};
    if (!values || typeof values !== "object") return invalid;
    for (const [key, value] of Object.entries(values)) {
        if (!Number.isFinite(Number(value))) invalid[key] = value;
    }
    return invalid;
}

/**
 * @param {string} label
 * @param {Record<string, unknown>} values
 * @param {{ nonFiniteSimulationValues?: number }} [diagnostics]
 */
export function assertFinite(label, values, diagnostics) {
    const invalid = collectNonFiniteValues(values);
    if (Object.keys(invalid).length === 0) return true;
    if (diagnostics) {
        diagnostics.nonFiniteSimulationValues = Number(diagnostics.nonFiniteSimulationValues || 0) + 1;
    }
    const details = Object.entries(invalid).map(([key, value]) => `${key}: ${String(value)}`).join("\n");
    throw new TypeError(`[phaser4-facade] ${label || "value"} has non-finite fields.\n${details}`);
}

/**
 * @param {{
 *   texture?: unknown,
 *   frame?: unknown,
 *   layer?: unknown,
 *   frameNumber?: unknown,
 *   values?: Record<string, unknown>
 * }} report
 */
export function formatInvalidDraw(report) {
    const values = report.values && typeof report.values === "object" ? report.values : {};
    const lines = [
        "[phaser4-facade] GM.draw.spriteExt rejected a non-finite transform.",
        "",
        `Texture: ${report.texture == null ? "(none)" : String(report.texture)}`,
        `Frame: ${report.frame == null ? "(none)" : String(report.frame)}`,
        `Layer: ${report.layer == null ? "(none)" : String(report.layer)}`,
        `Frame number: ${report.frameNumber == null ? "(none)" : String(report.frameNumber)}`,
        ""
    ];
    for (const [key, value] of Object.entries(values)) {
        lines.push(`${key}: ${String(value)}`);
    }
    return lines.join("\n");
}
