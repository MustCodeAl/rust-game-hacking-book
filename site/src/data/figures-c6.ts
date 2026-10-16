// Diagram data (CellFrames / FlowDiagram scenarios) for lessons in group C6. Import from the lesson MDX; keep each figure small.
// Colours: blue = data, orange = addresses and keys, green = accepted or kept, red = refused or reclaimed, purple = rules and
// control, yellow = arithmetic or a warning, teal = a second copy or party, gray = unused.
import { cell as c, frame, gap, hot as h, panel, row, type Cell, type CellScenario } from '../lib/cell-model';
import type { FlowScenario } from '../lib/flow-model';

/** Lesson 11.3 (pages/12/02.mdx): one table, two numbered keys and one named key. */
export const luaTableKeysCells: readonly CellScenario[] = [{
  id: 'table-keys', tab: 'Keys and values',
  title: 'local bag = { "sword", "shield", gold = 25 }',
  summary: 'One table, three key–value pairs. Lua numbers the listed items 1 and 2; gold is a key written by name.',
  frames: [
    frame('Every entry is a key and a value', 'The two listed items got the keys 1 and 2. The string "gold" is just another key.', [
      panel('bag', 'blue', [
        row('Key', [h('1', 'orange', 2), h('2', 'orange', 2), h('"gold"', 'purple', 2)]),
        row('Value', [c('"sword"', 'blue', 2), c('"shield"', 'blue', 2), c('25', 'blue', 2)]),
      ]),
    ]),
    frame('Sequence operations read only the keys 1, 2, 3, …', 'ipairs visits keys 1 and 2, stops at the missing key 3 and never sees "gold". #bag is 2, and bag[0] is nil.', [
      panel('What ipairs and # use', 'green', [
        row('Key', [h('1', 'green', 2, { sub: '"sword"' }), h('2', 'green', 2, { sub: '"shield"' }), c('3: missing', 'gray', 2, { ghost: true, sub: 'stop here' }), c('"gold"', 'gray', 2, { ghost: true, sub: 'not a sequence key' })]),
      ]),
    ]),
  ],
}];

/** Lesson 11.10 (pages/12/08.mdx): mark from the roots, then sweep what was not reached. */
const heapObjects = ['P table', 's string', 'f closure', 'A table', 'B table'] as const;
const heldBy = ['global p', 'P', 'P', 'B.friend', 'A.friend'] as const;
const heapRow = (state: 'counts' | 'marked' | 'swept'): Cell[] => heapObjects.map((name, index) => {
  const reachable = index < 3;
  if (state === 'counts') return c(name, index < 3 ? 'blue' : 'orange', 1, { sub: `count 1 · ${heldBy[index]}` });
  if (state === 'marked') return reachable ? h(name, 'green', 1, { sub: 'marked' }) : c(name, 'orange', 1, { sub: 'not reached' });
  return reachable ? c(name, 'green', 1, { sub: 'kept' }) : h(name, 'red', 1, { ghost: true, sub: 'reclaimed' });
});
export const markSweepCells: readonly CellScenario[] = [{
  id: 'mark-sweep', tab: 'Mark and sweep',
  title: 'A tracing collector reclaims an unreachable cycle',
  summary: 'Five objects, each with a reference count of 1. A and B hold each other, and nothing else holds them.',
  frames: [
    frame('Every object has a reference count of 1', 'P is held by a global, s and f by P. A and B each hold the other, so counting alone frees nothing.', [
      panel('Heap objects', 'blue', [row('Object', heapRow('counts'))]),
    ]),
    frame('Mark: follow references from the roots', 'From the global p the collector reaches P, then s and f through P. No root leads to A or B.', [
      panel('Roots', 'purple', [row('Start here', [c('globals', 'purple', 1), c('active frames', 'purple', 1), c('host references', 'purple', 1)])]),
      panel('Heap objects', 'blue', [row('Object', heapRow('marked'), { link: 'follow references' })]),
    ]),
    frame('Sweep: free every unmarked object', 'A and B are reclaimed together, although each still had a reference count of 1.', [
      panel('Heap objects', 'blue', [row('Object', heapRow('swept'))]),
    ]),
  ],
}];

