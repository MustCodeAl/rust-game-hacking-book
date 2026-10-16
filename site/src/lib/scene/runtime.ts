// Plays the book's animations. The page already holds the finished picture; this
// moves the same elements through the scene's tracks so a reader can play,
// pause, step, and scrub it. Nothing runs until a scene is near the screen, and
// nothing moves unless the reader's motion settings allow it.
import { format, transformOf, valuesAt, playerSpec } from './engine.ts';
import { renderScene } from './markup.ts';
import type { AnimatedActor, AnimatedValues, Explorer, ExplorerField, PlayerSpec, Transform } from './types.ts';

/** The spec the page embeds: the player spec plus the name of the explorer, when the scene has one. */
interface RuntimeSpec extends PlayerSpec { explore?: string }

/** An animated actor bound to its element in the page, with the last values written to it. */
interface RuntimeActor extends AnimatedActor {
	node: Element;
	label: Element | null;
	line: SVGElement | null;
	rect: Element | null;
	cur: Required<Transform> & AnimatedValues;
	written: Record<string, unknown>;
}

type BoundField = ExplorerField & { input: HTMLInputElement; output: HTMLOutputElement | null };

const mounted = new WeakSet<Element>();
const SPEEDS = [0.5, 1, 2];
const round = (n: number): number => Math.round(n * 100) / 100;
// Only selected simulations load their model code. Other scenes retain
// their existing playback and static picture without loading the explorers.
const explorers: Record<string, () => Promise<{ exploration?: Explorer }>> = {
	'bfs-around-wall': () => import('../../scenes/bfs-around-wall.ts'),
	'world-to-screen': () => import('../../scenes/world-to-screen.ts'),
	'server-authority': () => import('../../scenes/server-authority.ts'),
	'detector-input-window': () => import('../../scenes/detector-input-window.ts'),
	'evidence-correlation': () => import('../../scenes/evidence-correlation.ts'),
	'edge-events': () => import('../../scenes/edge-events.ts'),
};

export function mountScenes(scope: ParentNode = document): void {
	scope.querySelectorAll<HTMLElement>('[data-scene]').forEach(mount);
}

