// Live calculators for lessons in group C3 (pages/4 and pages/5). Each lab is a pure function from its inputs to one cell
// frame; they register through live-labs.ts. Colours: blue = data, orange = addresses, green = accepted or correct,
// red = refused or wrong, purple = rules, yellow = arithmetic, gray = unused.
import { cell as c, frame, hot as h, panel, row, type Cell, type CellFrame } from './cell-model';
import type { LiveLab, LiveValues } from './live-model';

const text = (values: LiveValues, id: string): string => values[id] ?? '';

function inRange(values: LiveValues, id: string, label: string, min: number, max: number, whole: boolean): number {
  const raw = text(values, id).trim();
  const value = Number(raw);
  const bad = raw === '' || !Number.isFinite(value) || (whole && !Number.isInteger(value)) || value < min || value > max;
  if (bad) throw new Error(`${label}: enter ${whole ? 'a whole number' : 'a number'} from ${shown(min)} to ${shown(max)}.`);
  return value;
}
const whole = (values: LiveValues, id: string, label: string, min: number, max: number): number => inRange(values, id, label, min, max, true);
const decimal = (values: LiveValues, id: string, label: string, min: number, max: number): number => inRange(values, id, label, min, max, false);

/** Rounds away floating-point dust (0.1 × 3 = 0.30000000000000004) before a value is compared or shown. */
const tidy = (value: number): number => Math.round(value * 1e6) / 1e6;
/** A number as the lessons print it: whole numbers plain, others to two places, a real minus sign. */
function shown(value: number, digits = 2): string {
  const rounded = tidy(value);
  const body = Number.isInteger(rounded) ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
  return rounded < 0 && body !== '0' ? `−${body}` : body;
}
/** Milliseconds: exact when three places suffice (15.625), otherwise two (16.67). */
const ms = (value: number): string => Number.isInteger(tidy(value * 1000)) ? shown(value, 3) : value.toFixed(2);
const squared = (value: number): string => value < 0 ? `(${shown(value)})²` : `${shown(value)}²`;
const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

// Lesson 4.5 (pages/4/03.mdx): a 3 × 2 map stored as two layers of one byte per tile, with optional row padding.
const terrain = ['grass', 'water', 'rock', 'tree', 'road', 'grass'] as const;
const sight = ['seen', 'fog', 'seen', 'seen', 'fog', 'seen'] as const;
const gridLayers: LiveLab = {
  id: 'grid-layers',
  title: 'One tile, two layers, one index',
  summary: 'A map 3 tiles wide and 2 tall, stored as two flat layers of one byte per tile. Pick a tile and a row stride: the same index finds the tile in both layers.',
  inputs: [
    { kind: 'number', id: 'x', label: 'Tile x (column)', min: 0, max: 5 },
    { kind: 'number', id: 'y', label: 'Tile y (row)', min: 0, max: 3 },
    { kind: 'choice', id: 'stride', label: 'Row stride', options: [{ value: '3', label: '3 bytes: no padding' }, { value: '4', label: '4 bytes: 1 padding byte' }] },
  ],
  defaults: { x: '2', y: '1', stride: '4' },
  presets: [
    { label: 'Tile (2, 1), rows padded to 4', values: { x: '2', y: '1', stride: '4' } },
    { label: 'Tile (2, 1), no padding', values: { x: '2', y: '1', stride: '3' } },
    { label: 'Off the map: (3, 0)', values: { x: '3', y: '0', stride: '3' } },
  ],
  compute(values): CellFrame {
    const x = whole(values, 'x', 'Tile x', 0, 5);
    const y = whole(values, 'y', 'Tile y', 0, 3);
    const stride = whole(values, 'stride', 'Row stride', 3, 4);
    const inside = x < 3 && y < 2;
    const index = y * stride + x;
    const size = 2 * stride;
    const landedRow = Math.floor(index / stride);
    const landedSlot = index % stride;
    const landedOn = index >= size ? `past the end of the ${size}-byte layer` : landedSlot >= 3 ? 'a padding byte' : `tile (${landedSlot}, ${landedRow})`;
    const layerRows = (name: string, words: readonly string[]) => [0, 1].map(mapRow => row(`${name}, row y = ${mapRow}`, Array.from({ length: stride }, (_, slot): Cell => {
      const at = mapRow * stride + slot;
      const wrongRead = !inside && at === index;
      if (slot >= 3) return wrongRead ? h('pad', 'red', 1, { sub: 'unchecked read' }) : c('pad', 'gray', 1, { ghost: true });
      const word = words[mapRow * 3 + slot] ?? '';
      if (wrongRead) return h(word, 'red', 1, { sub: 'unchecked read' });
      return inside && at === index ? h(word, 'green', 1, { sub: `byte ${at}` }) : c(word, 'blue');
    }), { ticks: { left: `byte ${mapRow * stride}`, right: `byte ${mapRow * stride + stride - 1}` } }));
    const caption = inside
      ? `Skip ${plural(y, 'row', 'rows')} of ${stride} bytes (${y} × ${stride} = ${y * stride}), then move ${x} along: byte ${index}. Both layers keep tile (${x}, ${y}) at that byte.`
      : `The checked conversion returns None. Unchecked, ${y} × ${stride} + ${x} = ${index} would read ${landedOn} instead.`;
    return frame('Index, then the same byte in each layer', caption, [
      panel('Index from (x, y)', 'yellow', [
        row('Bounds x < 3 and y < 2, then y × row stride + x', [
          h(inside ? `(${x}, ${y}) is on the map` : `(${x}, ${y}) is off the map: None`, inside ? 'green' : 'red'),
          h(`${y} × ${stride} + ${x} = ${index}`, inside ? 'yellow' : 'red', 1, { sub: inside ? `byte ${index} in both layers` : `unchecked: ${landedOn}` }),
        ]),
      ]),
      panel('Two layers in memory, one byte per tile', 'blue', [...layerRows('Terrain', terrain), ...layerRows('Visibility', sight)]),
    ]);
  },
};

