// A small, editable tree interpreter. It chooses an action; it does not move the
// guard or update its blackboard. Detached branches are a workbench, not tick inputs.
export const TREE_LIMITS = Object.freeze({ nodes: 24, children: 8, depth: 8 });
export const TREE_ACTIONS = Object.freeze(['flee', 'attack', 'chase', 'search', 'patrol']);
export const TREE_TESTS = Object.freeze({
	health: { label: 'Health at most', min: 0, max: 100, step: 1, limit: 25 },
	seen: { label: 'Seen for at least this many ticks', min: 0, max: 5, step: 1, limit: 3 },
	distance: { label: 'Distance at most', min: 0, max: 5, step: 0.1, limit: 1.5 },
	memory: { label: 'A last known spot exists' },
});
const composite = node => node.type === 'selector' || node.type === 'sequence';
const cloneTree = tree => ({ root: tree.root, nodes: tree.nodes.map(node => ({ ...node, children: [...node.children] })) });
const title = text => text[0].toUpperCase() + text.slice(1);

export function createBehaviorTree({ combatFirst = false } = {}) {
	return { root: 'root', nodes: [
		{ id: 'root', type: 'selector', label: 'root', children: combatFirst ? ['combat', 'flee', 'search', 'patrol'] : ['flee', 'combat', 'search', 'patrol'] },
		{ id: 'flee', type: 'sequence', label: 'flee', children: ['health', 'flee-action'] },
		{ id: 'health', type: 'condition', test: 'health', limit: 25, children: [] },
		{ id: 'flee-action', type: 'action', action: 'flee', outcome: 'blackboard', children: [] },
		{ id: 'combat', type: 'sequence', label: 'combat', children: ['seen', 'choice'] },
		{ id: 'seen', type: 'condition', test: 'seen', limit: 3, children: [] },
		{ id: 'choice', type: 'selector', label: 'attack or chase', children: ['attack-path', 'chase'] },
		{ id: 'attack-path', type: 'sequence', label: 'attack', children: ['range', 'attack'] },
		{ id: 'range', type: 'condition', test: 'distance', limit: 1.5, children: [] },
		{ id: 'attack', type: 'action', action: 'attack', outcome: 'blackboard', children: [] },
		{ id: 'chase', type: 'action', action: 'chase', outcome: 'blackboard', children: [] },
		{ id: 'search', type: 'sequence', label: 'search', children: ['memory', 'search-action'] },
		{ id: 'memory', type: 'condition', test: 'memory', expected: true, children: [] },
		{ id: 'search-action', type: 'action', action: 'search', outcome: 'blackboard', children: [] },
		{ id: 'patrol', type: 'action', action: 'patrol', outcome: 'blackboard', children: [] },
	] };
}

export function treeNodeLabel(node) {
	if (composite(node)) return `${title(node.type)}: ${node.label || node.type}`;
	if (node.type === 'action') return `Action: ${node.action}`;
	if (node.test === 'memory') return `Condition: ${node.expected ? 'a last known spot exists' : 'no last known spot exists'}`;
	return `Condition: ${node.test === 'health' ? 'health' : node.test === 'seen' ? 'seen ticks' : 'distance'} ${node.test === 'seen' ? '≥' : '≤'} ${node.limit}`;
}

export function validateBehaviorTree(tree) {
	if (!tree || !Array.isArray(tree.nodes) || tree.nodes.length === 0 || tree.nodes.length > TREE_LIMITS.nodes) return `Keep between 1 and ${TREE_LIMITS.nodes} nodes.`;
	const nodes = new Map();
	for (const node of tree.nodes) {
		if (!node || typeof node.id !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(node.id) || nodes.has(node.id)) return 'Every node needs a unique short name.';
		if (!['selector', 'sequence', 'condition', 'action'].includes(node.type)) return 'Choose a selector, sequence, condition, or action.';
		if (!Array.isArray(node.children) || node.children.length > TREE_LIMITS.children || new Set(node.children).size !== node.children.length) return `A node can have at most ${TREE_LIMITS.children} different children.`;
		if (!composite(node) && node.children.length) return 'Conditions and actions are leaves; disconnect their children first.';
		if (composite(node) && (typeof node.label !== 'string' || node.label.length > 48)) return 'Keep node labels short.';
		if (node.type === 'condition') {
			const test = TREE_TESTS[node.test];
			if (!test) return 'Choose one of the four blackboard conditions.';
			if (node.test === 'memory') { if (typeof node.expected !== 'boolean') return 'Choose whether a remembered spot should exist.'; }
			else if (!Number.isFinite(node.limit) || node.limit < test.min || node.limit > test.max || (test.step === 1 && !Number.isInteger(node.limit))) return `${test.label} must be between ${test.min} and ${test.max}${test.step === 1 ? ' in whole numbers' : ''}.`;
		}
		if (node.type === 'action' && (!TREE_ACTIONS.includes(node.action) || !['blackboard', 'success', 'failure', 'running'].includes(node.outcome))) return 'Choose a known action and return status.';
		nodes.set(node.id, node);
	}
	if (!nodes.has(tree.root) || !composite(nodes.get(tree.root))) return 'Keep a selector or sequence as the root.';
	const parents = new Map();
	for (const node of tree.nodes) for (const child of node.children) {
		if (!nodes.has(child)) return 'Connect to a node that exists.';
		if (child === tree.root) return 'The root cannot be a child.';
		if (parents.has(child)) return 'Each node can have one parent. Disconnect its current arrow first.';
		parents.set(child, node.id);
	}
	const visit = (id, path) => {
		if (path.includes(id)) return 'That arrow would create a cycle. A tree cannot lead back to itself.';
		if (path.length >= TREE_LIMITS.depth) return `Keep each branch at most ${TREE_LIMITS.depth} nodes deep.`;
		for (const child of nodes.get(id).children) { const error = visit(child, [...path, id]); if (error) return error; }
		return null;
	};
	// Check detached branches as well, so reconnecting one is always bounded.
	for (const node of tree.nodes) { const error = visit(node.id, []); if (error) return error; }
	return null;
}

