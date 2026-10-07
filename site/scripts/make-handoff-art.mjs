// Original geometric teaching artwork, dedicated to CC0 1.0.
// Regenerate with: node scripts/make-handoff-art.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const entries = JSON.parse(readFileSync(new URL('../src/data/handoff-figures.json', import.meta.url), 'utf8'));
const directory = new URL('../public/assets/images/original/', import.meta.url);
mkdirSync(directory, { recursive: true });
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
function wrap(text, limit) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      if (line && (line + ' ' + word).length > limit) { lines.push(line); line = ''; }
      line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line);
  }
  return lines;
}
for (const entry of entries) {
  const title = wrap(entry.title, 52);
  const bottom = wrap(entry.takeaway, 67);
  const nodes = entry.nodes.map((text, i) => {
    const x = 12 + i * 164;
    const lines = wrap(text, 17);
    if (lines.length > 3) throw new Error(`Figure ${entry.key}: node text is too tall`);
    const y = 108 - (lines.length - 1) * 9;
    return `<g><rect x="${x}" y="76" width="128" height="64" rx="6" class="box"/>${lines.map((line, j) => `<text x="${x + 64}" y="${y + j * 18}" text-anchor="middle" class="node">${escape(line)}</text>`).join('')}</g>`;
  }).join('');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- SPDX-License-Identifier: CC0-1.0; original Game Hacking Academy artwork. -->
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="206" viewBox="0 0 480 206" role="img" aria-labelledby="title desc">
<title id="title">${escape(entry.title)}</title><desc id="desc">${escape(entry.alt)} ${escape(entry.takeaway)}</desc>
<metadata>Original geometric artwork. Public domain dedication: CC0 1.0 Universal. Source: site/scripts/make-handoff-art.mjs and site/src/data/handoff-figures.json.</metadata>
<style>svg{color:var(--ink,CanvasText);background:var(--paper,Canvas)}text{font-family:system-ui,sans-serif;fill:currentColor;font-size:.84rem}.title{font-size:1rem;font-weight:700}.node{font-size:.82rem}.box{fill:var(--paper,Canvas);stroke:currentColor;stroke-width:.08rem}.arrow{fill:none;stroke:currentColor;stroke-width:.1rem}</style>
<defs><marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L6 3L0 6Z" fill="currentColor"/></marker></defs>
${title.map((line, i) => `<text class="title" x="12" y="${24 + i * 22}">${escape(line)}</text>`).join('')}
${nodes}<path class="arrow" d="M145 108H169M309 108H333" marker-end="url(#arrow)"/>
${bottom.map((line, i) => `<text x="12" y="${170 + i * 18}">${escape(line)}</text>`).join('')}
</svg>
`;
  if (bottom.length > 2 || title.length > 2) throw new Error(`Figure ${entry.key}: caption is too tall`);
  writeFileSync(new URL(`${entry.key}.svg`, directory), svg);
}
console.log(`Wrote ${entries.length} original CC0 teaching figures to ${fileURLToPath(directory)}`);
