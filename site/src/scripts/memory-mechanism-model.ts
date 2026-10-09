/** Pure, bounded teaching models. No native code, process memory, or browser API. */
export type MemoryKind = 'cdecl' | 'translation';
export interface StackInput { parameter: number; initialEsp: number }
export interface TranslationInput { address: number; frame: number; limit: number; present: boolean }
export type MemoryInput = StackInput | TranslationInput;
export interface Fact { name: string; value: string }
export interface Slot { key: string; address: number; label: string; value: string; active: boolean; written: boolean }
export interface Transfer { from: string; to: string; value: string }
interface FrameBase { line: string; description: string; facts: Fact[]; transfers: Transfer[] }
export interface StackFrame extends FrameBase {
  kind: 'cdecl'; esp: number; ebp: number; eax: number | null; eip: number | null;
  parameter: number; slots: Slot[];
}
export interface TranslationFrame extends FrameBase {
  kind: 'translation'; address: number; limit: number; page: number; offset: number;
  frameBase: number; present: boolean; segmentPass: boolean;
  linear: number | null; physical: number | null; phase: number;
}
export type MemoryFrame = StackFrame | TranslationFrame;
export const STACK_DEFAULT: Readonly<StackInput> = { parameter: 21, initialEsp: 0x0012ff90 };
export const TRANSLATION_DEFAULT: Readonly<TranslationInput> = { address: 0x1234, frame: 416, limit: 0x1fff, present: true };
export const SEGMENT_BASE = 0x00400000;
export const RETURN_ADDRESS = 0x00401025;
export const hex = (n: number): string => `0x${n.toString(16).toUpperCase().padStart(8, '0')}`;
const bounded = (n: number, min: number, max: number): boolean => Number.isInteger(n) && n >= min && n <= max;

export function stackFrames(input: StackInput): StackFrame[] {
  if (!bounded(input.parameter, 0, 255) || !bounded(input.initialEsp, 0x0012ff00, 0x00130000) || input.initialEsp % 4 !== 0) {
    throw new RangeError('Parameter must be 0–255; starting ESP must be aligned within the displayed range.');
  }
  const top = input.initialEsp;
  const oldEbp = top + 0x30;
  let esp = top, ebp = oldEbp, eax: number | null = null, eip: number | null = null;
  const memory = new Map<number, string>();
  const positions = [
    { address: top - 4, label: 'caller argument', node: 'argument' },
    { address: top - 8, label: 'saved return address', node: 'return' },
    { address: top - 12, label: 'saved EBP', node: 'saved-ebp' },
    ...[16, 20, 24, 28].map(n => ({ address: top - n, label: 'reserved local word', node: `local-${n}` })),
  ];
  const frames: StackFrame[] = [];
  const record = (line: string, description: string, transfers: Transfer[] = []): void => {
    frames.push({ kind: 'cdecl', line, description, transfers, esp, ebp, eax, eip, parameter: input.parameter,
      facts: [{ name: 'ESP', value: hex(esp) }, { name: 'EBP', value: hex(ebp) },
        { name: 'EAX', value: eax === null ? 'not set by this call' : `${eax} (${hex(eax)})` },
        { name: 'EIP after return', value: eip === null ? 'callee has not returned' : hex(eip) }],
      slots: positions.map(p => ({ key: p.node, address: p.address, label: p.label, value: memory.get(p.address) ?? 'not written yet',
        written: memory.has(p.address), active: memory.has(p.address) && p.address >= esp && p.address < top })),
    });
  };
  record('before the caller pushes its argument', `ESP begins at ${hex(top)}. The old EBP is ${hex(oldEbp)}.`);
  esp -= 4; memory.set(esp, `${input.parameter}`);
  record('push argument', `The caller reserves four bytes at ${hex(esp)} and writes argument ${input.parameter}.`, [{ from: 'parameter', to: 'argument', value: `${input.parameter}` }]);
  esp -= 4; memory.set(esp, hex(RETURN_ADDRESS));
  record('call helper  ; five-byte call at 0x00401020', `CALL saves ${hex(RETURN_ADDRESS)} at ${hex(esp)} before entering the helper.`, [{ from: 'next-eip', to: 'return', value: hex(RETURN_ADDRESS) }]);
  esp -= 4; memory.set(esp, hex(ebp));
  record('push ebp', `Save the caller's EBP at ${hex(esp)}.`, [{ from: 'ebp', to: 'saved-ebp', value: hex(ebp) }]);
  ebp = esp;
  record('mov ebp, esp', `EBP now anchors the frame at ${hex(ebp)}. Its argument is at EBP + 8.`, [{ from: 'esp', to: 'ebp', value: hex(ebp) }]);
  esp -= 0x10;
  for (let address = esp; address < ebp; address += 4) memory.set(address, 'uninitialized');
  record('sub esp, 0x10', `Reserve sixteen local bytes. ESP is ${hex(esp)}; no local value has been initialized.`);
  eax = input.parameter;
  record('mov eax, [ebp+8]', `Read argument ${input.parameter} from ${hex(ebp + 8)} into EAX.`, [{ from: 'argument', to: 'eax', value: `${input.parameter}` }]);
  eax += 7;
  record('add eax, 7', `The helper computes ${input.parameter} + 7 = ${eax}. EAX carries the result.`);
  esp = ebp;
  record('mov esp, ebp', `Release local stack space by restoring ESP to ${hex(esp)}. Old bytes need not be erased.`);
  ebp = oldEbp; esp += 4;
  record('pop ebp', `Restore EBP to ${hex(ebp)}. ESP now points at the return-address slot ${hex(esp)}.`, [{ from: 'saved-ebp', to: 'ebp', value: hex(ebp) }]);
  eip = RETURN_ADDRESS; esp += 4;
  record('ret', `Return to ${hex(eip)}. The caller's argument is still on the stack at ${hex(esp)}.`, [{ from: 'return', to: 'next-eip', value: hex(eip) }]);
  esp += 4;
  record('add esp, 4  ; caller cleanup', `The cdecl caller releases its four-byte argument. ESP is back at ${hex(top)}; EAX remains ${eax}.`);
  return frames;
}

