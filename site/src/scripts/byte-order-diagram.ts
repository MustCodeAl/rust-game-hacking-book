import { byteParts, isUnsigned32, unsignedHex, MAX_U32, type ByteIndex } from '../lib/byte-order';
const mounted = new WeakSet<HTMLElement>();
function byteIndex(target: EventTarget | null, root: HTMLElement): ByteIndex | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLButtonElement>('[data-byte-index]');
  if (!button || !root.contains(button)) return null;
  const index = Number(button.dataset.byteIndex);
  return index === 0 || index === 1 || index === 2 || index === 3 ? index : null;
}
export function mountByteOrderDiagrams(): void {
  document.querySelectorAll<HTMLElement>('[data-byte-order]').forEach(root => {
    if (mounted.has(root)) return;
    const input = root.querySelector<HTMLInputElement>('[data-byte-input]');
    const controls = root.querySelector<HTMLElement>('[data-byte-controls]');
    const reset = root.querySelector<HTMLButtonElement>('[data-byte-reset]');
    const status = root.querySelector<HTMLElement>('[data-byte-status]');
    const decimal = root.querySelector<HTMLElement>('[data-byte-decimal]');
    const valueBox = root.querySelector<HTMLElement>('.byte-order-diagram__value');
    const initial = Number(root.dataset.byteInitial);
    if (!input || !controls || !reset || !status || !decimal || !valueBox || !isUnsigned32(initial)) return;
    mounted.add(root);
    const abort = new AbortController(); const options = { signal: abort.signal };
    let value = initial, selected: ByteIndex | null = null, hovered: ByteIndex | null = null, focused: ByteIndex | null = null;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-byte-index]'));
    const mark = (): void => {
      const active = hovered ?? focused ?? selected;
      root.querySelectorAll<HTMLElement>('[data-byte-index], [data-byte-digit]').forEach(part => {
        part.classList.toggle('is-linked', Number(part.dataset.byteIndex ?? part.dataset.byteDigit) === active);
        if (part instanceof HTMLButtonElement) part.setAttribute('aria-pressed', String(Number(part.dataset.byteIndex) === selected));
      });
    };
    const announce = (active: ByteIndex | null = selected): void => {
      const bytes = byteParts(value);
      if (active !== null) {
        const byte = bytes[active]; if (!byte) return;
        status.textContent = `Byte ${byte.hex} has weight ${byte.weight.toLocaleString('en-US')}: ${byte.decimal} × ${byte.weight.toLocaleString('en-US')} contributes ${(byte.decimal * byte.weight).toLocaleString('en-US')}. Its offset is +${active} in little endian and +${3 - active} in big endian.`;
      } else status.textContent = `${value.toLocaleString('en-US')} occupies four bytes. Little endian: ${bytes.map(byte => byte.hex).join(' ')}. Big endian: ${[...bytes].reverse().map(byte => byte.hex).join(' ')}.`;
    };
    const update = (next: number): void => {
      value = next; const bytes = byteParts(next);
      decimal.textContent = value.toLocaleString('en-US');
      valueBox.setAttribute('aria-label', `Decimal ${value}, hexadecimal 0x${unsignedHex(value)}`);
      root.querySelectorAll<HTMLElement>('[data-byte-content], [data-byte-digit]').forEach(part => {
        const byte = bytes[Number(part.dataset.byteContent ?? part.dataset.byteDigit)]; if (byte) part.textContent = byte.hex;
      });
      for (const button of buttons) {
        const index = Number(button.dataset.byteIndex), byte = bytes[index];
        const little = button.closest('section')?.getAttribute('aria-label') === 'Little endian';
        if (byte) button.setAttribute('aria-label', `${little ? 'Little' : 'Big'} endian, address 0x${(0x1000 + (little ? index : 3 - index)).toString(16).toUpperCase()}, byte ${byte.hex}, weight ${byte.weight}. Select matching byte positions.`);
      }
      root.querySelectorAll<HTMLElement>('[data-byte-equation]').forEach(equation => {
        const ordered = equation.dataset.byteEquation === 'little' ? bytes : [...bytes].reverse();
        equation.textContent = `${ordered.filter(byte => byte.decimal !== 0).map(byte => `${byte.decimal} × ${byte.weight.toLocaleString('en-US')}`).join(' + ') || '0'} = ${value.toLocaleString('en-US')}`;
      });
      input.setCustomValidity(''); input.removeAttribute('aria-invalid'); mark(); announce();
    };
    root.addEventListener('pointerover', (event: PointerEvent) => { hovered = byteIndex(event.target, root); mark(); }, options);
    root.addEventListener('pointerout', (event: PointerEvent) => { hovered = byteIndex(event.relatedTarget, root); mark(); }, options);
    root.addEventListener('focusin', (event: FocusEvent) => { focused = byteIndex(event.target, root); mark(); if (focused !== null) announce(focused); }, options);
    root.addEventListener('focusout', (event: FocusEvent) => { focused = byteIndex(event.relatedTarget, root); mark(); }, options);
    root.addEventListener('click', (event: MouseEvent) => {
      const index = byteIndex(event.target, root);
      if (index !== null) { selected = selected === index ? null : index; mark(); announce(); return; }
      if (!(event.target instanceof Element)) return;
      const preset = event.target.closest<HTMLButtonElement>('[data-byte-preset]'); const next = Number(preset?.dataset.bytePreset);
      if (preset && root.contains(preset) && isUnsigned32(next)) { input.value = String(next); update(next); }
    }, options);
    input.addEventListener('input', () => {
      if (!isUnsigned32(input.valueAsNumber)) {
        input.setCustomValidity(`Enter a whole number from 0 to ${MAX_U32}.`); input.setAttribute('aria-invalid', 'true');
        status.textContent = `Enter a whole number from 0 to ${MAX_U32}. The diagram still shows ${value.toLocaleString('en-US')}.`;
      } else update(input.valueAsNumber);
    }, options);
    reset.addEventListener('click', () => { selected = null; hovered = null; focused = null; input.value = String(initial); update(initial); }, options);
    document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { ...options, once: true });
    input.value = String(initial); buttons.forEach(button => { button.disabled = false; }); controls.hidden = false; update(initial);
  });
}
document.addEventListener('astro:page-load', mountByteOrderDiagrams);
