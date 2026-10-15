import assert from 'node:assert/strict';
import { mountReadingAudio } from '../src/scripts/reading-audio.ts';

// Check consent and completion events without playing any sound.
type Listener = (event: unknown) => void;
class FakeField {
  value = '';
  checked = false;
  disabled = false;
  textContent = '';
  readonly listeners = new Map<string, Listener>();
  addEventListener(name: string, callback: Listener): void { this.listeners.set(name, callback); }
  setAttribute(): void {}
  fire(name: string, event: unknown): void {
    const callback = this.listeners.get(name);
    if (!callback) throw new Error(`No ${name} listener was registered.`);
    callback(event);
  }
}
const events = new Map<string, Listener>();
const fields = new Map<string, FakeField>();
const store = new Map<string, string>();
const durations: number[] = [];
let audioPlayers = 0;
let contexts = 0;
const field = (selector: string): FakeField => {
  let found = fields.get(selector);
  if (!found) {
    found = new FakeField();
    fields.set(selector, found);
  }
  return found;
};
const emit = (name: string, event: unknown): void => {
  const callback = events.get(name);
  if (!callback) throw new Error(`No ${name} listener was registered.`);
  callback(event);
};
const install = (name: string, value: unknown): void => {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
};
const root = { dataset: { audioBase: '/assets/audio/' }, querySelector: field };
install('document', {
  documentElement: { dataset: {} },
  querySelectorAll: () => [root],
  addEventListener: (name: string, callback: Listener) => events.set(name, callback)
});
install('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value)
});
class FakeContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  constructor() { contexts++; }
  createOscillator() { return {
    frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect() {}, disconnect() {}, start() {}, stop(time: number) { durations.push(time); }
  }; }
  createGain() { return {
    gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect() {}, disconnect() {}
  }; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() {}
}
install('window', { AudioContext: FakeContext, addEventListener() {} });
install('Audio', class { constructor() { audioPlayers++; } });
mountReadingAudio();
emit('academy:completed', { detail: { kind: 'lesson' } });
assert.equal(contexts, 0, 'Completion started sound before consent');
assert.equal(audioPlayers, 0, 'Background audio started automatically');
const effects = field('[data-audio-effects]');
effects.checked = true;
effects.fire('change', { target: effects });
assert.equal(store.get('gha-audio-effects'), 'on');
assert.equal(durations.at(-1), 0.12, 'Effect preview is missing');
emit('academy:completed', { detail: { kind: 'lesson' } });
assert.equal(durations.at(-1), 0.22);
emit('academy:completed', { detail: { kind: 'chapter' } });
assert.equal(durations.at(-1), 0.32);
const count = durations.length;
emit('click', { target: { closest: () => ({ disabled: false, closest: () => null, matches: () => true }) } });
assert.equal(durations.length, count, 'Completion button also played a generic click');
effects.checked = false;
effects.fire('change', { target: effects });
emit('academy:completed', { detail: { kind: 'chapter' } });
assert.equal(durations.length, count, 'Disabled completion sounds still played');
assert.equal(audioPlayers, 0, 'Completion started background music');
console.log('reading-audio: consent, saved opt-out, distinct completion tones, and no duplicate click all pass.');
