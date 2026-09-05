(() => {
  // phaser4-facade-runtime:src/core/cleanup.js
  function addRuntimeCleanup(state, fn) {
    if (typeof fn === "function") state.cleanup.push(fn);
    return fn;
  }

  // phaser4-facade-runtime:src/core/assets.js
  var RESERVED_FRAME_NAMES = /* @__PURE__ */ new Set([
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
  function normalizeTextureKey(key) {
    const text = String(key || "").trim();
    if (!text) throw new TypeError("GM.asset requires a non-empty texture key.");
    if (RESERVED_FRAME_NAMES.has(text)) {
      throw new TypeError(`GM.asset rejects reserved texture key: ${text}`);
    }
    return text;
  }
  function normalizeFrameName(name) {
    const text = String(name ?? "").trim();
    if (!text) throw new TypeError("GM.asset frame name must be a non-empty string.");
    if (RESERVED_FRAME_NAMES.has(text)) {
      throw new TypeError(`GM.asset rejects reserved frame name: ${text}`);
    }
    return text;
  }
  function requireFiniteNumber(value, label) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new TypeError(`GM.asset ${label} must be a finite number.`);
    return numeric;
  }
  function requireNonNegativeInt(value, label) {
    const numeric = requireFiniteNumber(value, label);
    if (!Number.isInteger(numeric) || numeric < 0) {
      throw new TypeError(`GM.asset ${label} must be a non-negative integer.`);
    }
    return numeric;
  }
  function normalizeAtlasFrames(frames) {
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
        const row = item;
        const name = row.name ?? row.filename ?? row.key ?? row.frame;
        if (name === void 0 || name === null) {
          throw new TypeError("GM.asset.addAtlas frame array entries require name/filename/key.");
        }
        entries.push([String(name), row]);
      }
    } else if (frames && typeof frames === "object") {
      for (const [name, value] of Object.entries(frames)) entries.push([name, value]);
    } else {
      throw new TypeError("GM.asset.addAtlas frames must be an object, Map, or array.");
    }
    const safe = {};
    const seen = /* @__PURE__ */ new Set();
    for (const [rawName, rawValue] of entries) {
      const name = normalizeFrameName(rawName);
      if (seen.has(name)) throw new TypeError(`GM.asset.addAtlas duplicate frame: ${name}`);
      seen.add(name);
      const source = rawValue && typeof rawValue === "object" ? rawValue : {};
      const frame = source.frame && typeof source.frame === "object" ? source.frame : source;
      const x = requireNonNegativeInt(frame.x ?? source.x, `frame ${name}.x`);
      const y = requireNonNegativeInt(frame.y ?? source.y, `frame ${name}.y`);
      const w = requireNonNegativeInt(frame.w ?? frame.width ?? source.w ?? source.width, `frame ${name}.w`);
      const h = requireNonNegativeInt(frame.h ?? frame.height ?? source.h ?? source.height, `frame ${name}.h`);
      if (w <= 0 || h <= 0) throw new TypeError(`GM.asset.addAtlas frame ${name} requires positive size.`);
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
  function requireTextures(scene) {
    if (!scene || !scene.textures) {
      throw new Error("GM.asset requires an active Phaser scene with a texture manager.");
    }
    return scene.textures;
  }
  function ensureReplaceable(textures, key, replace) {
    if (!textures.exists(key)) return;
    if (!replace) {
      throw new Error(`GM.asset texture already exists: ${key}. Pass { replace: true } to overwrite.`);
    }
    if (typeof textures.remove === "function") textures.remove(key);
  }
  function rgbaToCanvas(width, height, rgba, label) {
    const w = requireNonNegativeInt(width, `${label} width`);
    const h = requireNonNegativeInt(height, `${label} height`);
    if (w <= 0 || h <= 0) throw new TypeError(`GM.asset.${label} requires positive width and height.`);
    const expected = w * h * 4;
    const source = rgba && typeof rgba === "object" && "buffer" in /** @type {any} */
    rgba ? new Uint8ClampedArray(
      /** @type {ArrayBufferView} */
      rgba.buffer,
      /** @type {ArrayBufferView} */
      rgba.byteOffset,
      /** @type {ArrayBufferView} */
      rgba.byteLength
    ) : new Uint8ClampedArray(
      /** @type {ArrayLike<number>} */
      rgba
    );
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
  function addAtlasTexture(scene, key, source, frames, options = {}) {
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
      const rgbaSource = (
        /** @type {{ width: number, height: number, rgba: ArrayLike<number> | ArrayBufferView }} */
        atlasSource
      );
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
        width: Number(
          /** @type {any} */
          atlasSource.width
        ) || 0,
        height: Number(
          /** @type {any} */
          atlasSource.height
        ) || 0,
        source: typeof source === "string" ? source : void 0
      };
    } catch (error) {
      if (typeof textures.remove === "function" && textures.exists(textureKey)) {
        textures.remove(textureKey);
      }
      throw error;
    }
  }
  function removeTexture(scene, key) {
    const textureKey = normalizeTextureKey(key);
    const textures = requireTextures(scene);
    if (!textures.exists(textureKey)) return false;
    if (typeof textures.remove === "function") textures.remove(textureKey);
    return true;
  }
  function textureExists(scene, key) {
    const textureKey = String(key || "").trim();
    if (!textureKey) return false;
    const textures = requireTextures(scene);
    return Boolean(textures.exists(textureKey));
  }
  function textureFrameExists(scene, key, frame) {
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

  // phaser4-facade-runtime:src/bridges/grout13.js
  var BRIDGE_MARKER = Symbol.for("phaser4-facade.grout13.bridge");
  var PIXEL_PRESET = Object.freeze({
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
    if (value !== void 0 && (!value || typeof value !== "object" || Array.isArray(value))) {
      throw new TypeError(`${label} must be an object.`);
    }
    return value || {};
  }
  function assetOptions(options) {
    const candidate = assertOptions(options.assetOptions, "Grout13 assetOptions");
    return {
      ...candidate,
      ...options.replace === void 0 ? {} : { replace: options.replace === true }
    };
  }
  function decodeOptions(options) {
    return assertOptions(options.decodeOptions, "Grout13 decodeOptions");
  }
  function compileOptions(options) {
    const candidate = assertOptions(options.compileOptions, "Grout13 compileOptions");
    if (options.preset === void 0) return { ...candidate };
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
    if (sourceWidth !== void 0 || sourceHeight !== void 0) {
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
    const frameRows = Array.isArray(compiled.frames) ? compiled.frames : Array.isArray(compiled.atlas?.frames) ? compiled.atlas.frames : null;
    if (frameRows && frameRows.length > 0) {
      const names = Array.isArray(compiled.frameOrder) ? compiled.frameOrder : [];
      const frameMap = /* @__PURE__ */ Object.create(null);
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
  function validateFontGlyphs(glyphs, frameNames, fontName) {
    const available = new Set(frameNames);
    const missing = Object.keys(glyphs).filter((name) => !available.has(name));
    if (missing.length > 0) {
      throw new Error(`Grout13 font ${fontName} references missing atlas frames: ${missing.join(", ")}`);
    }
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
    const compile = typeof grout13.compileGrout13Atlas === "function" ? grout13.compileGrout13Atlas : null;
    const decode = requireFunction(grout13.decodeGrout13Atlas, "GROUT13.decodeGrout13Atlas");
    const registrations = /* @__PURE__ */ new Map();
    const hookedOwners = /* @__PURE__ */ new WeakSet();
    function resolveAssetContext() {
      const owner = gm._active;
      if (!owner || owner.state?.cleanedUp) {
        throw new Error("GM.grout13 requires an active GM runtime.");
      }
      const scene = owner.scene;
      const textures = scene?.textures;
      if (!scene || !textures) {
        throw new Error("GM.grout13 requires an active runtime with a Phaser texture manager.");
      }
      if (typeof textures.exists !== "function" || typeof textures.get !== "function") {
        throw new Error("GM.grout13 requires a compatible Phaser texture manager.");
      }
      return {
        owner,
        scene,
        textureManager: textures,
        addAtlas(key, source, frames, options) {
          return addAtlasTexture(scene, key, source, frames, options);
        },
        frameExists(key, frame) {
          return textureFrameExists(scene, key, frame);
        },
        remove(key) {
          return removeTexture(scene, key);
        }
      };
    }
    function isLive(record) {
      if (!record || record.invalidated || record.owner !== gm._active || record.owner.state?.cleanedUp) return false;
      if (record.textureManager !== record.owner.scene?.textures) return false;
      try {
        return record.textureManager.get(record.key) === record.texture;
      } catch {
        return false;
      }
    }
    function invalidateRecord(record) {
      if (!record) return;
      record.invalidated = true;
      if (registrations.get(record.key) === record) registrations.delete(record.key);
    }
    function ensureOwnerCleanup(owner) {
      if (hookedOwners.has(owner)) return;
      hookedOwners.add(owner);
      addRuntimeCleanup(owner.state, () => {
        for (const record of registrations.values()) {
          if (record.owner === owner) invalidateRecord(record);
        }
        for (const font of fonts.values()) {
          if (font.owner === owner) {
            font.invalidated = true;
            if (fonts.get(font.name) === font) fonts.delete(font.name);
          }
        }
      });
    }
    function register(key, source, frames, options = {}, metadata = {}) {
      const normalizedKey = requireKey(key);
      const context = resolveAssetContext();
      const frameNames = frameMapNames(frames);
      let previous = registrations.get(normalizedKey) || null;
      if (previous && !isLive(previous)) {
        invalidateRecord(previous);
        previous = null;
      }
      if (previous && options.replace !== true) throw new Error(`Grout13 atlas ${normalizedKey} already exists; pass replace: true to replace it.`);
      let assetRecord;
      let registered = false;
      try {
        assetRecord = context.addAtlas(normalizedKey, source, frames, assetOptions(options));
        registered = true;
        const missing = frameNames.filter((name) => !context.frameExists(normalizedKey, name));
        if (missing.length > 0) {
          throw new Error(`Grout13 atlas registration is missing frames: ${missing.join(", ")}`);
        }
      } catch (error) {
        if (registered) {
          try {
            context.remove(normalizedKey);
          } catch {
          }
        }
        if (previous) {
          try {
            const restored = context.addAtlas(normalizedKey, previous.source, previous.frames, {
              ...previous.assetOptions,
              replace: true
            });
            if (!restored || !context.frameExists(normalizedKey, previous.frameNames[0])) {
              throw new Error("restored atlas failed frame validation");
            }
            previous.texture = restored.texture;
            previous.asset = restored;
            previous.textureManager = context.textureManager;
            registrations.set(normalizedKey, previous);
          } catch {
            invalidateRecord(previous);
          }
        }
        throw error;
      }
      const frameMap = frames instanceof Map ? Object.fromEntries(frames.entries()) : frames;
      const record = {
        key: normalizedKey,
        owner: context.owner,
        scene: context.scene,
        textureManager: context.textureManager,
        texture: assetRecord?.texture,
        invalidated: false,
        width: Number(metadata.width ?? source.width) || 0,
        height: Number(metadata.height ?? source.height) || 0,
        frameNames,
        frameCount: frameNames.length,
        frameMap,
        payload: metadata.payload,
        payloadBytes: metadata.payload === void 0 ? 0 : payloadBytes(metadata.payload, metadata.compiled, grout13),
        runtimeContract: metadata.compiled?.runtimeContract,
        asset: assetRecord,
        hasFrame: (frame) => isLive(record) && context.frameExists(normalizedKey, frame),
        decoded: metadata.decoded,
        source,
        frames: frameMap,
        assetOptions: assetOptions(options),
        dispose() {
          if (registrations.get(normalizedKey) !== record) return false;
          if (!isLive(record)) {
            invalidateRecord(record);
            return false;
          }
          registrations.delete(normalizedKey);
          record.invalidated = true;
          return context.remove(normalizedKey);
        }
      };
      ensureOwnerCleanup(context.owner);
      registrations.set(normalizedKey, record);
      return record;
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
    const fonts = /* @__PURE__ */ new Map();
    return Object.freeze({
      compile(assets, options = {}) {
        if (!compile) throw new Error("Grout13 compiler capability is unavailable; use addPayload().");
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
        if (!compile) throw new Error("Grout13 compiler capability is unavailable; use addPayload().");
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
        const previous = fonts.get(fontName) || null;
        if (fonts.has(fontName) && options.replace !== true) throw new Error(`Grout13 font ${fontName} already exists; pass replace: true to replace it.`);
        requireObject(font, "Grout13 compiled font");
        requireObject(font.metrics, "Grout13 compiled font.metrics");
        requireObject(font.glyphs, "Grout13 compiled font.glyphs");
        if (!font.compiled && !font.atlas) {
          throw new TypeError("GM.grout13.addFont requires compiled atlas data.");
        }
        const knownFrames = font.compiled ? frameMapNames(frameMapFromCompiled(font.compiled)) : frameMapNames(resolveFrames(font.atlas));
        validateFontGlyphs(font.glyphs, knownFrames, fontName);
        const atlasKey = options.atlasKey ? requireKey(options.atlasKey) : `grout13-font-${fontName}`;
        const added = font.compiled ? registerCompiled(atlasKey, font.compiled, options) : register(atlasKey, font.atlas, font.atlas.frames || {}, options, { width: font.atlas.width, height: font.atlas.height });
        const record = {
          name: fontName,
          atlasKey,
          glyphs: font.glyphs,
          metrics: font.metrics,
          compiled: font.compiled || null,
          added,
          dispose() {
            if (fonts.get(fontName) !== record) return false;
            fonts.delete(fontName);
            return added.dispose();
          }
        };
        if (previous) previous.dispose();
        fonts.set(fontName, record);
        return record;
      },
      addFontPayload(name, payload, glyphs, metrics, options = {}) {
        const fontName = requireKey(name);
        const previous = fonts.get(fontName) || null;
        requireObject(glyphs, `Grout13 font ${fontName}.glyphs`);
        requireObject(metrics, `Grout13 font ${fontName}.metrics`);
        if (fonts.has(fontName) && options.replace !== true) throw new Error(`Grout13 font ${fontName} already exists; pass replace: true to replace it.`);
        if (!Array.isArray(payload)) throw new TypeError(`Grout13 font ${fontName} payload must be an array.`);
        const atlasKey = options.atlasKey ? requireKey(options.atlasKey) : `grout13-font-${fontName}`;
        const decoded = decode(payload, decodeOptions(options));
        const decodedFrames = resolveFrames(decoded);
        validateFontGlyphs(glyphs, frameMapNames(decodedFrames), fontName);
        const added = registerDecoded(atlasKey, decoded, options, payload);
        const record = { name: fontName, atlasKey, glyphs, metrics, compiled: null, added, dispose() {
          if (fonts.get(fontName) !== record) return false;
          fonts.delete(fontName);
          return added.dispose();
        } };
        if (previous) previous.dispose();
        fonts.set(fontName, record);
        return record;
      },
      /**
       * @param {string} name
       */
      getFont(name) {
        return fonts.get(requireKey(name)) || null;
      },
      listFonts() {
        return Object.freeze(Array.from(fonts.values(), (font) => Object.freeze({ name: font.name, atlasKey: font.atlasKey })));
      },
      removeFont(name) {
        const font = fonts.get(requireKey(name));
        return font ? font.dispose() : false;
      },
      capabilities: Object.freeze({ decode: true, compile: Boolean(compile), payloadBytes: typeof grout13.getGrout13PayloadBytes === "function", fontPayload: true }),
      [BRIDGE_MARKER]: grout13
    });
  }
  function installGrout13Bridge(gm, grout13) {
    requireObject(gm, "GM");
    requireObject(grout13, "GROUT13");
    const existing = gm.grout13;
    if (existing !== void 0) {
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

  // src/index.grout13.global.js
  var root = globalThis;
  if (!root.GM) throw new Error("phaser4-facade Grout13 bridge requires globalThis.GM.");
  if (!root.GROUT13) throw new Error("phaser4-facade Grout13 bridge requires globalThis.GROUT13.");
  installGrout13Bridge(root.GM, root.GROUT13);
})();
