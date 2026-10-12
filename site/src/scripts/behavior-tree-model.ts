// A small, editable tree interpreter. It chooses an action; it does not move the
// guard or update its blackboard. Detached branches are a workbench, not tick inputs.
export const TREE_LIMITS = Object.freeze({ nodes: 24, children: 8, depth: 8 });
export const TREE_ACTIONS = Object.freeze(['flee', 'attack', 'chase', 'search', 'patrol'] as const);
export const TREE_TESTS = Object.freeze({
	health: { label: 'Health at most', min: 0, max: 100, step: 1, limit: 25 },
	seen: { label: 'Seen for at least this many ticks', min: 0, max: 5, step: 1, limit: 3 },
	distance: { label: 'Distance at most', min: 0, max: 5, step: 0.1, limit: 1.5 },
	memory: { label: 'A last known spot exists' },
});

export type NodeType = 'selector' | 'sequence' | 'condition' | 'action';
export type TreeAction = (typeof TREE_ACTIONS)[number];
export type ConditionTest = keyof typeof TREE_TESTS;
export type ActionOutcome = 'blackboard' | 'success' | 'failure' | 'running';
/** What a node reports after it is read. */
export type NodeStatus = 'success' | 'failure' | 'running';

/** One node. Which optional fields matter depends on `type`: a composite has a label, a condition a test, an action an action. */
export interface BehaviorNode {
	readonly id: string;
	readonly type: NodeType;
	readonly children: readonly string[];
	readonly label?: string;
	readonly test?: ConditionTest;
	readonly limit?: number;
	readonly expected?: boolean;
	readonly action?: TreeAction;
	readonly outcome?: ActionOutcome;
}

export interface BehaviorTree {
	readonly root: string;
	readonly nodes: readonly BehaviorNode[];
}

/** The same shapes with every field writable, used only while an edit is being applied to a copy. */
interface DraftNode {
	id: string;
	type: NodeType;
	children: string[];
	label?: string;
	test?: ConditionTest;
	limit?: number;
	expected?: boolean;
	action?: TreeAction;
	outcome?: ActionOutcome;
}
interface DraftTree {
	root: string;
	nodes: DraftNode[];
}

/** A new node without its id and children, which the model assigns. */
export type NodeDraft = Omit<BehaviorNode, 'id' | 'children'>;
/** The fields an update may change; the id and the children are never changed by it. */
export type NodeChanges = Partial<NodeDraft>;

export type TreeEdit =
	| { readonly type: 'connect'; readonly parent: string; readonly child: string }
	| { readonly type: 'disconnect'; readonly parent: string; readonly child: string }
	| { readonly type: 'move'; readonly parent: string; readonly child: string; readonly direction: number }
	| { readonly type: 'add'; readonly node: NodeDraft }
	| { readonly type: 'update'; readonly id: string; readonly changes: NodeChanges }
	| { readonly type: 'remove'; readonly id: string };

export type EditResult =
	| { readonly ok: true; readonly tree: BehaviorTree; readonly selected: string; readonly error: null }
	| { readonly ok: false; readonly tree: BehaviorTree; readonly error: string };

/** The values one tick reads. Sight is a whole number of ticks. */
export interface Blackboard {
	readonly health: number;
	readonly seen: number;
	readonly distance: number;
	readonly memory: boolean;
	readonly running: boolean;
}

export interface TickTraceItem {
	readonly id: string;
	readonly status: NodeStatus | 'enter';
	readonly text: string;
	readonly depth: number;
}

export interface TickResult {
	readonly status: NodeStatus;
	readonly action: TreeAction | null;
	readonly trace: readonly TickTraceItem[];
	readonly statuses: Readonly<Record<string, NodeStatus>>;
	readonly branches: readonly string[];
	readonly error: string | null;
}

