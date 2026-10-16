// More state-frame scenarios (CellFrames): processes, safety, scripting, devices and fairness.
// Colour convention as in figure-cells-a.ts: blue = data, orange = addresses and ownership, green = accepted or correct,
// red = refused or lost, purple = rules and control, yellow = arithmetic or warning, teal = a second party, gray = unused.
import { cell as c, frame, gap, hot as h, panel, row, type CellFrame, type CellScenario } from '../lib/cell-model';
import type { Hue } from '../lib/diagram-visual';

/** Lesson 8.1 (pages/8/01.mdx): an external tool gets a copy; a guest DLL touches the game's own bytes. */
export const dllOwnersCells: readonly CellScenario[] = [
  {
    id: 'external', tab: 'External tool',
    title: 'An external tool receives a copy through Windows',
    summary: 'The tool lives in its own address space. It never touches the game’s bytes, only a copy that Windows hands over.',
    frames: [
      frame('The game owns its bytes in its own address space', 'The game process holds the data it is using.', [panel('Game process', 'orange', [row('Game-owned bytes', [c('player data', 'orange', 4)])])]),
      frame('The tool asks Windows to read them', 'The request goes through Windows, with the game’s handle.', [
        panel('Tool process', 'blue', [row('Request', [h('read the game’s bytes', 'purple', 4)])]),
        panel('Game process', 'orange', [row('Game-owned bytes', [c('player data', 'orange', 4)])]),
      ]),
      frame('The tool receives a local copy', 'The copy belongs to the tool. Later changes in the game do not appear in it.', [
        panel('Tool process', 'blue', [row('Local copy', [h('copy of the player data', 'blue', 4)])]),
        panel('Game process', 'orange', [row('Game-owned bytes', [c('player data', 'orange', 4)])]),
      ]),
    ],
  },
  {
    id: 'guest', tab: 'Guest DLL',
    title: 'A guest DLL runs inside the game’s address space',
    summary: 'The DLL shares the game’s address space, so it reads the game’s own bytes. The game still owns their lifetime.',
    frames: [
      frame('The DLL is loaded into the game process', 'Its code now runs inside the game, next to the game’s own data.', [
        panel('Game process (one address space)', 'orange', [row('Game', [c('game code and data', 'orange', 2), h('guest DLL', 'purple', 2)])]),
      ]),
      frame('It reads the game-owned bytes directly', 'There is no copy and no request: the DLL follows pointers into the same memory.', [
        panel('Game process (one address space)', 'orange', [
          row('Game-owned bytes', [c('player data', 'orange', 4)]),
          row('Guest DLL', [h('reads player data directly', 'purple', 4)], { link: 'same addresses' }),
        ]),
      ]),
      frame('The game still owns the bytes’ lifetime', 'If the game frees them, the DLL’s pointer now points at memory that is no longer valid.', [
        panel('Game process (one address space)', 'orange', [
          row('Game-owned bytes', [c('freed by the game', 'red', 4, { ghost: true })]),
          row('Guest DLL', [h('pointer now dangles', 'red', 4)], { link: 'still reading' }),
        ]),
      ]),
    ],
  },
];

/** Lesson 8.5 (pages/8/05.mdx): workers claim different regions from one atomic index. */
const claimFrame = (label: string, caption: string, index: number, claimed: readonly [boolean, boolean, boolean], who: readonly [string, string]): CellFrame => frame(label, caption, [
  panel('Shared', 'purple', [row('Atomic region index', [h(String(index), 'purple', 4, { sub: 'next region to claim' })])]),
  panel('Copied regions (immutable)', 'blue', [row('Regions', [0, 1, 2].map(i => claimed[i] ? h(`region ${i}`, 'blue', 1, { sub: i === 0 ? 'Worker 1' : 'Worker 2' }) : c(`region ${i}`, 'gray', 1, { ghost: true })))]),
  panel('Workers', 'green', [row('Worker 1', [c(who[0], 'green', 4)]), row('Worker 2', [c(who[1], 'teal', 4)])]),
]);
export const scanClaimsCells: readonly CellScenario[] = [{
  id: 'region-claims', tab: 'Claiming regions',
  title: 'Two workers claim different regions from one atomic counter',
  summary: 'Each worker takes the next region number with one atomic step, so no region is scanned twice.',
  frames: [
    claimFrame('The index starts at 0', 'Nothing has been claimed yet. The regions are immutable copies, so scanning them needs no lock.', 0, [false, false, false], ['waiting', 'waiting']),
    claimFrame('Worker 1 claims: the index goes 0 → 1', 'The atomic step hands Worker 1 the value 0 and leaves 1 behind. Worker 1 scans region 0.', 1, [true, false, false], ['claimed 0, scanning region 0', 'waiting']),
    claimFrame('Worker 2 claims: the index goes 1 → 2', 'Worker 2 gets 1, not 0, because the first claim already moved the counter. It scans region 1.', 2, [true, true, false], ['scanning region 0', 'claimed 1, scanning region 1']),
  ],
}];

