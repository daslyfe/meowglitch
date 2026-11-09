# MEOW GLITCH

A browser-based glitch art editor. Stack images as layers, give each layer its own chain of GPU effects, blend them together, and export the result as PNG or JPG.

No build step, no dependencies, and nothing leaves your machine: images are processed locally with WebGL2.

## Running it

Serve the folder with any static file server and open it in a browser:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from disk also works in most browsers. It needs WebGL2 (any current Chrome, Firefox, Safari or Edge).

## Using it

- **Open, drop or paste** an image to start. `>>ADD LAYER` (or dropping more files) stacks images on top.
- **Layers:** drag a row in the layer list to restack it. Each layer has blend mode, opacity, scale, rotate, position, trim (left, right, top, bottom) and a colour key that turns a picked colour transparent, with bias and softness.
- **FX:** the `LAYER FX` tab edits the selected layer's chain, which runs before the layer is blended. The `MASTER FX` tab runs on the finished composite.
- Every menu with options has `[<]` `[>]` buttons to step through them without opening it.
- Double-click a slider to reset it. Click a module's title to fold it; `>>FOLD` folds them all.
- `>>RANDOMIZE` switches on a few random modules with random settings.

### Shortcuts

| Key | Action |
| --- | --- |
| Drag on canvas | Move the selected layer |
| Arrow keys (Shift for 10px) | Nudge the selected layer |
| Shift + click canvas | Set the blur focus point |
| Hold `\` (or `>>HOLD TO COMPARE`) | Show the image without FX |
| Esc | Cancel colour-key picking |

## Effects

Modules run top to bottom in this order.

| Group | Modules |
| --- | --- |
| Tone | **Color**: primaries-style grade with temp, tint, contrast, pivot, mid/detail, lift / gamma / gain / offset colour wheels, colour boost, shadows, highlights, saturation, hue and lum mix |
| Displacement | **Wave** (sine, square, triangle, saw, noise), **Displace** (luma, noise, blocks), **Slice**, **Fragment** |
| Corruption | **Databend** (byte-stream shifts and channel rotation), **Datamosh**, **JPEG** (real 8x8 DCT with quantisation and corrupted blocks), **Pixel Sort** |
| Color | **Posterize** (with ordered dither), **Circuit Bend** |
| Optics | **Blur** (gaussian, lens, motion, zoom, spin, tilt-shift), **Feedback** |
| Analog | **VHS**, **Interference**, **Chromatic Aberration**, **Scanlines**, **Grain**, **CRT** |

Sizes are relative to the image's long edge, so the preview and the full-resolution export match. Datamosh and feedback are still-image takes on what are normally video effects.

## Files

- `index.html`: markup
- `app.js`: state, WebGL pipeline, shaders and UI
- `app.css`: layout on top of the design system
- `css/meow-terminal.css`, `fonts/`: the Meow Terminal design system and its IBM 3270 font (see `fonts/LICENSE-3270.txt`)
