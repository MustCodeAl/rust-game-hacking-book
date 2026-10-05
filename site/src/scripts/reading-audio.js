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
			message = `${track === 'soft-music' ? 'Soft music' : 'Quiet rain'} playing.`;
		} catch {
			if (attempt !== generation) return;
			message = 'Sound could not start. Press Play to try again.';
		}
		render();
	}
	async function chime() {
		if (!effects || volume === 0) return;
		const AudioContext = window.AudioContext || window.webkitAudioContext;
		if (!AudioContext) return;
		try {
			context ??= new AudioContext();
			if (context.state === 'suspended') await context.resume();
			if (!effects) return;
			const tone = context.createOscillator();
			const gain = context.createGain();
			const now = context.currentTime;
			tone.type = 'sine';
			tone.frequency.setValueAtTime(440, now);
			tone.frequency.exponentialRampToValueAtTime(660, now + 0.06);
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(volume / 100 * 0.035, now + 0.008);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
			tone.connect(gain);
			gain.connect(context.destination);
			tone.onended = () => { tone.disconnect(); gain.disconnect(); };
			tone.start(now);
			tone.stop(now + 0.12);
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
			render();
			if (effects) chime();
			else if (context) context.suspend().catch(() => {});
		});
	}
	document.addEventListener('click', event => {
		const button = event.target.closest('button');
		if (button && !button.disabled && !button.closest('[data-reading-audio]')) chime();
	});
	window.addEventListener('pagehide', () => { stop(); if (context) context.close().catch(() => {}); });
	render();
}
