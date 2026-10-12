/**
 * Address translation teaching models: a 32-bit Windows address map, 4 KiB paging, and base-and-limit segmentation.
 * Pure functions with small fixed tables so every result can be checked by hand. No browser API.
 */
import { toHex } from './hex-field.ts';

// ---- Windows 32-bit process address map ----
export const FOUR_GIB = 0x1_0000_0000;
export const RESERVED_EDGE = 0x1_0000; // 64 KiB
export type SplitId = 'default' | '3gb' | 'wow64';
export type RegionKind = 'reserved' | 'user' | 'system';

export interface MapRegion {
  readonly id: string;
  readonly name: string;
  readonly kind: RegionKind;
  readonly start: number;
  /** Inclusive last address. */
  readonly end: number;
  readonly bytes: number;
  /** Share of the 4 GiB address space, 0 to 100. */
  readonly percent: number;
}

export interface SplitMode {
  readonly id: SplitId;
  readonly label: string;
  /** First address that is not user space; 0x100000000 means the whole 4 GiB is user space. */
  readonly splitAt: number;
  readonly note: string;
}

export const SPLITS: readonly SplitMode[] = [
  { id: 'default', label: 'Default: 2 GiB user, 2 GiB system', splitAt: 0x8000_0000, note: 'The ordinary 32-bit Windows layout.' },
  { id: '3gb', label: '4GT (/3GB) with a large-address-aware image: 3 GiB user, 1 GiB system', splitAt: 0xc000_0000, note: 'On 32-bit Windows booted with the 4-gigabyte-tuning option, a program built as large-address-aware may use 3 GiB.' },
  { id: 'wow64', label: '32-bit program on 64-bit Windows, large-address-aware: 4 GiB user', splitAt: FOUR_GIB, note: 'The 32-bit program sees all 4 GiB; the 64-bit kernel lives elsewhere, outside this 32-bit view.' },
];

export function splitOf(id: SplitId): SplitMode {
  const split = SPLITS.find(candidate => candidate.id === id);
  if (!split) throw new RangeError(`Unknown split ${id}.`);
  return split;
}

const region = (id: string, name: string, kind: RegionKind, start: number, end: number): MapRegion => {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= FOUR_GIB) throw new RangeError('A map region lies inside the 32-bit address space.');
  const bytes = end - start + 1;
  return { id, name, kind, start, end, bytes, percent: (bytes / FOUR_GIB) * 100 };
};

/** Regions from the lowest address up. The first and last 64 KiB of user space are reserved: GetSystemInfo reports
 *  0x00010000 as the lowest and the address before the final 64 KiB as the highest application address. */
export function addressMap(id: SplitId): readonly MapRegion[] {
  const { splitAt } = splitOf(id);
  const regions: MapRegion[] = [
    region('null', 'Reserved low 64 KiB', 'reserved', 0, RESERVED_EDGE - 1),
    region('user', 'User space', 'user', RESERVED_EDGE, splitAt - RESERVED_EDGE - 1),
    region('guard', 'Reserved top 64 KiB of user space', 'reserved', splitAt - RESERVED_EDGE, splitAt - 1),
  ];
  if (splitAt < FOUR_GIB) regions.push(region('system', 'System space', 'system', splitAt, FOUR_GIB - 1));
  return regions;
}

/** Exact size text: whole GiB, MiB or KiB when the byte count divides evenly, else the byte count. */
export function sizeText(bytes: number): string {
  if (!Number.isInteger(bytes) || bytes < 0) throw new RangeError('A size is a whole number of bytes.');
  const unit = (divisor: number, name: string): string | null => (bytes >= divisor && bytes % divisor === 0 ? `${(bytes / divisor).toLocaleString('en-US')} ${name}` : null);
  return unit(2 ** 30, 'GiB') ?? unit(2 ** 20, 'MiB') ?? unit(2 ** 10, 'KiB') ?? `${bytes.toLocaleString('en-US')} bytes`;
}

/** Exact when a unit divides the size evenly; otherwise "N GiB − M" from the nearest GiB, e.g. "2 GiB − 128 KiB". */
export function sizeNearText(bytes: number): string {
  const exact = sizeText(bytes);
  if (bytes < 2 ** 30 || bytes % 2 ** 10 === 0 && bytes % 2 ** 30 === 0) return exact;
  const gib = Math.round(bytes / 2 ** 30);
  const shortBy = gib * 2 ** 30 - bytes;
  return shortBy > 0 ? `${gib} GiB − ${sizeText(shortBy)}` : exact;
}

/** The subtraction that gives a region's size: "end − start + 1 = size". */
export function derivation(region: MapRegion): string {
  return `${addressHex(region.end)} − ${addressHex(region.start)} + 1 = ${region.bytes.toLocaleString('en-US')} bytes (${sizeNearText(region.bytes)})`;
}

export function addressHex(value: number): string {
  return `0x${toHex(value, 8)}`;
}

// ---- Paging: 8 pages of 4 KiB, a 15-bit logical address ----
export const PAGE_BITS = 12;
export const PAGE_SIZE = 1 << PAGE_BITS;
export const PAGE_COUNT = 8;
export const MAX_LOGICAL = PAGE_COUNT * PAGE_SIZE - 1; // 0x7FFF

export interface PageEntry { readonly page: number; readonly present: boolean; readonly frame: number }
/** Neighbouring pages are deliberately sent to unrelated frames; two pages are not present. */
export const PAGE_TABLE: readonly PageEntry[] = [
  { page: 0, present: true, frame: 0x0a2 },
  { page: 1, present: true, frame: 0x1f0 },
  { page: 2, present: false, frame: 0 },
  { page: 3, present: true, frame: 0x011 },
  { page: 4, present: true, frame: 0x1a0 },
  { page: 5, present: false, frame: 0 },
  { page: 6, present: true, frame: 0x0b7 },
  { page: 7, present: true, frame: 0x05c },
];

