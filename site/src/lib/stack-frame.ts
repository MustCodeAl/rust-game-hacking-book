/**
 * One 32-bit near call with no arguments, step by step, and what an out-of-range write to a local buffer could reach.
 * Every address is derived from the starting ESP, the call length and the instruction lengths. Pure model: no browser API.
 */
import { toHex } from './hex-field.ts';

export const CALLER_ESP = 0x0012ff90;
export const CALLER_EBP = 0x0012ffc0;
export const CALL_SITE = 0x00401020;
/** E8 rel32: one opcode byte and a four-byte displacement. */
export const CALL_LENGTH = 5;
export const RETURN_ADDRESS = CALL_SITE + CALL_LENGTH; // 0x00401025
export const CALLEE = 0x00401100;
/** rel32 is measured from the end of the call: 0x00401100 - 0x00401025 = 0xDB. */
export const CALL_DISPLACEMENT = CALLEE - RETURN_ADDRESS;
export const LOCAL_BYTES = 0x10;
/** The part of the function we do not show: ten bytes after `sub esp, 0x10`. */
export const BODY_LENGTH = 0x0a;
export const WORD = 4;

export const hex8 = (value: number): string => toHex(value, 8);

export interface ListingLine { readonly address: number; readonly bytes: string; readonly text: string; readonly note: string }

/** The instructions involved, with addresses derived from their lengths. */
export function listing(): readonly ListingLine[] {
  const pushEbp = CALLEE; // 55: one byte
  const movEbpEsp = pushEbp + 1; // 8B EC: two bytes
  const subEsp = movEbpEsp + 2; // 83 EC 10: three bytes
  const body = subEsp + 3;
  const leave = body + BODY_LENGTH; // C9: one byte
  const ret = leave + 1; // C3: one byte
  return [
    { address: CALL_SITE, bytes: `E8 ${toHex(CALL_DISPLACEMENT & 0xff, 2)} 00 00 00`, text: `call 0x${hex8(CALLEE)}`, note: 'in the caller' },
    { address: RETURN_ADDRESS, bytes: '', text: '(the next caller instruction)', note: 'the return address points here' },
    { address: pushEbp, bytes: '55', text: 'push ebp', note: 'callee start' },
    { address: movEbpEsp, bytes: '8B EC', text: 'mov ebp, esp', note: '' },
    { address: subEsp, bytes: '83 EC 10', text: `sub esp, 0x${toHex(LOCAL_BYTES, 2)}`, note: '' },
    { address: body, bytes: '', text: `(function body, ${BODY_LENGTH} bytes, not shown)`, note: '' },
    { address: leave, bytes: 'C9', text: 'leave', note: '' },
    { address: ret, bytes: 'C3', text: 'ret', note: '' },
  ];
}

export type SlotRole = 'caller' | 'return' | 'saved-ebp' | 'local' | 'free';
export type Fill = 'empty' | 'live' | 'released';
export type Register = 'ESP' | 'EBP' | 'EIP';

export interface SlotInfo { readonly address: number; readonly role: SlotRole; readonly label: string }
/** Four-byte words from the caller down to the first word below the frame. */
export const SLOTS: readonly SlotInfo[] = [
  { address: CALLER_ESP, role: 'caller', label: 'caller’s last pushed word (ESP pointed here before the call)' },
  { address: CALLER_ESP - 4, role: 'return', label: 'return address' },
  { address: CALLER_ESP - 8, role: 'saved-ebp', label: 'saved EBP (the caller’s)' },
  { address: CALLER_ESP - 12, role: 'local', label: 'local, [ebp-4]' },
  { address: CALLER_ESP - 16, role: 'local', label: 'local, [ebp-8]' },
  { address: CALLER_ESP - 20, role: 'local', label: 'local, [ebp-0xC]' },
  { address: CALLER_ESP - 24, role: 'local', label: 'local, [ebp-0x10]' },
  { address: CALLER_ESP - 28, role: 'free', label: 'below the frame: not in use' },
];

export interface SlotView extends SlotInfo {
  readonly value: string;
  readonly fill: Fill;
  readonly marks: readonly ('ESP' | 'EBP')[];
}

export interface FrameState {
  readonly index: number;
  /** Short name of what ran. */
  readonly instruction: string;
  readonly esp: number;
  readonly ebp: number;
  readonly eip: number;
  readonly changed: readonly Register[];
  readonly slots: readonly SlotView[];
  readonly explanation: string;
}

/** The state shown when no single step is selected: the frame at its fullest, while the function body runs. */
export const PEAK_STATE = 5;

