'use strict';

/* ------------------------------------------------------------------
   Definitions
------------------------------------------------------------------ */

const BLENDS = [
  ['NORMAL', 'source-over'],
  ['ADD', 'lighter'],
  ['MULTIPLY', 'multiply'],
  ['SCREEN', 'screen'],
  ['OVERLAY', 'overlay'],
  ['DARKEN', 'darken'],
  ['LIGHTEN', 'lighten'],
  ['COLOR DODGE', 'color-dodge'],
  ['COLOR BURN', 'color-burn'],
  ['HARD LIGHT', 'hard-light'],
  ['SOFT LIGHT', 'soft-light'],
  ['DIFFERENCE', 'difference'],
  ['EXCLUSION', 'exclusion'],
  ['HUE', 'hue'],
  ['SATURATION', 'saturation'],
  ['COLOR', 'color'],
  ['LUMINOSITY', 'luminosity'],
];
const BLEND_VALUES = BLENDS.map((b) => b[1]);
const BLEND_LABEL = Object.fromEntries(BLENDS.map(([l, v]) => [v, l]));

// Blur modes, in the order they appear in the MODE picker.
const BLUR = { GAUSSIAN: 0, LENS: 1, MOTION: 2, ZOOM: 3, SPIN: 4, TILT: 5 };

// Every pixel-sized value is relative to the canvas's long edge, so the
// preview and the full-size export look the same.
const FX_DEFS = [
  {
    // Primaries-style grade. Wheel params expand to <wheel>Y (master) and
    // <wheel>R/G/B (balance); `reach` is the balance at the wheel's rim.
    id: 'color', title: 'COLOR', on: false, group: 'TONE',
    params: [
      { id: 'temp', label: 'TEMP', min: -100, max: 100, def: 0, rand: [-40, 40] },
      { id: 'tint', label: 'TINT', min: -100, max: 100, def: 0, rand: [-20, 20] },
      { id: 'contrast', label: 'CONTRAST', min: 0, max: 2, step: 0.001, def: 1, rand: [0.85, 1.4] },
      { id: 'pivot', label: 'PIVOT', min: 0, max: 1, step: 0.001, def: 0.435, rand: false },
      { id: 'detail', label: 'MID/DETAIL', min: -100, max: 100, def: 0, rand: [-20, 50] },
      { wheel: 'lift', label: 'LIFT', master: { min: -1, max: 1, step: 0.01, def: 0 }, chan: { min: -1, max: 1, step: 0.01, def: 0 }, reach: 0.5 },
      { wheel: 'gamma', label: 'GAMMA', master: { min: -1, max: 1, step: 0.01, def: 0 }, chan: { min: -1, max: 1, step: 0.01, def: 0 }, reach: 0.5 },
      { wheel: 'gain', label: 'GAIN', master: { min: 0, max: 4, step: 0.01, def: 1 }, chan: { min: 0, max: 4, step: 0.01, def: 1 }, reach: 1 },
      { wheel: 'offset', label: 'OFFSET', master: { min: -25, max: 25, step: 0.01, def: 0 }, chan: { min: 0, max: 50, step: 0.01, def: 25 }, reach: 25 },
      { id: 'boost', label: 'COLOR BOOST', min: -100, max: 100, def: 0, rand: [-20, 50] },
      { id: 'shadows', label: 'SHADOWS', min: -100, max: 100, def: 0, rand: [-30, 30] },
      { id: 'highlights', label: 'HIGHLIGHTS', min: -100, max: 100, def: 0, rand: [-30, 30] },
      { id: 'sat', label: 'SATURATION', min: 0, max: 100, step: 0.01, def: 50, rand: [30, 85] },
      { id: 'hue', label: 'HUE', min: 0, max: 100, step: 0.01, def: 50, rand: [35, 65] },
      { id: 'lummix', label: 'LUM MIX', min: 0, max: 100, step: 0.01, def: 100, rand: false },
    ],
  },
  {
    id: 'wave', title: 'WAVE', on: false, group: 'DISPLACEMENT',
    choice: { id: 'shape', label: 'SHAPE', options: ['SINE', 'SQUARE', 'TRIANGLE', 'SAW', 'NOISE'], def: 0 },
    params: [
      { id: 'amount', label: 'AMOUNT', min: 0, max: 100, def: 15, rand: [3, 40] },
      { id: 'length', label: 'WAVELENGTH', min: 1, max: 100, def: 20, rand: [2, 40] },
      { id: 'angle', label: 'ANGLE', min: 0, max: 180, def: 0, rand: [0, 180] },
      { id: 'phase', label: 'PHASE', min: 0, max: 360, def: 0, rand: [0, 360] },
    ],
  },
  {
    id: 'displace', title: 'DISPLACE', on: false, seed: true,
    choice: { id: 'mode', label: 'MAP', options: ['LUMA', 'NOISE', 'BLOCKS'], def: 0 },
    params: [
      { id: 'amount', label: 'AMOUNT', min: 0, max: 100, def: 15, rand: [3, 40] },
      { id: 'scale', label: 'SCALE', min: 1, max: 100, def: 20, show: [1, 2], rand: [3, 50] },
      { id: 'angle', label: 'ANGLE', min: 0, max: 360, def: 0, show: [0, 2], rand: [0, 360] },
    ],
  },
  {
    id: 'slice', title: 'SLICE', on: false, seed: true,
    params: [
      { id: 'amount', label: 'SHIFT', min: 0, max: 100, def: 30, rand: [5, 60] },
      { id: 'bands', label: 'BANDS', min: 2, max: 200, def: 40, rand: [8, 120] },
      { id: 'density', label: 'DENSITY', min: 0, max: 100, def: 25, rand: [10, 60] },
      { id: 'split', label: 'RGB SPLIT', min: 0, max: 100, def: 20, rand: [0, 80] },
    ],
  },
  {
    id: 'fragment', title: 'FRAGMENT', on: false, seed: true,
    params: [
      { id: 'density', label: 'DENSITY', min: 0, max: 100, def: 20, rand: [5, 50] },
      { id: 'size', label: 'SIZE', min: 1, max: 100, def: 25, rand: [5, 60] },
      { id: 'shift', label: 'SHIFT', min: 0, max: 100, def: 20, rand: [5, 50] },
    ],
  },
  {
    id: 'databend', title: 'DATABEND', on: false, seed: true, group: 'CORRUPTION',
    params: [
      { id: 'events', label: 'EDITS', min: 0, max: 64, def: 10, rand: [3, 30] },
      { id: 'shift', label: 'BYTE SHIFT', min: 0, max: 100, def: 30, rand: [5, 70] },
      { id: 'swap', label: 'CHANNEL SWAP', min: 0, max: 100, def: 40, rand: [0, 80] },
    ],
  },
  {
    id: 'mosh', title: 'DATAMOSH', on: false, seed: true,
    params: [
      { id: 'amount', label: 'MOTION', min: 0, max: 100, def: 30, rand: [10, 70] },
      { id: 'block', label: 'BLOCK SIZE', min: 1, max: 100, def: 20, rand: [5, 50] },
      { id: 'density', label: 'DENSITY', min: 0, max: 100, def: 50, rand: [20, 90] },
      { id: 'residual', label: 'RESIDUAL', min: 0, max: 100, def: 40, rand: [0, 100] },
    ],
  },
  {
    id: 'jpeg', title: 'JPEG', on: false, seed: true,
    params: [
      { id: 'quality', label: 'QUALITY', min: 1, max: 100, def: 15, rand: [1, 40] },
      { id: 'corrupt', label: 'CORRUPTION', min: 0, max: 100, def: 10, rand: [0, 40] },
      { id: 'block', label: 'BLOCK SCALE', min: 1, max: 8, def: 2, rand: [1, 5] },
    ],
  },
  {
    id: 'sort', title: 'PIXEL SORT', on: false,
    choice: { id: 'dir', label: 'DIRECTION', options: ['RIGHT', 'LEFT', 'UP', 'DOWN'], def: 3 },
    params: [
      { id: 'lo', label: 'THRESHOLD LOW', min: 0, max: 100, def: 25, rand: [0, 50] },
      { id: 'hi', label: 'THRESHOLD HIGH', min: 0, max: 100, def: 85, rand: [60, 100] },
      { id: 'length', label: 'LENGTH', min: 0, max: 100, def: 30, rand: [10, 50] },
    ],
  },
  {
    id: 'posterize', title: 'POSTERIZE', on: false, group: 'COLOR',
    choice: { id: 'mode', label: 'MODE', options: ['RGB', 'LUMA'], def: 0 },
    params: [
      { id: 'levels', label: 'LEVELS', min: 2, max: 32, def: 6, rand: [2, 10] },
      { id: 'dither', label: 'DITHER', min: 0, max: 100, def: 0, rand: [0, 100] },
    ],
  },
  {
    id: 'bend', title: 'CIRCUIT BEND', on: false, seed: true,
    params: [
      { id: 'bands', label: 'BANDS', min: 2, max: 100, def: 24, rand: [6, 60] },
      { id: 'density', label: 'DENSITY', min: 0, max: 100, def: 30, rand: [10, 60] },
    ],
  },
  {
    id: 'blur', title: 'BLUR', on: false, group: 'OPTICS',
    choice: { id: 'mode', label: 'MODE', options: ['GAUSSIAN', 'LENS', 'MOTION', 'ZOOM', 'SPIN', 'TILT-SHIFT'], def: 0 },
    params: [
      { id: 'radius', label: 'AMOUNT', min: 0, max: 100, def: 15, rand: [4, 30] },
      { id: 'angle', label: 'ANGLE', min: 0, max: 180, def: 0, show: [BLUR.MOTION, BLUR.TILT], rand: [0, 180] },
      { id: 'bokeh', label: 'BOKEH', min: 0, max: 100, def: 40, show: [BLUR.LENS], rand: [0, 100] },
      { id: 'focus', label: 'FOCUS SIZE', min: 0, max: 100, def: 0, rand: [0, 40] },
      { id: 'fx', label: 'FOCUS X', min: 0, max: 100, def: 50, rand: [30, 70] },
      { id: 'fy', label: 'FOCUS Y', min: 0, max: 100, def: 50, rand: [30, 70] },
    ],
  },
  {
    id: 'feedback', title: 'FEEDBACK', on: false,
    choice: { id: 'mode', label: 'BLEND', options: ['SCREEN', 'ADD', 'LIGHTEN', 'BEHIND'], def: 0 },
    params: [
      { id: 'copies', label: 'COPIES', min: 1, max: 16, def: 6, rand: [3, 12] },
      { id: 'zoom', label: 'ZOOM', min: -50, max: 50, def: -15, rand: [-30, 20] },
      { id: 'rot', label: 'ROTATE', min: -30, max: 30, step: 0.1, def: 4, rand: [-10, 10] },
      { id: 'decay', label: 'DECAY', min: 0, max: 100, def: 70, rand: [40, 90] },
      { id: 'hue', label: 'HUE STEP', min: 0, max: 100, def: 10, rand: [0, 50] },
    ],
  },
  {
    id: 'vhs', title: 'VHS', on: false, seed: true, group: 'ANALOG',
    params: [
      { id: 'tracking', label: 'TRACKING', min: 0, max: 100, def: 30, rand: [5, 70] },
      { id: 'jitter', label: 'JITTER', min: 0, max: 100, def: 20, rand: [0, 50] },
      { id: 'bleed', label: 'COLOR BLEED', min: 0, max: 100, def: 30, rand: [10, 70] },
      { id: 'noise', label: 'NOISE', min: 0, max: 100, def: 20, rand: [0, 50] },
    ],
  },
  {
    id: 'interfere', title: 'INTERFERENCE', on: false, seed: true,
    params: [
      { id: 'amount', label: 'AMOUNT', min: 0, max: 100, def: 30, rand: [10, 60] },
      { id: 'freq', label: 'FREQUENCY', min: 1, max: 100, def: 12, rand: [2, 40] },
      { id: 'angle', label: 'ANGLE', min: 0, max: 180, def: 0, rand: [0, 180] },
      { id: 'phase', label: 'ROLL', min: 0, max: 100, def: 0, rand: [0, 100] },
      { id: 'warp', label: 'WARP', min: 0, max: 100, def: 20, rand: [0, 60] },
      { id: 'static', label: 'STATIC', min: 0, max: 100, def: 10, rand: [0, 40] },
    ],
  },
  {
    id: 'chroma', title: 'CHROMATIC ABERRATION', on: true,
    choice: { id: 'mode', label: 'MODE', options: ['RADIAL', 'LINEAR'], def: 0 },
    params: [
      { id: 'amount', label: 'AMOUNT', min: 0, max: 100, def: 20, rand: [5, 60] },
      { id: 'angle', label: 'ANGLE', min: 0, max: 360, def: 0, show: [1], rand: [0, 360] },
    ],
  },
  {
    id: 'scan', title: 'SCANLINES', on: false,
    params: [
      { id: 'intensity', label: 'INTENSITY', min: 0, max: 100, def: 30, rand: [10, 60] },
      { id: 'spacing', label: 'SPACING', min: 1, max: 50, def: 4, rand: [2, 10] },
    ],
  },
  {
    id: 'grain', title: 'GRAIN', on: true, seed: true,
    choice: { id: 'color', label: 'TYPE', options: ['MONO', 'COLOR'], def: 0 },
    params: [
      { id: 'amount', label: 'AMOUNT', min: 0, max: 100, def: 25, rand: [10, 50] },
      { id: 'size', label: 'SIZE', min: 1, max: 20, def: 2, rand: [1, 6] },
    ],
  },
  {
    id: 'crt', title: 'CRT', on: false,
    params: [
      { id: 'curve', label: 'CURVATURE', min: 0, max: 100, def: 30, rand: [10, 60] },
      { id: 'mask', label: 'SHADOW MASK', min: 0, max: 100, def: 25, rand: [10, 50] },
      { id: 'maskSize', label: 'MASK SIZE', min: 1, max: 20, def: 3, rand: [1, 6] },
      { id: 'vignette', label: 'VIGNETTE', min: 0, max: 100, def: 40, rand: [10, 70] },
    ],
  },
];

