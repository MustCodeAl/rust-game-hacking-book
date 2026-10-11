// Reusable "point at a part, see its explanation" behaviour.
//   [data-pick-group]            container (several groups can share one page)
//     [data-pick=ID]             buttons or boxes that can be chosen
//     [data-pick-term=ID]        the explanation entries (always visible in the server render)
// Hover, focus or click highlights the part and its explanation; clicking again clears a click selection.
const mounted = new WeakSet<HTMLElement>();
let listening = false;

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let selected: string | null = null;
  let hovered: string | null = null;
  const idOf = (target: EventTarget | null): string | null => {
    if (!(target instanceof Element)) return null;
    const part = target.closest<HTMLElement>('[data-pick]');
    return part && root.contains(part) ? part.dataset.pick ?? null : null;
  };
  const mark = (): void => {
    const active = hovered ?? selected;
    root.querySelectorAll<HTMLElement>('[data-pick], [data-pick-term]').forEach(node => {
      const id = node.dataset.pick ?? node.dataset.pickTerm;
      node.classList.toggle('is-picked', id !== undefined && id === active);
      if (node instanceof HTMLButtonElement) node.setAttribute('aria-pressed', String(id === selected));
    });
  };
  root.addEventListener('pointerover', (event: PointerEvent) => { hovered = idOf(event.target); mark(); }, options);
  root.addEventListener('pointerout', (event: PointerEvent) => { hovered = idOf(event.relatedTarget); mark(); }, options);
  root.addEventListener('focusin', (event: FocusEvent) => { hovered = idOf(event.target); mark(); }, options);
  root.addEventListener('focusout', (event: FocusEvent) => { hovered = idOf(event.relatedTarget); mark(); }, options);
  root.addEventListener('click', (event: MouseEvent) => {
    const id = idOf(event.target);
    if (id === null) return;
    selected = selected === id ? null : id; mark();
    root.querySelector<HTMLElement>(`[data-pick-term="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, options);
  root.querySelectorAll<HTMLButtonElement>('button[data-pick]').forEach(button => { button.disabled = false; });
  root.dataset.pickReady = 'true';
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
}

export function mountDetailPickers(scope: ParentNode = document): void {
  for (const root of scope.querySelectorAll<HTMLElement>('[data-pick-group]')) mount(root);
  if (!listening) {
    listening = true;
    document.addEventListener('astro:page-load', () => mountDetailPickers());
  }
}
