// Static check that every in-book link to a lesson page and heading still resolves in the MDX sources, so moving a section
// between lessons never leaves a dead link or a dead #anchor. It needs no build.
//   node scripts/check-lesson-anchors.ts            fail when a link target is missing (a baseline of known gaps is allowed)
//   node scripts/check-lesson-anchors.ts --list     print every unresolved link
// Anchors come from headings (GitHub-style slugs, like Starlight), explicit id="..." attributes and alias <span id> markers.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pagesRoot = resolve(site, 'src/content/docs/pages');
const list = process.argv.includes('--list');

const slug = (text: string): string => text
  .replace(/<[^>]+>/g, '').replace(/`/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_]/g, '')
  .toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');

const sources = new Map<string, string>();
for (const chapter of readdirSync(pagesRoot)) {
  if (!/^\d+$/.test(chapter)) continue;
  for (const name of readdirSync(resolve(pagesRoot, chapter))) {
    if (name.endsWith('.mdx')) sources.set(`${chapter}/${name.slice(0, -4)}`, readFileSync(resolve(pagesRoot, chapter, name), 'utf8'));
  }
}

const anchors = new Map<string, Set<string>>();
for (const [page, text] of sources) {
  const found = new Set<string>();
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading?.[1]) found.add(slug(heading[1]));
  }
  for (const match of text.matchAll(/\sid=["']([^"']+)["']/g)) if (match[1]) found.add(match[1]);
  for (const match of text.matchAll(/\sid=\{["`']([^"`']+)["`']\}/g)) if (match[1]) found.add(match[1]);
  anchors.set(page, found);
}

let links = 0;
const missing: string[] = [];
for (const [page, text] of sources) {
  const body = text.replace(/```[\s\S]*?```/g, '');
  for (const match of body.matchAll(/\]\(\/pages\/(\d+)\/(\d+)\/(?:#([^)\s]*))?\)/g)) {
    links++;
    const target = `${match[1]}/${match[2]}`;
    const fragment = match[3];
    if (!sources.has(target)) { missing.push(`${page}: no lesson ${target}`); continue; }
    if (fragment && !anchors.get(target)?.has(fragment)) missing.push(`${page}: /pages/${target}/#${fragment}`);
  }
}

const baselinePath = resolve(site, 'scripts/lesson-anchors-baseline.json');
const baseline: string[] = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) as string[] : [];
const fresh = missing.filter(entry => !baseline.includes(entry));
if (list) for (const entry of missing) console.log(entry);
if (fresh.length) {
  console.error(`lesson-anchors: ${fresh.length} link target(s) no longer resolve:\n${fresh.join('\n')}`);
  process.exitCode = 1;
} else console.log(`lesson-anchors: ${links} in-book lesson links; ${missing.length} known gaps in the baseline, none new.`);