/** Lesson 8.8 (pages/8/08.mdx): radar and overlay read one captured snapshot. */
export const frameBundleCells: readonly CellScenario[] = [{
  id: 'frame-snapshot', tab: 'One snapshot',
  title: 'One owned snapshot, two readers',
  summary: 'The tool captures players and the camera once. Radar and overlay both read that same captured set.',
  frames: [
    frame('One owned FrameSnapshot', 'It holds the players and the camera captured for this frame.', [panel('FrameSnapshot', 'blue', [row('Contents', [h('players', 'blue', 3), h('camera', 'teal', 1)])])]),
    frame('Radar reads that captured set', 'The radar draws from the snapshot, not from the live game.', [
      panel('FrameSnapshot', 'blue', [row('Contents', [c('players', 'blue', 3), c('camera', 'teal', 1)])]),
      panel('Radar', 'green', [row('Reads', [h('players and camera from the snapshot', 'green', 4)], { link: 'reads' })]),
    ]),
    frame('Overlay reads the same set', 'Both views agree, because they use one copy.', [
      panel('FrameSnapshot', 'blue', [row('Contents', [c('players', 'blue', 3), c('camera', 'teal', 1)])]),
      panel('Radar and overlay', 'green', [row('Readers', [c('Radar', 'green', 2), h('Overlay', 'purple', 2)], { link: 'both read' })]),
    ]),
    frame('Sharing the copy is not proof the game stood still', 'The snapshot is consistent with itself, but the live game may have changed while the capture was running.', [
      panel('Live game while capturing', 'orange', [row('Time', [c('read players', 'blue', 2), h('game changes', 'yellow', 1), c('read camera', 'teal', 1)], { ticks: { left: 'capture starts', right: 'capture ends' } })]),
    ]),
  ],
}];

/** Lesson 10.1 (pages/10/01.mdx): a running process is more than its file. */
export const runningProcessCells: readonly CellScenario[] = [{
  id: 'file-vs-process', tab: 'File and process',
  title: 'The file on disk and the process that runs it',
  summary: 'wesnoth.exe on disk is only the starting point. A running process adds resources that no file contains.',
  frames: [
    frame('On disk: the file wesnoth.exe', 'The file holds code, data and headers, and does nothing by itself.', [panel('Disk', 'gray', [row('Files', [h('wesnoth.exe', 'blue', 4)])])]),
    frame('Mapped into a running process', 'Windows maps the file into a new process as its main image.', [
      panel('Disk', 'gray', [row('Files', [c('wesnoth.exe', 'blue', 4)])]),
      panel('Running process', 'purple', [row('Main image', [h('image mapped from wesnoth.exe', 'blue', 4)], { link: 'maps' })]),
    ]),
    frame('Runtime resources that no file holds', 'Everything else exists only while the process runs.', [
      panel('Running process', 'purple', [
        row('From the file', [c('image mapped from wesnoth.exe', 'blue', 4)]),
        row('Loaded', [h('DLLs', 'teal', 2), h('private heap', 'orange', 2)]),
        row('Per thread', [h('thread stack', 'orange', 2), h('thread context', 'yellow', 2)]),
        row('Held by the process', [h('handles', 'green', 2), h('security state', 'red', 2)]),
      ]),
    ]),
  ],
}];