// Lesson 6.11 (pages/4/08.mdx): a bounded queue while the writer stalls.
const queueStall: LiveLab = {
  id: 'queue-stall',
  title: 'A stalled writer and a bounded queue',
  summary: 'The sampler keeps sending while the writer removes nothing. try_send fills the free slots, then reports Full and the sampler counts a drop instead of waiting.',
  inputs: [
    { kind: 'number', id: 'capacity', label: 'Queue capacity (events)', min: 1, max: 1024 },
    { kind: 'number', id: 'queued', label: 'Already queued when the stall starts', min: 0, max: 1024 },
    { kind: 'choice', id: 'period', label: 'One event every', options: [{ value: '10', label: '10 ms' }, { value: '50', label: '50 ms' }, { value: '100', label: '100 ms' }, { value: '1000', label: '1000 ms' }] },
    { kind: 'number', id: 'stall', label: 'Writer stall (ms)', min: 0, max: 600000 },
  ],
  defaults: { capacity: '128', queued: '0', period: '50', stall: '10000' },
  presets: [
    { label: 'Empty queue, 10 s stall', values: { capacity: '128', queued: '0', period: '50', stall: '10000' } },
    { label: '127 queued, 2 more arrive', values: { capacity: '128', queued: '127', period: '50', stall: '100' } },
    { label: 'A 5 s stall fits', values: { capacity: '128', queued: '0', period: '50', stall: '5000' } },
    { label: 'Sampling every 10 ms', values: { capacity: '128', queued: '0', period: '10', stall: '10000' } },
  ],
  compute(values): CellFrame {
    const capacity = whole(values, 'capacity', 'Queue capacity', 1, 1024);
    const queued = whole(values, 'queued', 'Already queued', 0, 1024);
    if (queued > capacity) throw new Error(`Already queued: a ${capacity}-event queue cannot hold ${queued}.`);
    const period = whole(values, 'period', 'Event period', 1, 1000);
    const stall = whole(values, 'stall', 'Writer stall', 0, 600000);
    const arrivals = Math.floor(stall / period);
    const free = capacity - queued;
    const accepted = Math.min(arrivals, free);
    const dropped = arrivals - accepted;
    const left = free - accepted;
    const caption = dropped > 0
      ? `${arrivals} events arrive but only ${free === 1 ? '1 slot is' : `${free} slots are`} free, so ${arrivals} − ${free} = ${dropped} get Full. Each one adds 1 to dropped; none makes the sampler wait.`
      : `All ${arrivals} events fit in the ${free} free slots, so nothing is dropped. The writer catches up when it resumes.`;
    return frame('Arrivals, free slots, drops', caption, [
      panel('While the writer is stalled', 'yellow', [
        row('Events that arrive and slots that are free', [
          c(`${stall} ms ÷ ${period} ms = ${arrivals}`, 'yellow', 1, { sub: 'events sent' }),
          c(`${capacity} − ${queued} = ${free}`, 'yellow', 1, { sub: 'free slots' }),
        ]),
      ]),
      panel('What try_send does with them', 'blue', [
        row(`Queue: ${capacity} slots`, [
          queued ? c(String(queued), 'blue', 1, { sub: 'queued before' }) : c('0', 'gray', 1, { ghost: true, sub: 'queued before' }),
          accepted ? h(`+${accepted}`, 'blue', 1, { sub: 'Ok: accepted' }) : c('+0', 'gray', 1, { ghost: true, sub: 'Ok: accepted' }),
          c(String(left), 'gray', 1, { ghost: true, sub: 'still free' }),
        ]),
        row('The drop counter', [h(`dropped = ${dropped}`, dropped ? 'red' : 'green', 1, { sub: dropped ? `${dropped} × Full: the log has a gap` : 'every event was kept' })], { link: 'Full adds 1' }),
      ]),
    ]);
  },
};

