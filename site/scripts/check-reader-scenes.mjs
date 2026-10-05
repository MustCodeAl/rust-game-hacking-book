// Check the built lessons, listening transcripts, and chapter print documents.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { collectReadableBlocks, cleanReaderText } from '../src/lib/reader-text.mjs';

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
      assert.equal((blocks[0].text.match(/Step \d+:/g) || []).length, steps);
      const exported = (includeCode ? variants.withCode : variants.prose).filter((block) => block.text.startsWith(`Animated diagram: ${title}.`));
      assert.equal(exported.length, 1, `${file}: one exported description`);
      assert.equal(exported[0].kind, 'diagram');
      assert.equal((exported[0].text.match(/Step \d+:/g) || []).length, steps);
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
console.log(`reader-scenes: ${scenes} scenes described once in both listening variants and chapter print.`);
