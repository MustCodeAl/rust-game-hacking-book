// Interactivity for TransportLoss.astro: choose lost packets, set the resend timer, scrub or play through time.
import { DEFAULT_LOSS, describeLoss, simulateLoss, type LossResult } from '../lib/transport-loss';
import { timelineHtml, type Protocol } from '../lib/transport-loss-view';
import { motionAllowed } from './diagram-player';

const mounted = new WeakSet<HTMLElement>();
let listening = false;
const STEP_MS = 800;

function deliveredBy(result: LossResult, protocol: Protocol, tick: number): number[] {
  return (protocol === 'tcp' ? result.tcp : result.udp)
    .filter(item => item.deliveredAt !== null && item.deliveredAt <= tick).map(item => item.message + 1);
}

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const controls = root.querySelector<HTMLElement>('[data-tl-controls]');
  const toggles = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tl-toggle]'));
  const timerInput = root.querySelector<HTMLInputElement>('[data-tl-timer-input]');
  const slider = root.querySelector<HTMLInputElement>('[data-tl-time]');
  const clock = root.querySelector<HTMLElement>('[data-tl-clock]');
  const play = root.querySelector<HTMLButtonElement>('[data-tl-play]');
  const reset = root.querySelector<HTMLButtonElement>('[data-tl-reset]');
  const summary = root.querySelector<HTMLElement>('[data-tl-summary]');
  const views = new Map<Protocol, HTMLElement>();
  for (const protocol of ['tcp', 'udp'] as const) {
    const view = root.querySelector<HTMLElement>(`[data-tl-view="${protocol}"]`);
    if (view) views.set(protocol, view);
  }
  if (!controls || !timerInput || !slider || !clock || !play || !reset || !summary || views.size !== 2 || toggles.length !== DEFAULT_LOSS.messages) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let lost = new Set<number>(DEFAULT_LOSS.lost);
  let timer: number = DEFAULT_LOSS.timer;
  let tick = 0;
  let result = simulateLoss(DEFAULT_LOSS);
  let ticker: number | undefined;

  const paint = (): void => {
    for (const [protocol, view] of views) view.innerHTML = timelineHtml(protocol, result, tick);
    slider.max = String(result.lastTick); slider.value = String(tick);
    const tcp = deliveredBy(result, 'tcp', tick), udp = deliveredBy(result, 'udp', tick);
    const text = `Tick ${tick}. The game has received ${tcp.length ? tcp.join(', ') : 'nothing'} over TCP and ${udp.length ? udp.join(', ') : 'nothing'} over UDP.`;
    clock.textContent = `tick ${tick}`; slider.setAttribute('aria-valuetext', text);
    summary.textContent = tick === result.lastTick ? describeLoss(result) : text;
    toggles.forEach((button, index) => {
      const isLost = lost.has(index);
      button.setAttribute('aria-pressed', String(isLost));
      button.textContent = `Packet ${index + 1}: ${isLost ? 'lost' : 'arrives'}`;
    });
  };
  const recompute = (): void => {
    result = simulateLoss({ ...DEFAULT_LOSS, lost: [...lost], timer });
    tick = result.lastTick; paint();
  };
  const stop = (): void => {
    if (ticker !== undefined) window.clearInterval(ticker);
    ticker = undefined; play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false');
  };

  toggles.forEach((button, index) => button.addEventListener('click', () => { stop(); if (lost.has(index)) lost.delete(index); else lost.add(index); recompute(); }, options));
  timerInput.addEventListener('input', () => {
    const value = timerInput.valueAsNumber;
    if (!Number.isInteger(value) || value < 2 || value > 6) { timerInput.setAttribute('aria-invalid', 'true'); return; }
    timerInput.removeAttribute('aria-invalid'); stop(); timer = value; recompute();
  }, options);
  slider.addEventListener('input', () => { stop(); tick = Number(slider.value); paint(); }, options);
  play.addEventListener('click', () => {
    if (ticker !== undefined) { stop(); return; }
    if (!motionAllowed()) return;
    tick = 0; paint();
    play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
    ticker = window.setInterval(() => {
      if (tick >= result.lastTick) { stop(); return; }
      tick += 1; paint();
      if (tick >= result.lastTick) stop();
    }, STEP_MS);
  }, options);
  reset.addEventListener('click', () => {
    stop(); lost = new Set(DEFAULT_LOSS.lost); timer = DEFAULT_LOSS.timer; timerInput.value = String(timer); timerInput.removeAttribute('aria-invalid'); recompute();
  }, options);
  const syncMotion = (): void => { play.disabled = !motionAllowed(); if (play.disabled) stop(); };
  document.addEventListener('academy:reader-preference', syncMotion, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, options);
  window.addEventListener('pagehide', stop, options);
  document.addEventListener('astro:before-swap', () => { stop(); abort.abort(); mounted.delete(root); }, { once: true });
  syncMotion(); controls.hidden = false; recompute();
}

export function mountTransportLoss(scope: ParentNode = document): void {
  for (const root of scope.querySelectorAll<HTMLElement>('[data-transport-loss]')) mount(root);
  if (!listening) {
    listening = true;
    document.addEventListener('astro:page-load', () => mountTransportLoss());
  }
}
