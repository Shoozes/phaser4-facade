// @ts-check

/**
 * @typedef {{
 *   GM: Record<string, any> & {
 *     _active?: any,
 *     _game?: any,
 *     start?: (...args: any[]) => unknown
 *   },
 *   root: { Phaser?: unknown },
 *   COLORS: Record<string, unknown>,
 *   INPUT: Record<string, unknown>,
 *   math: Record<string, unknown>,
 *   uiToolkit: {
 *     setTheme: (theme: unknown) => unknown,
 *     getTheme: () => unknown,
 *     ensureTextures: (scene: unknown, refresh?: boolean) => unknown,
 *     exportTextures: () => unknown,
 *     downloadTextures: (prefix?: unknown) => unknown
 *   },
 *   installGlobals: (...args: any[]) => unknown,
 *   active: () => any,
 *   activeOrNull: () => any,
 *   callActive: (methodName: string, args: IArguments) => unknown,
 *   defineReadonly: (target: object, propertyName: string, getter: () => unknown) => void
 * }} FacadeNamespaceDeps
 */

/**
 * @param {FacadeNamespaceDeps} deps
 */
export function installFacadeNamespaces(deps) {
    const {
        GM,
        root,
        COLORS,
        INPUT,
        math,
        uiToolkit,
        installGlobals,
        active,
        activeOrNull,
        callActive,
        defineReadonly
    } = deps;

    const color = {
        BLACK: COLORS.c_black,
        WHITE: COLORS.c_white,
        GRAY: COLORS.c_gray,
        GREY: COLORS.c_grey,
        DKGRAY: COLORS.c_dkgray,
        DKGREY: COLORS.c_dkgrey,
        LTGRAY: COLORS.c_ltgray,
        LTGREY: COLORS.c_ltgrey,
        RED: COLORS.c_red,
        GREEN: COLORS.c_green,
        LIME: COLORS.c_lime,
        BLUE: COLORS.c_blue,
        YELLOW: COLORS.c_yellow,
        ORANGE: COLORS.c_orange,
        PURPLE: COLORS.c_purple,
        AQUA: COLORS.c_aqua,
        FUCHSIA: COLORS.c_fuchsia
    };

    const key = {
        LEFT: INPUT.vk_left,
        RIGHT: INPUT.vk_right,
        UP: INPUT.vk_up,
        DOWN: INPUT.vk_down,
        SPACE: INPUT.vk_space,
        ENTER: INPUT.vk_enter,
        ESCAPE: INPUT.vk_escape,
        SHIFT: INPUT.vk_shift,
        CONTROL: INPUT.vk_control,
        ALT: INPUT.vk_alt
    };

    const pointer = {
        LEFT: INPUT.mb_left,
        RIGHT: INPUT.mb_right,
        MIDDLE: INPUT.mb_middle
    };

    const runtime = {
        get active() { return activeOrNull(); },
        get scene() { return activeOrNull() ? GM._active.scene : null; },
        get state() { return activeOrNull() ? GM._active.state : null; }
    };
    defineReadonly(runtime, "roomWidth", () => activeOrNull() ? GM._active.room_width : 0);
    defineReadonly(runtime, "roomHeight", () => activeOrNull() ? GM._active.room_height : 0);
    defineReadonly(runtime, "displayWidth", () => activeOrNull() ? GM._active.display_width : 0);
    defineReadonly(runtime, "displayHeight", () => activeOrNull() ? GM._active.display_height : 0);
    defineReadonly(runtime, "profile", () => activeOrNull() ? GM._active.layout_profile : "fixed");
    defineReadonly(runtime, "orientation", () => activeOrNull() ? GM._active.orientation : "portrait");
    defineReadonly(runtime, "scale", () => activeOrNull() ? GM._active.layout_scale : 1);
    defineReadonly(runtime, "mouseX", () => activeOrNull() ? GM._active.mouse_x : 0);
    defineReadonly(runtime, "mouseY", () => activeOrNull() ? GM._active.mouse_y : 0);
    defineReadonly(runtime, "currentTime", () => activeOrNull() ? GM._active.current_time : 0);
    defineReadonly(runtime, "deltaMs", () => activeOrNull() ? GM._active.delta_time : 0);
    defineReadonly(runtime, "deltaSec", () => activeOrNull() ? GM._active.delta_sec : 0);
    defineReadonly(GM, "perf", () => {
        const perf = activeOrNull() ? GM._active.state.perf : null;
        if (!perf?.enabled) return null;
        return {
            frame: { ...perf.frame },
            counts: { ...perf.counts },
            topLabels: Array.isArray(perf.topLabels) ? perf.topLabels.slice() : []
        };
    });

    const draw = {
        layer: function () { return callActive("render_layer", arguments); },
        setColor: function () { return callActive("draw_set_color", arguments); },
        setAlpha: function () { return callActive("draw_set_alpha", arguments); },
        setLineWidth: function () { return callActive("draw_set_line_width", arguments); },
        setFont: function () { return callActive("draw_set_font", arguments); },
        setHAlign: function () { return callActive("draw_set_halign", arguments); },
        setVAlign: function () { return callActive("draw_set_valign", arguments); },
        rect: function () { return callActive("draw_rectangle", arguments); },
        roundRect: function () { return callActive("draw_roundrect", arguments); },
        circle: function () { return callActive("draw_circle", arguments); },
        line: function () { return callActive("draw_line", arguments); },
        text: function () { return callActive("draw_text", arguments); },
        sprite: function () { return callActive("draw_sprite", arguments); },
        spriteExt: function () { return callActive("draw_sprite_ext", arguments); }
    };

    const gui = {
        rect: function () { return callActive("draw_gui_rectangle", arguments); },
        text: function () { return callActive("draw_gui_text", arguments); }
    };

    const input = Object.assign({}, INPUT, {
        keyDown: function () { return callActive("keyboard_check", arguments); },
        keyPressed: function () { return callActive("keyboard_check_pressed", arguments); },
        keyReleased: function () { return callActive("keyboard_check_released", arguments); },
        pointerDown: function () { return callActive("mouse_check_button", arguments); },
        pointerPressed: function () { return callActive("mouse_check_button_pressed", arguments); },
        pointerReleased: function () { return callActive("mouse_check_button_released", arguments); }
    });

    const entity = {
        /**
         * @param {unknown} objectDef
         * @param {{ x?: unknown, y?: unknown, layer?: string, name?: unknown }} [options]
         */
        spawn(objectDef, options) {
            options = options || {};
            const inst = active().instance_create_layer(
                options.x === undefined ? 0 : options.x,
                options.y === undefined ? 0 : options.y,
                options.layer || "Instances",
                objectDef
            );
            if (options.name !== undefined) inst.name = options.name;
            return inst;
        },
        spawnLayer: function () { return callActive("instance_create_layer", arguments); },
        destroy: function () { return callActive("instance_destroy", arguments); },
        exists: function () { return callActive("instance_exists", arguments); },
        count: function () { return callActive("instance_number", arguments); },
        find: function () { return callActive("instance_find", arguments); }
    };

    const asset = {
        loadImage: function () { return callActive("load_sprite", arguments); },
        loadSound: function () { return callActive("load_sound", arguments); },
        loadSheet: function () { return callActive("load_spritesheet", arguments); }
    };

    const audio = {
        play: function () { return callActive("sound_play", arguments); }
    };

    const ui = {
        button: function () { return callActive("button", arguments); },
        buttonCenter: function () { return callActive("button_center", arguments); },
        nineSliceWindow: function () { return callActive("nineslice_window", arguments); },
        notice: function () { return callActive("modal_notice", arguments); },
        closeAllModals: function () { return callActive("modal_close_all", arguments); },
        /**
         * @param {unknown} theme
         */
        setTheme(theme) {
            uiToolkit.setTheme(theme);
            const activeRuntime = activeOrNull();
            if (activeRuntime) {
                uiToolkit.ensureTextures(activeRuntime.scene, true);
                return activeRuntime;
            }
            return GM;
        },
        getTheme() {
            return uiToolkit.getTheme();
        },
        exportTextures() {
            const activeRuntime = active();
            uiToolkit.ensureTextures(activeRuntime.scene);
            return uiToolkit.exportTextures();
        },
        /**
         * @param {unknown} prefix
         */
        downloadTextures(prefix) {
            const activeRuntime = active();
            uiToolkit.ensureTextures(activeRuntime.scene);
            return uiToolkit.downloadTextures(prefix);
        },
        curtain: function () { return callActive("curtain", arguments); },
        curtainActive: function () { return callActive("curtain_active", arguments); }
    };

    const time = {
        setAlarm: function () { return callActive("alarm_set", arguments); },
        wait: function () { return callActive("wait", arguments); },
        every: function () { return callActive("every", arguments); }
    };

    const debug = {
        log: function () { return callActive("show_debug_message", arguments); },
        tween: function () { return callActive("tween", arguments); }
    };

    const legacy = {
        installGlobals,
        colors: COLORS,
        input: INPUT
    };

    const phaser = {
        get scene() { return activeOrNull() ? GM._active.scene : null; },
        get game() { return activeOrNull() ? GM._active.game : GM._game || null; },
        get library() { return root.Phaser || null; }
    };

    GM.installGlobals = installGlobals;
    GM.app = { start: GM.start };
    GM.runtime = runtime;
    GM.layout = runtime;
    GM.draw = draw;
    GM.gui = gui;
    GM.input = input;
    GM.entity = entity;
    GM.asset = asset;
    GM.audio = audio;
    GM.ui = ui;
    GM.time = time;
    GM.debug = debug;
    GM.legacy = legacy;
    GM.phaser = phaser;
    GM.color = color;
    GM.key = key;
    GM.pointer = pointer;
    GM.nineslice_window = function ninesliceWindow() {
        return active().nineslice_window.apply(null, arguments);
    };
    GM.modal_notice = function modalNotice() {
        return active().modal_notice.apply(null, arguments);
    };
    GM.modal_close_all = function modalCloseAll() {
        return active().modal_close_all.apply(null, arguments);
    };
    GM.colors = COLORS;
    GM.math = math;

    return GM;
}
