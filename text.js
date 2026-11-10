'use strict';

/* ------------------------------------------------------------------
   Text layers. A text layer is an ordinary layer whose bitmap is a
   canvas redrawn from its `text` settings, so blend, opacity, trim,
   rotate, colour key and every FX apply to it unchanged.
   Shares globals with app.js and browser.js.
------------------------------------------------------------------ */

// Bundled fonts (fonts/text, declared in app.css) plus any the user loads.
// Each keeps its family name on the layer, so the list order can change.
const FONTS = [
  { label: 'BIGBLUE TERMINAL', family: 'MG BigBlue Terminal' },
  { label: 'IBM 3270 (X3270)', family: '3270' },
  { label: 'FIRA CODE', family: 'MG Fira Code' },
  { label: 'VT323', family: 'MG VT323' },
  { label: 'SHARE TECH MONO', family: 'MG Share Tech Mono' },
  { label: 'SPACE MONO', family: 'MG Space Mono' },
  { label: 'PRESS START 2P', family: 'MG Press Start 2P' },
  { label: 'SILKSCREEN', family: 'MG Silkscreen' },
  { label: 'PIXELIFY SANS', family: 'MG Pixelify Sans' },
  { label: 'MAJOR MONO DISPLAY', family: 'MG Major Mono Display' },
  { label: 'CHERRY BOMB ONE (CUTE)', family: 'MG Cherry Bomb One' },
  { label: 'DYNAPUFF (CUTE)', family: 'MG DynaPuff' },
  { label: 'HACHI MARU POP (CUTE)', family: 'MG Hachi Maru Pop' },
  { label: 'MOCHIY POP ONE (CUTE)', family: 'MG Mochiy Pop One' },
  { label: 'SNIGLET (CUTE)', family: 'MG Sniglet' },
  { label: 'PACIFICO (CUTE)', family: 'MG Pacifico' },
];
const ALIGNS = ['left', 'center', 'right'];
const TEXT_MAX_PX = 16e6; // keep the text bitmap inside canvas limits

const measureCtx = document.createElement('canvas').getContext('2d');
const fontCss = (t, size) => `${size}px "${t.font}", monospace`;

// Draws the text into a fresh canvas at up to 2x, and keeps the layer's
// centre where it was.
function drawText(l) {
  const t = l.text;
  const lines = t.content.split('\n');
  measureCtx.font = fontCss(t, t.size);
  measureCtx.letterSpacing = t.spacing + 'px';
  const widths = lines.map((s) => measureCtx.measureText(s).width);
  const m = measureCtx.measureText('Mgjy');
  const asc = m.fontBoundingBoxAscent ?? t.size * 0.8;
  const desc = m.fontBoundingBoxDescent ?? t.size * 0.25;
  const lineH = (t.size * t.lineHeight) / 100;
  const pad = Math.ceil(t.size * 0.3 + t.outline);
  const w = Math.max(1, Math.ceil(Math.max(0, ...widths) + pad * 2));
  const h = Math.max(1, Math.ceil(asc + desc + lineH * (lines.length - 1) + pad * 2));
  const r = Math.max(0.25, Math.min(2, Math.sqrt(TEXT_MAX_PX / (w * h)), 8192 / Math.max(w, h)));

  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * r));
  c.height = Math.max(1, Math.round(h * r));
  const x = c.getContext('2d');
  x.scale(c.width / w, c.height / h);
  x.font = fontCss(t, t.size);
  x.letterSpacing = t.spacing + 'px';
  x.textBaseline = 'alphabetic';
  x.textAlign = t.align;
  const ax = t.align === 'left' ? pad : t.align === 'right' ? w - pad : w / 2;
  lines.forEach((s, i) => {
    const y = pad + asc + i * lineH;
    if (t.outline > 0) {
      x.lineJoin = 'round';
      x.lineWidth = t.outline * 2;
      x.strokeStyle = t.outlineColor;
      x.strokeText(s, ax, y);
    }
    x.fillStyle = t.color;
    x.fillText(s, ax, y);
  });

  const cx = l.x + (l.w * l.scale) / 2, cy = l.y + (l.h * l.scale) / 2;
  l.bmp = c;
  l.res = c.width / w;
  l.w = w;
  l.h = h;
  l.x = cx - (w * l.scale) / 2;
  l.y = cy - (h * l.scale) / 2;
  l.name = '"' + (lines[0].trim().slice(0, 24) || ' ') + (lines.length > 1 || lines[0].length > 24 ? '...' : '') + '"';
}

// Redraw now, then again once the font has actually loaded.
function updateText(l) {
  drawText(l);
  const tok = (l.textTok = (l.textTok || 0) + 1);
  document.fonts.load(fontCss(l.text, 32), l.text.content || 'A').then(() => {
    if (l.textTok !== tok) return;
    drawText(l);
    requestRender();
  }).catch(() => {});
  renderLayerList();
  syncLayerProps();
  requestRender();
}

