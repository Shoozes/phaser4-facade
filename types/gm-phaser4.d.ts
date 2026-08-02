type GMColorValue = number | string;
type GMMouseButton = "left" | "right" | "middle";
type GMHorizontalAlign = "left" | "center" | "right";
type GMVerticalAlign = "top" | "middle" | "bottom";

interface GMRuntime {
    readonly room_width: number;
    readonly room_height: number;
    readonly display_width: number;
    readonly display_height: number;
    readonly layout_profile: string;
    readonly orientation: string;
    readonly layout_scale: number;
    readonly mouse_x: number;
    readonly mouse_y: number;
    readonly current_time: number;
    readonly delta_time: number;
    readonly delta_sec: number;

    load_sprite(key: string, url: string): GMRuntime;
    load_sound(key: string, url: string): GMRuntime;
    load_spritesheet(key: string, url: string, frameWidth: number, frameHeight: number): GMRuntime;

    draw_set_color(value: GMColorValue): GMRuntime;
    draw_set_alpha(value: number): GMRuntime;
    draw_set_line_width(value: number): GMRuntime;
    draw_set_font(font?: string, size?: number, bold?: boolean): GMRuntime;
    draw_set_halign(value: GMHorizontalAlign): GMRuntime;
    draw_set_valign(value: GMVerticalAlign): GMRuntime;
    draw_rectangle(x1: number, y1: number, x2: number, y2: number, outline?: boolean): GMRuntime;
    draw_roundrect(x1: number, y1: number, x2: number, y2: number, radius?: number, outline?: boolean): GMRuntime;
    draw_circle(x: number, y: number, radius: number, outline?: boolean): GMRuntime;
    draw_line(x1: number, y1: number, x2: number, y2: number): GMRuntime;
    draw_text(x: number, y: number, text: unknown): unknown;
    draw_gui_rectangle(x1: number, y1: number, x2: number, y2: number, outline?: boolean): GMRuntime;
    draw_gui_text(x: number, y: number, text: unknown): unknown;
    draw_sprite(key: string, frame: string | number | null | undefined, x: number, y: number): unknown;
    draw_sprite_ext(key: string, frame: string | number | null | undefined, x: number, y: number, xscale?: number, yscale?: number, rotation?: number, color?: GMColorValue, alpha?: number): unknown;

    button(x: number, y: number, w: number, h: number, text: string, onTap?: (gm: GMRuntime) => void, options?: GMButtonOptions): boolean;
    button_center(x: number, y: number, w: number, h: number, text: string, onTap?: (gm: GMRuntime) => void, options?: GMButtonOptions): boolean;
    nineslice_window(x: number, y: number, w: number, h: number, options?: GMNineSliceWindowOptions): unknown;
    modal_notice(title: string, message?: string, options?: GMNoticeModalOptions): GMModal;
    modal_notice(options: GMNoticeModalOptions): GMModal;
    modal_close_all(): GMRuntime;
    ui_set_theme(theme: GMUiTheme): GMRuntime;
    ui_get_theme(): GMUiTheme;
    ui_export_textures(): GMGeneratedTextureExport[];
    ui_download_textures(prefix?: string): GMGeneratedTextureExport[];
    curtain(text?: string, fadeMs?: number): boolean;
    curtain_active(): boolean;

    instance_create_layer(x: number, y: number, layer: string, objectDef: GMObjectDefinition): GMInstance;
    instance_destroy(inst?: GMInstance): GMRuntime;
    instance_exists(target: GMInstance | GMObjectDefinition): boolean;
    instance_number(objectDef: GMObjectDefinition): number;
    instance_find(objectDef: GMObjectDefinition, index: number): GMInstance | null;
    alarm_set(index: number, frames: number, inst?: GMInstance): GMRuntime;

    keyboard_check(key: string | number | KeyboardEvent): boolean;
    keyboard_check_pressed(key: string | number | KeyboardEvent): boolean;
    keyboard_check_released(key: string | number | KeyboardEvent): boolean;
    mouse_check_button(button?: GMMouseButton): boolean;
    mouse_check_button_pressed(button?: GMMouseButton): boolean;
    mouse_check_button_released(button?: GMMouseButton): boolean;

