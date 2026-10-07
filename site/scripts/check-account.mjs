// Checks the progress merge used by optional sign-in (src/scripts/account.js).
import assert from 'node:assert/strict';
import { applyProgress, mergeProgress, snapshot } from '../src/scripts/account.js';
import { bubbleRecords, deleteBubble, mergeBubbleRecords, newBubbleId } from '../src/scripts/bubble-records.js';

const local = {
  done: ['pages/1/01', 'pages/1/03'],
  typing: { a: '{"wpm":40,"acc":96}', b: '{"wpm":30,"acc":90}' },
  quiz: { '1.1:q': '{"complete":false,"ids":["x"]}', '1.2:q': '{"complete":true,"ids":["y"]}' },
};
const remote = {
  done: ['pages/1/02', 'pages/1/03'],
  typing: { a: '{"wpm":55,"acc":97}', b: '{"wpm":20,"acc":99}', c: '{"wpm":10,"acc":80}' },
  quiz: { '1.1:q': '{"complete":true,"ids":["z"]}', '1.2:q': '{"complete":false,"ids":["w"]}', '1.3:q': '{"complete":false}' },
};
const merged = mergeProgress(local, remote);
assert.deepEqual(merged.done, ['pages/1/01', 'pages/1/02', 'pages/1/03'], 'finished lessons are unioned');
assert.equal(merged.typing.a, remote.typing.a, 'the faster typing result stays');
assert.equal(merged.typing.b, local.typing.b);
assert.ok(merged.typing.c, 'a result only the cloud has is kept');
assert.equal(merged.quiz['1.1:q'], remote.quiz['1.1:q'], 'a finished attempt beats an unfinished one');
assert.equal(merged.quiz['1.2:q'], local.quiz['1.2:q']);
assert.ok(merged.quiz['1.3:q']);
assert.deepEqual(mergeProgress({ done: [], typing: {}, quiz: {} }, null), { done: [], typing: {}, quiz: {}, notes: {}, bubbles: {}, last: null }, 'an empty cloud row merges cleanly');
const noteLocal = { done: [], typing: {}, quiz: {}, notes: { 'pages/1/01': '{"text":"mine","at":200}', 'pages/1/02': '{"text":"old","at":50}' } };
const noteRemote = { done: [], typing: {}, quiz: {}, notes: { 'pages/1/01': '{"text":"cloud","at":100}', 'pages/1/02': '{"text":"newer cloud","at":300}', 'pages/1/03': '{"text":"only cloud","at":10}' } };
const notes = mergeProgress(noteLocal, noteRemote).notes;
assert.equal(notes['pages/1/01'], noteLocal.notes['pages/1/01'], 'the newer edit of a note wins (local)');
assert.equal(notes['pages/1/02'], noteRemote.notes['pages/1/02'], 'the newer edit of a note wins (cloud)');
assert.ok(notes['pages/1/03'], 'a note only the cloud has is kept');
assert.equal(mergeProgress({ done: [], typing: {}, quiz: {}, notes: {}, last: '{"at":5}' }, { last: '{"at":9}' }).last, '{"at":9}', 'the newer reading position wins');


// Legacy comments acquire stable IDs independently on each device. Timestamp
// collisions and repeated text must not make one delete remove both comments.
const legacy = [
  { at: 42, heading: 'examples', text: 'A legacy comment 😀', kind: 'context' },
  { at: 42, heading: 'examples', text: 'Different comment at the same time', kind: 'mine' },
];
const migrated = bubbleRecords(JSON.stringify(legacy));
assert.equal(migrated.length, 2);
assert.deepEqual(bubbleRecords(legacy.slice().reverse()), migrated, 'legacy IDs do not depend on list order');
assert.deepEqual(bubbleRecords(JSON.stringify(migrated)), migrated, 'migration round trips without changing IDs');
assert.deepEqual(mergeBubbleRecords(legacy, migrated), migrated, 'legacy and migrated copies match');
assert.equal(bubbleRecords([legacy[0], legacy[0]]).length, 2, 'identical legacy records retain separate IDs');
assert.notEqual(bubbleRecords([legacy[0]])[0].id, bubbleRecords([{ ...legacy[0], text: 'A legacy comment 😃' }])[0].id, 'Unicode contributes to the stable ID');
assert.deepEqual(bubbleRecords('malformed'), []);
assert.deepEqual(bubbleRecords([null, {}, { deleted: true, at: 9 }, { text: '  ' }]), [], 'unidentifiable or empty records are ignored');
assert.deepEqual(bubbleRecords({ records: legacy }), migrated, 'record envelope is accepted');
assert.equal(new Set(Array.from({ length: 100 }, newBubbleId)).size, 100, 'new comments receive distinct IDs');

