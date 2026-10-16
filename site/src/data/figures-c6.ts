// Diagram data (CellFrames / FlowDiagram scenarios) for lessons in group C6. Import from the lesson MDX; keep each figure small:
// two or three frames, one untitled panel and one or two rows per frame, short lane names.
// Colours: blue = data, orange = addresses and keys, green = accepted or kept, red = refused or reclaimed, purple = rules and
// control, yellow = arithmetic or a warning, teal = a second copy or party, gray = unused.
import { cell as c, frame, gap, hot as h, panel, row, type Cell, type CellScenario } from '../lib/cell-model';
import type { FlowScenario } from '../lib/flow-model';

/** Lesson 11.3 (pages/12/02.mdx): one table, two numbered keys and one named key. */
export const luaTableKeysCells: readonly CellScenario[] = [{
  id: 'table-keys', tab: 'Keys and values',
  title: 'local bag = { "sword", "shield", gold = 25 }',
  summary: 'One table, three key–value pairs.',
  frames: [
    frame('Every entry is a key and a value', 'Lua gave the listed items the keys 1 and 2. "gold" is just another key.', [
      panel(undefined, 'blue', [row('Key → value', [h('1', 'orange', 2, { sub: '"sword"' }), h('2', 'orange', 2, { sub: '"shield"' }), h('"gold"', 'purple', 2, { sub: '25' })])]),
    ]),
    frame('ipairs and # use only the keys 1, 2, 3, …', 'ipairs stops at the missing key 3 and never sees "gold"; #bag is 2.', [
      panel(undefined, 'green', [row('Key', [h('1', 'green', 2, { sub: 'visited' }), h('2', 'green', 2, { sub: 'visited' }), c('3', 'gray', 2, { ghost: true, sub: 'missing: stop' }), c('"gold"', 'gray', 2, { ghost: true, sub: 'skipped' })])]),
    ]),
  ],
}];

/** Lesson 11.10 (pages/12/08.mdx): mark from the roots, then sweep what was not reached. */
const heapObjects = ['P', 's', 'f', 'A', 'B'] as const;
export const markSweepCells: readonly CellScenario[] = [{
  id: 'mark-sweep', tab: 'Mark and sweep',
  title: 'A tracing collector reclaims an unreachable cycle',
  summary: 'Table P is held by a global and holds the string s and the closure f. Tables A and B hold only each other. Every reference count is 1.',
  frames: [
    frame('Mark: follow references from the roots', 'From the global the collector reaches P, then s and f. Nothing reachable leads to A or B.', [
      panel(undefined, 'blue', [row('Heap objects', heapObjects.map((name, index) => index < 3 ? h(name, 'green', 1, { sub: 'marked' }) : c(name, 'orange', 1, { sub: 'not reached' })))]),
    ]),
    frame('Sweep: free every unmarked object', 'A and B are reclaimed together, although each still had a count of 1.', [
      panel(undefined, 'blue', [row('Heap objects', heapObjects.map((name, index) => index < 3 ? c(name, 'green', 1, { sub: 'kept' }) : h(name, 'red', 1, { ghost: true, sub: 'freed' })))]),
    ]),
  ],
}];

/** Lesson 11.11 (pages/12/09.mdx): one value stack, two frames, and where the result goes. */
export const callFrameCells: readonly CellScenario[] = [{
  id: 'call-frames', tab: 'Call and return',
  title: 'Two call frames share one value stack',
  summary: 'The caller keeps a = 10 and b = 3 at base 0, then calls a function that returns x − y.',
  frames: [
    frame('Call: the new frame starts at base 2', 'The arguments are copied to slots 2 and 3, so the callee’s local 1 is slot 2 + 1 = 3. The frame records: resume the caller at instruction 5, one result wanted.', [
      panel(undefined, 'blue', [row('Value stack', [c('10', 'blue', 1, { sub: 'slot 0 · a' }), c('3', 'blue', 1, { sub: 'slot 1 · b' }), h('10', 'teal', 1, { sub: 'slot 2 · x' }), h('3', 'teal', 1, { sub: 'slot 3 · y' })], { ticks: { left: 'caller: base 0', right: 'callee: base 2' } })]),
    ]),
    frame('Return: the result lands in slot 2', 'The callee computes 10 − 3 = 7. The VM stores it in slot 2, removes the callee’s frame and continues the caller at instruction 5.', [
      panel(undefined, 'blue', [row('Value stack', [c('10', 'blue', 1, { sub: 'slot 0 · a' }), c('3', 'blue', 1, { sub: 'slot 1 · b' }), h('7', 'green', 1, { sub: 'slot 2 · result' }), c('free', 'gray', 1, { ghost: true, sub: 'slot 3' })], { ticks: { left: 'caller: base 0' } })]),
    ]),
  ],
}];