export function translationFrames(input: TranslationInput): TranslationFrame[] {
  if (!bounded(input.address, 0, 0xffff) || !bounded(input.limit, 0, 0xffff) || !bounded(input.frame, 0, 4095) || typeof input.present !== 'boolean') {
    throw new RangeError('Address and inclusive limit must be 0x0000–0xFFFF; physical frame must be 0–4095.');
  }
  const page = Math.floor(input.address / 0x1000), offset = input.address % 0x1000;
  const frameBase = input.frame * 0x1000, segmentPass = input.address <= input.limit;
  const linear = segmentPass ? SEGMENT_BASE + input.address : null;
  const physical = input.present ? frameBase + offset : null;
  const lines = ['choose the input', 'check the limit and split the page', 'read the selected page entry', 'form each result'];
  return lines.map((line, phase) => ({ kind: 'translation', line, phase, address: input.address, limit: input.limit,
    page, offset, frameBase, present: input.present, segmentPass,
    linear: phase === 3 ? linear : null, physical: phase === 3 ? physical : null,
    description: phase === 0 ? `Use ${hex(input.address)} as a segment offset in one example and a virtual address in the other.`
      : phase === 1 ? `Offset ${hex(input.address)} ${segmentPass ? 'passes' : 'exceeds'} limit ${hex(input.limit)}. Paging splits it into page ${page} and offset ${hex(offset)}.`
      : phase === 2 ? `The entry for virtual page ${page} is ${input.present ? `present and selects frame ${input.frame}` : 'absent: this paging model faults'}.`
      : `Segment: ${linear === null ? 'limit fault' : hex(linear)}. Paging: ${physical === null ? 'not-present page fault' : hex(physical)}. These are independent address examples.`,
    facts: [{ name: 'Segment offset / virtual address', value: hex(input.address) }, { name: 'Virtual page and offset', value: `${page} / ${hex(offset)}` },
      { name: 'Segment result', value: phase < 3 ? 'not formed yet' : linear === null ? 'limit fault' : hex(linear) },
      { name: 'Physical result', value: phase < 3 ? 'not formed yet' : physical === null ? 'not-present page fault' : hex(physical) }],
    transfers: phase === 1 ? [{ from: 'input', to: 'split', value: `${page} | ${offset.toString(16).toUpperCase()}` }]
      : phase === 2 ? [{ from: 'split', to: 'entry', value: input.present ? `${input.frame}` : 'absent' }]
      : phase === 3 && physical !== null ? [{ from: 'entry', to: 'physical', value: hex(physical) }] : [],
  }));
}

