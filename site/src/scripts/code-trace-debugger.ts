const mounted = new WeakSet<HTMLElement>();
const registerName = /^(?:[re]?(?:ax|bx|cx|dx|si|di|bp|sp|ip)|[abcd][hl]|r(?:[89]|1[0-5])(?:[bwd])?|[xyz]|a|pc|ip|flags|eflags|rflags)$/i;
const modern = (): boolean => document.documentElement.dataset.academyAppearance === 'modern';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

export function mountCodeTraceDebuggers(): void {
  document.querySelectorAll<HTMLElement>('[data-code-trace]').forEach((root) => {
    if (mounted.has(root)) return;
    const listing = root.querySelector<HTMLOListElement>('.code-trace__code');
    const grid = root.querySelector<HTMLElement>('.code-trace__grid');
    const nav = root.querySelector<HTMLElement>('.code-trace__nav');
    const codePanel = listing?.parentElement;
    const variablePanel = grid?.children[1];
    const previous = nav?.querySelector<HTMLButtonElement>('button:nth-of-type(1)');
    const next = nav?.querySelector<HTMLButtonElement>('button:nth-of-type(2)');
    if (!listing || !grid || !nav || !codePanel || !(variablePanel instanceof HTMLElement) || !previous || !next) return;
    mounted.add(root);
    const abort = new AbortController();
    const options = { signal: abort.signal };
    const timeline = element('ol', 'trace-debugger__timeline');
    timeline.setAttribute('aria-label', 'Execution steps');
    timeline.dataset.traceTimeline = '';
    const toolbar = element('div', 'trace-debugger__chrome');
    const language = element('span', 'trace-debugger__language', 'Source');
    const copy = element('button', 'trace-debugger__copy', 'Copy code');
    copy.type = 'button';
    const feedback = element('span', 'trace-debugger__copy-status');
    feedback.setAttribute('role', 'status');
    toolbar.append(language, copy, feedback);
    const diff = element('div', 'trace-debugger__mutation');
    diff.setAttribute('aria-label', 'Value changes from the previous execution step');
    const inspector = element('p', 'trace-debugger__inspector');
    inspector.setAttribute('role', 'status');
    inspector.setAttribute('aria-live', 'polite');
    codePanel.insertBefore(toolbar, listing);
    nav.insertAdjacentElement('afterend', timeline);
    variablePanel.append(diff, inspector);
    let hovered: string | null = null;
    let focused: string | null = null;
    let timelineLength = 0;
    let restoreRegister: string | null = null;
    const ofRegister = (target: EventTarget | null): string | null => {
      const node = target instanceof Element ? target.closest<HTMLElement>('[data-trace-register]') : null;
      return node && root.contains(node) ? node.dataset.traceRegister ?? null : null;
    };
    const pair = (): void => {
      const name = hovered ?? focused;
      let count = 0;
      root.querySelectorAll<HTMLElement>('[data-trace-register]').forEach((node) => {
        const linked = modern() && name !== null && node.dataset.traceRegister === name;
        node.classList.toggle('is-register-linked', linked);
        if (linked) count += 1;
      });
      root.querySelectorAll<HTMLElement>('.code-trace__line.is-current').forEach((line) => line.classList.toggle('is-instruction-linked', modern() && name !== null && /^(?:pc|ip|eip|rip)$/.test(name)));
      const message = name ? `${name.toUpperCase()}: ${count} matching code and inspection references.` : 'Focus or point to a register name to mark its code and inspection references.';
      if (inspector.textContent !== message) inspector.textContent = message;
    };
    const select = (to: number): void => {
      const total = Number(root.dataset.steps);
      if (!Number.isInteger(to) || to < 1 || to > total) return;
      let current = Number(root.dataset.step);
      while (current !== to) {
        (current < to ? next : previous).click();
        const updated = Number(root.dataset.step);
        if (updated === current) break;
        current = updated;
      }
      sync();
    };
    const observer = new MutationObserver(() => sync());
    const observe = (): void => observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-step', 'data-steps'] });
    const sync = (): void => {
      observer.disconnect();
      const enabled = modern();
      root.dataset.debuggerEnhanced = String(enabled);
      toolbar.hidden = timeline.hidden = diff.hidden = inspector.hidden = !enabled;
      const total = Number(root.dataset.steps);
      const current = Number(root.dataset.step);
      if (Number.isInteger(total) && total > 0 && total <= 1000) {
        if (total !== timelineLength) {
          timelineLength = total;
          const fragment = document.createDocumentFragment();
          for (let index = 1; index <= total; index += 1) {
            const item = element('li', '');
            const button = element('button', '', String(index));
            button.type = 'button';
            button.dataset.traceSelect = String(index);
            button.setAttribute('aria-label', `Execution step ${index} of ${total}`);
            item.append(button); fragment.append(item);
          }
          timeline.replaceChildren(fragment);
        }
        timeline.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
          const active = Number(button.dataset.traceSelect) === current;
          button.tabIndex = active ? 0 : -1;
          if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
        });
      }
      const names = new Set<string>();
      root.querySelectorAll<HTMLElement>('.code-trace__name').forEach((name) => {
        const text = name.textContent?.trim() ?? '';
        if (!registerName.test(text)) return;
        names.add(text.toLowerCase());
        name.dataset.traceRegister = text.toLowerCase();
        name.tabIndex = enabled ? 0 : -1;
        name.setAttribute('aria-description', `${text} register. Focus to mark its source references.`);
      });
      const first = new Set<string>();
      listing.querySelectorAll<HTMLElement>('code').forEach((line) => {
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        let node = walker.nextNode();
        while (node) {
          if (node instanceof Text && !node.parentElement?.closest('[data-trace-register]')) nodes.push(node);
          node = walker.nextNode();
        }
        for (const text of nodes) {
          const parts = text.data.split(/(\b[a-zA-Z][a-zA-Z0-9]*\b)/);
          if (!parts.some((part) => names.has(part.toLowerCase()))) continue;
          const fragment = document.createDocumentFragment();
          for (const part of parts) {
            if (!names.has(part.toLowerCase())) { fragment.append(document.createTextNode(part)); continue; }
            const badge = element('span', 'trace-debugger__register', part);
            badge.dataset.traceRegister = part.toLowerCase();
            badge.setAttribute('aria-description', `${part} register. Focus to mark its inspection value.`);
            fragment.append(badge);
          }
          text.replaceWith(fragment);
        }
      });
      listing.querySelectorAll<HTMLElement>('.code-trace__ln[data-trace-register]').forEach((marker) => { delete marker.dataset.traceRegister; marker.removeAttribute('aria-description'); marker.tabIndex = -1; });
      const ip = ['rip', 'eip', 'ip', 'pc'].find((name) => names.has(name));
      const marker = listing.querySelector<HTMLElement>('.code-trace__line.is-current .code-trace__ln');
      if (ip && marker) { marker.dataset.traceRegister = ip; marker.setAttribute('aria-description', `${ip.toUpperCase()} instruction pointer mark for this source line.`); }
      listing.querySelectorAll<HTMLElement>('[data-trace-register]').forEach((badge) => {
        const name = badge.dataset.traceRegister ?? '';
        badge.tabIndex = enabled && !first.has(name) ? 0 : -1; first.add(name);
      });
      const listingText = Array.from(listing.querySelectorAll('code')).map((line) => line.textContent ?? '').join('\n');
      language.textContent = /\b(?:mov|push|pop|ret|call|eax|esp|rax)\b/i.test(listingText) ? 'Assembly · recorded trace' : /\b(?:fn|let|mut|Result|Some|None)\b/.test(listingText) ? 'Rust · recorded trace' : 'Source · recorded trace';
      const changes = element('ul', '');
      root.querySelectorAll<HTMLElement>('.code-trace__var.is-changed').forEach((row) => {
        const name = row.querySelector('.code-trace__name')?.textContent ?? '';
        const after = row.querySelector('.code-trace__val')?.textContent ?? '';
        const before = row.querySelector('.code-trace__was')?.textContent?.replace(/^was /, '') ?? 'not set';
        const item = element('li', '');
        const deleted = element('del', '', before); const added = element('ins', '', after);
        item.append(document.createTextNode(`${name}: `), deleted, document.createTextNode(' → '), added);
        changes.append(item);
      });
      if (changes.childElementCount) diff.replaceChildren(changes); else diff.textContent = current === 1 ? 'Initial state.' : 'No named values changed in this step.';
      root.querySelectorAll<HTMLElement>('.code-trace__cell').forEach((cell) => {
        const meaning = `${cell.querySelector('.code-trace__cell-label')?.textContent ?? ''} ${cell.querySelector('.code-trace__cell-note')?.textContent ?? ''} ${cell.querySelector('.code-trace__cell-value')?.textContent ?? ''}`;
        const memoryTitle = root.querySelector('.code-trace__mem-title')?.textContent ?? '';
        const kind = /unallocated|unused|not allocated|not written|outside active stack|empty|\bfree\b/i.test(meaning) ? 'unallocated' : /return|resume|\bret\b/i.test(`${meaning} ${memoryTitle}`) ? 'return' : /saved|\bsave\b/i.test(`${meaning} ${memoryTitle}`) ? 'saved' : null;
        if (kind) cell.dataset.stackKind = kind; else delete cell.dataset.stackKind;
      });
      if (restoreRegister) {
        root.querySelector<HTMLElement>(`.code-trace__name[data-trace-register="${CSS.escape(restoreRegister)}"]`)?.focus({ preventScroll: true });
        restoreRegister = null;
      }
      pair();
      observe();
    };
    timeline.addEventListener('click', (event: MouseEvent) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-trace-select]') : null;
      if (button) select(Number(button.dataset.traceSelect));
    }, options);
    timeline.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const current = Number(root.dataset.step), total = Number(root.dataset.steps);
      const to = event.key === 'ArrowRight' ? Math.min(total, current + 1) : event.key === 'ArrowLeft' ? Math.max(1, current - 1) : event.key === 'Home' ? 1 : event.key === 'End' ? total : null;
      if (to === null) return;
      event.preventDefault(); event.stopPropagation(); select(to);
      timeline.querySelector<HTMLButtonElement>(`[data-trace-select="${to}"]`)?.focus({ preventScroll: true });
    }, options);
    copy.addEventListener('click', () => {
      const text = Array.from(listing.querySelectorAll('code')).map((line) => line.textContent ?? '').join('\n');
      void navigator.clipboard?.writeText(text).then(() => { feedback.textContent = 'Code copied.'; }).catch(() => { feedback.textContent = 'Copy unavailable. Select the listing to copy it.'; });
      if (!navigator.clipboard) feedback.textContent = 'Copy unavailable. Select the listing to copy it.';
    }, options);
    root.addEventListener('pointerover', (event: PointerEvent) => { hovered = ofRegister(event.target); pair(); }, options);
    root.addEventListener('pointerout', (event: PointerEvent) => { hovered = ofRegister(event.relatedTarget); pair(); }, options);
    root.addEventListener('focusin', (event: FocusEvent) => { focused = ofRegister(event.target); pair(); }, options);
    root.addEventListener('focusout', (event: FocusEvent) => { focused = ofRegister(event.relatedTarget); pair(); }, options);
    root.addEventListener('keydown', (event: KeyboardEvent) => {
      if (!modern() || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('.code-trace__name[data-trace-register]') : null;
      if (target) restoreRegister = target.dataset.traceRegister ?? null;
    }, { ...options, capture: true });
    document.addEventListener('academy:preferences', sync, options);
    const reference = root.nextElementSibling;
    if (reference instanceof HTMLDetailsElement && reference.hasAttribute('data-trace-reference')) {
      reference.open = false;
      let wasOpen = false;
      window.addEventListener('beforeprint', () => { wasOpen = reference.open; reference.open = true; }, options);
      window.addEventListener('afterprint', () => { reference.open = wasOpen; }, options);
    }
    document.addEventListener('astro:before-swap', () => { observer.disconnect(); abort.abort(); mounted.delete(root); }, { ...options, once: true });
    sync();
  });
}

document.addEventListener('astro:page-load', mountCodeTraceDebuggers);