// Lessons 4.10 and 11.1 (pages/4/09.mdx, pages/4/10.mdx): the guard's three sight checks, cheapest first.
type Wall = { readonly min: readonly [number, number]; readonly max: readonly [number, number] };
const contains = (wall: Wall, x: number, y: number): boolean => x >= wall.min[0] && x <= wall.max[0] && y >= wall.min[1] && y <= wall.max[1];
/** The lab's line_of_sight: a sample every 0.1 units from the guard while the distance travelled is below the target's. */
function firstSampleInside(dx: number, dy: number, step: number, wall: Wall, from: readonly [number, number] = [0, 0]): { readonly hit: number | null; readonly samples: number[][] } {
  const distance = Math.hypot(dx, dy);
  const samples: number[][] = [];
  for (let i = 0; tidy(i * step) < tidy(distance); i++) {
    const travelled = tidy(i * step);
    const point = [tidy(from[0] + dx / distance * travelled), tidy(from[1] + dy / distance * travelled)];
    samples.push(point);
    if (contains(wall, point[0] ?? 0, point[1] ?? 0)) return { hit: samples.length - 1, samples };
  }
  return { hit: null, samples };
}
const sightWall: Wall = { min: [2, -1], max: [3, 1] };
const verdict = (passed: boolean | null): Cell => passed === null ? c('not run', 'gray', 1, { ghost: true }) : passed ? c('pass', 'green') : h('fail', 'red');
const sightChecks: LiveLab = {
  id: 'npc-sight-checks',
  title: 'The guard’s three sight checks',
  summary: 'The guard stands at (0, 0) and faces along x, the direction (1, 0). Move the target or add a wall: the first check that fails stops the rest.',
  inputs: [
    { kind: 'number', id: 'x', label: 'Target x', min: -20, max: 20 },
    { kind: 'number', id: 'y', label: 'Target y', min: -20, max: 20 },
    { kind: 'choice', id: 'wall', label: 'Wall', options: [{ value: 'none', label: 'No wall' }, { value: 'box', label: 'Box from (2, −1) to (3, 1)' }] },
  ],
  defaults: { x: '4', y: '3', wall: 'none' },
  presets: [
    { label: '(4, 3): seen', values: { x: '4', y: '3', wall: 'none' } },
    { label: '(15, 0): too far', values: { x: '15', y: '0', wall: 'none' } },
    { label: '(0, 5): to the side', values: { x: '0', y: '5', wall: 'none' } },
    { label: '(5, 0) behind the wall', values: { x: '5', y: '0', wall: 'box' } },
    { label: '(4, 3) past the wall', values: { x: '4', y: '3', wall: 'box' } },
  ],
  compute(values): CellFrame {
    const x = whole(values, 'x', 'Target x', -20, 20);
    const y = whole(values, 'y', 'Target y', -20, 20);
    const walled = text(values, 'wall') === 'box';
    const sum = x * x + y * y;
    const distance = Math.sqrt(sum);
    const near = distance <= 10;
    const root = Number.isInteger(distance) ? `√${sum} = ${distance}` : `√${sum} ≈ ${shown(distance)}`;
    const zero = sum === 0;
    const dot = zero ? 1 : x / distance;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
    const inCone = near ? (zero ? true : dot >= 0.5) : null;
    const walk = near && !zero && inCone && walled ? firstSampleInside(x, y, 0.1, sightWall) : null;
    const hitPoint = walk && walk.hit !== null ? walk.samples[walk.hit] : undefined;
    const clear = near && !zero && inCone ? !hitPoint : null;
    const seen = near && (zero || (inCone === true && clear === true));
    const coneText = zero ? 'zero offset: no direction, counted as seen' : `(${shown(x / distance)}, ${shown(y / distance)}) · (1, 0) = ${shown(dot)}`;
    const sightText = clear === null ? 'not needed' : !walled ? 'no walls in this example' : hitPoint ? `sample (${shown(hitPoint[0] ?? 0)}, ${shown(hitPoint[1] ?? 0)}) is inside the box` : `${walk?.samples.length ?? 0} samples, none inside the box`;
    const caption = !near
      ? `${shown(distance)} is more than 10, so the cheap distance check rejects the target. The cone and the wall are never tested.`
      : zero
        ? 'The target stands on the guard. A zero offset has no direction, so can_see returns true before the cone and the wall.'
        : !inCone
          ? `The dot product ${shown(dot)} is below 0.5: the target is about ${angle.toFixed(1)}° from the facing, past the 60° limit. Line of sight never runs.`
          : hitPoint
            ? `Distance and cone pass, but a sample on the way lies inside the wall, so line_of_sight returns false.`
            : `${shown(distance)} ≤ 10 and ${shown(dot)} ≥ 0.5 (about ${angle.toFixed(1)}° from the facing), and ${walled ? 'no sample lands inside the wall' : 'nothing blocks the line'}: the guard sees the target.`;
    return frame('Checks in order, then the answer', caption, [
      panel('Three checks, cheapest first', 'purple', [
        row('1. Distance ≤ 10', [c(`√(${squared(x)} + ${squared(y)}) = ${root}`, 'yellow', 3), verdict(near)]),
        row('2. View cone: dot ≥ 0.5', [c(near ? coneText : 'not needed', near ? 'yellow' : 'gray', 3, near && !zero ? { sub: `about ${angle.toFixed(1)}° from the facing; 0.5 stands for 60°` } : {}), verdict(inCone)]),
        row('3. Line of sight', [c(sightText, clear === null ? 'gray' : 'yellow', 3), verdict(clear)]),
      ]),
      panel(undefined, seen ? 'green' : 'red', [row('Result', [h(seen ? 'The guard sees the target' : `Not seen: check ${!near ? 1 : !inCone ? 2 : 3} failed`, seen ? 'green' : 'red')])]),
    ]);
  },
};

