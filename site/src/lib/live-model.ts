// Live calculators: a few inputs, a pure function from the inputs to one cell frame, and presets. Everything is a string
// so hexadecimal and 64-bit values survive; each lab parses what it needs and throws a short message when an input is
// not usable. The Astro component renders the default state on the server and the browser recomputes on every change.
import type { CellFrame } from './cell-model';

export type LiveInput =
  | { readonly kind: 'number'; readonly id: string; readonly label: string; readonly min: number; readonly max: number; readonly step?: number }
  | { readonly kind: 'hex'; readonly id: string; readonly label: string; readonly digits: number }
  | { readonly kind: 'choice'; readonly id: string; readonly label: string; readonly options: readonly { readonly value: string; readonly label: string }[] }
  | { readonly kind: 'bits'; readonly id: string; readonly label: string; readonly width: number };

export type LiveValues = Readonly<Record<string, string>>;

export interface LivePreset {
  readonly label: string;
  readonly values: LiveValues;
}

export interface LiveLab {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly inputs: readonly LiveInput[];
  readonly defaults: LiveValues;
  readonly presets?: readonly LivePreset[];
  /** Throws an Error with a short, reader-facing message when an input cannot be used. */
  compute(values: LiveValues): CellFrame;
}
