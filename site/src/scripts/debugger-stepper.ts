import { validDebuggerSteps, type DebuggerStep, type RecordedValue } from '../data/debugger-model';

const mounted = new WeakSet<HTMLElement>();

export function mountDebuggerSteppers(): void {
  document.querySelectorAll<HTMLElement>('[data-debugger-stepper]').forEach((widget) => {
    if (mounted.has(widget)) return;
    const data = widget.querySelector<HTMLScriptElement>('[data-debugger-model]');
    const controls = widget.querySelector<HTMLElement>('[data-debugger-controls]');
    const previous = widget.querySelector<HTMLButtonElement>('[data-debugger-previous]');
    const next = widget.querySelector<HTMLButtonElement>('[data-debugger-next]');
    const reset = widget.querySelector<HTMLButtonElement>('[data-debugger-reset]');
    const position = widget.querySelector<HTMLOutputElement>('[data-debugger-position]');
    const values = widget.querySelector<HTMLElement>('[data-debugger-values]');
    const stack = widget.querySelector<HTMLElement>('[data-debugger-stack]');
    const description = widget.querySelector<HTMLElement>('[data-debugger-description]');
    const diff = widget.querySelector<HTMLElement>('[data-debugger-diff]');
    const notches = widget.querySelector<HTMLElement>('[data-debugger-notches]');
    const source = widget.querySelector<HTMLElement>('[data-debugger-source]');
    const registerInspector = widget.querySelector<HTMLElement>('[data-register-inspector]');
    if (!data || !controls || !previous || !next || !reset || !position || !values || !stack || !description || !diff || !notches || !source) return;
    let steps: DebuggerStep[];
    let lineCount: number;
    try {
      const parsed: unknown = JSON.parse(data.textContent ?? 'null');
      if (typeof parsed !== 'object' || parsed === null || !('lineCount' in parsed) || !('steps' in parsed) || typeof parsed.lineCount !== 'number' || !validDebuggerSteps(parsed.steps, parsed.lineCount)) return;
      steps = parsed.steps;
      lineCount = parsed.lineCount;
    } catch { return; }
    mounted.add(widget);
    const abort = new AbortController();
    const options = { signal: abort.signal };
    let index = 0;
    let focusedRegister: string | null = null;
    let hoveredRegister: string | null = null;
    let valid = true;
    const normalize = (name: string): string => name.trim().toLowerCase();
    const registerOf = (target: EventTarget | null): string | null => {
      if (!(target instanceof Element)) return null;
      const element = target.closest<HTMLElement>('[data-register-name]');
      return element && widget.contains(element) ? normalize(element.dataset.registerName ?? '') : null;
    };
    const showRegister = (): void => {
      const active = hoveredRegister ?? focusedRegister;
      let count = 0;
      widget.querySelectorAll<HTMLElement>('[data-register-name]').forEach((element) => { const linked = active !== null && normalize(element.dataset.registerName ?? '') === active; element.classList.toggle('is-register-linked', linked); if (linked) count += 1; });
      source.querySelectorAll<HTMLElement>('.is-debugger-current').forEach((line) => line.classList.toggle('is-instruction-linked', active !== null && /^(pc|ip|eip|rip)$/.test(active)));
      if (registerInspector) registerInspector.textContent = active ? `${active.toUpperCase()}: ${count} matching source and inspection references.` : 'Focus a register name to mark its matching source and inspection references.';
    };
    const bindRegisters = (): void => {
      const names = new Set(Array.from(values.querySelectorAll<HTMLElement>('[data-register-name]')).map((element) => normalize(element.dataset.registerName ?? '')));
      source.querySelectorAll<HTMLElement>('.ec-line .code').forEach((line) => {
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        let node = walker.nextNode();
        while (node) { if (node instanceof Text && !node.parentElement?.closest('[data-register-name]')) nodes.push(node); node = walker.nextNode(); }
        for (const text of nodes) {
          const parts = text.data.split(/(\b[a-zA-Z][a-zA-Z0-9]*\b)/);
          if (!parts.some((part) => names.has(normalize(part)))) continue;
          const fragment = document.createDocumentFragment();
          for (const part of parts) {
            if (!names.has(normalize(part))) { fragment.append(document.createTextNode(part)); continue; }
            const badge = document.createElement('span'); badge.textContent = part; badge.dataset.registerName = normalize(part); fragment.append(badge);
          }
          text.replaceWith(fragment);
        }
      });
      const firstSource = new Set<string>();
      widget.querySelectorAll<HTMLElement>('[data-register-name]').forEach((element) => {
        const name = normalize(element.dataset.registerName ?? '');
        const keyboard = !source.contains(element) || !firstSource.has(name);
        element.tabIndex = keyboard ? 0 : -1;
        if (source.contains(element)) firstSource.add(name);
        element.setAttribute('aria-description', `${name.toUpperCase()} register reference. Focus or point to it to mark matching names.`);
      });
      showRegister();
    };

    const code = (value: RecordedValue): HTMLElement => { const element = document.createElement('code'); element.textContent = String(value); return element; };
    const allValues = (step: DebuggerStep): Record<string, RecordedValue> => ({ ...step.registers, ...step.variables });
    const renderSource = (): void => {
      const active = steps[index];
      if (!active) return;
      source.querySelectorAll<HTMLElement>('.ec-line').forEach((line, lineIndex) => {
        const current = lineIndex + 1 === active.line;
        line.classList.toggle('is-debugger-current', current);
        if (current) line.setAttribute('aria-current', 'step'); else line.removeAttribute('aria-current');
      });
      bindRegisters();
    };
    const render = (): void => {
      if (!valid) return;
      const step = steps[index];
      if (!step) return;
      const focused = document.activeElement instanceof HTMLElement && values.contains(document.activeElement) ? document.activeElement.dataset.registerName : undefined;
      previous.disabled = index === 0;
      next.disabled = index === steps.length - 1;
      position.value = `${index + 1} / ${steps.length}`;
      description.textContent = `Snapshot ${index + 1}, source line ${step.line}: ${step.description}`;
      notches.querySelectorAll<HTMLButtonElement>('[data-debugger-select]').forEach((button) => { if (Number(button.dataset.debuggerSelect) === index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
      const rows = document.createDocumentFragment();
      for (const [name, value] of Object.entries(allValues(step))) {
        const row = document.createElement('div'); const term = document.createElement('dt'); const detail = document.createElement('dd');
        if (Object.hasOwn(step.registers, name)) { const badge = code(name); badge.dataset.registerName = name; term.append(badge); } else term.textContent = name;
        detail.append(code(value)); row.append(term, detail); rows.append(row);
      }
      values.replaceChildren(rows);
      const slots = document.createDocumentFragment();
      for (const slot of step.stack ?? []) {
        const item = document.createElement('li'); item.dataset.stackKind = slot.kind;
        const label = document.createElement('span'); label.textContent = slot.label;
        const meaning = document.createElement('small'); meaning.textContent = slot.kind === 'return' ? 'return frame' : slot.kind === 'saved' ? 'saved register' : 'unallocated';
        item.append(label, code(slot.value), meaning); slots.append(item);
      }
      stack.replaceChildren(slots);
      const before = steps[index - 1];
      const changes = document.createElement('ul');
      if (before) {
        const old = allValues(before), current = allValues(step);
        for (const name of new Set([...Object.keys(old), ...Object.keys(current)])) {
          const oldValue = Object.hasOwn(old, name) ? old[name] : undefined;
          const currentValue = Object.hasOwn(current, name) ? current[name] : undefined;
          if (oldValue === currentValue) continue;
          const item = document.createElement('li'); const label = document.createElement('strong'); label.textContent = `${name}: `;
          const removed = document.createElement('del'); removed.textContent = oldValue === undefined ? 'unallocated' : String(oldValue);
          const added = document.createElement('ins'); added.textContent = currentValue === undefined ? 'unallocated' : String(currentValue);
          item.append(label, removed, document.createTextNode(' → '), added); changes.append(item);
        }
      }
      if (changes.childElementCount) diff.replaceChildren(changes); else diff.textContent = before ? 'No named values changed in this snapshot.' : 'Initial recorded state.';
      renderSource();
      if (focused) values.querySelector<HTMLElement>(`[data-register-name="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
    };
    previous.addEventListener('click', () => { index = Math.max(0, index - 1); render(); }, options);
    next.addEventListener('click', () => { index = Math.min(steps.length - 1, index + 1); render(); }, options);
    reset.addEventListener('click', () => { index = 0; render(); }, options);
    notches.addEventListener('click', (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-debugger-select]') : null;
      const selected = Number(target?.dataset.debuggerSelect);
      if (!target || !Number.isInteger(selected) || selected < 0 || selected >= steps.length) return;
      index = selected; render();
    }, options);
    const sourceChanges = new MutationObserver(renderSource);
    sourceChanges.observe(source, { childList: true, subtree: true });
    widget.addEventListener('pointerover', (event: PointerEvent) => { hoveredRegister = registerOf(event.target); showRegister(); }, options);
    widget.addEventListener('pointerout', (event: PointerEvent) => { hoveredRegister = registerOf(event.relatedTarget); showRegister(); }, options);
    widget.addEventListener('focusin', (event: FocusEvent) => { focusedRegister = registerOf(event.target); showRegister(); }, options);
    widget.addEventListener('focusout', (event: FocusEvent) => { focusedRegister = registerOf(event.relatedTarget); showRegister(); }, options);
    widget.addEventListener('keydown', (event: KeyboardEvent) => {
      if (!valid || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable]'))) return;
      const target = event.key === 'ArrowRight' ? Math.min(steps.length - 1, index + 1) : event.key === 'ArrowLeft' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? steps.length - 1 : null;
      if (target === null) return;
      event.preventDefault(); index = target; render();
      if (event.target instanceof Element && event.target.closest('[data-debugger-notches]')) notches.querySelector<HTMLButtonElement>(`[data-debugger-select="${index}"]`)?.focus({ preventScroll: true });
    }, options);
    widget.addEventListener('debugger:update', (event: Event) => {
      const detail: unknown = event instanceof CustomEvent ? event.detail : null;
      const candidate: unknown = typeof detail === 'object' && detail !== null && 'steps' in detail ? detail.steps : null;
      valid = validDebuggerSteps(candidate, lineCount);
      widget.dataset.debuggerValid = String(valid);
      notches.querySelectorAll<HTMLButtonElement>('button').forEach((button) => { button.disabled = !valid; });
      if (!valid) { previous.disabled = next.disabled = reset.disabled = true; description.textContent = 'Enter a whole byte from 0 to 255 to step this instruction.'; return; }
      reset.disabled = false;
      if (!validDebuggerSteps(candidate, lineCount)) return;
      steps = candidate; index = 0; render();
    }, options);
    const reference = widget.querySelector<HTMLDetailsElement>('.debugger-stepper__reference');
    if (reference) {
      reference.open = false;
      let wasOpen = false;
      window.addEventListener('beforeprint', () => { wasOpen = reference.open; reference.open = true; }, options);
      window.addEventListener('afterprint', () => { reference.open = wasOpen; }, options);
    }
    document.addEventListener('astro:before-swap', () => { sourceChanges.disconnect(); abort.abort(); mounted.delete(widget); }, { ...options, once: true });
    controls.hidden = false; notches.hidden = false;
    widget.dataset.debuggerReady = 'true'; render();
  });
}

document.addEventListener('astro:page-load', mountDebuggerSteppers);
