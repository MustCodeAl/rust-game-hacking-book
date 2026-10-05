// Plays the book's animations. The page already holds the finished picture; this
// moves the same elements through the scene's tracks so a reader can play,
// pause, step, and scrub it. Nothing runs until a scene is near the screen, and
// nothing moves unless the reader's motion settings allow it.
import { format, transformOf, valuesAt } from './engine.mjs';

const mounted = new WeakSet();
const SPEEDS = [0.5, 1, 2];
const round = (n) => Math.round(n * 100) / 100;

export function mountScenes(scope = document) {
	scope.querySelectorAll('[data-scene]').forEach(mount);
}

function mount(root) {
	if (mounted.has(root)) return;
	const specNode = root.querySelector('script[data-scene-spec]');
	const svg = root.querySelector('.scene__svg');
	const controls = root.querySelector('[data-scene-controls]');
	const cueNode = root.querySelector('[data-scene-cue]');
	const scrub = root.querySelector('[data-scene-scrub]');
	const playButton = root.querySelector('[data-scene-action="play"]');
	const speedButton = root.querySelector('[data-scene-action="speed"]');
	if (!specNode || !svg || !controls || !cueNode || !scrub || !playButton) return;
	mounted.add(root);

	const spec = JSON.parse(specNode.textContent);
	const id = root.dataset.sceneId;
	const doc = root.ownerDocument;
	const view = doc.defaultView;
	const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
	const duration = spec.d;

	const actors = spec.a.map((actor) => {
		const node = svg.querySelector(`[data-a="${CSS.escape(actor.id)}"]`);
		return {
			...actor,
			node,
			label: node && node.querySelector('.scene__label'),
			line: node && node.querySelector('.scene__line'),
			rect: node && node.querySelector('.scene__rect'),
			cur: { ...actor.base },
			written: {},
		};
	}).filter((actor) => actor.node);

	let time = duration;
	let playing = false;
	let wantsPlay = false;
	let visible = false;
	let last = 0;
	let frame = 0;
	let speed = 1;
	let cueIndex = -2;

	const motion = () => doc.documentElement.dataset.academyMotion || 'system';
	const autoplayAllowed = () => motion() === 'system' && !reduced.matches;
	const playAllowed = () => motion() !== 'off';
	const preferredSpeed = () => ({ slow: 0.5, fast: 2 })[doc.documentElement.dataset.academyAnimationSpeed] || 1;

	function set(actor, name, value) {
		if (actor.written[name] === value) return;
		actor.written[name] = value;
		actor.node.setAttribute(name, value);
	}

	function write(actor, values) {
		Object.assign(actor.cur, values);
		if ('x' in values || 'y' in values || 's' in values || 'a' in values) set(actor, 'transform', transformOf(actor.cur));
		if ('o' in values) set(actor, 'opacity', String(round(values.o)));
		if ('role' in values) {
			set(actor, 'data-role', values.role);
			if (actor.line && actor.line.dataset.arrow) actor.line.style.markerEnd = `url(#${id}-head-${values.role})`;
		}
		if (actor.label && ('text' in values || 'num' in values)) {
			const text = 'num' in values ? format(values.num, actor.fmt) : values.text;
			if (actor.written.label !== text) {
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
					actor.label.textContent = text;
				}
			}
		}
		if (actor.line && 'draw' in values) {
			const draw = values.draw;
			const len = Number(actor.line.dataset.len) || 1;
			actor.line.style.strokeDashoffset = String(round(len * (1 - draw)));
			actor.line.style.visibility = draw <= 0.001 ? 'hidden' : 'visible';
			if (actor.line.dataset.arrow) {
				const role = values.role || actor.node.dataset.role || 'plain';
				actor.line.style.markerEnd = draw >= 0.999 ? `url(#${id}-head-${role})` : 'none';
			}
		}
		if (actor.rect && ('w' in values || 'h' in values)) {
			if ('w' in values) actor.rect.setAttribute('width', String(round(values.w)));
			if ('h' in values) actor.rect.setAttribute('height', String(round(values.h)));
		}
	}

	function currentCue(at) {
		let index = -1;
		for (let i = 0; i < spec.c.length; i += 1) if (spec.c[i] <= at + 1e-6) index = i;
		return index;
	}

	// The words for each step are already in the page, in the list under the picture;
	// the line shown beside the picture is a copy of the current one.
	const stepItems = Array.from(root.querySelectorAll('.scene__steps li'));

	function showCue(index) {
		if (index === cueIndex) return;
		cueIndex = index;
		const item = stepItems[index];
		cueNode.replaceChildren(...(item ? Array.from(item.childNodes, (child) => child.cloneNode(true)) : []));
		cueNode.dataset.step = String(index + 1);
		stepItems.forEach((other, i) => {
			if (i === index) other.setAttribute('aria-current', 'step');
			else other.removeAttribute('aria-current');
		});
	}

	function seek(at) {
		time = Math.max(0, Math.min(duration, at));
		for (const actor of actors) write(actor, valuesAt(actor, time));
		scrub.value = String(Math.round((time / duration) * 1000));
		showCue(currentCue(time));
		root.dataset.atEnd = String(time >= duration);
		refreshButtons();
	}

	function refreshButtons() {
		playButton.textContent = playing ? 'Pause' : time >= duration ? 'Replay' : time > 0 ? 'Resume' : 'Play';
		playButton.disabled = !playAllowed();
		if (speedButton) speedButton.textContent = `${speed}×`;
		root.dataset.playing = String(playing);
	}

	function step(now) {
		if (!playing) return;
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		seek(time + dt * speed);
		if (time >= duration) {
			pause();
			wantsPlay = false;
			return;
		}
		frame = view.requestAnimationFrame(step);
	}

	function play() {
		if (!playAllowed()) return;
		if (time >= duration) seek(0);
		playing = true;
		last = view.performance.now();
		refreshButtons();
		frame = view.requestAnimationFrame(step);
	}

	function pause() {
		playing = false;
		view.cancelAnimationFrame(frame);
		refreshButtons();
	}

	function jump(direction) {
		pause();
		wantsPlay = false;
		const here = currentCue(time);
		const target = here + (direction > 0 ? 1 : -1);
		if (target >= spec.c.length) {
			seek(duration);
			return;
		}
		// Show the picture once the step's change has finished, not the start of its motion.
		seek(target < 0 ? 0 : spec.c[target] + settle(target));
		announce();
	}

	// A cue names the moment an action begins; its picture is complete a little later.
	function settle(index) {
		const next = spec.c[index + 1] !== undefined ? spec.c[index + 1] : duration;
		// A long copy or rotation must finish before a manual step freezes it.
		// Stay within this cue so its explanation still matches the picture.
		return next - spec.c[index] - (index + 1 < spec.c.length ? 0.001 : 0);
	}

	function announce() {
		const live = root.querySelector('[data-scene-live]');
		if (live) live.textContent = cueNode.textContent;
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
		speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
		refreshButtons();
	});
	scrub.addEventListener('input', () => {
		pause();
		wantsPlay = false;
		seek((Number(scrub.value) / 1000) * duration);
		announce();
	});

	const observer = view.IntersectionObserver && new view.IntersectionObserver((entries) => {
		for (const entry of entries) {
			visible = entry.isIntersecting;
			if (!visible && playing) pause();
			if (visible && wantsPlay && !playing) play();
			if (visible && !wantsPlay && !autoStarted && autoplayAllowed() && time === 0) {
				autoStarted = true;
				wantsPlay = true;
				play();
			}
		}
	}, { threshold: 0.35 });
	let autoStarted = false;

	function applyPreferences() {
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
	if (autoplayAllowed() && observer) {
		seek(0);
		observer.observe(root);
	} else {
		seek(duration);
		if (observer) observer.observe(root);
	}
}
