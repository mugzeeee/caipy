#!/usr/bin/env node
/**
 * Generates placeholder PNG assets (icon, adaptive-icon, splash, favicon)
 * for the Caipy app — pure Node, no native deps.
 *
 * Renders: dark background, soft purple radial glow, a rounded white speech
 * bubble in the center. Matches the in-app C.AI-style purple palette.
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "..", "assets");
fs.mkdirSync(ASSETS, { recursive: true });

// ---------- tiny PNG writer (RGBA8, single IDAT) ----------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // add filter byte (0) per scanline
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- drawing ----------
function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function renderIcon(size) {
  const bg = hexToRgb("#0e0f13");
  const purple = hexToRgb("#8b5cf6");
  const pink = hexToRgb("#f472b6");
  const white = [255, 255, 255];
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = Math.hypot(cx, cy);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      // radial purple glow from center
      const glow = Math.max(0, 1 - dist / (size * 0.62));
      const grad = mix(bg, purple, glow * 0.85);

      // rounded-square icon mask (iOS squircles; approximate with superellipse)
      const half = size * 0.46;
      const nx = Math.abs(dx) / half;
      const ny = Math.abs(dy) / half;
      const inside = Math.pow(nx, 3.2) + Math.pow(ny, 3.2) <= 1;

      // speech bubble: rounded rect + tail
      const bw = size * 0.5;
      const bh = size * 0.38;
      const bx0 = cx - bw / 2;
      const by0 = cy - bh / 2 - size * 0.04;
      const r = size * 0.1;
      const inBubble =
        x > bx0 + r && x < bx0 + bw - r && y > by0 && y < by0 + bh
          ? true
          : x > bx0 && x < bx0 + bw && y > by0 + r && y < by0 + bh - r
          ? true
          : false;
      // rounded corners
      const corners = [
        [bx0 + r, by0 + r],
        [bx0 + bw - r, by0 + r],
        [bx0 + r, by0 + bh - r],
        [bx0 + bw - r, by0 + bh - r],
      ];
      let cornerOK = false;
      for (const [ccx, ccy] of corners) {
        if (Math.hypot(x - ccx, y - ccy) <= r) cornerOK = true;
      }
      const bubble = (inBubble || cornerOK) && y < by0 + bh;

      // tail (triangle pointing down-left)
      const tail =
        x > cx - size * 0.12 &&
        x < cx + size * 0.04 &&
        y > by0 + bh - size * 0.02 &&
        y < by0 + bh + size * 0.12 &&
        (x - (cx - size * 0.1)) * 0.6 > y - (by0 + bh);

      let col = grad;
      let alpha = 255;
      if (inside || bubble || tail) {
        // bubble gradient purple→pink top-down
        const t = (y - by0) / bh;
        col = bubble || tail ? mix(white, white, 0) : grad;
        if (bubble || tail) col = white;
        else {
          const g2 = Math.max(0, 1 - dist / (size * 0.7));
          col = mix(purple, pink, 0.5 + 0.5 * Math.sin((dy / size) * Math.PI));
          col = mix(bg, col, 0.4 + g2 * 0.6);
        }
      } else {
        // outside the squircle: transparent (adaptive icons) — but for the
        // main icon we want a full-bleed dark bg so it isn't transparent.
        col = grad;
      }
      const idx = (y * size + x) * 4;
      rgba[idx] = col[0];
      rgba[idx + 1] = col[1];
      rgba[idx + 2] = col[2];
      rgba[idx + 3] = alpha;
    }
  }
  return encodePng(size, size, rgba);
}

function renderSplash(w, h) {
  const bg = hexToRgb("#0e0f13");
  const purple = hexToRgb("#8b5cf6");
  const white = [255, 255, 255];
  const rgba = Buffer.alloc(w * h * 4);
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const glow = Math.max(0, 1 - dist / (Math.max(w, h) * 0.6));
      const col = mix(bg, purple, glow * 0.5);
      // central small bubble
      const bw = Math.min(w, h) * 0.18;
      const bh = bw * 0.76;
      const bx0 = cx - bw / 2;
      const by0 = cy - bh / 2;
      const r = bw * 0.22;
      const inBubble =
        x > bx0 + r && x < bx0 + bw - r && y > by0 && y < by0 + bh;
      let cornerOK = false;
      for (const [ccx, ccy] of [
        [bx0 + r, by0 + r],
        [bx0 + bw - r, by0 + r],
        [bx0 + r, by0 + bh - r],
        [bx0 + bw - r, by0 + bh - r],
      ]) {
        if (Math.hypot(x - ccx, y - ccy) <= r) cornerOK = true;
      }
      const idx = (y * w + x) * 4;
      const c = inBubble || cornerOK ? white : col;
      rgba[idx] = c[0];
      rgba[idx + 1] = c[1];
      rgba[idx + 2] = c[2];
      rgba[idx + 3] = 255;
    }
  }
  return encodePng(w, h, rgba);
}

fs.writeFileSync(path.join(ASSETS, "icon.png"), renderIcon(1024));
fs.writeFileSync(path.join(ASSETS, "adaptive-icon.png"), renderIcon(1024));
fs.writeFileSync(path.join(ASSETS, "favicon.png"), renderIcon(256));
fs.writeFileSync(path.join(ASSETS, "splash.png"), renderSplash(1242, 2688));

console.log("✓ Generated assets in", path.relative(process.cwd(), ASSETS));
