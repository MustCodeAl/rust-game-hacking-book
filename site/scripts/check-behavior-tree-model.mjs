import assert from 'node:assert/strict';
import {
	createBehaviorTree, editBehaviorTree, tickBehaviorTree, validateBehaviorTree, TREE_LIMITS,
} from '../src/scripts/behavior-tree-model.js';
import { behaviorTreeModel } from '../src/scripts/sim-labs.js';
import { FORMULAS, finishFormulaResult, workedExample } from '../src/scripts/formula-builder.js';

let checks = 0;
const same = (actual, expected, reason) => { assert.deepEqual(actual, expected, reason); checks += 1; };
const blackboard = { health: 30, seen: 3, distance: 1, memory: true, running: true };
const tick = (tree, changes = {}) => tickBehaviorTree(tree, { ...blackboard, ...changes });
const edit = (tree, operation) => {
	const result = editBehaviorTree(tree, operation);
	assert.equal(result.ok, true, result.error || JSON.stringify(operation));
	checks += 1;
	return result.tree;
};
const rejected = (tree, operation, fragment) => {
	const before = JSON.stringify(tree), result = editBehaviorTree(tree, operation);
	same(result.ok, false, 'invalid edits are refused');
	assert.match(result.error, fragment); checks += 1;
	same(JSON.stringify(tree), before, 'refused edits leave the worked tree intact');
	same(result.tree, tree, 'the previous tree remains usable');
};

const original = createBehaviorTree();
same(validateBehaviorTree(original), null, 'the worked default is a valid tree');
const cases = [
	[{ health: 20 }, 'flee'], [{ health: 25 }, 'flee'], [{ health: 26 }, 'attack'],
	[{ distance: 1.5 }, 'attack'], [{ distance: 1.5001 }, 'chase'],
	[{ seen: 2 }, 'search'], [{ seen: 3 }, 'attack'],
	[{ seen: 0, memory: false }, 'patrol'], [{ seen: 0, memory: true }, 'search'],
];
for (const [inputs, action] of cases) {
	const result = tick(original, inputs);
	same(result.action, action, `lesson decision at ${JSON.stringify(inputs)}`);
	same(result.status, 'running', 'the chosen action is still running');
	same(result.error, null, 'valid inputs do not report an error');
}
same(behaviorTreeModel({ ...blackboard, health: 20, combatFirst: true }).action, 'attack', 'existing priority input still changes the first action');
same(tick(original, { running: false }).status, 'success', 'a finished action propagates success');
same(tick(original, { health: 20 }).statuses.combat, undefined, 'flee short-circuits the later combat branch');
same(tick(original, { seen: 2 }).statuses.range, undefined, 'failed sight check does not read distance');
same(tick(original, { running: false }).statuses.chase, undefined, 'successful attack skips chase');

let changed = edit(original, { type: 'update', id: 'health', changes: { limit: 40 } });
same(tick(changed).action, 'flee', 'editing a condition changes the decision');
same(tick(original).action, 'attack', 'accepted edits also preserve the original tree');
changed = edit(original, { type: 'update', id: 'combat', changes: { type: 'selector' } });
same(tick(changed).action, null, 'a selector can stop at a successful condition without executing an action');
same(tick(changed).statuses.choice, undefined, 'changed composite semantics affect traversal, not only labels');
same(tick(changed).status, 'success', 'successful condition status reaches the root');

changed = edit(original, { type: 'update', id: 'attack', changes: { outcome: 'failure' } });
same(tick(changed).action, 'chase', 'failed attack falls through to chase');
same(tick(changed).statuses.attack, 'failure', 'the failed action remains in the trace');
changed = edit(changed, { type: 'update', id: 'chase', changes: { outcome: 'failure' } });
same(tick(changed).action, 'search', 'both failed combat actions move to the next root branch');
changed = edit(changed, { type: 'update', id: 'search-action', changes: { outcome: 'failure' } });
changed = edit(changed, { type: 'update', id: 'patrol', changes: { outcome: 'failure' } });
same(tick(changed).status, 'failure', 'all failed branches make the root fail');
same(tick(changed).action, null, 'failure does not claim a selected action');

changed = edit(original, { type: 'disconnect', parent: 'root', child: 'flee' });
same(tick(changed, { health: 20 }).action, 'attack', 'detaching flee makes low-health combat reachable');
same(tick(changed, { health: 20 }).statuses.health, undefined, 'a detached guard is not read');
changed = edit(changed, { type: 'connect', parent: 'root', child: 'flee' });
same(tick(changed, { health: 20 }).action, 'attack', 'reconnecting last changes priority');
for (let i = 0; i < 3; i += 1) changed = edit(changed, { type: 'move', parent: 'root', child: 'flee', direction: -1 });
same(tick(changed, { health: 20 }).action, 'flee', 'moving an edge changes the priority checked');
changed = edit(changed, { type: 'disconnect', parent: 'root', child: 'flee' });
changed = edit(changed, { type: 'connect', parent: 'combat', child: 'flee' });
same(tick(changed, { health: 20 }).action, 'attack', 'a reparented branch is skipped after a running earlier child');
same(tick(changed, { health: 20, running: false }).action, 'flee', 'the same sequence reaches the reparented branch after success');

let added = editBehaviorTree(original, { type: 'add', node: { type: 'action', action: 'patrol', outcome: 'running' } });
same(added.ok, true, 'a new action can be added');
same(tick(added.tree).statuses[added.selected], undefined, 'new detached nodes do not run');
let withAction = edit(added.tree, { type: 'connect', parent: 'root', child: added.selected });
for (let i = 0; i < 4; i += 1) withAction = edit(withAction, { type: 'move', parent: 'root', child: added.selected, direction: -1 });
same(tick(withAction).action, 'patrol', 'a newly connected first action is actually executed');
same(tick(withAction).statuses.health, undefined, 'new first action short-circuits the old tree');
withAction = edit(withAction, { type: 'disconnect', parent: 'root', child: added.selected });
withAction = edit(withAction, { type: 'remove', id: added.selected });
same(tick(withAction).action, 'attack', 'deleting a detached addition preserves the worked result');

