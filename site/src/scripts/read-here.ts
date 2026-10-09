type Playback = 'idle' | 'loading' | 'speaking' | 'paused' | 'finished';
interface SpeechBlock { text: string }
const mounted = new WeakSet<HTMLElement>();
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function transcriptChunks(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const raw = doc.querySelector('[data-reader-transcript-variants]')?.textContent;
  if (!raw) throw new Error('Listening text is unavailable.');
  const parsed: unknown = JSON.parse(raw);
  if (!record(parsed) || !Array.isArray(parsed.prose)) throw new Error('Listening text is unavailable.');
  const blocks = parsed.prose.filter((block: unknown): block is SpeechBlock => record(block) && typeof block.text === 'string' && !block.media && block.kind !== 'code');
  const result: string[] = [];
  for (const block of blocks) {
    // Bound each browser utterance at a word boundary. Prose comes from the
    // existing adapted listening edition; pictures and controls stay silent.
    let remaining = block.text.trim();
    while (remaining.length > 360) {
      const cut = remaining.lastIndexOf(' ', 360);
      const end = cut > 0 ? cut : 360;
      result.push(remaining.slice(0, end));
      remaining = remaining.slice(end).trimStart();
    }
    if (remaining) result.push(remaining);
  }
  if (!result.length) throw new Error('No listening text found.');
  return result;
}

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  mounted.add(root);
  const play = root.querySelector<HTMLButtonElement>('[data-read-here-play]');
  const stop = root.querySelector<HTMLButtonElement>('[data-read-here-stop]');
  const status = root.querySelector<HTMLElement>('[data-read-here-status]');
  if (!play || !stop || !status) return;
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    status.textContent = 'Read-aloud is unavailable in this browser.';
    return;
  }
  const synth = window.speechSynthesis;
  let state: Playback = 'idle', generation = 0, index = 0;
  let chunks: string[] = [];
  let utterance: SpeechSynthesisUtterance | null = null;
  let request: AbortController | null = null;
  const paint = (): void => {
    root.dataset.playback = state;
    play.disabled = state === 'loading';
    play.textContent = state === 'speaking' ? 'Pause reading' : state === 'paused' ? 'Resume reading' : state === 'finished' ? 'Read again' : state === 'loading' ? 'Loading text…' : 'Read here';
    play.setAttribute('aria-pressed', String(state === 'speaking' || state === 'paused'));
    stop.hidden = state === 'idle' || state === 'finished';
  };
  const cancel = (): void => {
    generation++;
    request?.abort(); request = null;
    if (state !== 'idle' && state !== 'finished') synth.cancel();
    utterance = null; index = 0; state = 'idle';
    status.textContent = 'Stopped.';
    paint();
  };
  const speak = (version: number): void => {
    if (version !== generation || state !== 'speaking') return;
    if (index >= chunks.length) { state = 'finished'; utterance = null; status.textContent = 'Finished reading.'; paint(); return; }
    const next = new SpeechSynthesisUtterance(chunks[index]);
    utterance = next;
    let preferred = '', rate = 1;
    try {
      preferred = localStorage.getItem('gha-speech-voice') || '';
      const saved = Number(localStorage.getItem('gha-speech-rate'));
      if (saved >= .75 && saved <= 2) rate = saved;
    } catch { /* Page-only defaults when storage is unavailable. */ }
    const voices = synth.getVoices();
    const chosen = voices.find(v => (v.voiceURI || `${v.name}|${v.lang}`) === preferred)
      || voices.find(v => /^en(?:-|$)/i.test(v.lang) && /natural|neural|premium/i.test(v.name))
      || voices.find(v => /^en(?:-|$)/i.test(v.lang));
    if (chosen) next.voice = chosen;
    next.lang = chosen?.lang || document.documentElement.lang || 'en';
    next.rate = rate;
    next.onstart = () => { if (version === generation) status.textContent = `Reading passage ${index + 1} of ${chunks.length}.`; };
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
  play.addEventListener('click', () => {
    if (state === 'speaking') { synth.pause(); state = 'paused'; status.textContent = 'Paused.'; paint(); return; }
    if (state === 'paused') { state = 'speaking'; synth.resume(); if (!utterance) speak(generation); paint(); return; }
    if (state === 'loading') return;
    const version = ++generation;
    void (async () => {
      try {
        if (!chunks.length) {
          state = 'loading'; paint();
          request = new AbortController();
          const url = new URL(root.dataset.readerUrl || '', document.baseURI);
          if (url.origin !== location.origin) throw new Error('Invalid listening path.');
          const response = await fetch(url.href, { signal: request.signal });
          if (!response.ok) throw new Error('Listening text could not be loaded.');
          chunks = transcriptChunks(await response.text());
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
  });
  stop.addEventListener('click', cancel);
  window.addEventListener('pagehide', cancel);
  paint();
}

export function mountReadHere(): void {
  const init = (): void => document.querySelectorAll<HTMLElement>('[data-read-here]').forEach(mount);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  document.addEventListener('astro:page-load', init);
}
