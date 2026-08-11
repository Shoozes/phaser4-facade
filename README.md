# Phaser 4 Facade

`phaser4-facade` is a reusable GM-compatible Phaser 4 mobile 2D runtime
facade for procedural game templates. It owns lifecycle, room sizing, input,
entities, drawing, UI helpers, transitions, and compatibility aliases. It does
not own game images, audio, story data, or consumer-specific content.

## Source and build contract

- Runtime source: `src/gm-phaser4.js` and `src/core/`
- Module entrypoint: `src/index.module.js`
- Global entrypoint: `src/index.global.js`
- Declarations: `types/gm-phaser4.d.ts`
- Optional bridge declarations: `types/grout13.d.ts`
- Consumer guides: `docs/`
- Procedural proofs: `examples/`
- Checked-in build artifacts: `dist/`

The module entry uses `import * as Phaser from "phaser"` and exports
`{ installGMRuntime, GM }`. The global entry requires a usable global Phaser
before installing `GM`.

## Durable runtime behavior

- Namespaced `GM.*` APIs are primary; legacy GML-style globals are opt-in.
- Numeric colors use GameMaker BGR ordering at render boundaries.
- Rotation uses GameMaker degrees.
- Fixed simulation is opt-in through `simulationHz`, `maxFrameDeltaMs`, and
  `maxCatchUpSteps`.
- Seeded randomness is opt-in through `randomSeed` or `GM.math.setSeed`; it does
  not replace `Math.random`.
- Generated textures and atlases use `GM.asset.addCanvas`, `addRgba`, and
  `addAtlas`. Null-prototype maps, `Map` instances, tuples, and ordinary frame
  objects are normalized.
- Pointer ownership is explicit through `GM.input` helpers; a joystick does
  not globally block unrelated pointers.

## Presentation helpers

`GM.draw.textExt` and `GM.gui.textExt` accept per-call font, size, color,
alignment, degree rotation, scale, and origin options without changing
persistent draw state. `textFit` variants measure Phaser text bounds within a
required `maxWidth` and optional `maxHeight`, searching down to `minSize` with
a bounded loop. They do not enable wrapping or rich text.

`GM.draw.spriteExt` preserves its positional overload and also accepts an
options object for scale, rotation, tint, alpha, origin, and flips. The object
overload is recognized only when the fifth argument is a non-null object.

See [`docs/text-and-sprite-options.md`](docs/text-and-sprite-options.md) and
[`docs/migrations/0.2.0.md`](docs/migrations/0.2.0.md).

## Optional Grout13 bridge

The optional `phaser4-facade/grout13` entrypoint accepts an injected object
with `compileGrout13Atlas()` and `decodeGrout13Atlas()` functions. It validates
decoded canvas/frame data and delegates to the existing `GM.asset.addAtlas`
API. The core facade never imports Grout13, executes generated scripts, fetches
data, or adds a model/network boundary.

```js
import { GM } from "phaser4-facade";
import { installGrout13Bridge } from "phaser4-facade/grout13";
import * as GROUT13 from "grout13";

installGrout13Bridge(GM, GROUT13);
GM.grout13.addAtlas("fruit-atlas", assets, {
    compileOptions: { runtimeTarget: "canvas" }
});
```

Bridge artifacts are separate from the core files:

- `dist/gm-phaser4-grout13.module.js`
- `dist/gm-phaser4-grout13.global.js`
- `dist/gm-phaser4-grout13.global.min.js`
- `dist/grout13.d.ts`

## Verification

Run from this package:

```powershell
npm ci
npm run verify
npm run pack:check
```

`verify` builds the core and bridge artifacts, checks package exports and
syntax, runs text/sprite and bridge contract tests, compiles TypeScript
consumers, runs the packed browser matrix, and runs the deterministic soak.
The repository is locally qualified; npm publication, tags, and hosted CI are
separate release decisions.

## Examples

- `examples/prototype-module.html`: module boot proof.
- `examples/prototype-cdn.html`: plain-script/global boot proof.
- `examples/single-html-cdn/index.html`: downloaded global bundle proof.
- `examples/fruit-shot.html`: focused fixed-step, seeded RNG, generated atlas,
  `spriteExt`, `textExt`, and `textFit` proof.
