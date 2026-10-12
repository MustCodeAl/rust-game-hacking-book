// Markup for a cell frame as one HTML string, shared by the Astro components (server) and the live calculators
// (browser), so a step in a CellFrames diagram and a recomputed result look identical. All text is escaped.
import { rowColumns, type Cell, type CellFrame, type CellRow, type Panel } from './cell-model';

const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escapeHtml = (text: string): string => text.replace(/[&<>"]/g, character => entities[character] ?? character);

function cellHtml(cell: Cell, tall: number | undefined): string {
  const attributes = [
    `class="cells__cell"`,
    cell.hue ? `data-hue="${cell.hue}"` : '',
    cell.hot ? 'data-hot="true"' : '',
    cell.ghost ? 'data-ghost="true"' : '',
    cell.dot ? `data-dot="${cell.dot}"` : '',
    cell.gap ? 'data-gap="true" aria-hidden="true"' : '',
    tall ? `style="--tall:${tall}"` : '',
  ].filter(Boolean).join(' ');
  const sub = cell.sub ? `<small>${escapeHtml(cell.sub)}</small>` : '';
  const bracket = cell.bracket ? `<span class="cells__bracket">${escapeHtml(cell.bracket)}</span>` : '';
  return `<div class="cells__slot" style="--span:${cell.span ?? 1}"><span ${attributes}><span class="cells__text">${escapeHtml(cell.text)}</span>${sub}</span>${bracket}</div>`;
}

function rowHtml(row: CellRow): string {
  const link = row.link ? `<p class="cells__link"><span aria-hidden="true">↓</span> ${escapeHtml(row.link)}</p>` : '';
  const name = row.label ? `<span class="cells__name">${escapeHtml(row.label)}</span>` : '';
  const ticks = row.ticks ? `<div class="cells__ticks"><span>${escapeHtml(row.ticks.left ?? '')}</span><span>${escapeHtml(row.ticks.right ?? '')}</span></div>` : '';
  const cells = row.cells.map(cell => cellHtml(cell, row.tall)).join('');
  return `<div class="cells__row">${link}${name}<div class="cells__body">${ticks}<div class="cells__grid" style="--cols:${rowColumns(row)}">${cells}</div></div></div>`;
}

function panelHtml(panel: Panel): string {
  const banner = panel.title ? `<h4 class="cells__banner">${escapeHtml(panel.title)}</h4>` : '';
  const hue = panel.hue ? ` data-hue="${panel.hue}"` : '';
  return `<section class="cells__box"${hue}${panel.title ? ' data-titled="true"' : ''}>${banner}${panel.rows.map(rowHtml).join('')}</section>`;
}

/** The panels of one frame, plus its colour legend when it has one. */
export function frameBodyHtml(frame: CellFrame): string {
  const legend = frame.legend ? `<ul class="cells__legend">${frame.legend.map(item => `<li data-hue="${item.hue}"><i></i>${escapeHtml(item.text)}</li>`).join('')}</ul>` : '';
  return `<div class="cells__frame"${frame.side ? ' data-side="true"' : ''} style="--panels:${frame.panels.length}">${frame.panels.map(panelHtml).join('')}</div>${legend}`;
}
