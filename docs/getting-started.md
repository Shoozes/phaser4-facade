# Getting started

`phaser4-facade` is a small Phaser 4 runtime facade for procedural 2D game
templates. It owns lifecycle, room sizing, input, entities, drawing, UI
toolkit helpers, transitions, and compatibility aliases. It does not own game
images or consumer-specific content.

## Vite or npm module

Install Phaser and the facade in the consuming app, then import the facade once
before using `GM.*`:

```js
import "phaser4-facade";

GM.app.start({
    width: 720,
    height: 1280,
    create() {
        GM.entity.spawn({
            create() {
                this.x = GM.runtime.roomWidth / 2;
                this.y = GM.runtime.roomHeight / 2;
            },
            draw() {
                GM.draw.setColor(GM.color.LIME);
                GM.draw.circle(this.x, this.y, 60, false);
            }
        });
    }
});
```

## Browser global

Load Phaser first, then the versioned global artifact from npm/jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/npm/phaser@4.1.0/dist/phaser.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/phaser4-facade@0.1.0/dist/gm-phaser4.global.min.js"></script>
```

The global entrypoint validates `window.Phaser` and installs `window.GM`.

For a direct test of the current public Git build, use the executable
JavaScript-MIME jsDelivr endpoint (no iframe required):

```html
<script src="https://cdn.jsdelivr.net/gh/Shoozes/phaser4-facade@main/dist/gm-phaser4.global.min.js"></script>
```

## Next steps

- Use `docs/how-to-procedural-ui.md` for panels, buttons, text, and hit regions.
- Use `examples/` for runnable module/global proofs.
- Run `npm run verify` before publishing or consuming a new build.
- Keep images, audio, and game-specific data in the consuming template.
