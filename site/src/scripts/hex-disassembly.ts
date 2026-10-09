type Pair = 'opcode' | 'operand';
const maximum = 0xffff_ffff;
const mounted = new WeakSet<HTMLElement>();

function pairOf(target: EventTarget | null, inspector: HTMLElement): Pair | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLButtonElement>('[data-hex-pair]');
  if (!button || !inspector.contains(button)) return null;
  return button.dataset.hexPair === 'opcode' ? 'opcode' : button.dataset.hexPair === 'operand' ? 'operand' : null;
}

export function mountHexDisassemblyInspectors(): void {
  document.querySelectorAll<HTMLElement>('[data-hex-inspector]').forEach((inspector) => {
    if (mounted.has(inspector)) return;
    const input = inspector.querySelector<HTMLInputElement>('[data-hex-input]');
    const controls = inspector.querySelector<HTMLElement>('[data-hex-controls]');
    const reset = inspector.querySelector<HTMLButtonElement>('[data-hex-reset]');
    const status = inspector.querySelector<HTMLElement>('[data-hex-status]');
    const initial = Number(inspector.dataset.hexInitial);
    if (!input || !controls || !reset || !status || !Number.isInteger(initial) || initial < 0 || initial > maximum) return;
    mounted.add(inspector);
    const abort = new AbortController();
    const options = { signal: abort.signal };
    const parts = Array.from(inspector.querySelectorAll<HTMLButtonElement>('[data-hex-pair]'));
    let selected: Pair | null = null;
    let hovered: Pair | null = null;
    let focused: Pair | null = null;
    let value = initial;

    const encoding = (next: number): string[] => Array.from({ length: 4 }, (_, index) => ((next >>> (index * 8)) & 0xff).toString(16).padStart(2, '0').toUpperCase());
    const announce = (pair: Pair | null): void => {
      const bytes = encoding(value);
      const message = pair === 'opcode'
        ? 'Opcode B8 and mnemonic mov describe the same operation: copy imm32 into EAX.'
        : pair === 'operand'
          ? `Operand bytes ${bytes.join(' ')} encode ${value}, least significant byte first.`
          : `${value} is 0x${value.toString(16).toUpperCase()}. Encoding: B8 ${bytes.join(' ')}.`;
      if (status.textContent !== message) status.textContent = message;
    };
    const renderPair = (): void => {
      const active = hovered ?? focused ?? selected;
      inspector.dataset.hexActive = active ?? '';
      for (const part of parts) {
        part.classList.toggle('is-linked', part.dataset.hexPair === active);
        part.setAttribute('aria-pressed', String(part.dataset.hexPair === selected));
      }
    };
    const renderValue = (next: number): void => {
      value = next;
      const bytes = encoding(value);
      inspector.querySelectorAll<HTMLElement>('[data-hex-byte], [data-hex-reference-byte]').forEach((element) => {
        const index = Number(element.dataset.hexByte ?? element.dataset.hexReferenceByte);
        const byte = bytes[index];
        if (byte === undefined) return;
        element.textContent = byte;
        if (element instanceof HTMLButtonElement) element.setAttribute('aria-label', `Immediate byte ${index + 1}: ${byte}. Select its matching value.`);
      });
      inspector.querySelectorAll<HTMLButtonElement>('[data-hex-value]').forEach((element) => { element.textContent = String(value); element.setAttribute('aria-label', `Immediate value ${value}. Select its matching operand bytes.`); });
      input.setCustomValidity(''); input.removeAttribute('aria-invalid');
      announce(selected);
    };

    inspector.addEventListener('pointerover', (event: PointerEvent) => { hovered = pairOf(event.target, inspector); renderPair(); }, options);
    inspector.addEventListener('pointerout', (event: PointerEvent) => { hovered = pairOf(event.relatedTarget, inspector); renderPair(); }, options);
    inspector.addEventListener('focusin', (event: FocusEvent) => { focused = pairOf(event.target, inspector); renderPair(); if (focused) announce(focused); }, options);
    inspector.addEventListener('focusout', (event: FocusEvent) => { focused = pairOf(event.relatedTarget, inspector); renderPair(); }, options);
    inspector.addEventListener('click', (event: MouseEvent) => {
      const pair = pairOf(event.target, inspector);
      if (!pair) return;
      selected = selected === pair ? null : pair;
      renderPair(); announce(selected);
    }, options);
    input.addEventListener('input', () => {
      const next = input.valueAsNumber;
      if (!Number.isInteger(next) || next < 0 || next > maximum) {
        const message = `Enter a whole number from 0 to ${maximum}. The listing still shows ${value}.`;
        input.setCustomValidity(message); input.setAttribute('aria-invalid', 'true'); status.textContent = message;
        return;
      }
      renderValue(next);
    }, options);
    reset.addEventListener('click', () => { selected = null; hovered = null; focused = null; input.value = String(initial); renderPair(); renderValue(initial); }, options);
    document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(inspector); }, { ...options, once: true });
    input.value = String(initial);
    parts.forEach((part) => { part.disabled = false; });
    controls.hidden = false;
    inspector.dataset.hexReady = 'true';
    renderValue(initial);
  });
}

document.addEventListener('astro:page-load', mountHexDisassemblyInspectors);
