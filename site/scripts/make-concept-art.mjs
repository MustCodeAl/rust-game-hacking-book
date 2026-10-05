// SPDX-License-Identifier: CC0-1.0
// Original geometry and pixel patterns created for Game Hacking Academy.
// The script and its generated SVG/PNG artwork are dedicated to the public
// domain under CC0 1.0. No external images, fonts, or icon files are embedded.
// Run from site/: node scripts/make-concept-art.mjs
import { mkdir, writeFile, stat } from 'node:fs/promises';
import sharp from 'sharp';

const output = new URL('../public/assets/images/original/', import.meta.url);
const W = 480;
const H = 240;
const C = {
  ink: '#25343d', muted: '#63727c', grid: '#d9e0e5',
  green: '#218675', greenLight: '#e4f2ec', orange: '#bd592c',
  cone: '#fceddf', wall: '#dae1e6', red: '#bd493e', pale: '#f0f3f5',
};
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
const n = value => Number(value.toFixed(3));
const label = (x, y, words, { size = 12, fill = C.ink, mono = false, weight = 400, anchor = 'start' } = {}) =>
  `<text x="${n(x)}" y="${n(y)}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${mono ? ' class="mono"' : ''}>${escape(words)}</text>`;
const rect = (x, y, w, h, fill, stroke = 'none', sw = 1) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const dot = (x, y, r, fill, stroke = 'none', sw = 1) =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const line = (x1, y1, x2, y2, color = C.muted, { width = 1.5, dash, arrow = false } = {}) =>
  `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}" fill="none" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}${arrow ? ' marker-end="url(#arrow)"' : ''}/>`;
const path = (d, color, { width = 1.5, fill = 'none', dash } = {}) =>
  `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const frame = (title, description, body) => `<?xml version="1.0" encoding="UTF-8"?>
