type GMColorValue = number | string;
type GMMouseButton = "left" | "right" | "middle";
type GMHorizontalAlign = "left" | "center" | "right";
type GMVerticalAlign = "top" | "middle" | "bottom";

interface GMPrimitiveDrawOptions {
    color?: GMColorValue;
    alpha?: number;
    outline?: boolean;
    lineWidth?: number;
}

interface GMRoundRectDrawOptions extends GMPrimitiveDrawOptions {
    radius?: number;
}

type GMPolylinePoint = { x: number; y: number } | [number, number];

interface GMPolylineOptions extends GMPrimitiveDrawOptions {
    closed?: boolean;
}

interface GMTextDrawOptions {
    font?: string;
    size?: number;
    bold?: boolean;
    color?: GMColorValue;
    alpha?: number;
    hAlign?: GMHorizontalAlign;
    vAlign?: GMVerticalAlign;
    rotation?: number;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    originX?: number;
    originY?: number;
}

interface GMTextFitOptions extends GMTextDrawOptions {
    maxWidth: number;
    maxHeight?: number;
    minSize?: number;
}

interface GMSpriteDrawOptions {
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    width?: number;
    height?: number;
    rotation?: number;
    color?: GMColorValue;
    alpha?: number;
    originX?: number;
    originY?: number;
    flipX?: boolean;
    flipY?: boolean;
}

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
    draw_rectangle(x1: number, y1: number, x2: number, y2: number, outline?: boolean | GMPrimitiveDrawOptions): GMRuntime;
    draw_roundrect(x1: number, y1: number, x2: number, y2: number, radius?: number | GMRoundRectDrawOptions, outline?: boolean | GMPrimitiveDrawOptions): GMRuntime;
    draw_circle(x: number, y: number, radius: number, outline?: boolean | GMPrimitiveDrawOptions): GMRuntime;
    draw_line(x1: number, y1: number, x2: number, y2: number, options?: GMPrimitiveDrawOptions): GMRuntime;
    draw_polyline(points: Array<GMPolylinePoint> | number[], options?: GMPolylineOptions): GMRuntime;
    draw_text(x: number, y: number, text: unknown): unknown;
    draw_text_ext(x: number, y: number, text: unknown, options?: GMTextDrawOptions): unknown;
    draw_text_fit(x: number, y: number, text: unknown, options: GMTextFitOptions): unknown;
    draw_gui_rectangle(x1: number, y1: number, x2: number, y2: number, outline?: boolean): GMRuntime;
    draw_gui_text(x: number, y: number, text: unknown): unknown;
    draw_gui_text_ext(x: number, y: number, text: unknown, options?: GMTextDrawOptions): unknown;
    draw_gui_text_fit(x: number, y: number, text: unknown, options: GMTextFitOptions): unknown;
    draw_sprite(key: string, frame: string | number | null | undefined, x: number, y: number): unknown;
    draw_sprite_ext(key: string, frame: string | number | null | undefined, x: number, y: number, xscale?: number, yscale?: number, rotation?: number, color?: GMColorValue, alpha?: number): unknown;
    draw_sprite_ext(key: string, frame: string | number | null | undefined, x: number, y: number, options?: GMSpriteDrawOptions): unknown;

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
    keyboard_check_pressed_raw(key: string | number | KeyboardEvent): boolean;
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
    okHeight?: number;
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

type GMViewportMode = "fixed" | "adaptive";
type GMViewportFit = "contain" | "cover";
type GMViewportFitArea = "viewport" | "safe";
type GMViewportSafeArea = "none" | "inset" | "frame" | "vertical";
type GMViewportAlignX = "left" | "center" | "right";
type GMViewportAlignY = "top" | "center" | "bottom";

interface GMViewportAlign {
    x?: GMViewportAlignX;
    y?: GMViewportAlignY;
}

interface GMViewportAlignByOrientation {
    portrait?: GMViewportAlign;
    landscape?: GMViewportAlign;
}

interface GMViewportConfig {
    mode?: GMViewportMode;
    width?: number;
    height?: number;
    fit?: GMViewportFit;
    /** Positive step quantizes scale. 0, false, and null keep continuous scaling. */
    scaleStep?: number | false | null;
    fitArea?: GMViewportFitArea;
    safeArea?: GMViewportSafeArea;
    align?: GMViewportAlign | GMViewportAlignByOrientation;
    minHeight?: number;
    targetHeight?: number;
    maxHeight?: number;
    desktopBreakpoint?: number;
    desktopMinWidth?: number;
    desktopHeight?: number;
    desktopMaxWidth?: number;
}

interface GMViewportRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface GMViewportInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

interface GMViewportFrameRects {
    left: GMViewportRect | null;
    right: GMViewportRect | null;
    top: GMViewportRect | null;
    bottom: GMViewportRect | null;
}

