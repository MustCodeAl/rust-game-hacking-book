// Interactive side of PeFileMap.astro. Both formats and every part are already in the page as text; this only switches the
// visible format, opens and closes parts, and lights the matching slice of the to-scale ruler.
const mounted = new WeakSet<HTMLElement>();

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const controls = root.querySelector<HTMLElement>('[data-pm-controls]');
  const formats = Array.from(root.querySelectorAll<HTMLElement>('[data-pm-format]'));
  const openAll = root.querySelector<HTMLButtonElement>('[data-pm-open-all]');
  const closeAll = root.querySelector<HTMLButtonElement>('[data-pm-close-all]');
  if (!controls || formats.length < 2 || !openAll || !closeAll) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('.pm-block'));

  const setOpen = (block: HTMLElement, open: boolean): void => {
    block.dataset.open = String(open);
    block.querySelector<HTMLElement>('.pm-toggle')?.setAttribute('aria-expanded', String(open));
    const body = block.querySelector<HTMLElement>('.pm-body');
    if (body) body.hidden = !open;
  };

  controls.addEventListener('change', (event: Event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'radio') return;
    const chosen = event.target.value;
    for (const format of formats) format.hidden = format.dataset.pmFormat !== chosen;
  }, options);
  openAll.addEventListener('click', () => blocks.forEach(block => setOpen(block, true)), options);
  closeAll.addEventListener('click', () => blocks.forEach(block => setOpen(block, false)), options);

  root.addEventListener('click', (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const toggle = event.target.closest<HTMLButtonElement>('.pm-toggle');
    const block = toggle?.closest<HTMLElement>('.pm-block');
    if (toggle && block) setOpen(block, block.dataset.open !== 'true');
  }, options);

  // Light the part's slice of the ruler while its heading is hovered or focused.
  const light = (target: EventTarget | null, on: boolean): void => {
    if (!(target instanceof Element)) return;
    const block = target.closest<HTMLElement>('.pm-block');
    const format = block?.closest<HTMLElement>('[data-pm-format]');
    if (!block || !format || !target.closest('.pm-head')) return;
    format.querySelector<HTMLElement>(`.pm-seg[data-seg="${CSS.escape(block.dataset.block ?? '')}"]`)?.classList.toggle('is-picked', on);
  };
  root.addEventListener('pointerover', (event: PointerEvent) => light(event.target, true), options);
  root.addEventListener('pointerout', (event: PointerEvent) => light(event.target, false), options);
  root.addEventListener('focusin', (event: FocusEvent) => light(event.target, true), options);
  root.addEventListener('focusout', (event: FocusEvent) => light(event.target, false), options);

  // Start with only the first part open so the whole map fits on a screen; the server render has them all open.
  blocks.forEach(block => setOpen(block, block.dataset.block === 'dos'));
  root.querySelectorAll<HTMLButtonElement>('.pm-toggle').forEach(button => { button.disabled = false; });
  controls.hidden = false;
  root.dataset.pmReady = 'true';
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
}

export function mountPeFileMaps(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-pm]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountPeFileMaps());
