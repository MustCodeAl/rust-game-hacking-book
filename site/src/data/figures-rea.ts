// Diagram data (CellFrames) for the reverse-engineering technique sections. Keep each figure small.
import { cell as c, frame, hot as h, panel, row, type CellScenario } from '../lib/cell-model';

/** 14.2 Call Tracing and Bounded Logs (pages/7/08.mdx): two unchanged runs give the spread a changed run is read against. */
const traceCounts = [
  { target: '+0x0E7710', a: 212, again: 219, b: 215 },
  { target: '+0x1F0C80', a: 4, again: 4, b: 5 },
  { target: '+0x2A1C30', a: 1, again: 1, b: 1 },
  { target: '+0x3C5E40', a: 0, again: 0, b: 1 },
] as const;

const spreadText = (low: number, high: number): string => (low === high ? `${low}` : `${low} to ${high}`);

export const traceBaselineCells: readonly CellScenario[] = [{
  id: 'trace-baseline', tab: 'Three runs',
  title: 'Two unchanged runs, then one change',
  summary: 'Call counts for four logged targets in wesnoth.exe. Runs A and A′ repeat the same scenario; run B adds one recruit.',
  frames: [
    frame('Fix the scenario before any run', 'Every run uses the same build, the same save and the same logging window. Only the action differs, and only in run B.', [
      panel('The same for every run', 'purple', [
        row('Build', [c('wesnoth.exe, its SHA-256 in the log header', 'purple', 6)]),
        row('Start', [c('the same save: turn 3, four units on the map', 'purple', 6)]),
        row('Window', [c('5 seconds from the first click, at most 1,000 events', 'purple', 6)]),
      ]),
      panel('The action', 'blue', [
        row('Runs A and A′', [c('end the turn', 'blue', 6)]),
        row('Run B', [h('recruit one unit, then end the turn', 'yellow', 6)]),
      ]),
    ]),
    frame('Two unchanged runs give the spread', 'Runs A and A′ did the same thing, yet +0x0E7710 ran 212 and then 219 times: 219 − 212 = 7 calls of difference from timing alone, because the number of frames that fit in 5 seconds varies.', [
      panel('Calls per target in runs A and A′', 'blue', traceCounts.map(count => row(`wesnoth.exe${count.target}`, [
        c(String(count.a), 'blue', 1, { sub: 'A' }),
        c(String(count.again), 'blue', 1, { sub: 'A′' }),
        h(spreadText(Math.min(count.a, count.again), Math.max(count.a, count.again)), 'gray', 2, { sub: 'spread' }),
      ]))),
    ]),
    frame('Read run B against the spread', 'Only two targets leave the spread: +0x1F0C80 ran 5 times against 4, and +0x3C5E40 ran once against never. Those are the two places to break during the next recruit.', [
      panel('Run B compared with the spread', 'blue', traceCounts.map(count => {
        const low = Math.min(count.a, count.again);
        const high = Math.max(count.a, count.again);
        const outside = count.b < low || count.b > high;
        return row(`wesnoth.exe${count.target}`, [
          c(spreadText(low, high), 'gray', 2, { sub: 'A and A′' }),
          (outside ? h : c)(String(count.b), outside ? 'yellow' : 'blue', 1, { sub: 'B' }),
          (outside ? h : c)(outside ? 'outside: a candidate' : 'inside: no evidence', outside ? 'green' : 'gray', 3),
        ]);
      })),
    ]),
    frame('One guess to test next', 'The save had four units and run B had five, and +0x1F0C80 ran 4 and then 5 times. Once per unit at the end of a turn fits, but it stays a guess until a breakpoint shows each call handling a different unit.', [
      panel('+0x1F0C80', 'purple', [
        row('Counts', [c('4 calls with 4 units', 'blue', 3), h('5 calls with 5 units', 'yellow', 3)]),
        row('Guess', [h('called once for each unit when a turn ends', 'purple', 6)]),
        row('Test', [c('break on it in the next run: each hit should receive a different unit', 'green', 6)]),
      ]),
    ]),
  ],
}];
