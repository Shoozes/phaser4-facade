# Phaser 4 Facade Skill

Use this skill when building a small Phaser 4 game or tutorial that should use
the reusable `phaser4-facade` runtime.

## Contract

- The canonical API is namespaced under `GM.*`; GML-style globals are legacy
  compatibility aliases.
- Load Phaser before the global browser bundle.
- The module entrypoint installs the facade when imported by a Vite/npm app:

```js
import "phaser4-facade";
```

- The global browser bundle is available at
  `phaser4-facade/global.min.js` or the versioned jsDelivr path:

```html
<script src="https://cdn.jsdelivr.net/npm/phaser@4.1.0/dist/phaser.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4.global.min.js"></script>
```

- For a direct public Git `main` preview, use the JavaScript-MIME jsDelivr
  endpoint (no iframe required):

```html
<script src="https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/dist/gm-phaser4.global.min.js"></script>
```

- Keep game-specific content in the consuming project. This package includes
  procedural drawing/UI examples only; do not move game image assets into it.
- Prefer `GM.app.start`, `GM.entity.spawn`, `GM.draw`, `GM.ui`, and
  `GM.runtime` before creating a second engine-facing abstraction.

## Workflow

1. Read `README.md` and `docs/getting-started.md`.
2. Start from an example in `examples/` and keep the first proof procedural.
3. Add a facade API only when it belongs to reusable `GM.*` behavior and can be
   typed, documented, and tested.
4. Run `npm run pack:check` from this package before publishing.

## Verification

The package build is generated from `src/` and checked by
`scripts/test-runtime-package.mjs`. Keep the generated `dist/` artifacts
committed so Git-backed CDN previews and npm publication use the same build.
