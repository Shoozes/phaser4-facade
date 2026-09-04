import { GM } from "phaser4-facade";
import { installGrout13Bridge } from "phaser4-facade/grout13";
import * as GROUT13 from "grout13";
import { startFruitShotGame } from "./fruit-shot-gameplay.js";

const renderType = new URLSearchParams(window.location.search).get("render") === "canvas"
    ? "CANVAS"
    : "WEBGL";
const proof = window.__fruitShotModularProof;

function setStatus(text) {
    void text;
}

function failProof(error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    proof.failed = true;
    proof.complete = false;
    proof.phase = "failed";
    proof.errors.push(message);
    console.error(error);
}

try {
    const bridge = installGrout13Bridge(GM, GROUT13);
    startFruitShotGame({ GM, bridge, proof, renderType, setStatus, failProof });
} catch (error) {
    failProof(error);
}