/** Lesson 15.8 (pages/13/08.mdx): the award command checked by a UI flag, then by the engine policy. */
const awardLanes = [{ id: 'script', label: 'Script', icon: 'file' as const }, { id: 'handler', label: 'Handler', icon: 'gear' as const }, { id: 'ui', label: 'UI flag', icon: 'computer' as const }, { id: 'engine', label: 'Engine', icon: 'memory' as const }];
export const awardCommandFlows: readonly FlowScenario[] = [
  {
    id: 'weak', tab: 'Weak: checks the UI flag',
    title: 'The button is greyed out, the command still runs',
    summary: 'The engine policy says no awards. The weak award_bonus handler never reads it.',
    lanes: awardLanes,
    steps: [
      { from: 'script', to: 'handler', kind: 'request', label: 'award_bonus(25)', caption: 'A script calls the command directly, without the button.' },
      { from: 'handler', to: 'ui', kind: 'control', label: 'read ui_button_unlocked: true', caption: 'Restored UI state left the presentation flag true.' },
      { from: 'handler', to: 'engine', kind: 'data', label: 'bonus 0 → 25', caption: 'The effect happens while the policy is false.' },
    ],
  },
  {
    id: 'repaired', tab: 'Repaired: checks the policy',
    title: 'The handler checks the state it is about to change',
    summary: 'The same call meets the engine policy at the effect boundary.',
    lanes: awardLanes,
    steps: [
      { from: 'script', to: 'handler', kind: 'request', label: 'award_bonus(25)', caption: 'The same direct call arrives.' },
      { from: 'handler', to: 'engine', kind: 'control', label: 'read engine policy: no awards', caption: 'The UI flag is ignored; the engine’s own policy decides.' },
      { from: 'handler', to: 'script', kind: 'response', label: 'EnginePolicyDenied, bonus stays 0', caption: 'Refused with a reason, and nothing changes.' },
    ],
  },
];

/** Lesson 12.4 (pages/14/01.mdx): a context switch saves A's registers and loads B's; cr3 changes only across processes. */
const regs = (values: readonly string[], hotCells: boolean, last?: Cell): Cell[] => [
  (hotCells ? h : c)(values[0] ?? '', 'orange', 1, { sub: 'rip' }), (hotCells ? h : c)(values[1] ?? '', 'orange', 1, { sub: 'rsp' }), (hotCells ? h : c)(values[2] ?? '', 'blue', 1, { sub: 'rax' }), last ?? gap(),
];
const switchScenario = (other: boolean): CellScenario => {
  const b = other ? ['0x3010', '0xFD40', '7'] : ['0x2F00', '0xFA10', '0'];
  const tables = other ? '0x9000' : '0x7000';
  return {
    id: other ? 'other-process' : 'same-process', tab: other ? 'B in another process' : 'B in the same process',
    title: other ? 'Switching to a thread of another process' : 'Switching to a thread of the same process',
    summary: other ? 'Short example values. Thread A belongs to the game (page tables at 0x7000); thread B belongs to another process (0x9000).' : 'Short example values. Threads A and B both belong to the game, whose page tables are at 0x7000.',
    frames: [
      frame('Save A’s registers', 'Thread A stops. The kernel copies the core’s registers into A’s context in kernel memory.', [
        panel(undefined, 'orange', [
          row('CPU core', regs(['0x1A20', '0xFE80', '42'], false, c('0x7000', 'purple', 1, { sub: 'cr3' }))),
          row('A’s saved context', regs(['0x1A20', '0xFE80', '42'], true), { link: 'copy' }),
        ]),
      ]),
      frame(other ? 'Load B’s registers and cr3' : 'Load B’s registers; cr3 stays', other ? 'B is in another process, so cr3 also gets that process’s page tables. B continues where it stopped.' : 'Same process, same page tables, so cr3 is not touched. B continues where it stopped.', [
        panel(undefined, 'orange', [
          row('B’s saved context', regs(b, false, c(tables, 'purple', 1, { sub: 'its tables' }))),
          row('CPU core', regs(b, true, (other ? h : c)(tables, 'purple', 1, { sub: other ? 'cr3 changed' : 'cr3 unchanged' })), { link: 'load' }),
        ]),
      ]),
    ],
  };
};
export const contextSwitchCells: readonly CellScenario[] = [switchScenario(true), switchScenario(false)];

