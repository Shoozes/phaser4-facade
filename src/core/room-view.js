// @ts-check

import { clamp, dampFactor } from "./math.js";

/** @typedef {{ x: number, y: number, width: number, height: number }} LayoutRect */
/** @typedef {{ x?: number, y?: number }} Point */
/** @typedef {{ x: number, y: number, width: number, height: number }} DisplayRect */

/** @param {unknown} value @param {number} fallback @param {string} label */
function positive(value, fallback, label) {
    const number = Number(value === undefined ? fallback : value);
    if (!Number.isFinite(number) || number <= 0) {
        throw new TypeError(`GM.camera.createRoomView ${label} must be positive and finite.`);
    }
    return number;
}

/** @param {unknown} value @param {string} label */
function coordinate(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`GM.camera.createRoomView ${label} must be finite.`);
    return number;
}

/** @param {unknown} value */
function paddingValue(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number) || number < 0) {
        throw new RangeError("GM.camera.createRoomView padding must be finite and non-negative.");
    }
    return number;
}

/** @param {unknown} value @param {string} label */
function nonNegative(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
        throw new RangeError(`GM.camera.createRoomView ${label} must be finite and non-negative.`);
    }
    return number;
}

/** @param {Record<string, any>} options */
export function createRoomView(options) {
    if (!options || typeof options !== "object") throw new TypeError("GM.camera.createRoomView requires options.");

    const roomWidth = positive(options.roomWidth, 0, "roomWidth");
    const roomHeight = positive(options.roomHeight, 0, "roomHeight");
    const configuredViewHeight = positive(options.viewHeight, roomHeight, "viewHeight");
    const minAspect = positive(options.minAspect, 0.5, "minAspect");
    const maxAspect = positive(options.maxAspect, 1.5, "maxAspect");
    if (minAspect > maxAspect) throw new RangeError("GM.camera.createRoomView requires minAspect <= maxAspect.");
    const rawFollowDamping = Number(options.followDamping ?? 0.82);
    if (!Number.isFinite(rawFollowDamping) || rawFollowDamping < 0 || rawFollowDamping > 1) {
        throw new RangeError("GM.camera.createRoomView followDamping must be finite and between 0 and 1.");
    }
    const followDamping = rawFollowDamping;

    /** @param {number} aspect */
    function resolveViewSize(aspect) {
        let width = Math.min(roomWidth, configuredViewHeight * aspect);
        let height = width / aspect;
        if (height > roomHeight) {
            height = roomHeight;
            width = height * aspect;
        }
        return { width, height };
    }

    const initialSize = resolveViewSize(maxAspect);

    const view = {
        roomWidth,
        roomHeight,
        viewWidth: initialSize.width,
        viewHeight: initialSize.height,
        zoom: 1,
        cx: roomWidth / 2,
        cy: roomHeight / 2,
        /** @type {DisplayRect} */
        display: { x: 0, y: 0, width: 1, height: 1 },
        visible: { left: 0, top: 0, right: roomWidth, bottom: roomHeight },

        /** @param {LayoutRect} rect */
        layout(rect) {
            if (!rect || typeof rect !== "object") throw new TypeError("GM.camera.createRoomView.layout requires a rectangle.");
            const x = rect.x === undefined ? 0 : coordinate(rect.x, "layout.x");
            const y = rect.y === undefined ? 0 : coordinate(rect.y, "layout.y");
            const width = positive(rect.width, 0, "layout.width");
            const height = positive(rect.height, 0, "layout.height");
            const aspect = clamp(width / height, minAspect, maxAspect);
            const viewSize = resolveViewSize(aspect);
            this.viewWidth = viewSize.width;
            this.viewHeight = viewSize.height;

            let displayWidth = width;
            let displayHeight = displayWidth / aspect;
            if (displayHeight > height) {
                displayHeight = height;
                displayWidth = displayHeight * aspect;
            }
            this.display.x = x + (width - displayWidth) / 2;
            this.display.y = y + (height - displayHeight) / 2;
            this.display.width = displayWidth;
            this.display.height = displayHeight;
            this.zoom = Math.min(displayWidth / this.viewWidth, displayHeight / this.viewHeight);
            return this.clamp();
        },

        /** @param {number} x @param {number} y @param {number} deltaSeconds */
        follow(x, y, deltaSeconds) {
            const targetX = coordinate(x, "follow.x");
            const targetY = coordinate(y, "follow.y");
            const damping = dampFactor(followDamping, nonNegative(deltaSeconds, "follow.deltaSeconds"), 60);
            this.cx = targetX + (this.cx - targetX) * damping;
            this.cy = targetY + (this.cy - targetY) * damping;
            return this.clamp();
        },

        clamp() {
            const halfWidth = this.viewWidth / 2;
            const halfHeight = this.viewHeight / 2;
            this.cx = clamp(this.cx, halfWidth, Math.max(halfWidth, roomWidth - halfWidth));
            this.cy = clamp(this.cy, halfHeight, Math.max(halfHeight, roomHeight - halfHeight));
            this.visible.left = this.cx - halfWidth;
            this.visible.top = this.cy - halfHeight;
            this.visible.right = this.cx + halfWidth;
            this.visible.bottom = this.cy + halfHeight;
            return this;
        },

        /** @param {number} x @param {number} y @param {Point} [out] */
        worldToScene(x, y, out = {}) {
            out.x = this.display.x + (coordinate(x, "worldToScene.x") - this.visible.left) * this.zoom;
            out.y = this.display.y + (coordinate(y, "worldToScene.y") - this.visible.top) * this.zoom;
            return /** @type {{ x: number, y: number }} */ (out);
        },

        /** @param {number} x @param {number} y @param {Point} [out] */
        sceneToWorld(x, y, out = {}) {
            out.x = this.visible.left + (coordinate(x, "sceneToWorld.x") - this.display.x) / this.zoom;
            out.y = this.visible.top + (coordinate(y, "sceneToWorld.y") - this.display.y) / this.zoom;
            return /** @type {{ x: number, y: number }} */ (out);
        },

        /** @param {number} x @param {number} y @param {number} [padding] */
        containsWorld(x, y, padding = 0) {
            const worldX = Number(x);
            const worldY = Number(y);
            if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return false;
            const margin = paddingValue(padding);
            return worldX >= this.visible.left - margin && worldY >= this.visible.top - margin &&
                worldX <= this.visible.right + margin && worldY <= this.visible.bottom + margin;
        },

        /** @param {number} x @param {number} y @param {number} [padding] */
        containsScene(x, y, padding = 0) {
            const sceneX = Number(x);
            const sceneY = Number(y);
            if (!Number.isFinite(sceneX) || !Number.isFinite(sceneY)) return false;
            const margin = paddingValue(padding);
            return sceneX >= this.display.x - margin && sceneY >= this.display.y - margin &&
                sceneX <= this.display.x + this.display.width + margin &&
                sceneY <= this.display.y + this.display.height + margin;
        }
    };
    return view.clamp();
}
