#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "./smoke/smoke-server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireFromPackage = createRequire(path.join(ROOT, "package.json"));
const { chromium } = requireFromPackage("playwright-core");
const source = fs.readFileSync(path.join(ROOT, "src", "core", "fullscreen-host.js"), "utf8")
    .replace(/^\/\/ @ts-check\s*/u, "")
    .replace("export function createFullscreenHost", "function createFullscreenHost");

const launch = await launchBrowser(chromium);
try {
    const page = await launch.browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("about:blank");
    await page.addScriptTag({ content: `${source}\nwindow.createFullscreenHost = createFullscreenHost;` });
    const result = await page.evaluate(() => {
        const parent = document.createElement("div");
        const canvas = document.createElement("canvas");
        parent.append(canvas);
        document.body.append(parent);
        document.documentElement.style.setProperty("margin-left", "17px");
        document.documentElement.style.setProperty("padding-top", "9px");
        document.documentElement.style.setProperty("overflow-x", "scroll", "important");
        document.documentElement.style.setProperty("overscroll-behavior-y", "contain");
        document.body.style.setProperty("top", "11px", "important");
        document.body.style.setProperty("color", "red", "important");
        document.body.style.setProperty("overflow-y", "auto");
        parent.style.setProperty("width", "40px");
        canvas.style.setProperty("display", "inline");
        canvas.style.setProperty("touch-action", "pan-x", "important");
        const host = window.createFullscreenHost({ document }, parent);
        host.applyGame({ canvas });
        // Unrelated consumer changes made while fullscreen is active must not
        // be reverted by a host that never captured that declaration.
        document.body.style.setProperty("color", "blue", "important");
        const during = {
            marginLeft: document.documentElement.style.getPropertyValue("margin-left"),
            paddingTop: document.documentElement.style.getPropertyValue("padding-top"),
            overflow: document.documentElement.style.getPropertyValue("overflow"),
            overflowX: document.documentElement.style.getPropertyValue("overflow-x"),
            overflowY: document.documentElement.style.getPropertyValue("overflow-y"),
            overscroll: document.documentElement.style.getPropertyValue("overscroll-behavior"),
            overscrollX: document.documentElement.style.getPropertyValue("overscroll-behavior-x"),
            overscrollY: document.documentElement.style.getPropertyValue("overscroll-behavior-y"),
            top: document.body.style.getPropertyValue("top"),
            bodyOverflowY: document.body.style.getPropertyValue("overflow-y"),
            color: document.body.style.getPropertyValue("color"),
            colorPriority: document.body.style.getPropertyPriority("color"),
            canvasTouchAction: canvas.style.getPropertyValue("touch-action"),
            canvasTouchPriority: canvas.style.getPropertyPriority("touch-action")
        };
        const restored = host.restore();
        return {
            during,
            restored,
            after: {
                marginLeft: document.documentElement.style.getPropertyValue("margin-left"),
                paddingTop: document.documentElement.style.getPropertyValue("padding-top"),
                overflow: document.documentElement.style.getPropertyValue("overflow"),
                overflowX: document.documentElement.style.getPropertyValue("overflow-x"),
                overflowXPriority: document.documentElement.style.getPropertyPriority("overflow-x"),
                overflowY: document.documentElement.style.getPropertyValue("overflow-y"),
                overscroll: document.documentElement.style.getPropertyValue("overscroll-behavior"),
                overscrollX: document.documentElement.style.getPropertyValue("overscroll-behavior-x"),
                overscrollY: document.documentElement.style.getPropertyValue("overscroll-behavior-y"),
                top: document.body.style.getPropertyValue("top"),
                bodyOverflowY: document.body.style.getPropertyValue("overflow-y"),
                color: document.body.style.getPropertyValue("color"),
                colorPriority: document.body.style.getPropertyPriority("color"),
                canvasTouchAction: canvas.style.getPropertyValue("touch-action"),
                canvasTouchPriority: canvas.style.getPropertyPriority("touch-action")
            },
            secondRestore: host.restore()
        };
    });
    assert.deepEqual(result.during, {
        marginLeft: "0px",
        paddingTop: "0px",
        overflow: "hidden",
        overflowX: "hidden",
        overflowY: "hidden",
        overscroll: "none",
        overscrollX: "none",
        overscrollY: "none",
        top: "0px",
        bodyOverflowY: "hidden",
        color: "blue",
        colorPriority: "important",
        canvasTouchAction: "none",
        canvasTouchPriority: ""
    });
    assert.equal(result.restored, true);
    assert.deepEqual(result.after, {
        marginLeft: "17px",
        paddingTop: "9px",
        overflow: "",
        overflowX: "scroll",
        overflowXPriority: "important",
        overflowY: "",
        overscroll: "",
        overscrollX: "",
        overscrollY: "contain",
        top: "11px",
        bodyOverflowY: "auto",
        color: "blue",
        colorPriority: "important",
        canvasTouchAction: "pan-x",
        canvasTouchPriority: "important"
    });
    assert.equal(result.secondRestore, false);
    console.log(`[ok] Fullscreen host browser longhand restoration passed via ${launch.label}.`);
} finally {
    await launch.browser.close();
}
