// Writes the book's icons and social card from its mark (see IDENTITY.md):
//   public/favicon.svg                  the compact mark: three byte boxes, the first one filled, the pointer notch
//   public/favicon.ico                  16, 32 and 48 px PNGs of favicon.svg in one ICO file
//   public/favicon-16x16.png, -32x32    the same, as loose files
//   public/apple-touch-icon.png         180 px: the full mark, 47 48 41, with G H A under the boxes
//   public/og-card.png                  1200 x 630 social card: the header band, the headline, the hero's health bytes
//   src/assets/logo.svg                 the full mark as a file (the header itself draws it inline)
// Chrome renders the SVG and HTML below, with the book's own variable fonts embedded, so no image generator is involved
// and the result is the same on every machine with the same Chrome. Run from site/ after changing the mark or the copy:
//   PLAYWRIGHT_PATH=<playwright package> CHROME_PATH=<chrome binary> node scripts/make-identity-assets.mjs
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEALTH, NAME_BYTES, TITLE, address, asciiBytes, u32Bytes } from '../src/components/identity/bytes.ts';
import { BASE, SITE as SITE_URL } from '../src/data/site.ts';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (path) => resolve(site, path);

// The default palette (Paper, light), as computed on the built home page. Static images cannot read the reader's palette.
const C = {
	night: '#151b23', paper: '#f7f9fc', ink: '#252a31', inkSoft: '#59636f', headerText: '#f8fafc', headerMuted: '#9aa5b3',
	rust: '#db5b32', information: '#7e2c13', result: '#145e64', nodeBg: '#f2eeef',
};

const font = (pkg, file) => readFileSync(resolve(site, 'node_modules/@fontsource-variable', pkg, 'files', file)).toString('base64');
const fontFaces = [
	['Display', 'space-grotesk', 'space-grotesk-latin-wght-normal.woff2'],
	['Body', 'lexend', 'lexend-latin-wght-normal.woff2'],
	['Mono', 'jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2'],
].map(([family, pkg, file]) => `@font-face{font-family:${family};font-weight:100 900;src:url(data:font/woff2;base64,${font(pkg, file)}) format('woff2')}`).join('');

// The lesson count, from the same frontmatter the site reads (a lesson is a page with a `chapter:` number).
const pagesRoot = out('src/content/docs/pages');
const chapters = new Set();
let lessonCount = 0;
for (const dir of readdirSync(pagesRoot)) {
	for (const name of readdirSync(resolve(pagesRoot, dir))) {
		const match = /^chapter:\s*"(\d+)\.\d+"/m.exec(readFileSync(resolve(pagesRoot, dir, name), 'utf8'));
		if (match) { lessonCount += 1; chapters.add(match[1]); }
	}
}

// ---- Sources ---------------------------------------------------------------

const compactMark = (stroke) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="7" fill="${C.night}"/>
<path d="M5.9 5.2h5.6L8.7 9z" fill="${C.rust}"/>
<path d="M7 11.5h5.33v11H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" fill="${C.rust}"/>
<rect x="5" y="11.5" width="22" height="11" rx="2" fill="none" stroke="${C.headerText}" stroke-width="${stroke}"/>
<path d="M12.33 11.5v11M19.67 11.5v11" stroke="${C.headerText}" stroke-width="${stroke}"/>
</svg>
`;

const fullMark = ({ line, ink, hit, notch, fontFamily }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 30">
<path d="M8 0h8l-4 4.6z" fill="${notch}"/>
<path d="M5 7H23V29H5A4 4 0 0 1 1 25V11A4 4 0 0 1 5 7Z" fill="${hit}"/>
<rect x="1" y="7" width="66" height="22" rx="4" fill="none" stroke="${line}" stroke-width="1.5"/>
<path d="M23 7v22M45 7v22" fill="none" stroke="${line}" stroke-width="1.5"/>
${NAME_BYTES.map((byte, index) => `<text x="${12 + index * 22}" y="22.2" text-anchor="middle" fill="${ink}" font-family="${fontFamily}" font-size="11" font-weight="700">${byte}</text>`).join('\n')}
</svg>
`;

