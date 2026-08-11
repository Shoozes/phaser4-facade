// @ts-check

/**
 * @typedef {{
 *   drawText: number,
 *   fittedText: number,
 *   buttons: number,
 *   panels: number,
 *   sprites: number,
 *   nineSlices: number,
 *   declarativeNodes: number,
 *   layoutReads: number,
 *   textSetCalls: number,
 *   textStyleSetCalls: number,
 *   textObjectsAllocated: number,
 *   textObjectsReused: number
 * }} RuntimePerfCounts
 *
 * @typedef {{
 *   enabled: boolean,
 *   frame: { stepMs: number, drawMs: number, uiMs: number, totalMs: number, fpsEstimate: number },
 *   counts: RuntimePerfCounts,
 *   topLabels: { text: string, count: number }[],
 *   _frameStartedAt: number,
 *   _stepStartedAt: number,
 *   _drawStartedAt: number,
 *   _uiStartedAt: number,
 *   _frameDeltaMs: number,
 *   _labels: Map<string, number>
 * }} RuntimePerfState
 */

function nowMs() {
    const perf = typeof performance !== "undefined" ? performance : null;
    return perf && typeof perf.now === "function" ? perf.now() : Date.now();
}

/**
 * @param {Record<string, any>} cfg
 */
export function shouldEnableRuntimePerfProbe(cfg) {
    if (cfg && cfg.perfProbe === true) return true;
    try {
        return typeof globalThis.location?.search === "string" &&
            new URLSearchParams(globalThis.location.search).has("perfProbe");
    } catch {
        return false;
    }
}

/**
 * @returns {RuntimePerfCounts}
 */
function createCounts() {
    return {
        drawText: 0,
        fittedText: 0,
        buttons: 0,
        panels: 0,
        sprites: 0,
        nineSlices: 0,
        declarativeNodes: 0,
        layoutReads: 0,
        textSetCalls: 0,
        textStyleSetCalls: 0,
        textObjectsAllocated: 0,
        textObjectsReused: 0
    };
}

/**
 * @returns {RuntimePerfState}
 */
export function createRuntimePerfState() {
    return {
        enabled: true,
        frame: {
            stepMs: 0,
            drawMs: 0,
            uiMs: 0,
            totalMs: 0,
            fpsEstimate: 0
        },
        counts: createCounts(),
        topLabels: [],
        _frameStartedAt: 0,
        _stepStartedAt: 0,
        _drawStartedAt: 0,
        _uiStartedAt: 0,
        _frameDeltaMs: 0,
        _labels: new Map()
    };
}

/**
 * @param {any} state
 * @param {number} [deltaMs]
 */
export function beginRuntimePerfFrame(state, deltaMs) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled) return;
    perf.counts = createCounts();
    perf.topLabels = [];
    perf._labels.clear();
    perf._frameStartedAt = nowMs();
    perf._frameDeltaMs = Number.isFinite(Number(deltaMs)) ? Math.max(0, Number(deltaMs)) : 0;
    perf.frame.stepMs = 0;
    perf.frame.drawMs = 0;
    perf.frame.uiMs = 0;
    perf.frame.totalMs = 0;
}

/**
 * @param {any} state
 * @param {"step" | "draw" | "ui"} section
 */
export function beginRuntimePerfSection(state, section) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled) return;
    const current = nowMs();
    if (section === "step") perf._stepStartedAt = current;
    else if (section === "draw") perf._drawStartedAt = current;
    else perf._uiStartedAt = current;
}

/**
 * @param {any} state
 * @param {"step" | "draw" | "ui"} section
 */
export function endRuntimePerfSection(state, section) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled) return;
    const current = nowMs();
    if (section === "step" && perf._stepStartedAt > 0) perf.frame.stepMs += current - perf._stepStartedAt;
    else if (section === "draw" && perf._drawStartedAt > 0) perf.frame.drawMs += current - perf._drawStartedAt;
    else if (section === "ui" && perf._uiStartedAt > 0) perf.frame.uiMs += current - perf._uiStartedAt;
}

/**
 * @param {any} state
 * @param {keyof RuntimePerfCounts} key
 * @param {number} [amount]
 */
export function countRuntimePerf(state, key, amount = 1) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled || !(key in perf.counts)) return;
    perf.counts[key] += amount;
}

/**
 * @param {any} state
 * @param {unknown} text
 */
export function countRuntimeTextLabel(state, text) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled) return;
    const label = String(text ?? "").replace(/\s+/g, " ").trim();
    if (!label) return;
    const key = label.length > 48 ? `${label.slice(0, 45)}...` : label;
    perf._labels.set(key, (perf._labels.get(key) || 0) + 1);
}

/**
 * @param {any} state
 */
export function finalizeRuntimePerfFrame(state) {
    const perf = /** @type {RuntimePerfState | null | undefined} */ (state?.perf);
    if (!perf?.enabled) return;
    const elapsed = Math.max(0, nowMs() - perf._frameStartedAt);
    perf.frame.totalMs = elapsed;
    // This is frame cadence, not the reciprocal of facade CPU work.
    perf.frame.fpsEstimate = perf._frameDeltaMs > 0 ? 1000 / perf._frameDeltaMs : 0;
    perf.topLabels = Array.from(perf._labels.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([text, count]) => ({ text, count }));
}