/** Lesson 11.11 (pages/12/09.mdx): one value stack, two frames, and where the result goes. */
const slots = (values: readonly (Cell | null)[]): Cell[] => values.map((value, index) => value ?? c('free', 'gray', 1, { ghost: true, sub: `slot ${index}` }));
export const callFrameCells: readonly CellScenario[] = [{
  id: 'call-frames', tab: 'Call and return',
  title: 'Two call frames share one value stack',
  summary: 'The caller keeps a = 10 and b = 3 in slots 0 and 1, then calls a function that returns x − y.',
  frames: [
    frame('The caller runs with base 0', 'Its local 0 is slot 0 + 0 = 0 and its local 1 is slot 0 + 1 = 1.', [
      panel('Value stack', 'blue', [row('Slots 0 to 3', slots([c('10', 'blue', 1, { sub: 'slot 0 · a' }), c('3', 'blue', 1, { sub: 'slot 1 · b' }), null, null]))]),
      panel('Call frames', 'purple', [row('Frames', [h('caller · base 0', 'purple', 2)])]),
    ]),
    frame('Call: a new frame starts at base 2', 'The arguments are copied into slots 2 and 3. The callee’s local 1 is slot 2 + 1 = 3. The frame also records where the caller resumes and how many results it wants.', [
      panel('Value stack', 'blue', [row('Slots 0 to 3', [c('10', 'blue', 1, { sub: 'slot 0 · a' }), c('3', 'blue', 1, { sub: 'slot 1 · b' }), h('10', 'teal', 1, { sub: 'slot 2 · x' }), h('3', 'teal', 1, { sub: 'slot 3 · y' })])]),
      panel('Call frames', 'purple', [row('Frames', [c('caller · base 0', 'purple', 2), h('callee · base 2', 'teal', 2, { sub: 'resume caller at 5 · 1 result' })])]),
    ]),
    frame('Return: one result, then the caller resumes', 'The callee computes 10 − 3 = 7. The VM puts the one result in slot 2, removes the callee frame and continues the caller at instruction 5.', [
      panel('Value stack', 'blue', [row('Slots 0 to 3', slots([c('10', 'blue', 1, { sub: 'slot 0 · a' }), c('3', 'blue', 1, { sub: 'slot 1 · b' }), h('7', 'green', 1, { sub: 'slot 2 · result' }), null]))]),
      panel('Call frames', 'purple', [row('Frames', [h('caller · base 0', 'purple', 2, { sub: 'resumes at 5' })])]),
    ]),
  ],
}];

/** Lesson 15.8 (pages/13/08.mdx): the award command checked by a UI flag, then by the engine policy. */
const awardLanes = [{ id: 'script', label: 'Script', icon: 'file' as const }, { id: 'handler', label: 'award_bonus handler', icon: 'gear' as const }, { id: 'ui', label: 'UI flag', icon: 'computer' as const }, { id: 'engine', label: 'Engine state', icon: 'memory' as const }];
export const awardCommandFlows: readonly FlowScenario[] = [
  {
    id: 'weak', tab: 'Weak: checks the UI flag',
    title: 'The button is greyed out, the command still runs',
    summary: 'Engine policy says no awards. The weak handler never reads it.',
    lanes: awardLanes,
    steps: [
      { from: 'script', to: 'handler', kind: 'request', label: 'award_bonus(25)', caption: 'A script calls the award command directly. It never touches the greyed-out button.' },
      { from: 'handler', to: 'ui', kind: 'control', label: 'read ui_button_unlocked: true', caption: 'weak_award asks only the presentation flag, which restored UI state left true.' },
      { from: 'handler', to: 'engine', kind: 'data', label: 'bonus 0 → 25', caption: 'The flag said yes, so the effect happens: allowed = true and bonus = 25 while the policy is false.' },
    ],
  },
  {
    id: 'repaired', tab: 'Repaired: checks the policy',
    title: 'The handler checks the state it is about to change',
    summary: 'The same call meets the engine policy at the effect boundary.',
    lanes: awardLanes,
    steps: [
      { from: 'script', to: 'handler', kind: 'request', label: 'award_bonus(25)', caption: 'The same direct call arrives.' },
      { from: 'handler', to: 'engine', kind: 'control', label: 'read engine policy: no awards', caption: 'The repaired method ignores the UI flag and reads the engine’s own policy.' },
      { from: 'handler', to: 'script', kind: 'response', label: 'EnginePolicyDenied, bonus stays 0', caption: 'It refuses and reports why. The greyed-out button still helps the player; it is just not the check.' },
    ],
  },
];

