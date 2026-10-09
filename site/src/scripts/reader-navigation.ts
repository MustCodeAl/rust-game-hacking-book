const mountedOutlines = new WeakSet<HTMLElement>();
const mountedSidebars = new WeakSet<HTMLElement>();
const root = document.documentElement;
const isModern = (): boolean => root.dataset.academyAppearance === 'modern';

function saveFold(folded: boolean): void {
  root.dataset.academyToc = folded ? 'hidden' : 'shown';
  try {
    if (folded) localStorage.setItem('gha-toc', 'hidden');
    else localStorage.removeItem('gha-toc');
  } catch { /* Keep the current page usable when storage is unavailable. */ }
}

interface OutlineElements {
  panel: HTMLDetailsElement;
  shell: HTMLElement;
  trigger: HTMLButtonElement;
  summary: HTMLElement;
  backdrop: HTMLButtonElement;
  close: HTMLButtonElement;
  compact: HTMLElement;
  tooltip: HTMLElement;
}

function outlineElements(outline: HTMLElement): OutlineElements | null {
  const panel = outline.querySelector<HTMLDetailsElement>('[data-outline-panel]');
  const shell = outline.querySelector<HTMLElement>('[data-outline-shell]');
  const trigger = outline.querySelector<HTMLButtonElement>('[data-outline-open]');
  const summary = panel?.querySelector<HTMLElement>('summary');
  const backdrop = outline.querySelector<HTMLButtonElement>('.reader-outline__backdrop');
  const close = outline.querySelector<HTMLButtonElement>('.reader-outline__close');
  const compact = outline.querySelector<HTMLElement>('[data-outline-compact]');
  const tooltip = outline.querySelector<HTMLElement>('[data-outline-tooltip]');
  if (!panel || !shell || !trigger || !summary || !backdrop || !close || !compact || !tooltip) return null;
  return { panel, shell, trigger, summary, backdrop, close, compact, tooltip };
}

