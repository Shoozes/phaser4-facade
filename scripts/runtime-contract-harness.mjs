export function chainable(methods = []) {
    const target = {};
    for (const method of methods) {
        target[method] = () => target;
    }
    target.input = { enabled: false };
    target.destroy = () => target;
    target.on = () => target;
    return target;
}

export function makeFakeEmitter(extra = {}) {
    const handlers = new Map();
    return {
        ...extra,
        on(eventName, handler) {
            const list = handlers.get(eventName) || [];
            list.push({ handler, once: false });
            handlers.set(eventName, list);
            return this;
        },
        once(eventName, handler) {
            const list = handlers.get(eventName) || [];
            list.push({ handler, once: true });
            handlers.set(eventName, list);
            return this;
        },
        off(eventName, handler) {
            const list = handlers.get(eventName) || [];
            handlers.set(eventName, list.filter((entry) => entry.handler !== handler));
            return this;
        },
        emit(eventName, ...args) {
            const list = handlers.get(eventName) || [];
            handlers.set(eventName, list.filter((entry) => !entry.once));
            for (const entry of list) {
                entry.handler(...args);
            }
            return this;
        }
    };
}

function makeFakeGraphics() {
    return chainable([
        "clear",
        "fillStyle",
        "fillRect",
        "lineStyle",
        "strokeRect",
        "fillRoundedRect",
        "strokeRoundedRect",
        "fillCircle",
        "strokeCircle",
        "beginPath",
        "moveTo",
        "lineTo",
        "strokePath",
        "setVisible"
    ]);
}

function makeFakeText() {
    return chainable([
        "setText",
        "setPosition",
        "setOrigin",
        "setFontFamily",
        "setFontSize",
        "setFontStyle",
        "setStyle",
        "setColor",
        "setAlpha",
        "setScale",
        "setVisible",
        "setDepth"
    ]);
}

function makeFakeContainer() {
    const item = chainable(["setPosition", "setScale", "setDepth", "setAlpha", "setVisible", "setSize", "destroy"]);
    item.children = [];
    item.add = (children) => {
        const entries = Array.isArray(children) ? children : [children];
        for (const child of entries) {
            if (!child) continue;
            child.parentContainer = item;
            item.children.push(child);
        }
        return item;
    };
    item.setDepth = (depth) => {
        item.depth = depth;
        return item;
    };
    return item;
}

function makeFakeScene() {
    const input = makeFakeEmitter({
        mouse: {
            disableContextMenu() {}
        },
        keyboard: makeFakeEmitter(),
        setTopOnly() {}
    });
    const scale = makeFakeEmitter({
        width: 1280,
        height: 720
    });
    return {
        add: {
            existing: () => {},
            container: () => makeFakeContainer(),
            graphics: () => makeFakeGraphics(),
            rectangle: () => chainable(["setOrigin", "setInteractive", "setSize", "setPosition", "setAlpha", "setVisible", "setStrokeStyle", "destroy"]),
            zone: () => chainable(["setOrigin", "setInteractive", "setSize", "setPosition", "setVisible", "destroy"]),
            text: () => makeFakeText(),
            sprite: () => chainable(["setTexture", "setFrame", "setVisible", "setPosition", "setScale", "setOrigin", "setAlpha", "setRotation", "setTint", "destroy"])
        },
        cameras: {
            main: {
                setViewport() {}
            }
        },
        events: makeFakeEmitter(),
        input,
        scale,
        sound: {
            play() {}
        },
        textures: {
            exists() { return false; },
            addCanvas() { return null; },
            get() { return { getSourceImage: () => null }; }
        },
        time: {
            delayedCall(_delay, callback) {
                if (typeof callback === "function") callback();
                return {};
            },
            addEvent() {
                return {};
            }
        },
        tweens: {
            add(config) {
                if (typeof config?.onComplete === "function") config.onComplete();
                return {};
            },
            killTweensOf() {}
        },
        load: {
            image() {},
            audio() {},
            spritesheet() {}
        }
    };
}

class FakeScene {
    constructor() {
        Object.assign(this, makeFakeScene());
    }
}

