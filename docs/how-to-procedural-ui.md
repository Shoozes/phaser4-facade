# How to build a procedural UI surface

Use the facade's UI toolkit and registered runtime buttons so visuals and hit
regions share one owner.

```js
GM.ui.buttonCenter(360, 1120, 260, 72, "Continue", () => {
    GM.debug.log("continue");
});
```

For custom geometry, keep the draw rectangle and interactive rectangle
explicit. Leave a visible dead zone between nested actions instead of putting a
small action over a larger parent action. The consuming game should report its
layout rectangles to its own diagnostics; the facade should remain generic.

Use `GM.ui.setTheme(...)` for colors, fonts, radii, and scale-friendly visual
tokens. Generated Canvas 2D textures are optional helpers, not shipped image
assets. If a project needs production art, keep that art in the project asset
pack and document its license there.
