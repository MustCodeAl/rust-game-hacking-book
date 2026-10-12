// One player per page, shared by desktop/mobile menus and the listening desk.
// No audio context, media request, or sound until a reader chooses to start it.

/** One tone of a chime: the frequencies it glides between (Hz) and its length (seconds). */
type Tone = readonly [from: number, to: number, duration: number];
const CHIME_FALLBACK: readonly Tone[] = [[440, 660, 0.12]];
const CHIMES: Readonly<Record<string, readonly Tone[]>> = {
	button: [[440, 660, 0.12]],
	lesson: [[523.25, 783.99, 0.22]],
	chapter: [[523.25, 1046.5, 0.32]],
	correct: [[523.25, 523.25, 0.1], [659.25, 783.99, 0.16]],
	wrong: [[246.94, 196, 0.2]],
	finish: [[523.25, 523.25, 0.1], [659.25, 659.25, 0.1], [783.99, 1046.5, 0.24]],
};
const TRACK_NAMES: Readonly<Record<string, string>> = { 'soft-music': 'Soft music', 'quiet-rain': 'Quiet rain', 'night-keys': 'Night keys', 'warm-hum': 'Warm hum' };

/** Safari's prefixed constructor is the only extra this file reads from the window. */
type AudioWindow = Window & typeof globalThis & { readonly webkitAudioContext?: typeof AudioContext };

/** The controls of one Reading sound menu; the page may hold several that share a player. */
interface AudioPanel {
	readonly root: HTMLElement;
	readonly track: HTMLSelectElement;
	readonly volume: HTMLInputElement;
	readonly effects: HTMLInputElement;
	readonly play: HTMLButtonElement;
	readonly stop: HTMLButtonElement;
	readonly summary: HTMLElement;
	readonly status: HTMLElement;
}

function panelOf(root: HTMLElement): AudioPanel | null {
	const track = root.querySelector<HTMLSelectElement>('[data-audio-track]');
	const volume = root.querySelector<HTMLInputElement>('[data-audio-volume]');
	const effects = root.querySelector<HTMLInputElement>('[data-audio-effects]');
	const play = root.querySelector<HTMLButtonElement>('[data-audio-play]');
	const stop = root.querySelector<HTMLButtonElement>('[data-audio-stop]');
	const summary = root.querySelector<HTMLElement>('[data-audio-summary]');
	const status = root.querySelector<HTMLElement>('[data-audio-status]');
	return track && volume && effects && play && stop && summary && status ? { root, track, volume, effects, play, stop, summary, status } : null;
}

/** What a click on the page hit, as far as the generic button click needs to know. */
interface ClickedButton {
	readonly disabled: boolean;
	closest(selector: string): unknown;
	matches(selector: string): boolean;
}
const hasClosest = (target: EventTarget | null): target is EventTarget & { closest(selector: string): unknown } =>
	target !== null && 'closest' in target && typeof target.closest === 'function';
const isClickedButton = (value: unknown): value is ClickedButton =>
	typeof value === 'object' && value !== null &&
	'disabled' in value && typeof value.disabled === 'boolean' &&
	'closest' in value && typeof value.closest === 'function' &&
	'matches' in value && typeof value.matches === 'function';

/** The `kind` a sound or completion event asks for, if it names one. */
function chimeKind(event: Event): string | undefined {
	const detail: unknown = 'detail' in event ? event.detail : undefined;
	if (typeof detail !== 'object' || detail === null || !('kind' in detail)) return undefined;
	return typeof detail.kind === 'string' ? detail.kind : undefined;
}

