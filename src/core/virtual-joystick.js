// @ts-check

import { inferPointerKind } from "./input.js";
import { createVirtualStick } from "./virtual-stick.js";

/** @typedef {{ x: number, y: number }} JoystickPoint */
/** @typedef {{ x: number, y: number, width: number, height: number }} JoystickRect */

/**
 * @typedef {{
 *   activePointers: () => any[],
 *   capturePointer: (id: string, owner: string) => unknown,
 *   releasePointer: (id: string, owner: string) => unknown,
 *   inputBlocked: () => boolean,
 *   currentTime: () => number,
 *   viewport: () => any,
 *   gui: any,
 *   register?: (joystick: VirtualJoystick) => unknown,
 *   unregister?: (joystick: VirtualJoystick) => unknown
 * }} VirtualJoystickApi
 */

/**
 * @typedef {{
 *   mode?: "fixed" | "dynamic" | "floating",
 *   id?: string,
 *   layer?: string,
 *   radius?: number,
 *   maxRadius?: number,
 *   deadzone?: number,
 *   axis?: "both" | "horizontal" | "vertical",
 *   pointerKinds?: string[],
 *   layout?: (viewport: any) => { origin?: JoystickPoint, zone?: JoystickRect },
 *   visibility?: "always" | "active",
 *   idleAlpha?: number,
 *   activeAlpha?: number,
 *   fadeInMs?: number,
 *   fadeOutMs?: number,
 *   enabled?: boolean,
 *   debug?: boolean,
 *   style?: Record<string, any>
 * }} VirtualJoystickOptions
 */

/**
 * @typedef {{
 *   active: boolean,
 *   pressed: boolean,
 *   released: boolean,
 *   pointerId: string | null,
 *   origin: JoystickPoint,
 *   pointerPosition: JoystickPoint,
 *   knobPosition: JoystickPoint,
 *   vector: JoystickPoint,
 *   magnitude: number,
 *   distance: number,
 *   clampedDistance: number,
 *   angleRad: number,
 *   directionDeg: number,
 *   opacity: number,
 *   enabled: boolean,
 *   mode: "fixed" | "dynamic",
 *   axis: "both" | "horizontal" | "vertical",
 *   layer: string,
 *   update: () => VirtualJoystick,
 *   draw: () => VirtualJoystick,
 *   reset: () => VirtualJoystick,
 *   setEnabled: (value: boolean) => VirtualJoystick,
 *   destroy: () => void
 * }} VirtualJoystick
 */

const DEFAULT_STYLE = {
    baseRadius: 48,
    baseFill: "#101827",
    baseFillAlpha: 0.34,
    baseStroke: "#dff7ff",
    baseStrokeAlpha: 0.52,
    baseStrokeWidth: 3,
    deadzoneStroke: "#8ee9ff",
    deadzoneStrokeAlpha: 0.22,
    deadzoneStrokeWidth: 2,
    knobRadius: 25,
    knobFill: "#ffffff",
    knobFillAlpha: 0.82,
    knobStroke: "#8ee9ff",
    knobStrokeAlpha: 0.9,
    knobStrokeWidth: 3,
    connector: "#ffffff",
    connectorAlpha: 0.2,
    connectorWidth: 3
};

/** @param {unknown} value @param {number} fallback */
function finiteOr(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new TypeError("GM.input virtual joystick values must be finite.");
    return numeric;
}

/** @param {unknown} value @param {number} fallback */
function alphaOr(value, fallback) {
    return Math.min(1, Math.max(0, finiteOr(value, fallback)));
}

/** @param {unknown} point @param {JoystickPoint} fallback */
function pointOr(point, fallback) {
    if (!point || typeof point !== "object") return { ...fallback };
    const raw = /** @type {{ x?: unknown, y?: unknown }} */ (point);
    return {
        x: finiteOr(raw.x, fallback.x),
        y: finiteOr(raw.y, fallback.y)
    };
}

