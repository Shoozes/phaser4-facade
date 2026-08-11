// Loads the requested facade artifact, then runs the shared behavioral fixture.

/**
 * @param {string} src
 */
function loadClassicScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

function readParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        artifact: params.get("artifact") || "global",
        render: (params.get("render") || "webgl").toLowerCase(),
        phaserVersion: params.get("phaser") || "unknown",
        targetFrames: Number(params.get("frames") || 8),
        resolutionMode: params.get("resolution") === "1"
    };
}

function setStatus(text) {
    const node = document.getElementById("status");
    if (node) node.textContent = text;
}

function ensureReportShell(params, errorMessage) {
    if (!window.__gmRuntimeQualification) {
        window.__gmRuntimeQualification = {
            phase: "failed",
            complete: false,
            failed: true,
            errors: [errorMessage],
            warnings: [],
            checks: {},
            artifact: params.artifact,
            render: params.render,
            phaserVersion: params.phaserVersion
        };
    } else {
        window.__gmRuntimeQualification.failed = true;
        window.__gmRuntimeQualification.complete = false;
        window.__gmRuntimeQualification.phase = "failed";
        window.__gmRuntimeQualification.errors = window.__gmRuntimeQualification.errors || [];
        window.__gmRuntimeQualification.errors.push(errorMessage);
    }
}

async function main() {
    const params = readParams();
    setStatus(`loading ${params.artifact} / ${params.render} / phaser ${params.phaserVersion}`);

    window.addEventListener("error", (event) => {
        ensureReportShell(params, event.error?.message || event.message || "window error");
        setStatus(`error: ${event.error?.message || event.message}`);
    });
    window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        const message = reason && reason.message ? reason.message : String(reason || "unhandledrejection");
        ensureReportShell(params, message);
        setStatus(`rejection: ${message}`);
    });

    try {
        if (params.artifact === "module") {
            await import("/dist/gm-phaser4.module.js");
        } else {
            await loadClassicScript("/vendor/phaser.min.js");
            if (!window.Phaser) throw new Error("Classic Phaser script did not install window.Phaser.");
            const facadePath = params.artifact === "global.min"
                ? "/dist/gm-phaser4.global.min.js"
                : "/dist/gm-phaser4.global.js";
            await loadClassicScript(facadePath);
        }

        if (!window.GM || typeof window.GM.app?.start !== "function") {
            throw new Error("Facade load completed without GM.app.start.");
        }

        const { runQualification } = await import("./behavioral-fixture.js");
        const report = await runQualification(params);
        setStatus(`complete frames=${report.frames} restartFrames=${report.restartFrames} failed=${report.failed}`);
    } catch (error) {
        const message = error && error.message ? error.message : String(error);
        ensureReportShell(params, message);
        setStatus(`failed: ${message}`);
    }
}

main();