    show_debug_message(message: unknown): GMRuntime;
    tween(target: object, options?: Record<string, unknown>): unknown;
    wait(ms: number, fn?: (gm: GMRuntime) => void): unknown;
    every(ms: number, fn?: (gm: GMRuntime) => void): unknown;
    sound_play(key: string, config?: Record<string, unknown>): unknown;
}

interface GMObjectDefinition {
    visible?: boolean;
    alarm?: number[];
    create?: (this: GMInstance, gm: GMRuntime) => void;
    step?: (this: GMInstance, gm: GMRuntime) => void;
    draw?: (this: GMInstance, gm: GMRuntime) => void;
    destroy?: (this: GMInstance, gm: GMRuntime) => void;
    [key: string]: unknown;
}

interface GMInstance extends GMObjectDefinition {
    id: number;
    object_index: GMObjectDefinition;
    x: number;
    y: number;
    layer: string;
    visible: boolean;
    alarm: number[];
}

interface GMButtonOptions {
    id?: string;
    flashMs?: number;
    alpha?: number;
    texture?: string;
    frame?: string | number | null;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    tint?: GMColorValue;
    hoverTint?: GMColorValue;
    activeTint?: GMColorValue;
    shadow?: boolean;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowAlpha?: number;
    fill?: GMColorValue;
    hoverFill?: GMColorValue;
    activeFill?: GMColorValue;
    color?: GMColorValue;
    hoverColor?: GMColorValue;
    activeColor?: GMColorValue;
    radius?: number;
    font?: string;
    size?: number;
    labelOffsetY?: number;
    hoverScale?: number;
    downScale?: number;
}

interface GMNineSliceWindowOptions {
    texture?: string;
    frame?: string | number | null;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    tileX?: boolean;
    tileY?: boolean;
    fill?: GMColorValue;
    stroke?: GMColorValue;
}

interface GMUiPanelTheme {
    texture?: string;
    size?: number;
    inset?: number;
    radius?: number;
    fillTop?: string;
    fillBottom?: string;
    stroke?: string;
    strokeWidth?: number;
    innerStroke?: string;
    innerStrokeWidth?: number;
    shadow?: string;
    shadowBlur?: number;
    shadowOffsetY?: number;
    fallbackFill?: GMColorValue;
    fallbackStroke?: GMColorValue;
    slice?: number;
}

interface GMUiButtonTheme extends GMUiPanelTheme {
    textColor?: string;
    hoverTint?: GMColorValue;
    downTint?: GMColorValue;
}

interface GMUiModalTheme {
    titleFont?: string;
    titleSize?: number;
    titleColor?: string;
    messageFont?: string;
    messageSize?: number;
    messageColor?: string;
    okText?: string;
    backdropAlpha?: number;
}

interface GMUiTheme {
    panel?: GMUiPanelTheme;
    button?: GMUiButtonTheme;
    modal?: GMUiModalTheme;
}

interface GMGeneratedTextureExport {
    key: string;
    width: number;
    height: number;
    mime: "image/png";
    dataUrl: string;
}

interface GMModal {
    readonly closed: boolean;
    readonly closing: boolean;
    readonly width: number;
    readonly height: number;
    close(reason?: string): GMModal;
    destroy(reason?: string): GMModal;
    layout(): GMModal;
}

interface GMNoticeModalOptions {
    title?: string;
    message?: string;
    width?: number;
    height?: number;
    margin?: number;
    showClose?: boolean;
    showOk?: boolean;
    okText?: string;
    okWidth?: number;
    okSize?: number;
    closeOnBackdrop?: boolean;
    backdropAlpha?: number;
    backdropMs?: number;
    inputBlockMs?: number;
    openMs?: number;
    closeMs?: number;
    openStartScale?: number;
    closeScale?: number;
    openEase?: string;
    titleFont?: string;
    titleSize?: number;
    titleColor?: string;
    messageFont?: string;
    messageSize?: number;
    messageColor?: string;
    window?: GMNineSliceWindowOptions;
    onOk?: (modal: GMModal) => void;
    onClose?: (reason: string, modal: GMModal) => void;
}

