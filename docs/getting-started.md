# Getting started

`phaser4-facade` is a small Phaser 4 runtime facade for procedural 2D game
templates. It owns lifecycle, room sizing, input, entities, drawing, UI
toolkit helpers, transitions, and compatibility aliases. It does not own game
images or consumer-specific content.

## Vite or npm module

Install Phaser and the facade in the consuming app, then import the facade once
before using `GM.*`:

```js
import { GM, installGMRuntime } from "phaser4-facade";
// Side-effect form also works: import "phaser4-facade";

GM.app.start({
    width: 720,
    height: 1280,
    // Optional: simulationHz: 60, randomSeed: 42, type: "WEBGL"
    create() {
        GM.layer.define("actors", 200);
        GM.entity.spawn({
            create() {
                // options.vars and options.name are available here
                this.x = GM.runtime.roomWidth / 2;
                this.y = GM.runtime.roomHeight / 2;
            },
            draw() {
                GM.draw.setColor(GM.color.LIME);
                GM.draw.circle(this.x, this.y, 60, false);
            }
        }, {
            layer: "actors",
            name: "hero",
            vars: { health: 10 }
        });
    }
});
```

The namespaced API is the default contract and legacy globals are disabled by
default. If an older prototype needs GML-style globals, set `globals: true` and
import `phaser4-facade/legacy-globals` for the matching TypeScript declarations.

Generated textures and atlases should register through `GM.asset.addCanvas`,
`GM.asset.addRgba`, or `GM.asset.addAtlas` (null-prototype frame maps are safe).
See `docs/gm-compatibility-matrix.md` for angle units, fixed-step, and input ownership notes.

For per-call presentation, use `GM.draw.textExt` / `GM.gui.textExt`, bounded
`textFit`, and the object overload of `GM.draw.spriteExt`. See
`docs/text-and-sprite-options.md` for the option contract.

The optional `phaser4-facade/grout13` entrypoint accepts an injected Grout13
module and delegates decoded atlas registration to `GM.asset.addAtlas`; the
core facade does not import Grout13.

## Pixel-perfect presentation

`pixelArt: true`, disabled antialiasing, and `roundPixels: true` preserve
nearest-neighbor sampling, but they cannot make a fractional room transform
pixel-perfect. For fixed-pixel games, declare a `viewport` contract and keep
the logical room immutable. Presentation scale, alignment, and safe-area
policy stay outside simulation.

```js
GM.app.start({
    parent: "game",
    viewport: {
        mode: "fixed",
        width: 720,
        height: 720,
        fit: "contain",
        scaleStep: 0.25,
        fitArea: "viewport",
        safeArea: "vertical",
        align: {
            portrait: { x: "center", y: "top" },
            landscape: { x: "center", y: "center" }
        }
    },
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    renderResolution: "auto",
    maxRenderResolution: 3
});
```

`responsive: false` still means `viewport.mode = "fixed"`. `integerScaleStep`
still means `viewport.scaleStep`. `0`, `false`, and `null` disable stepping.
Read `GM.viewport.logicalRect`, `visibleRoomRect`, and `screenToRoom()` instead
of reconstructing `layout.x` / `layout.y`. Put the canvas on
`gm-app-surface--full-bleed` and keep HUD/DOM chrome on `gm-app-overlay--safe`.

## Browser global

For a released consumer, load Phaser first, then the versioned global artifact
from the selected delivery channel:

```html
<script src="https://cdn.jsdelivr.net/gh/phaserjs/phaser@v4.2.1/dist/phaser.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/dist/gm-phaser4.global.min.js"></script>
```

The global entrypoint validates `window.Phaser` and installs `window.GM`.
The CDN prototype also rejects untrusted `?runtime=` script overrides; use the
versioned npm/jsDelivr path or a same-origin runtime bundle.

## Next steps

- Use `docs/how-to-procedural-ui.md` for panels, buttons, text, and hit regions.
- Use `examples/` for runnable module/global proofs.
- Keep images, audio, and game-specific data in the consuming template.
