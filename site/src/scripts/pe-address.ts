// Interactive side of PeAddressCalc.astro: a bounded hex form that converts a file offset, an RVA or a live virtual address
// through the sample section table, using the same pure model that renders the default example.
import { isBoundedHex, parseHexNumber } from '../lib/hex-field';
import {
  PREFERRED_BASE, baseProblem, fromFileOffset, fromRva, fromVirtualAddress, hex, hex8, markers, type Translation,
} from '../lib/pe-address';

type Mode = 'file' | 'rva' | 'va';
const isMode = (value: string): value is Mode => value === 'file' || value === 'rva' || value === 'va';
const MAX_DIGITS = 8;
const mounted = new WeakSet<HTMLElement>();

function convert(mode: Mode, value: number, base: number): Translation {
  return mode === 'file' ? fromFileOffset(value, base) : mode === 'rva' ? fromRva(value, base) : fromVirtualAddress(value, base);
}

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const form = root.querySelector<HTMLFormElement>('[data-pa-form]');
  const valueInput = root.querySelector<HTMLInputElement>('[data-pa-value]');
  const baseInput = root.querySelector<HTMLInputElement>('[data-pa-base]');
  const error = root.querySelector<HTMLElement>('[data-pa-error]');
  const summary = root.querySelector<HTMLElement>('[data-pa-summary]');
  const steps = root.querySelector<HTMLElement>('[data-pa-steps]');
  const outputs = Array.from(root.querySelectorAll<HTMLElement>('[data-pa-out]'));
  if (!form || !valueInput || !baseInput || !error || !summary || !steps || outputs.length !== 3) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };

  const currentMode = (): Mode => {
    const checked = form.querySelector<HTMLInputElement>('input[type="radio"]:checked');
    return checked && isMode(checked.value) ? checked.value : 'file';
  };
  const setOutput = (name: string, text: string): void => {
    const node = outputs.find(output => output.dataset.paOut === name);
    if (node) node.textContent = text;
  };
  const place = (result: Translation): void => {
    const at = markers(result);
    for (const [name, fraction, text] of [['file', at.file, result.fileOffset === null ? '' : hex(result.fileOffset)], ['image', at.image, result.rva === null ? '' : hex(result.rva)]] as const) {
      const marker = root.querySelector<HTMLElement>(`[data-pa-marker="${name}"]`);
      const label = root.querySelector<HTMLElement>(`[data-pa-marker-text="${name}"]`);
      if (!marker || !label) continue;
      marker.hidden = fraction === null;
      if (fraction !== null) marker.style.setProperty('--at', String(fraction));
      label.textContent = text;
    }
  };
  const fail = (message: string, field: HTMLInputElement): void => {
    error.textContent = message;
    field.setAttribute('aria-invalid', 'true');
  };

  const render = (): void => {
    valueInput.removeAttribute('aria-invalid'); baseInput.removeAttribute('aria-invalid'); error.textContent = '';
    const mode = currentMode();
    if (!isBoundedHex(baseInput.value, MAX_DIGITS)) { fail('The module base must be 1 to 8 hexadecimal digits, for example 00400000. The result below still shows the last valid input.', baseInput); return; }
    const base = parseHexNumber(baseInput.value, MAX_DIGITS);
    const problem = base === null ? 'The module base is not a number.' : baseProblem(base);
    if (base === null || problem !== null) { fail(`${problem ?? 'The module base is not a number.'} The result below still shows the last valid input.`, baseInput); return; }
    if (!isBoundedHex(valueInput.value, MAX_DIGITS)) { fail('Enter 1 to 8 hexadecimal digits (0 to 9, A to F), with or without 0x. The result below still shows the last valid input.', valueInput); return; }
    const value = parseHexNumber(valueInput.value, MAX_DIGITS);
    if (value === null) { fail('That is not a hexadecimal number.', valueInput); return; }
    const result = convert(mode, value, base);
    const strong = document.createElement('strong');
    strong.textContent = result.summary;
    summary.replaceChildren(strong);
    steps.replaceChildren(...result.steps.map(step => { const item = document.createElement('li'); item.textContent = step; return item; }));
    setOutput('file', result.fileOffset === null ? 'none' : hex(result.fileOffset));
    setOutput('rva', result.rva === null ? 'none' : hex(result.rva));
    setOutput('va', result.va === null ? 'none' : hex8(result.va));
    place(result);
  };

  form.addEventListener('submit', (event: SubmitEvent) => event.preventDefault(), options);
  form.addEventListener('input', render, options);
  form.addEventListener('change', render, options);
  form.addEventListener('click', (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const preset = event.target.closest<HTMLButtonElement>('[data-pa-preset]');
    if (!preset) return;
    const mode = preset.dataset.mode ?? 'file';
    const radio = form.querySelector<HTMLInputElement>(`input[type="radio"][value="${CSS.escape(mode)}"]`);
    if (radio) radio.checked = true;
    valueInput.value = preset.dataset.value ?? '0';
    baseInput.value = hex8(PREFERRED_BASE).slice(2);
    render();
  }, options);
  form.hidden = false;
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
}

export function mountPeAddressCalcs(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-pa]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountPeAddressCalcs());