interface GMViewportPoint {
    x: number;
    y: number;
}

interface GMViewportSnapshot {
    readonly mode: GMViewportMode;
    readonly fit: GMViewportFit;
    readonly scaleStep: number | false;
    readonly fitArea: GMViewportFitArea;
    readonly safeArea: GMViewportSafeArea;
    readonly logicalRect: GMViewportRect;
    readonly screenRect: GMViewportRect;
    readonly safeScreenRect: GMViewportRect;
    readonly gameScreenRect: GMViewportRect;
    readonly visibleRoomRect: GMViewportRect;
    readonly frameRects: GMViewportFrameRects;
    readonly scale: number;
    readonly scaleMode: "continuous" | "integer" | "fit-fallback";
    readonly orientation: string;
    readonly profile: string;
    readonly safeInsets: GMViewportInsets;
}

interface GMViewportFacade {
    readonly mode: GMViewportMode;
    readonly fit: GMViewportFit;
    readonly scaleStep: number | false;
    readonly fitArea: GMViewportFitArea;
    readonly safeArea: GMViewportSafeArea;
    readonly logicalRect: GMViewportRect;
    readonly screenRect: GMViewportRect;
    readonly safeScreenRect: GMViewportRect;
    readonly gameScreenRect: GMViewportRect;
    readonly visibleRoomRect: GMViewportRect;
    readonly frameRects: GMViewportFrameRects;
    readonly scale: number;
    readonly scaleMode: "continuous" | "integer" | "fit-fallback";
    readonly orientation: string;
    readonly profile: string;
    readonly safeInsets: GMViewportInsets;
    snapshot(): GMViewportSnapshot;
    screenToRoom(x: number, y: number): GMViewportPoint;
    roomToScreen(x: number, y: number): GMViewportPoint;
    containsRoomPoint(x: number, y: number): boolean;
    containsScreenPoint(x: number, y: number): boolean;
}

interface GMStartConfig {
    parent?: string | object;
    width?: number;
    height?: number;
    /** Phaser renderer type: AUTO | CANVAS | WEBGL (string or Phaser constant). */
    type?: "AUTO" | "CANVAS" | "WEBGL" | number;
    /**
     * Preferred presentation contract. `responsive` and `integerScaleStep`
     * remain supported aliases for `mode` and `scaleStep`.
     */
    viewport?: GMViewportConfig;
    /** @deprecated Prefer `viewport.mode`. false = fixed, true = adaptive. */
    responsive?: boolean;
    /** Quantize world scale. 0, false, and null disable stepping. */
    integerScaleStep?: number | false | null;
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
    /** 0 = variable step (default). >0 enables fixed simulation Hz. */
    simulationHz?: number;
    maxFrameDeltaMs?: number;
    maxCatchUpSteps?: number;
    /** Seeds facade random helpers for this game; does not replace Math.random. */
    randomSeed?: number | string | null;
    /** Invalid sprite transforms throw in strict mode or skip and record in report mode. */
    drawValidation?: "strict" | "report";
    /** When false, GM.layer.assertAbove is a no-op. */
    layerAssertions?: boolean;
    preload?: (gm: GMRuntime) => void;
    create?: (gm: GMRuntime) => void;
    step?: (gm: GMRuntime, deltaSeconds: number) => void;
    draw?: (gm: GMRuntime) => void;
    ui?: (gm: GMRuntime) => void;
    gui?: (gm: GMRuntime) => void;
    onCleanupError?: (diagnostic: { phase: string; reason: string; message: string; error: unknown }) => void;
    onError?: (error: unknown, context: { phase: string; frame?: number; time?: number; instanceId?: number | null; objectDefinition?: unknown }) => void;
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
    readonly centerX: number;
    readonly centerY: number;
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
    readonly simulationAlpha: number;
    readonly simulationSteps: number;
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
    rect(x1: number, y1: number, x2: number, y2: number, outline?: boolean | GMPrimitiveDrawOptions): GMRuntime;
    roundRect(x1: number, y1: number, x2: number, y2: number, radius?: number | GMRoundRectDrawOptions, outline?: boolean | GMPrimitiveDrawOptions): GMRuntime;
    circle(x: number, y: number, radius: number, outline?: boolean | GMPrimitiveDrawOptions): GMRuntime;
    line(x1: number, y1: number, x2: number, y2: number, options?: GMPrimitiveDrawOptions): GMRuntime;
    polyline(points: Array<GMPolylinePoint> | number[], options?: GMPolylineOptions): GMRuntime;
    text(x: number, y: number, text: unknown): unknown;
    textExt(x: number, y: number, text: unknown, options?: GMTextDrawOptions): unknown;
    textFit(x: number, y: number, text: unknown, options: GMTextFitOptions): unknown;
    sprite(key: string, frame: string | number | null | undefined, x: number, y: number): unknown;
    spriteExt(key: string, frame: string | number | null | undefined, x: number, y: number, xscale?: number, yscale?: number, rotation?: number, color?: GMColorValue, alpha?: number): unknown;
    spriteExt(key: string, frame: string | number | null | undefined, x: number, y: number, options?: GMSpriteDrawOptions): unknown;
    measureAtlasText(font: string | object, text: unknown, options?: { scale?: number }): { width: number; height: number; characters: number };
    atlasText(font: string | object, text: unknown, x: number, y: number, options?: { scale?: number; color?: GMColorValue; alpha?: number; align?: "left" | "center" | "right" }): unknown;
    atlasTextFit(font: string | object, text: unknown, x: number, y: number, options: { maxWidth: number; scale?: number; minScale?: number; color?: GMColorValue; alpha?: number; align?: "left" | "center" | "right" }): unknown;
}