/** Lesson 13.3 (pages/14/03.mdx): one write to a virtual network card becomes a VM exit and host work. */
export const deviceExitFlows: readonly FlowScenario[] = [{
  id: 'device-exit', tab: 'One device write',
  title: 'A virtual device is backed by host work',
  summary: 'The guest’s network driver writes 1 to its virtual card’s START register.',
  lanes: [{ id: 'guest', label: 'Guest', icon: 'file' }, { id: 'cpu', label: 'CPU', icon: 'cpu' }, { id: 'hv', label: 'Hypervisor', icon: 'layers' }],
  steps: [
    { from: 'guest', to: 'cpu', kind: 'request', label: 'write 1 to START', caption: 'The register sits on a guest-physical page of the virtual card.' },
    { from: 'cpu', to: 'hv', kind: 'control', label: 'VM exit: no stage-2 mapping', caption: 'Guest state is saved; the exit reason and address go along.' },
    { from: 'hv', to: 'hv', kind: 'local', label: 'send the packet on the real card', caption: 'It updates its emulated card and uses the host’s network card.' },
    { from: 'hv', to: 'guest', kind: 'response', label: 'VM entry after the store', caption: 'The guest runs on; to it, the store simply took effect.' },
  ],
}];

/** Lesson 15.1 (pages/15/01.mdx): the client asks to move; the server compares with its own position and maximum step. */
const moveLanes = [{ id: 'client', label: 'Client', icon: 'computer' as const }, { id: 'server', label: 'Server: x = 100', icon: 'server' as const }];
export const moveRequestFlows: readonly FlowScenario[] = [
  {
    id: 'jump', tab: 'Asks for x = 900',
    title: 'The server refuses a jump of 800',
    summary: 'The server knows the player was at x = 100 and allows at most 5 units per tick.',
    lanes: moveLanes,
    steps: [
      { from: 'client', to: 'server', kind: 'request', label: 'move to x = 900', caption: 'A request, not a new position.' },
      { from: 'server', to: 'server', kind: 'local', label: '900 − 100 = 800 > 5: refuse', caption: 'The step is measured from the server’s own position.' },
      { from: 'server', to: 'client', kind: 'response', label: 'you are at x = 100', caption: 'The client’s view snaps back.' },
    ],
  },
  {
    id: 'step', tab: 'Asks for x = 104',
    title: 'The server accepts an ordinary step',
    summary: 'The same check passes a request that fits the rules.',
    lanes: moveLanes,
    steps: [
      { from: 'client', to: 'server', kind: 'request', label: 'move to x = 104', caption: 'A small step.' },
      { from: 'server', to: 'server', kind: 'local', label: '104 − 100 = 4 ≤ 5: accept', caption: 'The server applies it to its own state.' },
      { from: 'server', to: 'client', kind: 'response', label: 'you are at x = 104', caption: 'The server, not the client, decided that.' },
    ],
  },
];