// Lesson 11.1 (pages/4/10.mdx): the tick-8 sight walk from (4, 0) to (8, 0) and the step's blind spot.
const oneDecimal = (value: number): string => tidy(value).toFixed(1);
const sightWalk: LiveLab = {
  id: 'sight-walk',
  title: 'Walk the sight line one sample at a time',
  summary: 'The guard at (4, 0) tests points toward the player at (8, 0). A wall spans y from −1 to 1; set where it starts and ends along x, and the step between samples.',
  inputs: [
    { kind: 'number', id: 'from', label: 'Wall starts at x', min: 4, max: 8, step: 0.01 },
    { kind: 'number', id: 'to', label: 'Wall ends at x', min: 4, max: 8, step: 0.01 },
    { kind: 'choice', id: 'step', label: 'Step between samples', options: [{ value: '0.1', label: '0.1 (the lab)' }, { value: '0.5', label: '0.5' }, { value: '1', label: '1.0' }] },
  ],
  defaults: { from: '5.5', to: '6.5', step: '0.1' },
  presets: [
    { label: 'Tick 8: wall 5.5 to 6.5', values: { from: '5.5', to: '6.5', step: '0.1' } },
    { label: 'A thin wall: 5.62 to 5.68', values: { from: '5.62', to: '5.68', step: '0.1' } },
    { label: 'Step 1.0, wall 6.2 to 6.7', values: { from: '6.2', to: '6.7', step: '1' } },
  ],
  compute(values): CellFrame {
    const from = decimal(values, 'from', 'Wall starts at x', 4, 8);
    const to = decimal(values, 'to', 'Wall ends at x', 4, 8);
    if (to < from) throw new Error('Wall ends at x: give a value no smaller than where the wall starts.');
    const step = decimal(values, 'step', 'Step', 0.1, 1);
    const wall: Wall = { min: [from, -1], max: [to, 1] };
    const { hit, samples } = firstSampleInside(4, 0, step, wall, [4, 0]);
    const xs = samples.map(point => point[0] ?? 0);
    const all = hit === null ? xs : Array.from({ length: Math.round(4 / step) }, (_, i) => tidy(4 + i * step));
    const width = tidy(to - from);
    if (hit !== null) {
      const at = xs[hit] ?? 4;
      const untested = all.length - hit - 1;
      return frame('The walk stops at the first sample inside', `Samples land every ${oneDecimal(step)} from x 4.0. The first one inside the wall is x ${oneDecimal(at)}, so the walk stops after ${hit + 1} of ${all.length} samples.`, [
        panel('Samples on y = 0, guard at x 4, player at x 8', 'blue', [
          row('Each sample, in order', [
            hit ? c(`${hit} clear`, 'green', 2, { sub: `x 4.0 to ${oneDecimal(xs[hit - 1] ?? 4)}` }) : c('0 clear', 'gray', 2, { ghost: true }),
            h(`x ${oneDecimal(at)}`, 'red', 1, { sub: 'inside: stop' }),
            untested ? c(`${untested} never tested`, 'gray', 2, { ghost: true, sub: `x ${oneDecimal(all[hit + 1] ?? 8)} to ${oneDecimal(all[all.length - 1] ?? 8)}` }) : c('none left', 'gray', 2, { ghost: true }),
          ]),
          row(`Bounds check at x ${oneDecimal(at)}`, [c(`${shown(from)} ≤ ${shown(at)} ≤ ${shown(to)}`, 'yellow'), c('−1 ≤ 0 ≤ 1', 'yellow'), h('inside', 'red')]),
        ]),
        panel(undefined, 'green', [row('Result', [h('Blocked: line_of_sight returns false', 'green')])]),
      ]);
    }
    const before = [...xs].reverse().find(value => value < from);
    const after = xs.find(value => value > to);
    return frame('Every sample misses the wall', `The wall is ${shown(width)} wide, less than the ${oneDecimal(step)} step, so it fits between ${before === undefined ? 'samples' : `x ${oneDecimal(before)}`} and ${after === undefined ? 'the player at x 8.0' : `x ${oneDecimal(after)}`}. No sample lands inside.`, [
      panel('Samples on y = 0, guard at x 4, player at x 8', 'blue', [
        row('Each sample, in order', [c(`all ${xs.length} clear`, 'green', 1, { sub: `x 4.0 to ${oneDecimal(xs[xs.length - 1] ?? 4)}` })]),
        row('The samples next to the wall', [
          c(before === undefined ? 'none' : `x ${oneDecimal(before)}`, 'blue', 1, { sub: 'before the wall' }),
          h(`wall ${shown(from)} to ${shown(to)}`, 'red', 1, { sub: `${shown(width)} wide` }),
          c(after === undefined ? 'player 8.0' : `x ${oneDecimal(after)}`, 'blue', 1, { sub: 'after the wall' }),
        ]),
      ]),
      panel(undefined, 'red', [row('Result', [h('Missed: the guard sees through the wall', 'red')])]),
    ]);
  },
};