interface GMStartConfig {
    parent?: string;
    width?: number;
    height?: number;
    responsive?: boolean;
    minHeight?: number;
    targetHeight?: number;
    maxHeight?: number;
    desktopBreakpoint?: number;
    desktopMinWidth?: number;
    desktopHeight?: number;
    desktopMaxWidth?: number;
    bleed?: number;
    background?: GMColorValue;
    safeColor?: GMColorValue;
    bleedColor?: GMColorValue;
    stage?: boolean;
    globals?: boolean;
    renderQuality?: "smooth" | "pixel-art";
    antialias?: boolean;
    roundPixels?: boolean;
    pixelArt?: boolean;
    renderResolution?: number | "auto";
    maxRenderResolution?: number;
    perfProbe?: boolean;
    curtain?: boolean;
    curtainText?: string;
    curtainFadeMs?: number;
    preload?: (gm: GMRuntime) => void;
    create?: (gm: GMRuntime) => void;
    step?: (gm: GMRuntime, deltaSeconds: number) => void;
    draw?: (gm: GMRuntime) => void;
    ui?: (gm: GMRuntime) => void;
    gui?: (gm: GMRuntime) => void;
}

interface GMColorConstants {
    BLACK: number;
    WHITE: number;
    GRAY: number;
    GREY: number;
    DKGRAY: number;
    DKGREY: number;
    LTGRAY: number;
    LTGREY: number;
    RED: number;
    GREEN: number;
    LIME: number;
    BLUE: number;
    YELLOW: number;
    ORANGE: number;
    PURPLE: number;
    AQUA: number;
    FUCHSIA: number;
}

interface GMKeyConstants {
    LEFT: string;
    RIGHT: string;
    UP: string;
    DOWN: string;
    SPACE: string;
    ENTER: string;
    ESCAPE: string;
    SHIFT: string;
    CONTROL: string;
    ALT: string;
}

interface GMPointerConstants {
    LEFT: GMMouseButton;
    RIGHT: GMMouseButton;
    MIDDLE: GMMouseButton;
}

interface GMRuntimeInfo {
    readonly active: GMRuntime | null;
    readonly scene: unknown;
    readonly state: unknown;
    readonly roomWidth: number;
    readonly roomHeight: number;
    readonly displayWidth: number;
    readonly displayHeight: number;
    readonly profile: string;
    readonly orientation: string;
    readonly scale: number;
    readonly mouseX: number;
    readonly mouseY: number;
    readonly currentTime: number;
    readonly deltaMs: number;
    readonly deltaSec: number;
}

interface GMPerfCounts {
    readonly drawText: number;
    readonly fittedText: number;
    readonly buttons: number;
    readonly panels: number;
    readonly sprites: number;
    readonly nineSlices: number;
    readonly declarativeNodes: number;
    readonly layoutReads: number;
    readonly textSetCalls: number;
    readonly textStyleSetCalls: number;
    readonly textObjectsAllocated: number;
    readonly textObjectsReused: number;
}

interface GMPerfFrame {
    readonly stepMs: number;
    readonly drawMs: number;
    readonly uiMs: number;
    readonly totalMs: number;
    readonly fpsEstimate: number;
}

interface GMPerfTopLabel {
    readonly text: string;
    readonly count: number;
}

interface GMPerfSnapshot {
    readonly frame: GMPerfFrame;
    readonly counts: GMPerfCounts;
    readonly topLabels: GMPerfTopLabel[];
}

interface GMDrawFacade {
    layer(name: string, depth?: number): GMRuntime;
    setColor(value: GMColorValue): GMRuntime;
    setAlpha(value: number): GMRuntime;
    setLineWidth(value: number): GMRuntime;
    setFont(font?: string, size?: number, bold?: boolean): GMRuntime;
    setHAlign(value: GMHorizontalAlign): GMRuntime;
    setVAlign(value: GMVerticalAlign): GMRuntime;
    rect(x1: number, y1: number, x2: number, y2: number, outline?: boolean): GMRuntime;
    roundRect(x1: number, y1: number, x2: number, y2: number, radius?: number, outline?: boolean): GMRuntime;
    circle(x: number, y: number, radius: number, outline?: boolean): GMRuntime;
    line(x1: number, y1: number, x2: number, y2: number): GMRuntime;
    text(x: number, y: number, text: unknown): unknown;
    sprite(key: string, frame: string | number | null | undefined, x: number, y: number): unknown;
    spriteExt(key: string, frame: string | number | null | undefined, x: number, y: number, xscale?: number, yscale?: number, rotation?: number, color?: GMColorValue, alpha?: number): unknown;
}

