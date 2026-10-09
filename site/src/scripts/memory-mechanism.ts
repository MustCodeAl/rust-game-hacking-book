import { boardMarkup, defaultInput, makeFrames, type MemoryFrame, type MemoryInput, type MemoryKind } from './memory-mechanism-model';

interface Instance { stop: () => void; destroy: () => void }
const instances = new Map<HTMLElement, Instance>();
let listening = false;

function mount(root: HTMLElement): Instance | null {
  const kind = root.dataset.memoryKind;
  if (kind !== 'cdecl' && kind !== 'translation') return null;
  const mechanism: MemoryKind = kind;
  const board = root.querySelector<HTMLElement>('[data-memory-board]');
  const status = root.querySelector<HTMLElement>('[data-memory-status]');
  const facts = root.querySelector<HTMLElement>('[data-memory-facts]');
  const counter = root.querySelector<HTMLElement>('[data-memory-counter]');
  const error = root.querySelector<HTMLElement>('[data-memory-error]');
  const controls = root.querySelector<HTMLElement>('[data-memory-controls]');
  const previous = root.querySelector<HTMLButtonElement>('[data-memory-previous]');
  const next = root.querySelector<HTMLButtonElement>('[data-memory-next]');
  const play = root.querySelector<HTMLButtonElement>('[data-memory-play]');
  const reset = root.querySelector<HTMLButtonElement>('[data-memory-reset]');
  const motionNote = root.querySelector<HTMLElement>('[data-memory-motion-note]');
  if (!board || !status || !facts || !counter || !error || !controls || !previous || !next || !play || !reset || !motionNote) return null;
  let input: MemoryInput = defaultInput(mechanism);
  let frames = makeFrames(mechanism, input);
  let step = frames.length - 1;
  let timer: number | undefined;
  let animation: Animation | null = null;
  let inView = true;
  let valid = true;
  let printStep: number | null = null;
  const abort = new AbortController();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const allowed = (): boolean => document.documentElement.dataset.academyMotion !== 'off' && !reduced.matches;

  const pausePlayback = (): void => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
    play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false');
  };
  const stop = (): void => { pausePlayback(); animation?.cancel(); animation = null; };
  const animateTransfer = (frame: MemoryFrame): void => {
    if (!allowed() || !inView || document.hidden) return;
    const transfer = frame.transfers[0];
    if (!transfer) return;
    const from = board.querySelector<HTMLElement>(`[data-memory-node="${transfer.from}"]`);
    const to = board.querySelector<HTMLElement>(`[data-memory-node="${transfer.to}"]`);
    if (!from || !to) return;
    const outer = board.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const x1 = a.left + a.width / 2 - outer.left, y1 = a.top + a.height / 2 - outer.top;
    const x2 = b.left + b.width / 2 - outer.left, y2 = b.top + b.height / 2 - outer.top;
    const ns = 'http://www.w3.org/2000/svg';
    const overlay = document.createElementNS(ns, 'svg');
    overlay.setAttribute('viewBox', `0 0 ${Math.max(1, outer.width)} ${Math.max(1, outer.height)}`);
    overlay.setAttribute('aria-hidden', 'true'); overlay.classList.add('memory-mechanism__transfer-path');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', `M${x1} ${y1}L${x2} ${y2}`); overlay.append(path);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrow = document.createElementNS(ns, 'polygon');
    const rearX = x2 - Math.cos(angle) * 9, rearY = y2 - Math.sin(angle) * 9;
    arrow.setAttribute('points', `${x2},${y2} ${rearX - Math.sin(angle) * 4},${rearY + Math.cos(angle) * 4} ${rearX + Math.sin(angle) * 4},${rearY - Math.cos(angle) * 4}`);
    overlay.append(arrow); board.append(overlay);
    const chip = document.createElement('span');
    chip.className = 'memory-mechanism__chip'; chip.textContent = transfer.value; chip.setAttribute('aria-hidden', 'true');
    board.append(chip);
    animation = chip.animate([{ transform: `translate(${x1}px,${y1}px) translate(-50%,-50%)` },
      { transform: `translate(${x2}px,${y2}px) translate(-50%,-50%)` }], { duration: 550, easing: 'ease-in-out' });
    animation.onfinish = () => { chip.remove(); overlay.remove(); animation = null; };
    animation.oncancel = () => { chip.remove(); overlay.remove(); };
  };
  const render = (moving = false): void => {
    animation?.cancel(); animation = null;
    const frame = frames[step];
    if (!frame) return;
    board.innerHTML = boardMarkup(frame);
    status.textContent = frame.description;
    counter.textContent = `${step + 1} / ${frames.length}: ${frame.line}`;
    facts.replaceChildren(...frame.facts.flatMap(fact => {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = fact.name; dd.textContent = fact.value; return [dt, dd];
    }));
    previous.disabled = !valid || step === 0;
    next.disabled = !valid;
    next.textContent = step === frames.length - 1 ? 'First step' : 'Step';
    play.disabled = !valid || !allowed();
    motionNote.textContent = allowed() ? 'Play starts only when chosen. Step works one action at a time.' : 'Motion is off. Back and Step still show each state without animation.';
    root.dataset.memoryMotion = allowed() ? 'allowed' : 'off';
    if (moving) animateTransfer(frame);
  };
  const advance = (): void => {
    if (step >= frames.length - 1) { stop(); return; }
    step += 1; render(true);
    if (step === frames.length - 1) pausePlayback();
  };
  const on = <K extends keyof HTMLElementEventMap>(node: HTMLElement, name: K, fn: (event: HTMLElementEventMap[K]) => void): void => {
    node.addEventListener(name, fn, { signal: abort.signal });
  };
  on(previous, 'click', () => { stop(); step = Math.max(0, step - 1); render(true); });
  on(next, 'click', () => { stop(); step = step === frames.length - 1 ? 0 : step + 1; render(true); });
  on(play, 'click', () => {
    if (timer !== undefined) { stop(); return; }
    const bounds = root.getBoundingClientRect();
    inView = bounds.bottom > 0 && bounds.top < window.innerHeight;
    if (!valid || !allowed() || !inView || document.hidden) return;
    if (step === frames.length - 1) step = 0;
    render(); play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
    timer = window.setInterval(advance, 1100);
  });
  on(reset, 'click', () => {
    stop(); input = defaultInput(mechanism); frames = makeFrames(mechanism, input); step = frames.length - 1; valid = true;
    const values: Record<string, number | boolean> = 'parameter' in input
      ? { parameter: input.parameter, initialEsp: input.initialEsp }
      : { address: input.address, limit: input.limit, frame: input.frame, present: input.present };
    for (const field of root.querySelectorAll<HTMLInputElement>('[data-memory-input]')) {
      const key = field.dataset.memoryInput;
      const value = key ? values[key] : undefined;
      if (typeof value === 'boolean') field.checked = value;
      else if (typeof value === 'number') field.value = field.dataset.radix === '16' ? `0x${value.toString(16).toUpperCase()}` : `${value}`;
      field.removeAttribute('aria-invalid');
    }
    error.textContent = ''; render();
  });
  const readNumber = (key: string): number => {
    const field = root.querySelector<HTMLInputElement>(`[data-memory-input="${key}"]`);
    if (!field) throw new Error('Required input is missing.');
    const text = field.value.trim();
    const syntax = field.dataset.radix === '16' ? /^(?:0x)?[0-9a-f]+$/i : /^\d+$/;
    const number = syntax.test(text) ? Number.parseInt(text.replace(/^0x/i, ''), field.dataset.radix === '16' ? 16 : 10) : NaN;
    const min = Number(field.dataset.min), max = Number(field.dataset.max), alignment = Number(field.dataset.align ?? '1');
    if (!Number.isInteger(number) || number < min || number > max || number % alignment !== 0) {
      field.setAttribute('aria-invalid', 'true');
      throw new RangeError(`${field.dataset.label ?? key}: enter a whole value in the stated range${alignment > 1 ? `, aligned to ${alignment} bytes` : ''}. Showing the last valid example.`);
    }
    field.removeAttribute('aria-invalid'); return number;
  };
  for (const field of root.querySelectorAll<HTMLInputElement>('[data-memory-input]')) on(field, 'input', () => {
    stop();
    try {
      input = mechanism === 'cdecl' ? { parameter: readNumber('parameter'), initialEsp: readNumber('initialEsp') }
        : { address: readNumber('address'), limit: readNumber('limit'), frame: readNumber('frame'), present: root.querySelector<HTMLInputElement>('[data-memory-input="present"]')?.checked ?? true };
      frames = makeFrames(mechanism, input); step = Math.min(step, frames.length - 1); valid = true; error.textContent = '';
    } catch (reason: unknown) { valid = false; error.textContent = reason instanceof Error ? reason.message : 'Use values within the stated ranges.'; }
    render();
  });
  const motionChanged = (): void => { if (!allowed()) stop(); render(); };
  reduced.addEventListener('change', motionChanged, { signal: abort.signal });
  document.addEventListener('academy:reader-preference', motionChanged, { signal: abort.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, { signal: abort.signal });
  window.addEventListener('pagehide', stop, { signal: abort.signal });
  window.addEventListener('beforeprint', () => { stop(); printStep = step; step = frames.length - 1; render(); }, { signal: abort.signal });
  window.addEventListener('afterprint', () => { if (printStep !== null) step = printStep; printStep = null; render(); }, { signal: abort.signal });
  const preferences = new MutationObserver(motionChanged);
  preferences.observe(document.documentElement, { attributes: true, attributeFilter: ['data-academy-motion'] });
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(() => {
    const bounds = root.getBoundingClientRect();
    inView = bounds.bottom > 0 && bounds.top < window.innerHeight; if (!inView) stop();
  }) : null;
  observer?.observe(root);
  render(); controls.hidden = false; root.dataset.memoryReady = 'true';
  return { stop, destroy: () => { stop(); abort.abort(); preferences.disconnect(); observer?.disconnect(); delete root.dataset.memoryReady; } };
}

export function mountMemoryMechanisms(scope: ParentNode = document): void {
  for (const [root, instance] of instances) if (!root.isConnected) { instance.destroy(); instances.delete(root); }
  for (const root of scope.querySelectorAll<HTMLElement>('[data-memory-kind]')) {
    if (instances.has(root)) continue;
    const instance = mount(root); if (instance) instances.set(root, instance);
  }
  if (!listening) {
    listening = true;
    document.addEventListener('astro:page-load', () => mountMemoryMechanisms());
    document.addEventListener('astro:before-swap', () => { for (const instance of instances.values()) instance.destroy(); instances.clear(); });
  }
}