// Lesson 6.8 (pages/4/12.mdx): how many fixed steps each drawn frame runs.
const fixedSteps: LiveLab = {
  id: 'fixed-steps',
  title: 'Fixed steps inside drawn frames',
  summary: 'Each frame adds its length to the time the game owes; a fixed step runs each time a whole step’s worth has built up. Change the frame rate and follow 12 frames.',
  inputs: [
    { kind: 'number', id: 'fps', label: 'Frames drawn per second', min: 1, max: 1000 },
    { kind: 'choice', id: 'rate', label: 'Fixed steps per second', options: [{ value: '30', label: '30' }, { value: '60', label: '60' }, { value: '64', label: '64 (Bevy’s default)' }] },
  ],
  defaults: { fps: '144', rate: '60' },
  presets: [
    { label: '144 frames a second', values: { fps: '144', rate: '60' } },
    { label: '30 frames a second', values: { fps: '30', rate: '60' } },
    { label: '60 frames a second', values: { fps: '60', rate: '60' } },
    { label: '240 frames a second', values: { fps: '240', rate: '60' } },
    { label: '45: uneven', values: { fps: '45', rate: '60' } },
  ],
  compute(values): CellFrame {
    const fps = whole(values, 'fps', 'Frames per second', 1, 1000);
    const rate = whole(values, 'rate', 'Fixed steps per second', 1, 1000);
    // Count time in units of 1 / (fps × rate) seconds: a frame adds `rate` units and a step uses `fps` units, all exact.
    let owed = 0;
    const steps = Array.from({ length: 12 }, () => {
      owed += rate;
      const run = Math.floor(owed / fps);
      owed -= run * fps;
      return run;
    });
    const total = steps.reduce((sum, run) => sum + run, 0);
    const stepCell = (run: number): Cell => run === 0 ? c('0', 'gray', 1, { ghost: true }) : h(String(run), 'blue');
    const counts = new Map<number, number>();
    for (const run of steps) counts.set(run, (counts.get(run) ?? 0) + 1);
    const pattern = [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([run, frames]) => `${frames} ${frames === 1 ? 'frame runs' : 'frames run'} ${run === 0 ? 'none' : run === 1 ? '1 step' : `${run} steps`}`);
    const caption = total === 0
      ? `No step runs in these 12 frames: together they last ${ms(12000 / fps)} ms, less than one ${ms(1000 / rate)} ms step.`
      : counts.size === 1
      ? `Every frame runs ${plural(steps[0] ?? 0, 'step', 'steps')}: each ${ms(1000 / fps)} ms frame owes ${steps[0] ?? 0} × ${ms(1000 / rate)} ms of game time.`
      : `A step runs only when ${ms(1000 / rate)} ms have built up, so ${pattern.join(' and ')}. The leftover time carries into the next frame.`;
    return frame('Step length, frame length, steps per frame', caption, [
      panel('Two clocks', 'yellow', [row('Step and frame length', [
        c(`1000 ÷ ${rate} = ${ms(1000 / rate)} ms`, 'yellow', 1, { sub: 'one fixed step' }),
        c(`1000 ÷ ${fps} = ${ms(1000 / fps)} ms`, 'yellow', 1, { sub: 'one drawn frame' }),
      ])]),
      panel('Fixed steps run in each of 12 frames', 'blue', [
        row('Steps in frames 1 to 6', steps.slice(0, 6).map(stepCell)),
        row('Steps in frames 7 to 12', steps.slice(6).map(stepCell)),
        row('Over the 12 frames', [h(plural(total, 'step', 'steps'), 'green', 1, { sub: `12 × ${ms(1000 / fps)} = ${ms(12000 / fps)} ms of drawing` })]),
      ]),
    ]);
  },
};

