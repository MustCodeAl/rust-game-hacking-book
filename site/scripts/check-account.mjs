// Checks the progress merge used by optional sign-in (src/scripts/account.js).
import assert from 'node:assert/strict';
import { mergeProgress } from '../src/scripts/account.js';

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
assert.deepEqual(mergeProgress({ done: [], typing: {}, quiz: {} }, null), { done: [], typing: {}, quiz: {} }, 'an empty cloud row merges cleanly');
console.log('account: progress merge keeps everything from both sides.');
