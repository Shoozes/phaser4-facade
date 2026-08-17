// @ts-check

import { resolveViewport } from "./viewport.js";

/**
 * Compatibility wrapper over the normalized viewport contract. Games should
 * prefer `GM.viewport` over reconstructing these fields from x/y/scale.
 * @param {number} w
 * @param {number} h
 * @param {Record<string, unknown>} cfg
 * @param {Partial<{ top: number, right: number, bottom: number, left: number }>} [safeInsets]
 */
export function resolveRoomLayout(w, h, cfg, safeInsets) {
    const viewport = resolveViewport(w, h, cfg, safeInsets);
    return {
        roomWidth: viewport.logicalRect.width,
        roomHeight: viewport.logicalRect.height,
        scale: viewport.scale,
        x: viewport.gameScreenRect.x,
        y: viewport.gameScreenRect.y,
        profile: viewport.profile,
        orientation: viewport.orientation,
        scaleMode: viewport.scaleMode,
        viewport
    };
}