<!-- SPDX-License-Identifier: CC0-1.0; original Game Hacking Academy artwork. -->
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title description">
<title id="title">${escape(title)}</title><desc id="description">${escape(description)}</desc>
<metadata>Original geometric and pixel artwork. Public domain dedication: CC0 1.0 Universal.</metadata>
<defs><marker id="arrow" viewBox="0 0 6 6" refX="5.5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L6 3L0 6Z" fill="context-stroke"/></marker></defs>
<style>text{font-family:Arial,Helvetica,sans-serif}.mono{font-family:Menlo,Consolas,monospace}path{stroke-linecap:round;stroke-linejoin:round}</style>
${rect(0, 0, W, H, '#ffffff')}${body.join('')}
</svg>
`;

// These terrain/fog glyphs are illustrative layer values, not a capture from
// Wesnoth. The coordinate contract and all array indices are the lesson's.
function terrainGlyph(x, y, type) {
  const bits = [];
  if (type === 'water') {
    for (let row = 0; row < 3; row += 1) {
      bits.push(rect(x + 5 + row % 2 * 4, y + 9 + row * 8, 17, 3, '#4388aa'));
      bits.push(rect(x + 23 - row % 2 * 4, y + 12 + row * 8, 11, 3, '#79b4c6'));
    }
  } else if (type === 'stone') {
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 2; col += 1)
      bits.push(rect(x + 5 + col * 16 + row % 2 * 3, y + 7 + row * 10, 12, 7, '#9da8ad'));
  } else if (type === 'tree') {
    bits.push(rect(x + 18, y + 26, 6, 11, '#8a684b'));
    bits.push(rect(x + 12, y + 9, 18, 19, '#547957'));
    bits.push(rect(x + 6, y + 15, 30, 9, '#547957'));
    bits.push(rect(x + 15, y + 5, 12, 6, '#71986c'));
  } else if (type === 'path') {
    bits.push(rect(x + 15, y + 1, 11, 40, '#caae80'));
    bits.push(rect(x + 1, y + 17, 40, 9, '#caae80'));
    bits.push(rect(x + 18, y + 6, 4, 6, '#e4d0a9'));
  } else {
    for (const [gx, gy] of [[9, 9], [27, 11], [18, 26], [7, 30], [30, 29]]) {
      bits.push(rect(x + gx, y + gy, 3, 6, '#8eae78'));
      bits.push(rect(x + gx - 3, y + gy + 3, 9, 3, '#8eae78'));
    }
  }
  return bits.join('');
}
function fogGlyph(x, y) {
  return rect(x + 7, y + 12, 28, 16, '#cad2d8')
    + rect(x + 13, y + 7, 16, 25, '#cad2d8')
    + rect(x + 4, y + 20, 32, 9, '#cad2d8');
}
function gridLayers() {
  const columns = 3;
  const rows = 2;
  const tile = { x: 2, y: 1 };
  const selected = tile.y * columns + tile.x;
  const size = 42;
  const top = 66;
  const starts = [36, 266];
  const terrains = ['grass', 'water', 'stone', 'tree', 'path', 'grass'];
  const fogged = new Set([1, 4]);
  const pieces = [label(20, 23, 'One tile, two layers', { size: 16, weight: 700 }),
    label(starts[0], 45, 'terrain', { size: 13 }), label(starts[1], 45, 'player visibility', { size: 13 })];
  for (const [layer, left] of starts.entries()) {
    for (let x = 0; x < columns; x += 1) pieces.push(label(left + x * size + size / 2, 61, x, { size: 10, fill: C.muted, mono: true, anchor: 'middle' }));
    for (let y = 0; y < rows; y += 1) pieces.push(label(left - 11, top + y * size + size / 2 + 4, y, { size: 10, fill: C.muted, mono: true, anchor: 'middle' }));
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < columns; x += 1) {
      const index = y * columns + x;
      const px = left + x * size;
      const py = top + y * size;
      const terrainFill = ['#e8f0dd', '#e2f0f5', '#edf0f1', '#e8f0dd', '#f0eadf', '#e8f0dd'][index];
      pieces.push(rect(px, py, size, size, layer ? (fogged.has(index) ? C.pale : C.greenLight) : terrainFill, '#ffffff', 2));
      if (!layer) pieces.push(terrainGlyph(px, py, terrains[index]));
      else if (fogged.has(index)) pieces.push(fogGlyph(px, py));
      else {
        pieces.push(path(`M${px + 8} ${py + 21}Q${px + 21} ${py + 7} ${px + 34} ${py + 21}Q${px + 21} ${py + 35} ${px + 8} ${py + 21}`, C.green, { width: 1.3 }));
        pieces.push(dot(px + 21, py + 21, 4, C.green));
      }
      if (index === selected) pieces.push(rect(px + 1, py + 1, size - 2, size - 2, 'none', C.orange, 2.5));
    }
  }
  const arrayLeft = 133;
  const cellWidth = 32;
  const gap = 4;
  const selectedCentre = arrayLeft + selected * (cellWidth + gap) + cellWidth / 2;
  for (const left of starts) {
    const x = left + tile.x * size + size / 2;
    pieces.push(path(`M${x} ${top + rows * size + 2}V161H${selectedCentre}V175`, C.orange, { width: 1.4 }));
  }
  pieces.push(label(20, 191, 'flat index', { size: 11, fill: C.muted }));
  for (let i = 0; i < columns * rows; i += 1) {
    pieces.push(rect(arrayLeft + i * (cellWidth + gap), 175, cellWidth, 26, i === selected ? C.cone : C.pale, i === selected ? C.orange : C.grid, i === selected ? 2 : 1));
    pieces.push(label(arrayLeft + i * (cellWidth + gap) + cellWidth / 2, 193, i, { size: 13, mono: true, anchor: 'middle' }));
  }
  pieces.push(label(20, 227, `tile (${tile.x}, ${tile.y}): ${tile.y} × ${columns} + ${tile.x} = ${selected}`, { size: 13, mono: true }));
  return frame('Grid coordinates join different map layers', 'A three-column, two-row terrain grid and a separate player-visibility grid both highlight tile (2,1). Row-major indexing puts it at 1 times 3 plus 2, or index 5. Terrain and fog symbols are illustrative.', pieces);
}

function viewCone() {
  const halfAngle = 60;
  const range = 10;
  const target = { x: 4, y: 3 };
  const length = Math.hypot(target.x, target.y);
  const direction = { x: target.x / length, y: target.y / length };
  const facing = { x: 1, y: 0 };
  const alignment = direction.x * facing.x + direction.y * facing.y;
  const threshold = Math.cos(halfAngle * Math.PI / 180);
  const origin = { x: 60, y: 120 };
  const pixels = 10;
  const radius = range * pixels;
  const angle = halfAngle * Math.PI / 180;
  const upper = { x: origin.x + Math.cos(angle) * radius, y: origin.y - Math.sin(angle) * radius };
  const lower = { x: upper.x, y: origin.y + Math.sin(angle) * radius };
  const p = { x: origin.x + target.x * pixels, y: origin.y - target.y * pixels };
  const u = { x: 327, y: 123, radius: 50 };
  const tip = { x: u.x + direction.x * u.radius, y: u.y - direction.y * u.radius };
  const arcRadius = 34;
  const pieces = [label(20, 23, 'A view cone is an angle and a range', { size: 16, weight: 700 }),
    path(`M${origin.x} ${origin.y}L${n(upper.x)} ${n(upper.y)}A${radius} ${radius} 0 0 1 ${n(lower.x)} ${n(lower.y)}Z`, C.orange, { fill: C.cone, width: 1.5 }),
    line(origin.x, origin.y, origin.x + radius, origin.y, C.muted, { width: 1, dash: '3 3' }),
    line(origin.x, origin.y, p.x, origin.y, C.green, { dash: '3 3', width: 1 }),
    line(p.x, origin.y, p.x, p.y, C.green, { dash: '3 3', width: 1 }),
    line(origin.x, origin.y, p.x, p.y, C.green, { width: 2, arrow: true }),
    path(`M${n(origin.x + arcRadius * Math.cos(angle))} ${n(origin.y - arcRadius * Math.sin(angle))}A${arcRadius} ${arcRadius} 0 0 1 ${origin.x + arcRadius} ${origin.y}A${arcRadius} ${arcRadius} 0 0 1 ${n(origin.x + arcRadius * Math.cos(angle))} ${n(origin.y + arcRadius * Math.sin(angle))}`, C.orange, { width: 1 }),
    dot(origin.x, origin.y, 4, C.ink), dot(p.x, p.y, 4, C.green),
    label(19, 142, 'guard', { size: 10 }),
    label(9, 156, '(0, 0)', { size: 10, mono: true }),
    label(p.x + 10, p.y - 8, '(4, 3)', { size: 11, mono: true }),
    label(108, 62, `${halfAngle}°`, { size: 11, fill: C.orange }),
    label(108, 184, `${halfAngle}°`, { size: 11, fill: C.orange }),
    label(162, 181, `range ${range}`, { size: 11, fill: C.orange }),
    label(80, 135, target.x, { size: 11, fill: C.green, mono: true }),
    label(108, 114, target.y, { size: 11, fill: C.green, mono: true }),
    label(77, 100, length, { size: 11, fill: C.green, mono: true }),
    label(267, 52, 'Normalize, then compare', { size: 12 }),
    dot(u.x, u.y, u.radius, 'none', C.grid, 1.5),
    line(u.x - u.radius, u.y, u.x + u.radius, u.y, C.grid, { width: 1 }),
    line(u.x, u.y - u.radius, u.x, u.y + u.radius, C.grid, { width: 1 }),
    line(u.x, u.y, u.x + u.radius, u.y, C.ink, { arrow: true, width: 1.5 }),
    line(u.x, u.y, tip.x, tip.y, C.green, { arrow: true, width: 2 }),
    line(tip.x, tip.y, tip.x, u.y, C.green, { dash: '3 3', width: 1 }),
    line(u.x, u.y, tip.x, u.y, C.green, { width: 3 }),
    dot(tip.x, tip.y, 3.5, C.green), dot(u.x, u.y, 2.5, C.ink),
    label(tip.x - 18, tip.y - 14, `(${direction.x.toFixed(1)}, ${direction.y.toFixed(1)})`, { size: 11, mono: true, fill: C.green }),
    label(u.x + u.radius + 5, u.y + 15, '(1, 0)', { size: 11, mono: true }),
    label(u.x + 10, u.y + 21, alignment.toFixed(1), { size: 11, mono: true, fill: C.green }),
    label(tip.x + 9, tip.y + 20, direction.y.toFixed(1), { size: 11, mono: true, fill: C.green }),
    label(20, 226, `√(4² + 3²) = ${length}; (${direction.x.toFixed(1)}, ${direction.y.toFixed(1)}) · (1, 0) = ${alignment.toFixed(1)} ≥ ${threshold.toFixed(1)}`, { size: 11.5, mono: true }),
  ];
  return frame('Range and alignment inside a guard view cone', 'A guard at (0,0) faces (1,0). Its cone extends 60 degrees to each side, 120 degrees total, with range 10. Target (4,3) is distance 5. The normalized direction (0.8,0.6) has dot product 0.8 with the facing, above the 0.5 threshold. Walls still require a separate check.', pieces);
}

function losSamples() {
  const guard = { x: 4, y: 0 };
  const player = { x: 8, y: 0 };
  const wall = { min: { x: 5.5, y: -1 }, max: { x: 6.5, y: 1 } };
  const sample = { x: 5.6, y: 0 };
  const step = 0.1;
  const origin = { x: 42, y: 122 };
  const unit = 52;
  const at = p => ({ x: origin.x + (p.x - guard.x) * unit, y: origin.y - p.y * unit });
  const start = at(guard);
  const end = at(player);
  const hit = at(sample);
  const topLeft = at({ x: wall.min.x, y: wall.max.y });
  const pieces = [label(20, 23, 'A sample inside the wall stops the sight check', { size: 15, weight: 700 }),
    rect(topLeft.x, topLeft.y, (wall.max.x - wall.min.x) * unit, (wall.max.y - wall.min.y) * unit, C.wall, '#95a4ae', 1.5)];
  for (let y = 0; y < 4; y += 1) {
    pieces.push(line(topLeft.x, topLeft.y + y * 26, topLeft.x + unit, topLeft.y + y * 26, '#b7c1c9', { width: 1 }));
    pieces.push(line(topLeft.x + (y % 2 ? 13 : 26), topLeft.y + y * 26, topLeft.x + (y % 2 ? 13 : 26), topLeft.y + (y + 1) * 26, '#b7c1c9', { width: 1 }));
  }
  pieces.push(line(start.x, start.y, hit.x, hit.y, C.green, { width: 1 }));
  pieces.push(line(hit.x, hit.y, end.x, end.y, C.muted, { dash: '3 4', width: 1 }));
  // Selected samples show the run-up and an unambiguously contained point.
  // Do not claim 5.6 is always the first hit: 5.5 is the inclusive boundary,
  // and floating-point accumulation can affect the boundary sample.
  for (let i = 1; i <= 14; i += 1) {
    const p = at({ x: guard.x + i * step, y: 0 });
    pieces.push(dot(p.x, p.y, 2, C.green));
  }
  pieces.push(dot(start.x, start.y, 5, C.ink));
  pieces.push(dot(end.x, end.y, 5, '#ffffff', C.muted, 1.5));
  pieces.push(dot(hit.x, hit.y, 4, C.red, '#ffffff', 1));
  pieces.push(label(22, 150, '(4, 0)', { size: 11, mono: true }));
  pieces.push(label(end.x - 27, 150, '(8, 0)', { size: 11, mono: true }));
  pieces.push(label(topLeft.x, 188, wall.min.x, { size: 10, mono: true, anchor: 'middle', fill: C.muted }));
  pieces.push(label(topLeft.x + unit, 188, wall.max.x, { size: 10, mono: true, anchor: 'middle', fill: C.muted }));
  pieces.push(label(149, 61, 'wall', { size: 12, anchor: 'middle', fill: C.muted }));
  pieces.push(label(290, 62, 'min (5.5, −1)', { size: 12, mono: true }));
  pieces.push(label(290, 82, 'max (6.5,  1)', { size: 12, mono: true }));
  pieces.push(label(290, 115, 'sample (5.6, 0)', { size: 12, mono: true, fill: C.red }));
  pieces.push(label(290, 140, '5.5 ≤ 5.6 ≤ 6.5', { size: 12, mono: true }));
  pieces.push(label(290, 161, '−1 ≤ 0 ≤ 1', { size: 12, mono: true }));
  pieces.push(label(290, 188, 'inside → false', { size: 13, weight: 700, fill: C.red }));
  pieces.push(dot(22, 211, 3, C.green));
  pieces.push(label(30, 215, 'clear samples', { size: 10, fill: C.muted }));
  pieces.push(dot(133, 211, 3, C.red));
  pieces.push(label(141, 215, 'inside wall', { size: 10, fill: C.muted }));
  pieces.push(line(236, 211, 256, 211, C.muted, { dash: '3 4', width: 1 }));
  pieces.push(label(263, 215, 'remaining path need not be checked', { size: 10, fill: C.muted }));
  pieces.push(label(20, 235, `Selected dots shown. The actual step is ${step} world units.`, { size: 10.5, fill: C.muted }));
  return frame('A wall contains a sampled sight point', 'In tick 8, the guard is at (4,0), the target is at (8,0), and the wall spans (5.5,-1) to (6.5,1). The selected sample (5.6,0) lies within both wall bounds. Any contained sample returns false and stops the walk. The actual sampling step is 0.1; selected dots are shown, without claiming a specific first boundary hit.', pieces);
}

await mkdir(output, { recursive: true });
for (const [name, make] of [['grid-layers', gridLayers], ['npc-view-cone', viewCone], ['los-samples', losSamples]]) {
  const svg = make();
  await writeFile(new URL(`${name}.svg`, output), svg, 'utf8');
  const png = new URL(`${name}.png`, output);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(png.pathname);
  const { size } = await stat(png);
  if (size >= 30 * 1024) throw new Error(`${name}.png exceeds the 30 KiB limit: ${size}`);
  console.log(`${name}: ${W}x${H}; ${size} bytes; original CC0 SVG and PNG`);
}