const NODE_TYPES: readonly NodeType[] = ['selector', 'sequence', 'condition', 'action'];
const OUTCOMES: readonly ActionOutcome[] = ['blackboard', 'success', 'failure', 'running'];

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null;
const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);
const isNodeType = (value: unknown): value is NodeType => NODE_TYPES.some(candidate => candidate === value);
const isOutcome = (value: unknown): value is ActionOutcome => OUTCOMES.some(candidate => candidate === value);
const isTreeAction = (value: unknown): value is TreeAction => TREE_ACTIONS.some(candidate => candidate === value);
const isConditionTest = (value: unknown): value is ConditionTest => typeof value === 'string' && Object.hasOwn(TREE_TESTS, value);
const composite = (type: unknown): boolean => type === 'selector' || type === 'sequence';
const cloneTree = (tree: BehaviorTree): DraftTree => ({ root: tree.root, nodes: tree.nodes.map(node => ({ ...node, children: [...node.children] })) });
const title = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
/** A condition's limit, or NaN (which no comparison satisfies) when a tree has none. */
const limitOf = (node: BehaviorNode): number => node.limit ?? Number.NaN;

/** Looks a node up by id in a tree that has already passed `validateBehaviorTree`. */
function lookup<Node>(nodes: ReadonlyMap<string, Node>, id: string): Node {
	const node = nodes.get(id);
	if (node === undefined) throw new Error(`The behavior tree has no node named "${id}".`);
	return node;
}

