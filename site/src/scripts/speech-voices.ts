// Voice, speed and sample helpers shared by the page player (read-here.ts) and the listening dock (reader-tools.js).
// Storage keys are unchanged: gha-speech-voice holds a voice id, gha-speech-rate a number from 0.75 to 2.
export const SPEEDS: readonly number[] = [0.75, 1, 1.25, 1.5, 1.75, 2];
export const MIN_RATE = 0.75;
export const MAX_RATE = 2;
const VOICE_KEY = 'gha-speech-voice';
const RATE_KEY = 'gha-speech-rate';

export interface VoiceChoice {
  readonly id: string;
  readonly label: string;
  readonly lang: string;
  /** 2 for names that advertise Natural, Neural or Premium; 1 for Enhanced; 0 otherwise. */
  readonly quality: 0 | 1 | 2;
  readonly voice: SpeechSynthesisVoice;
}

export const voiceId = (voice: SpeechSynthesisVoice): string => voice.voiceURI || `${voice.name}|${voice.lang}`;
const isEnglish = (lang: string): boolean => /^en(?:-|$)/i.test(lang);

function qualityOf(name: string): 0 | 1 | 2 {
  if (/natural|neural|premium/i.test(name)) return 2;
  return /enhanced/i.test(name) ? 1 : 0;
}

/** English voices first, better-sounding ones before plainer ones, then alphabetical. */
export function listVoices(synth: SpeechSynthesis): VoiceChoice[] {
  return synth.getVoices().map((voice): VoiceChoice => {
    const quality = qualityOf(voice.name);
    const note = quality === 2 ? ' · natural' : quality === 1 ? ' · enhanced' : '';
    return { id: voiceId(voice), label: `${voice.name} · ${voice.lang}${note}`, lang: voice.lang, quality, voice };
  }).sort((a, b) => Number(isEnglish(b.lang)) - Number(isEnglish(a.lang)) || b.quality - a.quality || (a.lang + a.label).localeCompare(b.lang + b.label));
}

/** The saved voice if it still exists, otherwise the best English voice, otherwise the first one. */
export function chooseVoice(choices: readonly VoiceChoice[], preferredId: string): VoiceChoice | undefined {
  return choices.find(choice => choice.id === preferredId) ?? choices.find(choice => isEnglish(choice.lang)) ?? choices[0];
}

export function readVoicePreference(): string {
  try { return localStorage.getItem(VOICE_KEY) ?? ''; } catch { return ''; }
}

export function saveVoicePreference(id: string): void {
  try { localStorage.setItem(VOICE_KEY, id); } catch { /* the choice then lasts for this page */ }
}

export function readRatePreference(): number {
  try {
    const saved = Number(localStorage.getItem(RATE_KEY));
    if (saved >= MIN_RATE && saved <= MAX_RATE) return saved;
  } catch { /* default speed */ }
  return 1;
}

export function saveRatePreference(rate: number): void {
  try { localStorage.setItem(RATE_KEY, String(rate)); } catch { /* the speed then lasts for this page */ }
}

export const formatSpeed = (rate: number): string => `${Number(rate.toFixed(2))}×`;

/** The next common speed above `current`, wrapping to the slowest. */
export function nextSpeed(current: number): number {
  return SPEEDS.find(step => step > current + 0.001) ?? SPEEDS[0] ?? 1;
}

/** Fill a <select> with "Automatic" plus every voice, keeping the saved choice selected. */
export function fillVoiceSelect(select: HTMLSelectElement, choices: readonly VoiceChoice[], preferredId: string): void {
  const automatic = chooseVoice(choices, '');
  select.replaceChildren(new Option(automatic ? `Automatic · ${automatic.voice.name}` : 'Browser default', ''));
  for (const choice of choices) select.add(new Option(choice.label, choice.id));
  if (Array.from(select.options).some(option => option.value === preferredId)) select.value = preferredId;
}

/** Run `refresh` now and again whenever the browser reports a different voice list (many load late). */
export function watchVoices(synth: SpeechSynthesis, refresh: () => void): () => void {
  refresh();
  synth.addEventListener('voiceschanged', refresh);
  return () => synth.removeEventListener('voiceschanged', refresh);
}

/** Say one short sentence so a reader can compare voices before starting a lesson. */
export function speakSample(synth: SpeechSynthesis, choice: VoiceChoice | undefined, rate: number): void {
  synth.cancel();
  const sample = new SpeechSynthesisUtterance('This is how the lesson will sound at this speed.');
  if (choice) { sample.voice = choice.voice; sample.lang = choice.lang; }
  sample.rate = rate;
  synth.speak(sample);
}
