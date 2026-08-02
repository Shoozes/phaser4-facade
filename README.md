# phaser4-facade

Reusable GM-compatible Phaser 4 mobile 2D runtime facade for procedural game
templates. The public module keeps runtime source, declarations, tutorials,
plain-script examples, and LLM-facing skill guidance together. It ships no game
image assets, audio, or consumer-specific content.

Repository: <https://github.com/Shoozes/phaser4-facade>

## Install

```bash
npm install phaser4-facade phaser
```

The module entrypoint initializes the facade against the consuming app's Phaser
runtime:

```js
import "phaser4-facade";
```

For a browser global, load Phaser first:

```html
<script src="https://cdn.jsdelivr.net/npm/phaser@4.1.0/dist/phaser.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4.global.min.js"></script>
```

To test the current public Git build directly, without an iframe, use the
JavaScript-MIME jsDelivr Git endpoint:

```html
<script src="https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/dist/gm-phaser4.global.min.js"></script>
```

Pin an npm version for released applications; use `@main` only for current
public preview testing.

## Public surfaces

- `src/gm-phaser4.js`: reusable `installGMRuntime(root, Phaser)` implementation.
- `src/index.module.js`: module/npm bootstrap.
- `src/index.global.js`: plain-script/global bootstrap.
- `types/gm-phaser4.d.ts`: public declarations.
- `dist/`: committed module, global, minified global, and declaration artifacts.
- `docs/`: getting-started and procedural UI tutorials.
- `examples/`: procedural module and CDN boot proofs.
- `SKILL.md` and `llms.txt`: concise LLM integration guidance.

Namespaced `GM.*` APIs are primary. GML-style globals remain compatibility
aliases for existing templates.

## Build and verify

The repository is self-contained and does not require a root workspace:

```bash
npm run verify
npm run pack:check
```

`npm run verify` rebuilds `dist/`, syntax-checks every generated JavaScript
artifact, rejects unresolved imported aliases, and verifies that docs/examples
remain procedural and asset-free. `npm run pack:check` also runs npm's dry-run
package manifest check.

## Examples

- `examples/prototype-module.html`: module-entrypoint proof.
- `examples/prototype-cdn.html`: plain-script/global proof with local, npm, and
  Git-backed CDN fallback candidates and a `?runtime=` override for testing.
- `examples/single-html-cdn/index.html`: direct host page for a downloaded or
  CDN global bundle; it does not create an iframe.

Serve examples over HTTP when testing module imports. The global page can also
be opened directly from a static host or from a local file when its local
`dist/` sibling is present.

## Design boundary

The facade owns Phaser lifecycle, room/layout coordinates, input, timing,
draw/UI primitives, entity lifecycle, and procedural UI textures. Game-specific
scenes, image assets, story data, and consumer integrations remain in the
consuming project.
