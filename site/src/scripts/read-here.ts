// "Read here": read the lesson aloud on the page the reader is already on, from the listening edition's text.
// Starting shows a compact player: previous/next paragraph, pause, speed, voice and progress.
import {
  chooseVoice, fillVoiceSelect, formatSpeed, listVoices, nextSpeed, readRatePreference, readVoicePreference,
  saveRatePreference, saveVoicePreference, speakSample, watchVoices, type VoiceChoice,
} from './speech-voices';

type Playback = 'idle' | 'loading' | 'speaking' | 'paused' | 'finished';
interface SpeechBlock { text: string }
/** One utterance. `block` numbers the paragraph it came from, so skipping moves by paragraph. */
export interface Passage { readonly text: string; readonly block: number }
const mounted = new WeakSet<HTMLElement>();
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function transcriptPassages(html: string): Passage[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const raw = doc.querySelector('[data-reader-transcript-variants]')?.textContent;
  if (!raw) throw new Error('Listening text is unavailable.');
  const parsed: unknown = JSON.parse(raw);
  if (!record(parsed) || !Array.isArray(parsed.prose)) throw new Error('Listening text is unavailable.');
  const blocks = parsed.prose.filter((block: unknown): block is SpeechBlock => record(block) && typeof block.text === 'string' && !block.media && block.kind !== 'code');
  const result: Passage[] = [];
  blocks.forEach((block, blockIndex) => {
    // Bound each browser utterance at a word boundary. Prose comes from the
    // existing adapted listening edition; pictures and controls stay silent.
    let remaining = block.text.trim();
    while (remaining.length > 360) {
      const cut = remaining.lastIndexOf(' ', 360);
      const end = cut > 0 ? cut : 360;
      result.push({ text: remaining.slice(0, end), block: blockIndex });
      remaining = remaining.slice(end).trimStart();
    }
    if (remaining) result.push({ text: remaining, block: blockIndex });
  });
  if (!result.length) throw new Error('No listening text found.');
  return result;
}

export function transcriptChunks(html: string): string[] {
  return transcriptPassages(html).map(passage => passage.text);
}

/** Index of the first passage of the paragraph that contains passage `i`. */
export function blockStart(passages: readonly Passage[], i: number): number {
  let start = i;
  while (start > 0 && passages[start - 1]?.block === passages[i]?.block) start -= 1;
  return start;
}

/** Index of the first passage of the next paragraph, or passages.length at the end. */
export function nextBlockStart(passages: readonly Passage[], i: number): number {
  let next = i + 1;
  while (next < passages.length && passages[next]?.block === passages[i]?.block) next += 1;
  return next;
}