/** @param {unknown} rect @param {JoystickRect} fallback */
function rectOr(rect, fallback) {
    if (!rect || typeof rect !== "object") return { ...fallback };
    const raw = /** @type {{ x?: unknown, y?: unknown, width?: unknown, height?: unknown }} */ (rect);
    return {
        x: finiteOr(raw.x, fallback.x),
        y: finiteOr(raw.y, fallback.y),
        width: Math.max(0, finiteOr(raw.width, fallback.width)),
        height: Math.max(0, finiteOr(raw.height, fallback.height))
    };
}

/** @param {any} viewport */
function viewportRect(viewport) {
    const source = viewport && typeof viewport === "object" ? viewport : {};
    return rectOr(source.safeScreenRect || source.screenRect, { x: 0, y: 0, width: 0, height: 0 });
}

/** @param {JoystickPoint} point @param {JoystickRect} rect */
function contains(point, rect) {
    return point.x >= rect.x && point.y >= rect.y &&
        point.x <= rect.x + rect.width && point.y <= rect.y + rect.height;
}

/** @param {any} pointer */
function pointerId(pointer) {
    return String(pointer?.id ?? pointer?.pointerId ?? "").trim();
}

/** @param {any} pointer */
function pointerPoint(pointer) {
    return {
        x: finiteOr(pointer?.screenX, finiteOr(pointer?.x, 0)),
        y: finiteOr(pointer?.screenY, finiteOr(pointer?.y, 0))
    };
}

/** @param {any} pointer */
function pointerKind(pointer) {
    return String(pointer?.kind || inferPointerKind(pointer)).toLowerCase();
}

/**
 * @param {VirtualJoystickOptions} options
 * @param {VirtualJoystickApi} deps
 * @returns {VirtualJoystick}
 */
