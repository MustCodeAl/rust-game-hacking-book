// Diagram data (CellFrames / FlowDiagram scenarios) for lessons in group C5. Import from the lesson MDX; keep each figure small.
// Colours: blue = data, orange = addresses and objects, green = accepted, red = refused or wrong, purple = rules,
// yellow = arithmetic, gray = unused.
import { cell as c, frame, hot as h, panel, row, type CellFrame, type CellScenario } from '../lib/cell-model';
import type { FlowScenario } from '../lib/flow-model';

/** Lesson 10.10 (pages/9/08.mdx): sealing the 19-byte GSAV save, then opening it untouched and tampered. */
const envelope = (changed: boolean): CellFrame['panels'][number] => panel('Envelope on disk, bytes 0 to 58', 'orange', [row('nonce, ciphertext, tag', [
  c('nonce', 'yellow', 24, { bracket: '24 bytes' }),
  changed ? h('ciphertext, 1 byte changed', 'red', 19, { bracket: '19 bytes' }) : c('ciphertext', 'blue', 19, { bracket: '19 bytes' }),
  c('tag', 'green', 16, { bracket: '16 bytes' }),
])]);
const opening = (ok: boolean): CellFrame['panels'][number] => panel('open, with the same key and context', 'purple', [
  row('Tag recomputed from the envelope', [h(ok ? 'equals the stored tag' : 'differs from the stored tag', ok ? 'green' : 'red', 6)]),
  row('open returns', [h(ok ? 'the 19 save bytes' : 'AuthenticationFailed, and no bytes', ok ? 'green' : 'red', 6)]),
]);
export const aeadEnvelopeCells: readonly CellScenario[] = [{
  id: 'seal-open', tab: 'Seal, then open',
  title: 'Seal the 19-byte save, then open it twice',
  summary: 'Sealing writes nonce, ciphertext and tag. Opening recomputes the tag before it returns a single byte.',
  frames: [
    frame('Seal: four inputs, one envelope', 'The envelope is 24 + 19 + 16 = 59 bytes, offsets 0 to 58. The key is not in it.', [
      panel('What seal takes', 'blue', [
        row('Save bytes (plaintext)', [c('47 53 41 56 … 4A 03 00 00', 'blue', 6, { sub: '19 bytes' })]),
        row('Secret key', [c('32 bytes, kept apart from the file', 'purple', 6)]),
        row('Nonce', [c('24 random bytes, new for every seal', 'yellow', 6)]),
        row('Context (associated data)', [c('save-slot:3|format:1', 'gray', 6, { sub: 'readable, but authenticated' })]),
      ]),
      envelope(false),
    ]),
    frame('Open the untouched envelope', 'The recomputed tag matches, so the save bytes come back.', [envelope(false), opening(true)]),
    frame('Open after one ciphertext byte changed', 'The recomputed tag no longer matches, so open refuses and returns none of the bytes.', [envelope(true), opening(false)]),
  ],
}];

/** Lesson 6.4 (pages/10/04.mdx): a handle value is a row in this process's handle table. */
const handleTable = (used: '0x12C' | '0x134' | null): CellFrame['panels'][number] => panel('This process’s handle table (kept by the kernel)', 'purple', [
  row('Handle 0x12C', [(used === '0x12C' ? h : c)('query, read', 'green', 2, { sub: 'rights' }), (used === '0x12C' ? h : c)('the game’s process object', 'orange', 3, { sub: 'points to' })]),
  row('Handle 0x134', [(used === '0x134' ? h : c)('query only', 'blue', 2, { sub: 'rights' }), (used === '0x134' ? h : c)('the same process object', 'orange', 3, { sub: 'points to' })]),
]);
export const handleTableCells: readonly CellScenario[] = [{
  id: 'two-handles', tab: 'Two handles',
  title: 'Two handles to one process, with different rights',
  summary: 'Windows looks a handle value up in the calling process’s table. The row holds the rights and points to the kernel object.',
  frames: [
    frame('ReadProcessMemory with handle 0x12C', 'Row 0x12C includes read, so the call reaches the game’s process object.', [
      handleTable('0x12C'), panel('Result', 'green', [row('ReadProcessMemory', [h('allowed', 'green', 5)])]),
    ]),
    frame('ReadProcessMemory with handle 0x134', 'Same process object, but row 0x134 holds query rights only, so the read is refused.', [
      handleTable('0x134'), panel('Result', 'red', [row('ReadProcessMemory', [h('access denied', 'red', 5)])]),
    ]),
    frame('Reading your own memory at address 0x12C', 'A handle value is not an address. The low 64 KiB of a process are never mapped, so this read faults instead of showing the object.', [
      handleTable(null), panel('Your process’s memory', 'red', [row('Address 0x12C', [h('nothing mapped: access violation', 'red', 5)])]),
    ]),
  ],
}];

