# GameMaker Compatibility Matrix

Scope: public `GM.*` and legacy GML-style aliases in `phaser4-facade`.

| Area | Supported | Intentional deviation / notes |
|------|-----------|-------------------------------|
| Angle units for `draw_sprite_ext` | Degrees | Converted with `setAngle(-degrees)` so +90 points up (counter-clockwise GM convention). |
| `point_direction` | Degrees in `[0, 360)` | right=`0`, up=`90`, left=`180`, down=`270`. |
| `lengthdir_x` / `lengthdir_y` | Degrees | Y is inverted relative to screen-down Phaser space (GM-compatible). |
| Numeric colors | GameMaker BGR integers | Converted to Phaser RGB at the draw boundary. |
| Sprite / image loading | URL-based loader keys | Generated textures use `GM.asset.addCanvas` / `addRgba` / `addAtlas`. |
| Atlas frame maps | Objects, Maps, arrays, null-prototype objects | Normalized to a safe plain object before Phaser registration. |
| Entity Create vars | `GM.entity.spawn(..., { vars, name })` | Applied before Create, matching GM creation structs. |
| Instance layers | Named layers + optional depths via `GM.layer.define` | Draw selects the instance layer with depth restore in `finally`. |
| Time step | Variable by default | Optional fixed step: `simulationHz`, `maxFrameDeltaMs`, `maxCatchUpSteps`. |
| Random | `GM.math.*` helpers | Optional seed via `randomSeed` / `GM.math.setSeed`; does not replace `Math.random`. |
| Input | Mouse/keyboard aggregate APIs | Multi-pointer substrate: `getPointer`, `activePointers`, `capturePointer(owner)`. Owner `joystick` does not globally block. |
| Legacy globals | Opt-in only | `globals: false` by default; call `GM.installGlobals()` or `globals: true`. |
| UI buttons | Immediate-mode style | Unconfigured buttons are pruned at end of frame. |
| Single game | One active `GM.app.start` | Destroy the current game before starting another. |

## Angle proof targets

- `0°` faces right
- `90°` faces up
- `180°` faces left
- `270°` faces down
- Negative scales mirror after rotation conversion