const PREVIEW_MAX = 2400; // longest edge processed while editing
const CANVAS_MAX_AREA = 16777216; // Safari's canvas limit

/* ------------------------------------------------------------------
   State
------------------------------------------------------------------ */

// Layers start with every FX off; the master chain keeps the old defaults.
function defaultFx(master = false) {
  const fx = {};
  for (const d of FX_DEFS) {
    const f = { on: master && d.on, seed: 1 };
    for (const p of d.params) {
      if (!p.wheel) { f[p.id] = p.def; continue; }
      f[p.wheel + 'Y'] = p.master.def;
      for (const ch of 'RGB') f[p.wheel + ch] = p.chan.def;
    }
    if (d.choice) f[d.choice.id] = d.choice.def;
    fx[d.id] = f;
  }
  return fx;
}

const fxActive = (fx) => FX_DEFS.some((d) => fx[d.id].on);

const state = {
  doc: null, // { w, h, name }
  layers: [], // bottom first
  sel: null, // selected layer id
  master: defaultFx(true),
  fxTab: 'layer', // 'layer' | 'master'
  compare: false,
  format: 0, // 0 PNG, 1 JPG
  quality: 92,
  previewScale: 1,
};
let nextId = 1;

const $ = (id) => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const selLayer = () => state.layers.find((l) => l.id === state.sel) || null;
const curFx = () => (state.fxTab === 'master' ? state.master : selLayer()?.fx ?? null);

/* ------------------------------------------------------------------
   WebGL pipeline (runs on an offscreen canvas, one chain per layer)
------------------------------------------------------------------ */

const view = $('view');
const vctx = view.getContext('2d');
const glc = document.createElement('canvas');
const gl = glc.getContext('webgl2', {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  preserveDrawingBuffer: true,
});
const lc = document.createElement('canvas'); // one layer, placed on the doc
const lctx = lc.getContext('2d');

const VS = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