/** Lesson 10.2 (pages/10/02.mdx): a version label is not an identity. */
export const labelDigestCells: readonly CellScenario[] = [{
  id: 'label-vs-digest', tab: 'Label or digest',
  title: 'Two files with the same label but different bytes',
  summary: 'A label says what someone claims. A digest is computed from the bytes themselves.',
  frames: [
    frame('Two files carry the same version label', 'Both say “version 1.2”, so by the label they look identical.', [
      panel('File A', 'blue', [row('Label', [h('version 1.2', 'blue', 3)])]),
      panel('File B', 'teal', [row('Label', [h('version 1.2', 'teal', 3)])]),
    ], { side: true }),
    frame('Their bytes differ in the last byte', 'File A ends 03 and File B ends 04.', [
      panel('File A', 'blue', [row('Bytes', [c('01', 'blue'), c('02', 'blue'), h('03', 'blue')])]),
      panel('File B', 'teal', [row('Bytes', [c('01', 'teal'), c('02', 'teal'), h('04', 'teal')])]),
    ], { side: true }),
    frame('So their SHA-256 digests differ', 'Any change to the bytes changes the digest, whatever the label says.', [
      panel('File A', 'blue', [row('SHA-256', [h('digest A', 'blue', 3)])]),
      panel('File B', 'teal', [row('SHA-256', [h('digest B', 'red', 3)])]),
      panel('Compared', 'purple', [row('Same label, different digests', [h('not the same file', 'red', 3)])]),
    ], { side: true }),
    frame('Compare against a trusted baseline', 'Check the bytes or the digest against a known good copy instead of relying on the label.', [
      panel('Trusted baseline', 'green', [row('Known good digest', [h('digest of the trusted file', 'green', 4)])]),
      panel('Unknown file', 'blue', [row('Computed digest', [c('digest of this file', 'blue', 4)], { link: 'compare' })]),
    ]),
  ],
}];

/** Lesson 10.8 (pages/10/08.mdx): a dump is one selected instant. */
export const dumpInstantCells: readonly CellScenario[] = [{
  id: 'dump-instant', tab: 'One instant',
  title: 'A dump records one chosen moment',
  summary: 'The dump holds the state at its capture point. It does not hold how the program got there.',
  frames: [
    frame('A capture point on the timeline', 'Something chooses one instant to save.', [panel('Timeline', 'purple', [row('Time', [c('earlier history', 'gray', 4, { ghost: true }), h('capture point', 'red', 1), c('later', 'gray', 3, { ghost: true })])])]),
    frame('The saved records at that instant', 'The dump keeps module, thread and stack records as they were at the capture point.', [
      panel('Timeline', 'purple', [row('Time', [c('earlier history', 'gray', 4, { ghost: true }), c('capture point', 'red', 1), c('later', 'gray', 3, { ghost: true })])]),
      panel('Saved in the dump', 'blue', [row('Records', [h('modules', 'blue'), h('threads', 'teal'), h('stacks', 'orange')], { link: 'saved from that instant' })]),
    ]),
    frame('Earlier history is not in the dump', 'How the state came about needs logs or tracing, which a dump does not contain.', [
      panel('Timeline', 'purple', [row('Time', [h('earlier history: not saved', 'red', 4, { ghost: true }), c('capture point', 'red', 1), c('later', 'gray', 3, { ghost: true })])]),
      panel('Needs another source', 'yellow', [row('Where history lives', [c('logs', 'yellow', 2), c('tracing', 'yellow', 2)])]),
    ]),
    frame('A missing stream may simply not have been captured', 'If a dump lacks something, it may not have been asked for, which is not proof the thing did not exist.', [
      panel('Saved in the dump', 'blue', [row('Records', [c('modules', 'blue'), c('threads', 'teal'), c('stacks', 'orange')]), row('Not captured', [h('a stream that was not requested', 'yellow', 3, { ghost: true })])]),
    ]),
  ],
}];