export function createVirtualJoystick(options = {}, deps) {
    if (!deps || typeof deps.activePointers !== "function" || typeof deps.capturePointer !== "function" ||
        typeof deps.releasePointer !== "function" || typeof deps.inputBlocked !== "function" ||
        typeof deps.currentTime !== "function" || typeof deps.viewport !== "function" || !deps.gui) {
        throw new TypeError("GM.input virtual joystick requires runtime pointer, viewport, and GUI callbacks.");
    }

    const mode = options.mode === "dynamic" || options.mode === "floating" ? "dynamic" : "fixed";
    const radius = finiteOr(options.radius === undefined ? options.maxRadius : options.radius, 72);
    if (radius <= 0) throw new RangeError("GM.input virtual joystick radius must be positive.");
    const deadzone = Math.min(0.99, Math.max(0, finiteOr(options.deadzone, 0.14)));
    const axis = options.axis === "horizontal" || options.axis === "vertical" ? options.axis : "both";
    const pointerKinds = new Set((Array.isArray(options.pointerKinds) ? options.pointerKinds : ["touch", "pen", "mouse"])
        .map((kind) => String(kind).toLowerCase())
        .filter(Boolean));
    if (pointerKinds.size === 0) throw new TypeError("GM.input virtual joystick pointerKinds cannot be empty.");
    const layer = String(options.layer || "controls").trim().toLowerCase() || "controls";
    const activeOnly = options.visibility === "active";
    const idleAlpha = alphaOr(options.idleAlpha, 0.26);
    const activeAlpha = alphaOr(options.activeAlpha, 0.82);
    const fadeInMs = Math.max(0, finiteOr(options.fadeInMs, 90));
    const fadeOutMs = Math.max(0, finiteOr(options.fadeOutMs, 150));
    const style = Object.assign({}, DEFAULT_STYLE, options.style || {});
    const defaultRect = viewportRect(deps.viewport());
    let layoutOrigin = {
        x: defaultRect.x + Math.min(defaultRect.width / 2, radius + 24),
        y: defaultRect.y + Math.max(0, defaultRect.height - radius - 24)
    };
    let activationZone = defaultRect;
    /** @type {any} */
    let layoutViewport;
    let destroyed = false;
    let enabled = options.enabled !== false;
    let pressed = false;
    let released = false;
    let targetOpacity = activeOnly ? 0 : idleAlpha;
    let opacity = targetOpacity;
    let fadeStartTime = 0;
    let fadeStartOpacity = opacity;

    const stick = createVirtualStick({
        mode: mode === "dynamic" ? "floating" : "fixed",
        origin: layoutOrigin,
        maxRadius: radius,
        deadzone,
        axis
    }, {
        capturePointer: deps.capturePointer,
        releasePointer: deps.releasePointer
    });

    function refreshLayout() {
        const snapshot = deps.viewport();
        if (snapshot === layoutViewport) return;
        layoutViewport = snapshot;
        const safe = viewportRect(snapshot);
        const supplied = typeof options.layout === "function" ? options.layout(snapshot) || {} : {};
        const nextOrigin = pointOr(supplied.origin, {
            x: safe.x + Math.min(safe.width / 2, radius + 24),
            y: safe.y + Math.max(0, safe.height - radius - 24)
        });
        const nextZone = rectOr(supplied.zone, mode === "dynamic"
            ? safe
            : {
                x: safe.x,
                y: safe.y,
                width: safe.width * 0.55,
                height: safe.height
            });
        layoutOrigin = nextOrigin;
        activationZone = nextZone;
        stick.setOrigin(nextOrigin.x, nextOrigin.y);
    }

    /** @param {number} now */
    function advanceFade(now) {
        const current = Number.isFinite(now) ? now : 0;
        if (opacity === targetOpacity) return;
        const elapsed = Math.max(0, current - fadeStartTime);
        const duration = targetOpacity > opacity ? fadeInMs : fadeOutMs;
        if (duration <= 0) {
            opacity = targetOpacity;
            return;
        }
        const amount = Math.min(1, elapsed / duration);
        opacity = fadeStartOpacity + (targetOpacity - fadeStartOpacity) * amount;
        if (amount >= 1) opacity = targetOpacity;
    }

    /** @param {number} now */
    function updateTargetOpacity(now) {
        const nextTarget = stick.active && enabled
            ? activeAlpha
            : activeOnly ? 0 : idleAlpha;
        if (nextTarget === targetOpacity) return;
        advanceFade(now);
        targetOpacity = nextTarget;
        fadeStartOpacity = opacity;
        fadeStartTime = Number.isFinite(now) ? now : 0;
        if ((targetOpacity > opacity ? fadeInMs : fadeOutMs) <= 0) opacity = targetOpacity;
    }

    function releaseOwned() {
        if (!stick.active) return;
        stick.release();
        released = true;
    }

    function update() {
        if (destroyed) return joystick;
        pressed = false;
        released = false;
        refreshLayout();
        const pointers = deps.activePointers().filter(Boolean);
        const ownId = stick.pointerId;

        if (!enabled || deps.inputBlocked()) {
            releaseOwned();
            const now = Number(deps.currentTime());
            updateTargetOpacity(now);
            advanceFade(now);
            return joystick;
        }

        if (ownId) {
            const owned = pointers.find((pointer) => pointerId(pointer) === ownId);
            if (!owned || owned.active === false || owned.released || !owned.down ||
                (owned.owner && owned.owner !== "joystick")) {
                releaseOwned();
            } else {
                const point = pointerPoint(owned);
                stick.move(ownId, point.x, point.y);
            }
        }

        if (!stick.active) {
            const candidate = pointers.find((pointer) => {
                if (pointer.active === false || !pointer.down || pointer.pressed !== true) return false;
                const id = pointerId(pointer);
                if (!id || !pointerKinds.has(pointerKind(pointer))) return false;
                if (pointer.owner) return false;
                return contains(pointerPoint(pointer), activationZone);
            });
            if (candidate) {
                const id = pointerId(candidate);
                const point = pointerPoint(candidate);
                stick.press(id, point.x, point.y);
                pressed = true;
            }
        }

        const now = Number(deps.currentTime());
        updateTargetOpacity(now);
        advanceFade(now);
        return joystick;
    }

    function draw() {
        if (destroyed) return joystick;
        refreshLayout();
        advanceFade(Number(deps.currentTime()));
        if (opacity <= 0.0001) return joystick;
        const gui = deps.gui;
        gui.layer(layer);
        const origin = stick.origin;
        const pointer = stick.position;
        const distance = Math.hypot(pointer.x - origin.x, pointer.y - origin.y);
        const clamped = Math.min(radius, distance);
        const knob = distance > 0
            ? {
                x: origin.x + ((pointer.x - origin.x) / distance) * clamped,
                y: origin.y + ((pointer.y - origin.y) / distance) * clamped
            }
            : { ...origin };
        const alpha = (/** @type {number} */ value) => opacity * alphaOr(value, 1);
        gui.circle(origin.x, origin.y, style.baseRadius, {
            color: style.baseFill,
            alpha: alpha(style.baseFillAlpha)
        });
        gui.circle(origin.x, origin.y, style.baseRadius, {
            color: style.baseStroke,
            alpha: alpha(style.baseStrokeAlpha),
            outline: true,
            lineWidth: style.baseStrokeWidth
        });
        gui.circle(origin.x, origin.y, radius * deadzone, {
            color: style.deadzoneStroke,
            alpha: alpha(style.deadzoneStrokeAlpha),
            outline: true,
            lineWidth: style.deadzoneStrokeWidth
        });
        if (stick.active && distance > 0) {
            gui.line(origin.x, origin.y, knob.x, knob.y, {
                color: style.connector,
                alpha: alpha(style.connectorAlpha),
                lineWidth: style.connectorWidth
            });
        }
        gui.circle(knob.x, knob.y, style.knobRadius, {
            color: style.knobFill,
            alpha: alpha(style.knobFillAlpha)
        });
        gui.circle(knob.x, knob.y, style.knobRadius, {
            color: style.knobStroke,
            alpha: alpha(style.knobStrokeAlpha),
            outline: true,
            lineWidth: style.knobStrokeWidth
        });
        if (options.debug === true) {
            gui.circle(origin.x, origin.y, radius, {
                color: style.deadzoneStroke,
                alpha: alpha(0.16),
                outline: true,
                lineWidth: 1
            });
        }
        return joystick;
    }

    /** @type {VirtualJoystick} */
    const joystick = {
        get active() { return stick.active; },
        get pressed() { return pressed; },
        get released() { return released; },
        get pointerId() { return stick.pointerId; },
        get origin() { return stick.origin; },
        get pointerPosition() { return stick.position; },
        get knobPosition() {
            const origin = stick.origin;
            const point = stick.position;
            const dx = point.x - origin.x;
            const dy = point.y - origin.y;
            const distance = Math.hypot(dx, dy);
            const clamped = Math.min(radius, distance);
            return distance > 0
                ? { x: origin.x + dx / distance * clamped, y: origin.y + dy / distance * clamped }
                : { ...origin };
        },
        get vector() { return stick.vector; },
        get magnitude() { return stick.magnitude; },
        get distance() {
            const point = stick.position;
            const origin = stick.origin;
            return Math.hypot(point.x - origin.x, point.y - origin.y);
        },
        get clampedDistance() { return Math.min(radius, joystick.distance); },
        get angleRad() {
            const vector = stick.vector;
            return vector.x || vector.y ? Math.atan2(-vector.y, vector.x) : 0;
        },
        get directionDeg() {
            const angle = joystick.angleRad * 180 / Math.PI;
            return angle === 0 ? 0 : angle < 0 ? angle + 360 : angle;
        },
        get opacity() { return opacity; },
        get enabled() { return enabled; },
        get mode() { return mode; },
        get axis() { return axis; },
        get layer() { return layer; },
        update,
        draw,
        reset() {
            if (destroyed) return joystick;
            releaseOwned();
            pressed = false;
            updateTargetOpacity(Number(deps.currentTime()));
            return joystick;
        },
        setEnabled(/** @type {boolean} */ value) {
            enabled = Boolean(value);
            if (!enabled) releaseOwned();
            updateTargetOpacity(Number(deps.currentTime()));
            return joystick;
        },
        destroy() {
            if (destroyed) return;
            releaseOwned();
            destroyed = true;
            if (typeof deps.unregister === "function") deps.unregister(joystick);
        }
    };

    if (typeof deps.register === "function") deps.register(joystick);
    return /** @type {VirtualJoystick} */ (joystick);
}