function mount(root: HTMLElement): void {
	if (mounted.has(root)) return;
	const specNode = root.querySelector<HTMLScriptElement>('script[data-scene-spec]');
	const svg = root.querySelector<SVGSVGElement>('.scene__svg');
	const controls = root.querySelector<HTMLElement>('[data-scene-controls]');
	const cueNode = root.querySelector<HTMLElement>('[data-scene-cue]');
	const scrub = root.querySelector<HTMLInputElement>('[data-scene-scrub]');
	const playButton = root.querySelector<HTMLButtonElement>('[data-scene-action="play"]');
	const speedButton = root.querySelector<HTMLButtonElement>('[data-scene-action="speed"]');
	const view = root.ownerDocument.defaultView;
	if (!specNode || !svg || !controls || !cueNode || !scrub || !playButton || !view) return;
	mounted.add(root);

	let spec = JSON.parse(specNode.textContent ?? '') as RuntimeSpec;
	const id = root.dataset.sceneId ?? '';
	const doc = root.ownerDocument;
	const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
	let duration = spec.d;

	const makeActors = (data: RuntimeSpec): RuntimeActor[] => {
		const found: RuntimeActor[] = [];
		for (const actor of data.a) {
			const node = svg.querySelector(`[data-a="${CSS.escape(actor.id)}"]`);
			if (!node) continue;
			found.push({
				...actor,
				node,
				label: node.querySelector('.scene__label'),
				line: node.querySelector<SVGElement>('.scene__line'),
				rect: node.querySelector('.scene__rect'),
				cur: { ...actor.base },
				written: {},
			});
		}
		return found;
	};
	let actors = makeActors(spec);

	let time = duration;
	let playing = false;
	let wantsPlay = false;
	let last = 0;
	let frame = 0;
	let speed = 1;
	let cueIndex = -2;
	let autoStarted = Boolean(spec.explore);

	const motion = (): string => doc.documentElement.dataset.academyMotion || 'system';
	const autoplayAllowed = (): boolean => motion() === 'system' && !reduced.matches;
	const playAllowed = (): boolean => motion() !== 'off';
	const speedNames: Record<string, number> = { slow: 0.5, fast: 2 };
	const preferredSpeed = (): number => speedNames[doc.documentElement.dataset.academyAnimationSpeed ?? ''] ?? 1;

	function set(actor: RuntimeActor, name: string, value: string): void {
		if (actor.written[name] === value) return;
		actor.written[name] = value;
		actor.node.setAttribute(name, value);
	}

	function write(actor: RuntimeActor, values: AnimatedValues): void {
		Object.assign(actor.cur, values);
		if ('x' in values || 'y' in values || 's' in values || 'a' in values) set(actor, 'transform', transformOf(actor.cur));
		if (values.o !== undefined) set(actor, 'opacity', String(round(values.o)));
		if (values.role !== undefined) {
			set(actor, 'data-role', values.role);
			if (actor.line && actor.line.dataset.arrow) actor.line.style.markerEnd = `url(#${id}-head-${values.role})`;
		}
		if (actor.label && ('text' in values || 'num' in values)) {
			const text = values.num !== undefined ? format(values.num, actor.fmt) : values.text;
			if (text !== undefined && actor.written.label !== text) {
				actor.written.label = text;
				if (Array.isArray(text)) {
					const x = actor.label.getAttribute('x') || '0';
					const leading = actor.label.querySelector('tspan[dy]')?.getAttribute('dy') || '1.35em';
					actor.label.replaceChildren(...text.map((line, index) => {
						const span = doc.createElementNS('http://www.w3.org/2000/svg', 'tspan');
						span.setAttribute('x', x);
						if (index) span.setAttribute('dy', leading);
						span.textContent = line;
						return span;
					}));
				} else {
					actor.label.textContent = String(text);
				}
			}
		}
		if (actor.line && values.draw !== undefined) {
			const draw = values.draw;
			const len = Number(actor.line.dataset.len) || 1;
			actor.line.style.strokeDashoffset = String(round(len * (1 - draw)));
			actor.line.style.visibility = draw <= 0.001 ? 'hidden' : 'visible';
			if (actor.line.dataset.arrow) {
				const role = values.role || actor.node.getAttribute('data-role') || 'plain';
				actor.line.style.markerEnd = draw >= 0.999 ? `url(#${id}-head-${role})` : 'none';
			}
		}
		if (actor.rect && (values.w !== undefined || values.h !== undefined)) {
			if (values.w !== undefined) actor.rect.setAttribute('width', String(round(values.w)));
			if (values.h !== undefined) actor.rect.setAttribute('height', String(round(values.h)));
		}
	}

	function currentCue(at: number): number {
		let index = -1;
		for (let i = 0; i < spec.c.length; i += 1) if ((spec.c[i] ?? Infinity) <= at + 1e-6) index = i;
		return index;
	}

	// The words for each step are already in the page, in the list under the picture;
	// the line shown beside the picture is a copy of the current one.
	let stepItems = Array.from(root.querySelectorAll<HTMLElement>('.scene__steps li'));
	const originalSteps = stepItems.map(item => item.cloneNode(true));

	function showCue(index: number): void {
		if (index === cueIndex) return;
		cueIndex = index;
		const item = stepItems[index];
		cueNode!.replaceChildren(...(item ? Array.from(item.childNodes, child => child.cloneNode(true)) : []));
		cueNode!.dataset.step = String(index + 1);
		stepItems.forEach((other, i) => {
			if (i === index) other.setAttribute('aria-current', 'step');
			else other.removeAttribute('aria-current');
		});
	}

	function seek(at: number): void {
		time = Math.max(0, Math.min(duration, at));
		for (const actor of actors) write(actor, valuesAt(actor, time));
		scrub!.value = String(Math.round((time / duration) * 1000));
		showCue(currentCue(time));
		root.dataset.atEnd = String(time >= duration);
		refreshButtons();
	}

	function refreshButtons(): void {
		playButton!.textContent = playing ? 'Pause' : time >= duration ? 'Replay' : time > 0 ? 'Resume' : 'Play';
		playButton!.disabled = !playAllowed();
		if (speedButton) {
			speedButton.textContent = `${speed}×`;
			speedButton.setAttribute('aria-label', `Playback speed: ${speed}×`);
		}
		root.dataset.playing = String(playing);
	}

	function step(now: number): void {
		if (!playing) return;
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		seek(time + dt * speed);
		if (time >= duration) {
			pause();
			wantsPlay = false;
			return;
		}
		frame = view!.requestAnimationFrame(step);
	}

	function play(): void {
		if (!playAllowed()) return;
		if (time >= duration) seek(0);
		playing = true;
		last = view!.performance.now();
		refreshButtons();
		frame = view!.requestAnimationFrame(step);
	}

	function pause(): void {
		playing = false;
		view!.cancelAnimationFrame(frame);
		refreshButtons();
	}

	function jump(direction: number): void {
		pause();
		wantsPlay = false;
		const here = currentCue(time);
		const target = here + (direction > 0 ? 1 : -1);
		if (target >= spec.c.length) {
			seek(duration);
			return;
		}
		// Show the picture once the step's change has finished, not the start of its motion.
		seek(target < 0 ? 0 : (spec.c[target] ?? 0) + settle(target));
		announce();
	}

	// A cue names the moment an action begins; its picture is complete a little later.
	function settle(index: number): number {
		const next = spec.c[index + 1] !== undefined ? spec.c[index + 1] ?? duration : duration;
		// A long copy or rotation must finish before a manual step freezes it.
		// Stay within this cue so its explanation still matches the picture.
		return next - (spec.c[index] ?? 0) - (index + 1 < spec.c.length ? 0.001 : 0);
	}

	function announce(): void {
		const live = root.querySelector('[data-scene-live]');
		if (live) live.textContent = cueNode!.textContent;
	}

	playButton.addEventListener('click', () => {
		if (playing) {
			pause();
			wantsPlay = false;
		} else {
			wantsPlay = true;
			play();
		}
	});
	root.querySelector('[data-scene-action="restart"]')?.addEventListener('click', () => {
		pause();
		seek(0);
		wantsPlay = playAllowed();
		if (wantsPlay) play();
	});
	root.querySelector('[data-scene-action="prev"]')?.addEventListener('click', () => jump(-1));
	root.querySelector('[data-scene-action="next"]')?.addEventListener('click', () => jump(1));
	speedButton?.addEventListener('click', () => {
		speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1;
		refreshButtons();
	});
	scrub.addEventListener('input', () => {
		pause();
		wantsPlay = false;
		seek((Number(scrub.value) / 1000) * duration);
		announce();
	});

	const observer = typeof view.IntersectionObserver === 'function' ? new view.IntersectionObserver(entries => {
		for (const entry of entries) {
			const visible = entry.isIntersecting;
			if (!visible && playing) pause();
			if (visible && wantsPlay && !playing) play();
			if (visible && !wantsPlay && !autoStarted && autoplayAllowed() && time === 0) {
				autoStarted = true;
				wantsPlay = true;
				play();
			}
		}
	}, { threshold: 0.35 }) : null;

	const explorePanel = root.querySelector<HTMLElement>('[data-scene-explore]');
	const loadExplorer = spec.explore ? explorers[spec.explore] : undefined;
	if (explorePanel && loadExplorer) loadExplorer().then(({ exploration }) => {
		if (!exploration || typeof exploration.build !== 'function') return;
		const fields: BoundField[] = [];
		for (const field of exploration.fields) {
			const input = explorePanel.querySelector<HTMLInputElement>(`[data-scene-input="${CSS.escape(field.key)}"]`);
			if (!input) return;
			fields.push({ ...field, input, output: explorePanel.querySelector<HTMLOutputElement>(`[data-scene-output="${CSS.escape(field.key)}"]`) });
		}
		const result = explorePanel.querySelector('[data-scene-result]');
		const steps = root.querySelector('.scene__steps ol');
		const alt = root.querySelector('.scene__alt');
		const defaults = exploration.build(exploration.defaults);
		if (result) result.textContent = defaults.summary;

		function recompute(reset = false): void {
			if (reset) for (const field of fields) {
				if (field.type === 'checkbox') field.input.checked = Boolean(exploration!.defaults[field.key]);
				else field.input.value = String(exploration!.defaults[field.key]);
			}
			const values: Record<string, number | boolean> = Object.fromEntries(fields.map(field => [field.key, field.type === 'checkbox' ? field.input.checked : Number(field.input.value)]));
			const next = exploration!.build(values), sc = next.scene;
			pause();
			wantsPlay = false;
			autoStarted = true;
			svg!.innerHTML = renderScene(sc, sc.duration, { id, base: root.dataset.sceneBase || '' });
			spec = spec.explore === undefined ? playerSpec(sc) : { ...playerSpec(sc), explore: spec.explore };
			duration = spec.d;
			actors = makeActors(spec);
			cueIndex = -2;
			const isDefault = fields.every(field => values[field.key] === exploration!.defaults[field.key]);
			if (steps) {
				steps.replaceChildren(...(isDefault ? originalSteps.map(item => item.cloneNode(true)) : sc.cues.map(([, words]) => {
					const item = doc.createElement('li');
					item.textContent = words;
					return item;
				})));
				stepItems = Array.from(steps.children) as HTMLElement[];
			}
			if (alt) alt.textContent = sc.alt;
			if (result) result.textContent = next.summary;
			for (const field of fields) if (field.output) field.output.value = `${values[field.key]}${field.type === 'range' ? field.unit || '' : ''}`;
			// Explore first: immediately show the computed result. Replay and manual
			// steps can then explain how this version reached it.
			seek(duration);
			announce();
		}
		for (const field of fields) field.input.addEventListener(field.type === 'checkbox' ? 'change' : 'input', () => recompute());
		explorePanel.querySelector('[data-scene-reset]')?.addEventListener('click', () => recompute(true));
		explorePanel.hidden = false;
		root.dataset.simulationReady = 'true';
	}).catch(() => {
		// A missing optional model leaves the original picture/playback usable.
		// Hidden controls must never advertise a simulation that did not load.
	});

	function applyPreferences(): void {
		speed = preferredSpeed();
		if (!playAllowed() && playing) pause();
		refreshButtons();
	}
	doc.addEventListener('academy:reader-preference', applyPreferences);
	doc.addEventListener('visibilitychange', () => { if (doc.hidden && playing) pause(); });
	let before = 0;
	view.addEventListener('beforeprint', () => {
		before = time;
		pause();
		seek(duration);
		root.querySelector('.scene__steps')?.setAttribute('open', '');
	});
	view.addEventListener('afterprint', () => seek(before));

	controls.hidden = false;
	cueNode.hidden = false;
	root.classList.add('is-ready');
	speed = preferredSpeed();
	// A scene that may play starts at its first picture and waits to be seen; one
	// that may not shows its finished picture, which the page already holds.
	if (!spec.explore && autoplayAllowed() && observer) {
		seek(0);
		observer.observe(root);
	} else {
		seek(duration);
		if (observer) observer.observe(root);
	}
}
