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
    random_range
} from "./math.js";

export function createMathApi() {
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
        point_in_rectangle
    };
}