/** Lesson 12.4 (pages/14/01.mdx): a context switch saves A's registers and loads B's; cr3 changes only across processes. */
const cpuRow = (rip: string, rsp: string, rax: string, cr3: string, hotRegs: boolean, hotCr3: boolean, cr3Note: string): Cell[] => [
  (hotRegs ? h : c)(rip, 'orange', 1, { sub: 'rip' }), (hotRegs ? h : c)(rsp, 'orange', 1, { sub: 'rsp' }), (hotRegs ? h : c)(rax, 'blue', 1, { sub: 'rax' }), (hotCr3 ? h : c)(cr3, 'purple', 1, { sub: cr3Note }),
];
const savedA = (saved: boolean, hotRow: boolean): Cell[] => saved
  ? [(hotRow ? h : c)('0x401A20', 'orange', 1, { sub: 'rip' }), (hotRow ? h : c)('0x14FE80', 'orange', 1, { sub: 'rsp' }), (hotRow ? h : c)('42', 'blue', 1, { sub: 'rax' }), gap()]
  : [c('running: not saved', 'gray', 3, { ghost: true }), gap()];
const switchScenario = (other: boolean): CellScenario => {
  const b = other ? { rip: '0x5B3010', rsp: '0x29FD40', rax: '7', cr3: '0x3C2000' } : { rip: '0x402F00', rsp: '0x24FD10', rax: '0', cr3: '0x1AD000' };
  const savedB: Cell[] = [c(b.rip, 'orange', 1, { sub: 'rip' }), c(b.rsp, 'orange', 1, { sub: 'rsp' }), c(b.rax, 'blue', 1, { sub: 'rax' }), c(b.cr3, 'purple', 1, { sub: other ? 'B’s process tables' : 'same process' })];
  const kernel = (saved: boolean, hotRow: boolean) => panel('Kernel memory', 'teal', [row('Thread A’s context', savedA(saved, hotRow)), row('Thread B’s context', savedB)]);
  return {
    id: other ? 'other-process' : 'same-process', tab: other ? 'B in another process' : 'B in the same process',
    title: other ? 'Switching to a thread of another process' : 'Switching to a thread of the same process',
    summary: other ? 'B belongs to another process, so cr3 changes to that process’s page tables.' : 'B shares A’s process and its page tables, so cr3 stays 0x1AD000.',
    frames: [
      frame('Thread A is running', 'The core’s registers hold A’s values. B’s were saved when B last stopped.', [
        panel('CPU core', 'orange', [row('Registers', cpuRow('0x401A20', '0x14FE80', '42', '0x1AD000', false, false, 'cr3 · game'))]),
        kernel(false, false),
      ]),
      frame('Save A’s registers', 'The kernel copies the core’s registers into A’s context in kernel memory.', [
        panel('CPU core', 'orange', [row('Registers', cpuRow('0x401A20', '0x14FE80', '42', '0x1AD000', false, false, 'cr3 · game'))]),
        kernel(true, true),
      ]),
      frame(other ? 'Load B’s registers and its page tables' : 'Load B’s registers; cr3 stays', other ? 'B is in another process, so cr3 also gets that process’s page-table address. B continues exactly where it stopped.' : 'Same process, same page tables, so cr3 is not touched. B continues exactly where it stopped.', [
        panel('CPU core', 'orange', [row('Registers', cpuRow(b.rip, b.rsp, b.rax, b.cr3, true, other, other ? 'cr3 · changed' : 'cr3 · unchanged'))]),
        kernel(true, false),
      ]),
    ],
  };
};
export const contextSwitchCells: readonly CellScenario[] = [switchScenario(true), switchScenario(false)];

