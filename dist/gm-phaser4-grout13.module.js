// @ts-check

const BRIDGE_MARKER = Symbol.for("phaser4-facade.grout13.bridge");

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

function resolveFrames(decoded) {
    const frames = decoded.frames;
    if (!frames || typeof frames !== "object") {
        throw new Error("Grout13 decoded atlas is missing frames.");
    }
    if (frames instanceof Map) {
        if (frames.size === 0) throw new Error("Grout13 decoded atlas has no frames.");
        return frames;
    }
    if (Object.keys(frames).length === 0) {
        throw new Error("Grout13 decoded atlas has no frames.");
    }
    return frames;
}

function resolveSource(decoded) {
    const source = decoded.canvas || decoded.image || decoded.source;
    if (!source || typeof source !== "object") {
        throw new Error("Grout13 decoded atlas is missing a canvas source.");
    }
    return source;
}

function assetOptions(options) {
    const candidate = options.assetOptions;
    if (candidate !== undefined && (!candidate || typeof candidate !== "object")) {
        throw new TypeError("Grout13 assetOptions must be an object.");
    }
    return {
        ...(candidate || {}),
        ...(options.replace === undefined ? {} : { replace: options.replace === true })
    };
}

function decodeOptions(options) {
    const candidate = options.decodeOptions;
    if (candidate !== undefined && (!candidate || typeof candidate !== "object")) {
        throw new TypeError("Grout13 decodeOptions must be an object.");
    }
    return candidate || {};
}

function compileOptions(options) {
    const candidate = options.compileOptions;
    if (candidate !== undefined && (!candidate || typeof candidate !== "object")) {
        throw new TypeError("Grout13 compileOptions must be an object.");
    }
    return candidate || {};
}

function createBridge(gm, grout13) {
    const asset = requireObject(gm.asset, "GM.asset");
    const addAtlas = requireFunction(asset.addAtlas, "GM.asset.addAtlas");
    const compile = requireFunction(grout13.compileGrout13Atlas, "GROUT13.compileGrout13Atlas");
    const decode = requireFunction(grout13.decodeGrout13Atlas, "GROUT13.decodeGrout13Atlas");

    function registerDecoded(key, decoded, options = {}) {
        requireObject(decoded, "Grout13 decoded atlas");
        const source = resolveSource(decoded);
        const frames = resolveFrames(decoded);
        const assetRecord = addAtlas(key, source, frames, assetOptions(options));
        return { key, asset: assetRecord, decoded, source, frames };
    }

    return Object.freeze({
        compile(assets, options = {}) {
            return compile(assets, options);
        },
        addPayload(key, payload, options = {}) {
            const decoded = decode(payload, decodeOptions(options));
            return registerDecoded(key, decoded, options);
        },
        addAtlas(key, assets, options = {}) {
            const compiled = compile(assets, compileOptions(options));
            const added = registerDecoded(key, decode(compiled.payload, decodeOptions(options)), options);
            return { ...added, compiled, payload: compiled.payload };
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
function installGrout13Bridge(gm, grout13) {
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


export { installGrout13Bridge };
