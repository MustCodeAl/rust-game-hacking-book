// Browser reading views can keep the picture and inline styles while dropping
// the site's stylesheets. Give code and SVGs readable colours in that case.
// Normal pages still resolve the same theme variables and CSS overrides.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';

const colours: Readonly<Record<string, readonly [string, string]>> = {
  '#f8f1e3': ['code-text', '#1c2733'], '#bdb19d': ['syntax-comment', '#596b7a'],
  '#ff9d7a': ['syntax-keyword', '#9b371f'], '#ffd477': ['syntax-type', '#715000'],
  '#b9df8a': ['syntax-string', '#28693b'], '#79e2d0': ['syntax-escape', '#006b68'],
  '#8ecdf4': ['syntax-function', '#005d8d'], '#eee8dc': ['syntax-identifier', '#25313d'],
  '#a9d7ff': ['syntax-variable', '#235b94'], '#ff96bd': ['syntax-enum-variant', '#96385f'],
  '#d9afff': ['syntax-number', '#704098'], '#ff9a9a': ['syntax-safety', '#a32932'],
  '#a7e6b8': ['syntax-added', '#176a34'], '#ffb0ac': ['syntax-removed', '#9a2828'],
  '#fffffe': ['syntax-error', '#a32932'],
};
let pages = 0;
for (const name of readdirSync('dist', { recursive: true, encoding: 'utf8' })) {
  if (!name.endsWith('.html')) continue;
  const file = join('dist', name);
  const { document } = parseHTML(readFileSync(file, 'utf8'));
  const code = document.querySelectorAll<HTMLElement>('.expressive-code pre');
  const pictures = document.querySelectorAll<SVGSVGElement>('.sl-markdown-content :is(pre.mermaid, .scene) svg');
  if (!code.length && !pictures.length) continue;
  for (const pre of code) {
    pre.style.color = 'var(--code-text, #1c2733)';
    pre.style.backgroundColor = 'var(--code-bg, #edf2f7)';
    for (const span of pre.querySelectorAll<HTMLElement>('span[style]')) {
      const marker = /--0:\s*(#[0-9a-f]{6})/i.exec(span.getAttribute('style') ?? '');
      const [token, fallback] = colours[marker?.[1]?.toLowerCase() ?? ''] || ['code-text', '#1c2733'];
      span.style.color = `var(--${token}, ${fallback})`;
    }
  }
  for (const svg of pictures) {
    svg.style.backgroundColor = 'var(--diagram-paper, #ffffff)';
    for (const shape of svg.querySelectorAll('rect, circle, ellipse, polygon')) {
      if (!shape.hasAttribute('fill')) shape.setAttribute('fill', '#edf2f7');
      if (!shape.hasAttribute('stroke')) shape.setAttribute('stroke', '#59636f');
    }
    for (const path of svg.querySelectorAll('path')) {
      if (!path.hasAttribute('fill')) path.setAttribute('fill', path.closest('marker') ? '#59636f' : 'none');
      if (!path.hasAttribute('stroke')) path.setAttribute('stroke', '#59636f');
    }
    for (const label of svg.querySelectorAll('text')) {
      if (!label.hasAttribute('fill')) label.setAttribute('fill', '#11151a');
    }
    for (const label of svg.querySelectorAll<HTMLElement>('foreignObject .nodeLabel, foreignObject .edgeLabel')) label.style.color = 'var(--diagram-node-text, #11151a)';
  }
  writeFileSync(file, document.toString());
  pages += 1;
}
console.log(`reader-fallbacks: portable code and diagram colours on ${pages} pages.`);
