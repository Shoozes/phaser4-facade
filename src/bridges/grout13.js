// @ts-check

const BRIDGE_MARKER = Symbol.for("phaser4-facade.grout13.bridge");
const PIXEL_PRESET = Object.freeze({
    strict: true,
    runtimeTarget: "canvas",
    runtimeDrawMode: "row",
    runtimeFrameMode: "object",
    atlasOptions: Object.freeze({
        layout: "packed",
        padding: 1,
        extrude: 1,
        trim: false,
        maxWidth: 256,
        maxHeight: 256
    })
});

function requireObject(value, label) {
    if (!value || typeof value !== "object") {
        throw new TypeError(`${label} must be an object.`);
    }
    return value;
}

function requireFunction(value, label) {
    if (typeof value !== "function") {
        throw new TypeError(`${label} must be a function.`);
    }
    return value;
}

function requireKey(key) {
    const normalized = String(key || "").trim();
    if (!normalized) throw new TypeError("Grout13 asset key must be a non-empty string.");
    return normalized;
}

function assertOptions(value, label) {
    if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value))) {
        throw new TypeError(`${label} must be an object.`);
    }
    return value || {};
}

function assetOptions(options) {
    const candidate = assertOptions(options.assetOptions, "Grout13 assetOptions");
    return {
        ...candidate,
        ...(options.replace === undefined ? {} : { replace: options.replace === true })
    };
}

function decodeOptions(options) {
    return assertOptions(options.decodeOptions, "Grout13 decodeOptions");
}

function compileOptions(options) {
    const candidate = assertOptions(options.compileOptions, "Grout13 compileOptions");
    if (options.preset === undefined) return { ...candidate };
    if (options.preset !== "pixel") throw new TypeError(`Unsupported Grout13 preset: ${String(options.preset)}.`);
    return {
        ...PIXEL_PRESET,
        ...candidate,
        atlasOptions: {
            ...PIXEL_PRESET.atlasOptions,
            ...assertOptions(candidate.atlasOptions, "Grout13 compileOptions.atlasOptions")
        }
    };
}

function directCompileOptions(options) {
    if (options && typeof options === "object" && (Object.prototype.hasOwnProperty.call(options, "compileOptions") || Object.prototype.hasOwnProperty.call(options, "preset"))) {
        return compileOptions(options);
    }
    return assertOptions(options, "Grout13 compile options");
}

function resolveFrames(decoded) {
    const frames = decoded.frames;
    if (!frames || typeof frames !== "object") {
        throw new Error("Grout13 decoded atlas is missing frames.");
    }
    if (frames instanceof Map) {
        if (frames.size === 0) throw new Error("Grout13 decoded atlas has no frames.");
        return frames;
    }
    if (Array.isArray(frames) && frames.length > 0) return frames;
    if (Object.keys(frames).length === 0) {
        throw new Error("Grout13 decoded atlas has no frames.");
    }
    return frames;
}

function resolveSource(decoded) {
    const source = decoded.canvas || decoded.image || decoded.source;
    if (source && typeof source === "object") return source;
    if (decoded.rgba && decoded.width && decoded.height) {
        return { width: decoded.width, height: decoded.height, rgba: decoded.rgba };
    }
    throw new Error("Grout13 decoded atlas is missing a canvas or RGBA source.");
}

function frameName(frame, fallback) {
    const name = frame?.name ?? frame?.filename ?? frame?.key ?? frame?.sourceName ?? fallback;
    const normalized = String(name ?? "").trim();
    if (!normalized) throw new Error(`Grout13 compiled frame ${fallback} is missing a name.`);
    return normalized;
}

function toFrameRecord(frame) {
    const source = frame && typeof frame === "object" ? frame : {};
    const geometry = source.frame && typeof source.frame === "object" ? source.frame : source;
    const result = {
        x: geometry.x,
        y: geometry.y,
        w: geometry.w ?? geometry.width,
        h: geometry.h ?? geometry.height
    };
    const sourceWidth = source.sourceWidth ?? source.sourceSize?.w ?? source.sourceSize?.width;
    const sourceHeight = source.sourceHeight ?? source.sourceSize?.h ?? source.sourceSize?.height;
    const trim = source.trim || source.spriteSourceSize;
    if (sourceWidth !== undefined || sourceHeight !== undefined) {
        result.sourceSize = { w: sourceWidth, h: sourceHeight };
    }
    if (trim && typeof trim === "object") {
        result.trimmed = true;
        result.spriteSourceSize = {
            x: trim.x ?? 0,
            y: trim.y ?? 0,
            w: trim.w ?? trim.width ?? result.w,
            h: trim.h ?? trim.height ?? result.h
        };
    }
    if (source.pivot && typeof source.pivot === "object") result.pivot = { ...source.pivot };
    return result;
}

