// @ts-check

import {
    clamp,
    choose,
    degtorad,
    dsin,
    dcos,
    dtan,
    irandom,
    irandom_range,
    lengthdir_x,
    lengthdir_y,
    lerp,
    point_distance,
    point_direction,
    point_in_rectangle,
    radtodeg,
    random,
    random_range,
    setActiveRng
} from "./math.js";
import { createSeededRng } from "./rng.js";

export function createMathApi() {
    /** @type {ReturnType<typeof createSeededRng> | null} */
    let boundRng = null;

    return {
        clamp,
        lerp,
        choose,
        random,
        random_range,
        irandom,
        irandom_range,
        degtorad,
        radtodeg,
        dsin,
        dcos,
        dtan,
        point_distance,
        point_direction,
        lengthdir_x,
        lengthdir_y,
        point_in_rectangle,
        /**
         * Seed facade random helpers without replacing global Math.random.
         * @param {number | string | null | undefined} seed
         */
        setSeed(seed) {
            if (seed === null || seed === undefined) {
                boundRng = null;
                setActiveRng(null);
                return this;
            }
            boundRng = createSeededRng(/** @type {any} */ (seed));
            setActiveRng(boundRng);
            return this;
        },
        getSeedState() {
            return boundRng ? boundRng.getState() : null;
        },
        /**
         * @param {number | string} [seed]
         */
        createRng(seed) {
            return createSeededRng(/** @type {any} */ (seed));
        }
    };
}
