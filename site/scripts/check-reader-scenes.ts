// Check the built lessons, listening transcripts, and chapter print documents.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import type { ReaderVariants, ReaderBlock } from '../src/lib/reader-text.ts';
import { collectReadableBlocks, cleanReaderText, chunkSpeechBlocks } from '../src/lib/reader-text.ts';

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
    item.isDirectory() ? htmlFiles(join(dir, item.name)) : item.name === 'index.html' ? [join(dir, item.name)] : []);
}
let scenes = 0;
const printed = htmlFiles('dist/print/chapter').map((file) => parseHTML(readFileSync(file, 'utf8')).document);
for (const file of htmlFiles('dist/pages')) {
  const { document } = parseHTML(readFileSync(file, 'utf8'));
  const article = document.querySelector<HTMLElement>('.sl-markdown-content');
  assert.ok(article, file + ': lesson article exists');
  const figures = [...article.querySelectorAll<HTMLElement>('figure[data-scene]')];
  if (!figures.length) continue;
  const listening = parseHTML(readFileSync(file.replace('dist/pages/', 'dist/read/'), 'utf8')).document;
  const transcript = listening.querySelector('[data-reader-transcript-variants]');
  assert.ok(transcript);
  const variants: ReaderVariants = JSON.parse(transcript.textContent ?? 'null');
  for (const figure of figures) {
    const title = cleanReaderText(figure.querySelector('.scene__title')?.textContent ?? '');
    const steps = figure.querySelectorAll('.scene__steps li').length;
    for (const includeCode of [false, true]) {
      const blocks: ReaderBlock[] = collectReadableBlocks(article, includeCode).filter((block) => !!block.element && figure.contains(block.element));
      assert.equal(blocks.length, 1, `${file}: one narration block for ${title}`);
      assert.equal(blocks[0].kind, 'diagram');
      assert.equal(chunkSpeechBlocks(blocks).length, 0, 'Diagram never enters speech queue');
      assert.equal((blocks[0].text.match(/Step \d+:/g) || []).length, 0, 'Short caption, no automatic step recital');
      assert.ok(blocks[0].media?.svg, `${file}: preserve the scene picture`);
      const exported = (includeCode ? variants.withCode : variants.prose).filter((block) => block.text === blocks[0].text);
      assert.equal(exported.length, 1, `${file}: one exported description`);
      assert.equal(exported[0].kind, 'diagram');
      assert.equal((exported[0].text.match(/Step \d+:/g) || []).length, 0);
      assert.ok(exported[0].media?.src?.startsWith('/rust-game-hacking-book/assets/reader/'));
      const image = listening.querySelector(`[data-narration-id="${exported[0].id}"] img`);
      assert.ok(image, `${file}: static diagram remains visible`);
      assert.ok((image.getAttribute('alt') ?? '').split(/\s+/).length <= 12, 'Native readers get only a brief image label');
      assert.ok(image.closest('[data-reader-skip]'));
      assert.equal(image.closest('[aria-hidden="true"]'), null, 'Edge retains informative images');
      assert.ok(exported[0].media?.src);
      assert.ok(readFileSync(join('dist', exported[0].media.src.replace('/rust-game-hacking-book/', '')), 'utf8').includes('<svg'));
    }
    const copies = printed.flatMap((doc) => [...doc.querySelectorAll(`[data-scene-id="${figure.dataset.sceneId}"]`)]);
    assert.equal(copies.length, 1, `${file}: one chapter-print scene`);
    assert.equal(copies[0].querySelectorAll('.scene__alt').length, 1);
    assert.equal(copies[0].querySelectorAll('.scene__steps li').length, steps);
    assert.ok(copies[0].querySelector('.scene__controls[data-reader-skip]'));
    scenes += 1;
  }
}
assert.ok(scenes > 0, 'No scenes checked');
console.log(`reader-scenes: ${scenes} scene pictures remain visible and silent in both listening variants; complete steps remain in print.`);