export function makeFrames(kind: MemoryKind, input: MemoryInput): MemoryFrame[] {
  if (kind === 'cdecl' && 'parameter' in input) return stackFrames(input);
  if (kind === 'translation' && 'address' in input) return translationFrames(input);
  throw new TypeError('Mechanism and input must match.');
}
export function defaultInput(kind: MemoryKind): MemoryInput {
  return kind === 'cdecl' ? { ...STACK_DEFAULT } : { ...TRANSLATION_DEFAULT };
}
const escapeHtml = (s: string): string => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const node = (key: string, label: string, value: string, state = 'done'): string => `<div class="memory-mechanism__node" data-memory-node="${key}" data-state="${state}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;

/** Markup contains only escaped model text, so SSR and client show the same facts. */
export function boardMarkup(frame: MemoryFrame): string {
  if (frame.kind === 'cdecl') {
    return `<div class="memory-mechanism__registers">${node('parameter', 'argument', `${frame.parameter}`)}${node('esp', 'ESP', hex(frame.esp))}${node('ebp', 'EBP', hex(frame.ebp))}${node('eax', 'EAX result', frame.eax === null ? 'not set' : `${frame.eax}`)}${node('next-eip', 'resume address', hex(RETURN_ADDRESS))}</div>
      <div class="memory-mechanism__stack" aria-label="Stack slots, higher addresses first">${frame.slots.map(slot => `<div class="memory-mechanism__slot" data-memory-node="${slot.key}" data-state="${slot.active ? 'active' : slot.written ? 'released' : 'pending'}"><span class="memory-mechanism__pointer">${slot.address === frame.esp ? 'ESP →' : slot.address === frame.ebp ? 'EBP →' : ''}</span><code>${hex(slot.address)}</code><span>${escapeHtml(slot.label)}</span><strong>${escapeHtml(slot.value)}</strong></div>`).join('')}</div>
      <p class="memory-mechanism__legend">Outlined slots are live. Released slots show possible leftover bytes, not live objects. Reserved local values are uninitialized.</p>`;
  }
  const pass = frame.phase >= 1 ? frame.segmentPass ? 'done' : 'fault' : 'pending';
  return `${node('input', 'number supplied to each example', hex(frame.address))}<div class="memory-mechanism__routes"><div><h4>Conceptual segment</h4>${node('limit', `inclusive limit ${hex(frame.limit)}`, frame.phase < 1 ? 'unchecked' : frame.segmentPass ? 'offset fits' : 'limit fault', pass)}<span class="memory-mechanism__arrow" aria-hidden="true">${pass === 'fault' ? '×' : '↓'}</span>${node('linear', `base ${hex(SEGMENT_BASE)} + offset`, frame.phase < 3 ? 'not formed yet' : frame.linear === null ? 'no linear result' : hex(frame.linear), frame.phase < 3 ? 'pending' : pass)}</div><div><h4>4 KiB paging</h4>${node('split', 'page | byte offset', frame.phase < 1 ? 'not split yet' : `${frame.page} | ${hex(frame.offset)}`, frame.phase < 1 ? 'pending' : 'done')}<span class="memory-mechanism__arrow" aria-hidden="true">↓</span>${node('entry', 'selected page-table entry', frame.phase < 2 ? 'not read yet' : frame.present ? `frame base ${hex(frame.frameBase)}` : 'not present', frame.phase < 2 ? 'pending' : frame.present ? 'done' : 'fault')}<span class="memory-mechanism__arrow" aria-hidden="true">${frame.phase >= 2 && !frame.present ? '×' : '↓'}</span>${node('physical', 'frame base + byte offset', frame.phase < 3 ? 'not formed yet' : frame.physical === null ? 'page fault' : hex(frame.physical), frame.phase < 3 ? 'pending' : frame.present ? 'done' : 'fault')}</div></div>`;
}

export function referenceCode(kind: MemoryKind): string {
  return kind === 'cdecl' ? ['caller: push argument', '        call helper  ; at 0x00401020, next EIP 0x00401025', '        add esp, 4   ; cdecl caller releases argument', 'helper: push ebp', '        mov ebp, esp', '        sub esp, 0x10', '        mov eax, [ebp+8]', '        add eax, 7', '        mov esp, ebp', '        pop ebp', '        ret'].join('\n')
    : ['segment: if offset > inclusive_limit, fault', '         otherwise linear = base + offset', 'paging:  virtual_page = floor(address / 4096)', '         byte_offset = address % 4096', '         if selected entry is absent, fault', '         otherwise physical = frame * 4096 + byte_offset'].join('\n');
}
