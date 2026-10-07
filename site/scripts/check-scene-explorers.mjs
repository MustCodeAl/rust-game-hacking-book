import assert from 'node:assert/strict';
import { SCENE_TRACES } from '../src/scripts/scene-traces.js';
import { vennCountsModel } from '../src/scripts/probability-board.js';

const defaults = t => Object.fromEntries(t.inputs.map(i => [i.id, i.value]));
const end = (key, changes = {}) => {
  const t = SCENE_TRACES['scene-' + key];
  return t.run({ ...defaults(t), ...changes }).at(-1).vars;
};
let runs = 0;
for (const [key, t] of Object.entries(SCENE_TRACES)) {
  const combinations = t.inputs.reduce((sets, i) => {
    const values = i.type === 'select' ? i.options.map(o => o.value) : [...new Set([i.min, i.value, i.max])];
    return sets.flatMap(s => values.map(v => ({ ...s, [i.id]: v })));
  }, [{}]);
  for (const values of combinations) {
    const steps = t.run(values); runs++;
    assert.deepEqual(steps, t.run(values), key + ': deterministic');
    assert(steps.length > 1 && steps.length < 80, key);
    assert.deepEqual(steps[0].vars, values, key + ': initial inputs');
    for (const step of steps) {
      assert(Number.isInteger(step.line) && step.line >= 0 && step.line < t.code.length, key);
      assert(step.say.length > 10, key);
      for (const value of Object.values(step.vars)) if (typeof value === 'number') assert(Number.isFinite(value), key);
    }
  }
}
assert.equal(end('bfs-around-wall').moves, 4);
assert.equal(end('bfs-around-wall', { walls: 'clear' }).moves, 2);
assert.equal(end('bfs-around-wall', { walls: 'goal' }).found, false);
assert.equal(end('breakpoint-restore', { order: 'before' }).executed, 0);
assert.equal(end('controlled-experiment').gold, 475);
assert.equal(end('controlled-experiment', { candidate: 'display' }).gold, 50);
assert.equal(end('gsav-loader').computed_sum, 842);
assert.equal(end('gsav-loader', { corrupt: 'yes' }).accepted, false);
assert.equal(end('pattern-scan-window').matches, '1');
assert.equal(end('pattern-scan-window', { pattern: 'last' }).matches, '2');
assert.equal(end('pattern-scan-window', { pattern: 'long' }).last_start, -1);
assert.equal(end('privilege-copy', { status: 'no' }).accepted, false);
assert.equal(end('reset-lamp').presses, 2);
assert.equal(end('reset-lamp').lamp, false);
assert.equal(end('reset-lamp', { samples: 'one' }).lamp, true);
assert.equal(end('source-command-tick').prediction, 1);
assert.equal(end('source-command-tick', { barrier: 'no' }).prediction, 2);
assert.equal(end('source-to-process').live_gold, '0xAF3010');
assert.equal(end('stack-vm-eval').printed, 1);
assert.equal(end('stack-vm-eval', { threshold: 7 }).printed, 0);
assert.equal(end('stack-vm-eval').stack, '[]');
assert.equal(end('validated-pickup').reward, 5);
assert.equal(end('validated-pickup', { schedule: 'split' }).reward, 10);
assert.equal(end('vertex-to-screen').world_y, 7);
for (const key of ['encode-roundtrip-memory', 'xor-rotate-roundtrip']) {
  for (let value = 0; value < 256; value++) for (let rotation = 0; rotation < 32; rotation++) {
    assert.equal(end(key, { value, rotation }).decoded, value); runs++;
  }
}
for (let x = -12; x <= 12; x++) for (let y = -12; y <= 12; y++) for (const heading of ['0','1','2','3']) {
  const result = end('radar-marker', { x, y, heading }); runs++;
  assert(Math.abs(result.length - Math.hypot(x, y)) <= .001);
  assert(Math.hypot(result.marker_x, result.marker_y) <= 8.001);
  assert.equal(result.out_of_range, Math.hypot(x,y) > 8);
}
let probabilityCases = 0;
for (const aOnly of [0,1,4,11,20]) for (const both of [0,1,4,11,20])
for (const bOnly of [0,1,4,11,20]) for (const neither of [0,1,4,11,20]) {
  const m = vennCountsModel({ aOnly, both, bOnly, neither }); probabilityCases++;
  assert.equal(m.either, m.a + m.b - m.both);
  assert.equal(m.either + m.neither, m.total);
  assert.equal(m.pBgivenA, m.a ? both / m.a : null);
  for (const value of [m.pA,m.pB,m.pBoth,m.pEither,m.pBgivenA]) assert(value === null || value >= 0 && value <= 1);
}
console.log(`${Object.keys(SCENE_TRACES).length} scene companions: ${runs} bounded, reversible and geometric cases; ${probabilityCases} probability cases passed.`);
