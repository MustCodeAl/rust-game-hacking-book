// State-frame diagrams: every step is one complete, colour-coded picture. A frame holds one or more titled panels
// (like "Sending side" / "Receiving side" or "Paging" / "Segmentation"); a panel holds rows of cells (bytes, registers,
// header fields, list items). A cell's `span` is a relative width, so a row can be a proportional memory strip; `hot`
// marks what changed in this step. Authoring helpers at the bottom keep the data files short.
import type { Hue } from './diagram-visual';

export interface Cell {
  readonly text: string;
  readonly hue?: Hue;
  /** Relative width inside the row (default 1). */
  readonly span?: number;
  /** True when this cell is what changed or is being used in this step. */
  readonly hot?: boolean;
  /** Smaller second line, such as an address or a unit. */
  readonly sub?: string;
  /** Size label drawn as a bracket under the cell, such as "841 bytes". */
  readonly bracket?: string;
  /** Hatched, dashed cell for bytes that are not backed by anything (a zero-filled tail, unused buffer). */
  readonly ghost?: boolean;
  /** An empty spacer with no box, used to offset a cell along the row. */
  readonly gap?: boolean;
  /** Draw as a small dot (a filled or an open circle) instead of a box, for counting pictures. */
  readonly dot?: 'filled' | 'open';
}

export interface CellRow {
  readonly label: string;
  readonly cells: readonly Cell[];
  /** Address or bit-number labels printed at the left and right end above the row. */
  readonly ticks?: { readonly left?: string; readonly right?: string };
  /** A short arrow label drawn above the row ("copy", "decode"), linking it to the row before. */
  readonly link?: string;
  /** Height as a multiple of a normal row, for tall memory regions. */
  readonly tall?: number;
}

export interface Panel {
  readonly title?: string;
  readonly hue?: Hue;
  readonly rows: readonly CellRow[];
}

export interface CellFrame {
  /** Short heading for the step. */
  readonly label: string;
  /** One or two sentences explaining what this frame shows. */
  readonly caption: string;
  readonly panels: readonly Panel[];
  readonly legend?: readonly { readonly hue: Hue; readonly text: string }[];
  /** Put the panels side by side when there is room (short panels that are compared); stacked otherwise. */
  readonly side?: boolean;
}

export interface CellScenario {
  readonly id: string;
  readonly tab: string;
  readonly title: string;
  readonly summary: string;
  readonly frames: readonly CellFrame[];
}

export function rowColumns(row: CellRow): number {
  return row.cells.reduce((sum, cell) => sum + (cell.span ?? 1), 0);
}

export function cellProblems(scenario: CellScenario): string[] {
  const problems: string[] = [];
  if (scenario.frames.length < 2) problems.push(`${scenario.id}: needs at least two frames`);
  scenario.frames.forEach((frame, index) => {
    const where = `${scenario.id} frame ${index + 1}`;
    if (frame.label.length > 64) problems.push(`${where}: label longer than 64 characters`);
    if (frame.panels.length < 1 || frame.panels.length > 3) problems.push(`${where}: needs one to three panels`);
    for (const panel of frame.panels) {
      if (panel.rows.length < 1 || panel.rows.length > 7) problems.push(`${where}: a panel needs one to seven rows`);
      for (const row of panel.rows) {
        if (row.cells.length < 1) problems.push(`${where}: row "${row.label}" has no cells`);
        if (rowColumns(row) > 160) problems.push(`${where}: row "${row.label}" is wider than 160 units`);
        for (const cell of row.cells) if ((cell.span ?? 1) < 1) problems.push(`${where}: cell "${cell.text}" has a span below 1`);
      }
    }
  });
  return problems;
}

type CellExtras = Partial<Pick<Cell, 'hot' | 'sub' | 'bracket' | 'ghost' | 'gap' | 'dot'>>;
/** An empty spacer of the given width. */
export const gap = (span = 1): Cell => ({ text: '', span, gap: true });

/** One cell: text, colour, relative width and optional extras. */
export const cell = (text: string, hue?: Hue, span = 1, extras: CellExtras = {}): Cell => ({ text, span, ...(hue ? { hue } : {}), ...extras });
/** A cell that changed or is in use in this step. */
export const hot = (text: string, hue?: Hue, span = 1, extras: CellExtras = {}): Cell => cell(text, hue, span, { ...extras, hot: true });
export const row = (label: string, cells: readonly Cell[], extras: Partial<Omit<CellRow, 'label' | 'cells'>> = {}): CellRow => ({ label, cells, ...extras });
export const panel = (title: string | undefined, hue: Hue | undefined, rows: readonly CellRow[]): Panel => ({ rows, ...(title ? { title } : {}), ...(hue ? { hue } : {}) });
/** A panel with no title, for frames that are just rows. */
export const plain = (...rows: CellRow[]): Panel => ({ rows });
export const frame = (label: string, caption: string, panels: readonly Panel[], options: Pick<CellFrame, 'legend' | 'side'> = {}): CellFrame => ({ label, caption, panels, ...options });
