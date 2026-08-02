// @ts-check

/**
 * @param {any} state
 * @param {(reason?: string) => void} fn
 */
export function addRuntimeCleanup(state, fn) {
    if (typeof fn === "function") state.cleanup.push(fn);
    return fn;
}

/**
 * @param {any} state
 * @param {any} emitter
 * @param {string} eventName
 * @param {Function} handler
 */
export function onRuntimeEvent(state, emitter, eventName, handler) {
    if (!emitter || typeof emitter.on !== "function" || typeof handler !== "function") return handler;
    emitter.on(eventName, handler);
    addRuntimeCleanup(state, () => {
        if (typeof emitter.off === "function") {
            emitter.off(eventName, handler);
        } else if (typeof emitter.removeListener === "function") {
            emitter.removeListener(eventName, handler);
        }
    });
    return handler;
}

/**
 * @param {any} state
 * @param {any} emitter
 * @param {string} eventName
 * @param {Function} handler
 */
export function onceRuntimeEvent(state, emitter, eventName, handler) {
    if (!emitter || typeof handler !== "function") return handler;
    if (typeof emitter.once === "function") {
        emitter.once(eventName, handler);
        addRuntimeCleanup(state, () => {
            if (typeof emitter.off === "function") {
                emitter.off(eventName, handler);
            } else if (typeof emitter.removeListener === "function") {
                emitter.removeListener(eventName, handler);
            }
        });
        return handler;
    }
    return onRuntimeEvent(state, emitter, eventName, handler);
}

/**
 * @param {any} state
 * @param {string} [reason]
 */
export function runRuntimeCleanup(state, reason) {
    if (state.cleanedUp) return false;
    state.cleanedUp = true;
    const callbacks = state.cleanup.slice().reverse();
    state.cleanup.length = 0;
    for (const cleanup of callbacks) {
        try {
            cleanup(reason);
        } catch {
            // Cleanup must be best-effort during scene shutdown.
        }
    }
    return true;
}