function mountOutline(outline: HTMLElement): void {
  if (mountedOutlines.has(outline)) return;
  const elements = outlineElements(outline);
  if (!elements) return;
  const { panel, shell, trigger, summary, backdrop, close, compact, tooltip } = elements;
  mountedOutlines.add(outline);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const wide = matchMedia('(min-width: 90rem)');
  const links = Array.from(outline.querySelectorAll<HTMLAnchorElement>('[data-outline-link]'));
  const headings = Array.from(new Set(links.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter((heading): heading is HTMLElement => heading instanceof HTMLElement)));
  const originalInert = new Map<HTMLElement, boolean>();
  let previousOverflow: string | null = null;
  let modal = false;
  let pendingFrame = 0;
  let lastY = window.scrollY;
  let previousFocus: HTMLElement | null = null;

  function restoreBackground(): void {
    for (const [element, inert] of originalInert) element.inert = inert;
    originalInert.clear();
    if (previousOverflow !== null) document.body.style.overflow = previousOverflow;
    previousOverflow = null;
  }

  function freezeBackground(): void {
    let current: HTMLElement = shell;
    while (current.parentElement) {
      const parent = current.parentElement;
      for (const sibling of parent.children) {
        if (!(sibling instanceof HTMLElement) || sibling === current || sibling === backdrop) continue;
        originalInert.set(sibling, sibling.inert);
        sibling.inert = true;
      }
      if (parent === document.body) break;
      current = parent;
    }
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  function setModal(open: boolean, returnFocus = false): void {
    if (modal === open) return;
    modal = open;
    outline.dataset.outlineModal = String(open);
    trigger.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
    close.hidden = !open;
    panel.open = open;
    tooltip.hidden = true;
    if (open) {
      previousFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      shell.setAttribute('role', 'dialog');
      shell.setAttribute('aria-modal', 'true');
      shell.setAttribute('aria-labelledby', `${panel.id}-title`);
      freezeBackground();
      close.focus({ preventScroll: true });
    } else {
      shell.removeAttribute('role');
      shell.removeAttribute('aria-modal');
      shell.removeAttribute('aria-labelledby');
      restoreBackground();
      if (returnFocus) (previousFocus?.isConnected && !previousFocus.inert ? previousFocus : trigger).focus({ preventScroll: true });
      previousFocus = null;
    }
  }

  function reconcile(): void {
    const wasModal = modal;
    setModal(false);
    outline.dataset.outlineReady = 'true';
    outline.dataset.outlineWide = String(wide.matches);
    trigger.hidden = !isModern() || wide.matches;
    tooltip.hidden = true;
    compact.hidden = !isModern() || !wide.matches || root.dataset.academyToc !== 'hidden';
    panel.open = !isModern() || (wide.matches && root.dataset.academyToc !== 'hidden');
    outline.dataset.outlineFolded = String(isModern() && wide.matches && !panel.open);
    if (wasModal && isModern()) (wide.matches ? summary : trigger).focus({ preventScroll: true });
    scheduleReading();
  }

  function updateReading(): void {
    pendingFrame = 0;
    if (!isModern() || !outline.isConnected) return;
    const header = document.querySelector<HTMLElement>('header.header');
    const threshold = (header?.getBoundingClientRect().bottom ?? 0) + window.innerHeight * 0.1;
    let active = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= threshold) active = heading;
    }
    for (const link of links) {
      const current = active && decodeURIComponent(link.hash.slice(1)) === active.id;
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    const total = document.documentElement.scrollHeight - window.innerHeight;
    outline.style.setProperty('--outline-progress', String(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0));
    const delta = window.scrollY - lastY;
    if (Math.abs(delta) > 0.5) outline.dataset.outlineDirection = delta > 0 ? 'down' : 'up';
    lastY = window.scrollY;
  }

  function scheduleReading(): void {
    if (!pendingFrame) pendingFrame = requestAnimationFrame(updateReading);
  }

  function showTooltip(link: HTMLAnchorElement): void {
    if (!isModern() || !wide.matches || panel.open || !compact.contains(link)) return;
    const bounds = link.getBoundingClientRect();
    const fontSize = Number.parseFloat(getComputedStyle(root).fontSize) || 16;
    tooltip.textContent = link.dataset.outlineTitle ?? '';
    tooltip.style.top = `${(bounds.top + bounds.height / 2) / Math.max(window.innerHeight, 1) * 100}vh`;
    tooltip.style.insetInlineEnd = `${(window.innerWidth - bounds.left) / fontSize + 0.5}rem`;
    tooltip.hidden = false;
  }

  function setFold(folded: boolean): void {
    const changed = outline.dataset.outlineFolded !== String(folded);
    panel.open = !folded;
    saveFold(folded);
    compact.hidden = !folded;
    outline.dataset.outlineFolded = String(folded);
    if (changed) tooltip.hidden = true;
  }

  trigger.addEventListener('click', () => setModal(!modal, modal), options);
  outline.querySelectorAll<HTMLButtonElement>('[data-outline-dismiss]').forEach((button) => button.addEventListener('click', () => setModal(false, true), options));
  summary.addEventListener('click', (event: MouseEvent) => {
    if (!isModern() || !wide.matches) return;
    event.preventDefault();
    setFold(panel.open);
  }, options);
  panel.addEventListener('toggle', () => {
    if (!isModern()) return;
    if (!wide.matches) { if (modal && !panel.open) setModal(false, true); return; }
    setFold(!panel.open);
  }, options);
  for (const link of links) {
    link.addEventListener('pointerenter', () => showTooltip(link), options);
    link.addEventListener('focus', () => showTooltip(link), options);
    link.addEventListener('pointerleave', () => { tooltip.hidden = true; }, options);
    link.addEventListener('blur', () => { tooltip.hidden = true; }, options);
    link.addEventListener('click', () => {
      if (!isModern()) return;
      setModal(false);
      tooltip.hidden = true;
      const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (heading instanceof HTMLElement) requestAnimationFrame(() => { if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1; heading.focus({ preventScroll: true }); });
    }, options);
  }
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (!isModern()) return;
    const target = event.target instanceof Element ? event.target : null;
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyO' && !target?.closest('input,textarea,select,[contenteditable]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (wide.matches) { setFold(panel.open); summary.focus({ preventScroll: true }); }
      else setModal(!modal, modal);
      return;
    }
    if (event.key === 'Escape' && modal) { event.preventDefault(); event.stopImmediatePropagation(); setModal(false, true); return; }
    if (event.key !== 'Tab' || !modal) return;
    const focusable = Array.from(shell.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')).filter((element) => element.getClientRects().length > 0 && !element.inert);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || !shell.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !shell.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  }, { ...options, capture: true });
  window.addEventListener('scroll', scheduleReading, { ...options, passive: true });
  window.addEventListener('resize', scheduleReading, options);
  wide.addEventListener('change', reconcile, options);
  const settings = new MutationObserver((changes) => {
    if (changes.some((change) => change.attributeName === 'data-academy-appearance')) reconcile();
    else if (wide.matches && isModern()) {
      const open = root.dataset.academyToc !== 'hidden';
      if (panel.open !== open) panel.open = open;
      compact.hidden = open;
      outline.dataset.outlineFolded = String(!open);
    }
  });
  settings.observe(root, { attributes: true, attributeFilter: ['data-academy-appearance', 'data-academy-toc'] });
  const headingsObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(scheduleReading, { threshold: [0, 1] }) : null;
  for (const heading of headings) headingsObserver?.observe(heading);
  const article = document.querySelector<HTMLElement>('.sl-markdown-content');
  const sizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleReading) : null;
  if (article) sizeObserver?.observe(article);
  document.addEventListener('astro:before-swap', () => {
    setModal(false);
    settings.disconnect(); headingsObserver?.disconnect(); sizeObserver?.disconnect();
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    abort.abort(); mountedOutlines.delete(outline);
  }, { ...options, once: true });
  reconcile();
}

