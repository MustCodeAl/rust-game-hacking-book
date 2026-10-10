export interface TableMedia { svg: string; width: number; height: number; alt: string }
interface TableCell { column: number; span: number; rowSpan: number; text: string; header: boolean; notation: boolean; lines?: string[] }

const FONT_SIZE = 12;
const CHARACTER_WIDTH = 7.3;
const LINE_HEIGHT = 16;
const HORIZONTAL_PADDING = 7;
const VERTICAL_PADDING = 6;
const MAX_WIDTH = 680;

function xml(value: unknown) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  } as Record<string, string>)[character]);
}

function cellText(element: Element) {
  function read(node: Node): string {
    if (node.nodeType === 3) return node.nodeValue || '';
    if (node.nodeType !== 1) return '';
    const element = node as Element; // nodeType 1 guarantees an element.
    if (element.matches('[data-reader-skip], .sr-only, [aria-hidden="true"]')) return '';
    if (element.tagName === 'BR') return '\n';
    const content = Array.from(node.childNodes, read).join('');
    return content + (/^(P|LI|DIV|PRE)$/.test(element.tagName) ? '\n' : '');
  }
  return read(element).split('\n').map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean).join('\n');
}

function wrap(text: string, characters: number) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    let remaining = paragraph.trim();
    if (!remaining) {
      lines.push('');
      continue;
    }
    while (remaining.length > characters) {
      const space = remaining.lastIndexOf(' ', characters);
      const cut = space > characters / 2 ? space : characters;
      lines.push(remaining.slice(0, cut).trimEnd());
      remaining = remaining.slice(cut).trimStart();
    }
    lines.push(remaining);
  }
  return lines.length ? lines : [''];
}

function positiveSpan(element: Element, name: string) {
  const value = Number(element.getAttribute(name));
  return Number.isInteger(value) && value > 0 ? Math.min(value, 64) : 1;
}

/** Preserve a lesson table as a compact picture. The returned text is an image
 * label, rather than a row-by-row narration of the data. */
