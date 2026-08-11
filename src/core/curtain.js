// @ts-check

/**
 * @typedef {{
 *   curtain: { visible: boolean, alpha: number, tweening: boolean },
 *   draw: { alpha: number, color: unknown, size: unknown, bold: unknown, halign: unknown, valign: unknown }
 * }} CurtainState
 *
 * @typedef {{
 *   display_width: number,
 *   display_height: number,
 *   mouse_check_button_pressed: (button: unknown) => boolean,
 *   mouse_check_button_pressed_raw?: (button: unknown) => boolean,
 *   draw_set_alpha: (alpha: number) => unknown,
 *   draw_set_color: (color: unknown) => unknown,
 *   draw_gui_rectangle: (x1: number, y1: number, x2: number, y2: number, outline: boolean) => unknown,
 *   draw_set_font: (font: string, size: number, bold: boolean) => unknown,
 *   draw_set_halign: (align: unknown) => unknown,
 *   draw_set_valign: (align: unknown) => unknown,
 *   draw_gui_text: (x: number, y: number, text: unknown) => unknown
 * }} CurtainApi
 *
 * @typedef {{
 *   tweens: {
 *     add: (config: {
 *       targets: { visible: boolean, alpha: number, tweening: boolean },
 *       alpha: number,
 *       duration: number,
 *       ease: string,
 *       onComplete?: () => void
 *     }) => unknown
 *   }
 * }} CurtainScene
 */

/**
 * @param {unknown} text
 * @param {unknown} fadeMs
 * @param {CurtainState} state
 * @param {CurtainApi} api
 * @param {CurtainScene} scene
 * @param {{ curtainFadeMs: number, curtainText: string }} cfg
 * @param {(value: unknown, fallback: number, min: number) => number} normalizeDelayMs
 * @param {Record<string, unknown>} COLORS
 * @param {Record<string, unknown>} ALIGN
 * @param {Record<string, unknown>} INPUT
 */
export function curtain(text, fadeMs, state, api, scene, cfg, normalizeDelayMs, COLORS, ALIGN, INPUT) {
    if (!state.curtain.visible && state.curtain.alpha <= 0) return false;

    const pressed = typeof api.mouse_check_button_pressed_raw === "function"
        ? api.mouse_check_button_pressed_raw(INPUT.mb_left)
        : api.mouse_check_button_pressed(INPUT.mb_left);
    if (pressed) {
        dismissCurtain(state, scene, fadeMs, cfg, normalizeDelayMs);
    }

    if (state.curtain.alpha > 0) {
        const previousAlpha = state.draw.alpha;
        const previousColor = state.draw.color;
        const previousSize = state.draw.size;
        const previousBold = state.draw.bold;
        const previousHalign = state.draw.halign;
        const previousValign = state.draw.valign;

        api.draw_set_alpha(state.curtain.alpha);
        api.draw_set_color(COLORS.c_black);
        api.draw_gui_rectangle(0, 0, api.display_width, api.display_height, false);

        api.draw_set_color(COLORS.c_white);
        api.draw_set_font("sans-serif", 40, true);
        api.draw_set_halign(ALIGN.fa_center);
        api.draw_set_valign(ALIGN.fa_middle);
        api.draw_gui_text(api.display_width / 2, api.display_height / 2, text || cfg.curtainText);

        state.draw.alpha = previousAlpha;
        state.draw.color = previousColor;
        state.draw.size = previousSize;
        state.draw.bold = previousBold;
        state.draw.halign = previousHalign;
        state.draw.valign = previousValign;
    }

    return state.curtain.visible;
}

/**
 * Start the curtain dismissal before gameplay step code runs. The draw pass
 * still owns the visual overlay; this helper only consumes the transition.
 * @param {CurtainState} state
 * @param {CurtainScene} scene
 * @param {unknown} fadeMs
 * @param {{ curtainFadeMs: number }} cfg
 * @param {(value: unknown, fallback: number, min: number) => number} normalizeDelayMs
 */
export function dismissCurtain(state, scene, fadeMs, cfg, normalizeDelayMs) {
    if (!state.curtain.visible || state.curtain.tweening) return false;
    state.curtain.tweening = true;
    scene.tweens.add({
        targets: state.curtain,
        alpha: 0,
        duration: normalizeDelayMs(fadeMs, cfg.curtainFadeMs, 0),
        ease: "Linear",
        onComplete: () => {
            state.curtain.visible = false;
            state.curtain.tweening = false;
        }
    });
    return true;
}

/**
 * @param {CurtainState} state
 */
export function curtain_active(state) {
    return state.curtain.visible && state.curtain.alpha > 0;
}
