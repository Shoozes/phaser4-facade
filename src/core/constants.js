export const DEFAULTS = {
    parent: "game",
    width: 720,
    height: 1280,
    minHeight: 1280,
    // Design reference height used for portrait profile labeling.
    targetHeight: 1560,
    maxHeight: 1680,
    desktopBreakpoint: 1000,
    desktopMinWidth: 1280,
    desktopHeight: 720,
    desktopMaxWidth: 1920,
    responsive: false,
    bleed: 300,
    background: 0x111111,
    safeColor: 0x333333,
    bleedColor: 0x222222,
    stage: true,
    globals: true,
    renderQuality: "smooth",
    pixelArt: false,
    antialias: true,
    roundPixels: false,
    renderResolution: 1,
    maxRenderResolution: 3,
    curtain: false,
    curtainText: "TAP TO START",
    curtainFadeMs: 350
};

export const DEFAULT_MODAL_INPUT_BLOCK_MS = 650;
export const DEFAULT_MODAL_OPEN_MS = 300;
export const DEFAULT_MODAL_CLOSE_MS = 260;

export const COLORS = {
    c_black: 0x000000,
    c_white: 0xffffff,
    c_gray: 0x808080,
    c_grey: 0x808080,
    c_dkgray: 0x404040,
    c_dkgrey: 0x404040,
    c_ltgray: 0xc0c0c0,
    c_ltgrey: 0xc0c0c0,
    c_red: 0xff0000,
    c_green: 0x008000,
    c_lime: 0x00ff00,
    c_blue: 0x0000ff,
    c_yellow: 0xffff00,
    c_orange: 0xffa500,
    c_purple: 0x800080,
    c_aqua: 0x00ffff,
    c_fuchsia: 0xff00ff
};

export const ALIGN = {
    fa_left: "left",
    fa_center: "center",
    fa_right: "right",
    fa_top: "top",
    fa_middle: "middle",
    fa_bottom: "bottom"
};

export const INPUT = {
    mb_left: "left",
    mb_right: "right",
    mb_middle: "middle",
    vk_left: "LEFT",
    vk_right: "RIGHT",
    vk_up: "UP",
    vk_down: "DOWN",
    vk_space: "SPACE",
    vk_enter: "ENTER",
    vk_escape: "ESCAPE",
    vk_shift: "SHIFT",
    vk_control: "CTRL",
    vk_alt: "ALT"
};
