// Publish the listening transcript as real article HTML. Chrome Reading mode
// and URL importers can read it even when they do not execute page scripts.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { adaptReaderArticle, collectReadableBlocks, plainLessonText } from '../src/lib/reader-text.mjs';

const directory = join(dirname(fileURLToPath(import.meta.url)), '../dist/read');
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
    const narration = collectReadableBlocks(article);
    if (narration.length < 2) throw new Error(`Reader transcript incomplete: ${path}`);
    writeFileSync(path, document.toString());
    writeFileSync(join(dirname(path), 'lesson.txt'), plainLessonText(tools.dataset.title, tools.dataset.sourceUrl, narration));
    lessons += 1;
    blocks += narration.length;
    diagrams += narration.filter((block) => block.kind === 'diagram').length;
  }
}
if (lessons !== 135) throw new Error(`Expected 135 listening editions, found ${lessons}.`);
console.log(`reader-editions: published ${lessons} listening articles and TXT files; ${blocks} passages, ${diagrams} explained visuals.`);
