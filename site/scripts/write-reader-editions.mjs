// Publish the listening transcript as real article HTML. Chrome Reading mode
// and URL importers can read it even when they do not execute page scripts.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { adaptReaderArticle, collectReadableBlocks, plainLessonText, showReaderVariant } from '../src/lib/reader-text.mjs';

const directory = join(dirname(fileURLToPath(import.meta.url)), '../dist/read');
const pictureDirectory = join(directory, '../assets/reader');
mkdirSync(pictureDirectory, { recursive: true });
const pictureStyle = `<style>
svg{background:#fff;color:#11151a;font-family:system-ui,sans-serif}
[data-role]{--r:#59636f}[data-role="input"],[data-role="state"]{--r:#235b94}[data-role="process"]{--r:#704098}[data-role="output"]{--r:#28693b}[data-role="caution"]{--r:#9b371f}[data-role="muted"]{--r:#59636f}
.scene__rect{fill:color-mix(in srgb,var(--r) 10%,#fff);stroke:var(--r);stroke-width:1.5}.scene__rect--ghost{fill:none;stroke-dasharray:4 3}.scene__rect--plain{fill:#fff}.scene__label{fill:#11151a}.scene__mono{font-family:monospace}.scene__free{fill:var(--r)}.scene__line{fill:none;stroke:var(--r);stroke-width:2}.scene__tip{fill:var(--r)}
.nodeLabel,.edgeLabel{color:#11151a!important}.labelBkg{fill:#fff!important}
</style>`;

function publishPictures(article) {
  const packed = article.querySelector('[data-reader-transcript-variants]');
  const variants = JSON.parse(packed.textContent);
  const base = article.dataset.sourceHref.replace(/\/pages\/.*$/, '');
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
let lessons = 0;
let blocks = 0;
let diagrams = 0;
for (const folder of readdirSync(directory, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  for (const lesson of readdirSync(join(directory, folder.name), { withFileTypes: true })) {
    if (!lesson.isDirectory()) continue;
    const path = join(directory, folder.name, lesson.name, 'index.html');
    const { document } = parseHTML(readFileSync(path, 'utf8'));
    const article = document.getElementById('reader-article');
    const tools = document.querySelector('[data-reader-tools]');
    if (!article || !tools) throw new Error(`Reader article missing: ${path}`);
    adaptReaderArticle(article);
    publishPictures(article);
    const narration = collectReadableBlocks(article);
    if (narration.length < 2) throw new Error(`Reader transcript incomplete: ${path}`);
    writeFileSync(path, document.toString());
    writeFileSync(join(dirname(path), 'lesson.txt'), plainLessonText(tools.dataset.title, tools.dataset.sourceUrl, narration));
    lessons += 1;
    blocks += narration.length;
    diagrams += narration.filter((block) => block.media).length;
  }
}
if (lessons !== 138) throw new Error(`Expected 138 listening editions, found ${lessons}.`);
console.log(`reader-editions: published ${lessons} listening articles and TXT files; ${blocks} blocks, ${diagrams} preserved visuals (silent during narration).`);