interface GMGuiFacade {
    rect(x1: number, y1: number, x2: number, y2: number, outline?: boolean): GMRuntime;
    text(x: number, y: number, text: unknown): unknown;
    textExt(x: number, y: number, text: unknown, options?: GMTextDrawOptions): unknown;
    textFit(x: number, y: number, text: unknown, options: GMTextFitOptions): unknown;
}

interface GMPointerState {
    id: string;
    screenX: number;
    screenY: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    button: GMMouseButton | string;
    kind?: "mouse" | "touch" | "pen";
    down: boolean;
    active: boolean;
    pressed?: boolean;
    released?: boolean;
    owner: string | null;
    downTime: number;
}

interface GMPrimaryPointer {
    id: string;
    screenX: number;
    screenY: number;
    roomX: number;
    roomY: number;
    x: number;
    y: number;
    insideGame: boolean;
    down: boolean;
    pressed: boolean;
    released: boolean;
    kind: "mouse" | "touch" | "pen";
    button: GMMouseButton | string;
    owner: string | null;
}

interface GMVirtualStickOptions {
    mode?: "fixed" | "floating";
    origin?: { x?: number; y?: number };
    maxRadius?: number;
    deadzone?: number;
}

interface GMVirtualStickVector {
    readonly x: number;
    readonly y: number;
}

interface GMVirtualStick {
    readonly active: boolean;
    readonly pointerId: string | null;
    readonly mode: "fixed" | "floating";
    readonly origin: GMVirtualStickVector;
    readonly position: GMVirtualStickVector;
    readonly vector: GMVirtualStickVector;
    readonly distance: number;
    readonly magnitude: number;
    readonly angle: number;
    press(pointerId: string | number, x: number, y: number): GMVirtualStick;
    move(pointerId: string | number, x: number, y: number): GMVirtualStick;
    release(pointerId?: string | number): GMVirtualStick;
    cancel(pointerId?: string | number): GMVirtualStick;
    reset(): GMVirtualStick;
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
    keyPressedRaw(key: string | number | KeyboardEvent): boolean;
    keyReleased(key: string | number | KeyboardEvent): boolean;
    pointerDown(button?: GMMouseButton): boolean;
    pointerPressed(button?: GMMouseButton): boolean;
    pointerReleased(button?: GMMouseButton): boolean;
    getPointer(id: string | number): GMPointerState | null;
    activePointers(): GMPointerState[];
    capturePointer(id: string | number, owner?: string): GMRuntime;
    releasePointer(id: string | number, owner?: string): GMRuntime;
    createVirtualStick(options?: GMVirtualStickOptions): GMVirtualStick;
    primaryPointer(): GMPrimaryPointer | null;
    primaryPressed(): boolean;
    primaryReleased(): boolean;
    capturePrimary(owner?: string): boolean;
    releasePrimary(owner?: string): boolean;
}

interface GMEntitySpawnOptions {
    x?: number;
    y?: number;
    layer?: string;
    name?: string;
    /** Applied to the instance before Create runs. */
    vars?: Record<string, unknown>;
}

interface GMEntityFacade {
    spawn(objectDef: GMObjectDefinition, options?: GMEntitySpawnOptions): GMInstance;
    spawnLayer(x: number, y: number, layer: string, objectDef: GMObjectDefinition, createVars?: Record<string, unknown>): GMInstance;
    destroy(inst?: GMInstance): GMRuntime;
    exists(target: GMInstance | GMObjectDefinition): boolean;
    count(objectDef: GMObjectDefinition): number;
    find(objectDef: GMObjectDefinition, index: number): GMInstance | null;
}

