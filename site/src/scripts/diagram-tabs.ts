// Tabs for a group of diagrams. Without JavaScript every panel stays visible, one after another.
//   [data-dg-tabs]               wrapper
//     [role=tablist][hidden]     buttons [role=tab][data-dg-tab=ID]
//     [data-dg-panel=ID]         one panel per tab (usually a [data-dg] figure)
import { resetDiagramPlayers } from './diagram-player';

const mounted = new WeakSet<HTMLElement>();
let listening = false;

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const list = root.querySelector<HTMLElement>('[role="tablist"]');
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-dg-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-dg-panel]'));
  if (!list || tabs.length < 2 || tabs.length !== panels.length) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };

  const select = (id: string, focus: boolean): void => {
    for (const tab of tabs) {
      const active = tab.dataset.dgTab === id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    }
    for (const panel of panels) {
      const active = panel.dataset.dgPanel === id;
      panel.hidden = !active;
      if (active) resetDiagramPlayers(panel);
    }
    root.dataset.dgTabsSelected = id;
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => select(tab.dataset.dgTab ?? '', false), options);
    tab.addEventListener('keydown', (event: KeyboardEvent) => {
      const index = tabs.indexOf(tab);
      const target = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? tabs[(index + 1) % tabs.length]
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? tabs[(index - 1 + tabs.length) % tabs.length]
        : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : undefined;
      if (!target) return;
      event.preventDefault();
      select(target.dataset.dgTab ?? '', true);
    }, options);
  }
  list.hidden = false;
  select(root.dataset.dgTabsInitial ?? tabs[0]?.dataset.dgTab ?? '', false);
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
}

export function mountDiagramTabs(scope: ParentNode = document): void {
  for (const root of scope.querySelectorAll<HTMLElement>('[data-dg-tabs]')) mount(root);
  if (!listening) {
    listening = true;
    document.addEventListener('astro:page-load', () => mountDiagramTabs());
  }
}
