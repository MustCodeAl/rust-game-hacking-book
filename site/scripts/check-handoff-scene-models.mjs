import assert from 'node:assert/strict';
import { authorityModel, inputWindowModel, correlationModel, edgeModel } from '../src/lib/scene/defence-explorers.ts';
import { playerSpec, valuesAt } from '../src/lib/scene/engine.ts';
let cases = 0;
for (const score of [0, 3, 10]) for (const claim of [0, 4, 99, 100]) for (const available of [false, true]) for (const reachesCoin of [false, true]) {
  const model = authorityModel({ score, claim, available, reachesCoin });
  assert.equal(model.after, score + Number(available && reachesCoin));
  assert.equal(model.after, authorityModel({ score, claim: 100 - claim, available, reachesCoin }).after, 'claimed score cannot award points');
  cases++;
}
// Independent bit-mask oracle: bit i is a fresh press exactly when it is set
// and its predecessor (the shifted mask, including the preceding state) is not.
for (let bits = 0; bits < 32; bits++) for (const prior of [false, true]) {
  const values = { prior, ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`sample${i}`, !!(bits & 1 << i)])) };
  const model = inputWindowModel(values);
  const edges = bits & ~((bits << 1) | Number(prior));
  const popcount = n => n.toString(2).replace(/0/g, '').length;
  assert.equal(model.count, popcount(edges));
  assert.equal(model.held, popcount(bits));
  assert.equal(model.rounds.at(-1).count, model.count);
  cases++;
}
const counts = [
  [true, true, true, 1, 2], [true, true, false, 1, 1],
  [false, true, true, 2, 2], [false, true, false, 2, 2],
  [true, false, true, 2, 3], [true, false, false, 2, 2],
  [false, false, true, 3, 3], [false, false, false, 3, 3],
];
for (const [pluginA, reportA, laterB, first, final] of counts) {
  const model = correlationModel({ pluginA, reportA, laterB });
  assert.equal(model.first.length, first); assert.equal(model.final.length, final);
  assert.ok(model.final.length >= model.first.length);
  cases++;
}
for (const before of [0, 120, 200]) for (const after of [0, 145, 200]) for (const menuBefore of [false, true]) for (const menuAfter of [false, true]) {
  const model = edgeModel({ before, after, menuBefore, menuAfter });
  assert.equal(model.delta, after - before);
  assert.equal(model.events.length, Number(before !== after) + Number(menuBefore !== menuAfter));
  const next = edgeModel({ before: after, after, menuBefore: menuAfter, menuAfter });
  assert.deepEqual(next.events, [], 'accepted baseline suppresses repeated events');
  cases++;
}
for (const name of ['server-authority', 'detector-input-window', 'evidence-correlation', 'edge-events']) {
  const { default: worked, exploration } = await import(`../src/scenes/${name}.ts`);
  assert.strictEqual(exploration.build(exploration.defaults).scene, worked);
  for (const field of exploration.fields) {
    const values = { ...exploration.defaults, [field.key]: field.type === 'checkbox' ? !field.start : field.min === field.start ? field.max : field.min };
    const { scene } = exploration.build(values), spec = playerSpec(scene);
    assert.ok(scene.cues.length > 1);
    for (const actor of spec.a) for (const at of [0, spec.d / 2, spec.d]) {
      const value = valuesAt(actor, at);
      for (const key of ['x', 'y', 'o']) if (key in value) assert.ok(Number.isFinite(value[key]));
    }
    cases++;
  }
}
console.log(`handoff-scene-models: ${cases} independent authority/press/identity/edge cases; all four original defaults and finite changed tracks pass.`);
