// @ts-check

const ACCESSOR_NAMES = [
    "room_width", "room_height", "display_width", "display_height",
    "mouse_x", "mouse_y", "current_time", "delta_time", "delta_sec"
];

/**
 * @param {Record<string, unknown>} target
 * @param {{ _active?: Record<string, unknown> | null }} GM
 */
function installGlobalAccessors(target, GM) {
    /** @type {Record<string, () => unknown>} */
    const getters = {
        room_width: () => GM._active ? GM._active.room_width : 0,
        room_height: () => GM._active ? GM._active.room_height : 0,
        display_width: () => GM._active ? GM._active.display_width : 0,
        display_height: () => GM._active ? GM._active.display_height : 0,
        mouse_x: () => GM._active ? GM._active.mouse_x : 0,
        mouse_y: () => GM._active ? GM._active.mouse_y : 0,
        current_time: () => GM._active ? GM._active.current_time : 0,
        delta_time: () => GM._active ? GM._active.delta_time : 0,
        delta_sec: () => GM._active ? GM._active.delta_sec : 0
    };

    for (const [name, getter] of Object.entries(getters)) {
        Object.defineProperty(target, name, {
            configurable: true,
            get: getter
        });
    }
}

/**
 * @param {{
 *   root: Record<string, unknown>,
 *   GM: { _globalsInstalled?: boolean, _globalsDisposer?: (() => void) | null, _active?: Record<string, unknown> | null },
 *   COLORS: Record<string, unknown>,
 *   ALIGN: Record<string, unknown>,
 *   INPUT: Record<string, unknown>,
 *   math: Record<string, Function>,
 *   active: () => Record<string, Function>
 * }} deps
 */
export function createLegacyGlobalInstaller(deps) {
    const {
        root,
        GM,
        COLORS,
        ALIGN,
        INPUT,
        math,
        active
    } = deps;

    return function installGlobals() {
        if (GM._globalsInstalled) return GM._globalsDisposer || (() => {});
        GM._globalsInstalled = true;

        const values = Object.assign({}, COLORS, ALIGN, INPUT, {
            clamp: math.clamp,
            lerp: math.lerp,
            choose: math.choose,
            random: math.random,
            random_range: math.random_range,
            irandom: math.irandom,
            irandom_range: math.irandom_range,
            degtorad: math.degtorad,
            radtodeg: math.radtodeg,
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            abs: Math.abs,
            floor: Math.floor,
            ceil: Math.ceil,
            round: Math.round,
            sqrt: Math.sqrt,
            dsin: math.dsin,
            dcos: math.dcos,
            dtan: math.dtan,
            point_distance: math.point_distance,
            point_direction: math.point_direction,
            lengthdir_x: math.lengthdir_x,
            lengthdir_y: math.lengthdir_y,
            point_in_rectangle: math.point_in_rectangle,
            /** @param {unknown} value */
            ord: (value) => String(value || "").toUpperCase().charCodeAt(0),

            load_sprite: function () { return active().load_sprite.apply(null, arguments); },
            load_sound: function () { return active().load_sound.apply(null, arguments); },
            load_spritesheet: function () { return active().load_spritesheet.apply(null, arguments); },

            draw_set_color: function () { return active().draw_set_color.apply(null, arguments); },
            draw_set_alpha: function () { return active().draw_set_alpha.apply(null, arguments); },
            draw_set_line_width: function () { return active().draw_set_line_width.apply(null, arguments); },
            draw_set_font: function () { return active().draw_set_font.apply(null, arguments); },
            draw_set_halign: function () { return active().draw_set_halign.apply(null, arguments); },
            draw_set_valign: function () { return active().draw_set_valign.apply(null, arguments); },
            draw_rectangle: function () { return active().draw_rectangle.apply(null, arguments); },
            draw_roundrect: function () { return active().draw_roundrect.apply(null, arguments); },
            draw_circle: function () { return active().draw_circle.apply(null, arguments); },
            draw_line: function () { return active().draw_line.apply(null, arguments); },
            draw_text: function () { return active().draw_text.apply(null, arguments); },
            draw_gui_rectangle: function () { return active().draw_gui_rectangle.apply(null, arguments); },
            draw_gui_text: function () { return active().draw_gui_text.apply(null, arguments); },
            draw_sprite: function () { return active().draw_sprite.apply(null, arguments); },
            draw_sprite_ext: function () { return active().draw_sprite_ext.apply(null, arguments); },

            button: function () { return active().button.apply(null, arguments); },
            button_center: function () { return active().button_center.apply(null, arguments); },
            nineslice_window: function () { return active().nineslice_window.apply(null, arguments); },
            modal_notice: function () { return active().modal_notice.apply(null, arguments); },
            modal_close_all: function () { return active().modal_close_all.apply(null, arguments); },
            ui_set_theme: function () { return active().ui_set_theme.apply(null, arguments); },
            ui_get_theme: function () { return active().ui_get_theme.apply(null, arguments); },
            ui_export_textures: function () { return active().ui_export_textures.apply(null, arguments); },
            ui_download_textures: function () { return active().ui_download_textures.apply(null, arguments); },
            curtain: function () { return active().curtain.apply(null, arguments); },
            curtain_active: function () { return active().curtain_active.apply(null, arguments); },

            instance_create_layer: function () { return active().instance_create_layer.apply(null, arguments); },
            instance_destroy: function () { return active().instance_destroy.apply(null, arguments); },
            instance_exists: function () { return active().instance_exists.apply(null, arguments); },
            instance_number: function () { return active().instance_number.apply(null, arguments); },
            instance_find: function () { return active().instance_find.apply(null, arguments); },
            alarm_set: function () { return active().alarm_set.apply(null, arguments); },

            keyboard_check: function () { return active().keyboard_check.apply(null, arguments); },
            keyboard_check_pressed: function () { return active().keyboard_check_pressed.apply(null, arguments); },
            keyboard_check_released: function () { return active().keyboard_check_released.apply(null, arguments); },
            mouse_check_button: function () { return active().mouse_check_button.apply(null, arguments); },
            mouse_check_button_pressed: function () { return active().mouse_check_button_pressed.apply(null, arguments); },
            mouse_check_button_released: function () { return active().mouse_check_button_released.apply(null, arguments); },

            show_debug_message: function () { return active().show_debug_message.apply(null, arguments); },
            tween: function () { return active().tween.apply(null, arguments); },
            wait: function () { return active().wait.apply(null, arguments); },
            every: function () { return active().every.apply(null, arguments); },
            sound_play: function () { return active().sound_play.apply(null, arguments); }
        });

        const names = [...Object.keys(values), ...ACCESSOR_NAMES];
        const previousDescriptors = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(root, name)]));
        Object.assign(root, values);

        installGlobalAccessors(root, GM);
        let restored = false;
        GM._globalsDisposer = () => {
            if (restored) return;
            restored = true;
            for (const [name, descriptor] of previousDescriptors) {
                if (descriptor) Object.defineProperty(root, name, descriptor);
                else delete root[name];
            }
            GM._globalsInstalled = false;
            GM._globalsDisposer = null;
        };
        return GM._globalsDisposer;
    };
}