// Textures hold premultiplied alpha, so layers keep their transparency.
const HEAD = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 res;
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 hueRot(vec3 c, float h) {
  vec3 k = vec3(0.57735027);
  float cs = cos(h), sn = sin(h);
  return c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs);
}
ivec2 clampPx(ivec2 p) { return clamp(p, ivec2(0), ivec2(res) - 1); }
`;

const FS_SLICE = `
uniform float amount;  // px
uniform float bands;
uniform float density;
uniform float split;
uniform float seed;
void main() {
  float y = 1.0 - uv.y;
  float b1 = floor(y * bands);
  float b2 = floor(y * bands * 4.0);
  float off = 0.0;
  if (hash(vec2(b1, seed)) < density)
    off += (hash(vec2(b1, seed + 1.7)) * 2.0 - 1.0) * amount;
  if (hash(vec2(b2, seed + 5.3)) < density * 0.5)
    off += (hash(vec2(b2, seed + 9.1)) * 2.0 - 1.0) * amount * 0.4;
  float o = off / res.x;
  float s = o * split;
  vec4 m = texture(src, vec2(fract(uv.x + o), uv.y));
  vec4 r = texture(src, vec2(fract(uv.x + o + s), uv.y));
  vec4 b = texture(src, vec2(fract(uv.x + o - s), uv.y));
  // shifted channels only add coverage where they carry colour, so a split
  // never leaves dark fringes around a transparent layer
  outColor = vec4(r.r, m.g, b.b, max(m.a, max(r.r, b.b)));
}`;

// mode 0: directional gaussian (one axis of a separable blur)
// mode 1: lens (disc with bokeh)   mode 2: directional box (motion)
// mode 3: zoom                     mode 4: spin
const FS_BLUR = `
uniform float mode;
uniform float radius;  // px for modes 0-2, strength for 3-4
uniform vec2 dir;
uniform float bokeh;
uniform float focus;
uniform vec2 focusPos;
uniform float band;
uniform float bandAng;
float focusMask() {
  if (focus <= 0.0 && band < 0.5) return 1.0;
  vec2 d = (uv - focusPos) * vec2(res.x / res.y, 1.0);
  float dist = band > 0.5 ? abs(dot(d, vec2(-sin(bandAng), cos(bandAng)))) : length(d);
  return smoothstep(focus, focus * 1.6 + 0.2, dist);
}
void main() {
  float r = radius * focusMask();
  if (r <= 0.0001 || (mode < 2.5 && r < 0.5)) { outColor = texture(src, uv); return; }
  float jit = hash(gl_FragCoord.xy);
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  if (mode < 0.5 || (mode > 1.5 && mode < 2.5)) {
    for (int i = 0; i < 64; i++) {
      float t = ((float(i) + jit) / 64.0) * 2.0 - 1.0;
      float w = mode < 0.5 ? exp(-t * t * 4.5) : 1.0;
      acc += texture(src, uv + dir * t * r / res) * w;
      wsum += w;
    }
  } else if (mode < 1.5) {
    float rot = jit * 6.2831853;
    for (int i = 0; i < 144; i++) {
      float t = (float(i) + 0.5) / 144.0;
      float th = float(i) * 2.39996323 + rot;
      vec2 o = vec2(cos(th), sin(th)) * sqrt(t) * r / res;
      vec4 c = texture(src, uv + o);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      float w = 1.0 + bokeh * 24.0 * pow(l, 5.0);
      acc += c * w;
      wsum += w;
    }
  } else if (mode < 3.5) {
    vec2 d = uv - focusPos;
    for (int i = 0; i < 64; i++) {
      float t = (float(i) + jit) / 64.0 - 0.5;
      acc += texture(src, uv - d * t * r);
      wsum += 1.0;
    }
  } else {
    vec2 asp = vec2(res.x / res.y, 1.0);
    vec2 d = (uv - focusPos) * asp;
    for (int i = 0; i < 64; i++) {
      float a = ((float(i) + jit) / 64.0 - 0.5) * r;
      float cs = cos(a), sn = sin(a);
      acc += texture(src, vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs) / asp + focusPos);
      wsum += 1.0;
    }
  }
  outColor = acc / wsum;
}`;

const FS_COLOR = `
uniform float temp, tint, contrast, pivot, detail, detailR;
uniform float boost, shadows, highlights, sat, hue, lummix;
uniform vec3 lift, gamma, gain, offs;   // master + balance per channel
uniform float liftM, gammaM, gainM, offM; // master only (for LUM MIX)
vec3 lgg(vec3 c, vec3 l, vec3 gm, vec3 gn, vec3 o) {
  c = (c + o) * gn;
  c += l * (1.0 - c);
  return pow(max(c, 0.0), exp(-1.5 * gm));
}
void main() {
  vec4 s = texture(src, uv);
  if (s.a <= 0.0) { outColor = s; return; }
  vec3 c = s.rgb / s.a;

  vec3 wb = vec3(1.0 + 0.25 * temp, 1.0 - 0.25 * tint, 1.0 - 0.25 * temp);
  c *= wb / luma(wb);

  vec3 full = lgg(c, lift, gamma, gain, offs);
  vec3 mono = lgg(c, vec3(liftM), vec3(gammaM), vec3(gainM), vec3(offM));
  c = full + (luma(mono) - luma(full)) * lummix;

  c = (c - pivot) * contrast + pivot;

  if (detail != 0.0) {
    float m = 0.0;
    for (int i = 0; i < 16; i++) {
      float a = float(i) * 0.3926991;
      float r = detailR * (i % 2 == 0 ? 1.0 : 0.5);
      vec4 t = texture(src, uv + vec2(cos(a), sin(a)) * r / res);
      m += luma(t.rgb / max(t.a, 0.0001));
    }
    m /= 16.0;
    float L = luma(c);
    c += (L - m) * detail * 1.5 * (1.0 - abs(clamp(L, 0.0, 1.0) * 2.0 - 1.0));
  }

  float L = luma(c);
  float ws = 1.0 - smoothstep(0.0, 0.5, L);
  float wh = smoothstep(0.5, 1.0, L);
  c += shadows * 0.4 * ws + highlights * 0.4 * wh;

  L = luma(c);
  vec3 cc = clamp(c, 0.0, 1.0);
  float chroma = max(cc.r, max(cc.g, cc.b)) - min(cc.r, min(cc.g, cc.b));
  c = L + (c - L) * sat * (1.0 + boost * (1.0 - chroma));

  if (hue != 0.0) {
    vec3 k = vec3(0.57735027);
    float cs = cos(hue), sn = sin(hue);
    c = c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs);
  }

  c = clamp(c, 0.0, 1.0);
  outColor = vec4(c * s.a, s.a);
}`;

const FS_KEY = `
uniform vec3 keyColor;
uniform float bias;
uniform float soft;
void main() {
  vec4 s = texture(src, uv);
  if (s.a <= 0.0) { outColor = s; return; }
  float d = distance(s.rgb / s.a, keyColor) / 1.7320508;
  outColor = s * smoothstep(bias, bias + soft + 0.0001, d);
}`;

// Displacement --------------------------------------------------------
const FS_WAVE = `
uniform float amount, wl, ang, phase, shape;
float wave(float t) {
  if (shape < 0.5) return sin(t * 6.2831853);
  if (shape < 1.5) return sin(t * 6.2831853) >= 0.0 ? 1.0 : -1.0;
  if (shape < 2.5) return 1.0 - 4.0 * abs(fract(t + 0.25) - 0.5);
  if (shape < 3.5) return fract(t) * 2.0 - 1.0;
  float i = floor(t), f = fract(t);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash(vec2(i, 3.7)), hash(vec2(i + 1.0, 3.7)), f) * 2.0 - 1.0;
}
void main() {
  vec2 px = uv * res;
  vec2 d = vec2(cos(ang), -sin(ang));
  vec2 n = vec2(-d.y, d.x);
  outColor = texture(src, (px + d * wave(dot(px, n) / wl + phase) * amount) / res);
}`;

const FS_DISPLACE = `
uniform float amount, scale, ang, mode, seed;
void main() {
  vec2 px = uv * res;
  vec2 d = vec2(cos(ang), -sin(ang));
  vec2 off;
  if (mode < 0.5) {
    vec4 c = texture(src, uv);
    off = c.a > 0.0 ? d * (luma(c.rgb / c.a) - 0.5) * 2.0 * amount : vec2(0.0);
  } else if (mode < 1.5) {
    vec2 q = px / scale + seed;
    off = (vec2(vnoise(q), vnoise(q + 17.3)) * 2.0 - 1.0) * 2.0 * amount;
  } else {
    off = d * (hash(floor(px / scale) + seed) * 2.0 - 1.0) * amount;
  }
  outColor = texture(src, (px + off) / res);
}`;

const FS_FRAGMENT = `
uniform float density, size, shift, seed;
void main() {
  vec2 px = uv * res;
  vec2 off = vec2(0.0);
  for (int k = 0; k < 4; k++) {
    float fk = float(k) + seed;
    vec2 cs = size * vec2(0.5 + 2.0 * hash(vec2(fk, 1.3)), 0.25 + 1.0 * hash(vec2(fk, 2.9)));
    vec2 o = vec2(hash(vec2(fk, 4.1)), hash(vec2(fk, 5.7))) * cs;
    vec2 cell = floor((px + o) / cs);
    if (hash(cell + fk * 7.7) < density) {
      off = (vec2(hash(cell + fk * 3.1), hash(cell + fk * 5.3)) * 2.0 - 1.0) * shift;
      break;
    }
  }
  outColor = texture(src, (px + off) / res);
}`;

// Corruption ----------------------------------------------------------
// The image read as one byte stream (rows top to bottom). Each edit, from
// its position onward, shifts the stream and may rotate the channels.
const FS_DATABEND = `
uniform float events, shift, swap, seed;
void main() {
  ivec2 R = ivec2(res);
  int x = int(gl_FragCoord.x);
  int row = R.y - 1 - int(gl_FragCoord.y);
  int total = R.x * R.y;
  int idx = row * R.x + x;
  float at = float(idx) / float(total);
  float off = 0.0;
  int rot = 0;
  for (int i = 0; i < 64; i++) {
    if (float(i) >= events) break;
    float fi = float(i);
    if (at >= hash(vec2(fi, seed))) {
      off += (hash(vec2(fi, seed + 1.3)) * 2.0 - 1.0) * shift;
      if (hash(vec2(fi, seed + 2.9)) < swap) rot += 1 + int(hash(vec2(fi, seed + 4.1)) * 2.0);
    }
  }
  int j = idx - int(floor(off * float(R.x)));
  j = ((j % total) + total) % total;
  vec4 c = texelFetch(src, ivec2(j % R.x, R.y - 1 - j / R.x), 0);
  rot = rot % 3;
  if (rot == 1) c.rgb = c.brg;
  else if (rot == 2) c.rgb = c.gbr;
  outColor = c;
}`;

// A still-image stand-in for a P-frame mosh: pixels follow a blocky motion
// field through several hops, and the residual leaves ghosted edges.
const FS_MOSH = `
uniform float amount, bsize, density, residual, seed;
vec2 mv(vec2 px) {
  vec2 b = floor(px / bsize);
  if (hash(b + seed) >= density) return vec2(0.0);
  vec2 q = b * 0.35 + seed;
  return (vec2(vnoise(q), vnoise(q + 9.1)) * 2.0 - 1.0) * amount;
}
void main() {
  vec2 px = uv * res;
  vec2 q = px;
  vec2 m0 = mv(px);
  for (int i = 0; i < 6; i++) q -= mv(q);
  vec4 c = texture(src, q / res);
  c += (texture(src, uv) - texture(src, (px - m0) / res)) * residual;
  c = clamp(c, 0.0, 1.0);
  c.rgb = min(c.rgb, vec3(c.a));
  outColor = c;
}`;

// JPEG: real 8x8 DCT in four separable passes on float targets. A "cell" is
// unit x unit pixels so the blocks keep their size between preview and export.
const JPEG_HEAD = `
uniform float unit;
ivec2 cell() { return ivec2(floor(gl_FragCoord.xy / unit)); }
ivec2 cellPx(ivec2 g) { return clampPx(ivec2((vec2(g) + 0.5) * unit)); }
const float PI16 = 0.19634954;
`;
const FS_JPEG_A = JPEG_HEAD + `
vec3 ycc(vec4 c) {
  vec3 p = c.rgb / max(c.a, 0.0001) * 255.0;
  return vec3(0.299 * p.r + 0.587 * p.g + 0.114 * p.b - 128.0,
              -0.168736 * p.r - 0.331264 * p.g + 0.5 * p.b,
              0.5 * p.r - 0.418688 * p.g - 0.081312 * p.b);
}
void main() {
  ivec2 g = cell();
  int u = g.x % 8;
  vec3 s = vec3(0.0);
  for (int k = 0; k < 8; k++)
    s += ycc(texelFetch(src, cellPx(ivec2(g.x - u + k, g.y)), 0)) * cos(float(2 * k + 1) * float(u) * PI16);
  outColor = vec4(s * 0.5 * (u == 0 ? 0.70710678 : 1.0), 1.0);
}`;
const FS_JPEG_B = JPEG_HEAD + `
uniform float qscale, corrupt, seed;
const float QL[64] = float[64](16.0,11.0,10.0,16.0,24.0,40.0,51.0,61.0,12.0,12.0,14.0,19.0,26.0,58.0,60.0,55.0,14.0,13.0,16.0,24.0,40.0,57.0,69.0,56.0,14.0,17.0,22.0,29.0,51.0,87.0,80.0,62.0,18.0,22.0,37.0,56.0,68.0,109.0,103.0,77.0,24.0,35.0,55.0,64.0,81.0,104.0,113.0,92.0,49.0,64.0,78.0,87.0,103.0,121.0,120.0,101.0,72.0,92.0,95.0,98.0,112.0,100.0,103.0,99.0);
const float QC[64] = float[64](17.0,18.0,24.0,47.0,99.0,99.0,99.0,99.0,18.0,21.0,26.0,66.0,99.0,99.0,99.0,99.0,24.0,26.0,56.0,99.0,99.0,99.0,99.0,99.0,47.0,66.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0,99.0);
void main() {
  ivec2 g = cell();
  int u = g.x % 8, v = g.y % 8;
  vec3 s = vec3(0.0);
  for (int k = 0; k < 8; k++)
    s += texelFetch(src, cellPx(ivec2(g.x, g.y - v + k)), 0).rgb * cos(float(2 * k + 1) * float(v) * PI16);
  s *= 0.5 * (v == 0 ? 0.70710678 : 1.0);
  int qi = v * 8 + u;
  vec3 q = max(vec3(QL[qi], QC[qi], QC[qi]) * qscale, 1.0);
  vec2 blk = vec2(g / 8);
  if (hash(blk + seed) < corrupt) {
    if (u == 0 && v == 0) s += (vec3(hash(blk + seed + 5.1), hash(blk + seed + 6.3), hash(blk + seed + 7.7)) - 0.5) * 700.0;
    else s *= 1.0 + (hash(blk * 1.3 + vec2(float(qi), seed)) - 0.5) * 14.0 * hash(blk + seed + 3.1);
  }
  outColor = vec4(floor(s / q + 0.5) * q, 1.0);
}`;
const FS_JPEG_C = JPEG_HEAD + `
void main() {
  ivec2 g = cell();
  int y = g.y % 8;
  vec3 s = vec3(0.0);
  for (int v = 0; v < 8; v++)
    s += (v == 0 ? 0.70710678 : 1.0) * texelFetch(src, cellPx(ivec2(g.x, g.y - y + v)), 0).rgb * cos(float(2 * y + 1) * float(v) * PI16);
  outColor = vec4(s * 0.5, 1.0);
}`;
const FS_JPEG_D = JPEG_HEAD + `
uniform sampler2D orig;
void main() {
  ivec2 g = cell();
  int x = g.x % 8;
  vec3 s = vec3(0.0);
  for (int u = 0; u < 8; u++)
    s += (u == 0 ? 0.70710678 : 1.0) * texelFetch(src, cellPx(ivec2(g.x - x + u, g.y)), 0).rgb * cos(float(2 * x + 1) * float(u) * PI16);
  s *= 0.5;
  float Y = s.x + 128.0;
  vec3 rgb = vec3(Y + 1.402 * s.z, Y - 0.344136 * s.y - 0.714136 * s.z, Y + 1.772 * s.y) / 255.0;
  float a = texture(orig, uv).a;
  outColor = vec4(clamp(rgb, 0.0, 1.0) * a, a);
}`;

// One odd-even transposition step. Neighbours swap only when both fall in
// the threshold band, so runs between out-of-band pixels sort on their own.
const FS_SORT = `
uniform float lo, hi, parity, dir;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  bool vert = dir > 1.5;
  int i = vert ? p.y : p.x;
  int n = vert ? int(res.y) : int(res.x);
  bool first = ((i + int(parity)) % 2) == 0;
  int j = first ? i + 1 : i - 1;
  vec4 me = texelFetch(src, p, 0);
  if (j < 0 || j >= n) { outColor = me; return; }
  vec4 ot = texelFetch(src, vert ? ivec2(p.x, j) : ivec2(j, p.y), 0);
  float km = luma(me.rgb / max(me.a, 0.0001)), ko = luma(ot.rgb / max(ot.a, 0.0001));
  if (me.a <= 0.0 || ot.a <= 0.0 || km < lo || km > hi || ko < lo || ko > hi) { outColor = me; return; }
  bool asc = dir < 0.5 || (dir > 1.5 && dir < 2.5);
  float a = first ? km : ko, b = first ? ko : km;
  outColor = (asc ? a > b : a < b) ? ot : me;
}`;

// Colour --------------------------------------------------------------
const FS_POSTERIZE = `
uniform float levels, dither, mode, cellSize;
const float B4[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
void main() {
  vec4 s = texture(src, uv);
  if (s.a <= 0.0) { outColor = s; return; }
  vec3 c = s.rgb / s.a;
  ivec2 b = ivec2(floor(gl_FragCoord.xy / cellSize)) % 4;
  float t = ((B4[b.y * 4 + b.x] + 0.5) / 16.0 - 0.5) * dither;
  float L = levels - 1.0;
  if (mode < 0.5) c = floor(c * L + 0.5 + t) / L;
  else { float y = luma(c); c *= (floor(y * L + 0.5 + t) / L) / max(y, 0.0001); }
  outColor = vec4(clamp(c, 0.0, 1.0) * s.a, s.a);
}`;

const FS_BEND = `
uniform float bands, density, seed;
void main() {
  vec4 s = texture(src, uv);
  float b = floor((1.0 - uv.y) * bands);
  if (s.a <= 0.0 || hash(vec2(b, seed)) >= density || uv.x < hash(vec2(b, seed + 8.8)) * 0.6) { outColor = s; return; }
  vec3 c = s.rgb / s.a;
  ivec3 ci = ivec3(c * 255.0);
  int op = int(hash(vec2(b, seed + 1.7)) * 5.0);
  int k = 1 + int(hash(vec2(b, seed + 3.3)) * 5.0);
  ivec2 p = ivec2(gl_FragCoord.xy);
  if (op == 0) c = 1.0 - c;
  else if (op == 1) c = c.brg;
  else if (op == 2) c = vec3((ci ^ ivec3(((p.x >> k) * 37) & 255)) & 255) / 255.0;
  else if (op == 3) c = vec3((ci << k) & 255) / 255.0;
  else c = abs(c - 0.5) * 2.0;
  outColor = vec4(c * s.a, s.a);
}`;

// Optics --------------------------------------------------------------
const FS_FEEDBACK = `
uniform float copies, zoom, rot, decay, hueStep, mode;
void main() {
  vec2 asp = vec2(res.x / res.y, 1.0);
  vec4 acc = texture(src, uv);
  float w = 1.0;
  for (int i = 1; i <= 16; i++) {
    float fi = float(i);
    if (fi > copies) break;
    w *= decay;
    float a = -rot * fi;
    vec2 d = (uv - 0.5) * asp / pow(zoom, fi);
    d = vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
    vec2 q = d / asp + 0.5;
    if (any(lessThan(q, vec2(0.0))) || any(greaterThan(q, vec2(1.0)))) continue;
    vec4 c = texture(src, q);
    c.rgb = clamp(hueRot(c.rgb, hueStep * fi), 0.0, c.a);
    c *= w;
    if (mode < 0.5) acc = acc + c - acc * c;
    else if (mode < 1.5) acc = min(acc + c, 1.0);
    else if (mode < 2.5) acc = max(acc, c);
    else acc = acc + c * (1.0 - acc.a);
  }
  acc.rgb = min(acc.rgb, vec3(acc.a));
  outColor = acc;
}`;

// Analog --------------------------------------------------------------
const FS_VHS = `
uniform float tracking, jitter, bleed, noise, seed, lineH, unitPx;
const mat3 TO_YIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
const mat3 TO_RGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
void main() {
  float y = (1.0 - uv.y) * res.y;
  float line = floor(y / lineH);
  float off = (hash(vec2(line, seed)) - 0.5) * jitter;
  float db = abs(y - hash(vec2(seed, 1.1)) * res.y) / (res.y * 0.06);
  float band = db < 1.0 ? (1.0 - db) * (1.0 - db) : 0.0;
  off += band * tracking * (hash(vec2(line, seed + 2.2)) - 0.3);
  off += smoothstep(res.y * 0.965, res.y, y) * tracking * 0.6;
  vec2 base = vec2(uv.x + off / res.x, uv.y);
  vec4 c = texture(src, base);
  vec3 yiq = TO_YIQ * c.rgb;
  if (bleed > 0.0) {
    vec2 iq = vec2(0.0);
    for (int i = 0; i < 12; i++) {
      float t = float(i) / 11.0;
      iq += (TO_YIQ * texture(src, base - vec2(t * bleed / res.x, 0.0)).rgb).yz;
    }
    yiq.yz = iq / 12.0;
  }
  c.rgb = TO_RGB * yiq;
  float n = hash(vec2(floor(uv.x * res.x / unitPx), line + seed * 3.0)) - 0.5;
  float streak = step(1.0 - noise * 0.03, hash(vec2(line, seed + 5.5)))
               * step(0.5, hash(vec2(floor(uv.x * res.x / (unitPx * 20.0)), line)));
  c.rgb += ((band * 1.5 + 0.15) * noise * n + streak * 0.6) * c.a;
  c.rgb = clamp(c.rgb, 0.0, c.a);
  outColor = c;
}`;

const FS_INTERFERE = `
uniform float amount, freq, ang, phase, warp, staticAmt, seed, unitPx;
void main() {
  vec2 n = vec2(sin(ang), cos(ang));
  float t = (dot(uv * vec2(res.x / res.y, 1.0), n) * freq + phase) * 6.2831853;
  vec4 c = texture(src, uv + vec2(n.y, -n.x) * sin(t) * warp / res);
  vec3 rainbow = vec3(sin(t), sin(t + 2.094), sin(t + 4.189));
  float moire = sin(t * 7.13 + sin(t * 0.5) * 2.0);
  c.rgb += (rainbow * 0.6 + moire * 0.4) * amount * 0.3 * c.a;
  float sn = hash(floor(uv * res / unitPx) + seed);
  c.rgb = mix(c.rgb, vec3(sn) * c.a, staticAmt * 0.7);
  c.rgb = clamp(c.rgb, 0.0, c.a);
  outColor = c;
}`;

// Last pass, straight to the canvas: CRT when on, otherwise a copy.
const FS_PRESENT = `
uniform float on, curve, mask, maskSize, vig, opaque;
void main() {
  if (on < 0.5) { outColor = texture(src, uv); return; }
  vec2 cc = uv * 2.0 - 1.0;
  cc *= 1.0 + curve * cc.yx * cc.yx;
  vec2 q = cc * 0.5 + 0.5;
  if (any(lessThan(q, vec2(0.0))) || any(greaterThan(q, vec2(1.0)))) { outColor = vec4(0.0, 0.0, 0.0, opaque); return; }
  vec4 c = texture(src, q);
  float col = mod(floor(gl_FragCoord.x / maskSize), 3.0);
  vec3 m = col < 0.5 ? vec3(1.0, 0.0, 0.0) : col < 1.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
  c.rgb *= mix(vec3(1.0), m * 1.5 + 0.5, mask);
  c.rgb *= clamp(1.0 - vig * pow(dot(cc, cc) * 0.5, 1.5) * 1.6, 0.0, 1.0);
  outColor = vec4(clamp(c.rgb, 0.0, c.a), c.a);
}`;

const FS_FINAL = `
uniform float cOn, cAmt, cMode, cAngle;
uniform float sOn, sInt, sSpace;
uniform float gOn, gAmt, gSize, gSeed, gColor;
void main() {
  vec2 px = uv * res;
  vec4 c = texture(src, uv);
  if (cOn > 0.5 && cAmt > 0.0) {
    vec2 off;
    if (cMode < 0.5) {
      vec2 ctr = res * 0.5;
      off = (px - ctr) / length(ctr) * cAmt;
    } else {
      off = vec2(cos(cAngle), sin(cAngle)) * cAmt;
    }
    vec2 o = off / res;
    vec4 a = texture(src, uv + o);
    vec4 b = texture(src, uv - o);
    c = vec4(a.r, c.g, b.b, max(c.a, max(a.r, b.b)));
  }
  if (sOn > 0.5) {
    float y = (1.0 - uv.y) * res.y;
    float s = 0.5 + 0.5 * cos(y / sSpace * 6.2831853);
    c.rgb *= 1.0 - sInt * s;
  }
  if (gOn > 0.5) {
    vec2 cell = floor(px / max(gSize, 1.0));
    vec2 k = vec2(gSeed * 17.13, gSeed * 3.71);
    float g = hash(cell + k) + hash(cell + k + 11.1) - 1.0;
    vec3 n = vec3(g);
    if (gColor > 0.5) {
      n.g = hash(cell + k + 23.7) + hash(cell + k + 37.3) - 1.0;
      n.b = hash(cell + k + 51.9) + hash(cell + k + 67.1) - 1.0;
    }
    float l = dot(c.rgb, vec3(0.299, 0.587, 0.114)) / max(c.a, 0.0001);
    float w = 1.0 - 0.6 * abs(l * 2.0 - 1.0);
    c.rgb += n * gAmt * w * c.a;
  }
  c.a = clamp(c.a, 0.0, 1.0);
  outColor = vec4(clamp(c.rgb, 0.0, c.a), c.a);
}`;

let progs = null;
let srcTex = null;
const fb = [];
const fbF = []; // half-float targets (JPEG)
let glSize = [0, 0];
let maxDim = 4096;

function initGL() {
  if (!gl || !vctx || !lctx) return false;
  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const vs = shader(gl.VERTEX_SHADER, VS);
  const program = (fsrc) => {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, HEAD + fsrc));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return { p, loc: {} };
  };
  progs = {
    key: program(FS_KEY), color: program(FS_COLOR), slice: program(FS_SLICE), blur: program(FS_BLUR),
    final: program(FS_FINAL), wave: program(FS_WAVE), displace: program(FS_DISPLACE),
    fragment: program(FS_FRAGMENT), databend: program(FS_DATABEND), mosh: program(FS_MOSH),
    sort: program(FS_SORT), posterize: program(FS_POSTERIZE), bend: program(FS_BEND),
    feedback: program(FS_FEEDBACK), vhs: program(FS_VHS), interfere: program(FS_INTERFERE),
    present: program(FS_PRESENT),
  };
  // JPEG needs float render targets for its DCT coefficients
  if (gl.getExtension('EXT_color_buffer_float')) {
    progs.jpegA = program(FS_JPEG_A);
    progs.jpegB = program(FS_JPEG_B);
    progs.jpegC = program(FS_JPEG_C);
    progs.jpegD = program(FS_JPEG_D);
  }

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  srcTex = makeTex();
  for (let i = 0; i < 2; i++) {
    const tex = makeTex();
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    fb.push({ tex, fbo });
  }
  if (progs.jpegA) {
    for (let i = 0; i < 2; i++) {
      const tex = makeTex(gl.NEAREST);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      fbF.push({ tex, fbo });
    }
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  maxDim = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), vp[0], vp[1]);
  return true;
}

function makeTex(filter = gl.LINEAR) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function setGLSize(w, h) {
  if (glSize[0] === w && glSize[1] === h) return;
  glc.width = w;
  glc.height = h;
  for (const { tex } of fb) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }
  for (const { tex } of fbF) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  }
  glSize = [w, h];
}

function uni(prog, name, ...v) {
  let l = prog.loc[name];
  if (l === undefined) l = prog.loc[name] = gl.getUniformLocation(prog.p, name);
  if (v.length === 1) gl.uniform1f(l, v[0]);
  else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
  else gl.uniform3f(l, v[0], v[1], v[2]);
}

function pass(prog, input, target, w, h, set, orig = null) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
  gl.viewport(0, 0, w, h);
  gl.useProgram(prog.p);
  if (orig) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, orig);
    gl.uniform1i(gl.getUniformLocation(prog.p, 'orig'), 1);
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, input);
  gl.uniform1i(gl.getUniformLocation(prog.p, 'src'), 0);
  uni(prog, 'res', w, h);
  set();
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// Runs one FX chain over `source` (a W x H canvas). The result is left on glc.
// `key` is the layer's colour key ({ on, color, bias, soft }), applied first.
function runFx(fx, source, W, H, key = null, opaque = false) {
  const long = Math.max(W, H);
  setGLSize(W, H);
  gl.bindTexture(gl.TEXTURE_2D, srcTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);

  let input = srcTex;
  let ping = 0;
  const step = (prog, set) => {
    pass(prog, input, fb[ping], W, H, set);
    input = fb[ping].tex;
    ping ^= 1;
  };

  if (key?.on) {
    const P = progs.key;
    const hex = parseInt(key.color.slice(1), 16);
    step(P, () => {
      uni(P, 'keyColor', ((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
      uni(P, 'bias', key.bias / 100);
      uni(P, 'soft', (key.soft / 100) * 0.5);
    });
  }

  const co = fx.color;
  if (co.on) {
    const P = progs.color;
    step(P, () => {
      uni(P, 'temp', co.temp / 100);
      uni(P, 'tint', co.tint / 100);
      uni(P, 'contrast', co.contrast);
      uni(P, 'pivot', co.pivot);
      uni(P, 'detail', co.detail / 100);
      uni(P, 'detailR', Math.max(2, long * 0.012));
      uni(P, 'lift', co.liftY + co.liftR, co.liftY + co.liftG, co.liftY + co.liftB);
      uni(P, 'gamma', co.gammaY + co.gammaR, co.gammaY + co.gammaG, co.gammaY + co.gammaB);
      uni(P, 'gain', co.gainY * co.gainR, co.gainY * co.gainG, co.gainY * co.gainB);
      const o = (v) => (co.offsetY + v - 25) / 50;
      uni(P, 'offs', o(co.offsetR), o(co.offsetG), o(co.offsetB));
      uni(P, 'liftM', co.liftY);
      uni(P, 'gammaM', co.gammaY);
      uni(P, 'gainM', co.gainY);
      uni(P, 'offM', co.offsetY / 50);
      uni(P, 'boost', co.boost / 100);
      uni(P, 'shadows', co.shadows / 100);
      uni(P, 'highlights', co.highlights / 100);
      uni(P, 'sat', co.sat / 50);
      uni(P, 'hue', ((co.hue - 50) / 50) * Math.PI);
      uni(P, 'lummix', co.lummix / 100);
    });
  }

  const rad = (deg) => (deg * Math.PI) / 180;
  const run = (id, prog, set) => { if (fx[id].on) step(progs[prog || id], () => set(progs[prog || id], fx[id])); };

  run('wave', null, (P, f) => {
    uni(P, 'amount', (f.amount / 500) * long);
    uni(P, 'wl', Math.max(2, (f.length / 100) * long * 0.5));
    uni(P, 'ang', rad(f.angle));
    uni(P, 'phase', f.phase / 360);
    uni(P, 'shape', f.shape);
  });
  run('displace', null, (P, f) => {
    uni(P, 'amount', (f.amount / 400) * long);
    uni(P, 'scale', Math.max(2, (f.scale / 100) * long * 0.25));
    uni(P, 'ang', rad(f.angle));
    uni(P, 'mode', f.mode);
    uni(P, 'seed', (f.seed % 997) * 7.31);
  });

  const sl = fx.slice;
  if (sl.on && sl.amount > 0 && sl.density > 0) {
    const P = progs.slice;
    step(P, () => {
      uni(P, 'amount', (sl.amount / 400) * long);
      uni(P, 'bands', sl.bands);
      uni(P, 'density', sl.density / 100);
      uni(P, 'split', sl.split / 100);
      uni(P, 'seed', sl.seed * 13.37);
    });
  }

  run('fragment', null, (P, f) => {
    uni(P, 'density', (f.density / 100) * 0.5);
    uni(P, 'size', Math.max(4, (f.size / 100) * long * 0.3));
    uni(P, 'shift', (f.shift / 100) * long * 0.3);
    uni(P, 'seed', (f.seed % 997) * 3.17);
  });
  run('databend', null, (P, f) => {
    uni(P, 'events', f.events);
    uni(P, 'shift', (f.shift / 100) * 2);
    uni(P, 'swap', f.swap / 100);
    uni(P, 'seed', (f.seed % 997) * 1.37);
  });
  run('mosh', null, (P, f) => {
    uni(P, 'amount', (f.amount / 100) * long * 0.15);
    uni(P, 'bsize', Math.max(4, (f.block / 100) * long * 0.08));
    uni(P, 'density', f.density / 100);
    uni(P, 'residual', f.residual / 100);
    uni(P, 'seed', (f.seed % 997) * 2.71);
  });

  const jp = fx.jpeg;
  if (jp.on && progs.jpegA) {
    const unit = Math.max(1, Math.round((long / 1500) * jp.block));
    const q = clamp(jp.quality, 1, 100);
    const qscale = (q < 50 ? 5000 / q : 200 - 2 * q) / 100;
    const orig = input;
    const u = (P) => uni(P, 'unit', unit);
    pass(progs.jpegA, input, fbF[0], W, H, () => u(progs.jpegA));
    pass(progs.jpegB, fbF[0].tex, fbF[1], W, H, () => {
      const P = progs.jpegB;
      u(P);
      uni(P, 'qscale', qscale);
      uni(P, 'corrupt', (jp.corrupt / 100) * 0.5);
      uni(P, 'seed', (jp.seed % 997) * 1.91);
    });
    pass(progs.jpegC, fbF[1].tex, fbF[0], W, H, () => u(progs.jpegC));
    pass(progs.jpegD, fbF[0].tex, fb[ping], W, H, () => u(progs.jpegD), orig);
    input = fb[ping].tex;
    ping ^= 1;
  }

  const so = fx.sort;
  if (so.on && so.length > 0 && so.hi > so.lo) {
    const P = progs.sort;
    const passes = clamp(Math.round(((so.length / 100) * long) / 6), 1, 800);
    for (let i = 0; i < passes; i++) {
      step(P, () => {
        uni(P, 'lo', so.lo / 100);
        uni(P, 'hi', so.hi / 100);
        uni(P, 'parity', i % 2);
        uni(P, 'dir', so.dir);
      });
    }
  }

  run('posterize', null, (P, f) => {
    uni(P, 'levels', f.levels);
    uni(P, 'dither', f.dither / 100);
    uni(P, 'mode', f.mode);
    uni(P, 'cellSize', Math.max(1, Math.round(long / 1500)));
  });
  run('bend', null, (P, f) => {
    uni(P, 'bands', f.bands);
    uni(P, 'density', f.density / 100);
    uni(P, 'seed', (f.seed % 997) * 4.13);
  });

  const b = fx.blur;
  if (b.on && b.radius > 0) {
    const P = progs.blur;
    const px = (b.radius / 1000) * long;
    const ang = (b.angle * Math.PI) / 180; // screen angle, y down
    const tilt = b.mode === BLUR.TILT;
    const set = (mode, radius, dx = 0, dy = 0) => () => {
      uni(P, 'mode', mode);
      uni(P, 'radius', radius);
      uni(P, 'dir', dx, dy);
      uni(P, 'bokeh', b.bokeh / 100);
      uni(P, 'focus', (b.focus / 100) * 0.7);
      uni(P, 'focusPos', b.fx / 100, 1 - b.fy / 100);
      uni(P, 'band', tilt ? 1 : 0);
      uni(P, 'bandAng', -ang);
    };
    switch (b.mode) {
      case BLUR.GAUSSIAN:
      case BLUR.TILT:
        step(P, set(0, px, 1, 0));
        step(P, set(0, px, 0, 1));
        break;
      case BLUR.LENS: step(P, set(1, px)); break;
      case BLUR.MOTION: step(P, set(2, px * 2, Math.cos(ang), -Math.sin(ang))); break;
      case BLUR.ZOOM: step(P, set(3, (b.radius / 100) * 0.5)); break;
      case BLUR.SPIN: step(P, set(4, (b.radius / 100) * 0.6)); break;
    }
  }

  run('feedback', null, (P, f) => {
    uni(P, 'copies', f.copies);
    uni(P, 'zoom', 1 + f.zoom / 200);
    uni(P, 'rot', rad(f.rot));
    uni(P, 'decay', f.decay / 100);
    uni(P, 'hueStep', (f.hue / 100) * (Math.PI / 3));
    uni(P, 'mode', f.mode);
  });
  const unitPx = Math.max(1, long / 1200);
  run('vhs', null, (P, f) => {
    uni(P, 'tracking', (f.tracking / 100) * long * 0.08);
    uni(P, 'jitter', (f.jitter / 100) * long * 0.01);
    uni(P, 'bleed', (f.bleed / 100) * long * 0.03);
    uni(P, 'noise', f.noise / 100);
    uni(P, 'seed', (f.seed % 997) * 1.13);
    uni(P, 'lineH', Math.max(1, long / 700));
    uni(P, 'unitPx', unitPx);
  });
  run('interfere', null, (P, f) => {
    uni(P, 'amount', f.amount / 100);
    uni(P, 'freq', f.freq);
    uni(P, 'ang', rad(f.angle));
    uni(P, 'phase', f.phase / 100);
    uni(P, 'warp', (f.warp / 100) * long * 0.02);
    uni(P, 'staticAmt', f.static / 100);
    uni(P, 'seed', (f.seed % 997) * 2.37);
    uni(P, 'unitPx', unitPx);
  });

  const c = fx.chroma, sc = fx.scan, g = fx.grain;
  const P = progs.final;
  if (c.on || sc.on || g.on) step(P, () => {
    uni(P, 'cOn', c.on ? 1 : 0);
    uni(P, 'cAmt', (c.amount / 2000) * long);
    uni(P, 'cMode', c.mode);
    uni(P, 'cAngle', (c.angle * Math.PI) / 180);
    uni(P, 'sOn', sc.on && sc.intensity > 0 ? 1 : 0);
    uni(P, 'sInt', sc.intensity / 100);
    uni(P, 'sSpace', Math.max(1.5, (sc.spacing / 1000) * long));
    uni(P, 'gOn', g.on && g.amount > 0 ? 1 : 0);
    uni(P, 'gAmt', (g.amount / 100) * 0.5);
    uni(P, 'gSize', (g.size / 4000) * long);
    uni(P, 'gSeed', g.seed);
    uni(P, 'gColor', g.color);
  });

  const crt = fx.crt;
  const PP = progs.present;
  pass(PP, input, null, W, H, () => {
    uni(PP, 'on', crt.on ? 1 : 0);
    uni(PP, 'curve', (crt.curve / 100) * 0.3);
    uni(PP, 'mask', crt.mask / 100);
    uni(PP, 'maskSize', Math.max(1, crt.maskSize * (long / 2000)));
    uni(PP, 'vig', crt.vignette / 100);
    uni(PP, 'opaque', opaque ? 1 : 0);
  });
}

/* ------------------------------------------------------------------
   Compositing (Canvas 2D does the blend modes)
------------------------------------------------------------------ */

function renderAt(s) {
  const { doc } = state;
  const W = Math.max(1, Math.round(doc.w * s));
  const H = Math.max(1, Math.round(doc.h * s));
  const live = !state.compare;
  if (view.width !== W || view.height !== H) { view.width = W; view.height = H; }

  vctx.globalCompositeOperation = 'source-over';
  vctx.globalAlpha = 1;
  vctx.fillStyle = '#000';
  vctx.fillRect(0, 0, W, H);
  vctx.imageSmoothingEnabled = true;
  vctx.imageSmoothingQuality = 'high';

  for (const l of state.layers) {
    if (!l.visible || l.opacity <= 0) continue;
    const fxOn = live && fxActive(l.fx);
    if (fxOn || l.key.on) {
      if (lc.width !== W || lc.height !== H) { lc.width = W; lc.height = H; }
      else lctx.clearRect(0, 0, W, H);
      lctx.imageSmoothingEnabled = true;
      lctx.imageSmoothingQuality = 'high';
      drawLayer(lctx, l, s);
      runFx(fxOn ? l.fx : NO_FX, lc, W, H, l.key);
      vctx.globalCompositeOperation = l.blend;
      vctx.globalAlpha = l.opacity / 100;
      vctx.drawImage(glc, 0, 0);
    } else {
      vctx.globalCompositeOperation = l.blend;
      vctx.globalAlpha = l.opacity / 100;
      drawLayer(vctx, l, s);
    }
  }

  vctx.globalCompositeOperation = 'source-over';
  vctx.globalAlpha = 1;
  if (live && fxActive(state.master)) {
    runFx(state.master, view, W, H, null, true);
    vctx.drawImage(glc, 0, 0);
  }
}

const NO_FX = defaultFx();

// Trimmed source rect, in bitmap pixels.
function trimRect(l) {
  const sx = (l.w * l.trimL) / 100, sy = (l.h * l.trimT) / 100;
  return [sx, sy, l.w - sx - (l.w * l.trimR) / 100, l.h - sy - (l.h * l.trimB) / 100];
}

// Draws a layer at render scale s: trimmed, scaled and rotated about the
// centre of the untrimmed layer, so trimming never moves what is left.
function drawLayer(ctx, l, s) {
  const [sx, sy, sw, sh] = trimRect(l);
  if (sw <= 0 || sh <= 0) return;
  const k = l.scale * s;
  ctx.save();
  ctx.translate((l.x + (l.w * l.scale) / 2) * s, (l.y + (l.h * l.scale) / 2) * s);
  if (l.rot) ctx.rotate((l.rot * Math.PI) / 180);
  ctx.drawImage(l.bmp, sx, sy, sw, sh, (sx - l.w / 2) * k, (sy - l.h / 2) * k, sw * k, sh * k);
  ctx.restore();
}

// Doc point -> bitmap pixel of layer l (undoes position, scale, rotation).
function docToLayer(l, px, py) {
  const dx = px - (l.x + (l.w * l.scale) / 2), dy = py - (l.y + (l.h * l.scale) / 2);
  const a = (-l.rot * Math.PI) / 180;
  const rx = dx * Math.cos(a) - dy * Math.sin(a), ry = dx * Math.sin(a) + dy * Math.cos(a);
  return [rx / l.scale + l.w / 2, ry / l.scale + l.h / 2];
}

let raf = 0;
function requestRender() {
  if (raf || !state.doc) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    if (state.doc) renderAt(state.previewScale);
  });
}

/* ------------------------------------------------------------------
   Stage sizing
------------------------------------------------------------------ */

const stage = $('stage');

function fitCanvas() {
  const { doc } = state;
  if (!doc) return;
  const r = stage.getBoundingClientRect();
  const pad = 24;
  const k = Math.min((r.width - pad) / doc.w, (r.height - pad) / doc.h);
  const kk = Math.max(k, 0.01);
  view.style.width = Math.max(1, Math.floor(doc.w * kk)) + 'px';
  view.style.height = Math.max(1, Math.floor(doc.h * kk)) + 'px';
  $('viewReadout').textContent = 'VIEW:' + Math.round(kk * 100) + '%';
  const long = Math.max(doc.w, doc.h);
  const dpr = window.devicePixelRatio || 1;
  state.previewScale = Math.min(1, kk * dpr, PREVIEW_MAX / long, maxDim / long);
  requestRender();
}

new ResizeObserver(fitCanvas).observe(stage);

/* ------------------------------------------------------------------
   UI helpers
------------------------------------------------------------------ */

function makeSlider({ label, min, max, step = 1, def }, get, set) {
  const f = el('div', 'field');
  f.append(el('span', null, label));
  const wrap = el('div', 'slider');
  const r = el('input');
  r.type = 'range';
  r.min = min; r.max = max; r.step = step;
  r.setAttribute('aria-label', label);
  const n = el('input');
  n.type = 'number';
  n.min = min; n.max = max; n.step = step;
  n.setAttribute('aria-label', label);
  wrap.append(r, n);
  f.append(wrap);
  const apply = (v) => {
    v = clamp(Number(v), min, max);
    if (Number.isNaN(v)) return;
    set(v);
    r.value = v;
    if (document.activeElement !== n) n.value = v;
    requestRender();
  };
  r.addEventListener('input', () => { n.value = r.value; apply(r.value); });
  n.addEventListener('input', () => { if (n.value !== '') apply(n.value); });
  n.addEventListener('change', () => { n.value = get(); });
  if (def != null) r.addEventListener('dblclick', () => { apply(def); n.value = def; });
  const update = () => { r.value = n.value = get(); };
  update();
  return { el: f, update, inputs: [r, n] };
}

function makeToggle(label, get, set, after) {
  const b = el('button', 'toggle');
  b.setAttribute('role', 'switch');
  const box = el('span', 'toggle-box');
  b.append(box, ' ' + label);
  const update = () => {
    const on = get();
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
    box.textContent = on ? '[X]' : '[ ]';
  };
  b.addEventListener('click', () => { set(!get()); update(); if (after) after(); requestRender(); });
  update();
  return { el: b, update };
}

// A dropdown flanked by [<] [>] to step through the options (wraps around).
function makePicker(label, options, get, set, after) {
  const f = el('div', 'field');
  f.append(el('span', null, label));
  const p = el('div', 'picker');
  const prev = el('button', 'btn', '[<]');
  prev.setAttribute('aria-label', 'Previous ' + label.toLowerCase());
  const next = el('button', 'btn', '[>]');
  next.setAttribute('aria-label', 'Next ' + label.toLowerCase());
  const s = el('select');
  s.setAttribute('aria-label', label);
  options.forEach((o, i) => {
    const opt = el('option', null, o);
    opt.value = String(i);
    s.append(opt);
  });
  p.append(prev, s, next);
  f.append(p);
  const update = () => { s.value = String(get() ?? 0); };
  const apply = (i) => {
    set((i + options.length) % options.length);
    update();
    if (after) after();
    requestRender();
  };
  s.addEventListener('change', () => apply(Number(s.value)));
  prev.addEventListener('click', () => apply((get() ?? 0) - 1));
  next.addEventListener('click', () => apply((get() ?? 0) + 1));
  update();
  return { el: f, update, inputs: [prev, s, next] };
}

let statusTimer = 0;
function setStatus(msg, warn = false, sticky = false) {
  const s = $('status');
  s.textContent = msg;
  s.classList.toggle('is-warn', warn);
  clearTimeout(statusTimer);
  if (!sticky) statusTimer = setTimeout(idleStatus, 5000);
}
function idleStatus() {
  setStatus(
    state.doc
      ? '> DRAG MOVES THE LAYER // ARROWS NUDGE // SHIFT+CLICK SETS BLUR FOCUS // HOLD \\ TO COMPARE'
      : '> DROP, PASTE OR OPEN AN IMAGE',
    false,
    true,
  );
}

/* ------------------------------------------------------------------
   FX panel (edits the selected layer's chain, or the master chain)
------------------------------------------------------------------ */

const fxUI = [];
let folds = {};
try { folds = JSON.parse(localStorage.getItem('meowglitch.folds') || '{}'); } catch { /* private mode */ }
const saveFolds = () => { try { localStorage.setItem('meowglitch.folds', JSON.stringify(folds)); } catch { /* ignore */ } };
const FX_FALLBACK = defaultFx(); // read by the controls while nothing is selected

function buildFx() {
  const root = $('fxControls');
  for (const d of FX_DEFS) {
    if (d.group) root.append(el('div', 'fx-group', '/// ' + d.group));
    const sec = el('section', 'section');
    const h = el('h3');
    const fold = el('button', 'fold');
    const mark = el('span', 'fold-mark');
    fold.append('// ' + d.title, mark);
    h.append(fold);
    sec.append(h);
    const body = el('div', 'fold-body');
    const setFold = (open) => {
      folds[d.id] = open;
      body.hidden = !open;
      mark.textContent = open ? '[-]' : '[+]';
      fold.setAttribute('aria-expanded', String(open));
    };
    fold.addEventListener('click', () => { setFold(body.hidden); saveFolds(); });
    const f = () => (curFx() ?? FX_FALLBACK)[d.id];
    const parts = [];
    const sliders = [];
    const changed = () => { syncSec(); renderLayerList(); };
    const syncSec = () => {
      sec.classList.toggle('fx-off', !f().on);
      for (const { p, ui } of sliders) {
        if (p.show) ui.el.hidden = !p.show.includes(f()[d.choice.id]);
      }
    };
    const t = makeToggle('ENABLED', () => f().on, (v) => (f().on = v), () => {
      if (f().on && body.hidden) { setFold(true); saveFolds(); }
      changed();
    });
    parts.push(t);
    sec.append(t.el, body);
    setFold(folds[d.id] ?? false);
    if (d.choice) {
      const c = makePicker(d.choice.label, d.choice.options, () => f()[d.choice.id], (v) => (f()[d.choice.id] = v), changed);
      parts.push(c);
      body.append(c.el);
    }
    for (const p of d.params) {
      if (p.wheel) {
        const w = makeWheelGroup(p, f);
        parts.push(w);
        body.append(w.el);
        continue;
      }
      const s = makeSlider(p, () => f()[p.id], (v) => { f()[p.id] = v; renderLayerList(); });
      parts.push(s);
      sliders.push({ p, ui: s });
      body.append(s.el);
    }
    if (d.seed) {
      const row = el('div', 'row');
      const b = el('button', 'btn', '>>RESEED');
      b.addEventListener('click', () => { f().seed = 1 + Math.floor(Math.random() * 9999); requestRender(); });
      row.append(b);
      body.append(row);
    }
    if (d.id === 'jpeg') {
      const note = el('p', 'note', '! NEEDS FLOAT RENDER TARGETS, WHICH THIS BROWSER LACKS');
      note.hidden = true;
      body.append(note);
      fxUI.push(() => { note.hidden = !progs || !!progs.jpegA; });
    }
    root.append(sec);
    fxUI.push(() => { parts.forEach((p) => p.update()); syncSec(); });
  }
  for (const b of $('fxTabs').querySelectorAll('button')) {
    b.addEventListener('click', () => { state.fxTab = b.dataset.tab; syncFx(); });
  }
  $('foldAll').addEventListener('click', () => {
    const open = FX_DEFS.every((d) => !folds[d.id]);
    for (const b of root.querySelectorAll('.fold')) if ((b.getAttribute('aria-expanded') === 'true') !== open) b.click();
  });
  syncFx();
}

/* Color wheels. A wheel shows the zero-mean part of a param's R/G/B balance
   on the opponent plane (red 0deg, green 120deg, blue 240deg); dragging sets
   that part and keeps whatever all three channels share. */

const toWheel = (r, g, b) => {
  const m = (r + g + b) / 3;
  r -= m; g -= m; b -= m;
  return [r - (g + b) / 2, ((g - b) * Math.sqrt(3)) / 2];
};
const fromWheel = (x, y) => [(2 * x) / 3, -x / 3 + y / Math.sqrt(3), -x / 3 - y / Math.sqrt(3)];

const discCache = new Map();
function hueDisc(size) {
  // a canvas, not an icon image: the hues are the content of the control
  if (discCache.has(size)) return discCache.get(size);
  const c = el('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  const R = size / 2;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = i + 0.5 - R, dy = R - (j + 0.5);
      const rho = Math.hypot(dx, dy) / R;
      if (rho > 1) continue;
      const h = ((Math.atan2(dy, dx) / (2 * Math.PI)) + 1) % 1;
      const k = (n) => (n + h * 6) % 6;
      const f = (n) => 0.42 * (1 - rho * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
      const o = (j * size + i) * 4;
      // HSV with value 0.42, saturation = radius
      img.data[o] = 255 * f(5);
      img.data[o + 1] = 255 * f(3);
      img.data[o + 2] = 255 * f(1);
      img.data[o + 3] = 255 * Math.min(1, (1 - rho) * R + 0.5);
    }
  }
  x.putImageData(img, 0, 0);
  discCache.set(size, c);
  return c;
}

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function drawWheel(cv, pos, big) {
  const css = cv.clientWidth || (big ? 160 : 16);
  const dpr = window.devicePixelRatio || 1;
  const size = Math.round(css * dpr);
  if (cv.width !== size) { cv.width = cv.height = size; }
  const x = cv.getContext('2d');
  const R = size / 2;
  x.clearRect(0, 0, size, size);
  x.drawImage(hueDisc(size), 0, 0);
  x.lineWidth = Math.max(1, dpr);
  x.strokeStyle = token('--border');
  if (big) {
    x.beginPath();
    x.moveTo(R, 0); x.lineTo(R, size);
    x.moveTo(0, R); x.lineTo(size, R);
    x.stroke();
  }
  x.beginPath();
  x.arc(R, R, R - x.lineWidth / 2, 0, Math.PI * 2);
  x.stroke();
  const px = R + clamp(pos[0], -1, 1) * (R - 2 * dpr);
  const py = R - clamp(pos[1], -1, 1) * (R - 2 * dpr);
  x.fillStyle = token('--text');
  x.beginPath();
  x.arc(px, py, (big ? 4 : 2) * dpr, 0, Math.PI * 2);
  x.fill();
}

function makeWheelGroup(p, f) {
  const K = (ch) => p.wheel + ch;
  const n = p.chan.def;
  const pos = () => {
    const v = f();
    const [x, y] = toWheel(v[K('R')] - n, v[K('G')] - n, v[K('B')] - n);
    return [x / p.reach, y / p.reach];
  };
  const round = (v) => Math.round(v / p.chan.step) * p.chan.step;

  const box = el('div', 'wheel-group');
  const panel = el('div', 'wheel-panel');
  panel.hidden = true;
  const redraw = () => {
    drawWheel(icon, pos(), false);
    if (!panel.hidden) drawWheel(big, pos(), true);
  };

  const master = makeSlider({ ...p.master, label: p.label }, () => f()[K('Y')], (v) => { f()[K('Y')] = v; });
  const btn = el('button', 'wheel-btn');
  btn.setAttribute('aria-label', p.label + ' colour wheel');
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'Open the ' + p.label + ' colour wheel';
  const icon = el('canvas');
  btn.append(icon);
  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
    redraw();
  });
  master.el.firstChild.append(btn);

  const wrap = el('div', 'wheel');
  const big = el('canvas');
  big.setAttribute('aria-label', p.label + ' colour balance');
  wrap.append(big);
  const chans = ['R', 'G', 'B'].map((ch) =>
    makeSlider({ ...p.chan, label: p.label + ' ' + ch }, () => f()[K(ch)], (v) => { f()[K(ch)] = v; redraw(); renderLayerList(); }));
  const row = el('div', 'row');
  const reset = el('button', 'btn', '>>RESET ' + p.label);
  reset.addEventListener('click', () => {
    f()[K('Y')] = p.master.def;
    for (const ch of 'RGB') f()[K(ch)] = n;
    update();
    requestRender();
  });
  row.append(reset);
  panel.append(wrap, ...chans.map((c) => c.el), row, el('p', 'note', 'DRAG TO BALANCE. DOUBLE-CLICK THE WHEEL TO CENTRE IT.'));
  box.append(master.el, panel);

  let drag = null;
  const setFrom = (e) => {
    const r = big.getBoundingClientRect();
    let x = ((e.clientX - r.left) / r.width) * 2 - 1;
    let y = 1 - ((e.clientY - r.top) / r.height) * 2;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    const v = f();
    const shared = (v[K('R')] + v[K('G')] + v[K('B')]) / 3 - n;
    const d = fromWheel(x * p.reach, y * p.reach);
    ['R', 'G', 'B'].forEach((ch, i) => { v[K(ch)] = round(clamp(n + shared + d[i], p.chan.min, p.chan.max)); });
    chans.forEach((c) => c.update());
    redraw();
    requestRender();
  };
  big.addEventListener('pointerdown', (e) => { drag = true; big.setPointerCapture(e.pointerId); setFrom(e); });
  big.addEventListener('pointermove', (e) => { if (drag) setFrom(e); });
  big.addEventListener('pointerup', () => { drag = null; });
  big.addEventListener('pointercancel', () => { drag = null; });
  big.addEventListener('dblclick', () => {
    const v = f();
    const shared = (v[K('R')] + v[K('G')] + v[K('B')]) / 3;
    for (const ch of 'RGB') v[K(ch)] = round(shared);
    update();
    requestRender();
  });

  const update = () => { master.update(); chans.forEach((c) => c.update()); redraw(); };
  return { el: box, update };
}

function syncFx() {
  const fx = curFx();
  for (const b of $('fxTabs').querySelectorAll('button')) {
    b.classList.toggle('selected', b.dataset.tab === state.fxTab);
  }
  $('fxControls').hidden = !fx;
  $('fxEmpty').hidden = !!fx;
  $('randomize').disabled = $('resetFx').disabled = !fx;
  if (fx) fxUI.forEach((u) => u());
}

// Turns on a handful of modules with values drawn from each slider's `rand`
// range (or the lower part of its range).
function randomFx() {
  const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
  const fx = defaultFx();
  for (const d of FX_DEFS) {
    const f = fx[d.id];
    for (const p of d.params) {
      if (p.wheel || p.rand === false) continue;
      const [a, b] = p.rand || [p.min, p.min + (p.max - p.min) * 0.6];
      const st = p.step || 1;
      f[p.id] = clamp(Math.round((a + Math.random() * (b - a)) / st) * st, p.min, p.max);
    }
    if (d.choice) f[d.choice.id] = rnd(0, d.choice.options.length - 1);
    if (d.seed) f.seed = rnd(1, 9999);
  }
  Object.assign(fx.color, {
    liftR: rnd(-8, 8) / 100, liftG: rnd(-8, 8) / 100, liftB: rnd(-8, 8) / 100,
    gainR: rnd(85, 115) / 100, gainG: rnd(85, 115) / 100, gainB: rnd(85, 115) / 100,
  });
  if (fx.blur.mode === BLUR.TILT) fx.blur.focus = rnd(5, 25);
  const ids = FX_DEFS.map((d) => d.id).sort(() => Math.random() - 0.5);
  for (const id of ids.slice(0, rnd(2, 4))) fx[id].on = true;
  if (Math.random() < 0.5) fx.grain.on = true;
  return fx;
}

function setFx(fx) {
  const cur = curFx();
  if (!cur) return;
  Object.assign(cur, fx);
  syncFx();
  renderLayerList();
  requestRender();
}

/* ------------------------------------------------------------------
   Layers panel
------------------------------------------------------------------ */

let layerUI = [];

function buildLayerControls() {
  const root = $('layerControls');
  const L = () => selLayer();

  const blend = makePicker('BLEND', BLENDS.map((b) => b[0]),
    () => Math.max(0, BLEND_VALUES.indexOf(L()?.blend)),
    (i) => (L().blend = BLEND_VALUES[i]), renderLayerList);
  const vis = makeToggle('VISIBLE', () => !!L()?.visible, (v) => (L().visible = v), renderLayerList);
  const op = makeSlider({ label: 'OPACITY', min: 0, max: 100, def: 100 },
    () => L()?.opacity ?? 100, (v) => { L().opacity = v; renderLayerList(); });
  const sc = makeSlider({ label: 'SCALE %', min: 1, max: 400, def: 100 },
    () => Math.round((L()?.scale ?? 1) * 100), (v) => scaleLayer(L(), v / 100));

  const num = (label, key) => {
    const f = el('label', 'field');
    f.append(el('span', null, label));
    const n = el('input');
    n.type = 'number';
    n.step = 1;
    n.addEventListener('input', () => {
      if (n.value === '' || Number.isNaN(+n.value)) return;
      L()[key] = +n.value;
      requestRender();
    });
    f.append(n);
    return { el: f, update: () => { if (document.activeElement !== n) n.value = Math.round(L()?.[key] ?? 0); } };
  };
  const x = num('X', 'x');
  const y = num('Y', 'y');
  const rot = makeSlider({ label: 'ROTATE', min: -180, max: 180, step: 0.1, def: 0 },
    () => L()?.rot ?? 0, (v) => { L().rot = v; });

  root.append(blend.el, vis.el, op.el, sc.el, rot.el, x.el, y.el);

  // Trim: opposite edges can't overlap, leaving at least 1% of the layer.
  const trim = (label, key, other) => makeSlider({ label, min: 0, max: 99, step: 0.1, def: 0 },
    () => L()?.[key] ?? 0,
    (v) => { L()[key] = Math.min(v, 99 - L()[other]); queueMicrotask(() => t.forEach((u) => u.update())); });
  const t = [
    trim('LEFT', 'trimL', 'trimR'), trim('RIGHT', 'trimR', 'trimL'),
    trim('TOP', 'trimT', 'trimB'), trim('BOTTOM', 'trimB', 'trimT'),
  ];
  const trimReset = el('div', 'row');
  const tr = el('button', 'btn', '>>RESET TRIM');
  tr.addEventListener('click', () => {
    Object.assign(L(), { trimL: 0, trimR: 0, trimT: 0, trimB: 0 });
    t.forEach((u) => u.update());
    requestRender();
  });
  trimReset.append(tr);
  $('trimControls').append(...t.map((u) => u.el), trimReset);

  // Colour key
  const K = () => L()?.key ?? { on: false, color: '#00ff00', bias: 15, soft: 10 };
  const keyOn = makeToggle('ENABLED', () => K().on, (v) => (K().on = v), syncKeyOff);
  const colField = el('label', 'field');
  colField.append(el('span', null, 'COLOR'));
  const colWrap = el('div', 'row');
  const pick = el('button', 'btn', '>>PICK');
  pick.id = 'keyPick';
  pick.title = 'Then click the canvas to sample a colour from this layer';
  pick.addEventListener('click', (e) => { e.preventDefault(); setPicking(!picking); });
  const col = el('input');
  col.type = 'color';
  col.setAttribute('aria-label', 'Key colour');
  col.addEventListener('input', () => { K().color = col.value; K().on = true; keyOn.update(); syncKeyOff(); requestRender(); });
  colWrap.append(pick, col);
  colField.append(colWrap);
  const bias = makeSlider({ label: 'BIAS', min: 0, max: 100, def: 15 }, () => K().bias, (v) => (K().bias = v));
  const soft = makeSlider({ label: 'SOFTNESS', min: 0, max: 100, def: 10 }, () => K().soft, (v) => (K().soft = v));
  $('keyControls').append(keyOn.el, colField, bias.el, soft.el);
  function syncKeyOff() { $('keySection').classList.toggle('fx-off', !K().on); }
  const keyUI = { update: () => { col.value = K().color; syncKeyOff(); } };

  layerUI = [blend, vis, op, sc, rot, x, y, ...t, keyOn, keyUI, bias, soft];
}

function scaleLayer(l, s) {
  // keep the layer's centre in place
  const cx = l.x + (l.w * l.scale) / 2;
  const cy = l.y + (l.h * l.scale) / 2;
  l.scale = s;
  l.x = cx - (l.w * s) / 2;
  l.y = cy - (l.h * s) / 2;
  syncLayerProps();
}

function syncLayerProps() {
  const l = selLayer();
  $('layerProps').hidden = !l;
  $('layerEmpty').hidden = !!l || !state.layers.length;
  if (l) layerUI.forEach((u) => u.update());
}

function selectLayer(id) {
  state.sel = id;
  renderLayerList();
  syncLayerProps();
  syncFx();
}

/* Drag a row in the layer list to restack it. The list shows the top layer
   first, so it is the reverse of state.layers. */
let rowDrag = null;
let rowDragged = false; // swallows the click that ends a drag

function startRowDrag(e, l, li, handle) {
  if (e.button !== 0) return;
  rowDragged = false;
  handle.setPointerCapture(e.pointerId);
  rowDrag = { id: l.id, li, handle, y: e.clientY, on: false, slot: -1 };
  handle.addEventListener('pointermove', moveRowDrag);
  handle.addEventListener('pointerup', endRowDrag);
  handle.addEventListener('pointercancel', endRowDrag);
}

function clearDropMarks(ul) {
  for (const r of ul.children) r.classList.remove('drop-before', 'drop-after');
}

function moveRowDrag(e) {
  const d = rowDrag;
  if (!d) return;
  if (!d.on) {
    if (Math.abs(e.clientY - d.y) < 4) return;
    d.on = true;
    d.li.classList.add('dragging');
  }
  const ul = $('layers');
  const box = ul.getBoundingClientRect();
  if (e.clientY < box.top + 12) ul.scrollTop -= 8;
  else if (e.clientY > box.bottom - 12) ul.scrollTop += 8;
  const rows = [...ul.children];
  let slot = rows.length;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) { slot = i; break; }
  }
  d.slot = slot;
  clearDropMarks(ul);
  if (slot < rows.length) rows[slot].classList.add('drop-before');
  else if (rows.length) rows[rows.length - 1].classList.add('drop-after');
}

function endRowDrag(e) {
  const d = rowDrag;
  if (!d) return;
  rowDrag = null;
  d.handle.removeEventListener('pointermove', moveRowDrag);
  d.handle.removeEventListener('pointerup', endRowDrag);
  d.handle.removeEventListener('pointercancel', endRowDrag);
  d.li.classList.remove('dragging');
  clearDropMarks($('layers'));
  if (!d.on) return;
  rowDragged = true;
  if (e.type === 'pointercancel' || d.slot < 0) return;
  const list = state.layers.slice().reverse(); // top first, as displayed
  const from = list.findIndex((l) => l.id === d.id);
  let to = d.slot;
  if (to > from) to--;
  if (to !== from) {
    const [l] = list.splice(from, 1);
    list.splice(to, 0, l);
    state.layers = list.reverse();
    requestRender();
  }
  state.sel = d.id;
  renderLayerList();
  syncLayerProps();
  syncFx();
}

function renderLayerList() {
  const ul = $('layers');
  ul.textContent = '';
  for (let i = state.layers.length - 1; i >= 0; i--) {
    const l = state.layers[i];
    const li = el('li');
    if (l.id === state.sel) li.classList.add('selected');
    if (!l.visible) li.classList.add('hidden');
    const v = el('button', 'vis', l.visible ? '[X]' : '[ ]');
    v.setAttribute('aria-label', 'Toggle visibility of ' + l.name);
    v.addEventListener('click', () => { l.visible = !l.visible; renderLayerList(); syncLayerProps(); requestRender(); });
    const b = el('button', 'pick');
    const meta = BLEND_LABEL[l.blend] + ' ' + l.opacity + (fxActive(l.fx) ? ' FX' : '');
    b.append(el('span', 'name', l.name), el('span', 'meta', meta));
    b.title = 'Click to select, drag to reorder';
    b.addEventListener('click', () => { if (!rowDragged) selectLayer(l.id); rowDragged = false; });
    b.addEventListener('pointerdown', (e) => startRowDrag(e, l, li, b));
    li.append(v, b);
    ul.append(li);
  }
  $('layerCount').textContent = 'LYR:' + state.layers.length;
}

function refreshAll() {
  const has = !!state.doc;
  view.hidden = !has;
  $('stageEmpty').hidden = has;
  $('export').disabled = !has;
  $('docReadout').textContent = has ? `DOC:${state.doc.w}x${state.doc.h}` : 'DOC:--';
  if (!has) $('viewReadout').textContent = 'VIEW:--';
  renderLayerList();
  syncLayerProps();
  syncFx();
  updateOut();
  fitCanvas();
  idleStatus();
}

/* ------------------------------------------------------------------
   Loading images
------------------------------------------------------------------ */

async function loadFiles(files, replace) {
  files = [...files].filter((f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(f.name));
  if (!files.length) return;
  if (replace) {
    state.layers.forEach((l) => l.bmp.close?.());
    state.layers = [];
    state.doc = null;
    state.sel = null;
  }
  for (const file of files) {
    let bmp;
    try {
      bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      setStatus('! COULD NOT READ ' + (file.name || 'IMAGE').toUpperCase(), true);
      continue;
    }
    addLayer(bmp, file.name || 'pasted image');
  }
  refreshAll();
}

function addLayer(bmp, name) {
  const l = {
    id: nextId++, name, bmp, w: bmp.width, h: bmp.height,
    x: 0, y: 0, scale: 1, rot: 0, opacity: 100, blend: 'source-over', visible: true,
    trimL: 0, trimR: 0, trimT: 0, trimB: 0,
    key: { on: false, color: '#00ff00', bias: 15, soft: 10 },
    fx: defaultFx(),
  };
  if (!state.doc) {
    state.doc = { w: bmp.width, h: bmp.height, name };
  } else {
    coverLayer(l);
  }
  state.layers.push(l);
  state.sel = l.id;
}

function coverLayer(l) {
  const { w, h } = state.doc;
  l.scale = Math.max(w / l.w, h / l.h);
  centerLayer(l);
}

function centerLayer(l) {
  l.x = (state.doc.w - l.w * l.scale) / 2;
  l.y = (state.doc.h - l.h * l.scale) / 2;
}

function moveLayer(dir) {
  const i = state.layers.findIndex((l) => l.id === state.sel);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= state.layers.length) return;
  [state.layers[i], state.layers[j]] = [state.layers[j], state.layers[i]];
  renderLayerList();
  requestRender();
}

function deleteLayer() {
  const i = state.layers.findIndex((l) => l.id === state.sel);
  if (i < 0) return;
  const [l] = state.layers.splice(i, 1);
  l.bmp.close?.();
  const next = state.layers[Math.min(i, state.layers.length - 1)];
  state.sel = next ? next.id : null;
  if (!state.layers.length) state.doc = null;
  refreshAll();
}

function canvasToLayer() {
  const l = selLayer();
  if (!l) return;
  // bounding box of the trimmed, rotated layer
  const [sx, sy, sw, sh] = trimRect(l);
  const a = (l.rot * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
  const cx = l.x + (l.w * l.scale) / 2, cy = l.y + (l.h * l.scale) / 2;
  const xs = [], ys = [];
  for (const [u, v] of [[sx, sy], [sx + sw, sy], [sx, sy + sh], [sx + sw, sy + sh]]) {
    const dx = (u - l.w / 2) * l.scale, dy = (v - l.h / 2) * l.scale;
    xs.push(cx + dx * cs - dy * sn);
    ys.push(cy + dx * sn + dy * cs);
  }
  const ox = Math.min(...xs), oy = Math.min(...ys);
  const nw = Math.max(1, Math.round(Math.max(...xs) - ox));
  const nh = Math.max(1, Math.round(Math.max(...ys) - oy));
  for (const o of state.layers) { o.x -= ox; o.y -= oy; }
  state.doc.w = nw;
  state.doc.h = nh;
  refreshAll();
}

/* ------------------------------------------------------------------
   Export
------------------------------------------------------------------ */

function exportScale() {
  const { w, h } = state.doc;
  return Math.min(1, maxDim / Math.max(w, h), Math.sqrt(CANVAS_MAX_AREA / (w * h)));
}

function updateOut() {
  if (!state.doc) { $('outReadout').textContent = '--'; return; }
  const s = exportScale();
  const w = Math.round(state.doc.w * s), h = Math.round(state.doc.h * s);
  $('outReadout').textContent = `${w}x${h} ${state.format ? 'JPG' : 'PNG'}`;
}

function buildExport() {
  const root = $('exportControls');
  const fmt = makePicker('FORMAT', ['PNG', 'JPG'], () => state.format, (v) => (state.format = v), () => { updateOut(); syncQ(); });
  const q = makeSlider({ label: 'JPG QUALITY', min: 10, max: 100, def: 92 }, () => state.quality, (v) => (state.quality = v));
  const syncQ = () => q.inputs.forEach((i) => (i.disabled = state.format === 0));
  syncQ();
  root.append(fmt.el, q.el);
}

async function exportImage() {
  if (!state.doc) return;
  const btn = $('export');
  btn.textContent = '>>EXPORTING...';
  btn.disabled = true;
  await new Promise((r) => setTimeout(r, 30));
  const jpg = state.format === 1;
  let blob = null;
  try {
    const wasCompare = state.compare;
    state.compare = false;
    renderAt(exportScale());
    state.compare = wasCompare;
    blob = await new Promise((r) => view.toBlob(r, jpg ? 'image/jpeg' : 'image/png', state.quality / 100));
  } catch (e) {
    console.error(e);
  }
  btn.textContent = '>>EXPORT';
  btn.disabled = false;
  requestRender();
  if (!blob) { setStatus('! EXPORT FAILED. THE IMAGE MAY BE TOO LARGE FOR THIS BROWSER', true); return; }
  const base = state.doc.name.replace(/\.[^.]+$/, '') || 'image';
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${base}-glitch.${jpg ? 'jpg' : 'png'}`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  setStatus('> SAVED ' + a.download);
}