const page = (width, height, body, css = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces}
*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}${css}</style></head><body>${body}</body></html>`;

const touchIcon = page(180, 180, `<div class="icon">
${fullMark({ line: 'rgba(248,250,252,.62)', ink: C.headerText, hit: 'rgba(219,91,50,.42)', notch: C.rust, fontFamily: 'Mono' }).replace('<svg ', '<svg class="mark" ')}
<div class="letters">${Array.from('GHA', (letter) => `<span>${letter}</span>`).join('')}</div>
</div>`, `.icon{width:180px;height:180px;background:${C.night};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.mark{width:140px;height:auto;overflow:visible}
.letters{display:grid;grid-template-columns:repeat(3,${140 * 22 / 68}px);width:${140 * 66 / 68}px;margin-left:${140 * 1 / 68}px;color:${C.headerMuted};font:600 20px/1 Display;text-align:center}`);

const strip = u32Bytes(HEALTH.start);
const ogCard = page(1200, 630, `<div class="card">
<header>${fullMark({ line: 'rgba(248,250,252,.6)', ink: C.headerText, hit: 'rgba(219,91,50,.4)', notch: C.rust, fontFamily: 'Mono' }).replace('<svg ', '<svg class="mark" ')}<span class="name">${TITLE}</span><span class="count">${lessonCount} lessons in ${chapters.size} chapters</span></header>
<h1>Learn how games work, down to the bytes.</h1>
<div class="row screen"><span class="label">On screen</span><span class="bar"><span></span></span><span class="value">Health <b>${HEALTH.start}</b></span></div>
<div class="row memory"><span class="label">In memory</span><div class="strip">${strip.map((byte, index) => `<div class="cell${index === 0 ? ' marked' : ''}"><span class="addr">${address(HEALTH.address + index)}</span><span class="byte">${byte}</span></div>`).join('')}</div></div>
<p class="url">${new URL(SITE_URL).host}${BASE}</p>
</div>`, `.card{width:1200px;height:630px;background:${C.paper};color:${C.ink};font-family:Body}
header{height:112px;padding:0 64px;background:${C.night};display:flex;align-items:center;gap:22px;color:${C.headerText}}
.mark{height:46px;width:auto;overflow:visible}
.name{font:600 34px/1 Display;letter-spacing:-.01em}
.count{margin-left:auto;color:${C.headerMuted};font:400 22px/1 Body}
h1{margin:46px 64px 0;font:700 64px/1.02 Display;letter-spacing:-.035em;color:${C.ink};text-wrap:balance;max-width:900px}
.row{display:grid;grid-template-columns:150px 1fr;align-items:center;column-gap:24px;margin:0 64px}
.screen{margin-top:44px}.memory{margin-top:22px;align-items:end}
.label{color:${C.inkSoft};font:500 21px/1 Body}
.memory .label{padding-bottom:34px}
.screen{grid-template-columns:150px 1fr auto}
.bar{height:20px;border:2px solid rgba(37,42,49,.3);border-radius:999px;overflow:hidden;background:#eceef2}
.bar span{display:block;height:100%;width:100%;background:${C.result}}
.value{font:400 22px/1 Body;color:${C.ink};min-width:150px}.value b{font:700 32px/1 Display}
.strip{display:grid;grid-template-columns:repeat(4,1fr)}
.cell{display:flex;flex-direction:column;gap:8px}
.addr{text-align:center;color:${C.inkSoft};font:500 17px/1 Mono}
.byte{display:block;margin-left:-2px;padding:22px 0;text-align:center;font:600 64px/1 Mono;color:${C.ink};background:${C.nodeBg};border:2.5px solid ${C.information}}
.cell:first-child .byte{margin-left:0;border-radius:14px 0 0 14px}.cell:last-child .byte{border-radius:0 14px 14px 0}
.marked .byte{position:relative;z-index:1;border-color:${C.result};background:#dfeceb}
.url{margin:30px 64px 0;color:${C.inkSoft};font:400 19px/1 Body}`);

// ---- Render ----------------------------------------------------------------

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const render = async (html, width, height, transparent = false) => {
	const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
	await tab.setContent(html, { waitUntil: 'load' });
	await tab.evaluate(() => document.fonts.ready);
	const png = await tab.screenshot({ type: 'png', omitBackground: transparent });
	await tab.close();
	return png;
};
const svgPage = (svg, size) => page(size, size, svg.replace('<svg ', `<svg width="${size}" height="${size}" `));

// Thin strokes vanish at 16 px, so the smallest sizes draw the box lines a little heavier.
const icon16 = await render(svgPage(compactMark(2.2), 16), 16, 16, true);
const icon32 = await render(svgPage(compactMark(1.8), 32), 32, 32, true);
const icon48 = await render(svgPage(compactMark(1.6), 48), 48, 48, true);
const touch = await render(touchIcon, 180, 180);
const og = await render(ogCard, 1200, 630);
await browser.close();

/** An ICO file holding PNG images, which every current browser and Windows since Vista read. */
const ico = (images) => {
	const header = Buffer.alloc(6 + 16 * images.length);
	header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
	let offset = header.length;
	images.forEach(({ size, png }, index) => {
		const entry = 6 + index * 16;
		header.writeUInt8(size >= 256 ? 0 : size, entry); header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
		header.writeUInt8(0, entry + 2); header.writeUInt8(0, entry + 3);
		header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
		header.writeUInt32LE(png.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
		offset += png.length;
	});
	return Buffer.concat([header, ...images.map(({ png }) => png)]);
};

writeFileSync(out('public/favicon.svg'), compactMark(1.8));
writeFileSync(out('public/favicon-16x16.png'), icon16);
writeFileSync(out('public/favicon-32x32.png'), icon32);
writeFileSync(out('public/favicon.ico'), ico([{ size: 16, png: icon16 }, { size: 32, png: icon32 }, { size: 48, png: icon48 }]));
writeFileSync(out('public/apple-touch-icon.png'), touch);
writeFileSync(out('public/og-card.png'), og);
writeFileSync(out('src/assets/logo.svg'), fullMark({ line: C.ink, ink: C.ink, hit: 'rgba(219,91,50,.3)', notch: C.rust, fontFamily: "'JetBrains Mono', ui-monospace, monospace" })
	.replace('<svg ', '<svg role="img" aria-label="Game Hacking Academy: the bytes 47 48 41, ASCII for G, H and A" '));
console.log(`identity assets written (${lessonCount} lessons, ${chapters.size} chapters; title bytes ${asciiBytes(TITLE).length})`);