/** Lesson 11.4 (pages/11/04.mdx): a policy must look at the effect, not only the name. */
const policyFrame = (label: string, caption: string, writeCheck: string, patchCheck: string, writeHue: 'red' | 'green', patchHue: 'red' | 'green', title: string): CellFrame => frame(label, caption, [
  panel(title, 'purple', [
    row('WriteMemory', [c(writeCheck, writeHue, 2), c('changes state', 'yellow', 2)]),
    row('ApplyPatch', [c(patchCheck, patchHue, 2), c('changes state', 'yellow', 2)]),
  ]),
]);
export const policyEffectCells: readonly CellScenario[] = [{
  id: 'policy-effect', tab: 'Name or effect',
  title: 'A read-only policy that checks names instead of effects',
  summary: 'The toy policy blocks WriteMemory by name. ApplyPatch changes state just as much, and the name check lets it through.',
  frames: [
    policyFrame('The policy checks command names', 'It lists WriteMemory as forbidden and judges commands by name alone.', 'name: blocked', 'name: not checked yet', 'red', 'green', 'Policy by name'),
    policyFrame('ApplyPatch is not on the list', 'Its name is not blocked, so the policy allows it.', 'name: blocked', 'name: allowed', 'red', 'green', 'Policy by name'),
    policyFrame('Both commands change state', 'The invariant says no state changes, so the name check missed one of them.', 'name: blocked', 'name: allowed (wrong)', 'red', 'red', 'Policy by name: one gap'),
    policyFrame('Repair: classify the effect', 'The repaired invariant looks at what a command does, so any state-changing command is refused.', 'effect: blocked', 'effect: blocked', 'green', 'green', 'Repaired: policy by effect'),
  ],
}];

/** Lesson 11.5 (pages/11/05.mdx): the scope of a fault. */
const scope = (broken: 'none' | 'process' | 'all'): CellFrame['panels'] => [
  panel('User mode: separately bounded memory', 'blue', [1, 2, 3].map(n => row(`Process ${n}`, [broken === 'all' || (broken === 'process' && n === 2) ? h(`process ${n}: fault`, 'red', 4) : c(`process ${n} memory`, 'blue', 4)]))),
  panel('Kernel and drivers', 'purple', [row('Authority', ['mappings', 'devices', 'processes', 'security'].map(text => broken === 'all' ? h(text, 'red', 1) : c(text, 'purple', 1)))]),
];
export const kernelFaultCells: readonly CellScenario[] = [{
  id: 'fault-scope', tab: 'Fault scope',
  title: 'How far a fault can reach',
  summary: 'A conceptual boundary picture, not a driver experiment: user-mode faults are usually contained, kernel faults are not.',
  frames: [
    frame('Three user-mode processes with separate memory', 'Each process can only touch its own bounded memory.', scope('none')),
    frame('A user-mode fault usually ends one process', 'The failing process stops; the others and the kernel carry on.', scope('process')),
    frame('Kernel and driver authority spans much more', 'Kernel code can reach mappings, devices, processes and security decisions.', scope('none')),
    frame('A kernel fault can reach the whole system', 'Nothing separates the kernel from what it manages, so the damage is not confined to one process.', scope('all')),
  ],
}];

/** Lesson 11.6 (pages/11/06.mdx): the same virtual number, different page-table roots. */
const addressSpace = (stage: 1 | 2 | 3): CellFrame['panels'] => (['A', 'B'] as const).map(name => panel(`Process ${name}`, name === 'A' ? 'blue' : 'green', [
  row('Virtual address', [h('0x1000', name === 'A' ? 'blue' : 'green', 4)]),
  ...(stage >= 2 ? [row('Page-table root', [h(`root ${name}`, 'purple', 4)], { link: 'translated with' })] : []),
  ...(stage >= 3 ? [row('Physical memory', [h(`physical page ${name}`, 'orange', 4)], { link: 'lands in' })] : []),
]));
export const addressRootsCells: readonly CellScenario[] = [{
  id: 'address-roots', tab: 'Two processes',
  title: 'The same virtual address in two processes',
  summary: 'Both processes use the number 0x1000. Which memory that means depends on the page-table root in use.',
  frames: [
    frame('Both processes use 0x1000', 'The numbers are identical.', addressSpace(1), { side: true }),
    frame('Each has its own page-table root', 'The CPU translates each address with the root of the running process.', addressSpace(2), { side: true }),
    frame('The same number reaches different physical memory', 'Physical page A and physical page B are different places, labelled symbolically.', addressSpace(3), { side: true }),
  ],
}];

