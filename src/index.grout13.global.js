// @ts-check

import { installGrout13Bridge } from "./bridges/grout13.js";

const root = globalThis;
if (!root.GM) throw new Error("phaser4-facade Grout13 bridge requires globalThis.GM.");
if (!root.GROUT13) throw new Error("phaser4-facade Grout13 bridge requires globalThis.GROUT13.");

installGrout13Bridge(root.GM, root.GROUT13);
