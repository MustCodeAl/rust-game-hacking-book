// One player per page, shared by desktop/mobile menus and the listening desk.
// No audio context, media request, or sound until a reader chooses to start it.
export function mountReadingAudio() {
	const roots = [...document.querySelectorAll('[data-reading-audio]')];
	if (!roots.length || document.documentElement.dataset.readingAudioReady) return;
	document.documentElement.dataset.readingAudioReady = 'true';
	let player = null;
	let context = null;
	let effects = false;
	let track = 'soft-music';
	let volume = 20;
	let message = 'Sound starts off. Play when you want it.';
	let generation = 0;
	try { volume = Math.max(0, Math.min(100, Number(localStorage.getItem('gha-audio-volume') ?? 20))) || 0; } catch {}
	try { effects = localStorage.getItem('gha-audio-effects') === 'on'; } catch {}
	if (effects) message = 'Soft effects on. Background sound stays paused.';

	function render() {
		const playing = player && !player.paused;
		for (const root of roots) {
			root.querySelector('[data-audio-track]').value = track;
			root.querySelector('[data-audio-volume]').value = String(volume);
			root.querySelector('[data-audio-effects]').checked = effects;
			const button = root.querySelector('[data-audio-play]');
			button.textContent = playing ? 'Pause' : 'Play';
			button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} background sound`);
			root.querySelector('[data-audio-stop]').disabled = !player;
			root.querySelector('[data-audio-summary]').textContent = playing ? 'Playing' : effects ? 'Buttons on' : 'Off';
			root.querySelector('[data-audio-status]').textContent = message;
		}
	}
	function stop() {
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
	async function play(root) {
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
			message = `${({ 'soft-music': 'Soft music', 'quiet-rain': 'Quiet rain', 'night-keys': 'Night keys', 'warm-hum': 'Warm hum' })[track] || 'Background sound'} playing.`;
		} catch {
			if (attempt !== generation) return;
			message = 'Sound could not start. Press Play to try again.';
		}
		render();
	}
	async function chime(kind = 'button') {
		if (!effects || volume === 0) return;
		const AudioContext = window.AudioContext || window.webkitAudioContext;
		if (!AudioContext) return;
		try {
			context ??= new AudioContext();
			if (context.state === 'suspended') await context.resume();
			if (!effects) return;
			const notes = {
				button: [[440, 660, 0.12]],
				lesson: [[523.25, 783.99, 0.22]],
				chapter: [[523.25, 1046.5, 0.32]],
				correct: [[523.25, 523.25, 0.1], [659.25, 783.99, 0.16]],
				wrong: [[246.94, 196, 0.2]],
				finish: [[523.25, 523.25, 0.1], [659.25, 659.25, 0.1], [783.99, 1046.5, 0.24]],
			}[kind] || [[440, 660, 0.12]];
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
	for (const root of roots) {
		root.querySelector('[data-audio-play]').addEventListener('click', () => play(root));
		root.querySelector('[data-audio-stop]').addEventListener('click', stop);
		root.querySelector('[data-audio-track]').addEventListener('change', event => {
			const selected = event.target.value;
			const wasPlaying = player && !player.paused;
			stop();
			track = selected;
			if (wasPlaying) play(root); else render();
		});
		root.querySelector('[data-audio-volume]').addEventListener('input', event => {
			volume = Number(event.target.value);
			if (player) player.volume = volume / 100;
			try { localStorage.setItem('gha-audio-volume', String(volume)); } catch {}
			render();
		});
		root.querySelector('[data-audio-effects]').addEventListener('change', event => {
			effects = event.target.checked;
			try { localStorage.setItem('gha-audio-effects', effects ? 'on' : 'off'); } catch {}
			render();
			if (effects) chime();
			else if (context) context.suspend().catch(() => {});
		});
	}
	document.addEventListener('click', event => {
		const button = event.target.closest('button');
		if (button && !button.disabled && !button.closest('[data-reading-audio], .academy-quiz, .concept-lab') && !button.matches('[data-done-toggle], [data-chapter-done]')) chime();
	});
	document.addEventListener('academy:sound', event => chime(event.detail?.kind));
	document.addEventListener('academy:completed', event => chime(event.detail?.kind === 'chapter' ? 'chapter' : 'lesson'));
	window.addEventListener('pagehide', () => { stop(); if (context) context.close().catch(() => {}); });
	render();
}
