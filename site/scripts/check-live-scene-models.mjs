import assert from 'node:assert/strict';
import bfs, { exploration as bfsExplorer } from '../src/scenes/bfs-around-wall.mjs';
import projection, { exploration as projectionExplorer } from '../src/scenes/world-to-screen.mjs';
import { bfsModel, projectionModel } from '../src/lib/scene/explorers.mjs';
let cases = 0;
const wallKeys = ['wall10', 'wall01', 'wall11', 'wall21'];
const tiles = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
// An all-pairs distance oracle, independent of the production FIFO search.
for (let bits = 0; bits < 16; bits++) {
  const values = Object.fromEntries(wallKeys.map((key, i) => [key, !!(bits & (1 << i))]));
  const blocked = new Set(wallKeys.filter(key => values[key]).map(key => key.slice(4).split('').join(',')));
  const distances = tiles.map((a, i) => tiles.map((b, j) => blocked.has(a.join(',')) || blocked.has(b.join(',')) ? Infinity : i === j ? 0 : Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1 ? 1 : Infinity));
  for (let k = 0; k < 6; k++) for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) distances[i][j] = Math.min(distances[i][j], distances[i][k] + distances[k][j]);
  const result = bfsModel(values), expected = distances[0][2];
  assert.equal(result.found, Number.isFinite(expected));
  assert.equal(result.moves, Number.isFinite(expected) ? expected : null);
  assert.equal(new Set(result.discovered.map(tile => tile.join(','))).size, result.discovered.length, 'each tile is queued once');
  for (const tile of result.path) assert.ok(!blocked.has(tile.join(',')), 'route never enters a wall');
  for (let i = 1; i < result.path.length; i++) assert.equal(Math.abs(result.path[i][0] - result.path[i - 1][0]) + Math.abs(result.path[i][1] - result.path[i - 1][1]), 1);
  const changed = bfsExplorer.build(values);
  assert.ok(changed.scene.cues.length > 1);
  cases++;
}
assert.strictEqual(bfsExplorer.build(bfsExplorer.defaults).scene, bfs, 'default artwork remains authored original');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} versus ${expected}`);
const near = 1, far = 9;
for (const cameraX of [0, 1, 2]) for (const fov of [30, 90, 120]) for (const depth of [0.5, 1, 4, 4.5, 6]) {
  const result = projectionModel({ cameraX, fov, depth });
  const focal = Math.cos(fov * Math.PI / 360) / Math.sin(fov * Math.PI / 360);
  for (const point of [result.nearer, result.farther]) {
    const x = (2 - cameraX) * focal / point.depth, y = focal / point.depth;
    const z = (far + near) / (far - near) - 2 * far * near / ((far - near) * point.depth);
    close(point.ndc[0], x); close(point.ndc[1], y); close(point.ndc[2], z);
    const visible = point.depth >= near && point.depth <= far && Math.abs(x) <= 1 + 1e-9 && Math.abs(y) <= 1 + 1e-9;
    assert.equal(point.accepted, visible);
    if (visible) { close(point.pixel[0], 400 + x * 400); close(point.pixel[1], 400 - y * 400); }
    else assert.equal(point.pixel, null, 'clipped point has no viewport position');
    cases++;
  }
  close(result.nearer.ndc[0] / 2, result.farther.ndc[0]);
  close(result.nearer.ndc[1] / 2, result.farther.ndc[1]);
}
assert.strictEqual(projectionExplorer.build(projectionExplorer.defaults).scene, projection, 'default projection artwork remains authored original');
const worked = projectionModel();
close(worked.nearer.pixel[0], 500); close(worked.nearer.pixel[1], 300);
close(worked.farther.pixel[0], 450); close(worked.farther.pixel[1], 350);
console.log(`live-scene-models: ${cases} independent wall/clip/geometry cases and both original default pictures pass.`);
