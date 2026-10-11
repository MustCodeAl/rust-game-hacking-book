// Interactive side of StackFrameDiagram.astro. The shared player (diagram-player.ts) owns Previous/Play/Next and fires
// "dg:step"; this script redraws the stack picture from the pure model, and drives the bounded overflow-reach form.
import { MAX_WRITTEN, PEAK_STATE, frameStates, hex8, overflowReach, type FrameState } from '../lib/stack-frame';
import { motionAllowed, type StepDetail } from './diagram-player';

const mounted = new WeakSet<HTMLElement>();

const isStepDetail = (detail: unknown): detail is StepDetail =>
  typeof detail === 'object' && detail !== null && 'index' in detail && (detail.index === null || typeof detail.index === 'number');

function flash(element: Element | null): void {
  if (element && motionAllowed()) element.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
}

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const states = frameStates();
  const title = root.querySelector<HTMLElement>('[data-sf-title]');
  const explain = root.querySelector<HTMLElement>('[data-sf-explain]');
  const listing = root.querySelector<HTMLElement>('.sf-listing');
  const slots = Array.from(root.querySelectorAll<HTMLElement>('.sf-slot'));
  if (!title || !explain || !listing || slots.length === 0) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };

  const draw = (state: FrameState, index: number | null): void => {
    title.textContent = index === null ? 'The frame at its fullest, while the function body runs' : `Step ${index + 1} of ${states.length}: ${state.instruction}`;
    explain.textContent = state.explanation;
    const values: Record<string, number> = { ESP: state.esp, EBP: state.ebp, EIP: state.eip };
    root.querySelectorAll<HTMLElement>('[data-reg]').forEach(box => {
      const name = box.dataset.reg ?? '';
      const code = box.querySelector<HTMLElement>('[data-sf-reg]');
      if (code) code.textContent = hex8(values[name] ?? 0);
      const changed = index !== null && state.changed.some(reg => reg === name);
      box.dataset.changed = String(changed);
      if (changed) flash(box);
    });
    for (const view of state.slots) {
      const row = slots.find(candidate => Number(candidate.dataset.slot) === view.address);
      if (!row) continue;
      const previous = row.dataset.fill, previousValue = row.querySelector('[data-sf-val]')?.textContent;
      row.dataset.fill = view.fill;
      const marks = row.querySelector<HTMLElement>('[data-sf-marks]');
      if (marks) marks.textContent = view.marks.join('\n');
      const value = row.querySelector<HTMLElement>('[data-sf-val]');
      if (value) value.textContent = view.value;
      const fill = row.querySelector<HTMLElement>('[data-sf-fill]');
      if (fill) fill.textContent = view.fill;
      if (index !== null && (previous !== view.fill || previousValue !== view.value)) flash(row);
    }
    listing.querySelectorAll<HTMLElement>('li').forEach(line => {
      if (Number(line.dataset.addr) === state.eip) line.setAttribute('aria-current', 'true'); else line.removeAttribute('aria-current');
    });
  };

  root.addEventListener('dg:step', (event: Event) => {
    if (!(event instanceof CustomEvent) || !isStepDetail(event.detail)) return;
    const index = event.detail.index;
    const state = states[index ?? PEAK_STATE];
    if (state) draw(state, index);
  }, options);

  // ---- bounded overflow-reach form ----
  const form = root.querySelector<HTMLFormElement>('[data-sf-reach-form]');
  const written = root.querySelector<HTMLInputElement>('[data-sf-written]');
  const cookie = root.querySelector<HTMLInputElement>('[data-sf-cookie]');
  const error = root.querySelector<HTMLElement>('[data-sf-reach-error]');
  const verdict = root.querySelector<HTMLElement>('[data-sf-verdict]');
  const rows = Array.from(root.querySelectorAll<HTMLElement>('.sf-reach-row'));
  if (form && written && cookie && error && verdict && rows.length > 0) {
    const render = (): void => {
      const n = written.valueAsNumber;
      if (!Number.isInteger(n) || n < 0 || n > MAX_WRITTEN) {
        error.textContent = `Enter a whole number of bytes from 0 to ${MAX_WRITTEN}. The picture still shows the last valid value.`;
        written.setAttribute('aria-invalid', 'true');
        return;
      }
      error.textContent = ''; written.removeAttribute('aria-invalid');
      const reach = overflowReach(n, cookie.checked);
      rows.forEach((row, i) => {
        const data = reach.rows[i];
        if (!data) return;
        row.dataset.role = data.role;
        row.dataset.hit = String(data.bytesHit > 0);
        const hit = row.querySelector<HTMLElement>('[data-sf-hit]');
        if (hit) hit.textContent = data.bytesHit === 0 ? 'untouched' : `${data.bytesHit} of 4 bytes written`;
        const label = row.querySelector<HTMLElement>('[data-sf-rowlabel]');
        if (label) label.textContent = data.label;
      });
      verdict.textContent = reach.verdict;
    };
    form.addEventListener('submit', (event: SubmitEvent) => event.preventDefault(), options);
    written.addEventListener('input', render, options);
    cookie.addEventListener('change', render, options);
    form.addEventListener('click', (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const preset = event.target.closest<HTMLButtonElement>('[data-sf-preset]');
      if (!preset) return;
      written.value = preset.dataset.sfPreset ?? '0';
      render();
    }, options);
    form.hidden = false;
  }
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
}

export function mountStackFrames(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-sf]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountStackFrames());
