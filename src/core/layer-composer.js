// @ts-check

/** @typedef {{ name: string, order?: number, enabled?: boolean | (() => boolean), input?: Function, step?: Function, draw?: Function, layout?: Function, destroy?: Function }} LayerDefinition */

/** @param {string} phase @param {LayerDefinition} plane @param {unknown} error */
function callbackError(phase, plane, error) {
    const detail = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(`GM.layer.compose ${phase} failed for plane "${plane.name}": ${detail}`);
    /** @type {any} */ (wrapped).cause = error;
    return wrapped;
}

/** @param {LayerDefinition[]} definitions */
export function createLayerComposer(definitions) {
    if (!Array.isArray(definitions) || definitions.length === 0) {
        throw new TypeError("GM.layer.compose requires a non-empty definition array.");
    }

    const planes = definitions.map((definition, index) => {
        if (!definition || typeof definition !== "object") {
            throw new TypeError(`GM.layer.compose definition ${index} must be an object.`);
        }
        const name = String(definition.name || "").trim();
        if (!name) throw new TypeError(`GM.layer.compose definition ${index} needs a name.`);
        const order = definition.order === undefined ? index : Number(definition.order);
        if (!Number.isFinite(order)) throw new TypeError(`GM.layer.compose plane "${name}" order must be finite.`);
        return { ...definition, name, order, index };
    }).sort((a, b) => a.order - b.order || a.index - b.index);

    const names = new Set();
    for (const plane of planes) {
        if (names.has(plane.name)) throw new TypeError(`GM.layer.compose plane names must be unique: ${plane.name}.`);
        names.add(plane.name);
    }

    let destroyed = false;
    /** @param {LayerDefinition & { name: string }} plane @param {string} phase */
    function isEnabled(plane, phase) {
        try {
            return typeof plane.enabled === "function" ? plane.enabled() : plane.enabled !== false;
        } catch (error) {
            throw callbackError(`${phase}:enabled`, plane, error);
        }
    }

    /** @param {string} phase @param {LayerDefinition & { name: string }} plane @param {Function} callback @param {unknown[]} args */
    function invoke(phase, plane, callback, args) {
        try {
            callback(...args);
        } catch (error) {
            throw callbackError(phase, plane, error);
        }
    }

    const composer = {
        get planes() {
            return planes.map(({ name, order }) => Object.freeze({ name, order }));
        },
        /** @param {unknown} pointer @param {number} deltaSeconds */
        input(pointer, deltaSeconds) {
            if (destroyed) return false;
            for (let index = planes.length - 1; index >= 0; index -= 1) {
                const plane = planes[index];
                if (isEnabled(plane, "input") && typeof plane.input === "function" && plane.input(pointer, deltaSeconds) === true) return true;
            }
            return false;
        },
        /** @param {number} deltaSeconds */
        step(deltaSeconds) {
            if (!destroyed) for (const plane of planes) if (isEnabled(plane, "step") && typeof plane.step === "function") invoke("step", plane, plane.step, [deltaSeconds]);
            return composer;
        },
        /** @param {...unknown} args */
        draw(...args) {
            if (!destroyed) for (const plane of planes) if (isEnabled(plane, "draw") && typeof plane.draw === "function") invoke("draw", plane, plane.draw, args);
            return composer;
        },
        /** @param {...unknown} args */
        layout(...args) {
            if (!destroyed) for (const plane of planes) if (isEnabled(plane, "layout") && typeof plane.layout === "function") invoke("layout", plane, plane.layout, args);
            return composer;
        },
        destroy() {
            if (destroyed) return false;
            destroyed = true;
            let firstError = null;
            for (let index = planes.length - 1; index >= 0; index -= 1) {
                const plane = planes[index];
                if (typeof plane.destroy !== "function") continue;
                try {
                    plane.destroy();
                } catch (error) {
                    if (!firstError) firstError = callbackError("destroy", plane, error);
                }
            }
            if (firstError) throw firstError;
            return true;
        }
    };
    return composer;
}
