// Browser side of the live calculators (LiveCells.astro): read the inputs, run the lab's pure function and redraw
// the result with the same markup the server used. A bad input shows its message and keeps the last good result.
import { frameBodyHtml } from '../lib/cell-html';
import { liveLabs } from '../lib/live-labs';
import type { LiveValues } from '../lib/live-model';

const mounted = new WeakSet<HTMLElement>();

function readValues(root: HTMLElement): Record<string, string> {
  const values: Record<string, string> = {};
  root.querySelectorAll<HTMLElement>('[data-live-input]').forEach(element => {
    const id = element.dataset.liveInput;
    if (!id) return;
    if (element.dataset.liveKind === 'bits') values[id] = Array.from(element.querySelectorAll<HTMLButtonElement>('[data-live-bit]')).map(button => button.getAttribute('aria-pressed') === 'true' ? '1' : '0').join('');
    else values[id] = (element as HTMLInputElement | HTMLSelectElement).value;
  });
  return values;
}

function writeValues(root: HTMLElement, values: LiveValues): void {
  root.querySelectorAll<HTMLElement>('[data-live-input]').forEach(element => {
    const id = element.dataset.liveInput;
    const value = id ? values[id] : undefined;
    if (!id || value === undefined) return;
    if (element.dataset.liveKind === 'bits') element.querySelectorAll<HTMLButtonElement>('[data-live-bit]').forEach((button, index) => {
      const on = value[index] === '1';
      button.setAttribute('aria-pressed', String(on));
      button.textContent = on ? '1' : '0';
    });
    else (element as HTMLInputElement | HTMLSelectElement).value = value;
  });
}

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const lab = liveLabs[root.dataset.live ?? ''];
  const controls = root.querySelector<HTMLElement>('[data-live-controls]');
  const out = root.querySelector<HTMLElement>('.live__out');
  const caption = root.querySelector<HTMLElement>('[data-live-caption]');
  const error = root.querySelector<HTMLElement>('[data-live-error]');
  if (!lab || !controls || !out || !caption || !error) return;
  mounted.add(root);

  const redraw = (): void => {
    try {
      const frame = lab.compute(readValues(root));
      out.innerHTML = `<p class="cells__label"><strong></strong></p>${frameBodyHtml(frame)}`;
      const heading = out.querySelector('strong');
      if (heading) heading.textContent = frame.label;
      caption.textContent = frame.caption;
      error.hidden = true;
      out.dataset.stale = 'false';
    } catch (problem) {
      error.textContent = problem instanceof Error ? problem.message : 'That input cannot be used.';
      error.hidden = false;
      out.dataset.stale = 'true';
    }
  };

  root.addEventListener('input', redraw);
  root.addEventListener('change', redraw);
  root.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const bit = event.target.closest<HTMLButtonElement>('[data-live-bit]');
    if (bit) {
      const on = bit.getAttribute('aria-pressed') !== 'true';
      bit.setAttribute('aria-pressed', String(on));
      bit.textContent = on ? '1' : '0';
      redraw();
      return;
    }
    const preset = event.target.closest<HTMLButtonElement>('[data-live-preset]');
    if (preset?.dataset.livePreset) {
      writeValues(root, JSON.parse(preset.dataset.livePreset) as Record<string, string>);
      redraw();
    }
  });
  controls.hidden = false;
}

export function mountLiveCells(): void {
  document.querySelectorAll<HTMLElement>('[data-live]').forEach(mount);
}
