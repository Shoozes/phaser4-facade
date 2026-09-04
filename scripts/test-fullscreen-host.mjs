import assert from "node:assert/strict";
import { createFullscreenHost } from "../src/core/fullscreen-host.js";

function style() { const values = new Map(); return { setProperty(name, value, priority = "") { values.set(name, { value: String(value), priority }); }, getPropertyValue(name) { return values.get(name)?.value || ""; }, getPropertyPriority(name) { return values.get(name)?.priority || ""; }, removeProperty(name) { values.delete(name); } }; }
const html = { style: style() }, body = { style: style() }, parent = { style: style(), getBoundingClientRect() { return { width: 100, height: 100 }; } }, canvas = { style: style(), parentElement: parent };
html.style.setProperty("margin-left", "17px"); html.style.setProperty("padding-top", "9px");
body.style.setProperty("touch-action", "auto"); body.style.setProperty("top", "11px", "important");
parent.style.setProperty("width", "40px"); canvas.style.setProperty("display", "inline");
const host = createFullscreenHost({ document: { documentElement: html, body, getElementById(id) { return id === "game" ? parent : null; } } }, "game");
host.applyGame({ canvas });
assert.equal(html.style.getPropertyValue("overflow"), "hidden"); assert.equal(body.style.getPropertyValue("touch-action"), "none"); assert.equal(canvas.style.getPropertyValue("display"), "block");
assert.equal(host.restore(), true); assert.equal(host.restore(), false);
assert.equal(html.style.getPropertyValue("margin-left"), "17px");
assert.equal(html.style.getPropertyValue("padding-top"), "9px");
assert.equal(body.style.getPropertyValue("touch-action"), "auto");
assert.equal(body.style.getPropertyValue("top"), "11px");
assert.equal(body.style.getPropertyPriority("top"), "important");
assert.equal(parent.style.getPropertyValue("width"), "40px");
assert.equal(canvas.style.getPropertyValue("display"), "inline");
console.log("fullscreen host contract passed");
