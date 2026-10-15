import { adaptReaderArticle, showReaderVariant, chunkSpeechBlocks, collectReadableBlocks, plainLessonText, type SpeechSegment } from '../lib/reader-text.ts';
import { chooseVoice, fillVoiceSelect, listVoices, speakSample, type VoiceChoice } from './speech-voices';

type Playback = 'idle' | 'speaking' | 'paused' | 'finished';

/** Every control of one listening toolbar. */
interface Controls {
	readonly play: HTMLButtonElement;
	readonly playLabel: HTMLElement;
	readonly playIcon: HTMLElement;
	readonly pauseIcon: HTMLElement;
	readonly back: HTMLButtonElement;
	readonly forward: HTMLButtonElement;
	readonly stop: HTMLButtonElement;
	readonly speed: HTMLButtonElement;
	readonly speedLabel: HTMLElement;
	readonly speedName: HTMLElement;
	readonly voice: HTMLSelectElement;
	readonly sample: HTMLButtonElement;
	readonly now: HTMLElement;
	readonly rate: HTMLInputElement;
	readonly rateValue: HTMLElement;
	readonly includeCode: HTMLInputElement;
	readonly progress: HTMLProgressElement;
	readonly progressText: HTMLElement;
	readonly status: HTMLElement;
	readonly actionStatus: HTMLElement;
	readonly linkField: HTMLInputElement;
	readonly copyLink: HTMLElement;
	readonly copyText: HTMLElement;
	readonly download: HTMLElement;
}

function controlsOf(toolbar: HTMLElement): Controls | null {
	const play = toolbar.querySelector<HTMLButtonElement>('[data-speech-play]');
	const playLabel = toolbar.querySelector<HTMLElement>('[data-speech-play-label]');
	// These two are <svg> icons. `hidden` is not an SVG property, so showControls() setting it changes nothing on screen (as before).
	const playIcon = toolbar.querySelector<HTMLElement>('[data-speech-icon-play]');
	const pauseIcon = toolbar.querySelector<HTMLElement>('[data-speech-icon-pause]');
	const back = toolbar.querySelector<HTMLButtonElement>('[data-speech-back]');
	const forward = toolbar.querySelector<HTMLButtonElement>('[data-speech-forward]');
	const stop = toolbar.querySelector<HTMLButtonElement>('[data-speech-stop]');
	const speed = toolbar.querySelector<HTMLButtonElement>('[data-speech-speed]');
	const speedLabel = toolbar.querySelector<HTMLElement>('[data-speech-speed-label]');
	const speedName = toolbar.querySelector<HTMLElement>('[data-speech-speed-name]');
	const voice = toolbar.querySelector<HTMLSelectElement>('[data-speech-voice]');
	const sample = toolbar.querySelector<HTMLButtonElement>('[data-speech-sample]');
	const now = toolbar.querySelector<HTMLElement>('[data-speech-now]');
	const rate = toolbar.querySelector<HTMLInputElement>('[data-speech-rate]');
	const rateValue = toolbar.querySelector<HTMLElement>('[data-speech-rate-value]');
	const includeCode = toolbar.querySelector<HTMLInputElement>('[data-speech-code]');
	const progress = toolbar.querySelector<HTMLProgressElement>('[data-speech-progress]');
	const progressText = toolbar.querySelector<HTMLElement>('[data-speech-progress-text]');
	const status = toolbar.querySelector<HTMLElement>('[data-speech-status]');
	const actionStatus = toolbar.querySelector<HTMLElement>('[data-reader-action-status]');
	const linkField = toolbar.querySelector<HTMLInputElement>('[data-reader-link]');
	const copyLink = toolbar.querySelector<HTMLElement>('[data-reader-copy-link]');
	const copyText = toolbar.querySelector<HTMLElement>('[data-reader-copy-text]');
	const download = toolbar.querySelector<HTMLElement>('[data-reader-download]');
	if (!play || !playLabel || !playIcon || !pauseIcon || !back || !forward || !stop || !speed || !speedLabel || !speedName || !voice || !sample
		|| !now || !rate || !rateValue || !includeCode || !progress || !progressText || !status || !actionStatus || !linkField
		|| !copyLink || !copyText || !download) return null;
	return {
		play, playLabel, playIcon, pauseIcon, back, forward, stop, speed, speedLabel, speedName, voice, sample, now, rate, rateValue,
		includeCode, progress, progressText, status, actionStatus, linkField, copyLink, copyText, download,
	};
}