export function frameStates(): readonly FrameState[] {
  const states: FrameState[] = [];
  const memory = new Map<number, string>();
  let esp = CALLER_ESP, ebp = CALLER_EBP, eip = CALL_SITE;
  const lines = listing();
  const at = (text: string): number => {
    const line = lines.find(candidate => candidate.text.startsWith(text));
    if (!line) throw new Error(`Listing has no line for ${text}.`);
    return line.address;
  };
  const record = (instruction: string, changed: readonly Register[], explanation: string): void => {
    const slots = SLOTS.map((slot): SlotView => {
      const written = memory.get(slot.address);
      const value = slot.role === 'caller' ? 'caller data' : written ?? '—';
      const fill: Fill = slot.role === 'caller' ? 'live' : written === undefined ? 'empty' : slot.address >= esp ? 'live' : 'released';
      const marks: ('ESP' | 'EBP')[] = [];
      if (slot.address === esp) marks.push('ESP');
      if (slot.address === ebp) marks.push('EBP');
      return { ...slot, value, fill, marks };
    });
    states.push({ index: states.length, instruction, esp, ebp, eip, changed, slots, explanation });
  };
  record('before the call', [], `ESP is 0x${hex8(esp)}, the caller’s last pushed word. EBP is 0x${hex8(ebp)}, the caller’s frame base. EIP is 0x${hex8(eip)}, the call instruction.`);

  const returnAddress = eip + CALL_LENGTH;
  esp -= WORD; memory.set(esp, hex8(returnAddress)); eip = CALLEE;
  record(`call 0x${hex8(CALLEE)}`, ['ESP', 'EIP'], `The return address is the next instruction: 0x${hex8(CALL_SITE)} + ${CALL_LENGTH} = 0x${hex8(returnAddress)}. call pushes it: ESP = 0x${hex8(esp + WORD)} − 4 = 0x${hex8(esp)}, and 0x${hex8(returnAddress)} is stored there. EIP becomes the call target 0x${hex8(CALLEE)} (displacement 0x${toHex(CALL_DISPLACEMENT, 2)} from the end of the call).`);

  esp -= WORD; memory.set(esp, hex8(ebp)); eip = at('mov ebp, esp');
  record('push ebp', ['ESP', 'EIP'], `ESP = 0x${hex8(esp + WORD)} − 4 = 0x${hex8(esp)}. The caller’s EBP, 0x${hex8(ebp)}, is stored there so it can be restored later.`);

  ebp = esp; eip = at('sub esp');
  record('mov ebp, esp', ['EBP', 'EIP'], `EBP = ESP = 0x${hex8(ebp)}. From now on [ebp+4] = 0x${hex8(ebp + 4)} is the return address and locals live below EBP.`);

  esp -= LOCAL_BYTES; eip = at('(function body');
  for (let address = esp; address < ebp; address += WORD) memory.set(address, 'not initialised');
  record(`sub esp, 0x${toHex(LOCAL_BYTES, 2)}`, ['ESP', 'EIP'], `ESP = 0x${hex8(ebp)} − 0x${toHex(LOCAL_BYTES, 2)} = 0x${hex8(esp)}. The sixteen bytes from 0x${hex8(esp)} to 0x${hex8(ebp - 1)} are reserved for locals; nothing has initialised them.`);

  eip = at('leave');
  record('function body runs', ['EIP'], `The body uses the locals at [ebp-0x10] to [ebp-1]. ESP and EBP stay put. EIP moves on ${BODY_LENGTH} bytes, from 0x${hex8(at('(function body'))} to 0x${hex8(eip)}, where leave is.`);

  const afterMov = ebp;
  const savedEbp = Number.parseInt(memory.get(ebp) ?? '', 16);
  esp = afterMov; ebp = savedEbp; esp += WORD; eip = at('ret');
  record('leave', ['ESP', 'EBP', 'EIP'], `leave is mov esp, ebp (ESP = 0x${hex8(afterMov)}) followed by pop ebp: EBP = the word at 0x${hex8(afterMov)} = 0x${hex8(ebp)}, then ESP = 0x${hex8(afterMov)} + 4 = 0x${hex8(esp)}. The locals are released; their bytes are not erased.`);

  const popped = Number.parseInt(memory.get(esp) ?? '', 16);
  eip = popped; esp += WORD;
  record('ret', ['ESP', 'EIP'], `ret pops the return address: EIP = the word at 0x${hex8(esp - WORD)} = 0x${hex8(eip)}, then ESP = 0x${hex8(esp - WORD)} + 4 = 0x${hex8(esp)}. Execution resumes right after the call.`);
  return states;
}

// ---- What an out-of-range write to a local buffer can reach ----
export const BUFFER_BYTES = 8;
export const MAX_WRITTEN = 24;
export type ReachRole = 'caller' | 'return' | 'saved-ebp' | 'cookie' | 'buffer' | 'local';