/** Lesson 12.5 (pages/12/05.mdx): wait with a tick budget so the script never retries forever. */
const waitFrame = (label: string, caption: string, state: string, stateHue: 'orange' | 'green' | 'red', ticks: string): CellFrame => frame(label, caption, [
  panel(undefined, 'purple', [row('Script state', [h(state, stateHue, 2, { sub: 'state' }), h(ticks, 'blue', 2, { sub: 'ticks left' })])]),
]);
export const luaWaitCells: readonly CellScenario[] = [
  {
    id: 'confirmed', tab: 'Confirmed',
    title: 'The request is confirmed before the budget runs out',
    summary: 'After one selection request the script waits, counting down 20 ticks.',
    frames: [
      waitFrame('Send one request and wait with 20 ticks', 'The script sends a single selection request and enters Wait.', 'Wait', 'orange', '20'),
      waitFrame('Each unconfirmed update uses one tick', 'Updates that do not confirm the request decrement the counter.', 'Wait', 'orange', '19'),
      waitFrame('Confirmation arrives: back to Observe', 'The request worked, so the script returns to watching.', 'Observe', 'green', '(not needed)'),
    ],
  },
  {
    id: 'timeout', tab: 'Timed out',
    title: 'Nothing confirms the request, so the script stops',
    summary: 'The tick budget turns an endless retry into a clear stop.',
    frames: [
      waitFrame('Send one request and wait with 20 ticks', 'The same start as before.', 'Wait', 'orange', '20'),
      waitFrame('Updates keep failing to confirm', 'The counter counts down toward zero.', 'Wait', 'orange', '… 3, 2, 1'),
      waitFrame('Zero reached: Stop', 'The script stops instead of sending the request endlessly.', 'Stop', 'red', '0'),
    ],
  },
];

/** Lesson 12.7 (pages/12/07.mdx): a tiny stack VM adds 5 and 2. */
const vmFrame = (label: string, caption: string, stack: readonly string[], popped?: readonly string[]): CellFrame => frame(label, caption, [
  panel(undefined, 'blue', [row('Stack: older value, then top', [
    ...stack.map((value, index) => (index === stack.length - 1 ? h : c)(value, 'blue', 1, index === stack.length - 1 ? { sub: popped ? `top · popped ${popped.join(' and ')}` : 'top' } : {})),
    ...Array.from({ length: 2 - stack.length }, () => c('', 'gray', 1, { ghost: true })),
  ])]),
]);
export const vmStackCells: readonly CellScenario[] = [{
  id: 'stack-add', tab: 'Run the program',
  title: 'A stack machine adds 5 and 2',
  summary: 'Constants push values; Add pops two and pushes their sum. The stack is the working memory.',
  frames: [
    vmFrame('Index 0, Constant(0): push 5', 'The stack starts empty; the constant 5 goes on it.', ['5']),
    vmFrame('Index 1, Constant(1): push 2', '2 goes on top of 5.', ['5', '2']),
    vmFrame('Index 2, Add: pop both, push 7', 'Add takes 2 and 5 off the stack and pushes 5 + 2 = 7.', ['7'], ['2', '5']),
  ],
}];

/** Lesson 13.3 (pages/13/03.mdx): evidence maps to a decision, and assessment is not validation. */
const verdict = (label: string, caption: string, evidence: string, decision: string, hue: 'yellow' | 'orange' | 'green'): CellFrame => frame(label, caption, [
  panel(undefined, 'purple', [row('Evidence, then next state', [h(evidence, 'yellow', 2, { sub: 'seen' }), h(decision, hue, 2, { sub: 'next state' })])]),
]);
export const signalDiagnosisCells: readonly CellScenario[] = [{
  id: 'signal-decision', tab: 'From signal to decision',
  title: 'What one signal, a repeat and an explanation call for',
  summary: 'The decisions follow the evidence. Explaining a signal never replaces validation at the state-changing boundary.',
  frames: [
    verdict('One unusual fixture sample', 'A single odd sample is not enough to conclude anything.', 'one unusual sample', 'NeedsAnotherSample', 'yellow'),
    verdict('The same signal repeats', 'A repeat makes it worth finding out why.', 'a repeated signal', 'NeedsDiagnosis', 'orange'),
    frame('The signal is explained: back to Baseline', 'Explaining a signal does not check what the game accepts. Validation still happens where state changes.', [
      panel(undefined, 'purple', [row('Evidence, then next state', [h('an explained signal', 'yellow', 2, { sub: 'seen' }), h('Baseline', 'green', 1, { sub: 'next state' }), c('still validate every change', 'red', 1)])]),
    ]),
  ],
}];

