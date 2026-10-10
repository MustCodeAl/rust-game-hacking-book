import { cpuDebuggerSteps } from '../data/cpu-debugger';
const mounted = new WeakSet<HTMLElement>();

export function mountCpuDebuggers(): void {
  document.querySelectorAll<HTMLElement>('[data-cpu-step]').forEach((root) => {
    if (mounted.has(root)) return;
    const input = root.querySelector<HTMLInputElement>('[data-cpu-value]');
    const debuggerWidget = root.querySelector<HTMLElement>('[data-debugger-stepper]');
    if (!input || !debuggerWidget) return;
    mounted.add(root);
    const abort = new AbortController();
    const reference = root.querySelector<HTMLDetailsElement>('.cpu-step__reference');
    if (reference) {
      reference.open = false;
      let wasOpen = false;
      window.addEventListener('beforeprint', () => { wasOpen = reference.open; reference.open = true; }, { signal: abort.signal });
      window.addEventListener('afterprint', () => { reference.open = wasOpen; }, { signal: abort.signal });
    }
    const update = (): void => {
      const byte = Number(input.value);
      const valid = input.value.trim().length > 0 && Number.isInteger(byte) && byte >= 0 && byte <= 255;
      debuggerWidget.dispatchEvent(new CustomEvent('debugger:update', { detail: { steps: valid ? cpuDebuggerSteps(byte) : null } }));
    };
    input.addEventListener('input', update, { signal: abort.signal });
    document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { signal: abort.signal, once: true });
  });
}
document.addEventListener('astro:page-load', mountCpuDebuggers);