export type PagingResult =
  | { readonly kind: 'mapped'; readonly address: number; readonly page: number; readonly offset: number; readonly frame: number; readonly physical: number }
  | { readonly kind: 'fault'; readonly address: number; readonly page: number; readonly offset: number };

export function translatePage(address: number, table: readonly PageEntry[] = PAGE_TABLE): PagingResult {
  if (!Number.isInteger(address) || address < 0 || address > MAX_LOGICAL) throw new RangeError(`A logical address here is 0x0000 to 0x${toHex(MAX_LOGICAL, 4)}.`);
  const page = address >> PAGE_BITS;
  const offset = address & (PAGE_SIZE - 1);
  const entry = table.find(candidate => candidate.page === page);
  if (!entry || !entry.present) return { kind: 'fault', address, page, offset };
  return { kind: 'mapped', address, page, offset, frame: entry.frame, physical: entry.frame * PAGE_SIZE + offset };
}

// ---- Segmentation: base + inclusive limit ----
export interface SegmentEntry { readonly id: number; readonly name: string; readonly present: boolean; readonly base: number; /** Last valid offset. */ readonly limit: number }
export const SEGMENT_TABLE: readonly SegmentEntry[] = [
  { id: 0, name: 'code', present: true, base: 0x0040_0000, limit: 0x1fff },
  { id: 1, name: 'data', present: true, base: 0x0050_0000, limit: 0x0fff },
  { id: 2, name: 'stack', present: true, base: 0x0070_0000, limit: 0x2fff },
  { id: 3, name: 'unused', present: false, base: 0, limit: 0 },
];
export const MAX_OFFSET = 0xffff;

export type SegmentResult =
  | { readonly kind: 'ok'; readonly segment: number; readonly offset: number; readonly base: number; readonly limit: number; readonly linear: number }
  | { readonly kind: 'limit-trap'; readonly segment: number; readonly offset: number; readonly base: number; readonly limit: number }
  | { readonly kind: 'segment-trap'; readonly segment: number; readonly offset: number };

export function translateSegment(segment: number, offset: number, table: readonly SegmentEntry[] = SEGMENT_TABLE): SegmentResult {
  if (!Number.isInteger(segment) || segment < 0 || segment > 3) throw new RangeError('A segment number here is 0 to 3.');
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) throw new RangeError(`An offset here is 0x0000 to 0x${toHex(MAX_OFFSET, 4)}.`);
  const entry = table.find(candidate => candidate.id === segment);
  if (!entry || !entry.present) return { kind: 'segment-trap', segment, offset };
  if (offset > entry.limit) return { kind: 'limit-trap', segment, offset, base: entry.base, limit: entry.limit };
  return { kind: 'ok', segment, offset, base: entry.base, limit: entry.limit, linear: entry.base + offset };
}

/** The 15 address bits as the 3 page-number bits and the 12 offset bits. */
export function splitBits(address: number): { page: string; offset: string } {
  if (!Number.isInteger(address) || address < 0 || address > MAX_LOGICAL) throw new RangeError('The address must fit in 15 bits.');
  const bits = address.toString(2).padStart(15, '0');
  return { page: bits.slice(0, 3), offset: bits.slice(3) };
}

/** One-line outcome for the result box. */
export function pagingOutcome(result: PagingResult): string {
  return result.kind === 'mapped' ? `Physical address ${addressHex(result.physical)}` : `Page fault: page ${result.page} is not present`;
}
export function segmentOutcome(result: SegmentResult): string {
  if (result.kind === 'ok') return `Linear address ${addressHex(result.linear)}`;
  if (result.kind === 'limit-trap') return `Trap: offset 0x${toHex(result.offset, 4)} is past the limit 0x${toHex(result.limit, 4)}`;
  return `Trap: segment ${result.segment} is not in use`;
}

/** Worked, step-by-step wording for the paging result. */
export function pagingSteps(result: PagingResult): string[] {
  const split = `1. Split 0x${toHex(result.address, 4)} into a 3-bit page number and a 12-bit offset: page ${result.page} (the top bits), offset 0x${toHex(result.offset, 3)} (the low 12 bits).`;
  if (result.kind === 'fault') return [split, `2. Look at row ${result.page} of the page table: the present bit is 0.`, `3. The page is not present, so the CPU raises a page fault. No physical address is formed.`];
  return [split, `2. Row ${result.page} of the page table: present bit 1, frame 0x${toHex(result.frame, 3)}.`, `3. Physical address = frame 0x${toHex(result.frame, 3)} × 0x1000 + offset 0x${toHex(result.offset, 3)} = ${addressHex(result.physical)}.`];
}

export function segmentSteps(result: SegmentResult): string[] {
  if (result.kind === 'segment-trap') return [`1. Segment ${result.segment} has no valid table row.`, '2. The CPU traps before any address is formed.'];
  const look = `1. Row ${result.segment} of the segment table: base ${addressHex(result.base)}, limit 0x${toHex(result.limit, 4)} (the last valid offset).`;
  if (result.kind === 'limit-trap') return [look, `2. Check: offset 0x${toHex(result.offset, 4)} is greater than limit 0x${toHex(result.limit, 4)}, so the check fails.`, '3. The CPU traps. The base is never added.'];
  return [look, `2. Check: offset 0x${toHex(result.offset, 4)} is not greater than limit 0x${toHex(result.limit, 4)}, so the check passes.`, `3. Linear address = base ${addressHex(result.base)} + offset 0x${toHex(result.offset, 4)} = ${addressHex(result.linear)}.`];
}
