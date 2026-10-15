// Interactive side of TextEncodingLab.astro: a bounded text field that re-renders the steps from the pure model. The worked
// example is already in the page; invalid text is refused with a reason and leaves the last valid result on screen.
import { checkText, encode } from '../lib/text-encoding';
import { outputHtml, resultText } from '../lib/text-encoding-view';

const mounted = new WeakSet<HTMLElement>();

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const form = root.querySelector<HTMLFormElement>('[data-te-form]');
  const input = root.querySelector<HTMLInputElement>('[data-te-input]');
  const error = root.querySelector<HTMLElement>('[data-te-error]');
  const output = root.querySelector<HTMLElement>('[data-te-output]');
  const result = root.querySelector<HTMLElement>('[data-te-result]');
  const current = root.querySelector<HTMLElement>('[data-te-current]');
  if (!form || !input || !error || !output || !result || !current) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };

  const render = (): void => {
    const problem = checkText(input.value);
    if (problem !== null) {
      error.textContent = `${problem} The steps below still show the last valid text.`;
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    error.textContent = '';
    input.removeAttribute('aria-invalid');
    const encoding = encode(input.value);
    output.innerHTML = outputHtml(encoding);
    result.textContent = resultText(encoding);
    current.textContent = input.value === '' ? '(nothing)' : input.value;
  };

  form.addEventListener('submit', (event: SubmitEvent) => event.preventDefault(), options);
  input.addEventListener('input', render, options);
  form.addEventListener('click', (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const preset = event.target.closest<HTMLButtonElement>('[data-te-preset]');
    if (!preset) return;
    input.value = preset.dataset.tePreset ?? '';
    render();
  }, options);
  form.hidden = false;
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
}

export function mountTextEncodingLabs(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-te]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountTextEncodingLabs());