interface GMGuiFacade {
    rect(x1: number, y1: number, x2: number, y2: number, outline?: boolean): GMRuntime;
    text(x: number, y: number, text: unknown): unknown;
}

interface GMInputFacade {
    mb_left: GMMouseButton;
    mb_right: GMMouseButton;
    mb_middle: GMMouseButton;
    vk_left: string;
    vk_right: string;
    vk_up: string;
    vk_down: string;
    vk_space: string;
    vk_enter: string;
    vk_escape: string;
    vk_shift: string;
    vk_control: string;
    vk_alt: string;
    keyDown(key: string | number | KeyboardEvent): boolean;
    keyPressed(key: string | number | KeyboardEvent): boolean;
    keyReleased(key: string | number | KeyboardEvent): boolean;
    pointerDown(button?: GMMouseButton): boolean;
    pointerPressed(button?: GMMouseButton): boolean;
    pointerReleased(button?: GMMouseButton): boolean;
}

interface GMEntitySpawnOptions {
    x?: number;
    y?: number;
    layer?: string;
    name?: string;
}

interface GMEntityFacade {
    spawn(objectDef: GMObjectDefinition, options?: GMEntitySpawnOptions): GMInstance;
    spawnLayer(x: number, y: number, layer: string, objectDef: GMObjectDefinition): GMInstance;
    destroy(inst?: GMInstance): GMRuntime;
    exists(target: GMInstance | GMObjectDefinition): boolean;
    count(objectDef: GMObjectDefinition): number;
    find(objectDef: GMObjectDefinition, index: number): GMInstance | null;
}

interface GMAssetFacade {
    loadImage(key: string, url: string): GMRuntime;
    loadSound(key: string, url: string): GMRuntime;
    loadSheet(key: string, url: string, frameWidth: number, frameHeight: number): GMRuntime;
}

interface GMAudioFacade {
    play(key: string, config?: Record<string, unknown>): unknown;
}

interface GMUiFacade {
    button(x: number, y: number, w: number, h: number, text: string, onTap?: (gm: GMRuntime) => void, options?: GMButtonOptions): boolean;
    buttonCenter(x: number, y: number, w: number, h: number, text: string, onTap?: (gm: GMRuntime) => void, options?: GMButtonOptions): boolean;
    nineSliceWindow(x: number, y: number, w: number, h: number, options?: GMNineSliceWindowOptions): unknown;
    notice(title: string, message?: string, options?: GMNoticeModalOptions): GMModal;
    notice(options: GMNoticeModalOptions): GMModal;
    closeAllModals(): GMRuntime;
    setTheme(theme: GMUiTheme): GMRuntime | GMFacade;
    getTheme(): GMUiTheme;
    exportTextures(): GMGeneratedTextureExport[];
    downloadTextures(prefix?: string): GMGeneratedTextureExport[];
    curtain(text?: string, fadeMs?: number): boolean;
    curtainActive(): boolean;
}

interface GMTimeFacade {
    setAlarm(index: number, frames: number, inst?: GMInstance): GMRuntime;
    wait(ms: number, fn?: (gm: GMRuntime) => void): unknown;
    every(ms: number, fn?: (gm: GMRuntime) => void): unknown;
}

interface GMDebugFacade {
    log(message: unknown): GMRuntime;
    tween(target: object, options?: Record<string, unknown>): unknown;
}

interface GMMathFacade {
    clamp(value: number, min: number, max: number): number;
    lerp(a: number, b: number, t: number): number;
    choose<T>(...items: T[]): T;
    random(max: number): number;
    random_range(min: number, max: number): number;
    irandom(max: number): number;
    irandom_range(min: number, max: number): number;
    degtorad(degrees: number): number;
    radtodeg(radians: number): number;
    dsin(degrees: number): number;
    dcos(degrees: number): number;
    dtan(degrees: number): number;
    point_distance(x1: number, y1: number, x2: number, y2: number): number;
    point_direction(x1: number, y1: number, x2: number, y2: number): number;
    lengthdir_x(length: number, direction: number): number;
    lengthdir_y(length: number, direction: number): number;
    point_in_rectangle(px: number, py: number, x1: number, y1: number, x2: number, y2: number): boolean;
}

