import { adaptReaderArticle, showReaderVariant, chunkSpeechBlocks, collectReadableBlocks, plainLessonText } from '../lib/reader-text.ts';

function mountOne(toolbar) {
	const article = document.getElementById(toolbar.dataset.articleId);
	if (!article) return;
	if (toolbar.dataset.readerMounted === 'true') return;
	toolbar.dataset.readerMounted = 'true';
	adaptReaderArticle(article);

	const play = toolbar.querySelector('[data-speech-play]');
	const playLabel = toolbar.querySelector('[data-speech-play-label]');
	const playIcon = toolbar.querySelector('[data-speech-icon-play]');
	const pauseIcon = toolbar.querySelector('[data-speech-icon-pause]');
	const back = toolbar.querySelector('[data-speech-back]');
	const forward = toolbar.querySelector('[data-speech-forward]');
	const stop = toolbar.querySelector('[data-speech-stop]');
	const speed = toolbar.querySelector('[data-speech-speed]');
	const speedLabel = toolbar.querySelector('[data-speech-speed-label]');
	const speedName = toolbar.querySelector('[data-speech-speed-name]');
	const voice = toolbar.querySelector('[data-speech-voice]');
	const rate = toolbar.querySelector('[data-speech-rate]');
	const rateValue = toolbar.querySelector('[data-speech-rate-value]');
	const includeCode = toolbar.querySelector('[data-speech-code]');
	const progress = toolbar.querySelector('[data-speech-progress]');
	const progressText = toolbar.querySelector('[data-speech-progress-text]');
	const status = toolbar.querySelector('[data-speech-status]');
	const actionStatus = toolbar.querySelector('[data-reader-action-status]');
	const linkField = toolbar.querySelector('[data-reader-link]');
	const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
	const synth = supported ? window.speechSynthesis : null;
	let voices = [];
	let segments = [];
	let index = 0;
	let generation = 0;
	let state = 'idle';
	let activeElement = null;
	let activeUtterance = null;
	let preferredVoice = '';
	try { preferredVoice = window.localStorage.getItem('gha-speech-voice') || ''; } catch { /* default voice */ }
	// True once the engine has begun the passage it was last given.
	let started = false;

	function setStatus(message) {
		status.textContent = message;
	}

	function markActive(element) {
		activeElement?.classList.remove('is-being-read');
		activeElement = element;
		activeElement?.classList.add('is-being-read');
	}

	function showProgress() {
		progress.max = Math.max(segments.length, 1);
		progress.value = index;
		progressText.textContent = segments.length
			? `${Math.min(index, segments.length)} of ${segments.length} passages`
			: 'No readable text found';
	}

	function showControls() {
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
	}

	function gather() {
		const blocks = collectReadableBlocks(article, includeCode.checked);
		segments = chunkSpeechBlocks(blocks);
		showProgress();
		return blocks;
	}

	function updateVoices() {
		if (!supported) return;
		const selected = preferredVoice || voice.value;
		const english = (item) => /^en(?:-|$)/i.test(item.lang);
		const quality = (item) => /natural|neural|premium/i.test(item.name) ? 2 : /enhanced/i.test(item.name) ? 1 : 0;
		voices = synth.getVoices().slice().sort((a, b) =>
			Number(english(b)) - Number(english(a)) || quality(b) - quality(a) || (a.lang + a.name).localeCompare(b.lang + b.name),
		);
		const automatic = voices.find(english) || voices.find((item) => item.default) || voices[0];
		voice.replaceChildren(new Option(automatic ? `Automatic · ${automatic.name}` : 'Browser default', ''));
		voices.forEach((item) => {
			voice.add(new Option(`${item.name} · ${item.lang}`, item.voiceURI || `${item.name}|${item.lang}`));
		});
		if ([...voice.options].some((option) => option.value === selected)) voice.value = selected;
	}
	voice.addEventListener('change', () => {
		preferredVoice = voice.value;
		try { window.localStorage.setItem('gha-speech-voice', preferredVoice); } catch { /* page-only choice */ }
	});

	function speakNext(currentGeneration) {
		if (currentGeneration !== generation || state !== 'speaking') return;
		if (index >= segments.length) {
			state = 'finished';
			markActive(null);
			showProgress();
			showControls();
			setStatus('Finished reading this lesson.');
			return;
		}
		const segment = segments[index];
		started = false;
		const utterance = new SpeechSynthesisUtterance(segment.text);
		activeUtterance = utterance;
		const chosen = voice.value ? voices.find((item) => (item.voiceURI || `${item.name}|${item.lang}`) === voice.value) : voices.find((item) => /^en(?:-|$)/i.test(item.lang));
		if (chosen) utterance.voice = chosen;
		utterance.lang = chosen?.lang || document.documentElement.lang || 'en';
		utterance.rate = Number(rate.value);
		utterance.onstart = () => {
			if (currentGeneration !== generation) return;
			started = true;
			markActive(segment.element);
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

	function stopReading(message = 'Stopped. Press Play to start again.') {
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
	function blockStart(i) {
		while (i > 0 && segments[i - 1].element === segments[i].element) i -= 1;
		return i;
	}

	function nextBlockStart(i) {
		let next = i + 1;
		while (next < segments.length && segments[next].element === segments[i].element) next += 1;
		return next;
	}

	// After a skip, show where the reading went, clear of the pinned bar.
	function bringIntoView(element) {
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
	function skip(direction) {
		if (!segments.length || (state !== 'speaking' && state !== 'paused')) return;
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
		bringIntoView(segments[index].element);
		speakNext(generation);
	}

	play.addEventListener('click', () => {
		if (!supported) return;
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
	const speedText = (value) => `${Number(Number(value).toFixed(2))}×`;

	function showSpeed() {
		rateValue.textContent = `${Number(rate.value).toFixed(2)}×`;
		speedLabel.textContent = speedText(rate.value);
		speedName.textContent = `Reading speed ${speedText(rate.value)}. Press to change.`;
	}

	// Speech cannot change speed in the middle of a passage, so a new speed starts
	// the current passage again at that speed, and reading on from there keeps it.
	function applySpeed() {
		showSpeed();
		try {
			window.localStorage.setItem('gha-speech-rate', String(rate.value));
		} catch {
			/* storage can be unavailable; the speed then lasts for this page */
		}
		if (state !== 'speaking' && state !== 'paused') return;
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

	async function copyText(value, onSuccess, onFailure) {
		try {
			await navigator.clipboard.writeText(value);
			actionStatus.textContent = onSuccess;
		} catch {
			actionStatus.textContent = onFailure;
		}
	}
	toolbar.querySelector('[data-reader-copy-link]').addEventListener('click', () => {
		copyText(
			linkField.value,
			'Public reader link copied.',
			'Copy was blocked. Select the public link in the field and copy it manually.',
		);
	});
	toolbar.querySelector('[data-reader-copy-text]').addEventListener('click', () => {
		const blocks = collectReadableBlocks(article, includeCode.checked);
		copyText(
			plainLessonText(toolbar.dataset.title, toolbar.dataset.sourceUrl, blocks),
			'Listening text copied.',
			'Copy was blocked. Use Download text instead.',
		);
	});
	toolbar.querySelector('[data-reader-download]').addEventListener('click', () => {
		const blocks = collectReadableBlocks(article, includeCode.checked);
		const contents = plainLessonText(toolbar.dataset.title, toolbar.dataset.sourceUrl, blocks);
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
	if (supported) {
		updateVoices();
		if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', updateVoices);
		else synth.onvoiceschanged = updateVoices;
		window.setTimeout(updateVoices, 800);
		setStatus('Ready. Press Play to read this lesson aloud.');
	} else {
		setStatus('Built-in speech is unavailable in this browser. Use Chrome Reading mode or ElevenReader below.');
	}
}

export function mountReaderTools(root = document) {
	root.querySelectorAll('[data-reader-tools]').forEach(mountOne);
}