/* ------------------------------------------------------------------
   Canvas interaction
------------------------------------------------------------------ */

let drag = null;
let picking = false;
function setPicking(on) {
  picking = on && !!selLayer();
  const b = $('keyPick');
  b.classList.toggle('active', picking);
  b.textContent = picking ? '>>PICKING...' : '>>PICK';
  view.style.cursor = picking ? 'crosshair' : '';
  if (picking) setStatus('> CLICK THE CANVAS TO PICK THE KEY COLOUR // ESC CANCELS', false, true);
  else idleStatus();
}

const pickPx = document.createElement('canvas');
pickPx.width = pickPx.height = 1;
const pickCtx = pickPx.getContext('2d', { willReadFrequently: true });

function pickKeyColour(e, rect) {
  const l = selLayer();
  setPicking(false);
  if (!l) return;
  const px = ((e.clientX - rect.left) / rect.width) * state.doc.w;
  const py = ((e.clientY - rect.top) / rect.height) * state.doc.h;
  const [bx, by] = docToLayer(l, px, py);
  if (bx < 0 || by < 0 || bx >= l.w || by >= l.h) { setStatus('! THAT POINT IS OUTSIDE THE SELECTED LAYER', true); return; }
  pickCtx.clearRect(0, 0, 1, 1);
  pickCtx.drawImage(l.bmp, Math.floor(bx), Math.floor(by), 1, 1, 0, 0, 1, 1);
  const [r, g, b] = pickCtx.getImageData(0, 0, 1, 1).data;
  l.key.color = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  l.key.on = true;
  syncLayerProps();
  requestRender();
  setStatus('> KEY COLOUR SET TO ' + l.key.color.toUpperCase());
}

