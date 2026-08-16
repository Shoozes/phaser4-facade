import { GM } from "phaser4-facade";
import { installGrout13Bridge } from "phaser4-facade/grout13";
import * as GROUT13 from "grout13";
import { startFruitShotGame } from "./fruit-shot-gameplay.js";

const renderType = new URLSearchParams(window.location.search).get("render") === "canvas"
    ? "CANVAS"
    : "WEBGL";
const proof = window.__fruitShotModularProof;
const status = document.getElementById("status");
const errorBox = document.getElementById("proof-error");

function setStatus(text) {
    if (!status) return;
    status.hidden = false;
    status.textContent = text;
}

function failProof(error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    proof.failed = true;
    proof.complete = false;
    proof.phase = "failed";
    proof.errors.push(message);
    setStatus("Fruit Shot modular CDN failed");
    if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent = message;
    }
    console.error(error);
}

try {
    const bridge = installGrout13Bridge(GM, GROUT13);
    startFruitShotGame({ GM, bridge, proof, renderType, setStatus, failProof });
} catch (error) {
    failProof(error);
}
