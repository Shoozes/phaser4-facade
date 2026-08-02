# Facade examples

These examples are intentionally small and procedural. They demonstrate the
module and global entrypoints without moving game image assets into the facade
package.

- `prototype-module.html`: imports the packaged `dist/gm-phaser4.module.js`
  entrypoint. Serve it through a Vite/npm bundler so the Phaser peer dependency
  resolves from the consuming app.
- `prototype-cdn.html`: loads Phaser first and then the global bundle through a
  plain script tag. Pass `?runtime=<same-origin-or-CDN-URL>` to exercise the
  dynamic runtime override used by the browser smoke.
- `single-html-cdn/index.html`: direct host-page example that can be served with
  a downloaded global bundle from the same directory; it does not create an
  iframe.

For a public Git-backed preview, use the JavaScript-MIME jsDelivr GitHub path:

```html
<script src="https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/dist/gm-phaser4.global.min.js"></script>
```

The versioned npm/jsDelivr path remains preferred for released applications;
the Git-backed path is useful for testing the current `main` build. Raw GitHub
and Gist URLs are source artifacts and are not the executable CDN path.
