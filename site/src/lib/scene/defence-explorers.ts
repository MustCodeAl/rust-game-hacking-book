import type { Actor, ActorOptions, ActorBase, Scene, SceneDefinition, SceneState, AnimatedActor, AnimatedValues, Transform, PlayerSpec, Role, Format, Easing, Point, Label, Cue, Keyframe, Track, TrackMap, Tracks, TrackValue, TrackProperty, Timeline, TimelineCursor, Explorer, ExplorerField, ExplorerValues, ExplorerSettings } from './types.ts';
// Closed, synthetic teaching inputs. These models never inspect a real player,
// alter a target, submit a report, or reach a network service.
import { authority, inputWindow, correlation } from './defence.ts';
import { eventEdges } from './event-edges.ts';

const integer = (value: unknown, fallback: number, max: number) => {
	const n = Number(value);
	return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : fallback;
};
const flag = (values: ExplorerValues, key: string, fallback: boolean) => values[key] === undefined ? fallback : values[key] === true;
const range = (key: string, label: string, start: number, max: number, step = 1): Extract<ExplorerField, { type: 'range' }> => ({ key, label, type: 'range', min: 0, max, step, start });
const check = (key: string, label: string, start: boolean): Extract<ExplorerField, { type: 'checkbox' }> => ({ key, label, type: 'checkbox', start });

export function authorityModel(values: ExplorerValues = {}) {
	const settings = { score: integer(values.score ?? 3, 3, 10), claim: integer(values.claim ?? 99, 99, 100), available: flag(values, 'available', true), reachesCoin: flag(values, 'reachesCoin', true) };
	const accepted = settings.available && settings.reachesCoin;
	return { settings, accepted, after: settings.score + Number(accepted) };
}
export function inputWindowModel(values: ExplorerValues = {}) {
	const settings: Record<string, boolean> = { prior: flag(values, 'prior', false) };
	const samples = [false, true, true, false, true].map((start, i) => {
		settings[`sample${i}`] = flag(values, `sample${i}`, start);
		return Number(settings[`sample${i}`]);
	});
	let previous = Number(settings.prior), count = 0;
	const rounds = samples.map((sample, i) => {
		const edge = sample === 1 && previous === 0;
		count += Number(edge);
		const round = { i, previous, sample, edge, count };
		previous = sample;
		return round;
	});
	return { settings, samples, prior: Number(settings.prior), rounds, count, held: samples.reduce((sum, n) => sum + n, 0) };
}
export function correlationModel(values: ExplorerValues = {}) {
	const settings = { pluginA: flag(values, 'pluginA', true), reportA: flag(values, 'reportA', true), laterB: flag(values, 'laterB', true) };
	const deliveries = ['A', settings.pluginA ? 'A' : 'B', settings.reportA ? 'A' : 'C'];
	const first = [...new Set(deliveries)], later = settings.laterB ? 'B' : 'A';
	return { settings, deliveries, first, later, final: [...new Set([...deliveries, later])] };
}
export function edgeModel(values: ExplorerValues = {}) {
	const settings = { before: integer(values.before ?? 120, 120, 200), after: integer(values.after ?? 145, 145, 200), menuBefore: flag(values, 'menuBefore', false), menuAfter: flag(values, 'menuAfter', true) };
	const events = [];
	if (settings.before !== settings.after) events.push('GoldChanged');
	if (settings.menuBefore !== settings.menuAfter) events.push(settings.menuAfter ? 'MenuOpened' : 'MenuClosed');
	return { settings, delta: settings.after - settings.before, events };
}

function explorer<M extends { settings: ExplorerSettings }>(worked: Scene, fields: ExplorerField[], invite: string, modelOf: (values: ExplorerValues) => M, sceneOf: (model: M) => Scene, summaryOf: (model: M) => string): Explorer<M> {
	const defaults = Object.fromEntries(fields.map(field => [field.key, field.start]));
	return { fields, defaults, invite, build(values = defaults) {
		const model = modelOf(values);
		const original = fields.every(field => model.settings[field.key] === defaults[field.key]);
		return { model, scene: original ? worked : sceneOf(model), summary: summaryOf(model) };
	} };
}
export const createAuthorityExplorer = (worked: Scene) => explorer(worked, [
	range('score', 'Server starting score', 3, 10), range('claim', 'Client claimed score', 99, 100),
	check('available', 'A coin is available', true), check('reachesCoin', 'Player reaches the coin', true),
], 'Change the claimed score or pickup conditions. Watch the claim stop at the boundary; only an available coin reached in this toy world adds a point.', authorityModel, model => authority(model.settings), model =>
	`Score: ${model.settings.score} + ${Number(model.accepted)} = ${model.after}. Claimed ${model.settings.claim} is ignored. ${model.accepted ? 'The accepted pickup consumes one coin.' : model.settings.available ? 'The player cannot reach the coin, so it remains.' : 'There is no coin to consume.'}`);
export const createInputWindowExplorer = (worked: Scene) => explorer(worked, [
	check('prior', 'Pressed before this trace', false),
	...[false, true, true, false, true].map((start, i) => check(`sample${i}`, `Sample ${i + 1} is pressed`, start)),
], 'Choose five held/released samples and the preceding state. Replay moves each actual sample into the comparison and updates the fresh-press count.', inputWindowModel, model => inputWindow(model), model =>
	`Samples: ${model.samples.join(', ')}; preceding state ${model.prior}. Fresh presses: ${model.count}; held samples: ${model.held}. Only a 0 → 1 transition adds a press; a held command is not another press.`);
export const createCorrelationExplorer = (worked: Scene) => explorer(worked, [
	check('pluginA', 'Plugin reports A (otherwise B)', true), check('reportA', 'Report describes A (otherwise C)', true), check('laterB', 'Later delivery is B (otherwise A)', true),
], 'Change which event each delivery describes. Matching identities merge; a new identity adds a record. Record count alone cannot establish independence or guilt.', correlationModel, model => correlation(model.settings), model =>
	`First deliveries: ${model.deliveries.join(', ')} → ${model.first.length} event identities. Later ${model.later} → ${model.final.length} total (${model.final.join(', ')}). More deliveries about the same event do not create independent observations.`);
export const createEdgeExplorer = (worked: Scene) => explorer(worked, [
	range('before', 'Baseline gold', 120, 200, 5), range('after', 'Next gold', 145, 200, 5),
	check('menuBefore', 'Baseline menu is open', false), check('menuAfter', 'Next menu is open', true),
], 'Both snapshots here have already passed validation. Change their values, then replay the comparison, event creation and baseline update. An identical following snapshot emits nothing.', edgeModel, model => eventEdges(model.settings), model =>
	`Gold ${model.settings.before} → ${model.settings.after}: ${model.delta >= 0 ? '+' : ''}${model.delta}. First events: ${model.events.length ? model.events.join(', ') : 'none'}. After accepting the new baseline, an identical snapshot has no events. Endpoints alone do not explain why gold changed.`);