/** Lesson 15.2 (pages/15/03.mdx): two sources, the same button bits; the server sees only the bits. */
const jumpBits = [0, 1, 1, 0, 1] as const;
const bitCells = (hue: 'blue' | 'teal'): Cell[] => jumpBits.map((bit, index) => c(`${bit}`, hue, 1, { sub: `cmd ${index + 1}` }));
export const sameSamplesCells: readonly CellScenario[] = [{
  id: 'same-samples', tab: 'Same samples',
  title: 'Two sources, the same five commands',
  summary: 'Each command carries the jump button’s state. Nothing in it names the program that produced it.',
  frames: [
    frame('A player and a script send the same bits', 'Two key presses and a scripted schedule can both produce 0, 1, 1, 0, 1.', [
      panel('A player pressing the key', 'blue', [row('', bitCells('blue'))]),
      panel('An automation script', 'teal', [row('', bitCells('teal'))]),
    ], { side: true }),
    frame('What the server can compute', 'Two rising edges for either source: an observation to explain, not the name of a program.', [
      panel(undefined, 'purple', [
        row('New press? (0 → 1)', jumpBits.map((bit, index) => bit === 1 && (index === 0 || jumpBits[index - 1] === 0) ? h('+1', 'yellow', 1, { sub: `cmd ${index + 1}` }) : c('0', 'gray', 1, { sub: `cmd ${index + 1}` }))),
        row('Known about the source', [h('fresh presses: 2', 'yellow', 2), c('which program: unknown', 'gray', 3, { ghost: true })]),
      ]),
    ]),
  ],
}];

/** Lesson 15.3 (pages/15/04.mdx): three user-mode observations, each with its own limit. */
export const clientChecksCells: readonly CellScenario[] = [{
  id: 'client-checks', tab: 'Three observations',
  title: 'Each check sees one part of the machine',
  summary: 'A user-mode component works within the permissions Windows gives it.',
  frames: [
    frame('Files: the bytes on disk', 'The hash covers game.exe as read from disk, not later changes in memory.', [
      panel(undefined, 'blue', [row('game.exe', [c('SHA-256 9F2C…41AB', 'blue', 2), c('=', 'purple', 1), h('trusted 9F2C…41AB', 'green', 2, { sub: 'match' })])]),
    ]),
    frame('Modules: what is loaded in the game', 'An unknown module is worth a look; it is not proof of a cheat.', [
      panel(undefined, 'blue', [row('Loaded', [c('game.exe', 'green'), c('overlay.dll', 'green', 1, { sub: 'supported' }), h('helper.dll', 'yellow', 1, { sub: 'unknown' })])]),
    ]),
    frame('Access: who opened the game', 'The same read rights, different purposes: check provenance and the game’s supported tools.', [
      panel(undefined, 'blue', [row('Handles to game.exe', [h('tool.exe', 'yellow', 2, { sub: 'read rights' }), c('crash reporter', 'green', 2, { sub: 'read rights' })])]),
    ]),
  ],
}];

/** Lesson 15.6 (pages/15/07.mdx): an external tool and an internal tool leave different traces. */
export const toolLocationCells: readonly CellScenario[] = [{
  id: 'tool-location', tab: 'External and internal',
  title: 'Where the tool runs changes what a defender can observe',
  summary: 'Both tools read the same health value; only the route differs.',
  frames: [
    frame('External: a separate process', 'tool.exe opens a handle and asks Windows to copy bytes. A debugger leaves the same kind of handle.', [
      panel('game.exe', 'blue', [row('', [c('game.exe', 'blue', 1, { sub: 'module' }), c('health 100', 'blue', 1, { sub: 'in memory' })])]),
      panel('tool.exe', 'teal', [row('', [h('handle', 'orange', 1, { sub: 'read rights' }), h('health 100', 'teal', 1, { sub: 'its copy' })])]),
    ], { side: true }),
    frame('Internal: code inside the game', 'No handle is needed after loading, but the added module, and any bytes it patched, are inside the game. A supported overlay also loads a DLL.', [
      panel('game.exe', 'blue', [row('', [c('game.exe', 'blue', 1, { sub: 'module' }), h('helper.dll', 'yellow', 1, { sub: 'added' })])]),
      panel('A defender may see', 'purple', [row('', [c('a new module', 'yellow'), c('changed code bytes', 'yellow')])]),
    ], { side: true }),
  ],
}];