function frameMapFromCompiled(compiled) {
    const frameRows = Array.isArray(compiled.frames)
        ? compiled.frames
        : Array.isArray(compiled.atlas?.frames) ? compiled.atlas.frames : null;
    if (frameRows && frameRows.length > 0) {
        const names = Array.isArray(compiled.frameOrder) ? compiled.frameOrder : [];
        const frameMap = Object.create(null);
        for (let index = 0; index < frameRows.length; index += 1) {
            const row = frameRows[index];
            frameMap[frameName(row, names[index] ?? index)] = toFrameRecord(row);
        }
        return frameMap;
    }
    if (compiled.frameMap && typeof compiled.frameMap === "object") return compiled.frameMap;
    throw new Error("Grout13 compiled atlas is missing frame metadata.");
}

function frameMapNames(frames) {
    if (frames instanceof Map) return Array.from(frames.keys(), (name) => String(name));
    return Object.keys(frames);
}

function payloadBytes(payload, compiled, grout13) {
    const direct = compiled?.bytes?.payload;
    if (Number.isFinite(Number(direct))) return Number(direct);
    if (typeof grout13.getGrout13PayloadBytes === "function") {
        const measured = grout13.getGrout13PayloadBytes(payload);
        if (Number.isFinite(Number(measured))) return Number(measured);
    }
    const text = JSON.stringify(payload);
    if (typeof TextEncoder === "function") return new TextEncoder().encode(text).byteLength;
    return unescape(encodeURIComponent(text)).length;
}

function compiledSource(compiled) {
    const atlas = compiled?.atlas;
    if (!atlas || typeof atlas !== "object") return null;
    if (!atlas.rgba || !Number.isFinite(Number(atlas.width)) || !Number.isFinite(Number(atlas.height))) return null;
    return { width: Number(atlas.width), height: Number(atlas.height), rgba: atlas.rgba };
}

