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
 * Preserve cleanup failures for diagnostics without allowing one bad owner to
 * abort the rest of shutdown.
 * @param {any} state
 * @param {unknown} error
 * @param {string} phase
 * @param {string} [reason]
 */
export function recordRuntimeCleanupError(state, error, phase, reason) {
    const diagnostic = {
        phase,
        reason: reason || "cleanup",
        message: error instanceof Error ? error.message : String(error),
        error
    };
    if (Array.isArray(state.cleanupErrors)) state.cleanupErrors.push(diagnostic);
    const onCleanupError = state.cfg && state.cfg.onCleanupError;
    if (typeof onCleanupError === "function") {
        try {
            onCleanupError(diagnostic);
        } catch {
            // Diagnostics must never make teardown less safe.
        }
    }
    return diagnostic;
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
 * @param {any} target
 * @param {string} eventName
 * @param {Function} handler
 * @param {any} [options]
 */
export function onRuntimeDomEvent(state, target, eventName, handler, options) {
    if (!target || typeof target.addEventListener !== "function" || typeof handler !== "function") return handler;
    target.addEventListener(eventName, handler, options);
    addRuntimeCleanup(state, () => {
        if (typeof target.removeEventListener === "function") target.removeEventListener(eventName, handler, options);
    });
    return handler;
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
        } catch (error) {
            recordRuntimeCleanupError(state, error, "registered_cleanup", reason);
        }
    }
    return true;
}