/** Lesson 13.6 (pages/13/06.mdx): two fields and the relation a clamp keeps. */
export const healthLayoutCells: readonly CellScenario[] = [{
  id: 'health-layout', tab: 'Layout and relation',
  title: 'Health and max health: layout and the relation between them',
  summary: 'Two four-byte fields sit side by side. A clamp keeps one value no larger than the other.',
  frames: [
    frame('Two four-byte fields at 0x138 and 0x13C', 'Health occupies 0x138 to 0x13B and max health 0x13C to 0x13F, in this exact build only: recheck after an update.', [
      panel(undefined, 'blue', [row('Object bytes', [h('health', 'green', 4, { sub: '0x138 to 0x13B' }), h('max health', 'teal', 4, { sub: '0x13C to 0x13F' })], { ticks: { left: '0x138', right: '0x13F' } })]),
    ]),
    frame('A clamp relates their values', 'With H for health and M for max health, the clamp keeps 0 ≤ H ≤ M.', [
      panel(undefined, 'purple', [row('Values', [c('0', 'gray'), c('≤', 'purple'), h('H', 'green'), c('≤', 'purple'), h('M', 'teal')])]),
    ]),
  ],
}];

/** Lesson 13.7 (pages/13/07.mdx): matching correlation IDs across log rows. */
const logRow = (seq: number, event: string, corr: number, gen: string, emphasis: 'none' | 'match' | 'bad' | 'ok') => row('', [
  c(String(seq), 'gray'), (emphasis === 'bad' ? h : c)(event, event.startsWith('denied') ? 'red' : event.startsWith('allowed') ? 'green' : 'yellow', 2), (emphasis === 'match' || emphasis === 'bad' ? h : c)(`corr ${corr}`, 'blue'), c(gen, 'gray'),
]);
export const logRowsCells: readonly CellScenario[] = [{
  id: 'correlated-rows', tab: 'Matching IDs',
  title: 'Matching correlation IDs across log rows',
  summary: 'Four rows, two correlation IDs. Following one ID through the log shows what happened to that request.',
  frames: [
    frame('Four rows in the order they were logged', 'Each row has a sequence number, an event, a correlation ID and sometimes a generation.', [
      panel(undefined, 'blue', [logRow(41, 'denied', 7, '', 'none'), logRow(42, 'allowed', 8, '', 'none'), logRow(43, 'state changed', 7, 'gen 13', 'none'), logRow(44, 'state changed', 8, 'gen 14', 'none')]),
    ]),
    frame('Correlation 7 changed state after being denied', 'Rows 41 and 43 share ID 7, so they are one request: denied, yet changed at generation 13. Correlation 8 shows the expected order, allowed then changed.', [
      panel(undefined, 'red', [logRow(41, 'denied', 7, '', 'match'), logRow(43, 'state changed', 7, 'gen 13', 'bad')]),
    ]),
  ],
}];

/** Lesson 14.4 (pages/14/04.mdx): a JTAG chain shares clock and mode lines but passes data in series. */
export const jtagCells: readonly CellScenario[] = [{
  id: 'jtag-chain', tab: 'Scan chain',
  title: 'Two chips on one JTAG chain',
  summary: 'The clock and mode lines go to both chips at once. The data goes through them one after the other.',
  frames: [
    frame('Data runs through the chips in series', 'TDI feeds chip A, chip A feeds chip B, and chip B returns the data on TDO. Each clock moves every bit one place along the chain.', [
      panel(undefined, 'blue', [row('Data path, TDI to TDO', [h('Debugger TDI', 'purple'), h('Chip A', 'blue'), h('Chip B', 'teal'), h('Debugger TDO', 'purple')])]),
    ]),
    frame('TCK and TMS reach both chips in parallel', 'One clock and one mode line branch to every chip, so all of them step together.', [
      panel(undefined, 'orange', [row('TCK and TMS, in parallel', [h('Debugger', 'purple', 2), h('Chip A and Chip B at the same time', 'orange', 2)])]),
    ]),
  ],
}];