function createBridge(gm, grout13) {
    const asset = requireObject(gm.asset, "GM.asset");
    const addAtlas = requireFunction(asset.addAtlas, "GM.asset.addAtlas");
    const frameExists = requireFunction(asset.frameExists, "GM.asset.frameExists");
    const compile = requireFunction(grout13.compileGrout13Atlas, "GROUT13.compileGrout13Atlas");
    const decode = requireFunction(grout13.decodeGrout13Atlas, "GROUT13.decodeGrout13Atlas");

    function register(key, source, frames, options = {}, metadata = {}) {
        const normalizedKey = requireKey(key);
        const frameNames = frameMapNames(frames);
        let assetRecord;
        let registered = false;
        try {
            assetRecord = addAtlas(normalizedKey, source, frames, assetOptions(options));
            registered = true;
            const missing = frameNames.filter((name) => !frameExists(normalizedKey, name));
            if (missing.length > 0) {
                throw new Error(`Grout13 atlas registration is missing frames: ${missing.join(", ")}`);
            }
        } catch (error) {
            if (registered && typeof asset.remove === "function") {
                try { asset.remove(normalizedKey); } catch { /* preserve the registration error */ }
            }
            throw error;
        }
        const frameMap = frames instanceof Map ? Object.fromEntries(frames.entries()) : frames;
        const hasFrame = (frame) => frameExists(normalizedKey, frame);
        return {
            key: normalizedKey,
            width: Number(metadata.width ?? source.width) || 0,
            height: Number(metadata.height ?? source.height) || 0,
            frameNames,
            frameCount: frameNames.length,
            frameMap,
            payload: metadata.payload,
            payloadBytes: metadata.payload === undefined ? 0 : payloadBytes(metadata.payload, metadata.compiled, grout13),
            runtimeContract: metadata.compiled?.runtimeContract,
            asset: assetRecord,
            hasFrame,
            decoded: metadata.decoded,
            source,
            frames: frameMap
        };
    }

    function registerDecoded(key, decoded, options = {}, payload) {
        requireObject(decoded, "Grout13 decoded atlas");
        const source = resolveSource(decoded);
        const frames = resolveFrames(decoded);
        return register(key, source, frames, options, {
            decoded,
            payload,
            width: decoded.width,
            height: decoded.height
        });
    }

    function registerCompiled(key, compiled, options = {}) {
        requireObject(compiled, "Grout13 compiled atlas");
        const payload = compiled.payload;
        let frames;
        try {
            frames = frameMapFromCompiled(compiled);
        } catch (error) {
            if (!Array.isArray(payload)) throw error;
        }
        let decoded = null;
        let source = compiledSource(compiled);
        if (!frames || !source) {
            if (!Array.isArray(payload)) throw new Error("Grout13 compiled atlas requires payload or direct RGBA atlas data.");
            decoded = decode(payload, decodeOptions(options));
            frames = frames || resolveFrames(decoded);
            source = source || resolveSource(decoded);
        }
        if (!source) throw new Error("Grout13 compiled atlas source could not be resolved.");
        if (!decoded) {
            decoded = {
                width: source.width,
                height: source.height,
                rgba: source.rgba,
                frames
            };
        }
        return register(key, source, frames, options, {
            compiled,
            decoded,
            payload,
            width: source.width,
            height: source.height
        });
    }

    /** @type {Map<string, any>} */
    const fonts = new Map();

    return Object.freeze({
        compile(assets, options = {}) {
            return compile(assets, directCompileOptions(options));
        },
        addPayload(key, payload, options = {}) {
            const decoded = decode(payload, decodeOptions(options));
            return registerDecoded(key, decoded, options, payload);
        },
        addCompiled(key, compiled, options = {}) {
            return registerCompiled(key, compiled, options);
        },
        addAtlas(key, assets, options = {}) {
            const compiled = compile(assets, compileOptions(options));
            const added = registerCompiled(key, compiled, options);
            return { ...added, compiled, payload: compiled.payload };
        },
        /**
         * @param {string} name
         * @param {any} font
         * @param {{ atlasKey?: string, replace?: boolean }} [options]
         */
        addFont(name, font, options = {}) {
            const fontName = requireKey(name);
            requireObject(font, "Grout13 compiled font");
            requireObject(font.metrics, "Grout13 compiled font.metrics");
            requireObject(font.glyphs, "Grout13 compiled font.glyphs");
            if (!font.compiled && !font.atlas) {
                throw new TypeError("GM.grout13.addFont requires compiled atlas data.");
            }
            const atlasKey = options.atlasKey ? requireKey(options.atlasKey) : `grout13-font-${fontName}`;
            const added = font.compiled
                ? registerCompiled(atlasKey, font.compiled, options)
                : register(atlasKey, font.atlas, font.atlas.frames || {}, options, { width: font.atlas.width, height: font.atlas.height });
            const record = {
                name: fontName,
                atlasKey,
                glyphs: font.glyphs,
                metrics: font.metrics,
                compiled: font.compiled || null,
                added
            };
            fonts.set(fontName, record);
            return record;
        },
        /**
         * @param {string} name
         */
        getFont(name) {
            return fonts.get(requireKey(name)) || null;
        },
        [BRIDGE_MARKER]: grout13
    });
}

/**
 * Install the optional Grout13 bridge onto one facade instance. Grout13 is
 * injected by the consumer and is never imported by the core runtime.
 *
 * @param {any} gm
 * @param {any} grout13
 */
export function installGrout13Bridge(gm, grout13) {
    requireObject(gm, "GM");
    requireObject(grout13, "GROUT13");

    const existing = gm.grout13;
    if (existing !== undefined) {
        if (existing && existing[BRIDGE_MARKER] === grout13) return existing;
        throw new Error("GM.grout13 is already installed with a different bridge.");
    }

    const bridge = createBridge(gm, grout13);
    try {
        Object.defineProperty(gm, "grout13", {
            configurable: false,
            enumerable: true,
            value: bridge,
            writable: false
        });
    } catch (error) {
        throw new Error(`Unable to install GM.grout13: ${error instanceof Error ? error.message : String(error)}`);
    }
    return bridge;
}
