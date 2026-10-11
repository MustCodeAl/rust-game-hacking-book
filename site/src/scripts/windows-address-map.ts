// Layout switch for WindowsAddressMap.astro. Every layout is already in the page; this only shows one of them.
const mounted = new WeakSet<HTMLElement>();

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const controls = root.querySelector<HTMLElement>('[data-wm-controls]');
  const modes = Array.from(root.querySelectorAll<HTMLElement>('[data-wm-mode]'));
  if (!controls || modes.length < 2) return;
  mounted.add(root);
  const abort = new AbortController();
  controls.addEventListener('change', (event: Event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'radio') return;
    const chosen = event.target.value;
    for (const mode of modes) mode.hidden = mode.dataset.wmMode !== chosen;
  }, { signal: abort.signal });
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
  controls.hidden = false;
}

export function mountWindowsAddressMaps(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-wm]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountWindowsAddressMaps());
