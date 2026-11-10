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

### Desktop app (macOS)

The same app ships as a standalone `MEOW GLITCH.app` built with Electron. With Node installed:

```sh
npm install
npm start              # run it without packaging
npm run install-app    # build dist/mac-arm64/MEOW GLITCH.app and copy it to /Applications
```

The desktop app serves the files from a private `app://` origin, so your saved folders and stars persist, and it only grants the read-only folder access the browser needs.

## Using it

- **Open, drop or paste** an image to start. `>>ADD LAYER` (or dropping more files) stacks images on top.
- **Browser:** `>>ADD FOLDER` adds a folder of images to the left pane. Expand folders, click an image to preview it at the bottom, then double-click, press Enter or drag it onto the canvas to add it as a layer (Shift+Enter or `>>OPEN` starts a new image from it). Star images or folders with `*` and find them in `STARRED`; images you've added show up in `RECENT`. The search box looks through every added folder. In Chrome and Edge, folders and stars are remembered between visits (you may be asked to grant access again after a restart); other browsers keep folders for the session only. `>>BROWSER` in the top bar shows or hides the pane.
- **Text:** `>>ADD TEXT` adds a text layer (and a 1920x1080 canvas if nothing is open). Edit it under `// TEXT` in the layer panel: the text itself (multi-line), font, size, colour, alignment, line height, letter spacing and an outline. Text layers take blend modes, trim, rotate and every FX like any other layer, and render at 2x so they stay sharp in larger exports. `>>LOAD FONT` adds any .ttf, .otf, .woff or .woff2 from your computer; loaded fonts are remembered.
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
| Up / Down (browser) | Move through the file tree and preview |
| Right / Left (browser) | Open or close a folder |
| Enter (browser) | Add the image as a layer (Shift: open as new) |
| `*` (browser) | Star or unstar |

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

## Fonts

Bundled for text layers, in `fonts/text/` (Latin subsets), with their licences in `fonts/licenses/`:

- **BigBlue Terminal** by VileR ([int10h.org](https://int10h.org/blog/2015/12/bigblue-terminal-oldschool-fixed-width-font/)), from the [Nerd Fonts](https://github.com/ryanoasis/nerd-fonts) build, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Modified: subset to Latin, box-drawing, block and arrow glyphs and converted to WOFF2.
- **IBM 3270** (the x3270 font), also the app's UI font, BSD-3 (`fonts/LICENSE-3270.txt`).
- SIL Open Font License 1.1, from Google Fonts: Fira Code, VT323, Share Tech Mono, Space Mono, Press Start 2P, Silkscreen, Pixelify Sans, Major Mono Display, and the cute set: Cherry Bomb One, DynaPuff, Hachi Maru Pop, Mochiy Pop One, Sniglet, Pacifico.

## Files

- `index.html`: markup
- `app.js`: state, WebGL pipeline, shaders and UI
- `browser.js`: the file browser (folders, stars, recent, search, preview)
- `text.js`: text layers and font loading
- `electron/main.js`, `package.json`: the desktop app shell and build config
- `assets/icon.png`: app icon (`Reality_Sea-22` from the Meow Terminal design system)
- `app.css`: layout on top of the design system
- `css/meow-terminal.css`, `fonts/`: the Meow Terminal design system and its IBM 3270 font (see `fonts/LICENSE-3270.txt`)
