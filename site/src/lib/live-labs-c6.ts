// Live calculators for lessons in group C6 (pages/12 to pages/15). Each lab is a pure function from its inputs to one cell
// frame (see live-labs.ts for the shape). Colours: blue = data, orange = addresses, green = accepted, red = refused or broken,
// purple = rules, yellow = arithmetic, teal = a second copy, gray = unused.
import { cell as c, frame, hot as h, panel, row, type Cell, type CellFrame } from './cell-model';
import type { LiveLab, LiveValues } from './live-model';

const text = (values: LiveValues, id: string): string => values[id] ?? '';
const num = (value: number): string => value.toLocaleString('en-US');
/** A whole number with a real minus sign, so -15 reads as −15. */
const signed = (value: number): string => (value < 0 ? `−${-value}` : `${value}`);

function integer(values: LiveValues, id: string, label: string, min: number, max: number): number {
  const raw = text(values, id).trim();
  const value = Number(raw);
  if (raw === '' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label}: enter a whole number from ${num(min)} to ${num(max)}.`);
  return value;
}

function hexValue(values: LiveValues, id: string, label: string, digits: number): number {
  const clean = text(values, id).trim().replace(/^0x/i, '').replaceAll('_', '');
  if (!/^[0-9a-f]+$/i.test(clean) || clean.length > digits) throw new Error(`${label}: enter up to ${digits} hexadecimal digits.`);
  return Number.parseInt(clean, 16);
}

const hx = (value: number, digits = 1): string => `0x${value.toString(16).toUpperCase().padStart(digits, '0')}`;

/** Lesson 11.7 (pages/12/06.mdx): the hook budget of 100 calls, with and without a reset each update. */
const HOOK_EVERY = 1000;
const HOOK_LIMIT = 100;
const hookWindow: LiveLab = {
  id: 'lua-hook-window',
  title: 'One instruction budget, two reset windows',
  summary: 'The hook counts one call per 1,000 Lua instructions and raises an error when the count passes 100. Choose when the host sets the count back to 0.',
  inputs: [
    { kind: 'number', id: 'work', label: 'Instructions in each update', min: 0, max: 1000000, step: 1000 },
    { kind: 'number', id: 'updates', label: 'Updates to run (1 to 8)', min: 1, max: 8 },
    { kind: 'choice', id: 'reset', label: 'The count goes back to 0', options: [{ value: 'session', label: 'never (one budget per session)' }, { value: 'update', label: 'at the start of every update' }] },
  ],
  defaults: { work: '30000', updates: '5', reset: 'session' },
  presets: [
    { label: '30,000 per update, never reset', values: { work: '30000', updates: '5', reset: 'session' } },
    { label: 'Same script, reset every update', values: { work: '30000', updates: '5', reset: 'update' } },
    { label: 'Exactly 100,000 per update', values: { work: '100000', updates: '3', reset: 'update' } },
    { label: 'An endless loop', values: { work: '1000000', updates: '3', reset: 'update' } },
  ],
  compute(values): CellFrame {
    const work = integer(values, 'work', 'Instructions in each update', 0, 1000000);
    const updates = integer(values, 'updates', 'Updates to run', 1, 8);
    const reset = text(values, 'reset') === 'update';
    const perUpdate = Math.floor(work / HOOK_EVERY);
    const calls: Cell[] = [];
    const counts: Cell[] = [];
    const carried: number[] = [];
    let count = 0;
    let stoppedIn = 0;
    let lastCall = 0;
    for (let update = 1; update <= updates; update += 1) {
      if (stoppedIn) {
        calls.push(c('not run', 'gray', 1, { ghost: true, sub: `update ${update}` }));
        counts.push(c('–', 'gray', 1, { ghost: true }));
        continue;
      }
      if (reset) count = 0;
      if (count + perUpdate > HOOK_LIMIT) {
        lastCall = HOOK_LIMIT + 1 - count;
        stoppedIn = update;
        calls.push(h(`${lastCall}`, 'red', 1, { sub: `update ${update}` }));
        counts.push(h('101 > 100', 'red', 1, { sub: 'error' }));
        continue;
      }
      count += perUpdate;
      carried.push(count);
      calls.push(c(`${perUpdate}`, 'blue', 1, { sub: `update ${update}` }));
      counts.push(c(`${count}`, 'yellow', 1));
    }
    const fires = `${num(work)} ÷ 1,000 = ${num(perUpdate)}`;
    const history = !reset && carried.length > 1 ? ` Never reset, the count carries over: ${carried.join(', ')}.` : '';
    const caption = stoppedIn
      ? `Each update runs ${num(work)} instructions, so the hook fires ${fires} times.${history} In update ${stoppedIn}, call ${lastCall} makes the count 101, more than 100, so the error stops the script after ${num(lastCall * HOOK_EVERY)} of that update’s instructions.`
      : `Each update runs ${num(work)} instructions, so the hook fires ${fires} times. ${reset ? `The count starts again at 0 every update and never passes 100, so all ${updates} updates finish.` : `Never reset, the count reaches ${count} after ${updates} updates, still not more than 100, so all of them finish.`}`;
    return frame('Hook calls, update by update', caption, [
      panel('Hook calls counted', 'blue', [
        row('Calls in this update', calls),
        row(reset ? 'Count (reset each update)' : 'Count (carried over)', counts, { link: 'add to the count' }),
      ]),
      panel('Result', stoppedIn ? 'red' : 'green', [row('', [h(stoppedIn ? `Stopped in update ${stoppedIn}: instruction budget exceeded` : `All ${updates} updates finished`, stoppedIn ? 'red' : 'green', 4)])]),
    ]);
  },
};

/** Lesson 14.5 (pages/13/01.mdx): one health change and the control that keeps 0 ≤ health ≤ max_health. */
const healthClamp: LiveLab = {
  id: 'damage-clamp-invariant',
  title: 'Apply one health change, then keep 0 ≤ health ≤ max_health',
  summary: 'The game adds the change to health, then its control decides what is stored. Damage is a negative change.',
  inputs: [
    { kind: 'number', id: 'health', label: 'Health now', min: 0, max: 1000 },
    { kind: 'number', id: 'max', label: 'max_health', min: 1, max: 1000 },
    { kind: 'number', id: 'change', label: 'Change (damage is negative)', min: -1000, max: 1000 },
    { kind: 'choice', id: 'clamp', label: 'The control', options: [{ value: 'zero', label: 'max(new, 0): only the lower bound' }, { value: 'both', label: 'clamp to 0 and to max_health' }, { value: 'none', label: 'no control' }] },
  ],
  defaults: { health: '90', max: '100', change: '30', clamp: 'zero' },
  presets: [
    { label: 'Heal 30 at 90, lower bound only', values: { health: '90', max: '100', change: '30', clamp: 'zero' } },
    { label: 'Same heal, both bounds', values: { health: '90', max: '100', change: '30', clamp: 'both' } },
    { label: '20 damage at 5 health', values: { health: '5', max: '100', change: '-20', clamp: 'both' } },
    { label: 'Same damage, no control', values: { health: '5', max: '100', change: '-20', clamp: 'none' } },
  ],
  compute(values): CellFrame {
    const max = integer(values, 'max', 'max_health', 1, 1000);
    const health = integer(values, 'health', 'Health now', 0, 1000);
    if (health > max) throw new Error(`Health now: start inside the invariant, from 0 to max_health (${max}).`);
    const change = integer(values, 'change', 'Change', -1000, 1000);
    const mode = text(values, 'clamp');
    const raw = health + change;
    const stored = mode === 'both' ? Math.min(Math.max(raw, 0), max) : mode === 'zero' ? Math.max(raw, 0) : raw;
    const holds = stored >= 0 && stored <= max;
    const sign = change < 0 ? `− ${-change}` : `+ ${change}`;
    const rule = mode === 'both' ? `min(max(${signed(raw)}, 0), ${max}) = ${signed(stored)}` : mode === 'zero' ? `max(${signed(raw)}, 0) = ${signed(stored)}` : `nothing: ${signed(raw)} is stored`;
    const sum = `${health} ${sign} = ${signed(raw)}`;
    const caption = holds
      ? stored === raw
        ? `${sum} is already between 0 and ${max}, so the control leaves it alone and the health bar shows ${stored}.`
        : `${sum} is outside 0 to ${max}. The control turns it into ${stored}, so the invariant holds and the health bar shows ${stored}.`
      : `${sum}. ${mode === 'zero' ? `max(${raw}, 0) only raises values below 0, and ${raw} is not below 0, so it passes unchanged.` : 'Nothing limits it.'} ${signed(stored)} breaks 0 ≤ health ≤ ${max}, and the health bar copies the broken value.`;
    return frame('Request, control, accepted state', caption, [
      panel('The request', 'blue', [row('health + change', [
        c(`${health}`, 'blue', 1, { sub: 'health now' }), c(sign, 'yellow', 1, { sub: change < 0 ? 'damage' : 'heal' }),
        h(`= ${signed(raw)}`, raw < 0 || raw > max ? 'red' : 'yellow', 2, { sub: 'before the control' }),
      ])]),
      panel('The control', 'purple', [row('Rule applied', [h(rule, 'purple', 4)])]),
      panel('Accepted state', holds ? 'green' : 'red', [
        row('Stored health', [h(signed(stored), holds ? 'green' : 'red', 1, { sub: 'the deciding copy' }), c(`0 ≤ ${signed(stored)} ≤ ${max}: ${holds ? 'holds' : 'broken'}`, holds ? 'green' : 'red', 3)]),
        row('Health bar', [c(`shows ${signed(stored)}`, 'teal', 4, { sub: 'copies the accepted value' })], { link: 'the display follows' }),
      ]),
    ]);
  },
};

/** Lesson 14.7 (pages/13/02.mdx): player 7's checksum, with and without the max_health term. */
const rotl = (value: number, by: number): number => ((value << by) | (value >>> (32 - by))) >>> 0;
const covered = (id: number, health: number, maxHealth: number, generation: number, full: boolean): number =>
  (Math.imul(id, 31) + health + (full ? rotl(maxHealth, 7) : 0) + rotl(generation, 13)) >>> 0;
const checksumCoverage: LiveLab = {
  id: 'player-checksum-coverage',
  title: 'Change a field, then run verify',
  summary: 'The record was sealed as player 7, health 80, max_health 100, generation 3. verify recomputes the checksum from the record now and also tests health ≤ max_health.',
  inputs: [
    { kind: 'number', id: 'health', label: 'health now', min: 0, max: 65535 },
    { kind: 'number', id: 'max', label: 'max_health now', min: 0, max: 65535 },
    { kind: 'choice', id: 'cover', label: 'The checksum covers', options: [{ value: 'short', label: 'player_id, health, generation (no max_health)' }, { value: 'full', label: 'all four fields (covered_checksum)' }] },
  ],
  defaults: { health: '80', max: '60', cover: 'short' },
  presets: [
    { label: 'max_health 100 → 60, short sum', values: { health: '80', max: '60', cover: 'short' } },
    { label: 'max_health 100 → 60, full sum', values: { health: '80', max: '60', cover: 'full' } },
    { label: 'max_health 100 → 90, short sum', values: { health: '80', max: '90', cover: 'short' } },
    { label: 'health 80 → 95, short sum', values: { health: '95', max: '100', cover: 'short' } },
  ],
  compute(values): CellFrame {
    const health = integer(values, 'health', 'health now', 0, 65535);
    const maxHealth = integer(values, 'max', 'max_health now', 0, 65535);
    const full = text(values, 'cover') === 'full';
    const stored = covered(7, 80, 100, 3, full);
    const now = covered(7, health, maxHealth, 3, full);
    const match = now === stored;
    const inRange = health <= maxHealth;
    const pass = match && inRange;
    const changed = [health !== 80 ? 'health' : '', maxHealth !== 100 ? 'max_health' : ''].filter(Boolean);
    const terms = ['217', num(health), ...(full ? [num(rotl(maxHealth, 7))] : []), '24,576'].join(' + ');
    const uncovered = !full && maxHealth !== 100;
    const reasons = [match ? '' : 'ChecksumMismatch', inRange ? '' : 'OutOfRange'].filter(Boolean).join(' and ');
    const caption = `${terms} = ${num(now)}, ${match ? 'equal to' : 'not'} the stored ${num(stored)}${uncovered && match ? ', because max_health is not in the sum' : ''}. ${health} ${inRange ? '≤' : '>'} ${maxHealth}. verify ${pass ? 'passes' : `refuses with ${reasons}`}${pass && changed.length ? `, although ${changed.join(' and ')} changed` : ''}.`;
    const verdict = pass
      ? changed.length ? [h('verify passes', 'green', 2), h(`but ${changed.join(' and ')} changed outside the covered bytes`, 'red', 2)] : [h('verify passes: nothing changed', 'green', 4)]
      : [h(`verify refuses: ${reasons}`, 'red', 4)];
    return frame('Recompute, compare, decide', caption, [
      panel('Recompute from the record now', 'yellow', [
        row('Terms', [
          c('7 × 31 = 217', 'yellow', 2, { sub: 'player_id' }), c(`+ ${num(health)}`, 'yellow', 1, { sub: 'health' }),
          full ? c(`+ ${num(maxHealth)} × 128 = ${num(rotl(maxHealth, 7))}`, 'yellow', 3, { sub: 'max_health' }) : c('not covered', 'gray', 3, { ghost: true, sub: `max_health ${num(maxHealth)}` }),
          c('+ 3 × 8,192 = 24,576', 'yellow', 2, { sub: 'generation' }),
        ]),
        row('Compare', [h(num(now), match ? 'green' : 'red', 3, { sub: 'recomputed now' }), c(match ? '=' : '≠', 'purple', 1), c(num(stored), 'blue', 4, { sub: 'stored when sealed' })], { link: 'add the terms' }),
      ]),
      panel('verify: both clauses', 'purple', [row('Clauses', [h(`checksum ${match ? 'matches' : 'differs'}`, match ? 'green' : 'red', 2), h(`${health} ≤ ${maxHealth}: ${inRange ? 'yes' : 'no'}`, inRange ? 'green' : 'red', 2)])]),
      panel('Result', pass && !changed.length ? 'green' : 'red', [row('', verdict)]),
    ]);
  },
};

/** Lesson 13.4 (pages/14/09.mdx): one guest address through the guest's tables, then the hypervisor's. */
const GUEST_TABLES: ReadonlyMap<number, number> = new Map([[0x403, 0x1F7], [0x404, 0x2A0]]);
const HOST_TABLES: ReadonlyMap<number, number> = new Map([[0x1F7, 0x52E3]]);
const address = (value: number): string => {
  const digits = value.toString(16).toUpperCase().padStart(8, '0');
  return `0x${digits.slice(0, 4)}_${digits.slice(4)}`;
};
const twoStage: LiveLab = {
  id: 'two-stage-translation',
  title: 'Translate a guest address twice',
  summary: 'Guest tables: page 0x403 → frame 0x1F7, page 0x404 → frame 0x2A0. Hypervisor tables: frame 0x1F7 → host frame 0x52E3, and no entry for 0x2A0.',
  inputs: [{ kind: 'hex', id: 'gva', label: 'Guest virtual address (8 hex digits)', digits: 8 }],
  defaults: { gva: '00403A2C' },
  presets: [
    { label: 'The lesson: 0x0040_3A2C', values: { gva: '00403A2C' } },
    { label: 'Same page, last byte', values: { gva: '00403FFF' } },
    { label: 'Next page: 0x0040_4010', values: { gva: '00404010' } },
    { label: 'Unmapped: 0x0040_5000', values: { gva: '00405000' } },
  ],
  compute(values): CellFrame {
    const gva = hexValue(values, 'gva', 'Guest virtual address', 8);
    const page = Math.floor(gva / 0x1000);
    const offset = gva % 0x1000;
    const digits = gva.toString(16).toUpperCase().padStart(8, '0');
    const split = panel('Split the address', 'blue', [row(`page ${hx(page, 3)} · offset ${hx(offset, 3)}`, [...digits].map((digit, index) => index < 5 ? c(digit, 'orange', 1, index === 4 ? { sub: 'page' } : {}) : h(digit, 'blue', 1, index === 7 ? { sub: 'offset' } : {})))]);
    const guestFrame = GUEST_TABLES.get(page);
    if (guestFrame === undefined) {
      return frame('Stage 1 refuses', `The guest’s own tables have no entry for page ${hx(page, 3)}, so the processor raises an ordinary page fault inside the guest. Stage 2 is never consulted.`, [
        split,
        panel('Stage 1: the guest’s tables', 'red', [row('Lookup', [h(`page ${hx(page, 3)}: no entry → page fault in the guest`, 'red', 4)])]),
        panel('Stage 2: the hypervisor’s tables', 'gray', [row('Lookup', [c('not reached', 'gray', 4, { ghost: true })])]),
      ]);
    }
    const gpa = guestFrame * 0x1000 + offset;
    const stage1 = panel('Stage 1: the guest’s tables', 'purple', [
      row('Lookup', [c(`page ${hx(page, 3)}`, 'orange', 2), h(`→ frame ${hx(guestFrame, 3)}`, 'purple', 2)]),
      row('Guest physical', [h(address(gpa), 'purple', 4, { sub: `${hx(guestFrame, 3)} × 0x1000 + ${hx(offset, 3)}` })], { link: 'keep the offset' }),
    ]);
    const hostFrame = HOST_TABLES.get(guestFrame);
    if (hostFrame === undefined) {
      return frame('Stage 2 refuses', `Stage 1 works: page ${hx(page, 3)} → frame ${hx(guestFrame, 3)}, so the guest physical address is ${address(gpa)}. The hypervisor’s tables have no entry for frame ${hx(guestFrame, 3)}, so the processor makes a VM exit instead of reading memory.`, [
        split, stage1,
        panel('Stage 2: the hypervisor’s tables', 'red', [row('Lookup', [h(`frame ${hx(guestFrame, 3)}: no entry → VM exit`, 'red', 4)])]),
      ]);
    }
    const hpa = hostFrame * 0x1000 + offset;
    return frame('Two lookups, one offset', `Offset ${hx(offset, 3)} is the last three hex digits and rides through unchanged. Stage 1 swaps page ${hx(page, 3)} for frame ${hx(guestFrame, 3)}; stage 2 swaps that for host frame ${hx(hostFrame, 4)}, giving ${address(hpa)}.`, [
      split, stage1,
      panel('Stage 2: the hypervisor’s tables', 'green', [
        row('Lookup', [c(`frame ${hx(guestFrame, 3)}`, 'purple', 2), h(`→ host frame ${hx(hostFrame, 4)}`, 'green', 2)]),
        row('Host physical (real RAM)', [h(address(hpa), 'green', 4, { sub: `${hx(hostFrame, 4)} × 0x1000 + ${hx(offset, 3)}` })], { link: 'keep the offset' }),
      ]),
    ]);
  },
};

/** Lesson 13.8 (pages/14/10.mdx): a 4-bit JTAG register shifting toward TDO, one clock at a time. */
const jtagShift: LiveLab = {
  id: 'jtag-shift-clocks',
  title: 'Clock a 4-bit shift register',
  summary: 'On each clock b0 leaves through TDO, every bit moves one place toward TDO, and the TDI bit enters at b3.',
  inputs: [
    { kind: 'bits', id: 'captured', label: 'Captured pin levels, b3 to b0', width: 4 },
    { kind: 'choice', id: 'tdi', label: 'TDI sends, first bit first', options: [{ value: '1100', label: '1, 1, 0, 0 (the lesson)' }, { value: '0000', label: '0, 0, 0, 0' }, { value: '1111', label: '1, 1, 1, 1' }, { value: '1010', label: '1, 0, 1, 0' }] },
    { kind: 'number', id: 'clocks', label: 'Clocks run (0 to 4)', min: 0, max: 4 },
  ],
  defaults: { captured: '1101', tdi: '1100', clocks: '4' },
  presets: [
    { label: 'The lesson: four clocks', values: { captured: '1101', tdi: '1100', clocks: '4' } },
    { label: 'Stop after clock 2', values: { captured: '1101', tdi: '1100', clocks: '2' } },
    { label: 'Pins 0 0 0 0, send 1, 0, 1, 0', values: { captured: '0000', tdi: '1010', clocks: '4' } },
  ],
  compute(values): CellFrame {
    const captured = text(values, 'captured');
    if (!/^[01]{4}$/.test(captured)) throw new Error('Captured pin levels: give four bits, each 0 or 1.');
    const send = text(values, 'tdi');
    if (!/^[01]{4}$/.test(send)) throw new Error('TDI sends: choose one of the patterns.');
    const clocks = integer(values, 'clocks', 'Clocks run', 0, 4);
    let register = [...captured].map(Number);
    const sent = [...send].map(Number);
    const out: number[] = [];
    for (let tick = 0; tick < clocks; tick += 1) {
      out.push(register[3] ?? 0);
      register = [sent[tick] ?? 0, register[0] ?? 0, register[1] ?? 0, register[2] ?? 0];
    }
    const registerCells = register.map((bit, index) => (index === 0 && clocks > 0 ? h : c)(`${bit}`, index < clocks ? 'purple' : 'blue', 1, { sub: `b${3 - index}${index < clocks ? ' · from TDI' : ' · captured'}` }));
    const outCells = [0, 1, 2, 3].map(index => index < out.length ? h(`${out[index]}`, 'orange', 1, { sub: `pin ${index}` }) : c('', 'gray', 1, { ghost: true, sub: 'not yet' }));
    const sentCells = sent.map((bit, index) => index < clocks ? c(`${bit}`, 'purple', 1, { sub: `clock ${index + 1}` }) : c(`${bit}`, 'gray', 1, { ghost: true, sub: 'waiting' }));
    const state = register.join(' ');
    const caption = clocks === 0
      ? `Nothing has shifted yet. b0, next to TDO, holds pin 0’s level, ${register[3]}, so it will leave first.`
      : `TDO received ${out.join(', ')}: pin 0’s level first, because b0 sits next to TDO. The register holds ${state} (b3 to b0)${clocks === 4 ? `: the sent ${sent.join(', ')}, with the first bit in b0.` : ', an in-between pattern. The latches keep driving the old pin levels until Update.'}`;
    return frame(`After ${clocks} clock${clocks === 1 ? '' : 's'}`, caption, [
      panel('TDI sent', 'purple', [row('In order', sentCells)]),
      panel('Shift register', 'blue', [row('b3 b2 b1 b0', registerCells, { ticks: { left: 'TDI enters at b3', right: 'b0 leaves to TDO' } })]),
      panel('TDO received', 'orange', [row('In order', outCells)]),
    ]);
  },
};

export const labsC6: readonly LiveLab[] = [hookWindow, healthClamp, checksumCoverage, twoStage, jtagShift];