function mountSidebar(sidebar: HTMLElement): void {
  if (mountedSidebars.has(sidebar)) return;
  mountedSidebars.add(sidebar);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const groups = Array.from(sidebar.querySelectorAll<HTMLDetailsElement>('ul.top-level > li > details')).filter((group) => group.querySelector('a[data-chapter]'));
  const originalOpen = new Map(groups.map((group) => [group, group.open]));
  let wasModern = false;
  const namespace = 'http://www.w3.org/2000/svg';

  function renderProgress(): void {
    if (!isModern()) return;
    for (const group of groups) {
      const label = group.querySelector<HTMLElement>(':scope > summary .group-label');
      if (!label) continue;
      const links = Array.from(group.querySelectorAll<HTMLAnchorElement>('a[data-chapter]'));
      const done = links.filter((link) => link.classList.contains('is-done')).length;
      let meter = label.querySelector<HTMLElement>('.reader-chapter-meter');
      if (!meter) {
        meter = document.createElement('span'); meter.className = 'reader-chapter-meter';
        const ring = document.createElementNS(namespace, 'svg'); ring.setAttribute('viewBox', '0 0 24 24'); ring.setAttribute('role', 'img');
        const track = document.createElementNS(namespace, 'circle'); track.setAttribute('cx', '12'); track.setAttribute('cy', '12'); track.setAttribute('r', '10'); track.classList.add('reader-chapter-meter__track');
        const fill = track.cloneNode(false) as SVGCircleElement; fill.classList.replace('reader-chapter-meter__track', 'reader-chapter-meter__fill'); fill.setAttribute('pathLength', '1');
        ring.append(track, fill);
        const count = document.createElement('span'); count.className = 'reader-chapter-meter__count'; count.setAttribute('aria-hidden', 'true');
        const bar = document.createElement('span'); bar.className = 'reader-chapter-meter__bar'; bar.setAttribute('aria-hidden', 'true');
        meter.append(ring, count, bar); label.append(meter);
      }
      meter.querySelector('svg')?.setAttribute('aria-label', `${done} of ${links.length} lessons complete`);
      meter.querySelector('.reader-chapter-meter__fill')?.setAttribute('stroke-dashoffset', String(links.length ? 1 - done / links.length : 1));
      const count = meter.querySelector<HTMLElement>('.reader-chapter-meter__count');
      if (count) count.textContent = `${done}/${links.length}`;
      meter.style.setProperty('--reader-chapter-progress', String(links.length ? done / links.length : 0));
    }
  }

  function reconcileSidebar(): void {
    const modern = isModern();
    if (modern && !wasModern) {
      for (const group of groups) { originalOpen.set(group, group.open); group.open = Boolean(group.querySelector('a[aria-current="page"]')); }
    } else if (!modern && wasModern) {
      for (const [group, open] of originalOpen) group.open = open;
    }
    wasModern = modern;
    renderProgress();
  }
  const settings = new MutationObserver(reconcileSidebar);
  settings.observe(root, { attributes: true, attributeFilter: ['data-academy-appearance'] });
  const progress = new MutationObserver(renderProgress);
  progress.observe(sidebar, { subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pageshow', reconcileSidebar, options);
  document.addEventListener('astro:before-swap', () => { settings.disconnect(); progress.disconnect(); abort.abort(); mountedSidebars.delete(sidebar); }, { ...options, once: true });
  reconcileSidebar();
}

export function mountReaderNavigation(): void {
  document.querySelectorAll<HTMLElement>('[data-reader-outline]').forEach(mountOutline);
  const sidebar = document.getElementById('starlight__sidebar');
  if (sidebar) mountSidebar(sidebar);
}

document.addEventListener('astro:page-load', mountReaderNavigation);