const trimmed = (text: string): string => (text.length > 140 ? `${text.slice(0, 137).trimEnd()}…` : text);

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  mounted.add(root);
  const q = <T extends HTMLElement | SVGElement>(selector: string): T | null => root.querySelector<T>(selector);
  const start = q<HTMLButtonElement>('[data-read-here-play]');
  const status = q<HTMLElement>('[data-read-here-status]');
  const bar = q<HTMLElement>('[data-read-here-bar]');
  const now = q<HTMLElement>('[data-read-here-now]');
  const progress = q<HTMLProgressElement>('[data-read-here-progress]');
  const back = q<HTMLButtonElement>('[data-read-here-back]');
  const toggle = q<HTMLButtonElement>('[data-read-here-toggle]');
  const toggleLabel = q<HTMLElement>('[data-read-here-toggle-label]');
  const playIcon = q<SVGElement>('[data-read-here-icon-play]');
  const pauseIcon = q<SVGElement>('[data-read-here-icon-pause]');
  const forward = q<HTMLButtonElement>('[data-read-here-forward]');
  const speedButton = q<HTMLButtonElement>('[data-read-here-speed]');
  const voiceSelect = q<HTMLSelectElement>('[data-read-here-voice]');
  const sample = q<HTMLButtonElement>('[data-read-here-sample]');
  const stop = q<HTMLButtonElement>('[data-read-here-stop]');
  if (!start || !status || !bar || !now || !progress || !back || !toggle || !toggleLabel || !playIcon || !pauseIcon || !forward || !speedButton || !voiceSelect || !sample || !stop) return;
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    status.textContent = 'Read-aloud is unavailable in this browser.';
    return;
  }
  const synth = window.speechSynthesis;
  let state: Playback = 'idle', generation = 0, index = 0;
  let passages: Passage[] = [];
  let utterance: SpeechSynthesisUtterance | null = null;
  let request: AbortController | null = null;
  let rate = readRatePreference();
  let voices: VoiceChoice[] = [];

  const active = (): boolean => state === 'speaking' || state === 'paused';
  // Floating buttons (Notes, chat) rise by the player's height so they never sit on it.
  const syncHeight = (): void => { document.documentElement.style.setProperty('--read-player-height', bar.hidden ? '0px' : `${bar.offsetHeight}px`); };
  if ('ResizeObserver' in window) new ResizeObserver(syncHeight).observe(bar);
  const paint = (): void => {
    root.dataset.playback = state;
    start.disabled = state === 'loading';
    start.textContent = state === 'finished' ? 'Read again' : state === 'loading' ? 'Loading text…' : 'Read here';
    start.hidden = active();
    bar.hidden = !(active() || state === 'loading');
    document.documentElement.dataset.readPlayer = bar.hidden ? 'off' : 'on';
    syncHeight();
    toggleLabel.textContent = state === 'speaking' ? 'Pause' : 'Resume';
    playIcon.toggleAttribute('hidden', state === 'speaking');
    pauseIcon.toggleAttribute('hidden', state !== 'speaking');
    toggle.setAttribute('aria-label', state === 'speaking' ? 'Pause reading' : 'Resume reading');
    toggle.disabled = !active();
    back.disabled = forward.disabled = !active();
    sample.disabled = state === 'speaking';
    speedButton.textContent = formatSpeed(rate);
    speedButton.setAttribute('aria-label', `Reading speed ${formatSpeed(rate)}. Press to change.`);
    progress.max = Math.max(passages.length, 1);
    progress.value = Math.min(index + 1, passages.length);
    const current = passages[Math.min(index, passages.length - 1)];
    now.textContent = current && active() ? trimmed(current.text) : state === 'loading' ? 'Loading the listening text…' : '';
  };
  const cancel = (message = 'Stopped.'): void => {
    generation++;
    request?.abort(); request = null;
    if (state !== 'idle' && state !== 'finished') synth.cancel();
    utterance = null; index = 0; state = 'idle';
    status.textContent = message;
    paint();
  };
  const speak = (version: number): void => {
    if (version !== generation || state !== 'speaking') return;
    if (index >= passages.length) { state = 'finished'; utterance = null; status.textContent = 'Finished reading.'; paint(); return; }
    const passage = passages[index];
    if (!passage) return;
    const next = new SpeechSynthesisUtterance(passage.text);
    utterance = next;
    const chosen = chooseVoice(voices, readVoicePreference());
    if (chosen) next.voice = chosen.voice;
    next.lang = chosen?.lang || document.documentElement.lang || 'en';
    next.rate = rate;
    next.onstart = () => { if (version === generation) { status.textContent = `Reading passage ${index + 1} of ${passages.length}.`; paint(); } };
    next.onend = () => {
      if (version !== generation) return;
      utterance = null; index++;
      queueMicrotask(() => speak(version));
    };
    const fail = (): void => {
      if (version !== generation) return;
      utterance = null; state = 'idle';
      status.textContent = 'Speech stopped. Press Read here to try again.';
      paint();
    };
    next.onerror = fail;
    try { synth.speak(next); } catch { fail(); }
  };
  /** A new speed or voice takes effect by starting the current passage again; nothing else restarts. */
  const restartPassage = (): void => {
    if (!active()) return;
    generation++;
    if (synth.paused) synth.resume();
    synth.cancel(); utterance = null;
    if (state === 'speaking') speak(generation);
  };
  const skip = (direction: 1 | -1): void => {
    if (!active() || !passages.length) return;
    const here = Math.min(index, passages.length - 1);
    const begin = blockStart(passages, here);
    const target = direction > 0 ? nextBlockStart(passages, here) : begin < here ? begin : blockStart(passages, Math.max(begin - 1, 0));
    generation++;
    if (synth.paused) synth.resume();
    synth.cancel(); utterance = null;
    if (target >= passages.length) { index = passages.length; state = 'finished'; status.textContent = 'Finished reading.'; paint(); return; }
    index = target; state = 'speaking'; paint(); speak(generation);
  };
  const begin = (): void => {
    const version = ++generation;
    void (async () => {
      try {
        if (!passages.length) {
          state = 'loading'; paint();
          request = new AbortController();
          const url = new URL(root.dataset.readerUrl || '', document.baseURI);
          if (url.origin !== location.origin) throw new Error('Invalid listening path.');
          const response = await fetch(url.href, { signal: request.signal });
          if (!response.ok) throw new Error('Listening text could not be loaded.');
          passages = transcriptPassages(await response.text());
          request = null;
        }
        if (version !== generation) return;
        index = 0; state = 'speaking'; synth.resume(); paint(); speak(version);
      } catch {
        if (version !== generation) return;
        state = 'idle'; request = null;
        status.textContent = 'Listening text could not be loaded. Use the listening edition link.';
        paint();
      }
    })();
  };

  start.addEventListener('click', () => { if (state !== 'loading') begin(); });
  toggle.addEventListener('click', () => {
    if (state === 'speaking') { synth.pause(); state = 'paused'; status.textContent = `Paused at passage ${index + 1} of ${passages.length}.`; paint(); return; }
    if (state === 'paused') { state = 'speaking'; synth.resume(); if (!utterance) speak(generation); paint(); }
  });
  back.addEventListener('click', () => skip(-1));
  forward.addEventListener('click', () => skip(1));
  speedButton.addEventListener('click', () => { rate = nextSpeed(rate); saveRatePreference(rate); paint(); restartPassage(); });
  voiceSelect.addEventListener('change', () => { saveVoicePreference(voiceSelect.value); restartPassage(); });
  sample.addEventListener('click', () => speakSample(synth, chooseVoice(voices, voiceSelect.value), rate));
  stop.addEventListener('click', () => { cancel(); start.focus(); });
  bar.addEventListener('keydown', (event: KeyboardEvent) => { if (event.key === 'Escape') { cancel(); start.focus(); } });
  window.addEventListener('pagehide', () => cancel());
  watchVoices(synth, () => { voices = listVoices(synth); fillVoiceSelect(voiceSelect, voices, readVoicePreference()); });
  start.disabled = false;
  paint();
}

export function mountReadHere(): void {
  const init = (): void => document.querySelectorAll<HTMLElement>('[data-read-here]').forEach(mount);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  document.addEventListener('astro:page-load', init);
}
