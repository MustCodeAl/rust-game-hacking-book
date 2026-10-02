import { adaptReaderArticle, showReaderVariant, chunkSpeechBlocks, collectReadableBlocks, plainLessonText } from '../lib/reader-text.mjs';

function mountOne(toolbar) {
	const article = document.getElementById(toolbar.dataset.articleId);
	if (!article) return;
	if (toolbar.dataset.readerMounted === 'true') return;
	toolbar.dataset.readerMounted = 'true';
	adaptReaderArticle(article);

	const play = toolbar.querySelector('[data-speech-play]');
	const pause = toolbar.querySelector('[data-speech-pause]');
	const stop = toolbar.querySelector('[data-speech-stop]');
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
		play.disabled = !supported || state === 'speaking';
		play.textContent = state === 'paused' ? 'Resume' : state === 'finished' ? 'Read again' : 'Play';
		pause.disabled = !supported || state !== 'speaking';
		stop.disabled = !supported || (state !== 'speaking' && state !== 'paused');
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
		const selected = voice.value;
		voices = synth.getVoices().slice().sort((a, b) =>
			(a.lang + a.name).localeCompare(b.lang + b.name),
		);
		voice.replaceChildren(new Option('Browser default', ''));
		voices.forEach((item) => {
			voice.add(new Option(`${item.name} · ${item.lang}`, item.voiceURI || `${item.name}|${item.lang}`));
		});
		if ([...voice.options].some((option) => option.value === selected)) voice.value = selected;
	}

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
		const utterance = new SpeechSynthesisUtterance(segment.text);
		const chosen = voices.find((item) => (item.voiceURI || `${item.name}|${item.lang}`) === voice.value);
		if (voice.value !== '' && chosen) utterance.voice = chosen;
		utterance.lang = chosen?.lang || document.documentElement.lang || 'en';
		utterance.rate = Number(rate.value);
		utterance.onstart = () => {
			if (currentGeneration !== generation) return;
			markActive(segment.element);
			setStatus(`Reading passage ${index + 1} of ${segments.length}.`);
		};
		utterance.onend = () => {
			if (currentGeneration !== generation) return;
			index += 1;
			showProgress();
			window.setTimeout(() => speakNext(currentGeneration), 0);
		};
		utterance.onerror = (event) => {
			if (currentGeneration !== generation) return;
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
		state = 'idle';
		index = 0;
		markActive(null);
		showProgress();
		showControls();
		setStatus(message);
	}

	play.addEventListener('click', () => {
		if (!supported) return;
		if (state === 'paused') {
			state = 'speaking';
			if (synth.speaking) synth.resume();
			else speakNext(generation);
			showControls();
			setStatus(`Reading passage ${index + 1} of ${segments.length}.`);
			return;
		}
		if (state === 'speaking') return;
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
	pause.addEventListener('click', () => {
		if (state !== 'speaking') return;
		synth.pause();
		state = 'paused';
		showControls();
		setStatus(`Paused at passage ${index + 1} of ${segments.length}.`);
	});
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
	rate.addEventListener('input', () => {
		rateValue.textContent = `${Number(rate.value).toFixed(2)}×`;
	});

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
	rateValue.textContent = `${Number(rate.value).toFixed(2)}×`;
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
