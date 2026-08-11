# Facade examples

These examples are intentionally small and procedural. They demonstrate the
module and global entrypoints without moving game image assets into the facade
package.

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
- `fruit-shot.html`: focused procedural proof for fixed-step setup, seeded RNG,
  generated atlas registration, `spriteExt`, `textExt`, and `textFit`. It does
  not require Grout13 unless a consumer supplies `globalThis.GROUT13`; when
  supplied, the same proof uses `GM.grout13.addAtlas`.

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
