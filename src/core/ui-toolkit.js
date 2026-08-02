// @ts-check

import { consumeInputEvent } from "./input.js";
import { toColor } from "./math.js";

/** @typedef {Record<string, any>} PlainObject */
/** @typedef {(ctx: CanvasRenderingContext2D, width: number, height: number) => void} CanvasTextureDrawer */

const DEFAULT_UI_THEME = {
    panel: {
        texture: "gm_panel_blue",
        size: 128,
        inset: 7,
        radius: 15,
        fillTop: "#305f92",
        fillBottom: "#183454",
        stroke: "#76b8f3",
        strokeWidth: 3,
        innerStroke: "rgba(255,255,255,0.55)",
        innerStrokeWidth: 1,
        shadow: "rgba(0, 0, 0, 0.45)",
        shadowBlur: 10,
        shadowOffsetY: 4,
        fallbackFill: 0x24466f,
        fallbackStroke: 0x76b8f3,
        slice: 18
    },
    button: {
        texture: "gm_button_gold",
        size: 128,
        inset: 7,
        radius: 16,
        fillTop: "#ffd56b",
        fillBottom: "#c77a22",
        stroke: "#fff2a8",
        strokeWidth: 3,
        innerStroke: "#7a3f17",
        innerStrokeWidth: 2,
        textColor: "#3a210d",
        hoverTint: 0xfff0ba,
        downTint: 0xffd071,
        slice: 18
    },
    modal: {
        titleFont: "sans-serif",
        titleSize: 34,
        titleColor: "#ffffff",
        messageFont: "sans-serif",
        messageSize: 24,
        messageColor: "#eaf5ff",
        okText: "OK",
        backdropAlpha: 0.58
    }
};

/**
 * @param {unknown} value
 * @returns {any}
 */
function clonePlain(value) {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.slice();
    /** @type {PlainObject} */
    const out = {};
    const objectValue = /** @type {PlainObject} */ (value);
    for (const key of Object.keys(objectValue)) out[key] = clonePlain(objectValue[key]);
    return out;
}

/**
 * @param {PlainObject} base
 * @param {unknown} override
 * @returns {PlainObject}
 */