/** Lesson 13.3 (pages/14/03.mdx): one write to a virtual network card becomes a VM exit and host work. */
export const deviceExitFlows: readonly FlowScenario[] = [{
  id: 'device-exit', tab: 'One device write',
  title: 'A virtual device is backed by host work',
  summary: 'The guest writes 1 to its virtual network card’s START register. The hypervisor turns that write into work on the real card.',
  lanes: [{ id: 'guest', label: 'Guest network driver', icon: 'file' }, { id: 'cpu', label: 'Processor', icon: 'cpu' }, { id: 'hv', label: 'Hypervisor', icon: 'layers' }, { id: 'nic', label: 'Host network card', icon: 'plug' }],
  steps: [
    { from: 'guest', to: 'cpu', kind: 'request', label: 'write 1 to the START register', caption: 'The register’s address is a guest-physical address on the virtual card’s page.' },
    { from: 'cpu', to: 'hv', kind: 'control', label: 'VM exit: page has no stage-2 mapping', caption: 'The store cannot complete. The processor saves the guest’s state and passes the exit reason and the address to the hypervisor.' },
    { from: 'hv', to: 'nic', kind: 'data', label: 'send the guest’s packet', caption: 'The hypervisor decodes the write, updates its emulated card and hands the packet to the real card.' },
    { from: 'hv', to: 'cpu', kind: 'control', label: 'skip the store, VM entry', caption: 'It moves the guest’s saved instruction pointer past the store and enters the guest again.' },
    { from: 'cpu', to: 'guest', kind: 'response', label: 'the next instruction runs', caption: 'Inside the guest the store simply took effect. The round trip cost hundreds to thousands of cycles.' },
  ],
}];

/** Lesson 15.1 (pages/15/01.mdx): the client asks to move; the server compares with its own position and maximum step. */
const moveLanes = [{ id: 'client', label: 'Client', icon: 'computer' as const }, { id: 'server', label: 'Server (player at x = 100)', icon: 'server' as const }];
export const moveRequestFlows: readonly FlowScenario[] = [
  {
    id: 'jump', tab: 'Asks for x = 900',
    title: 'The server refuses a jump of 800',
    summary: 'The server knows the player was at x = 100 and allows at most 5 units per tick.',
    lanes: moveLanes,
    steps: [
      { from: 'client', to: 'server', kind: 'request', label: 'move to x = 900', caption: 'The client asks. Its message is a request, not a new position.' },
      { from: 'server', to: 'server', kind: 'local', label: '900 − 100 = 800 > 5: refuse', caption: 'The server measures the step from its own position. 800 is more than the 5 allowed in one tick.' },
      { from: 'server', to: 'client', kind: 'response', label: 'you are at x = 100', caption: 'The accepted position stays 100, and the client’s view snaps back to it.' },
    ],
  },
  {
    id: 'step', tab: 'Asks for x = 104',
    title: 'The server accepts an ordinary step',
    summary: 'The same check passes a request that fits the rules.',
    lanes: moveLanes,
    steps: [
      { from: 'client', to: 'server', kind: 'request', label: 'move to x = 104', caption: 'The client asks for a small step.' },
      { from: 'server', to: 'server', kind: 'local', label: '104 − 100 = 4 ≤ 5: accept', caption: 'The step fits inside the maximum, so the server applies it to its own state.' },
      { from: 'server', to: 'client', kind: 'response', label: 'you are at x = 104', caption: 'The server’s position is now 104. The server, not the client, decided that.' },
    ],
  },
];