export function mountReadingAudio(): void {
	const roots = [...document.querySelectorAll<HTMLElement>('[data-reading-audio]')];
	if (!roots.length || document.documentElement.dataset.readingAudioReady) return;
	document.documentElement.dataset.readingAudioReady = 'true';
	const panels = roots.flatMap(root => { const panel = panelOf(root); return panel ? [panel] : []; });
	let player: HTMLAudioElement | null = null;
	let context: AudioContext | null = null;
	let effects = false;
	let track = 'soft-music';
	let volume = 20;
	let message = 'Sound starts off. Play when you want it.';
	let generation = 0;
	try { volume = Math.max(0, Math.min(100, Number(localStorage.getItem('gha-audio-volume') ?? 20))) || 0; } catch {}
	try { effects = localStorage.getItem('gha-audio-effects') === 'on'; } catch {}
	if (effects) message = 'Soft effects on. Background sound stays paused.';

	function render(): void {
		const playing = player && !player.paused;
		for (const panel of panels) {
			panel.track.value = track;
			panel.volume.value = String(volume);
			panel.effects.checked = effects;
			panel.play.textContent = playing ? 'Pause' : 'Play';
			panel.play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} background sound`);
			panel.stop.disabled = !player;
			panel.summary.textContent = playing ? 'Playing' : effects ? 'Buttons on' : 'Off';
			panel.status.textContent = message;
		}
	}
	function stop(): void {
		generation++;
		if (player) {
			player.pause();
			player.removeAttribute('src');
			player.load();
			player = null;
		}
		message = 'Background sound off.';
		render();
	}
	async function play(root: HTMLElement): Promise<void> {
		if (player && !player.paused) {
			player.pause();
			message = 'Background sound paused.';
			render();
			return;
		}
		if (!player) {
			player = new Audio();
			player.preload = 'none';
			player.loop = true;
			player.src = `${root.dataset.audioBase}${track}.mp3`;
		}
		player.volume = volume / 100;
		const attempt = ++generation;
		try {
			await player.play();
			if (attempt !== generation) return;
			message = `${TRACK_NAMES[track] || 'Background sound'} playing.`;
		} catch {
			if (attempt !== generation) return;
			message = 'Sound could not start. Press Play to try again.';
		}
		render();
	}
	async function chime(kind: string = 'button'): Promise<void> {
		if (!effects || volume === 0) return;
		const audioWindow: AudioWindow = window;
		const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
		if (!AudioContextConstructor) return;
		try {
			context ??= new AudioContextConstructor();
			if (context.state === 'suspended') await context.resume();
			if (!effects) return;
			const notes = CHIMES[kind] || CHIME_FALLBACK;
			let when = context.currentTime;
			for (const [from, to, duration] of notes) {
				const tone = context.createOscillator();
				const gain = context.createGain();
				tone.type = kind === 'wrong' ? 'triangle' : 'sine';
				tone.frequency.setValueAtTime(from, when);
				tone.frequency.exponentialRampToValueAtTime(to, when + duration * 0.5);
				gain.gain.setValueAtTime(0, when);
				gain.gain.linearRampToValueAtTime(volume / 100 * 0.035, when + 0.008);
				gain.gain.exponentialRampToValueAtTime(0.0001, when + duration - 0.01);
				tone.connect(gain);
				gain.connect(context.destination);
				tone.onended = () => { tone.disconnect(); gain.disconnect(); };
				tone.start(when);
				tone.stop(when + duration);
				when += duration * 0.85;
			}
		} catch { /* Sound is optional; reading controls still work. */ }
	}
	for (const panel of panels) {
		panel.play.addEventListener('click', () => play(panel.root));
		panel.stop.addEventListener('click', stop);
		panel.track.addEventListener('change', () => {
			const selected = panel.track.value;
			const wasPlaying = player && !player.paused;
			stop();
			track = selected;
			if (wasPlaying) play(panel.root); else render();
		});
		panel.volume.addEventListener('input', () => {
			volume = Number(panel.volume.value);
			if (player) player.volume = volume / 100;
			try { localStorage.setItem('gha-audio-volume', String(volume)); } catch {}
			render();
		});
		panel.effects.addEventListener('change', () => {
			effects = panel.effects.checked;
			try { localStorage.setItem('gha-audio-effects', effects ? 'on' : 'off'); } catch {}
			render();
			if (effects) chime();
			else if (context) context.suspend().catch(() => {});
		});
	}
	document.addEventListener('click', event => {
		const found: unknown = hasClosest(event.target) ? event.target.closest('button') : null;
		const button = isClickedButton(found) ? found : null;
		if (button && !button.disabled && !button.closest('[data-reading-audio], .academy-quiz, .concept-lab') && !button.matches('[data-done-toggle], [data-chapter-done]')) chime();
	});
	document.addEventListener('academy:sound', event => chime(chimeKind(event)));
	document.addEventListener('academy:completed', event => chime(chimeKind(event) === 'chapter' ? 'chapter' : 'lesson'));
	window.addEventListener('pagehide', () => { stop(); if (context) context.close().catch(() => {}); });
	render();
}