/** Lesson 6.2 (pages/10/09.mdx): reading player base + 0x138 needs the right layout and a live object. */
const fieldAddress = (offset: string, sum: string, note: string): CellFrame['panels'][number] => panel('Read player base + offset', 'yellow', [row('Address arithmetic', [
  c('0x5000', 'orange', 2, { sub: 'player base' }), c(`+ ${offset}`, 'yellow', 2, { sub: note }), h(`= ${sum}`, 'orange', 2, { sub: 'address read' }),
])]);
export const fieldReadCells: readonly CellScenario[] = [{
  id: 'field-read', tab: 'One address, three outcomes',
  title: 'The same address arithmetic, three outcomes',
  summary: '0x5000 + 0x138 = 0x5138 every time. What sits there depends on the object’s lifetime and the build’s layout.',
  frames: [
    frame('Matching build, live player', 'The layout is right and the object is alive, so 0x5138 holds health.', [
      fieldAddress('0x138', '0x5138', 'health in this build'),
      panel('At 0x5000 right now', 'blue', [row('Object, then field', [c('Player, alive', 'green', 3), h('health = 100', 'green', 3)])]),
    ]),
    frame('The player was destroyed; its storage reused', 'Same address, different object: 0x5138 now belongs to a projectile.', [
      fieldAddress('0x138', '0x5138', 'health in this build'),
      panel('At 0x5000 right now', 'blue', [row('Object, then field', [c('Projectile', 'red', 3), h('a projectile field, not health', 'red', 3)])]),
    ]),
    frame('A new build moved health to +0x140', 'The object is right but the layout is not: in this build +0x138 holds another field.', [
      fieldAddress('0x138', '0x5138', 'the old build’s offset'),
      panel('At 0x5000 right now', 'blue', [row('Object, then field', [c('Player, alive', 'green', 3), h('armor, not health', 'red', 3)])]),
    ]),
  ],
}];

/** Lesson 12.3 (pages/11/03.mdx): look up an optional export, then call it through its declared type or take the fallback. */
const apiLanes = [{ id: 'tool', label: 'Tool', icon: 'computer' as const }, { id: 'loaded', label: 'Loaded modules', icon: 'layers' as const }, { id: 'exports', label: 'kernel32 exports', icon: 'plug' as const }] as const;
export const optionalApiFlows: readonly FlowScenario[] = [
  {
    id: 'present', tab: 'Export present',
    title: 'The export exists: type it, then call it',
    summary: 'GetProcAddress returns an address. The declared function type turns it into a call with the right ABI and arguments.',
    lanes: apiLanes,
    steps: [
      { from: 'tool', to: 'loaded', kind: 'request', label: 'GetModuleHandleW("kernel32.dll")', caption: 'kernel32.dll is already loaded in the tool’s process, so this borrows its handle without loading anything.' },
      { from: 'tool', to: 'exports', kind: 'request', label: 'GetProcAddress(module, "QueryFullProcessImageNameW")', caption: 'The name is looked up in kernel32’s export table.' },
      { from: 'exports', to: 'tool', kind: 'data', label: 'Some(address)', caption: 'The export exists, so an address comes back. So far it is only an address.' },
      { from: 'tool', to: 'tool', kind: 'local', label: 'transmute to the declared fn type', caption: 'The SDK declaration fixes the ABI, the four parameters and the BOOL result. Only now is the address callable.' },
      { from: 'tool', to: 'exports', kind: 'request', label: 'call(process, 0, buffer, &mut length)', caption: 'The call can still fail, for example on a handle without query rights, so its result is checked as usual.' },
    ],
  },
  {
    id: 'absent', tab: 'Export absent',
    title: 'The export is missing: take the planned fallback',
    summary: 'GetProcAddress finds no such name. The tool never calls an unknown address; it switches to the fallback it designed first.',
    lanes: apiLanes,
    steps: [
      { from: 'tool', to: 'loaded', kind: 'request', label: 'GetModuleHandleW("kernel32.dll")', caption: 'The same first step: borrow the loaded module’s handle.' },
      { from: 'tool', to: 'exports', kind: 'request', label: 'GetProcAddress(module, "QueryFullProcessImageNameW")', caption: 'The same lookup by name.' },
      { from: 'exports', to: 'tool', kind: 'response', label: 'None: no such export', caption: 'On this Windows build the name is not in the export table. That is a supported state, not a crash.' },
      { from: 'tool', to: 'tool', kind: 'local', label: 'use ImageNameSource::ToolHelpSnapshot', caption: 'The tool reads szExePath from a module snapshot instead, and labels the result with that source.' },
    ],
  },
];