function addTextLayer() {
  const fresh = !state.doc;
  if (fresh) state.doc = { w: 1920, h: 1080, name: 'text' };
  const l = makeLayer(document.createElement('canvas'), 'TEXT');
  l.type = 'text';
  l.w = l.h = 1;
  l.text = {
    content: 'MEOW', font: FONTS[0].family, size: Math.round(Math.min(state.doc.w, state.doc.h) / 5),
    color: '#ffffff', align: 'center', lineHeight: 110, spacing: 0, outline: 0, outlineColor: '#000000',
  };
  drawText(l);
  centerLayer(l);
  state.layers.push(l);
  state.sel = l.id;
  if (fresh) refreshAll();
  updateText(l);
  syncFx();
  setStatus('> ADDED A TEXT LAYER. EDIT IT UNDER // TEXT');
  const ta = $('textContent');
  ta.focus();
  ta.select();
}

/* ---------------- user fonts (kept in IndexedDB) ---------------- */

async function registerUserFont(name, buf) {
  const family = 'MG User ' + name;
  if (FONTS.some((f) => f.family === family)) return family;
  const face = new FontFace(family, buf);
  await face.load();
  document.fonts.add(face);
  FONTS.push({ label: name.toUpperCase() + ' (LOADED)', family });
  return family;
}

async function loadUserFont(file) {
  const name = file.name.replace(/\.(ttf|otf|woff2?)$/i, '');
  try {
    const buf = await file.arrayBuffer();
    const family = await registerUserFont(name, buf);
    const saved = (await kv.get('fonts')) || [];
    if (!saved.some((f) => f.name === name)) await kv.set('fonts', [...saved, { name, buf }]);
    textUI.setFonts();
    const l = selLayer();
    if (l?.type === 'text') { l.text.font = family; updateText(l); }
    setStatus('> LOADED FONT ' + name.toUpperCase());
  } catch (err) {
    console.error(err);
    setStatus('! COULD NOT READ ' + file.name.toUpperCase() + ' AS A FONT', true);
  }
}

async function restoreUserFonts() {
  for (const { name, buf } of (await kv.get('fonts')) || []) {
    try { await registerUserFont(name, buf); } catch { /* skip a broken file */ }
  }
  textUI.setFonts();
}

/* ---------------- panel ---------------- */

const textUI = (() => {
  const T = () => (selLayer()?.type === 'text' ? selLayer().text : null);
  const edit = (fn) => () => { const l = selLayer(); if (l?.type === 'text') { fn(l.text); updateText(l); } };
  const root = $('textControls');

  const ta = el('textarea', 'text-input');
  ta.id = 'textContent';
  ta.rows = 3;
  ta.spellcheck = false;
  ta.setAttribute('aria-label', 'Text');
  ta.addEventListener('input', edit((t) => (t.content = ta.value)));

  const font = makePicker('FONT', FONTS.map((f) => f.label),
    () => Math.max(0, FONTS.findIndex((f) => f.family === T()?.font)),
    (i) => { const t = T(); if (t) t.font = FONTS[i].family; },
    edit(() => {}));
  const loadRow = el('div', 'row');
  const loadBtn = el('button', 'btn', '>>LOAD FONT');
  loadBtn.title = 'Use a .ttf, .otf, .woff or .woff2 font from your computer; it is remembered';
  loadBtn.addEventListener('click', () => $('fontPick').click());
  loadRow.append(loadBtn);
  $('fontPick').addEventListener('change', (e) => { if (e.target.files[0]) loadUserFont(e.target.files[0]); e.target.value = ''; });

  const slider = (def, key) => makeSlider(def, () => T()?.[key] ?? def.def, (v) => { const l = selLayer(); if (l?.type === 'text') { l.text[key] = v; updateText(l); } });
  const size = slider({ label: 'SIZE', min: 4, max: 1000, def: 200 }, 'size');
  const lineH = slider({ label: 'LINE HEIGHT %', min: 50, max: 300, def: 110 }, 'lineHeight');
  const spacing = slider({ label: 'LETTER SPACING', min: -50, max: 200, def: 0 }, 'spacing');
  const outline = slider({ label: 'OUTLINE', min: 0, max: 50, def: 0 }, 'outline');
  const align = makePicker('ALIGN', ['LEFT', 'CENTER', 'RIGHT'],
    () => Math.max(0, ALIGNS.indexOf(T()?.align)),
    (i) => { const t = T(); if (t) t.align = ALIGNS[i]; },
    edit(() => {}));

  const colour = (label, key) => {
    const f = el('label', 'field');
    f.append(el('span', null, label));
    const c = el('input');
    c.type = 'color';
    c.setAttribute('aria-label', label);
    c.addEventListener('input', edit((t) => (t[key] = c.value)));
    f.append(c);
    return { el: f, update: () => { if (T()) c.value = T()[key]; } };
  };
  const color = colour('COLOR', 'color');
  const outlineColor = colour('OUTLINE COLOR', 'outlineColor');

  root.append(ta, font.el, loadRow, size.el, color.el, align.el, lineH.el, spacing.el, outline.el, outlineColor.el);
  const parts = [font, size, color, align, lineH, spacing, outline, outlineColor];

  return {
    update() {
      const t = T();
      $('textSection').hidden = !t;
      if (!t) return;
      // keep what's being typed, unless a different layer is now selected
      const id = String(state.sel);
      if (document.activeElement !== ta || ta.dataset.layer !== id) ta.value = t.content;
      ta.dataset.layer = id;
      parts.forEach((p) => p.update());
    },
    setFonts() { font.setOptions(FONTS.map((f) => f.label)); },
  };
})();

layerUI.push(textUI); // refreshed with the other layer controls
$('addText').addEventListener('click', addTextLayer);
textUI.update();
restoreUserFonts();
