# Facade examples

These examples are procedural and runnable. They demonstrate the global and
module entrypoints without moving game-specific image files into the facade.

## Native app browser shell

`native-app-shell.css` is the go-to CSS template for fullscreen Phaser pages
on desktop, tablets, phones, Retina/high-DPI screens, and iOS Safari. It owns
only the page shell: dynamic viewport units, safe areas, root scroll/bounce
locking, touch policy, explicit DOM scroll regions, and pixel-art canvas CSS.
Phaser remains responsible for its backing-buffer resolution.

Use the local stylesheet in a downloaded package:

```html
<link rel="stylesheet" href="./native-app-shell.css">
<body data-gm-app-shell="locked">
    <div class="gm-app-shell">
        <div id="game" class="gm-app-surface gm-app-safe-area gm-app-surface--pixel-art"></div>
    </div>
</body>
```

For a compact public single-file demo, use the GitHub-backed CDN version:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/examples/native-app-shell.css">
```

Use `gm-app-scroll-region` only around deliberate DOM content such as a
credits or settings panel. It restores vertical scrolling without unlocking
the game canvas page.

## Fruit Shot architecture matrix

- `fruit-shot-grout13.html`: preferred quick demo. A complete playable merge
  shooter in one plain HTML file. It loads Phaser 4.2.1, the facade, Grout13,
  and the bridge from GitHub-backed CDN paths. It can be opened directly from
  `file:` because it has no local module or iframe child request.
- `fruit-shot.html`: complete playable core-facade version without Grout13.
  It is also one plain HTML file and directly file-safe.
- `fruit-shot-modular.html`, `fruit-shot-modular.js`, and
  `fruit-shot-gameplay.js`: the same gameplay split into HTML import mapping,
  a small dependency launcher, and an owned gameplay module. Serve this form
  over HTTP; a direct file open shows a clear server instruction instead of
  attempting an unsafe module load.

All Fruit Shot variants use 4x authored pixel source cells for glyphs and
fruit frames, native frame dimensions, nearest-neighbor rendering, rounded
coordinates, and no arbitrary sprite rotation. The direct-pixel glyph assets
avoid Grout13's optional bundled `bitmap_text` row-order issue, so no `flipY`
workaround is applied.

`prototype-module.html` remains the smallest local package module proof.
`prototype-cdn.html` remains the smallest plain-script global proof. Both use
Phaser 4.2.1 and GitHub-backed jsDelivr URLs for public browser loading.

For a reproducible external preview, replace `@main` with a reviewed commit
SHA. Raw GitHub and Gist file URLs are source artifacts, not executable CDN
assets.

Run the focused checks from this package:

```powershell
node scripts/test-fruit-shot-example.mjs
node scripts/test-fruit-shot-browser.mjs
node scripts/test-fruit-shot-file-origin.mjs
```