function mergeTheme(base, override) {
    /** @type {PlainObject} */
    const out = clonePlain(base);
    if (!override || typeof override !== "object") return out;
    const overrideObject = /** @type {PlainObject} */ (override);
    for (const key of Object.keys(overrideObject)) {
        if (overrideObject[key] && typeof overrideObject[key] === "object" && !Array.isArray(overrideObject[key])) {
            out[key] = mergeTheme(out[key] || {}, overrideObject[key]);
        } else {
            out[key] = overrideObject[key];
        }
    }
    return out;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {PlainObject} style
 */
function drawGeneratedPanel(ctx, w, h, style) {
    const inset = style.inset === undefined ? 7 : style.inset;
    const radius = style.radius === undefined ? 15 : style.radius;
    ctx.clearRect(0, 0, w, h);
    ctx.shadowColor = style.shadow || "transparent";
    ctx.shadowBlur = style.shadowBlur || 0;
    ctx.shadowOffsetY = style.shadowOffsetY || 0;
    roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
    const fill = ctx.createLinearGradient(0, inset, 0, h - inset);
    fill.addColorStop(0, style.fillTop || "#305f92");
    fill.addColorStop(1, style.fillBottom || style.fillTop || "#183454");
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = style.strokeWidth === undefined ? 3 : style.strokeWidth;
    ctx.strokeStyle = style.stroke || "#76b8f3";
    ctx.stroke();
    if (style.innerStroke) {
        ctx.lineWidth = style.innerStrokeWidth === undefined ? 1 : style.innerStrokeWidth;
        ctx.strokeStyle = style.innerStroke;
        roundRectPath(ctx, inset + 5, inset + 5, w - (inset + 5) * 2, h - (inset + 5) * 2, Math.max(1, radius - 5));
        ctx.stroke();
    }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {PlainObject} style
 */
function drawGeneratedButton(ctx, w, h, style) {
    drawGeneratedPanel(ctx, w, h, Object.assign({
        shadow: "transparent",
        shadowBlur: 0,
        shadowOffsetY: 0,
        fillTop: "#ffd56b",
        fillBottom: "#c77a22",
        stroke: "#fff2a8",
        innerStroke: "#7a3f17",
        innerStrokeWidth: 2,
        radius: 16
    }, style || {}));
}

export function createUiToolkit() {
    /** @type {Record<string, HTMLCanvasElement>} */
    const generatedUiCanvases = Object.create(null);
    /** @type {PlainObject} */
    let uiTheme = mergeTheme(DEFAULT_UI_THEME, {});

    /**
     * @param {any} scene
     * @param {string} key
     * @param {number} width
     * @param {number} height
     * @param {CanvasTextureDrawer} draw
     * @param {boolean} [force]
     */
    function addCanvasTexture(scene, key, width, height, draw, force) {
        if (scene.textures.exists(key)) {
            if (!force) return;
            if (typeof scene.textures.remove === "function") scene.textures.remove(key);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("GM UI toolkit requires a 2D canvas context.");
        draw(ctx, width, height);
        generatedUiCanvases[key] = canvas;
        scene.textures.addCanvas(key, canvas);
    }

    /**
     * @param {any} scene
     * @param {boolean} [force]
     */
    function ensureTextures(scene, force) {
        const panel = uiTheme.panel || DEFAULT_UI_THEME.panel;
        const button = uiTheme.button || DEFAULT_UI_THEME.button;
        addCanvasTexture(scene, panel.texture || "gm_panel_blue", panel.size || 128, panel.size || 128, (ctx, w, h) => {
            drawGeneratedPanel(ctx, w, h, panel);
        }, force);

        addCanvasTexture(scene, button.texture || "gm_button_gold", button.size || 128, button.size || 128, (ctx, w, h) => {
            drawGeneratedButton(ctx, w, h, button);
        }, force);
    }

    /**
     * @returns {{ key: string, width: number, height: number, mime: string, dataUrl: string }[]}
     */
    function exportTextures() {
        return Object.keys(generatedUiCanvases).map((key) => {
            const canvas = generatedUiCanvases[key];
            return {
                key,
                width: canvas.width,
                height: canvas.height,
                mime: "image/png",
                dataUrl: canvas.toDataURL("image/png")
            };
        });
    }

    /**
     * @param {string} [prefix]
     * @returns {{ key: string, width: number, height: number, mime: string, dataUrl: string }[]}
     */
    function downloadTextures(prefix) {
        const files = exportTextures();
        const namePrefix = prefix || "gm-ui";
        for (const file of files) {
            const link = document.createElement("a");
            link.href = file.dataUrl;
            link.download = `${namePrefix}-${file.key}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
        return files;
    }

    /**
     * @param {any} scene
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {PlainObject} [options]
     * @returns {any}
     */
    function createNineSliceObject(scene, x, y, w, h, options) {
        options = options || {};
        ensureTextures(scene);
        const panel = uiTheme.panel || DEFAULT_UI_THEME.panel;
        const texture = options.texture || panel.texture || "gm_panel_blue";
        const frame = options.frame === undefined ? null : options.frame;
        const left = options.left === undefined ? (panel.slice || 18) : options.left;
        const right = options.right === undefined ? left : options.right;
        const top = options.top === undefined ? (panel.slice || 18) : options.top;
        const bottom = options.bottom === undefined ? top : options.bottom;
        const tileX = !!options.tileX;
        const tileY = !!options.tileY;

        if (scene.add.nineslice) {
            return scene.add.nineslice(x, y, texture, frame, w, h, left, right, top, bottom, tileX, tileY);
        }

        const fallback = scene.add.rectangle(x, y, w, h, toColor(options.fill, panel.fallbackFill), 1);
        fallback.setStrokeStyle(3, toColor(options.stroke, panel.fallbackStroke), 1);
        return fallback;
    }

    /**
     * @param {any} scene
     * @param {string} label
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {((pointer: unknown) => void) | null | undefined} onPress
     * @param {PlainObject} [options]
     * @returns {any}
     */
    function createButton(scene, label, x, y, w, h, onPress, options) {
        options = options || {};
        const container = scene.add.container(x, y);
        const hoverScale = options.hoverScale === undefined ? 1.035 : options.hoverScale;
        const downScale = options.downScale === undefined ? 0.965 : options.downScale;
        const normalTint = options.tint === undefined ? null : toColor(options.tint);
        const buttonTheme = uiTheme.button || DEFAULT_UI_THEME.button;
        const hoverTint = options.hoverTint === undefined ? toColor(buttonTheme.hoverTint, 0xfff0ba) : toColor(options.hoverTint);
        const downTint = options.downTint === undefined ? toColor(buttonTheme.downTint, 0xffd071) : toColor(options.downTint);
        const back = createNineSliceObject(scene, 0, 0, w, h, {
            texture: options.texture || buttonTheme.texture || "gm_button_gold",
            left: options.left === undefined ? (buttonTheme.slice || 18) : options.left,
            right: options.right === undefined ? (buttonTheme.slice || 18) : options.right,
            top: options.top === undefined ? (buttonTheme.slice || 18) : options.top,
            bottom: options.bottom === undefined ? (buttonTheme.slice || 18) : options.bottom
        });
        const text = scene.add.text(0, 0, label, {
            fontFamily: options.font || "sans-serif",
            fontSize: (options.size || 28) + "px",
            fontStyle: "bold",
            color: options.color || buttonTheme.textColor || "#3a210d",
            align: "center",
            resolution: options.resolution || 1
        }).setOrigin(0.5);
        const hitZone = scene.add.zone(0, 0, w, h).setOrigin(0.5);

        container.add([back, text, hitZone]);
        container.setSize(w, h);
        hitZone.setInteractive();
        hitZone.input.cursor = "pointer";

        /** @param {unknown} value */
        const setButtonTint = (value) => {
            if (!back || typeof back.setTint !== "function") return;
            if (value === null && typeof back.clearTint === "function") {
                back.clearTint();
            } else if (value !== null) {
                back.setTint(value);
            }
        };
        /**
         * @param {number} scale
         * @param {unknown} tint
         * @param {number} duration
         * @param {string} ease
         */
        const tweenButton = (scale, tint, duration, ease) => {
            setButtonTint(tint);
            scene.tweens.killTweensOf(container);
            scene.tweens.add({ targets: container, scaleX: scale, scaleY: scale, duration, ease });
        };

        setButtonTint(normalTint);

        /**
         * @param {unknown} pointer
         * @param {unknown} localX
         * @param {unknown} localY
         * @param {unknown} event
         */
        const onPointerOver = (pointer, localX, localY, event) => {
            consumeInputEvent(pointer, event);
            tweenButton(hoverScale, hoverTint, 85, "Quad.Out");
        };
        /**
         * @param {unknown} pointer
         * @param {unknown} localX
         * @param {unknown} localY
         * @param {unknown} event
         */
        const onPointerDown = (pointer, localX, localY, event) => {
            consumeInputEvent(pointer, event);
            if (typeof options.onPointerDown === "function") options.onPointerDown(pointer);
            tweenButton(downScale, downTint, 70, "Quad.Out");
        };
        /**
         * @param {unknown} pointer
         * @param {unknown} localX
         * @param {unknown} localY
         * @param {unknown} event
         */
        const onPointerUp = (pointer, localX, localY, event) => {
            consumeInputEvent(pointer, event);
            if (typeof options.onPointerUp === "function") options.onPointerUp(pointer);
            tweenButton(hoverScale, hoverTint, 90, "Back.Out");
            if (typeof onPress === "function") onPress(pointer);
        };
        /**
         * @param {unknown} pointer
         * @param {unknown} localX
         * @param {unknown} localY
         * @param {unknown} event
         */
        const onPointerOut = (pointer, localX, localY, event) => {
            consumeInputEvent(pointer, event);
            if (typeof options.onPointerCancel === "function") options.onPointerCancel(pointer);
            tweenButton(1, normalTint, 90, "Back.Out");
        };

        hitZone.on("pointerover", onPointerOver);
        hitZone.on("pointerdown", onPointerDown);
        hitZone.on("pointerup", onPointerUp);
        hitZone.on("pointerout", onPointerOut);
        return container;
    }

    return {
        createButton,
        createNineSliceObject,
        downloadTextures,
        ensureTextures,
        exportTextures,
        getModalTheme() {
            return uiTheme.modal || DEFAULT_UI_THEME.modal;
        },
        getTheme() {
            return clonePlain(uiTheme);
        },
        /** @param {unknown} theme */
        setTheme(theme) {
            uiTheme = mergeTheme(uiTheme, theme || {});
            return uiTheme;
        }
    };
}