interface GMLegacyFacade {
    installGlobals(): void;
    colors: Record<string, number>;
    input: Record<string, string>;
}

interface GMPhaserFacade {
    readonly scene: unknown;
    readonly game: unknown;
    readonly library: unknown;
}

interface GMFacade {
    version: string;
    start(config?: GMStartConfig): unknown;
    app: {
        start(config?: GMStartConfig): unknown;
    };
    runtime: GMRuntimeInfo;
    layout: GMRuntimeInfo;
    draw: GMDrawFacade;
    gui: GMGuiFacade;
    input: GMInputFacade;
    entity: GMEntityFacade;
    asset: GMAssetFacade;
    audio: GMAudioFacade;
    ui: GMUiFacade;
    time: GMTimeFacade;
    debug: GMDebugFacade;
    readonly perf: GMPerfSnapshot | null;
    legacy: GMLegacyFacade;
    phaser: GMPhaserFacade;
    color: GMColorConstants;
    key: GMKeyConstants;
    pointer: GMPointerConstants;
    installGlobals(): void;
    nineslice_window(x: number, y: number, w: number, h: number, options?: GMNineSliceWindowOptions): unknown;
    modal_notice(title: string, message?: string, options?: GMNoticeModalOptions): GMModal;
    modal_notice(options: GMNoticeModalOptions): GMModal;
    modal_close_all(): GMRuntime;
    colors: Record<string, number>;
    math: GMMathFacade;
}

interface GameObjectRegistry {
    obj_creature_target: GMObjectDefinition;
    [key: string]: GMObjectDefinition;
}

interface Window {
    GM: GMFacade;
    GameObjects: GameObjectRegistry;
}

declare var GM: GMFacade;
declare var GameObjects: GameObjectRegistry;

declare var room_width: number;
declare var room_height: number;
declare var display_width: number;
declare var display_height: number;
declare var mouse_x: number;
declare var mouse_y: number;
declare var current_time: number;
declare var delta_time: number;
declare var delta_sec: number;

declare var c_black: number;
declare var c_white: number;
declare var c_gray: number;
declare var c_grey: number;
declare var c_dkgray: number;
declare var c_dkgrey: number;
declare var c_ltgray: number;
declare var c_ltgrey: number;
declare var c_red: number;
declare var c_green: number;
declare var c_lime: number;
declare var c_blue: number;
declare var c_yellow: number;
declare var c_orange: number;
declare var c_purple: number;
declare var c_aqua: number;
declare var c_fuchsia: number;

declare var fa_left: GMHorizontalAlign;
declare var fa_center: GMHorizontalAlign;
declare var fa_right: GMHorizontalAlign;
declare var fa_top: GMVerticalAlign;
declare var fa_middle: GMVerticalAlign;
declare var fa_bottom: GMVerticalAlign;

declare var mb_left: GMMouseButton;
declare var mb_right: GMMouseButton;
declare var mb_middle: GMMouseButton;
declare var vk_left: string;
declare var vk_right: string;
declare var vk_up: string;
declare var vk_down: string;
declare var vk_space: string;
declare var vk_enter: string;
declare var vk_escape: string;
declare var vk_shift: string;
declare var vk_control: string;
declare var vk_alt: string;

declare function clamp(value: number, min: number, max: number): number;
declare function lerp(a: number, b: number, t: number): number;
declare function choose<T>(...items: T[]): T;
declare function random(max: number): number;
declare function random_range(min: number, max: number): number;
declare function irandom(max: number): number;
declare function irandom_range(min: number, max: number): number;
declare function degtorad(degrees: number): number;
declare function radtodeg(radians: number): number;
declare function sin(value: number): number;
declare function cos(value: number): number;
declare function tan(value: number): number;
declare function dsin(degrees: number): number;
declare function dcos(degrees: number): number;
declare function dtan(degrees: number): number;
declare function point_distance(x1: number, y1: number, x2: number, y2: number): number;
declare function point_direction(x1: number, y1: number, x2: number, y2: number): number;
declare function lengthdir_x(length: number, direction: number): number;
declare function lengthdir_y(length: number, direction: number): number;
declare function point_in_rectangle(px: number, py: number, x1: number, y1: number, x2: number, y2: number): boolean;
declare function ord(value: unknown): number;

