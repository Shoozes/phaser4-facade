// @ts-check

import { createRuntimePerfState, shouldEnableRuntimePerfProbe } from "./perf-metrics.js";

/**
 * @param {any} scene
 * @param {{ width: number, height: number, curtain?: boolean }} cfg
 */
export function createRuntimeState(scene, cfg) {
    const perf = shouldEnableRuntimePerfProbe(cfg) ? createRuntimePerfState() : null;

    return {
        scene,
        cfg,
        world: null,
        screen: null,
        worldGfx: null,
        screenGfx: null,
        inputBlocker: null,
        worldText: null,
        screenText: null,
        worldSprites: null,
        worldLayers: new Map(),
        activeWorldLayer: "world",
        activeWorldContainer: null,
        cleanup: [],
        cleanedUp: false,
        modals: [],
        instances: [],
        nextInstanceId: 1,
        currentInstance: null,
        uiButtons: new Map(),
        frameId: 0,
        currentTime: 0,
        deltaMs: 0,
        layout: {
            x: 0,
            y: 0,
            scale: 1,
            roomWidth: cfg.width,
            roomHeight: cfg.height,
            profile: "fixed",
            orientation: "portrait"
        },
        render: {
            cssWidth: 0,
            cssHeight: 0,
            width: 0,
            height: 0,
            resolution: 1
        },
        draw: {
            color: 0xffffff,
            alpha: 1,
            lineWidth: 1,
            font: "sans-serif",
            size: 24,
            bold: false,
            halign: "left",
            valign: "top"
        },
        mouse: {
            x: 0,
            y: 0,
            screenX: 0,
            screenY: 0,
            down: Object.create(null),
            pressed: Object.create(null),
            released: Object.create(null)
        },
        inputGate: {
            pausedUntil: 0,
            capturedPointers: Object.create(null),
            transitions: 0
        },
        keysDown: Object.create(null),
        keysPressed: Object.create(null),
        keysReleased: Object.create(null),
        curtain: {
            alpha: cfg.curtain ? 1 : 0,
            visible: !!cfg.curtain,
            tweening: false
        },
        perf
    };
}