export interface ReachRow {
  readonly address: number;
  readonly role: ReachRole;
  readonly label: string;
  /** How many of this word's four bytes the write touched. */
  readonly bytesHit: number;
}

export interface Reach {
  readonly written: number;
  readonly cookie: boolean;
  readonly bufferStart: number;
  readonly rows: readonly ReachRow[];
  /** Role of the first word past the buffer that the write touched, or null while it stays inside. */
  readonly firstDamaged: ReachRole | null;
  /** With a stack cookie, the check before ret notices damage that crosses the cookie. */
  readonly detected: boolean;
  readonly verdict: string;
}

/** Writes begin at the lowest buffer byte and go upward. With a cookie, it sits between the buffer and the saved EBP. */
export function overflowReach(written: number, cookie: boolean): Reach {
  if (!Number.isInteger(written) || written < 0 || written > MAX_WRITTEN) throw new RangeError(`Bytes written is 0 to ${MAX_WRITTEN}.`);
  const frameBase = CALLER_ESP - 8; // 0x0012FF88: where EBP points
  const bufferStart = cookie ? frameBase - 4 - BUFFER_BYTES : frameBase - BUFFER_BYTES;
  const hit = (address: number): number => {
    const first = Math.max(address, bufferStart), last = Math.min(address + WORD - 1, bufferStart + written - 1);
    return Math.max(0, last - first + 1);
  };
  const layout: { address: number; role: ReachRole; label: string }[] = [
    { address: CALLER_ESP + 4, role: 'caller', label: 'caller’s data' },
    { address: CALLER_ESP, role: 'caller', label: 'caller’s data' },
    { address: CALLER_ESP - 4, role: 'return', label: 'return address' },
    { address: CALLER_ESP - 8, role: 'saved-ebp', label: 'saved EBP' },
    cookie ? { address: CALLER_ESP - 12, role: 'cookie', label: 'stack cookie' } : { address: CALLER_ESP - 12, role: 'buffer', label: 'buffer, bytes 5 to 8' },
    cookie ? { address: CALLER_ESP - 16, role: 'buffer', label: 'buffer, bytes 5 to 8' } : { address: CALLER_ESP - 16, role: 'buffer', label: 'buffer, bytes 1 to 4' },
    cookie ? { address: CALLER_ESP - 20, role: 'buffer', label: 'buffer, bytes 1 to 4' } : { address: CALLER_ESP - 20, role: 'local', label: 'another local' },
    { address: CALLER_ESP - 24, role: 'local', label: 'another local' },
  ];
  const rows = layout.map(row => ({ ...row, bytesHit: hit(row.address) }));
  const beyond = rows.filter(row => row.role !== 'buffer' && row.role !== 'local' && row.bytesHit > 0);
  const order: ReachRole[] = cookie ? ['cookie', 'saved-ebp', 'return', 'caller'] : ['saved-ebp', 'return', 'caller'];
  const firstDamaged = order.find(role => beyond.some(row => row.role === role)) ?? null;
  const farthest = [...order].reverse().find(role => beyond.some(row => row.role === role)) ?? null;
  const over = written - BUFFER_BYTES;
  const plural = (n: number): string => `${n} byte${n === 1 ? '' : 's'}`;
  let verdict: string;
  if (written === 0) verdict = 'Nothing has been written yet.';
  else if (over <= 0) verdict = `All ${plural(written)} land inside the ${BUFFER_BYTES}-byte buffer. Nothing outside it changes.`;
  else if (cookie && farthest === 'cookie') {
    verdict = `${plural(over)} went past the buffer and damaged the stack cookie. Before returning, the function compares the cookie with its secret copy, sees the mismatch and stops the program instead of running ret.`;
  } else if (cookie) {
    verdict = `The write crossed the stack cookie on its way to the ${farthest === 'saved-ebp' ? 'saved EBP' : 'saved EBP and the return address'}. The check before ret fails first, so the program stops before it uses any damaged value.`;
  } else if (farthest === 'saved-ebp') {
    verdict = `${plural(over)} went past the buffer into the saved EBP. The caller\u2019s frame pointer is damaged, so after the function returns the caller works from a wrong EBP.`;
  } else if (farthest === 'return') {
    verdict = `${plural(over)} went past the buffer: the first 4 damaged the saved EBP and ${plural(over - 4)} reached the return address. When the function runs ret, the CPU loads EIP from those bytes, so the function returns wherever the written data says. This is the classic stack buffer overflow bug.`;
  } else {
    verdict = 'The write ran past the whole frame, damaging the saved EBP, the return address and the caller\u2019s data.';
  }
  return { written, cookie, bufferStart, rows, firstDamaged, detected: cookie && over > 0, verdict };
}
