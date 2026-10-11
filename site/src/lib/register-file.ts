/**
 * x86-64 general-purpose register A: one 64-bit value with five names.
 * Byte lane 0 is the least significant byte (AL); lane 7 is the most significant.
 * Pure model: no browser API.
 */
import { toHex } from './hex-field.ts';

export type RegisterName = 'RAX' | 'EAX' | 'AX' | 'AH' | 'AL';
export type LaneChange = 'written' | 'cleared' | 'kept';

export interface RegisterView {
  readonly name: RegisterName;
  /** Lower-case spelling used in an assembly instruction. */
  readonly asm: string;
  readonly bits: 64 | 32 | 16 | 8;
  /** Index of the least significant byte lane this name covers. */
  readonly firstLane: number;
  readonly lanes: number;
  readonly rule: string;
}

export const LANE_COUNT = 8;
export const MAX_RAX = (1n << 64n) - 1n;
/** Eight different bytes so every change is visible. */
export const START_VALUE = 0x1122334455667788n;

export const REGISTER_VIEWS: readonly RegisterView[] = [
  { name: 'RAX', asm: 'rax', bits: 64, firstLane: 0, lanes: 8, rule: 'Replaces all eight bytes.' },
  { name: 'EAX', asm: 'eax', bits: 32, firstLane: 0, lanes: 4, rule: 'Replaces bytes 3 to 0 and clears bytes 7 to 4 to zero. This is a real x86-64 rule: a 32-bit write always zero-extends into the full register.' },
  { name: 'AX', asm: 'ax', bits: 16, firstLane: 0, lanes: 2, rule: 'Replaces bytes 1 and 0. Bytes 7 to 2 keep their old values.' },
  { name: 'AH', asm: 'ah', bits: 8, firstLane: 1, lanes: 1, rule: 'Replaces byte 1 only. Every other byte keeps its old value.' },
  { name: 'AL', asm: 'al', bits: 8, firstLane: 0, lanes: 1, rule: 'Replaces byte 0 only. Every other byte keeps its old value.' },
];

export function viewOf(name: RegisterName): RegisterView {
  const view = REGISTER_VIEWS.find(candidate => candidate.name === name);
  if (!view) throw new RangeError(`Unknown register name ${name}.`);
  return view;
}

export function isRegisterName(text: string | undefined): text is RegisterName {
  return text === 'RAX' || text === 'EAX' || text === 'AX' || text === 'AH' || text === 'AL';
}

/** Hexadecimal digits a write to this name can hold. */
export function digitsOf(view: RegisterView): number {
  return view.bits / 4;
}

export function maxValueOf(view: RegisterView): bigint {
  return (1n << BigInt(view.bits)) - 1n;
}

/** Bit range text such as "bits 31 to 0". */
export function bitRange(view: RegisterView): string {
  const low = view.firstLane * 8;
  return `bits ${low + view.bits - 1} to ${low}`;
}

/** Byte lanes, least significant first: index 0 is AL. */
export function laneBytes(value: bigint): number[] {
  if (value < 0n || value > MAX_RAX) throw new RangeError('RAX holds an unsigned 64-bit value.');
  return Array.from({ length: LANE_COUNT }, (_, lane) => Number((value >> BigInt(lane * 8)) & 0xffn));
}

export interface LaneState {
  readonly lane: number;
  readonly before: number;
  readonly after: number;
  readonly change: LaneChange;
}

export interface WriteResult {
  readonly view: RegisterView;
  readonly value: bigint;
  readonly before: bigint;
  readonly after: bigint;
  readonly lanes: readonly LaneState[];
  readonly instruction: string;
}

/** What `mov <name>, value` does to the 64-bit register in 64-bit mode. */
export function writeRegister(before: bigint, name: RegisterName, value: bigint): WriteResult {
  const view = viewOf(name);
  if (value < 0n || value > maxValueOf(view)) throw new RangeError(`${view.name} holds ${view.bits} bits.`);
  const shift = BigInt(view.firstLane * 8);
  const field = maxValueOf(view) << shift;
  // A 32-bit destination is zero-extended; 16-bit and 8-bit destinations merge into the old value.
  const after = view.name === 'EAX' ? value : (before & ~field & MAX_RAX) | (value << shift);
  const oldBytes = laneBytes(before);
  const newBytes = laneBytes(after);
  const lanes: LaneState[] = oldBytes.map((old, lane) => {
    const inside = lane >= view.firstLane && lane < view.firstLane + view.lanes;
    const change: LaneChange = inside ? 'written' : view.name === 'EAX' ? 'cleared' : 'kept';
    return { lane, before: old, after: newBytes[lane] ?? 0, change };
  });
  return { view, value, before, after, lanes, instruction: instructionText(view, value) };
}

export function instructionText(view: RegisterView, value: bigint): string {
  return `mov ${view.asm}, 0x${toHex(value, digitsOf(view))}`;
}

export function registerHex(value: bigint): string {
  return `0x${toHex(value, 16)}`;
}

/** "bytes 7 to 2 and byte 0": consecutive lanes are grouped into runs, highest first. */
function laneList(lanes: readonly number[]): string {
  const sorted = [...lanes].sort((a, b) => b - a);
  const runs: { high: number; low: number }[] = [];
  for (const lane of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.low - 1 === lane) last.low = lane; else runs.push({ high: lane, low: lane });
  }
  if (runs.length === 0) return 'no bytes';
  return runs.map(run => (run.high === run.low ? `byte ${run.high}` : `bytes ${run.high} to ${run.low}`)).join(' and ');
}
const sentence = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const byteHex = (n: number): string => toHex(n, 2);
const verb = (count: number, singular: string, plural: string): string => (count === 1 ? singular : plural);

/** Which bytes were written, cleared or left alone, with the old and new bytes where the rule clears some. */
export function describeEffect(result: WriteResult): string {
  const written = result.lanes.filter(l => l.change === 'written');
  const cleared = result.lanes.filter(l => l.change === 'cleared');
  const kept = result.lanes.filter(l => l.change === 'kept');
  const parts = [`${sentence(laneList(written.map(l => l.lane)))} ${verb(written.length, 'was', 'were')} written.`];
  if (cleared.length > 0) {
    const ordered = [...cleared].sort((a, b) => b.lane - a.lane);
    parts.push(`${sentence(laneList(cleared.map(l => l.lane)))} were cleared by the zero-extension rule: ${ordered.map(l => byteHex(l.before)).join(' ')} became ${ordered.map(l => byteHex(l.after)).join(' ')}.`);
  }
  if (kept.length > 0) parts.push(`${sentence(laneList(kept.map(l => l.lane)))} ${verb(kept.length, 'was', 'were')} not touched.`);
  return parts.join(' ');
}

/** One plain-English paragraph for the whole write. */
export function describeWrite(result: WriteResult): string {
  return `${result.instruction} changes RAX from ${registerHex(result.before)} to ${registerHex(result.after)}. ${describeEffect(result)}`;
}

/** The default worked example used for the no-script text and the print view. */
export interface WorkedWrite { readonly name: RegisterName; readonly value: bigint }
export const WORKED_WRITES: readonly WorkedWrite[] = [
  { name: 'AL', value: 0xeen },
  { name: 'AH', value: 0xeen },
  { name: 'AX', value: 0xeeffn },
  { name: 'EAX', value: 0xaabbccddn },
  { name: 'RAX', value: 0x8899aabbccddeeffn },
];
