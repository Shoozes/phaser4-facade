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

- The global browser bundle is available at `phaser4-facade/global.min.js`
  after a consumer release workflow:

```html
<script src="https://cdn.jsdelivr.net/npm/phaser@4.1.0/dist/phaser.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4.global.min.js"></script>
```

- Keep game-specific content in the consuming project. This package includes
  procedural drawing/UI examples only; do not move game image assets into it.
- Prefer `GM.app.start`, `GM.entity.spawn`, `GM.draw`, `GM.ui`, and
  `GM.runtime` before creating a second engine-facing abstraction.
- Register generated art through `GM.asset.addCanvas` / `addRgba` / `addAtlas`
  rather than constructing Phaser atlas JSON by hand.
- Use `GM.draw.textExt` / `GM.gui.textExt` for bounded per-call presentation
  changes, `textFit` for measured single-line fitting, and `spriteExt` object
  options when positional arguments become unclear.
- Use `phaser4-facade/grout13` only with an explicitly injected, reviewed
  `GROUT13` implementation. It is an optional bridge, not a core dependency.
- Use `GM.layer.define` for stable instance depths and `GM.entity.spawn`
  `vars` for pre-Create instance fields.
- Optional fixed step: `simulationHz` / `maxFrameDeltaMs` / `maxCatchUpSteps`.
- Optional seedable RNG: `randomSeed` or `GM.math.setSeed` (does not replace
  `Math.random`).

## Workflow

1. Read `README.md` and `docs/getting-started.md`.
2. Start from an example in `examples/` and keep the first proof procedural.
3. Add a facade API only when it belongs to reusable `GM.*` behavior and can be
   typed, documented, and tested.
4. Run `npm run pack:check` from this package before handing off a candidate.

## Verification

The package build is generated from `src/` and checked in two stages:

1. `scripts/test-runtime-package.mjs` — package shape, syntax, types, fixture presence
2. `scripts/test-runtime-behavior.mjs` — packed consumer install + browser matrix
   (module/global/minified × WebGL/Canvas × Phaser 4.1.0 and 4.2.1)

Run `npm run verify` from this package for both stages. Browser fixtures live
under `tests/browser/`. The host template remains the integration consumer and
must continue to pass the repository verification gate.
