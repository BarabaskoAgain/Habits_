// Генерация PNG-иконок без зависимостей (порт из family-budget).
// Дизайн: оранжевый скруглённый квадрат KeepSimple + белая галочка, сглаживание 4×4.
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const OUT = fileURLToPath(new URL('../public/icons', import.meta.url));
mkdirSync(OUT, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

const ORANGE = [0xff, 0x6a, 0x00];
const WHITE = [0xff, 0xff, 0xff];

// расстояние от точки до отрезка
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

// radius — скругление фона (0 = квадрат), scale — размер галочки относительно холста
function draw(size, { radius = 0.22, scale = 1 } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const s = size, r = s * radius;
  const inBg = (x, y) => {
    if (!r) return true;
    const cx = Math.min(Math.max(x, r), s - r), cy = Math.min(Math.max(y, r), s - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  const c = s / 2, k = s * 0.3 * scale;
  const A = [c - k * 0.95, c + k * 0.02], B = [c - k * 0.25, c + k * 0.7], C = [c + k * 1.0, c - k * 0.62];
  const w = s * 0.075 * scale;
  const inCheck = (x, y) =>
    Math.min(segDist(x, y, ...A, ...B), segDist(x, y, ...B, ...C)) <= w;

  const N = 4;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      let bg = 0, ck = 0;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const sx = x + (i + 0.5) / N, sy = y + (j + 0.5) / N;
        if (inBg(sx, sy)) { bg++; if (inCheck(sx, sy)) ck++; }
      }
      if (!bg) continue;
      const m = ck / bg;
      const o = (y * s + x) * 4;
      for (let ch = 0; ch < 3; ch++) px[o + ch] = Math.round(ORANGE[ch] * (1 - m) + WHITE[ch] * m);
      px[o + 3] = Math.round((bg / (N * N)) * 255);
    }
  }
  return px;
}

const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { radius: 0, scale: 0.75 }], // safe-zone для maskable
  ['apple-touch-icon.png', 180, { radius: 0 }]                // iOS сам скругляет
];
for (const [name, size, opts] of targets) {
  writeFileSync(`${OUT}/${name}`, encodePng(size, draw(size, opts)));
  console.log('ok', name);
}
