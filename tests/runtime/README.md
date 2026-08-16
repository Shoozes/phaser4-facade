# Runtime qualification fixtures

These fixtures support Task 1 behavioral verification for `phaser4-facade`.

## Layout

- `tests/browser/` — static page + shared behavioral game used by Playwright
- `tests/runtime/` — notes and future Node-side package-consumer helpers

## Harness entry

```powershell
node scripts/build-runtime.mjs
node scripts/test-runtime-package.mjs
node scripts/test-runtime-behavior.mjs
```

Or from the package directory:

```powershell
npm run verify
```

## Matrix

The behavior harness packs the facade, installs it into a temporary consumer with Phaser `4.2.1`, then runs the same browser fixture against:

- module artifact (`dist/gm-phaser4.module.js`)
- global artifact (`dist/gm-phaser4.global.js`)
- minified global artifact (`dist/gm-phaser4.global.min.js`)
- WebGL and Canvas render modes

Work files land under ignored `runtime-data/runtime-behavior/`.