interface GMLayerFacade {
    define(name: string, depth: number): GMRuntime;
    define(layers: Record<string, number>): GMRuntime;
    stack(names: string[], options?: { start?: number; step?: number }): GMRuntime;
    assertAbove(upper: string, lower: string): GMRuntime;
}

interface GMAtlasRgbaSource {
    width: number;
    height: number;
    rgba: ArrayLike<number> | ArrayBufferView;
}

interface GMAssetRegistrationManifest {
    key: string;
    texture?: unknown;
    frames?: string[];
    frameCount?: number;
    width?: number;
    height?: number;
    source?: string;
}

interface GMAssetFacade {
    loadImage(key: string, url: string): GMRuntime;
    loadSound(key: string, url: string): GMRuntime;
    loadSheet(key: string, url: string, frameWidth: number, frameHeight: number): GMRuntime;
    addCanvas(key: string, canvas: HTMLCanvasElement | OffscreenCanvas, options?: { replace?: boolean }): GMAssetRegistrationManifest;
    addRgba(key: string, width: number, height: number, rgba: ArrayLike<number> | ArrayBufferView, options?: { replace?: boolean }): GMAssetRegistrationManifest;
    addAtlas(key: string, source: HTMLCanvasElement | OffscreenCanvas | string | GMAtlasRgbaSource, frames: object | Map<string, unknown> | unknown[], options?: { replace?: boolean }): GMAssetRegistrationManifest;
    remove(key: string): boolean;
    exists(key: string): boolean;
    frameExists(key: string, frame: string | number): boolean;
    frameInfo(key: string, frame?: string | number): GMAssetFrameInfo;
    frameSize(key: string, frame?: string | number): { width: number; height: number; sourceWidth: number; sourceHeight: number };
    frameNames(key: string): string[];
}

interface GMAssetFrameInfo {
    name: string;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
    pivot: { x: number; y: number } | null;
    meta: unknown;
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
    assertFinite(label: string, values: Record<string, unknown>): true;
}

interface GMDiagnosticsFacade {
    readonly invalidDraws: number;
    readonly lastInvalidDraw: {
        texture?: unknown;
        frame?: unknown;
        layer?: unknown;
        frameNumber?: unknown;
        values?: Record<string, unknown>;
    } | null;
    readonly nonFiniteSimulationValues: number;
}

interface GMSeededRng {
    seed(nextSeed?: number | string): GMSeededRng;
    getState(): number;
    next(): number;
    random(max: number): number;
    randomRange(min: number, max: number): number;
    irandom(max: number): number;
    irandomRange(min: number, max: number): number;
    choose<T>(...items: T[]): T | undefined;
}

interface GMMathFacade {
    clamp(value: number, min: number, max: number): number;
    lerp(a: number, b: number, t: number): number;
    dampFactor(factor: number, deltaSeconds: number, referenceHz?: number): number;
    distanceSq(x1: number, y1: number, x2: number, y2: number): number;
    normalize2(dx: number, dy: number, out?: { x?: number; y?: number; length?: number }): { x: number; y: number; length: number };
    choose<T>(...items: T[]): T | undefined;
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
    /** Degrees in [0, 360): right=0, up=90, left=180, down=270. */
    point_direction(x1: number, y1: number, x2: number, y2: number): number;
    lengthdir_x(length: number, direction: number): number;
    lengthdir_y(length: number, direction: number): number;
    point_in_rectangle(px: number, py: number, x1: number, y1: number, x2: number, y2: number): boolean;
    setSeed(seed?: number | string | null): GMMathFacade;
    getSeedState(): number | null;
    createRng(seed?: number | string): GMSeededRng;
}

interface GMLegacyFacade {
    installGlobals(): () => void;
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
    phaserVersion: string;
    start(config?: GMStartConfig): unknown;
    app: {
        start(config?: GMStartConfig): unknown;
    };
    runtime: GMRuntimeInfo;
    layout: GMRuntimeInfo;
    viewport: GMViewportFacade;
    diagnostics: GMDiagnosticsFacade;
    draw: GMDrawFacade;
    gui: GMGuiFacade;
    input: GMInputFacade;
    entity: GMEntityFacade;
    layer: GMLayerFacade;
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
    installGlobals(): () => void;
    nineslice_window(x: number, y: number, w: number, h: number, options?: GMNineSliceWindowOptions): unknown;
    modal_notice(title: string, message?: string, options?: GMNoticeModalOptions): GMModal;
    modal_notice(options: GMNoticeModalOptions): GMModal;
    modal_close_all(): GMRuntime;
    colors: Record<string, number>;
    math: GMMathFacade;
}

interface Window {
    GM: GMFacade;
}

declare var GM: GMFacade;

declare module "phaser4-facade" {
    export function installGMRuntime(root: typeof globalThis, Phaser: unknown): GMFacade;
    export const GM: GMFacade;
    export default GM;
}