const removed = deleteBubble(migrated[0], 1);
assert.equal(removed.at, 43, 'a deletion is newer even if this clock is behind');
const localComments = [removed, migrated[1]];
const afterStaleMerge = mergeBubbleRecords(localComments, legacy);
assert.equal(afterStaleMerge.filter(record => !record.deleted).length, 1, 'one same-time comment remains');
assert.deepEqual(afterStaleMerge.find(record => record.id === removed.id), removed, 'a stale device cannot resurrect the deleted comment');
assert.deepEqual(mergeBubbleRecords([{ ...migrated[0], at: removed.at }], [removed]), [removed], 'deletion wins an equal timestamp');
assert.deepEqual(mergeBubbleRecords([{ ...migrated[0], text: 'z' }], [{ ...migrated[0], text: 'a' }]), mergeBubbleRecords([{ ...migrated[0], text: 'a' }], [{ ...migrated[0], text: 'z' }]), 'equal-time conflicts converge');

// Exhaustive small merges verify convergence, retained deletions and repeated
// synchronization rather than only copying the implementation's branches.
const variants = [[], [migrated[0]], [migrated[1]], migrated, [removed], localComments,
  [{ ...migrated[0], at: 70, text: 'A newer edit' }],
  [{ id: 'another-device', at: 60, text: 'Concurrent addition', heading: '', kind: 'mine' }]];
let cases = 0;
for (const a of variants) {
  assert.deepEqual(mergeBubbleRecords(a, a), bubbleRecords(a), 'merging a device with itself is idempotent');
  for (const b of variants) {
    assert.deepEqual(mergeBubbleRecords(a, b), mergeBubbleRecords(b, a), 'merge direction does not change comments');
    for (const c of variants) {
      assert.deepEqual(mergeBubbleRecords(mergeBubbleRecords(a, b), c), mergeBubbleRecords(a, mergeBubbleRecords(b, c)), 'three devices converge in either merge order');
      cases++;
    }
  }
}
const cloudBubbles = { 'pages/10/02': JSON.stringify(legacy), 'pages/1/05': JSON.stringify([{ id: 'cloud-only', at: 10, text: 'Another lesson', kind: 'mine' }]) };
const localBubbles = { 'pages/10/02': JSON.stringify([...localComments, { id: 'local-addition', at: 100, text: 'New local comment', kind: 'code' }]) };
const mergedBubbles = mergeProgress({ bubbles: localBubbles }, { bubbles: cloudBubbles });
assert.equal(bubbleRecords(mergedBubbles.bubbles['pages/10/02']).filter(record => !record.deleted).length, 2, 'concurrent additions survive');
assert.ok(mergedBubbles.bubbles['pages/1/05'], 'unrelated lesson comments survive');
assert.deepEqual(mergeProgress({}, {}).bubbles, {}, 'accounts without a comments field remain compatible');

function memoryStorage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    get length() { return items.size; },
    key(index) { return [...items.keys()][index] ?? null; },
    getItem(key) { return items.get(key) ?? null; },
    setItem(key, value) { items.set(key, String(value)); },
  };
}
const storage = memoryStorage({
  'gha-bubbles:pages/10/02': JSON.stringify(legacy),
  'gha-note:pages/10/02': '{"text":"Draft","at":10}',
  'gha-speedtype-existing': '{"wpm":40}', 'gha-comments': 'hide',
});
const initial = snapshot(storage);
assert.deepEqual(bubbleRecords(initial.bubbles['pages/10/02']), migrated, 'snapshot migrates stored legacy comments');
assert.ok(initial.notes['pages/10/02'] && initial.typing.existing, 'existing storage keys stay compatible');
assert.equal('gha-comments' in initial, false, 'appearance preferences stay local');
const events = new EventTarget();
let redraws = 0;
events.addEventListener('gha:progress-sync', () => { redraws++; });
applyProgress(mergedBubbles, storage, events);
assert.equal(redraws, 1, 'apply notifies notes in the same window');
assert.equal(storage.getItem('gha-comments'), 'hide', 'apply preserves local appearance preferences');
const again = mergeProgress(snapshot(storage), { bubbles: cloudBubbles });
assert.deepEqual(again.bubbles, mergedBubbles.bubbles, 'snapshot/apply and a stale sync retain the tombstone');
applyProgress(again, storage, events);
assert.deepEqual(snapshot(storage).bubbles, mergedBubbles.bubbles, 'repeated apply has no duplicates');
assert.doesNotThrow(() => applyProgress(mergedBubbles, { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } }, events), 'refused storage does not crash controls');
console.log(`account: existing progress, legacy IDs, additions, conflicts, deletions, snapshot/apply and ${cases} three-device merge cases pass.`);
