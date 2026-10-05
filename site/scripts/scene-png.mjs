// Draws one PNG contact sheet per scene (a still of every step), without a
// browser: quick to look at while a scene is being written. Colours are fixed
// here, and the fonts are the machine's, so spacing is close to the page's but
// not exact; check a finished scene on the real page too.
//
//   node scripts/scene-png.mjs <out-dir> [scene-name ...]
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { renderScene } from '../src/lib/scene/markup.mjs';

const [outDir, ...names] = process.argv.slice(2);
if (!outDir) {
	console.error('usage: node scripts/scene-png.mjs <out-dir> [scene-name ...]');
	process.exit(1);
}
const scenesDir = new URL('../src/scenes/', import.meta.url);
const wanted = names.length ? names : readdirSync(scenesDir).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4));

const PALETTE = {
	plain: ['#f1f2f4', '#59636f'],
	input: ['#fbeee8', '#b4501f'],
	state: ['#fbeee8', '#b4501f'],
	process: ['#f7e9f1', '#a8447a'],
	output: ['#e2f3ef', '#1c8a78'],
	caution: ['#fbf0dc', '#b4730a'],
	muted: ['#eef0f2', '#76808c'],
};
const css = `
text{font-family:Helvetica,Arial,sans-serif;fill:#11151a}
image{image-rendering:pixelated}
.scene__mono{font-family:Menlo,Courier,monospace}
.scene__rect{fill:${PALETTE.plain[0]};stroke:${PALETTE.plain[1]};stroke-width:1.5}
.scene__rect--plain{fill:#fff}
.scene__rect--ghost{fill:none;stroke-dasharray:4 3}
.scene__line{fill:none;stroke:${PALETTE.plain[1]};stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.scene__tip{fill:${PALETTE.plain[1]}}
.cap{font-size:12px;fill:#333}
${Object.entries(PALETTE).map(([role, [fill, stroke]]) => `
g[data-role="${role}"]>.scene__rect{fill:${fill};stroke:${stroke}}
g[data-role="${role}"]>.scene__rect--plain{fill:#fff}
g[data-role="${role}"]>.scene__rect--ghost{fill:none}
g[data-role="${role}"]>.scene__line{stroke:${stroke}}
g[data-role="${role}"]>.scene__line.scene__rect{fill:${fill}}
g[data-role="${role}"]>text.scene__free{fill:${stroke}}
marker .scene__tip[data-role="${role}"]{fill:${stroke}}`).join('')}
`;

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const publicDir = new URL('../public/', import.meta.url);
const embeddedImages = new Map();
function embedLocalImages(markup) {
	return markup.replace(/(<image\s[^>]*href=")([^"\s]+)(")/g, (match, before, src, after) => {
		if (!src.startsWith('/assets/')) return match;
		if (!embeddedImages.has(src)) {
			const file = new URL(`.${src}`, publicDir);
			if (!file.pathname.startsWith(publicDir.pathname)) throw new Error(`Image outside public: ${src}`);
			const mime = src.endsWith('.png') ? 'image/png' : src.endsWith('.svg') ? 'image/svg+xml' : null;
			if (!mime) throw new Error(`Unsupported still image: ${src}`);
			embeddedImages.set(src, `data:${mime};base64,${readFileSync(file).toString('base64')}`);
		}
		return before + embeddedImages.get(src) + after;
	});
}
function wrap(text, width) {
	const lines = [];
	let line = '';
	for (const word of text.split(' ')) {
		if ((line + ' ' + word).trim().length > width) {
			lines.push(line);
			line = word;
		} else line = (line + ' ' + word).trim();
	}
	if (line) lines.push(line);
	return lines;
}

mkdirSync(`${outDir}/png`, { recursive: true });
for (const name of wanted) {
	const sc = (await import(pathToFileURL(new URL(`${name}.mjs`, scenesDir).pathname))).default;
	const settle = (i) => (sc.cues[i + 1] ? sc.cues[i + 1][0] - 0.001 : sc.duration) - sc.cues[i][0];
	const frames = [{ t: 0, label: 'start' }, ...sc.cues.map(([t, words], i) => ({ t: Math.min(sc.duration, t + settle(i)), label: words })), { t: sc.duration, label: 'end' }];
	const cols = sc.w <= 500 ? 2 : 1;
	const capLines = 5;
	const cellW = sc.w + 24;
	const cellH = sc.h + 24 + capLines * 15 + 10;
	const rows = Math.ceil(frames.length / cols);
	const W = cols * cellW + 12;
	const H = rows * cellH + 12;
	const parts = frames.map((frame, i) => {
		const x = 12 + (i % cols) * cellW;
		const y = 12 + Math.floor(i / cols) * cellH;
		const body = embedLocalImages(renderScene(sc, frame.t, { id: `f${i}`, base: '' }));
		const cap = wrap(`${frame.t.toFixed(1)} s  ${frame.label}`, Math.floor(sc.w / 6.2)).slice(0, capLines);
		return `<g transform="translate(${x} ${y})"><rect width="${sc.w}" height="${sc.h}" fill="#fff" stroke="#c9d0d8"/>${body}${cap.map((l, k) => `<text class="cap" x="0" y="${sc.h + 18 + k * 15}">${esc(l)}</text>`).join('')}</g>`;
	});
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>${css}</style><rect width="${W}" height="${H}" fill="#f6f7f9"/>${parts.join('')}</svg>`;
	await sharp(Buffer.from(svg)).png().toFile(`${outDir}/png/${name}.png`);
	console.log(`${name}: ${W}x${H}, ${frames.length} frames`);
}
