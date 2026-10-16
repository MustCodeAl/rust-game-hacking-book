// Diagram data (CellFrames scenarios) for lessons in group C3 (pages/4 and pages/5). Import from the lesson MDX; keep each figure small.
// Colours: blue = data, green = accepted or current, red = wrong or stale, purple = rules, yellow = arithmetic, gray = unused.
import { cell as c, frame, hot as h, plain, row, type Cell, type CellScenario } from '../lib/cell-model';

/** Lesson 4.9 (pages/4/07.mdx): a held button fires a level check on every sample and an edge check once. */
export const heldPressCells: readonly CellScenario[] = [{
  id: 'held-press', tab: 'Held or new',
  title: 'A held check and a new-press check, sample by sample',
  summary: 'The six samples are released, released, pressed, pressed, pressed, released. Each check compares what it needs and toggles a lamp when it fires.',
  frames: [
    frame('Sample 3: released before, pressed now', 'The key went down between samples 2 and 3, so both checks fire.', [plain(
      row('', [h('held check: toggle', 'green', 1, { sub: 'pressed now' }), h('new-press check: toggle', 'green', 1, { sub: 'pressed now, released before' })]),
    )]),
    frame('Samples 4 and 5: pressed before, pressed now', 'A held key fires the held check again on each sample. The new-press check sees no change.', [plain(
      row('', [h('held check: toggle', 'red', 1, { sub: 'still pressed' }), c('new-press check: quiet', 'gray', 1, { sub: 'pressed before too' })]),
    )]),
    frame('Sample 6: released. The totals', 'Releasing fires neither check. Over the six samples the held check toggled on samples 3, 4 and 5, the new-press check only on 3.', [plain(
      row('Toggles over six samples', [h('held check: 3 toggles', 'red'), h('new-press check: 1 toggle', 'green')]),
    )]),
  ],
}];

/** Lesson 6.8 (pages/4/12.mdx): a value read before the bookkeeping phase is last frame's copy. */
export const frameVersionCells: readonly CellScenario[] = [{
  id: 'one-frame', tab: 'One frame',
  title: 'A system sees the version it was given',
  summary: 'In frame 7 the ball moves from x = 10 to x = 11. The engine copies positions into the world position only in PostUpdate, near the end of the frame.',
  frames: [
    frame('Update: movement writes x = 11', 'The movement system writes the new position. The world position still holds the copy made in frame 6.', [plain(
      row('', [h('Position x = 11', 'blue', 1, { sub: 'just written' }), c('World position x = 10', 'gray', 1, { sub: 'copied in frame 6' })]),
    )]),
    frame('Update: a later system reads the world position', 'It gets 10, the value from one frame ago, although the position already says 11.', [plain(
      row('', [c('Position x = 11', 'blue'), h('World position x = 10', 'red', 1, { sub: 'read now: one frame old' })]),
    )]),
    frame('PostUpdate copies 11; rendering draws 11', 'The bookkeeping phase updates the world position, so the systems after it and the renderer see 11.', [plain(
      row('', [c('Position x = 11', 'blue'), h('World position x = 11', 'green', 1, { sub: 'drawn at x = 11' })]),
    )]),
  ],
}];

/** Lesson 7.2 (pages/5/02.mdx): one triangle from three vertices to sixteen shaded pixels. */
// Vertices (0, 0), (8, 0) and (0, 4) in pixels, y growing downward. A pixel is covered when its centre (x + 0.5, y + 0.5)
// is inside, which for this triangle means x ÷ 8 + y ÷ 4 ≤ 1. The rows then cover 7, 5, 3 and 1 pixels.
const covered = (x: number, y: number): boolean => (x + 0.5) / 8 + (y + 0.5) / 4 <= 1;
const pixelRow = (y: number): ReturnType<typeof row> => {
  const cells: Cell[] = Array.from({ length: 8 }, (_, x) => covered(x, y) ? c('', 'blue') : c('', 'gray', 1, { ghost: true }));
  return row(y === 0 ? '8 × 4 pixels, row y = 0 at the top' : '', cells);
};
export const trianglePixelCells: readonly CellScenario[] = [{
  id: 'one-triangle', tab: 'One triangle',
  title: 'One triangle, from vertices to pixels',
  summary: 'Each stage hands its result to the next: three vertex records become one triangle, the triangle covers 16 pixel centres, and those fragments are coloured and stored.',
  frames: [
    frame('Vertices, joined by the indices 0, 1, 2', 'Positions are in pixels, with y growing downward. The indices 0, 1, 2 join the three vertices into one triangle.', [
      plain(row('', [c('v0 (0, 0)', 'blue'), c('v1 (8, 0)', 'blue'), c('v2 (0, 4)', 'blue')])),
    ]),
    frame('Rasterize: which pixel centres are inside?', 'A pixel is covered when its centre lies inside the triangle. The slanted edge from v1 to v2 leaves 7, 5, 3 and 1 covered pixels in the four rows: 16 fragments.', [
      plain(...[0, 1, 2, 3].map(pixelRow)),
    ]),
    frame('Colour each fragment, test it, store it', 'The fragment shader colours each fragment. Nothing nearer is stored, so all pass the depth test and 16 framebuffer pixels change.', [plain(
      row('', [c('shade', 'yellow', 1, { sub: 'fragment shader' }), c('test', 'purple', 1, { sub: 'depth: keep' }), h('write', 'green', 1, { sub: '16 pixels' })]),
    )]),
  ],
}];
