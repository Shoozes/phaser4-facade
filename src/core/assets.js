// @ts-check

const RESERVED_FRAME_NAMES = new Set([
    "hasOwnProperty",
    "constructor",
    "__proto__",
    "prototype",
    "toString",
    "valueOf",
    "isPrototypeOf",
    "propertyIsEnumerable",
    "toLocaleString"
]);

/**
 * @param {unknown} key
 * @returns {string}
 */
function normalizeTextureKey(key) {
    const text = String(key || "").trim();
    if (!text) throw new TypeError("GM.asset requires a non-empty texture key.");
    if (RESERVED_FRAME_NAMES.has(text)) {
        throw new TypeError(`GM.asset rejects reserved texture key: ${text}`);
    }
    return text;
}

/**
 * @param {unknown} name
 * @returns {string}
 */
function normalizeFrameName(name) {
    const text = String(name ?? "").trim();
    if (!text) throw new TypeError("GM.asset frame name must be a non-empty string.");
    if (RESERVED_FRAME_NAMES.has(text)) {
        throw new TypeError(`GM.asset rejects reserved frame name: ${text}`);
    }
    return text;
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {number}
 */
function requireFiniteNumber(value, label) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new TypeError(`GM.asset ${label} must be a finite number.`);
    return numeric;
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {number}
 */
function requireNonNegativeInt(value, label) {
    const numeric = requireFiniteNumber(value, label);
    if (!Number.isInteger(numeric) || numeric < 0) {
        throw new TypeError(`GM.asset ${label} must be a non-negative integer.`);
    }
    return numeric;
}

/**
 * Accept plain objects, null-prototype objects, Maps, or frame-entry arrays.
 * Always returns a normal Object with Object.prototype for Phaser parsers.
 * @param {unknown} frames
 * @returns {Record<string, any>}
 */
export function normalizeAtlasFrames(frames) {
    /** @type {Array<[string, any]>} */
    const entries = [];

    if (frames instanceof Map) {
        for (const [name, value] of frames.entries()) entries.push([String(name), value]);
    } else if (Array.isArray(frames)) {
        for (const item of frames) {
            if (Array.isArray(item)) {
                if (item.length < 2) {
                    throw new TypeError("GM.asset.addAtlas frame tuple entries require [name, frame].");
                }
                entries.push([String(item[0]), item[1]]);
                continue;
            }
            if (!item || typeof item !== "object") {
                throw new TypeError("GM.asset.addAtlas frame array entries must be objects.");
            }
            /** @type {any} */
            const row = item;
            const name = row.name ?? row.filename ?? row.key ?? row.frame;
            if (name === undefined || name === null) {
                throw new TypeError("GM.asset.addAtlas frame array entries require name/filename/key.");
            }
            entries.push([String(name), row]);
        }
    } else if (frames && typeof frames === "object") {
        for (const [name, value] of Object.entries(frames)) entries.push([name, value]);
    } else {
        throw new TypeError("GM.asset.addAtlas frames must be an object, Map, or array.");
    }

    /** @type {Record<string, any>} */
    const safe = {};
    const seen = new Set();
    for (const [rawName, rawValue] of entries) {
        const name = normalizeFrameName(rawName);
        if (seen.has(name)) throw new TypeError(`GM.asset.addAtlas duplicate frame: ${name}`);
        seen.add(name);

        /** @type {any} */
        const source = rawValue && typeof rawValue === "object" ? rawValue : {};
        const frame = source.frame && typeof source.frame === "object" ? source.frame : source;
        const x = requireNonNegativeInt(frame.x ?? source.x, `frame ${name}.x`);
        const y = requireNonNegativeInt(frame.y ?? source.y, `frame ${name}.y`);
        const w = requireNonNegativeInt(frame.w ?? frame.width ?? source.w ?? source.width, `frame ${name}.w`);
        const h = requireNonNegativeInt(frame.h ?? frame.height ?? source.h ?? source.height, `frame ${name}.h`);
        if (w <= 0 || h <= 0) throw new TypeError(`GM.asset.addAtlas frame ${name} requires positive size.`);

        /** @type {Record<string, any>} */
        const normalized = {
            frame: { x, y, w, h }
        };

        if (source.rotated === true) normalized.rotated = true;
        if (source.trimmed === true || source.spriteSourceSize || source.sourceSize) {
            normalized.trimmed = true;
            const ss = source.spriteSourceSize || {};
            normalized.spriteSourceSize = {
                x: requireNonNegativeInt(ss.x ?? 0, `frame ${name}.spriteSourceSize.x`),
                y: requireNonNegativeInt(ss.y ?? 0, `frame ${name}.spriteSourceSize.y`),
                w: requireNonNegativeInt(ss.w ?? ss.width ?? w, `frame ${name}.spriteSourceSize.w`),
                h: requireNonNegativeInt(ss.h ?? ss.height ?? h, `frame ${name}.spriteSourceSize.h`)
            };
            const src = source.sourceSize || {};
            normalized.sourceSize = {
                w: requireNonNegativeInt(src.w ?? src.width ?? w, `frame ${name}.sourceSize.w`),
                h: requireNonNegativeInt(src.h ?? src.height ?? h, `frame ${name}.sourceSize.h`)
            };
        }
        if (source.pivot && typeof source.pivot === "object") {
            normalized.pivot = {
                x: requireFiniteNumber(source.pivot.x ?? 0, `frame ${name}.pivot.x`),
                y: requireFiniteNumber(source.pivot.y ?? 0, `frame ${name}.pivot.y`)
            };
        }
        if (source.anchor && typeof source.anchor === "object") {
            normalized.anchor = {
                x: requireFiniteNumber(source.anchor.x ?? 0, `frame ${name}.anchor.x`),
                y: requireFiniteNumber(source.anchor.y ?? 0, `frame ${name}.anchor.y`)
            };
        }
        if (source.meta && typeof source.meta === "object" && !Array.isArray(source.meta)) {
            normalized.meta = source.meta;
        }

        safe[name] = normalized;
    }

    if (Object.keys(safe).length === 0) {
        throw new TypeError("GM.asset.addAtlas requires at least one frame.");
    }
    return safe;
}

/**
 * @param {any} scene
 * @returns {any}
 */
function requireTextures(scene) {
    if (!scene || !scene.textures) {
        throw new Error("GM.asset requires an active Phaser scene with a texture manager.");
    }
    return scene.textures;
}

/**
 * @param {any} textures
 * @param {string} key
 * @param {boolean} replace
 */
function ensureReplaceable(textures, key, replace) {
    if (!textures.exists(key)) return;
    if (!replace) {
        throw new Error(`GM.asset texture already exists: ${key}. Pass { replace: true } to overwrite.`);
    }
    if (typeof textures.remove === "function") textures.remove(key);
}

/**
 * @param {number} width
 * @param {number} height
 * @param {ArrayLike<number> | ArrayBufferView} rgba
 * @param {string} label
 * @returns {HTMLCanvasElement}
 */
function rgbaToCanvas(width, height, rgba, label) {
    const w = requireNonNegativeInt(width, `${label} width`);
    const h = requireNonNegativeInt(height, `${label} height`);
    if (w <= 0 || h <= 0) throw new TypeError(`GM.asset.${label} requires positive width and height.`);
    const expected = w * h * 4;
    const source = rgba && typeof rgba === "object" && "buffer" in /** @type {any} */ (rgba)
        ? new Uint8ClampedArray(/** @type {ArrayBufferView} */ (rgba).buffer, /** @type {ArrayBufferView} */ (rgba).byteOffset, /** @type {ArrayBufferView} */ (rgba).byteLength)
        : new Uint8ClampedArray(/** @type {ArrayLike<number>} */ (rgba));
    if (source.length < expected) {
        throw new TypeError(`GM.asset.${label} expected at least ${expected} bytes, got ${source.length}.`);
    }
    if (typeof document === "undefined" || typeof document.createElement !== "function") {
        throw new Error(`GM.asset.${label} requires a document canvas factory.`);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(`GM.asset.${label} could not create a 2d canvas context.`);
    const imageBytes = new Uint8ClampedArray(expected);
    imageBytes.set(source.subarray(0, expected));
    const imageData = new ImageData(imageBytes, w, h);
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

/**
 * @param {any} scene
 * @param {string} key
 * @param {HTMLCanvasElement | OffscreenCanvas} canvas
 * @param {{ replace?: boolean }} [options]
 */
export function addCanvasTexture(scene, key, canvas, options = {}) {
    const textureKey = normalizeTextureKey(key);
    const textures = requireTextures(scene);
    if (!canvas || typeof canvas !== "object") {
        throw new TypeError("GM.asset.addCanvas requires a canvas.");
    }
    ensureReplaceable(textures, textureKey, options.replace === true);
    if (typeof textures.addCanvas !== "function") {
        throw new Error("Phaser textures.addCanvas is unavailable.");
    }
    const texture = textures.addCanvas(textureKey, canvas);
    return {
        key: textureKey,
        texture,
        width: Number(/** @type {any} */ (canvas).width) || 0,
        height: Number(/** @type {any} */ (canvas).height) || 0,
        frames: ["__BASE"]
    };
}

/**
 * @param {any} scene
 * @param {string} key
 * @param {number} width
 * @param {number} height
 * @param {ArrayLike<number> | ArrayBufferView} rgba
 * @param {{ replace?: boolean }} [options]
 */
export function addRgbaTexture(scene, key, width, height, rgba, options = {}) {
    const canvas = rgbaToCanvas(width, height, rgba, "addRgba");
    return addCanvasTexture(scene, key, canvas, options);
}

/**
 * @param {any} scene
 * @param {string} key
 * @param {HTMLCanvasElement | OffscreenCanvas | string | { width: number, height: number, rgba: ArrayLike<number> | ArrayBufferView }} source
 * @param {unknown} frames
 * @param {{ replace?: boolean }} [options]
 */
export function addAtlasTexture(scene, key, source, frames, options = {}) {
    const textureKey = normalizeTextureKey(key);
    const textures = requireTextures(scene);
    const safeFrames = normalizeAtlasFrames(frames);
    ensureReplaceable(textures, textureKey, options.replace === true);

    let atlasSource = source;
    if (typeof source === "string") {
        if (!textures.exists(source)) {
            throw new Error(`GM.asset.addAtlas source texture not found: ${source}`);
        }
        const base = textures.get(source);
        const baseSource = base?.source?.[0]?.image || base?.source?.[0]?.source;
        if (!baseSource) {
            throw new Error(`GM.asset.addAtlas source texture has no image source: ${source}`);
        }
        atlasSource = baseSource;
    }

    if (atlasSource && typeof atlasSource === "object" && "rgba" in atlasSource) {
        const rgbaSource = /** @type {{ width: number, height: number, rgba: ArrayLike<number> | ArrayBufferView }} */ (atlasSource);
        atlasSource = rgbaToCanvas(rgbaSource.width, rgbaSource.height, rgbaSource.rgba, "addAtlas");
    }

    if (!atlasSource || typeof atlasSource !== "object") {
        throw new TypeError("GM.asset.addAtlas source must be a canvas, RGBA source, or existing texture key.");
    }

    try {
        if (typeof textures.addAtlasJSONHash !== "function") {
            throw new Error("Phaser textures.addAtlasJSONHash is unavailable.");
        }
        const data = {
            frames: safeFrames,
            meta: { scale: "1" }
        };
        const texture = textures.addAtlasJSONHash(textureKey, atlasSource, data);
        if (!texture) {
            throw new Error(`Phaser could not register atlas texture: ${textureKey}`);
        }
        /** @type {Record<string, any>} */
        const frameMeta = {};
        for (const [name, frame] of Object.entries(safeFrames)) {
            frameMeta[name] = {
                width: frame.frame.w,
                height: frame.frame.h,
                sourceWidth: frame.sourceSize ? frame.sourceSize.w : frame.frame.w,
                sourceHeight: frame.sourceSize ? frame.sourceSize.h : frame.frame.h,
                pivot: frame.pivot || null,
                meta: frame.meta || null
            };
        }
        texture.customData = Object.assign({}, texture.customData, { gmFrameMeta: frameMeta });
        return {
            key: textureKey,
            texture,
            frames: Object.keys(safeFrames),
            frameCount: Object.keys(safeFrames).length,
            width: Number(/** @type {any} */ (atlasSource).width) || 0,
            height: Number(/** @type {any} */ (atlasSource).height) || 0,
            source: typeof source === "string" ? source : undefined
        };
    } catch (error) {
        if (typeof textures.remove === "function" && textures.exists(textureKey)) {
            textures.remove(textureKey);
        }
        throw error;
    }
}

/**
 * @param {any} scene
 * @param {string} key
 */
export function removeTexture(scene, key) {
    const textureKey = normalizeTextureKey(key);
    const textures = requireTextures(scene);
    if (!textures.exists(textureKey)) return false;
    if (typeof textures.remove === "function") textures.remove(textureKey);
    return true;
}

/**
 * @param {any} scene
 * @param {string} key
 */
export function textureExists(scene, key) {
    const textureKey = String(key || "").trim();
    if (!textureKey) return false;
    const textures = requireTextures(scene);
    return Boolean(textures.exists(textureKey));
}

/**
 * @param {any} scene
 * @param {string} key
 * @param {string | number} frame
 */
export function textureFrameExists(scene, key, frame) {
    if (!textureExists(scene, key)) return false;
    const textures = requireTextures(scene);
    const texture = textures.get(String(key).trim());
    if (!texture) return false;
    if (typeof texture.has === "function") return texture.has(frame);
    if (typeof texture.hasFrame === "function") return texture.hasFrame(frame);
    try {
        return Boolean(texture.get && texture.get(frame));
    } catch {
        return false;
    }
}

/**
 * @param {any} scene
 * @param {string} key
 */
export function getFrameNames(scene, key) {
    const textureKey = normalizeTextureKey(key);
    const textures = requireTextures(scene);
    if (!textures.exists(textureKey)) {
        throw new Error(`GM.asset.frameNames texture not found: ${textureKey}`);
    }
    const texture = textures.get(textureKey);
    const stored = texture?.customData?.gmFrameMeta;
    if (stored && typeof stored === "object") return Object.keys(stored);
    if (texture && typeof texture.getFrameNames === "function") {
        return texture.getFrameNames().filter((/** @type {string} */ name) => name && name !== "__BASE");
    }
    return [];
}

/**
 * @param {any} scene
 * @param {string} key
 * @param {string | number} [frame]
 */
export function getFrameInfo(scene, key, frame) {
    const textureKey = normalizeTextureKey(key);
    const textures = requireTextures(scene);
    if (!textures.exists(textureKey)) {
        throw new Error(`GM.asset.frameInfo texture not found: ${textureKey}`);
    }
    const texture = textures.get(textureKey);
    const frameName = frame === undefined || frame === null || frame === "" ? "__BASE" : String(frame);
    const stored = texture?.customData?.gmFrameMeta?.[frameName] || null;
    /** @type {any} */
    let phaserFrame = null;
    if (texture && typeof texture.get === "function") {
        try {
            phaserFrame = texture.get(frameName === "__BASE" ? texture.firstFrame || "__BASE" : frameName);
        } catch {
            phaserFrame = null;
        }
    }
    if (!stored && !phaserFrame) {
        throw new Error(`GM.asset.frameInfo frame not found: ${textureKey}:${frameName}`);
    }
    const width = Number(phaserFrame?.cutWidth ?? phaserFrame?.width ?? stored?.width ?? 0);
    const height = Number(phaserFrame?.cutHeight ?? phaserFrame?.height ?? stored?.height ?? 0);
    const sourceWidth = Number(phaserFrame?.sourceSize?.w ?? stored?.sourceWidth ?? width);
    const sourceHeight = Number(phaserFrame?.sourceSize?.h ?? stored?.sourceHeight ?? height);
    return {
        name: frameName,
        width,
        height,
        sourceWidth,
        sourceHeight,
        pivot: stored?.pivot || null,
        meta: stored?.meta || null
    };
}

/**
 * @param {any} scene
 * @param {string} key
 * @param {string | number} [frame]
 */
export function getFrameSize(scene, key, frame) {
    const info = getFrameInfo(scene, key, frame);
    return { width: info.width, height: info.height, sourceWidth: info.sourceWidth, sourceHeight: info.sourceHeight };
}