// Lesson 7.11 (pages/5/11.mdx): which vertices DrawIndexed fetches from a bound index buffer.
const indexBuffer = [0, 1, 2, 2, 1, 3] as const;
const drawIndexedFetch: LiveLab = {
  id: 'draw-indexed-fetch',
  title: 'Which vertices does DrawIndexed fetch?',
  summary: 'The bound index buffer holds six indices: two triangles that share an edge. Change the three arguments and follow each index to the vertex the GPU reads.',
  inputs: [
    { kind: 'number', id: 'count', label: 'index_count', min: 0, max: 6 },
    { kind: 'number', id: 'start', label: 'start_index_location', min: 0, max: 6 },
    { kind: 'number', id: 'base', label: 'base_vertex_location (i32)', min: -10, max: 10 },
  ],
  defaults: { count: '3', start: '3', base: '4' },
  presets: [
    { label: 'DrawIndexed(3, 3, 4)', values: { count: '3', start: '3', base: '4' } },
    { label: 'DrawIndexed(6, 0, 0)', values: { count: '6', start: '0', base: '0' } },
    { label: 'A negative base: (3, 3, −1)', values: { count: '3', start: '3', base: '-1' } },
  ],
  compute(values): CellFrame {
    const count = whole(values, 'count', 'index_count', 0, 6);
    const start = whole(values, 'start', 'start_index_location', 0, 6);
    const base = whole(values, 'base', 'base_vertex_location', -10, 10);
    if (start + count > indexBuffer.length) throw new Error(`The buffer holds 6 indices: start_index_location + index_count must be at most 6, not ${start} + ${count} = ${start + count}.`);
    const read = indexBuffer.slice(start, start + count);
    const fetched = read.map(index => index + base);
    const baseText = base < 0 ? `(${shown(base)})` : String(base);
    const invalid = fetched.some(vertex => vertex < 0);
    const triangles = Math.floor(count / 3);
    const caption = count === 0
      ? 'index_count 0 reads nothing, so nothing is drawn.'
      : `Read ${count} ${count === 1 ? 'index' : 'indices'} from position ${start}: ${read.join(', ')}. Adding ${shown(base)} to each ${invalid ? 'asks for' : 'fetches'} vertices ${fetched.map(vertex => shown(vertex)).join(', ')}${invalid ? ', and a negative number names no vertex' : ''}.${base < 0 ? ` Logged as u32, ${shown(base)} would print as ${(2 ** 32 + base).toLocaleString('en-US')}.` : ''}`;
    return frame('Indices read, base added, vertices fetched', caption, [
      panel('Bound index buffer', 'blue', [row('Six indices', indexBuffer.map((index, position) => position >= start && position < start + count ? h(String(index), 'blue') : c(String(index), 'gray', 1, { ghost: true })), { ticks: { left: 'position 0', right: 'position 5' } })]),
      panel(`DrawIndexed(${count}, ${start}, ${shown(base)})`, 'yellow', count === 0 ? [row('Vertices fetched', [c('none', 'gray', 1, { ghost: true })])] : [
        row('Vertices fetched: index + base', fetched.map((vertex, i) => vertex < 0 ? h(shown(vertex), 'red', 1, { sub: `${read[i]} + ${baseText}` }) : h(String(vertex), 'green', 1, { sub: `${read[i]} + ${baseText}` })), { link: `add ${shown(base)} to each` }),
        row('Triangles submitted', [c(count % 3 ? `${count} ÷ 3: ${plural(triangles, 'triangle', 'triangles')}, ${count % 3} left over` : `${count} ÷ 3 = ${plural(triangles, 'triangle', 'triangles')}`, 'yellow')]),
      ]),
    ]);
  },
};

export const labsC3: readonly LiveLab[] = [gridLayers, queueStall, sightChecks, sightWalk, fixedSteps, drawIndexedFetch];
