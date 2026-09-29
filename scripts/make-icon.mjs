// Generates icons/icon-source.png (1024×1024) — no dependencies.
// Run: node scripts/make-icon.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const S = 1024;
const px = new Uint8Array(S * S * 4);

// --- helpers -----------------------------------------------------------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;

function sdRoundRect(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdEllipse(x, y, cx, cy, rx, ry) {
  // approx
  const kx = (x - cx) / rx, ky = (y - cy) / ry;
  return (Math.hypot(kx, ky) - 1) * Math.min(rx, ry);
}
function sdSegment(x, y, ax, ay, bx, by, r) {
  const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}

// --- render ------------------------------------------------------------
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;

    // background diagonal gradient
    const t = clamp((x / S) * 0.55 + (y / S) * 0.45, 0, 1);
    let r = mix(0x33, 0x0b, t);
    let g = mix(0x52, 0x0d, t);
    let b = mix(0x8a, 0x18, t);

    // accent glow top-left
    const gx = (x - 300) / 700, gy = (y - 260) / 700;
    const glow = Math.exp(-(gx * gx + gy * gy) * 2.2) * 0.35;
    r = mix(r, 0x9d, glow); g = mix(g, 0xb8, glow); b = mix(b, 0xff, glow);

    // eighth-note glyph (SDF union, antialiased)
    const cx = 512, cy = 540;
    const ux = x - cx, uy = y - cy;
    const cos = Math.cos(-0.28), sin = Math.sin(-0.28);
    const rx = ux * cos - uy * sin, ry = ux * sin + uy * cos;

    const head = sdEllipse(rx, ry, -95, 190, 150, 105);
    const stem = sdSegment(rx, ry, 38, 175, 38, -235, 26);
    const flagAx = 38, flagAy = -235;
    const fx = rx - flagAx, fy = ry - flagAy;
    const flagBowl = sdEllipse(fx, fy, 105, -40, 175, 120);
    const flag = Math.max(flagBowl, -(fx * 0.55 + fy * 0.85 + 40)); // trim upper half
    const note = Math.min(head, stem, flag);

    const aa = 2.2;
    const cov = clamp(0.5 - note / aa, 0, 1);
    // soft drop shadow under glyph
    const sh = Math.exp(-Math.max(0, note + 26) * 0.012) * 0.5;
    if (cov > 0 || sh > 0) {
      r = mix(r, 0, sh * 0.55); g = mix(g, 0, sh * 0.55); b = mix(b, 0, sh * 0.55);
      r = mix(r, 0xf7, cov); g = mix(g, 0xf7, cov); b = mix(b, 0xfa, cov);
    }

    // rounded-corner mask (macOS-style squircle-ish)
    const d = sdRoundRect(x, y, S / 2, S / 2, S / 2 - 6, S / 2 - 6, 185);
    const alpha = clamp(0.5 - d / aa, 0, 1);

    px[i] = clamp(Math.round(r), 0, 255);
    px[i + 1] = clamp(Math.round(g), 0, 255);
    px[i + 2] = clamp(Math.round(b), 0, 255);
    px[i + 3] = Math.round(alpha * 255);
  }
}

// --- PNG encode --------------------------------------------------------
function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

const raw = Buffer.alloc(S * (S * 4 + 1));
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0; // filter none
  Buffer.from(px.buffer, y * S * 4, S * 4).copy(raw, y * (S * 4 + 1) + 1);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "src-tauri", "icons", "icon-source.png");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log("wrote", out, png.length, "bytes");
