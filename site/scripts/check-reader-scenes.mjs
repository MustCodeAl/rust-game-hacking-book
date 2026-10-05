// Check the built lessons, listening transcripts, and chapter print documents.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { collectReadableBlocks, cleanReaderText, chunkSpeechBlocks } from '../src/lib/reader-text.mjs';

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
    item.isDirectory() ? htmlFiles(join(dir, item.name)) : item.name === 'index.html' ? [join(dir, item.name)] : []);
}
let scenes = 0;
const printed = htmlFiles('dist/print/chapter').map((file) => parseHTML(readFileSync(file, 'utf8')).document);
for (const file of htmlFiles('dist/pages')) {
  const { document } = parseHTML(readFileSync(file, 'utf8'));
  const article = document.querySelector('.sl-markdown-content');
  const figures = [...article.querySelectorAll('figure[data-scene]')];
  if (!figures.length) continue;
  const listening = parseHTML(readFileSync(file.replace('dist/pages/', 'dist/read/'), 'utf8')).document;
  const variants = JSON.parse(listening.querySelector('[data-reader-transcript-variants]').textContent);
  for (const figure of figures) {
    const title = cleanReaderText(figure.querySelector('.scene__title').textContent);
    const steps = figure.querySelectorAll('.scene__steps li').length;
    for (const includeCode of [false, true]) {
      const blocks = collectReadableBlocks(article, includeCode).filter((block) => figure.contains(block.element));
      assert.equal(blocks.length, 1, `${file}: one narration block for ${title}`);
      assert.equal(blocks[0].kind, 'diagram');
      assert.equal(chunkSpeechBlocks(blocks).length, 0, 'Diagram never enters speech queue');
      assert.equal((blocks[0].text.match(/Step \d+:/g) || []).length, 0, 'Short caption, no automatic step recital');
      assert.ok(blocks[0].media?.svg, `${file}: preserve the scene picture`);
      const exported = (includeCode ? variants.withCode : variants.prose).filter((block) => block.text === blocks[0].text);
      assert.equal(exported.length, 1, `${file}: one exported description`);
      assert.equal(exported[0].kind, 'diagram');
      assert.equal((exported[0].text.match(/Step \d+:/g) || []).length, 0);
      assert.ok(exported[0].media?.src.startsWith('/rust-game-hacking-book/assets/reader/'));
      const image = listening.querySelector(`[data-narration-id="${exported[0].id}"] img`);
      assert.ok(image, `${file}: static diagram remains visible`);
      assert.equal(image.getAttribute('alt'), '', 'Native voices have no diagram label recital');
      assert.ok(image.closest('[data-reader-skip][aria-hidden="true"]'));
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