/** Lesson 14.5 (pages/14/05.mdx): a PC copies between RAMs; a console shares one. */
export const unifiedMemoryCells: readonly CellScenario[] = [
  {
    id: 'pc', tab: 'PC model',
    title: 'PC: system RAM, a copy, then video RAM',
    summary: 'The CPU and the GPU have separate memories, so data has to be copied from one to the other.',
    frames: [
      frame('The CPU fills a buffer in system RAM', 'The data starts on the CPU’s side.', [
        panel(undefined, 'blue', [row('CPU side, then GPU side', [h('buffer', 'blue', 2, { sub: 'system RAM' }), c('empty', 'gray', 2, { ghost: true, sub: 'video RAM' })])]),
      ]),
      frame('It is copied to video RAM; the GPU reads that copy', 'The copy costs time, and changes the CPU makes afterwards are not seen until the next copy.', [
        panel(undefined, 'blue', [row('CPU side, then GPU side', [c('buffer', 'blue', 2, { sub: 'system RAM' }), h('copy of the buffer', 'green', 2, { sub: 'video RAM · GPU reads here' })], { link: 'copy' })]),
      ]),
    ],
  },
  {
    id: 'console', tab: 'Console model',
    title: 'Console: CPU and GPU share one memory',
    summary: 'On one SoC both processors use the same memory, so one buffer serves both.',
    frames: [
      frame('The CPU writes the shared buffer', 'There is one buffer, in memory both processors can reach.', [
        panel(undefined, 'purple', [row('One SoC', [h('CPU', 'blue', 1, { sub: 'writes' }), c('GPU', 'green', 1), h('shared buffer', 'orange', 2, { sub: 'one memory' })])]),
      ]),
      frame('The GPU reads the same buffer', 'No copy is needed, because both use the same bytes.', [
        panel(undefined, 'purple', [row('One SoC', [c('CPU', 'blue', 1), h('GPU', 'green', 1, { sub: 'reads' }), h('shared buffer', 'orange', 2, { sub: 'no copy' })])]),
      ]),
    ],
  },
];

/** Lesson 14.6 (pages/14/06.mdx): fetch, decode and execute ADD #5. */
const emulatorFrame = (label: string, caption: string, a: string, pc: string, cycles: string, hotCell: 'none' | 'opcode' | 'operand' | 'result'): CellFrame => frame(label, caption, [
  panel(undefined, 'blue', [row('Memory bytes, then CPU registers', [
    (hotCell === 'opcode' ? h : c)('03', 'blue', 1, { sub: 'at 0x04' }), (hotCell === 'operand' ? h : c)('05', 'teal', 1, { sub: 'at 0x05' }),
    (hotCell === 'result' ? h : c)(a, 'yellow', 1, { sub: 'A' }), (hotCell === 'result' || hotCell === 'operand' ? h : c)(pc, 'orange', 1, { sub: 'PC' }), c(cycles, 'gray', 1, { sub: 'cycles' }),
  ])]),
]);
export const emulatorAddCells: readonly CellScenario[] = [{
  id: 'add-fetch', tab: 'Run ADD #5',
  title: 'The toy emulator fetches and runs ADD #5',
  summary: 'Two bytes in memory make one instruction. Fetching reads them; executing changes A and PC and spends cycles.',
  frames: [
    emulatorFrame('Fetch the opcode 03 at PC 0x04', 'A starts at 10. Opcode 03 means ADD with an immediate operand.', '10', '0x04', '0', 'opcode'),
    emulatorFrame('Fetch the operand 05 at 0x05', 'The operand byte follows the opcode.', '10', '0x06', '1', 'operand'),
    emulatorFrame('Execute: A = 10 + 5 = 15', 'PC has advanced to 0x06 and the instruction cost two cycles. The instruction bytes stay in memory.', '15', '0x06', '2', 'result'),
  ],
}];

/** Lesson 14.11 (pages/14/11.mdx): a proportional cycle budget; gold changes 10 to 15 to 20. */
const budgetParts: readonly (readonly [number, Hue])[] = [[2, 'blue'], [12, 'green'], [11, 'orange'], [4, 'teal']];
const budgetFrame = (label: string, caption: string, done: number): CellFrame => frame(label, caption, [
  panel(undefined, 'purple', [
    row('Cycles, drawn to scale', budgetParts.map(([span, hue], index) => index < done ? (index >= done - (done === 2 ? 2 : 1) ? h : c)(`${span}`, hue, span) : c(`${span}`, hue, span, { ghost: true })), { ticks: { left: '0', right: '29 cycles' } }),
  ]),
]);
export const cycleBudgetCells: readonly CellScenario[] = [{
  id: 'cycle-budget', tab: 'Cycle budget',
  title: 'Where 29 cycles go',
  summary: 'The program loads X, loops twice and then shows gold. Each part has a cost in cycles.',
  frames: [
    budgetFrame('LDX and the first loop pass: 2 + 12 = 14', 'Loading X costs 2 cycles; the first pass costs 12 and makes gold 10 + 5 = 15.', 2),
    budgetFrame('Second loop pass: 14 + 11 = 25', 'The second pass is one cycle cheaper and makes gold 15 + 5 = 20.', 3),
    budgetFrame('Display and halt: 25 + 4 = 29', 'The display shows 20 and the program halts after 29 cycles in total.', 4),
  ],
}];