/** Lesson 15.2 (pages/15/03.mdx): two sources, the same button bits; the server sees only the bits. */
const jumpBits = [0, 1, 1, 0, 1] as const;
const bitCells = (hue: 'blue' | 'teal'): Cell[] => jumpBits.map((bit, index) => c(`${bit}`, hue, 1, { sub: `cmd ${index + 1}` }));
export const sameSamplesCells: readonly CellScenario[] = [{
  id: 'same-samples', tab: 'Same samples',
  title: 'Two sources, the same five commands',
  summary: 'A server receives the jump button’s state in each command. Nothing in a command names the program that produced it.',
  frames: [
    frame('A player and a script send the same bits', 'Pressing the key twice and a scripted schedule can both produce the jump states 0, 1, 1, 0, 1.', [
      panel('A player pressing the key', 'blue', [row('Jump held?', bitCells('blue'))]),
      panel('An automation script', 'teal', [row('Jump held?', bitCells('teal'))]),
    ], { side: true }),
    frame('What the server can compute', 'It counts 2 rising edges, 0 → 1, for either source. The count is an observation to explain, not the name of a program.', [
      panel('The server’s view', 'purple', [
        row('Jump held?', jumpBits.map(bit => c(`${bit}`, 'blue'))),
        row('New press?', jumpBits.map((bit, index) => bit === 1 && (index === 0 || jumpBits[index - 1] === 0) ? h('+1', 'yellow') : c('0', 'gray')), { link: 'compare with the previous command' }),
        row('Known about the source', [h('fresh presses: 2', 'yellow', 2), c('which program: unknown', 'gray', 3, { ghost: true })]),
      ]),
    ]),
  ],
}];

/** Lesson 15.3 (pages/15/04.mdx): three user-mode observations, each with its own limit. */
export const clientChecksCells: readonly CellScenario[] = [{
  id: 'client-checks', tab: 'Three observations',
  title: 'Each check sees one part of the machine',
  summary: 'A user-mode protection component measures files, lists modules and receives access reports, within the permissions Windows gives it.',
  frames: [
    frame('Files: the bytes on disk', 'The hash covers game.exe as it was read from disk. It says nothing about changes made in memory afterwards.', [
      panel('File check', 'blue', [
        row('game.exe on disk', [c('SHA-256 9F2C…41AB', 'blue', 2), c('=', 'purple', 1), h('trusted 9F2C…41AB', 'green', 2, { sub: 'match' })]),
        row('Outside this check', [c('bytes changed in memory later', 'gray', 5, { ghost: true })]),
      ]),
    ]),
    frame('Modules: what is loaded in the game', 'An unknown module is worth a look. It is an observation, not proof of a cheat.', [
      panel('Module list of game.exe', 'blue', [row('Loaded', [c('game.exe', 'green'), c('engine.dll', 'green'), c('overlay64.dll', 'green', 1, { sub: 'supported' }), h('helper.dll', 'yellow', 1, { sub: 'unknown publisher' })])]),
    ]),
    frame('Access: who opened the game', 'Two handles with the same read rights. Which one matters depends on provenance and on the game’s supported tools.', [
      panel('Handles to game.exe', 'blue', [row('Opened by', [h('tool.exe', 'yellow', 2, { sub: 'read rights' }), c('crash reporter', 'green', 2, { sub: 'read rights' })])]),
    ]),
  ],
}];

/** Lesson 15.6 (pages/15/07.mdx): an external tool and an internal tool leave different traces. */
export const toolLocationCells: readonly CellScenario[] = [{
  id: 'tool-location', tab: 'External and internal',
  title: 'Where the tool runs changes what a defender can observe',
  summary: 'The same health value is read both times. Only the route to it differs.',
  frames: [
    frame('External: a separate process', 'tool.exe needs a handle and asks Windows to copy bytes. A defender can observe the handle; a debugger opens the same kind.', [
      panel('game.exe', 'blue', [row('Modules', [c('game.exe', 'blue'), c('engine.dll', 'blue')]), row('Memory', [c('health 100', 'blue', 2)])]),
      panel('tool.exe', 'teal', [row('Handle to game.exe', [h('read rights', 'orange', 2)]), row('Its own copy', [h('health 100', 'teal', 2, { sub: 'copied by Windows' })], { link: 'ReadProcessMemory' })]),
    ], { side: true }),
    frame('Internal: code inside the game', 'No handle is needed after loading, but the extra module, and any code bytes it patched, sit inside the game. A supported overlay also loads a DLL.', [
      panel('game.exe', 'blue', [row('Modules', [c('game.exe', 'blue'), c('engine.dll', 'blue'), h('helper.dll', 'yellow', 1, { sub: 'added' })]), row('Memory', [h('health 100', 'blue', 2, { sub: 'read directly' })])]),
      panel('Observations', 'purple', [row('A defender may see', [c('a new module', 'yellow', 2), c('changed code bytes', 'yellow', 2)])]),
    ], { side: true }),
  ],
}];
