// Shared stepper for native diagrams. Markup contract (all server-rendered, complete without JavaScript):
//   [data-dg]                      the diagram root
//     [data-dg-step]               ordered steps; each carries data-dg-caption
//       [data-dg-dot] (optional)   a marker that travels along the step's arrow when motion is allowed
//     [data-dg-controls] [hidden]  buttons [data-dg-prev] [data-dg-play] [data-dg-next] [data-dg-all], [data-dg-counter]
//     [data-dg-status]             live region for the current caption
// Initially every step is shown as done. Step or Play reveal them one at a time; "Show all" returns.
// The root receives a bubbling "dg:step" event whose detail is { index: number | null }.

export interface StepDetail { readonly index: number | null }

interface Player { destroy(): void; stop(): void; reset(): void }

const players = new Map<HTMLElement, Player>();
let listening = false;
const INTERVAL_MS = 1600;

export function motionAllowed(): boolean {
  return document.documentElement.dataset.academyMotion !== 'off' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function mount(root: HTMLElement): Player | null {
  const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-dg-step]'));
  const controls = root.querySelector<HTMLElement>('[data-dg-controls]');
  const previous = root.querySelector<HTMLButtonElement>('[data-dg-prev]');
  const play = root.querySelector<HTMLButtonElement>('[data-dg-play]');
  const next = root.querySelector<HTMLButtonElement>('[data-dg-next]');
  const all = root.querySelector<HTMLButtonElement>('[data-dg-all]');
  const counter = root.querySelector<HTMLElement>('[data-dg-counter]');
  const status = root.querySelector<HTMLElement>('[data-dg-status]');
  if (steps.length < 2 || !controls || !previous || !play || !next || !all || !counter || !status) return null;

  const abort = new AbortController();
  const options = { signal: abort.signal };
  let current: number | null = null;
  let timer: number | undefined;
  let inView = true;
  const summary = status.textContent ?? '';

  const animateDot = (step: HTMLElement): void => {
    if (!motionAllowed() || !inView || document.hidden) return;
    const dot = step.querySelector<HTMLElement>('[data-dg-dot]');
    if (!dot) return;
    const keyframes = step.dataset.dgDirection === 'left' ? [{ left: '100%' }, { left: '0%' }] : [{ left: '0%' }, { left: '100%' }];
    dot.animate(keyframes, { duration: 700, easing: 'ease-in-out', fill: 'both' });
  };

  const render = (moving: boolean): void => {
    steps.forEach((step, index) => {
      const state = current === null || index < current ? 'done' : index === current ? 'active' : 'todo';
      step.dataset.state = state;
      if (state === 'active') step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
    });
    const step = current === null ? null : steps[current];
    status.textContent = step ? step.dataset.dgCaption ?? '' : summary;
    counter.textContent = current === null ? `All ${steps.length} steps shown` : `Step ${current + 1} of ${steps.length}`;
    previous.disabled = current === 0;
    all.disabled = current === null;
    next.textContent = current === null ? 'Step through' : current === steps.length - 1 ? 'Show all' : 'Next step';
    root.dispatchEvent(new CustomEvent<StepDetail>('dg:step', { bubbles: true, detail: { index: current } }));
    if (moving && step) animateDot(step);
  };

  const pause = (): void => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
    play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false');
  };
  const stop = (): void => { pause(); steps.forEach(step => step.querySelector<HTMLElement>('[data-dg-dot]')?.getAnimations().forEach(animation => animation.cancel())); };
  const goto = (index: number | null): void => { current = index; render(true); };

  previous.addEventListener('click', () => { pause(); goto(current === null ? steps.length - 1 : Math.max(0, current - 1)); }, options);
  next.addEventListener('click', () => {
    pause();
    if (current === null) goto(0);
    else if (current === steps.length - 1) goto(null);
    else goto(current + 1);
  }, options);
  all.addEventListener('click', () => { pause(); goto(null); }, options);
  play.addEventListener('click', () => {
    if (timer !== undefined) { pause(); return; }
    if (!motionAllowed()) return;
    const bounds = root.getBoundingClientRect();
    inView = bounds.bottom > 0 && bounds.top < window.innerHeight;
    if (!inView || document.hidden) return;
    if (current === null || current === steps.length - 1) goto(0);
    play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
    timer = window.setInterval(() => {
      if (current === null || current >= steps.length - 1) { pause(); return; }
      goto(current + 1);
      if (current === steps.length - 1) pause();
    }, INTERVAL_MS);
  }, options);

  const syncMotion = (): void => {
    const allowed = motionAllowed();
    play.disabled = !allowed;
    if (!allowed) pause();
    const note = root.querySelector<HTMLElement>('[data-dg-motion-note]');
    if (note) note.textContent = allowed ? 'Play steps through automatically. Next step works one action at a time.' : 'Motion is off, so Play is unavailable. Next step and Previous still reveal one step at a time.';
  };
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', syncMotion, options);
  document.addEventListener('academy:reader-preference', syncMotion, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, options);
  window.addEventListener('pagehide', pause, options);
  const preferences = new MutationObserver(syncMotion);
  preferences.observe(document.documentElement, { attributes: true, attributeFilter: ['data-academy-motion'] });
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(() => {
    const bounds = root.getBoundingClientRect();
    inView = bounds.bottom > 0 && bounds.top < window.innerHeight;
    if (!inView) pause();
  }) : null;
  observer?.observe(root);

  syncMotion(); render(false);
  controls.hidden = false; root.dataset.dgReady = 'true';
  return {
    stop,
    reset: () => { stop(); current = null; render(false); },
    destroy: () => { stop(); abort.abort(); preferences.disconnect(); observer?.disconnect(); delete root.dataset.dgReady; },
  };
}

/** Return every ready diagram under `scope` to its complete default view. */
export function resetDiagramPlayers(scope: ParentNode): void {
  for (const [root, player] of players) if (scope.contains(root)) player.reset();
}

export function mountDiagramPlayers(scope: ParentNode = document): void {
  for (const [root, player] of players) if (!root.isConnected) { player.destroy(); players.delete(root); }
  for (const root of scope.querySelectorAll<HTMLElement>('[data-dg]')) {
    if (players.has(root)) continue;
    const player = mount(root);
    if (player) players.set(root, player);
  }
  if (!listening) {
    listening = true;
    document.addEventListener('astro:page-load', () => mountDiagramPlayers());
    document.addEventListener('astro:before-swap', () => { for (const player of players.values()) player.destroy(); players.clear(); });
  }
}
