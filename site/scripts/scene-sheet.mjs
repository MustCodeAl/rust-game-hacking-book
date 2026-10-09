// Draws a contact sheet for each scene: a still of every step, as the finished page
// would show it, so a whole animation can be checked at a glance. It reuses the
// stylesheets of a built lesson page, so build the site first.
//
//   node scripts/scene-sheet.mjs <out-dir> [scene-name ...]     (no names: every scene)
//
// Serve out-dir beside the built site (see the local-preview notes) and open
// sheets/<name>.html.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { renderScene } from '../src/lib/scene/markup.ts';

const [outDir, ...names] = process.argv.slice(2);
if (!outDir) {
	console.error('usage: node scripts/scene-sheet.mjs <out-dir> [scene-name ...]');
	process.exit(1);
}

const scenesDir = new URL('../src/scenes/', import.meta.url);
const all = readdirSync(scenesDir).filter((file) => file.endsWith('.ts')).map((file) => file.slice(0, -4));
const wanted = names.length ? names : all;

// The head of any built page that uses scenes carries the site's styles and settings script.
const base = '/rust-game-hacking-book';
const probe = readFileSync(new URL('../dist/pages/4/06/index.html', import.meta.url), 'utf8');
const head = probe.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<title>[\s\S]*?<\/title>/, '');
const escape = (text) => String(text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

mkdirSync(`${outDir}/sheets`, { recursive: true });
const links = [];
for (const name of wanted) {
	const sc = (await import(pathToFileURL(new URL(`${name}.mjs`, scenesDir).pathname))).default;
	const settle = (i) => {
		const next = sc.cues[i + 1] ? sc.cues[i + 1][0] : sc.duration;
		return Math.min(1.6, (next - sc.cues[i][0]) * 0.9);
	};
	const frames = [{ t: 0, label: 'Start' }, ...sc.cues.map(([t, words], i) => ({ t: Math.min(sc.duration, t + settle(i)), label: words })), { t: sc.duration, label: 'End' }];
	const cells = frames.map((frame, i) => {
		const picture = renderScene(sc, frame.t, { id: `sheet-${name}-${i}`, base });
		return `<figure class="sheet__frame"><div class="scene" style="--scene-w:${sc.w}"><div class="scene__stage"><svg class="scene__svg" viewBox="0 0 ${sc.w} ${sc.h}">${picture}</svg></div></div><figcaption><b>${frame.t.toFixed(1)} s</b> ${escape(frame.label)}</figcaption></figure>`;
	});
	const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">${head}<style>
body{padding:1rem 1.5rem;font-family:var(--body);background:var(--paper,#fff);color:var(--ink,#111)}
.sheet{display:grid;grid-template-columns:repeat(auto-fill,minmax(26rem,1fr));gap:1rem}
.sheet__frame{margin:0}.sheet__frame figcaption{font-size:.8rem;line-height:1.4;margin-top:.3rem;max-width:34rem}
.sheet__frame .scene__svg{max-width:34rem}
</style></head><body><h1>${escape(sc.title)}</h1><p>${escape(sc.alt)}</p><p><b>${sc.duration} s</b>, ${sc.cues.length} steps, ${sc.animated.length} animated parts.</p><div class="sl-markdown-content" data-tone="2"><div class="sheet">${cells.join('')}</div></div></body></html>`;
	writeFileSync(`${outDir}/sheets/${name}.html`, html);
	links.push(`<li><a href="${name}.html">${escape(name)}</a> — ${escape(sc.title)} (${sc.duration} s)</li>`);
	console.log(`${name}: ${frames.length} frames, ${sc.duration} s`);
}
writeFileSync(`${outDir}/sheets/index.html`, `<!doctype html><meta charset="utf-8"><title>Scenes</title><ul>${links.join('')}</ul>`);
