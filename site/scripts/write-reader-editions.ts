// Publish the listening transcript as real article HTML. Chrome Reading mode
// and URL importers can read it even when they do not execute page scripts.
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { adaptReaderArticle, collectReadableBlocks, figureLeftOut, nativeFigureRoots, plainLessonText, showReaderVariant } from '../src/lib/reader-text.ts';
import type { FigurePicture, ReaderVariants } from '../src/lib/reader-text.ts';
import type { FigureManifest, FigureRecord } from './reader-figures.ts';
import { getLessonIndex } from '../src/data/lesson-index.ts';

const directory = join(dirname(fileURLToPath(import.meta.url)), '../dist/read');
const pictureDirectory = join(directory, '../assets/reader');
mkdirSync(pictureDirectory, { recursive: true });
const pictureStyle = `<style>
svg{background:#fff;color:#11151a;font-family:system-ui,sans-serif}
[data-role]{--r:#59636f}[data-role="input"],[data-role="state"]{--r:#235b94}[data-role="process"]{--r:#704098}[data-role="output"]{--r:#28693b}[data-role="caution"]{--r:#9b371f}[data-role="muted"]{--r:#59636f}
.scene__rect{fill:color-mix(in srgb,var(--r) 10%,#fff);stroke:var(--r);stroke-width:1.5}.scene__rect--ghost{fill:none;stroke-dasharray:4 3}.scene__rect--plain{fill:#fff}.scene__label{fill:#11151a}.scene__mono{font-family:monospace}.scene__free{fill:var(--r)}.scene__line{fill:none;stroke:var(--r);stroke-width:2}.scene__tip{fill:var(--r)}
.nodeLabel,.edgeLabel{color:#11151a!important}.labelBkg{fill:#fff!important}
</style>`;

function publishPictures(article: HTMLElement) {
  const packed = article.querySelector<HTMLElement>('[data-reader-transcript-variants]');
  if (!packed) throw new Error('Reader transcript variants missing');
  const variants: ReaderVariants = JSON.parse(packed.textContent ?? 'null');
  const sourceHref = article.dataset.sourceHref;
  if (!sourceHref) throw new Error('Reader source URL missing');
  const base = sourceHref.replace(/\/pages\/.*$/, '');
  for (const blocks of [variants.prose, variants.withCode]) {
    for (const block of blocks) {
      if (!block.media?.svg) continue;
      const svg = block.media.svg.replace(/(<svg\b[^>]*>)/, `$1${pictureStyle}`);
      const name = `${createHash('sha256').update(svg).digest('hex').slice(0, 20)}.svg`;
      writeFileSync(join(pictureDirectory, name), svg);
      delete block.media.svg;
      block.media.src = `${base}/assets/reader/${name}`;
    }
  }
  packed.textContent = JSON.stringify(variants).replace(/</g, '\\u003c');
  showReaderVariant(article, false);
}
// Stills of the native figures, photographed by reader-figures.ts. Each one
// goes where its figure was, as a silent picture.
const figureManifest = join(pictureDirectory, 'figures.json');
const stills = new Map<string, FigureRecord[]>();
if (existsSync(figureManifest)) {
  const manifest: FigureManifest = JSON.parse(readFileSync(figureManifest, 'utf8'));
  for (const figure of manifest.figures) stills.set(figure.page, [...(stills.get(figure.page) ?? []), figure]);
} else console.warn('reader-editions: no figure stills (run reader-figures first); native figures stay silent text.');
function picturesFor(page: string, sourceHref: string): Map<string, FigurePicture> {
  const folder = `${sourceHref.replace(/\/pages\/.*$/, '')}/assets/reader/figures/`;
  return new Map((stills.get(page) ?? []).map((figure) => [figure.key, {
    signature: figure.signature,
    media: { src: folder + figure.wide.file, width: figure.wide.width, height: figure.wide.height, alt: '', narrow: { src: folder + figure.narrow.file, width: figure.narrow.width, height: figure.narrow.height } },
  }]));
}
let lessons = 0;
let blocks = 0;
let diagrams = 0;
let figures = 0;
let pictured = 0;
for (const folder of readdirSync(directory, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  for (const lesson of readdirSync(join(directory, folder.name), { withFileTypes: true })) {
    if (!lesson.isDirectory()) continue;
    const path = join(directory, folder.name, lesson.name, 'index.html');
    const { document } = parseHTML(readFileSync(path, 'utf8'));
    const article = document.getElementById('reader-article');
    const tools = document.querySelector<HTMLElement>('[data-reader-tools]');
    if (!article || !tools) throw new Error(`Reader article missing: ${path}`);
    const sourceHref = article.dataset.sourceHref ?? '';
    if (!sourceHref.endsWith(`/pages/${folder.name}/${lesson.name}/`)) throw new Error(`Reader source URL does not match ${path}`);
    figures += nativeFigureRoots(article).filter((figure) => !figureLeftOut(figure)).length;
    adaptReaderArticle(article, picturesFor(`${folder.name}/${lesson.name}`, sourceHref));
    publishPictures(article);
    const narration = collectReadableBlocks(article);
    pictured += narration.filter((block) => block.media?.narrow).length;
    if (narration.length < 2) throw new Error(`Reader transcript incomplete: ${path}`);
    writeFileSync(path, document.toString());
    writeFileSync(join(dirname(path), 'lesson.txt'), plainLessonText(tools.dataset.title ?? 'Lesson', tools.dataset.sourceUrl ?? '', narration));
    lessons += 1;
    blocks += narration.length;
    diagrams += narration.filter((block) => block.media).length;
  }
}
const expected = getLessonIndex().length;
if (lessons !== expected) throw new Error(`Expected ${expected} listening editions, found ${lessons}.`);
console.log(`reader-editions: published ${lessons} listening articles and TXT files; ${blocks} blocks, ${diagrams} preserved visuals (silent during narration), including ${pictured} of ${figures} native figures as stills.`);