class FakeGame {
    constructor(config) {
        this.config = config;
        this.scene = new config.scene();
        this.scene.preload();
        this.scene.create();
    }

    tick(time, delta) {
        this.scene.update(time, delta);
    }

    destroy() {
        this.scene.events.emit("shutdown");
        this.scene.events.emit("destroy");
    }
}

class FakeContainer {
    constructor() {
        Object.assign(this, makeFakeContainer());
    }
}

export function createFakeRuntimeHarness(installGMRuntime) {
    const fakeRoot = {
        innerWidth: 1280,
        innerHeight: 720
    };
    const fakePhaser = {
        AUTO: "AUTO",
        Game: FakeGame,
        Scene: FakeScene,
        GameObjects: {
            Container: FakeContainer
        },
        Scale: {
            RESIZE: "RESIZE",
            CENTER_BOTH: "CENTER_BOTH"
        }
    };

    installGMRuntime(fakeRoot, fakePhaser);
    return { fakeRoot, fakePhaser };
}

export class FakeRuntimeButtonContainer {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.children = [];
        this.visible = true;
        this.alpha = 1;
        this.scale = 1;
    }
    add(items) {
        this.children.push(...(Array.isArray(items) ? items : [items]));
        return this;
    }
    addAt(item, index) {
        this.children.splice(index, 0, item);
        return this;
    }
    setAlpha(value) { this.alpha = value; return this; }
    setPosition(x, y) { this.x = x; this.y = y; return this; }
    setScale(value) { this.scale = value; return this; }
    setSize(w, h) { this.width = w; this.height = h; return this; }
    setVisible(value) { this.visible = value; return this; }
}

export function makeFakeRuntimeButtonScene() {
    const handlers = new Map();
    const hitZone = {
        input: {},
        setOrigin(value) { this.origin = value; return this; },
        setInteractive() { this.interactive = true; this.input = {}; return this; },
        setSize(w, h) { this.width = w; this.height = h; return this; },
        on(eventName, handler) { handlers.set(eventName, handler); return this; },
        emit(eventName, ...args) {
            const handler = handlers.get(eventName);
            if (handler) handler(...args);
            return this;
        }
    };
    const graphics = {
        calls: [],
        clear() { this.calls.push(["clear"]); return this; },
        fillStyle(color, alpha) { this.calls.push(["fillStyle", color, alpha]); return this; },
        fillRoundedRect(x, y, w, h, radius) { this.calls.push(["fillRoundedRect", x, y, w, h, radius]); return this; },
        setVisible(value) { this.visible = value; return this; }
    };
    const label = {
        setText(value) { this.text = value; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setStyle(style) { this.style = style; return this; },
        setColor(value) { this.color = value; return this; },
        setOrigin(x, y) { this.origin = [x, y]; return this; }
    };
    return {
        hitZone,
        graphics,
        label,
        textures: { exists() { return false; } },
        add: {
            graphics() { return graphics; },
            zone() { return hitZone; },
            text() { return label; }
        }
    };
}

export function makeFakeModalDisplayObject(extra = {}) {
    return {
        ...extra,
        destroyed: false,
        handlers: new Map(),
        setOrigin(x, y) { this.origin = [x, y]; return this; },
        setInteractive() { this.interactive = true; return this; },
        setSize(w, h) { this.width = w; this.height = h; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setFontSize(value) { this.fontSize = value; return this; },
        setWordWrapWidth(value) { this.wordWrapWidth = value; return this; },
        setLineSpacing(value) { this.lineSpacing = value; return this; },
        setAlpha(value) { this.alpha = value; return this; },
        setScale(value) { this.scaleX = value; this.scaleY = value; return this; },
        on(eventName, handler) { this.handlers.set(eventName, handler); return this; },
        emit(eventName, ...args) {
            const handler = this.handlers.get(eventName);
            if (handler) handler(...args);
            return this;
        },
        add(items) {
            this.children = this.children || [];
            this.children.push(...(Array.isArray(items) ? items : [items]));
            return this;
        },
        destroy() { this.destroyed = true; return this; }
    };
}
