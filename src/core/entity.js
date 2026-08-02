// @ts-check

/**
 * @param {any} state
 * @param {any} api
 * @param {any} inst
 */
export function stepRuntimeAlarms(state, api, inst) {
    if (!inst.alarm) return;
    for (let i = 0; i < inst.alarm.length; i += 1) {
        if (inst.alarm[i] === undefined || inst.alarm[i] < 0) continue;
        const setFrame = inst.__alarmSetFrame && inst.__alarmSetFrame[i] !== undefined ? inst.__alarmSetFrame[i] : -1;
        if (setFrame === state.stepFrame) continue;
        if (inst.alarm[i] > 0) inst.alarm[i] -= 1;
        if (inst.alarm[i] === 0) {
            const fn = inst["alarm" + i];
            inst.alarm[i] = -1;
            if (typeof fn === "function") fn.call(inst, api);
        }
        if (!inst.__active) return;
    }
}

/**
 * @param {any} state
 * @param {any} api
 */
export function stepRuntimeInstances(state, api) {
    state.stepFrame = (state.stepFrame || 0) + 1;
    const snapshot = state.instances.slice();
    for (const inst of snapshot) {
        if (!inst.__active) continue;
        state.currentInstance = inst;
        if (typeof inst.step === "function") inst.step.call(inst, api);
        if (!inst.__active) continue;
        stepRuntimeAlarms(state, api, inst);
    }
    state.currentInstance = null;
    state.instances = state.instances.filter((/** @type {any} */ inst) => inst.__active);
}

/**
 * @param {any} state
 * @param {any} api
 */
export function drawRuntimeInstances(state, api) {
    const snapshot = state.instances.slice();
    for (const inst of snapshot) {
        if (!inst.__active || inst.visible === false) continue;
        state.currentInstance = inst;
        if (typeof inst.draw === "function") inst.draw.call(inst, api);
    }
    state.currentInstance = null;
}

/**
 * @param {any} state
 * @param {any} api
 * @param {number} x
 * @param {number} y
 * @param {string} layer
 * @param {any} objectDef
 */
export function createRuntimeInstance(state, api, x, y, layer, objectDef) {
    const source = objectDef || {};
    const inst = Object.assign({}, source);
    inst.id = state.nextInstanceId++;
    inst.object_index = objectDef;
    inst.x = x;
    inst.y = y;
    inst.layer = layer || "Instances";
    inst.visible = inst.visible !== false;
    inst.__active = true;
    inst.__alarmSetFrame = [];
    inst.alarm = Array.isArray(inst.alarm) ? inst.alarm.slice() : [];

    state.instances.push(inst);

    state.currentInstance = inst;
    if (typeof inst.create === "function") inst.create.call(inst, api);
    state.currentInstance = null;

    return inst;
}

/**
 * @param {any} state
 * @param {any} api
 * @param {any} inst
 */
export function destroyRuntimeInstance(state, api, inst) {
    const target = inst || state.currentInstance;
    if (!target) return;
    if (target.__active === false) return;
    target.__active = false;
    if (typeof target.destroy === "function") target.destroy.call(target, api);
}

/**
 * @param {any} state
 * @param {any} target
 */
export function runtimeInstanceExists(state, target) {
    if (!target) return false;
    if (target.__active !== undefined) return !!target.__active;
    return state.instances.some((/** @type {any} */ inst) => inst.__active && inst.object_index === target);
}

/**
 * @param {any} state
 * @param {any} objectDef
 */
export function countRuntimeInstances(state, objectDef) {
    return state.instances.filter((/** @type {any} */ inst) => inst.__active && inst.object_index === objectDef).length;
}

/**
 * @param {any} state
 * @param {any} objectDef
 * @param {number} index
 */
export function findRuntimeInstance(state, objectDef, index) {
    const found = state.instances.filter((/** @type {any} */ inst) => inst.__active && inst.object_index === objectDef);
    return found[index] || null;
}

/**
 * @param {any} state
 * @param {number} index
 * @param {number} frames
 * @param {any} inst
 */
export function setRuntimeAlarm(state, index, frames, inst) {
    const target = inst || state.currentInstance;
    if (!target) return;
    const numericFrames = Number(frames);
    const nextFrames = Number.isFinite(numericFrames) ? Math.floor(numericFrames) : -1;
    target.alarm[index] = nextFrames < 0 ? -1 : nextFrames;
    target.__alarmSetFrame = Array.isArray(target.__alarmSetFrame) ? target.__alarmSetFrame : [];
    target.__alarmSetFrame[index] = state.stepFrame || 0;
}
