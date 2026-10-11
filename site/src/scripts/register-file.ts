// Write form for RegisterFileDiagram.astro. The server render is already the complete default example;
// this script recomputes the same markup from the pure model in ../lib/register-file.
import { isRegisterName, digitsOf, describeWrite, registerHex, viewOf, writeRegister, type RegisterName } from '../lib/register-file';
import { parseHexBig, toHex } from '../lib/hex-field';

const mounted = new WeakSet<HTMLElement>();
const TAG = { written: 'set', cleared: 'zero', kept: 'same' } as const;

function targetOf(form: HTMLFormElement): RegisterName {
  const checked = form.querySelector<HTMLInputElement>('input[type="radio"]:checked');
  const value = checked?.value;
  return isRegisterName(value) ? value : 'EAX';
}

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const form = root.querySelector<HTMLFormElement>('[data-rf-form]');
  const input = root.querySelector<HTMLInputElement>('[data-rf-input]');
  const label = root.querySelector<HTMLElement>('[data-rf-label]');
  const preview = root.querySelector<HTMLElement>('[data-rf-preview]');
  const error = root.querySelector<HTMLElement>('[data-rf-error]');
  const status = root.querySelector<HTMLElement>('[data-rf-status]');
  const beforeText = root.querySelector<HTMLElement>('[data-rf-before]');
  const afterText = root.querySelector<HTMLElement>('[data-rf-after]');
  const instrText = root.querySelector<HTMLElement>('[data-rf-instr]');
  const reset = root.querySelector<HTMLButtonElement>('[data-rf-reset]');
  const beforeRow = root.querySelector<HTMLElement>('[data-rf-row="before"]');
  const afterRow = root.querySelector<HTMLElement>('[data-rf-row="after"]');
  const startHex = root.dataset.rfStart, initialName = root.dataset.rfInitialName, initialHex = root.dataset.rfInitialValue;
  if (!form || !input || !label || !preview || !error || !status || !beforeText || !afterText || !instrText || !reset || !beforeRow || !afterRow
    || !startHex || !isRegisterName(initialName) || !initialHex) return;
  const start = BigInt(`0x${startHex}`);
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let current = writeRegister(start, initialName, BigInt(`0x${initialHex}`)).after;

  const setRow = (row: HTMLElement, bytes: readonly { lane: number; value: number; change: 'written' | 'cleared' | 'kept' }[], showTags: boolean): void => {
    for (const item of bytes) {
      const cell = row.querySelector<HTMLElement>(`[data-lane="${item.lane}"]`);
      if (!cell) continue;
      cell.dataset.change = item.change;
      const digits = cell.querySelector('b');
      if (digits) digits.textContent = toHex(item.value, 2);
      const small = cell.querySelector('small');
      if (small) small.textContent = showTags ? TAG[item.change] : '';
      cell.setAttribute('aria-label', `Byte ${item.lane}: ${toHex(item.value, 2)}${showTags ? `, ${TAG[item.change]}` : ''}`);
    }
  };

  const parsed = (): { name: RegisterName; value: bigint | null } => {
    const name = targetOf(form);
    return { name, value: parseHexBig(input.value, digitsOf(viewOf(name))) };
  };

  const updatePreview = (): void => {
    const { name, value } = parsed();
    const view = viewOf(name);
    preview.replaceChildren('Instruction: ');
    const code = document.createElement('code');
    code.textContent = `mov ${view.asm}, 0x${value === null ? '?'.repeat(digitsOf(view)) : toHex(value, digitsOf(view))}`;
    preview.append(code);
  };

  const showTarget = (name: RegisterName): void => {
    const view = viewOf(name);
    root.querySelectorAll<HTMLElement>('[data-rf-name]').forEach(bar => { bar.dataset.target = String(bar.dataset.rfName === name); });
    label.textContent = `Value, up to ${digitsOf(view)} hex digit${digitsOf(view) === 1 ? '' : 's'}`;
    updatePreview();
  };

  const complain = (message: string): void => {
    error.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  };

  const render = (name: RegisterName, value: bigint, base: bigint): void => {
    const result = writeRegister(base, name, value);
    setRow(beforeRow, result.lanes.map(l => ({ lane: l.lane, value: l.before, change: 'kept' as const })), false);
    setRow(afterRow, result.lanes.map(l => ({ lane: l.lane, value: l.after, change: l.change })), true);
    beforeText.textContent = registerHex(result.before);
    afterText.textContent = registerHex(result.after);
    instrText.textContent = result.instruction;
    status.textContent = describeWrite(result);
    current = result.after;
  };

  form.addEventListener('submit', (event: SubmitEvent) => {
    event.preventDefault();
    const { name, value } = parsed();
    const view = viewOf(name);
    if (value === null) { complain(`Enter 1 to ${digitsOf(view)} hex digits (0 to 9, A to F) for ${view.name}.`); return; }
    complain('');
    render(name, value, current);
  }, options);
  input.addEventListener('input', () => {
    const { name, value } = parsed();
    updatePreview();
    complain(value === null && input.value.trim() !== '' ? `${name} takes 1 to ${digitsOf(viewOf(name))} hex digits (0 to 9, A to F).` : '');
  }, options);
  form.addEventListener('change', (event: Event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'radio') { showTarget(targetOf(form)); complain(''); }
  }, options);
  reset.addEventListener('click', () => {
    const radio = form.querySelector<HTMLInputElement>(`input[type="radio"][value="${initialName}"]`);
    if (radio) radio.checked = true;
    input.value = initialHex; complain(''); showTarget(initialName);
    render(initialName, BigInt(`0x${initialHex}`), start);
  }, options);
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
  form.hidden = false;
  showTarget(initialName);
}

export function mountRegisterFiles(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-register-file]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountRegisterFiles());