view.addEventListener('pointerdown', (e) => {
  if (!state.doc) return;
  const rect = view.getBoundingClientRect();
  if (picking) { pickKeyColour(e, rect); return; }
  if (e.shiftKey) {
    const fx = curFx();
    if (!fx) { setStatus('! SELECT A LAYER OR THE MASTER FX TAB FIRST', true); return; }
    const f = fx.blur;
    f.fx = Math.round(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100));
    f.fy = Math.round(clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100));
    syncFx();
    requestRender();
    setStatus(`> ${state.fxTab === 'master' ? 'MASTER' : 'LAYER'} BLUR FOCUS SET TO ${f.fx},${f.fy}`);
    return;
  }
  const l = selLayer();
  if (!l) return;
  view.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, lx: l.x, ly: l.y, k: state.doc.w / rect.width };
});
view.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const l = selLayer();
  if (!l) return;
  l.x = Math.round(drag.lx + (e.clientX - drag.x) * drag.k);
  l.y = Math.round(drag.ly + (e.clientY - drag.y) * drag.k);
  syncLayerProps();
  requestRender();
});
const endDrag = () => { drag = null; };
view.addEventListener('pointerup', endDrag);
view.addEventListener('pointercancel', endDrag);

function setCompare(on) {
  if (state.compare === on) return;
  state.compare = on;
  $('compare').classList.toggle('active', on);
  $('compare').textContent = on ? '>>SHOWING ORIGINAL' : '>>HOLD TO COMPARE';
  requestRender();
}
$('compare').addEventListener('pointerdown', () => setCompare(true));
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => $('compare').addEventListener(ev, () => setCompare(false)));