declare function load_sprite(key: string, url: string): GMRuntime;
declare function load_sound(key: string, url: string): GMRuntime;
declare function load_spritesheet(key: string, url: string, frameWidth: number, frameHeight: number): GMRuntime;
declare function draw_set_color(value: GMColorValue): GMRuntime;
declare function draw_set_alpha(value: number): GMRuntime;
declare function draw_set_line_width(value: number): GMRuntime;
declare function draw_set_font(font?: string, size?: number, bold?: boolean): GMRuntime;
declare function draw_set_halign(value: GMHorizontalAlign): GMRuntime;
declare function draw_set_valign(value: GMVerticalAlign): GMRuntime;
declare function draw_rectangle(x1: number, y1: number, x2: number, y2: number, outline?: boolean): GMRuntime;
declare function draw_roundrect(x1: number, y1: number, x2: number, y2: number, radius?: number, outline?: boolean): GMRuntime;
declare function draw_circle(x: number, y: number, radius: number, outline?: boolean): GMRuntime;
declare function draw_line(x1: number, y1: number, x2: number, y2: number): GMRuntime;
declare function draw_text(x: number, y: number, text: unknown): unknown;
declare function draw_gui_rectangle(x1: number, y1: number, x2: number, y2: number, outline?: boolean): GMRuntime;
declare function draw_gui_text(x: number, y: number, text: unknown): unknown;
declare function draw_sprite(key: string, frame: string | number | null | undefined, x: number, y: number): unknown;
declare function draw_sprite_ext(key: string, frame: string | number | null | undefined, x: number, y: number, xscale?: number, yscale?: number, rotation?: number, color?: GMColorValue, alpha?: number): unknown;
declare function button(x: number, y: number, w: number, h: number, text: string, onTap?: (gm: GMRuntime) => void, options?: GMButtonOptions): boolean;
declare function button_center(x: number, y: number, w: number, h: number, text: string, onTap?: (gm: GMRuntime) => void, options?: GMButtonOptions): boolean;
declare function nineslice_window(x: number, y: number, w: number, h: number, options?: GMNineSliceWindowOptions): unknown;
declare function modal_notice(title: string, message?: string, options?: GMNoticeModalOptions): GMModal;
declare function modal_notice(options: GMNoticeModalOptions): GMModal;
declare function modal_close_all(): GMRuntime;
declare function curtain(text?: string, fadeMs?: number): boolean;
declare function curtain_active(): boolean;
declare function instance_create_layer(x: number, y: number, layer: string, objectDef: GMObjectDefinition): GMInstance;
declare function instance_destroy(inst?: GMInstance): GMRuntime;
declare function instance_exists(target: GMInstance | GMObjectDefinition): boolean;
declare function instance_number(objectDef: GMObjectDefinition): number;
declare function instance_find(objectDef: GMObjectDefinition, index: number): GMInstance | null;
declare function alarm_set(index: number, frames: number, inst?: GMInstance): GMRuntime;
declare function keyboard_check(key: string | number | KeyboardEvent): boolean;
declare function keyboard_check_pressed(key: string | number | KeyboardEvent): boolean;
declare function keyboard_check_released(key: string | number | KeyboardEvent): boolean;
declare function mouse_check_button(button?: GMMouseButton): boolean;
declare function mouse_check_button_pressed(button?: GMMouseButton): boolean;
declare function mouse_check_button_released(button?: GMMouseButton): boolean;
declare function show_debug_message(message: unknown): GMRuntime;
declare function tween(target: object, options?: Record<string, unknown>): unknown;
declare function wait(ms: number, fn?: (gm: GMRuntime) => void): unknown;
declare function every(ms: number, fn?: (gm: GMRuntime) => void): unknown;
declare function sound_play(key: string, config?: Record<string, unknown>): unknown;
