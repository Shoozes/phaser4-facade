# Text and sprite presentation options

The facade keeps persistent draw state small and predictable. Use the `Ext`
helpers when one draw call needs a different presentation; the options are
borrowed for that call and do not mutate `GM.draw` state.

```js
GM.draw.textExt(360, 80, "Fruit Shot", {
    size: 42,
    bold: true,
    color: GM.color.WHITE,
    hAlign: "center",
    vAlign: "middle",
    rotation: 0,
    scale: 1
});

GM.draw.textFit(360, 140, "A title that must stay inside the panel", {
    maxWidth: 520,
    maxHeight: 72,
    size: 34,
    minSize: 16,
    hAlign: "center",
    vAlign: "middle"
});

GM.draw.spriteExt("fruit-atlas", "apple", 360, 300, {
    scale: 1.25,
    rotation: 12,
    alpha: 0.95,
    originX: 0.5,
    originY: 0.5,
    flipX: false
});
```

`rotation` uses GameMaker degrees counter-clockwise. `scaleX` and `scaleY`
override `scale`; explicit origins override alignment-derived origins.
`maxWidth` is required for `textFit`, and `minSize` may only reduce the
preferred font size. The fitter uses measured Phaser bounds with a bounded
search. It does not enable wrapping, rich text, or an unbounded resize loop.

`GM.draw.spriteExt` also preserves the legacy positional overload. The object
overload is recognized only when the fifth argument is a non-null object, so
existing numeric calls retain their meaning.