export function tableMedia(table: Element): TableMedia | null {
  const rows: TableCell[][] = [];
  const occupiedUntil: number[] = [];
  let columnCount = 0;
  const elements = Array.from(table.querySelectorAll('tr'))
    .filter((row) => row.closest('table') === table);

  for (const [rowIndex, element] of elements.entries()) {
    const cells: TableCell[] = [];
    let column = 0;
    for (const cell of element.children) {
      if (!/^(TH|TD)$/.test(cell.tagName)) continue;
      while ((occupiedUntil[column] || 0) > rowIndex) column += 1;
      const span = positiveSpan(cell, 'colspan');
      const rowSpan = Math.min(positiveSpan(cell, 'rowspan'), elements.length - rowIndex);
      const text = cellText(cell);
      const header = cell.tagName === 'TH';
      const notation = Boolean(cell.querySelector('code')) || /^[\d\s.,+−\-:%xA-Fa-f]+$/.test(text);
      cells.push({ column, span, rowSpan, text, header, notation });
      for (let offset = 0; offset < span; offset += 1) {
        occupiedUntil[column + offset] = rowIndex + rowSpan;
      }
      column += span;
    }
    columnCount = Math.max(columnCount, column, occupiedUntil.length);
    rows.push(cells);
  }
  if (!columnCount || !rows.length) return null;

  const preferred = Array(columnCount).fill(4);
  const minimum = Array(columnCount).fill(4);
  for (const cells of rows) {
    for (const cell of cells) {
      const lines = cell.text.split('\n');
      const longest = Math.max(0, ...lines.map((line) => line.length));
      const longestWord = Math.max(0, ...cell.text.split(/\s+/).map((word) => word.length));
      const compact = cell.notation && longest <= 18 ? longest : Math.min(longestWord, 12);
      for (let offset = 0; offset < cell.span; offset += 1) {
        const index = cell.column + offset;
        preferred[index] = Math.max(preferred[index], Math.min(40, Math.ceil(longest / cell.span)));
        minimum[index] = Math.max(minimum[index], Math.ceil(compact / cell.span));
      }
    }
  }

  const preferredWidths = preferred.map((characters) => characters * CHARACTER_WIDTH + HORIZONTAL_PADDING * 2);
  const minimumWidths = minimum.map((characters) => characters * CHARACTER_WIDTH + HORIZONTAL_PADDING * 2);
  const preferredTotal = preferredWidths.reduce((sum, width) => sum + width, 0);
  const minimumTotal = minimumWidths.reduce((sum, width) => sum + width, 0);
  const available = MAX_WIDTH - 2;
  const scale = preferredTotal <= available ? 1
    : Math.max(0, (available - minimumTotal) / (preferredTotal - minimumTotal || 1));
  const widths = preferredWidths.map((width, index) => minimumTotal > available
    ? minimumWidths[index] * available / minimumTotal
    : minimumWidths[index] + (width - minimumWidths[index]) * scale);
  const xPositions = [1];
  for (const width of widths) xPositions.push(xPositions.at(-1)! + width);

  const rowHeights = rows.map(() => LINE_HEIGHT + VERTICAL_PADDING * 2);
  for (const [rowIndex, cells] of rows.entries()) {
    for (const cell of cells) {
      const width = xPositions[cell.column + cell.span] - xPositions[cell.column];
      const characters = Math.max(1, Math.floor((width - HORIZONTAL_PADDING * 2) / CHARACTER_WIDTH + 1e-6));
      cell.lines = wrap(cell.text, characters);
      const required = cell.lines!.length * LINE_HEIGHT + VERTICAL_PADDING * 2;
      if (cell.rowSpan === 1) rowHeights[rowIndex] = Math.max(rowHeights[rowIndex], required);
    }
  }
  for (const [rowIndex, cells] of rows.entries()) {
    for (const cell of cells.filter((candidate) => candidate.rowSpan > 1)) {
      const end = rowIndex + cell.rowSpan;
      const actual = rowHeights.slice(rowIndex, end).reduce((sum, height) => sum + height, 0);
      const required = cell.lines!.length * LINE_HEIGHT + VERTICAL_PADDING * 2;
      if (required > actual) rowHeights[end - 1] += required - actual;
    }
  }
  const yPositions = [1];
  for (const height of rowHeights) yPositions.push(yPositions.at(-1)! + height);
  const width = Math.ceil(xPositions.at(-1)! + 1);
  const height = Math.ceil(yPositions.at(-1)! + 1);
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Lesson table"><title>Lesson table</title>`];
  for (const [rowIndex, cells] of rows.entries()) {
    for (const cell of cells) {
      const x = xPositions[cell.column];
      const y = yPositions[rowIndex];
      const cellWidth = xPositions[cell.column + cell.span] - x;
      const cellHeight = yPositions[rowIndex + cell.rowSpan] - y;
      parts.push(`<rect x="${x.toFixed(2)}" y="${y}" width="${cellWidth.toFixed(2)}" height="${cellHeight}" fill="${cell.header ? '#e7eef4' : '#ffffff'}" stroke="#c8d3dd" stroke-width="0.65"/>`);
      for (const [lineIndex, line] of cell.lines!.entries()) {
        parts.push(`<text x="${(x + HORIZONTAL_PADDING).toFixed(2)}" y="${y + VERTICAL_PADDING + FONT_SIZE + lineIndex * LINE_HEIGHT}" fill="#1c2733" font-family="ui-monospace, SFMono-Regular, Consolas, monospace" font-size="${FONT_SIZE}" font-weight="${cell.header ? 700 : 400}">${xml(line)}</text>`);
      }
    }
  }
  parts.push('</svg>');
  return { svg: parts.join(''), width, height, alt: 'Lesson table' };
}