const typing = (t) => t instanceof HTMLElement && t.matches('input, select, textarea');
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && picking) { setPicking(false); return; }
  if (typing(e.target)) return;
  if (e.key === '\\') { setCompare(true); e.preventDefault(); return; }
  const l = selLayer();
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (l && d && !e.metaKey && !e.ctrlKey) {
    const step = e.shiftKey ? 10 : 1;
    l.x = Math.round(l.x + d[0] * step);
    l.y = Math.round(l.y + d[1] * step);
    syncLayerProps();
    requestRender();
    e.preventDefault();
  }
});
document.addEventListener('keyup', (e) => { if (e.key === '\\') setCompare(false); });
window.addEventListener('blur', () => setCompare(false));

/* drag and drop, paste */
const pane = $('canvasPane');
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; pane.classList.add('drop'); });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; pane.classList.remove('drop'); } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  pane.classList.remove('drop');
  if (e.dataTransfer?.files?.length) loadFiles(e.dataTransfer.files, false);
});
window.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])];
  if (files.length) { loadFiles(files, false); e.preventDefault(); }
});

/* ------------------------------------------------------------------
   Wiring
------------------------------------------------------------------ */

$('open').addEventListener('click', () => $('fileOpen').click());
$('openEmpty').addEventListener('click', () => $('fileOpen').click());
$('add').addEventListener('click', () => $('fileAdd').click());
$('fileOpen').addEventListener('change', (e) => { loadFiles(e.target.files, true); e.target.value = ''; });
$('fileAdd').addEventListener('change', (e) => { loadFiles(e.target.files, false); e.target.value = ''; });
$('export').addEventListener('click', exportImage);
$('randomize').addEventListener('click', () => setFx(randomFx()));
$('resetFx').addEventListener('click', () => setFx(defaultFx(state.fxTab === 'master')));
$('layerUp').addEventListener('click', () => moveLayer(1));
$('layerDown').addEventListener('click', () => moveLayer(-1));
$('layerCenter').addEventListener('click', () => { const l = selLayer(); if (l) { centerLayer(l); syncLayerProps(); requestRender(); } });
$('layerCover').addEventListener('click', () => { const l = selLayer(); if (l) { coverLayer(l); syncLayerProps(); requestRender(); } });
$('layerFit').addEventListener('click', canvasToLayer);
$('layerDelete').addEventListener('click', deleteLayer);

buildFx();
buildLayerControls();
buildExport();

try {
  if (!initGL()) throw new Error('no webgl2');
  refreshAll();
} catch (err) {
  console.error(err);
  $('open').disabled = $('add').disabled = $('openEmpty').disabled = true;
  setStatus('! WEBGL2 IS UNAVAILABLE IN THIS BROWSER', true, true);
}

glc.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  setStatus('! THE GPU CONTEXT WAS LOST. RELOAD THE PAGE', true, true);
});
