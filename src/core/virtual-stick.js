// @ts-check

/**
 * @typedef {{ x: number, y: number }} StickPoint
 * @typedef {{
 *   capturePointer: (id: string, owner: string) => unknown,
 *   releasePointer: (id: string, owner: string) => unknown
 * }} VirtualStickPointerApi
 * @typedef {{
 *   mode?: "fixed" | "floating",
 *   origin?: { x?: unknown, y?: unknown },
 *   maxRadius?: unknown,
 *   deadzone?: unknown
 * }} VirtualStickOptions
 */

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {string} label
 */
function stickFiniteOr(value, fallback, label) {
    if (value === undefined || value === null || value === "") return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new TypeError(`GM.input virtual stick ${label} must be finite.`);
    return numeric;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {string} label
 */
function stickPositiveOr(value, fallback, label) {
    const numeric = stickFiniteOr(value, fallback, label);
    if (numeric <= 0) throw new RangeError(`GM.input virtual stick ${label} must be positive.`);
    return numeric;
}

/**
 * @param {unknown} pointerId
 */
function stickPointerKey(pointerId) {
    const key = String(pointerId ?? "").trim();
    if (!key) throw new TypeError("GM.input virtual stick pointer id must be non-empty.");
    return key;
}

/**
 * @param {VirtualStickOptions | undefined} options
 * @param {VirtualStickPointerApi} pointerApi
 */
export function createVirtualStick(options = {}, pointerApi) {
    if (!pointerApi || typeof pointerApi.capturePointer !== "function" || typeof pointerApi.releasePointer !== "function") {
        throw new TypeError("GM.input virtual stick requires pointer capture callbacks.");
    }

    const mode = options.mode === "floating" ? "floating" : "fixed";
    const fixedOrigin = {
        x: stickFiniteOr(options.origin?.x, 0, "origin.x"),
        y: stickFiniteOr(options.origin?.y, 0, "origin.y")
    };
    const maxRadius = stickPositiveOr(options.maxRadius, 96, "maxRadius");
    const deadzone = Math.min(0.99, Math.max(0, stickFiniteOr(options.deadzone, 0.12, "deadzone")));
    /** @type {{ active: boolean, pointerId: string | null, origin: StickPoint, position: StickPoint, vector: StickPoint, distance: number, magnitude: number, angle: number }} */
    const state = {
        active: false,
        pointerId: null,
        origin: { ...fixedOrigin },
        position: { ...fixedOrigin },
        vector: { x: 0, y: 0 },
        distance: 0,
        magnitude: 0,
        angle: 0
    };

    function clearVector() {
        state.position = { ...state.origin };
        state.vector = { x: 0, y: 0 };
        state.distance = 0;
        state.magnitude = 0;
        state.angle = 0;
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    function updateVector(x, y) {
        const dx = x - state.origin.x;
        const dy = y - state.origin.y;
        const distance = Math.hypot(dx, dy);
        const normalizedDistance = Math.min(1, distance / maxRadius);
        const magnitude = normalizedDistance <= deadzone
            ? 0
            : (normalizedDistance - deadzone) / (1 - deadzone);
        const directionX = distance > 0 ? dx / distance : 0;
        const directionY = distance > 0 ? dy / distance : 0;

        state.position = { x, y };
        state.distance = distance;
        state.magnitude = magnitude;
        state.vector = {
            x: directionX * magnitude,
            y: directionY * magnitude
        };
        state.angle = magnitude > 0 ? Math.atan2(state.vector.y, state.vector.x) : 0;
    }

    /**
     * @param {unknown} pointerId
     * @param {unknown} x
     * @param {unknown} y
     */
    function move(pointerId, x, y) {
        const key = stickPointerKey(pointerId);
        if (!state.active || state.pointerId !== key) return stick;
        updateVector(stickFiniteOr(x, 0, "x"), stickFiniteOr(y, 0, "y"));
        return stick;
    }

    const stick = {
        get active() { return state.active; },
        get pointerId() { return state.pointerId; },
        get mode() { return mode; },
        get origin() { return { ...state.origin }; },
        get position() { return { ...state.position }; },
        get vector() { return { ...state.vector }; },
        get distance() { return state.distance; },
        get magnitude() { return state.magnitude; },
        get angle() { return state.angle; },

        /**
         * @param {unknown} pointerId
         * @param {unknown} x
         * @param {unknown} y
         */
        press(pointerId, x, y) {
            const key = stickPointerKey(pointerId);
            if (state.active) return move(key, x, y);
            const position = {
                x: stickFiniteOr(x, 0, "x"),
                y: stickFiniteOr(y, 0, "y")
            };
            if (mode === "floating") state.origin = { ...position };
            else state.origin = { ...fixedOrigin };
            pointerApi.capturePointer(key, "joystick");
            state.active = true;
            state.pointerId = key;
            updateVector(position.x, position.y);
            return stick;
        },

        move,

        /**
         * @param {unknown} [pointerId]
         */
        release(pointerId) {
            if (!state.active) return stick;
            if (pointerId !== undefined && pointerId !== null && stickPointerKey(pointerId) !== state.pointerId) return stick;
            const owner = state.pointerId;
            if (owner) pointerApi.releasePointer(owner, "joystick");
            state.active = false;
            state.pointerId = null;
            clearVector();
            return stick;
        },

        /**
         * @param {unknown} [pointerId]
         */
        cancel(pointerId) {
            return stick.release(pointerId);
        },

        reset() {
            return stick.release();
        }
    };

    return stick;
}
