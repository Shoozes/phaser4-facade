# Facade examples

These examples are intentionally small and procedural. They demonstrate the
module and global entrypoints without moving game image assets into the facade
package.

## Native app browser shell

`native-app-shell.css` is the shared go-to browser shell for fullscreen Phaser
pages. It handles dynamic viewport fallbacks, iOS safe-area insets, text-size
stability, locked root-page scroll/bounce, explicit DOM scroll regions, and
canvas sizing without changing Phaser's own high-DPI backing-buffer contract.

Use the local package path in downloaded examples:

```html
<link rel="stylesheet" href="./native-app-shell.css">
```

For a public Git-backed preview, use the executable CSS CDN path:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/examples/native-app-shell.css">
```

Pin a published npm release instead of `@main` once that release contains the
stylesheet. Apply `data-gm-app-shell="locked"` to `body`, wrap the game in
`gm-app-shell`, and place the canvas parent under
`gm-app-surface gm-app-safe-area`. Use `gm-app-scroll-region` only for an
intentional DOM panel; `renderResolution: "auto"` remains the runtime owner
of sharp Retina/iOS canvas backing pixels.

- `prototype-module.html`: imports the packaged `dist/gm-phaser4.module.js`
  entrypoint. Serve it through a Vite/npm bundler so the Phaser peer dependency
  resolves from the consuming app.
- `prototype-cdn.html`: loads Phaser first and then the global bundle through a
  plain script tag. The demo opts into the responsive virtual-room contract so
  portrait/landscape viewport changes recalculate the room and canvas backing.
  Pass `?runtime=<trusted-same-origin-or-jsDelivr-URL>` to exercise the dynamic
  runtime override used by the browser smoke. The page accepts only the local
  runtime bundle shape or the versioned/public jsDelivr facade paths.
- `single-html-cdn/index.html`: host-page example that can be served with a
  downloaded global bundle from the same directory.
## Fruit Shot architecture matrix

- `fruit-shot-grout13.html`: the recommended quick demo. One plain HTML file
  loads pinned Phaser and facade globals, the public Grout13 global, and the
  separate facade bridge in dependency order. It has bounded facade/bridge
  fallback candidates, fails visibly when the optional bridge cannot load, and
  creates the fruit atlas through `GM.grout13.addAtlas`.
- `fruit-shot.html`: one plain HTML file with the same responsive, fixed-step,
  seeded, procedural Fruit Shot behavior but no Grout13 dependency. Use this
  for the smallest core-facade CDN proof.
- `fruit-shot-modular.html` plus `fruit-shot-modular.js`: import-map module
  architecture. The HTML owns the CDN mappings and shell; the JavaScript module
  owns the game, imports the facade, Grout13, and bridge explicitly, and is the
  clean starting point for bundler/module projects.

All three Fruit Shot variants use the Git-backed native-shell CSS CDN so their
HTML stays focused on runtime architecture. Pin a reviewed commit SHA instead
of `@main` when reproducible external bytes are required.

The Fruit Shot render contract is explicitly pixel-art: nearest-neighbor canvas
sampling, integer sprite coordinates, and disabled antialiasing are set through
the facade. The recommended Grout13 examples compile the title and HUD copy as
5x7 bitmap frames in the same atlas as the fruit. Current Grout13 bundled font
rows are bottom-first, so their local `drawPixelLabel` helper applies `flipY`
only to text sprites; the fruit frames remain unflipped. Remove that narrow
compatibility flag after the Grout13 renderer normalizes its glyph bit order,
then repeat the Canvas and WebGL screenshot proof.

Run the repository source smoke with:

```powershell
node scripts/smoke-cdn-runtime.mjs --target source
```

For a public Git-backed preview, use the JavaScript-MIME jsDelivr GitHub path:

```html
<script src="https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/dist/gm-phaser4.global.min.js"></script>
```

The versioned npm/jsDelivr path is a consumer release concern. Raw GitHub and
Gist URLs are source artifacts and are not the executable CDN path.