function mountOne(toolbar: HTMLElement): void {
	const articleId = toolbar.dataset.articleId;
	const found = articleId === undefined ? null : document.getElementById(articleId);
	if (!found) return;
	if (toolbar.dataset.readerMounted === 'true') return;
	toolbar.dataset.readerMounted = 'true';
	const article: HTMLElement = found;
	adaptReaderArticle(article);

	const controls = controlsOf(toolbar);
	if (!controls) return;
	const {
		play, playLabel, playIcon, pauseIcon, back, forward, stop, speed, speedLabel, speedName, voice, sample, now, rate, rateValue,
		includeCode, progress, progressText, status, actionStatus, linkField, copyLink, copyText, download,
	} = controls;
	const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
	const synth: SpeechSynthesis | null = supported ? window.speechSynthesis : null;
	let voices: VoiceChoice[] = [];
	let segments: SpeechSegment[] = [];
	let index = 0;
	let generation = 0;
	let state: Playback = 'idle';
	let activeElement: Element | null = null;
	let activeUtterance: SpeechSynthesisUtterance | null = null;
	let preferredVoice = '';
	try { preferredVoice = window.localStorage.getItem('gha-speech-voice') || ''; } catch { /* default voice */ }
	// True once the engine has begun the passage it was last given.
	let started = false;

	function setStatus(message: string): void {
		status.textContent = message;
	}

	function markActive(element: Element | null): void {
		activeElement?.classList.remove('is-being-read');
		activeElement = element;
		activeElement?.classList.add('is-being-read');
	}

	function showProgress(): void {
		progress.max = Math.max(segments.length, 1);
		progress.value = index;
		progressText.textContent = segments.length
			? `${Math.min(index, segments.length)} of ${segments.length} passages`
			: 'No readable text found';
		const here = segments[Math.min(index, segments.length - 1)];
		const active = state === 'speaking' || state === 'paused';
		now.textContent = here && active ? (here.text.length > 140 ? `${here.text.slice(0, 137).trimEnd()}…` : here.text) : '';
	}

	function showControls(): void {
		const active = state === 'speaking' || state === 'paused';
		// One button plays, pauses, and resumes; its label and icon say which.
		play.disabled = !supported;
		playLabel.textContent = state === 'speaking' ? 'Pause' : state === 'paused' ? 'Resume' : state === 'finished' ? 'Read again' : 'Play';
		playIcon.hidden = state === 'speaking';
		pauseIcon.hidden = state !== 'speaking';
		back.disabled = !supported || !active;
		forward.disabled = !supported || !active;
		stop.disabled = !supported || !active;
		speed.disabled = !supported;
		voice.disabled = !supported;
		rate.disabled = !supported;
		sample.disabled = !supported || state === 'speaking';
	}

	function gather() {
		const blocks = collectReadableBlocks(article, includeCode.checked);
		segments = chunkSpeechBlocks(blocks);
		showProgress();
		return blocks;
	}

	function updateVoices(): void {
		if (!synth) return;
		voices = listVoices(synth);
		fillVoiceSelect(voice, voices, preferredVoice || voice.value);
	}
	// A new voice starts the current passage again; reading on keeps it.
	voice.addEventListener('change', () => {
		preferredVoice = voice.value;
		try { window.localStorage.setItem('gha-speech-voice', preferredVoice); } catch { /* page-only choice */ }
		if (state !== 'speaking' && state !== 'paused') return;
		if (!synth) return;
		generation += 1;
		if (synth.paused) synth.resume();
		synth.cancel();
		if (state === 'speaking') speakNext(generation);
	});
	sample.addEventListener('click', () => { if (synth) speakSample(synth, chooseVoice(voices, voice.value), Number(rate.value)); });

	function speakNext(currentGeneration: number): void {
		if (!synth || currentGeneration !== generation || state !== 'speaking') return;
		const segment = segments[index];
		if (index >= segments.length || !segment) {
			state = 'finished';
			markActive(null);
			showProgress();
			showControls();
			setStatus('Finished reading this lesson.');
			return;
		}
		started = false;
		const utterance = new SpeechSynthesisUtterance(segment.text);
		activeUtterance = utterance;
		const chosen = chooseVoice(voices, voice.value);
		if (chosen) utterance.voice = chosen.voice;
		utterance.lang = chosen?.lang || document.documentElement.lang || 'en';
		utterance.rate = Number(rate.value);
		utterance.onstart = () => {
			if (currentGeneration !== generation) return;
			started = true;
			markActive(segment.element);
			showProgress();
			setStatus(`Reading passage ${index + 1} of ${segments.length}.`);
		};
		utterance.onend = () => {
			if (currentGeneration !== generation) return;
			activeUtterance = null;
			index += 1;
			showProgress();
			window.setTimeout(() => speakNext(currentGeneration), 0);
		};
		utterance.onerror = (event) => {
			if (currentGeneration !== generation) return;
			activeUtterance = null;
			state = 'idle';
			markActive(null);
			showControls();
			setStatus(`Speech stopped (${event.error || 'browser error'}). Press Play to try again.`);
		};
		try {
			synth.speak(utterance);
		} catch {
			state = 'idle';
			showControls();
			setStatus('This browser could not start speech. Try Chrome Reading mode or ElevenReader below.');
		}
	}

	function stopReading(message = 'Stopped. Press Play to start again.'): void {
		generation += 1;
		synth?.cancel();
		activeUtterance = null;
		state = 'idle';
		index = 0;
		markActive(null);
		showProgress();
		showControls();
		setStatus(message);
	}

	// A passage is one chunk of speech; a paragraph, list item, or heading can be
	// several. Skipping moves by whole paragraphs, to where each one starts.
	function blockStart(i: number): number {
		while (i > 0 && segments[i - 1]?.element === segments[i]?.element) i -= 1;
		return i;
	}

	function nextBlockStart(i: number): number {
		let next = i + 1;
		while (next < segments.length && segments[next]?.element === segments[i]?.element) next += 1;
		return next;
	}

	// After a skip, show where the reading went, clear of the pinned bar.
	function bringIntoView(element: Element | null | undefined): void {
		if (!element) return;
		const box = element.getBoundingClientRect();
		const dock = toolbar.querySelector('.reader-dock')?.getBoundingClientRect();
		const top = (dock ? dock.bottom : 0) + 12;
		if (box.top >= top && box.bottom <= window.innerHeight) return;
		const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: window.scrollY + box.top - top - 8, behavior: calm ? 'auto' : 'smooth' });
	}

	// Back goes to the start of the paragraph being read and, from its start, to
	// the one before; Forward goes to the start of the next. Skipping reads on.
	function skip(direction: number): void {
		if (!synth || !segments.length || (state !== 'speaking' && state !== 'paused')) return;
		const here = Math.min(index, segments.length - 1);
		const start = blockStart(here);
		const target = direction > 0 ? nextBlockStart(here) : start < here ? start : blockStart(Math.max(start - 1, 0));
		generation += 1;
		if (synth.paused) synth.resume();
		synth.cancel();
		if (target >= segments.length) {
			index = segments.length;
			state = 'finished';
			markActive(null);
			showProgress();
			showControls();
			setStatus('Finished reading this lesson.');
			return;
		}
		index = target;
		state = 'speaking';
		showProgress();
		showControls();
		setStatus(`Reading passage ${index + 1} of ${segments.length}.`);
		bringIntoView(segments[index]?.element);
		speakNext(generation);
	}

	play.addEventListener('click', () => {
		if (!synth) return;
		if (state === 'speaking') {
			if (started) {
				synth.pause();
			} else {
				// A pause sent before the engine has begun the passage is ignored, and the
				// passage then plays anyway. Drop it instead; Resume gives it again.
				generation += 1;
				synth.cancel();
			}
			state = 'paused';
			showControls();
			setStatus(`Paused at passage ${index + 1} of ${segments.length}.`);
			return;
		}
		if (state === 'paused') {
			state = 'speaking';
			// After a speed change there is no passage left to resume, and a paused
			// engine ignores new speech until it is resumed.
			synth.resume();
			if (!synth.speaking) speakNext(generation);
			showControls();
			setStatus(`Reading passage ${index + 1} of ${segments.length}.`);
			return;
		}
		if (state === 'finished') index = 0;
		gather();
		if (!segments.length) {
			setStatus('There is no lesson text to read.');
			return;
		}
		generation += 1;
		synth.cancel();
		state = 'speaking';
		showControls();
		setStatus('Starting speech…');
		speakNext(generation);
	});
	back.addEventListener('click', () => skip(-1));
	forward.addEventListener('click', () => skip(1));
	stop.addEventListener('click', () => stopReading());
	includeCode.addEventListener('change', () => {
		showReaderVariant(article, includeCode.checked);
		if (state === 'speaking' || state === 'paused') {
			stopReading('Code preference changed. Press Play to begin with the new selection.');
		} else {
			index = 0;
			gather();
		}
	});
	const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
	const speedText = (value: string | number): string => `${Number(Number(value).toFixed(2))}×`;

	function showSpeed(): void {
		rateValue.textContent = `${Number(rate.value).toFixed(2)}×`;
		speedLabel.textContent = speedText(rate.value);
		speedName.textContent = `Reading speed ${speedText(rate.value)}. Press to change.`;
	}

	// Speech cannot change speed in the middle of a passage, so a new speed starts
	// the current passage again at that speed, and reading on from there keeps it.
	function applySpeed(): void {
		showSpeed();
		try {
			window.localStorage.setItem('gha-speech-rate', String(rate.value));
		} catch {
			/* storage can be unavailable; the speed then lasts for this page */
		}
		if (state !== 'speaking' && state !== 'paused') return;
		if (!synth) return;
		generation += 1;
		if (synth.paused) synth.resume();
		synth.cancel();
		if (state === 'speaking') speakNext(generation);
	}

	// The button steps through the common speeds and wraps round to the slowest.
	speed.addEventListener('click', () => {
		const current = Number(rate.value);
		rate.value = String(SPEEDS.find((step) => step > current + 0.001) ?? SPEEDS[0]);
		applySpeed();
	});
	rate.addEventListener('input', showSpeed);
	rate.addEventListener('change', applySpeed);

	async function copyToClipboard(value: string, onSuccess: string, onFailure: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(value);
			actionStatus.textContent = onSuccess;
		} catch {
			actionStatus.textContent = onFailure;
		}
	}
	copyLink.addEventListener('click', () => {
		copyToClipboard(
			linkField.value,
			'Public reader link copied.',
			'Copy was blocked. Select the public link in the field and copy it manually.',
		);
	});
	copyText.addEventListener('click', () => {
		const blocks = collectReadableBlocks(article, includeCode.checked);
		copyToClipboard(
			plainLessonText(toolbar.dataset.title ?? '', toolbar.dataset.sourceUrl ?? '', blocks),
			'Listening text copied.',
			'Copy was blocked. Use Download text instead.',
		);
	});
	download.addEventListener('click', () => {
		const blocks = collectReadableBlocks(article, includeCode.checked);
		const contents = plainLessonText(toolbar.dataset.title ?? '', toolbar.dataset.sourceUrl ?? '', blocks);
		const objectUrl = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
		const anchor = document.createElement('a');
		anchor.href = objectUrl;
		anchor.download = toolbar.dataset.filename || 'lesson.txt';
		anchor.click();
		window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
		actionStatus.textContent = 'Listening text downloaded.';
	});
	linkField.addEventListener('focus', () => linkField.select());
	window.addEventListener('pagehide', () => {
		if (state === 'speaking' || state === 'paused') {
			generation += 1;
			synth?.cancel();
		}
	});

	gather();
	try {
		const saved = Number(window.localStorage.getItem('gha-speech-rate'));
		if (saved >= 0.75 && saved <= 2) rate.value = String(saved);
	} catch {
		/* the default speed is fine */
	}
	showSpeed();
	showControls();
	if (synth) {
		updateVoices();
		if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', updateVoices);
		else synth.onvoiceschanged = updateVoices;
		window.setTimeout(updateVoices, 800);
		setStatus('Ready. Press Play to read this lesson aloud.');
	} else {
		setStatus('Built-in speech is unavailable in this browser. Use Chrome Reading mode or ElevenReader below.');
	}
}

export function mountReaderTools(root: ParentNode = document): void {
	root.querySelectorAll<HTMLElement>('[data-reader-tools]').forEach(mountOne);
}
