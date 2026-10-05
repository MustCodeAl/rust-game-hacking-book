import assert from 'node:assert/strict';
import { mountReadingAudio } from '../src/scripts/reading-audio.js';

// Check consent and completion events without playing any sound.
const events = new Map();
const fields = new Map();
const store = new Map();
const durations = [];
let audioPlayers = 0;
let contexts = 0;
const field = selector => {
  if (!fields.has(selector)) fields.set(selector, {
    value: '', checked: false, disabled: false, textContent: '',
    addEventListener(name, callback) { this[name] = callback; },
    setAttribute() {}
  });
  return fields.get(selector);
};
const root = { dataset: { audioBase: '/assets/audio/' }, querySelector: field };
globalThis.document = {
  documentElement: { dataset: {} },
  querySelectorAll: () => [root],
  addEventListener: (name, callback) => events.set(name, callback)
};
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value)
};
class FakeContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  constructor() { contexts++; }
  createOscillator() { return {
    frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect() {}, disconnect() {}, start() {}, stop(time) { durations.push(time); }
  }; }
  createGain() { return {
    gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect() {}, disconnect() {}
  }; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() {}
}
globalThis.window = { AudioContext: FakeContext, addEventListener() {} };
globalThis.Audio = class { constructor() { audioPlayers++; } };
mountReadingAudio();
events.get('academy:completed')({ detail: { kind: 'lesson' } });
assert.equal(contexts, 0, 'Completion started sound before consent');
assert.equal(audioPlayers, 0, 'Background audio started automatically');
const effects = field('[data-audio-effects]');
effects.checked = true;
effects.change({ target: effects });
assert.equal(store.get('gha-audio-effects'), 'on');
assert.equal(durations.at(-1), 0.12, 'Effect preview is missing');
events.get('academy:completed')({ detail: { kind: 'lesson' } });
assert.equal(durations.at(-1), 0.22);
events.get('academy:completed')({ detail: { kind: 'chapter' } });
assert.equal(durations.at(-1), 0.32);
const count = durations.length;
events.get('click')({ target: { closest: () => ({ disabled: false, closest: () => null, matches: () => true }) } });
assert.equal(durations.length, count, 'Completion button also played a generic click');
effects.checked = false;
effects.change({ target: effects });
events.get('academy:completed')({ detail: { kind: 'chapter' } });
assert.equal(durations.length, count, 'Disabled completion sounds still played');
assert.equal(audioPlayers, 0, 'Completion started background music');
console.log('reading-audio: consent, saved opt-out, distinct completion tones, and no duplicate click all pass.');