export function createBehaviorTree({ combatFirst = false }: { readonly combatFirst?: boolean } = {}): BehaviorTree {
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

export function treeNodeLabel(node: BehaviorNode): string {
	if (composite(node.type)) return `${title(node.type)}: ${node.label || node.type}`;
	if (node.type === 'action') return `Action: ${node.action}`;
	if (node.test === 'memory') return `Condition: ${node.expected ? 'a last known spot exists' : 'no last known spot exists'}`;
	return `Condition: ${node.test === 'health' ? 'health' : node.test === 'seen' ? 'seen ticks' : 'distance'} ${node.test === 'seen' ? '≥' : '≤'} ${node.limit}`;
}

/** The first problem found in a tree, or null. It accepts any value, so stored or hand-built trees can be checked too. */
export function validateBehaviorTree(tree: unknown): string | null {
	if (!isRecord(tree) || !isList(tree.nodes) || tree.nodes.length === 0 || tree.nodes.length > TREE_LIMITS.nodes) return `Keep between 1 and ${TREE_LIMITS.nodes} nodes.`;
	const nodes = new Map<string, { readonly type: NodeType; readonly children: readonly unknown[] }>();
	for (const node of tree.nodes) {
		if (!isRecord(node) || typeof node.id !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(node.id) || nodes.has(node.id)) return 'Every node needs a unique short name.';
		if (!isNodeType(node.type)) return 'Choose a selector, sequence, condition, or action.';
		const children = node.children;
		if (!isList(children) || children.length > TREE_LIMITS.children || new Set(children).size !== children.length) return `A node can have at most ${TREE_LIMITS.children} different children.`;
		if (!composite(node.type) && children.length) return 'Conditions and actions are leaves; disconnect their children first.';
		if (composite(node.type) && (typeof node.label !== 'string' || node.label.length > 48)) return 'Keep node labels short.';
		if (node.type === 'condition') {
			if (!isConditionTest(node.test)) return 'Choose one of the four blackboard conditions.';
			if (node.test === 'memory') { if (typeof node.expected !== 'boolean') return 'Choose whether a remembered spot should exist.'; }
			else {
				const test = TREE_TESTS[node.test], limit = node.limit;
				if (typeof limit !== 'number' || !Number.isFinite(limit) || limit < test.min || limit > test.max || (test.step === 1 && !Number.isInteger(limit))) return `${test.label} must be between ${test.min} and ${test.max}${test.step === 1 ? ' in whole numbers' : ''}.`;
			}
		}
		if (node.type === 'action' && (!isTreeAction(node.action) || !isOutcome(node.outcome))) return 'Choose a known action and return status.';
		nodes.set(node.id, { type: node.type, children });
	}
	const root = tree.root;
	const rootNode = typeof root === 'string' ? nodes.get(root) : undefined;
	if (!rootNode || !composite(rootNode.type)) return 'Keep a selector or sequence as the root.';
	const parents = new Map<string, string>();
	const links = new Map<string, readonly string[]>();
	for (const node of tree.nodes) {
		if (!isRecord(node) || typeof node.id !== 'string' || !isList(node.children)) continue;
		const checked: string[] = [];
		for (const child of node.children) {
			if (typeof child !== 'string' || !nodes.has(child)) return 'Connect to a node that exists.';
			if (child === root) return 'The root cannot be a child.';
			if (parents.has(child)) return 'Each node can have one parent. Disconnect its current arrow first.';
			parents.set(child, node.id);
			checked.push(child);
		}
		links.set(node.id, checked);
	}
	const visit = (id: string, path: readonly string[]): string | null => {
		if (path.includes(id)) return 'That arrow would create a cycle. A tree cannot lead back to itself.';
		if (path.length >= TREE_LIMITS.depth) return `Keep each branch at most ${TREE_LIMITS.depth} nodes deep.`;
		for (const child of links.get(id) ?? []) { const error = visit(child, [...path, id]); if (error) return error; }
		return null;
	};
	// Check detached branches as well, so reconnecting one is always bounded.
	for (const id of links.keys()) { const error = visit(id, []); if (error) return error; }
	return null;
}

export function editBehaviorTree(tree: BehaviorTree, edit: TreeEdit): EditResult {
	const invalid = validateBehaviorTree(tree);
	if (invalid) return { ok: false, tree, error: invalid };
	const next = cloneTree(tree);
	const byId = new Map(next.nodes.map((node): [string, DraftNode] => [node.id, node]));
	const parents = new Map(next.nodes.flatMap(node => node.children.map((child): [string, string] => [child, node.id])));
	const fail = (error: string): EditResult => ({ ok: false, tree, error });
	let selected = '';
	if (edit.type === 'connect' || edit.type === 'disconnect' || edit.type === 'move') {
		selected = edit.child;
		const parent = byId.get(edit.parent), child = byId.get(edit.child);
		if (!parent || !child || !composite(parent.type)) return fail('Choose a selector or sequence as the parent, and a child that exists.');
		const index = parent.children.indexOf(child.id);
		if (edit.type === 'connect') {
			if (parents.has(child.id)) return fail('Disconnect the child’s current arrow before connecting it elsewhere.');
			parent.children.push(child.id);
		} else {
			if (index < 0) return fail('There is no arrow from that parent to that child.');
			if (edit.type === 'disconnect') parent.children.splice(index, 1);
			else {
				if (edit.direction !== 1 && edit.direction !== -1) return fail('Choose earlier or later in the child order.');
				const other = parent.children[index + edit.direction];
				if (other === undefined) return fail('That child is already at this end of the order.');
				parent.children[index + edit.direction] = child.id;
				parent.children[index] = other;
			}
		}
	} else if (edit.type === 'add') {
		let number = 1;
		while (byId.has(`edited-${number}`)) number += 1;
		selected = `edited-${number}`;
		next.nodes.push({ ...edit.node, id: selected, children: [] });
	} else if (edit.type === 'update') {
		selected = edit.id;
		const node = byId.get(edit.id);
		if (!node) return fail('Choose a node that exists.');
		Object.assign(node, edit.changes, { id: node.id, children: node.children });
	} else if (edit.type === 'remove') {
		if (!byId.has(edit.id)) return fail('Choose a node that exists.');
		if (edit.id === tree.root || parents.has(edit.id)) return fail('Disconnect a branch before deleting it; the root stays in place.');
		const removed = new Set<string>();
		const collect = (id: string): void => { removed.add(id); lookup(byId, id).children.forEach(collect); };
		collect(edit.id);
		next.nodes = next.nodes.filter(node => !removed.has(node.id));
		selected = tree.root;
	} else return fail('Choose a node or arrow edit.');
	const error = validateBehaviorTree(next);
	return error ? fail(error) : { ok: true, tree: next, selected, error: null };
}

/** True when every blackboard value the tree reads is present and in range. */
function isBlackboard(value: unknown): value is Blackboard {
	if (!isRecord(value)) return false;
	const { health, seen, distance, memory, running } = value;
	const reading = (number: unknown): boolean => typeof number === 'number' && Number.isFinite(number) && number >= 0;
	return reading(health) && reading(seen) && reading(distance) && Number.isInteger(seen) && typeof memory === 'boolean' && typeof running === 'boolean';
}

/** One tick. The blackboard is checked here, so a bad reading returns an error and never a partial trace. */
export function tickBehaviorTree(tree: BehaviorTree, blackboard: unknown): TickResult {
	const error = validateBehaviorTree(tree);
	if (error) return { error, action: null, status: 'failure', trace: [], statuses: {}, branches: [] };
	if (!isBlackboard(blackboard)) {
		return { error: 'Use finite non-negative health, sight ticks, and distance, plus the two checkbox values.', action: null, status: 'failure', trace: [], statuses: {}, branches: [] };
	}
	const board: Blackboard = blackboard;
	const nodes = new Map(tree.nodes.map((node): [string, BehaviorNode] => [node.id, node]));
	const trace: TickTraceItem[] = [];
	const statuses: Record<string, NodeStatus> = {};
	const record = (node: BehaviorNode, status: NodeStatus | 'enter', text: string, depth: number): void => { trace.push({ id: node.id, status, text, depth }); if (status !== 'enter') statuses[node.id] = status; };
	interface Visit { readonly status: NodeStatus; readonly action: TreeAction | null }
	function visit(id: string, depth = 0): Visit {
		const node = lookup(nodes, id), label = treeNodeLabel(node);
		if (node.type === 'condition') {
			const test = node.test ?? 'memory';
			const value = board[test];
			const passed = test === 'memory' ? value === node.expected : typeof value === 'number' && (test === 'seen' ? value >= limitOf(node) : value <= limitOf(node));
			const status = passed ? 'success' : 'failure';
			record(node, status, `${label}; reads ${typeof value === 'boolean' ? (value ? 'yes' : 'no') : value} → ${status}.`, depth);
			return { status, action: null };
		}
		if (node.type === 'action') {
			const status: NodeStatus = node.outcome === 'success' || node.outcome === 'failure' || node.outcome === 'running' ? node.outcome : (board.running ? 'running' : 'success');
			record(node, status, `${label} returns ${status}.`, depth);
			return { status, action: status === 'failure' ? null : node.action ?? null };
		}
		record(node, 'enter', `${label}: read children in the displayed order.`, depth);
		let action: TreeAction | null = null;
		for (const child of node.children) {
			const result = visit(child, depth + 1);
			const stop = node.type === 'selector' ? result.status !== 'failure' : result.status !== 'success';
			if (stop) {
				record(node, result.status, `${label} stops at ${treeNodeLabel(lookup(nodes, child))} → ${result.status}; later children are not visited.`, depth);
				return { status: result.status, action: result.action };
			}
			if (result.action) action = result.action;
		}
		const status = node.type === 'selector' ? 'failure' : 'success';
		record(node, status, `${label} ${node.children.length ? 'reaches the end of its children' : 'has no children'} → ${status}.`, depth);
		return { status, action: status === 'success' ? action : null };
	}
	const result = visit(tree.root);
	return { ...result, trace, statuses, branches: [...lookup(nodes, tree.root).children], error: null };
}