/** Lesson 14.12 (pages/14/12.mdx): reset copies .data from flash to RAM and zeroes .bss. */
const resetFrame = (label: string, caption: string, data: string, bss: string, dataHot: boolean, bssHot: boolean, link: string, withFlash: boolean): CellFrame => frame(label, caption, [
  panel(undefined, 'orange', [
    ...(withFlash ? [row('Flash, 256 KiB', [c('code and vectors', 'blue', 3), h('.data initial value: 7', 'blue', 1)], { ticks: { left: '0x00000000', right: '0x0003FFFF' } })] : []),
    row('SRAM, 64 KiB', [(dataHot ? h : c)(`.data counter ${data}`, 'orange', 2), (bssHot ? h : c)(`.bss counter ${bss}`, 'teal', 2)], { ticks: { left: '0x20000000', right: '0x2000FFFF' }, link }),
  ]),
]);
export const resetDataCells: readonly CellScenario[] = [{
  id: 'reset-startup', tab: 'Reset startup',
  title: 'What startup does before Rust uses its statics',
  summary: 'On reset the RAM is not initialised. Startup copies .data from flash and zero-fills .bss.',
  frames: [
    resetFrame('Startup copies .data from flash', 'After reset SRAM holds unknown bytes (??). Startup first copies the initial value 7 from flash into the .data counter.', '7', '??', true, false, 'copy from flash', true),
    resetFrame('Startup zero-fills .bss: now Rust may use both', 'The .bss counter is filled with zero, so both statics hold their starting values before main runs.', '7', '0', false, true, 'fill with zero', false),
  ],
}];

/** Lesson 15.6 (pages/15/06.mdx): three notifications, one event. */
export const eventCopiesCells: readonly CellScenario[] = [{
  id: 'one-event', tab: 'Counting events',
  title: 'Three notifications can describe one event',
  summary: 'Counting reports is not counting events. Distinct events still need their own evidence.',
  frames: [
    frame('Event A happens once; three reports describe it', 'The game log, a plugin forward and a player reference each mention the one event A.', [
      panel(undefined, 'orange', [
        row('Reports of event A', [h('game log', 'orange'), h('plugin forward', 'orange'), h('player reference', 'orange')]),
        row('What was counted', [c('notifications: 3', 'orange', 2), h('events: 1', 'green', 2)]),
      ]),
    ]),
    frame('A later distinct event B makes two', 'Two distinct events is a different count, but it does not prove they are statistically independent.', [
      panel(undefined, 'blue', [row('Events', [c('event A', 'blue', 2), h('event B', 'teal', 2, { sub: 'events: 2' })])]),
    ]),
  ],
}];

/** Lesson 15.8 (pages/15/08.mdx): protection active spans over an observation window (illustrative). */
const spans = (boot: boolean): CellFrame['panels'] => [
  panel(undefined, 'purple', [
    row('Observation window', [c('before the game', 'gray', 3, { ghost: true }), h('game running', 'blue', 4), c('after the game', 'gray', 3, { ghost: true })], { ticks: { left: 'boot', right: 'end of window' } }),
    boot ? row('Boot-managed protection', [h('active from boot, past the game’s end, to the window’s edge', 'green', 10)]) : row('Session-managed protection', [gap(3), h('active only while the game runs', 'teal', 4), gap(3)]),
  ]),
];
export const protectionSpansCells: readonly CellScenario[] = [{
  id: 'active-spans', tab: 'Active spans',
  title: 'When protection is active, relative to the game',
  summary: 'Illustrative spans, not measured product timelines: one protection starts at boot, the other with the game.',
  frames: [
    frame('Boot-managed protection starts at boot', 'The game runs for part of the window. This protection is active before it starts and after it ends, up to the window’s edge.', spans(true)),
    frame('Session-managed protection follows the game', 'It starts and stops with the game. Both may have kernel privilege while active: they differ in when, not in how privileged.', spans(false)),
  ],
}];
