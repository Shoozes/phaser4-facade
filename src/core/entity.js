// @ts-check

import { ALARM_COUNT } from "./constants.js";

const INSTANCE_OWNER = Symbol("gm-phaser4.instance-owner");
const PROTECTED_CREATE_KEYS = new Set([
    "id",
    "object_index",
    "__active",
    "__alarmSetFrame",
    "layer",
    "layerDepth"
]);
const BLOCKED_CREATE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * @param {any} state
 * @param {any} target
 */
function isOwnedRuntimeInstance(state, target) {
    return Boolean(
        target &&
        (typeof target === "object" || typeof target === "function") &&
        state.instances.includes(target) &&
        target[INSTANCE_OWNER] === state.instanceOwner
    );
}

/**
 * @param {any} instance
 * @param {Record<string, unknown>} createVars
 */
function applyCreateVars(instance, createVars) {
    for (const key of Object.keys(createVars)) {
        if (PROTECTED_CREATE_KEYS.has(key) || BLOCKED_CREATE_KEYS.has(key)) continue;
        Object.defineProperty(instance, key, {
            configurable: true,
            enumerable: true,
            value: createVars[key],
            writable: true
        });
    }
}

/**
 * @param {any} state
 * @param {any} api
 * @param {any} inst
 */
export function stepRuntimeAlarms(state, api, inst) {
    if (!inst.alarm) return;
    for (let i = 0; i < ALARM_COUNT; i += 1) {
        const current = Number(inst.alarm[i]);
        if (!Number.isFinite(current) || current < 0) continue;
        const setFrame = inst.__alarmSetFrame && inst.__alarmSetFrame[i] !== undefined ? inst.__alarmSetFrame[i] : -1;
        if (setFrame === state.stepFrame) continue;
        if (current > 0) inst.alarm[i] = current - 1;
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
    try {
        for (const inst of snapshot) {
            if (!inst.__active) continue;
            state.currentInstance = inst;
            // GameMaker alarms are evaluated at the start of an instance step.
            stepRuntimeAlarms(state, api, inst);
            if (!inst.__active) continue;
            if (typeof inst.step === "function") inst.step.call(inst, api);
        }
    } finally {
        state.currentInstance = null;
        state.instances = state.instances.filter((/** @type {any} */ inst) => inst.__active);
    }
}

/**
 * @param {any} state
 * @param {any} api
 */
export function drawRuntimeInstances(state, api) {
    const snapshot = state.instances.slice();
    const previousLayer = state.activeWorldLayer || "world";
    try {
        for (const inst of snapshot) {
            if (!inst.__active || inst.visible === false) continue;
            const layerName = inst.layer || "Instances";
            const depth = Number.isFinite(Number(inst.layerDepth))
                ? Number(inst.layerDepth)
                : (state.layerRegistry instanceof Map && state.layerRegistry.has(layerName)
                    ? state.layerRegistry.get(layerName)
                    : undefined);
            if (typeof api.render_layer === "function") api.render_layer(layerName, depth);
            state.currentInstance = inst;
            try {
                if (typeof inst.draw === "function") inst.draw.call(inst, api);
            } finally {
                state.currentInstance = null;
                if (typeof api.render_layer === "function") api.render_layer(previousLayer);
            }
        }
    } finally {
        state.currentInstance = null;
        if (typeof api.render_layer === "function" && state.activeWorldLayer !== previousLayer) {
            api.render_layer(previousLayer);
        }
    }
}

/**
 * @param {any} state
 * @param {any} api
 * @param {number} x
 * @param {number} y
 * @param {string} layer
 * @param {any} objectDef
 * @param {Record<string, unknown> | null | undefined} [createVars]
 */
export function createRuntimeInstance(state, api, x, y, layer, objectDef, createVars) {
    const source = objectDef || {};
    const inst = Object.assign({}, source);
    Object.defineProperty(inst, INSTANCE_OWNER, {
        configurable: false,
        enumerable: false,
        value: state.instanceOwner,
        writable: false
    });
    inst.id = state.nextInstanceId++;
    inst.object_index = objectDef;
    inst.x = x;
    inst.y = y;
    const layerName = layer || "Instances";
    if (state.layerRegistry instanceof Map && state.layerRegistry.size > 0 && !state.layerRegistry.has(layerName)) {
        // Unknown names are still allowed, but registered depths are applied when known.
    }
    inst.layer = layerName;
    if (state.layerRegistry instanceof Map && state.layerRegistry.has(layerName)) {
        inst.layerDepth = state.layerRegistry.get(layerName);
    }
    inst.visible = inst.visible !== false;
    inst.__active = true;
    inst.__alarmSetFrame = Array(ALARM_COUNT).fill(-1);
    const sourceAlarm = Array.isArray(inst.alarm) ? inst.alarm : [];
    inst.alarm = Array.from({ length: ALARM_COUNT }, (_, index) => {
        const value = Number(sourceAlarm[index]);
        return Number.isFinite(value) ? value : -1;
    });

    // GameMaker creation structs are applied before the Create event.
    if (createVars && typeof createVars === "object") {
        applyCreateVars(inst, createVars);
    }

    state.instances.push(inst);

    state.currentInstance = inst;
    try {
        if (typeof inst.create === "function") inst.create.call(inst, api);
    } catch (error) {
        inst.__active = false;
        state.instances = state.instances.filter((/** @type {any} */ item) => item !== inst);
        throw error;
    } finally {
        state.currentInstance = null;
    }

    return inst;
}

/**
 * @param {any} state
 * @param {any} api
 * @param {any} inst
 */
export function destroyRuntimeInstance(state, api, inst) {
    const target = inst || state.currentInstance;
    if (!isOwnedRuntimeInstance(state, target)) return;
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
    if (isOwnedRuntimeInstance(state, target)) return !!target.__active;
    if (typeof target === "object" && target.__active !== undefined) return false;
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
    const numericIndex = Number(index);
    if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= ALARM_COUNT) return;
    const numericFrames = Number(frames);
    const nextFrames = Number.isFinite(numericFrames) && numericFrames >= 0
        ? Math.round(numericFrames)
        : -1;
    if (!Array.isArray(target.alarm) || target.alarm.length !== ALARM_COUNT) {
        target.alarm = Array.from({ length: ALARM_COUNT }, (_, alarmIndex) => Number(target.alarm?.[alarmIndex]) || -1);
    }
    target.alarm[numericIndex] = nextFrames;
    target.__alarmSetFrame = Array.isArray(target.__alarmSetFrame) && target.__alarmSetFrame.length === ALARM_COUNT
        ? target.__alarmSetFrame
        : Array(ALARM_COUNT).fill(-1);
    target.__alarmSetFrame[numericIndex] = state.stepFrame || 0;
}