export function editBehaviorTree(tree, edit) {
	const invalid = validateBehaviorTree(tree);
	if (invalid) return { ok: false, tree, error: invalid };
	const next = cloneTree(tree);
	const byId = new Map(next.nodes.map(node => [node.id, node]));
	const parents = new Map(next.nodes.flatMap(node => node.children.map(child => [child, node.id])));
	const fail = error => ({ ok: false, tree, error });
	let selected = edit.id || edit.child;
	if (edit.type === 'connect' || edit.type === 'disconnect' || edit.type === 'move') {
		const parent = byId.get(edit.parent), child = byId.get(edit.child);
		if (!parent || !child || !composite(parent)) return fail('Choose a selector or sequence as the parent, and a child that exists.');
		const index = parent.children.indexOf(child.id);
		if (edit.type === 'connect') {
			if (parents.has(child.id)) return fail('Disconnect the child’s current arrow before connecting it elsewhere.');
			parent.children.push(child.id);
		} else {
			if (index < 0) return fail('There is no arrow from that parent to that child.');
			if (edit.type === 'disconnect') parent.children.splice(index, 1);
			else {
				if (![1, -1].includes(edit.direction)) return fail('Choose earlier or later in the child order.');
				const target = index + edit.direction;
				if (target < 0 || target >= parent.children.length) return fail('That child is already at this end of the order.');
				[parent.children[index], parent.children[target]] = [parent.children[target], parent.children[index]];
			}
		}
	} else if (edit.type === 'add') {
		let number = 1;
		while (byId.has(`edited-${number}`)) number += 1;
		selected = `edited-${number}`;
		next.nodes.push({ ...edit.node, id: selected, children: [] });
	} else if (edit.type === 'update') {
		const node = byId.get(edit.id);
		if (!node) return fail('Choose a node that exists.');
		Object.assign(node, edit.changes, { id: node.id, children: node.children });
	} else if (edit.type === 'remove') {
		if (!byId.has(edit.id)) return fail('Choose a node that exists.');
		if (edit.id === tree.root || parents.has(edit.id)) return fail('Disconnect a branch before deleting it; the root stays in place.');
		const removed = new Set();
		const collect = id => { removed.add(id); byId.get(id).children.forEach(collect); };
		collect(edit.id);
		next.nodes = next.nodes.filter(node => !removed.has(node.id));
		selected = tree.root;
	} else return fail('Choose a node or arrow edit.');
	const error = validateBehaviorTree(next);
	return error ? fail(error) : { ok: true, tree: next, selected, error: null };
}

export function tickBehaviorTree(tree, blackboard) {
	const error = validateBehaviorTree(tree);
	if (error) return { error, action: null, status: 'failure', trace: [], statuses: {}, branches: [] };
	if (!blackboard || !['health', 'seen', 'distance'].every(key => Number.isFinite(blackboard[key]) && blackboard[key] >= 0) || !Number.isInteger(blackboard.seen) || typeof blackboard.memory !== 'boolean' || typeof blackboard.running !== 'boolean') {
		return { error: 'Use finite non-negative health, sight ticks, and distance, plus the two checkbox values.', action: null, status: 'failure', trace: [], statuses: {}, branches: [] };
	}
	const nodes = new Map(tree.nodes.map(node => [node.id, node]));
	const trace = [], statuses = {};
	const record = (node, status, text, depth) => { trace.push({ id: node.id, status, text, depth }); if (status !== 'enter') statuses[node.id] = status; };
	function visit(id, depth = 0) {
		const node = nodes.get(id), label = treeNodeLabel(node);
		if (node.type === 'condition') {
			const value = blackboard[node.test];
			const passed = node.test === 'memory' ? value === node.expected : node.test === 'seen' ? value >= node.limit : value <= node.limit;
			const status = passed ? 'success' : 'failure';
			record(node, status, `${label}; reads ${typeof value === 'boolean' ? (value ? 'yes' : 'no') : value} → ${status}.`, depth);
			return { status, action: null };
		}
		if (node.type === 'action') {
			const status = node.outcome === 'blackboard' ? (blackboard.running ? 'running' : 'success') : node.outcome;
			record(node, status, `${label} returns ${status}.`, depth);
			return { status, action: status === 'failure' ? null : node.action };
		}
		record(node, 'enter', `${label}: read children in the displayed order.`, depth);
		let action = null;
		for (const child of node.children) {
			const result = visit(child, depth + 1);
			const stop = node.type === 'selector' ? result.status !== 'failure' : result.status !== 'success';
			if (stop) {
				record(node, result.status, `${label} stops at ${treeNodeLabel(nodes.get(child))} → ${result.status}; later children are not visited.`, depth);
				return { status: result.status, action: result.action };
			}
			if (result.action) action = result.action;
		}
		const status = node.type === 'selector' ? 'failure' : 'success';
		record(node, status, `${label} ${node.children.length ? 'reaches the end of its children' : 'has no children'} → ${status}.`, depth);
		return { status, action: status === 'success' ? action : null };
	}
	const result = visit(tree.root);
	return { ...result, trace, statuses, branches: [...nodes.get(tree.root).children], error: null };
}
