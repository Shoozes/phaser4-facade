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
        document.body.style.setProperty("top", "11px", "important");
        document.body.style.setProperty("color", "red", "important");
        parent.style.setProperty("width", "40px");
        canvas.style.setProperty("display", "inline");
        const host = window.createFullscreenHost({ document }, parent);
        host.applyGame({ canvas });
        const during = {
            marginLeft: document.documentElement.style.getPropertyValue("margin-left"),
            paddingTop: document.documentElement.style.getPropertyValue("padding-top"),
            top: document.body.style.getPropertyValue("top"),
            color: document.body.style.getPropertyValue("color"),
            colorPriority: document.body.style.getPropertyPriority("color")
        };
        const restored = host.restore();
        return {
            during,
            restored,
            after: {
                marginLeft: document.documentElement.style.getPropertyValue("margin-left"),
                paddingTop: document.documentElement.style.getPropertyValue("padding-top"),
                top: document.body.style.getPropertyValue("top"),
                color: document.body.style.getPropertyValue("color"),
                colorPriority: document.body.style.getPropertyPriority("color")
            },
            secondRestore: host.restore()
        };
    });
    assert.deepEqual(result.during, {
        marginLeft: "0px",
        paddingTop: "0px",
        top: "0px",
        color: "red",
        colorPriority: "important"
    });
    assert.equal(result.restored, true);
    assert.deepEqual(result.after, {
        marginLeft: "17px",
        paddingTop: "9px",
        top: "11px",
        color: "red",
        colorPriority: "important"
    });
    assert.equal(result.secondRestore, false);
    console.log(`[ok] Fullscreen host browser longhand restoration passed via ${launch.label}.`);
} finally {
    await launch.browser.close();
}