const sequence = { root: 'root', nodes: [
	{ id: 'root', type: 'sequence', label: 'test sequence', children: ['first', 'second'] },
	{ id: 'first', type: 'action', action: 'search', outcome: 'success', children: [] },
	{ id: 'second', type: 'action', action: 'patrol', outcome: 'success', children: [] },
] };
same(tick(sequence).trace.filter(item => item.id !== 'root').map(item => item.id), ['first', 'second'], 'sequence visits successful children in order');
same(tick(sequence).action, 'patrol', 'completed sequence reports its last action');
same(tick(sequence).status, 'success', 'all successful children complete a sequence');
const interrupted = edit(sequence, { type: 'update', id: 'first', changes: { outcome: 'running' } });
same(tick(interrupted).statuses.second, undefined, 'running stops a sequence before its next child');
same(tick(interrupted).action, 'search', 'running propagates the current action');
const empty = { root: 'root', nodes: [{ id: 'root', type: 'selector', label: 'empty', children: [] }] };
same(tick(empty).status, 'failure', 'an empty selector fails');
same(tick(edit(empty, { type: 'update', id: 'root', changes: { type: 'sequence' } })).status, 'success', 'an empty sequence succeeds without inventing an action');

rejected(original, { type: 'connect', parent: 'root', child: 'attack' }, /one parent|Disconnect/);
rejected(original, { type: 'connect', parent: 'flee', child: 'root' }, /root cannot/);
rejected(original, { type: 'connect', parent: 'attack', child: 'root' }, /selector or sequence/);
rejected(original, { type: 'remove', id: 'root' }, /root stays/);
rejected(original, { type: 'remove', id: 'combat' }, /Disconnect/);
rejected(original, { type: 'move', parent: 'root', child: 'flee', direction: -1 }, /already/);
rejected(original, { type: 'update', id: 'health', changes: { limit: NaN } }, /between/);
rejected(original, { type: 'update', id: 'seen', changes: { limit: 2.5 } }, /whole numbers/);

let forest = edit(empty, { type: 'add', node: { type: 'selector', label: 'detached a' } });
forest = edit(forest, { type: 'add', node: { type: 'sequence', label: 'detached b' } });
forest = edit(forest, { type: 'connect', parent: 'edited-1', child: 'edited-2' });
rejected(forest, { type: 'connect', parent: 'edited-2', child: 'edited-1' }, /cycle/);

let full = original;
while (full.nodes.length < TREE_LIMITS.nodes) full = edit(full, { type: 'add', node: { type: 'action', action: 'patrol', outcome: 'success' } });
rejected(full, { type: 'add', node: { type: 'action', action: 'patrol', outcome: 'success' } }, /24/);
let wide = empty;
for (let i = 0; i < TREE_LIMITS.children; i += 1) {
	const addition = editBehaviorTree(wide, { type: 'add', node: { type: 'action', action: 'patrol', outcome: 'failure' } });
	same(addition.ok, true, 'a bounded sibling can be created');
	wide = edit(addition.tree, { type: 'connect', parent: 'root', child: addition.selected });
}
added = editBehaviorTree(wide, { type: 'add', node: { type: 'action', action: 'patrol', outcome: 'success' } });
rejected(added.tree, { type: 'connect', parent: 'root', child: added.selected }, /8 different children/);
let deep = empty, parent = 'root';
for (let i = 1; i < TREE_LIMITS.depth; i += 1) {
	const addition = editBehaviorTree(deep, { type: 'add', node: { type: 'selector', label: 'deeper' } });
	same(addition.ok, true, 'a bounded depth node can be created');
	deep = edit(addition.tree, { type: 'connect', parent, child: addition.selected }); parent = addition.selected;
}
added = editBehaviorTree(deep, { type: 'add', node: { type: 'selector', label: 'too deep' } });
rejected(added.tree, { type: 'connect', parent, child: added.selected }, /8 nodes deep/);

for (const invalid of [{ health: NaN }, { distance: Infinity }, { distance: -1 }, { seen: 1.5 }, { memory: 'yes' }]) {
	same(tick(original, invalid).trace, [], 'invalid blackboard data never runs a partial tick');
}
same(tick(original).trace.every(item => item.depth < TREE_LIMITS.depth), true, 'default trace depth stays bounded');
same(tick(full).trace.length <= TREE_LIMITS.nodes * 2, true, 'detached workbench size does not expand the tick');

same(workedExample('camera-shake').value, 3.2, 'the authored shake example remains 3.2 px');
const shake = FORMULAS['camera-shake'];
for (const [elapsed, raw, expected] of [[0, 4, 4], [0.1, 3.2, 3.2], [0.25, 2, 2], [0.5, 0, 0], [1, -4, 0]]) {
	const result = finishFormulaResult(shake, { a: 4, e: elapsed, f: 0.5 }, raw);
	same(result.value, expected, `physical offset at ${elapsed}s`);
	same(!!result.step, elapsed >= 0.5, 'the finished state has an explicit boundary explanation');
}
same(finishFormulaResult(FORMULAS['ray-point'], { o: 2, t: 10, d: 0.6 }, 8).value, 8, 'other formulas retain their arithmetic result');
same(finishFormulaResult(shake, { a: 4, e: 1, f: 0 }, NaN).value, NaN, 'undefined arithmetic is not disguised as zero');

console.log(`Behavior-tree and formula boundary checks: ${checks} passed.`);
