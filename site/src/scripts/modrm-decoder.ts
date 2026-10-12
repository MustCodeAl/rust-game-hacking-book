// Interactive side of ModRMDecoder.astro. The server render already shows the default byte;
// this script recomputes the same fields with the pure model in ../lib/modrm.
import { decodeModRM, decodeSib, describeFollow, describeMod, describeReg, describeRm, encodeModRM, rmRows, type Mod } from '../lib/modrm';
import { parseHexNumber, toHex } from '../lib/hex-field';

const mounted = new WeakSet<HTMLElement>();

function cell(text: string): HTMLTableCellElement {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const form = root.querySelector<HTMLFormElement>('[data-mr-form]');
  const input = root.querySelector<HTMLInputElement>('[data-mr-input]');
  const sibField = root.querySelector<HTMLElement>('[data-mr-sibfield]');
  const sibInput = root.querySelector<HTMLInputElement>('[data-mr-sib-input]');
  const sibOut = root.querySelector<HTMLElement>('[data-mr-sib-out]');
  const error = root.querySelector<HTMLElement>('[data-mr-error]');
  const rmBody = root.querySelector<HTMLElement>('[data-mr-rmbody]');
  const regBody = root.querySelector<HTMLElement>('[data-mr-regtable] tbody');
  const hexOut = root.querySelector<HTMLElement>('[data-mr-hex]');
  const binOut = root.querySelector<HTMLElement>('[data-mr-binary]');
  const modSelect = root.querySelector<HTMLSelectElement>('[data-mr-select="mod"]');
  const regSelect = root.querySelector<HTMLSelectElement>('[data-mr-select="reg"]');
  const rmSelect = root.querySelector<HTMLSelectElement>('[data-mr-select="rm"]');
  const modLabel = root.querySelector<HTMLElement>('[data-mr-label="mod"]');
  const regLabel = root.querySelector<HTMLElement>('[data-mr-label="reg"]');
  const rmLabel = root.querySelector<HTMLElement>('[data-mr-label="rm"]');
  const initial = Number(root.dataset.mrInitial);
  if (!form || !input || !sibField || !sibInput || !sibOut || !error || !rmBody || !regBody || !hexOut || !binOut || !modSelect || !regSelect || !rmSelect || !modLabel || !regLabel || !rmLabel || !Number.isInteger(initial)) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const text = (key: string, value: string): void => root.querySelectorAll<HTMLElement>(`[data-mr-text="${key}"]`).forEach(node => { node.textContent = value; });
  let renderedMod: Mod | null = null;
  let byte = initial;

  const complain = (message: string, target: HTMLInputElement = input): void => {
    error.textContent = message;
    if (message) target.setAttribute('aria-invalid', 'true'); else { input.removeAttribute('aria-invalid'); sibInput.removeAttribute('aria-invalid'); }
  };

  const renderSib = (m: ReturnType<typeof decodeModRM>): void => {
    sibField.hidden = !m.hasSib;
    sibOut.hidden = !m.hasSib;
    if (!m.hasSib) return;
    const value = parseHexNumber(sibInput.value, 2);
    if (value === null) { sibOut.textContent = 'Type a SIB byte (1 or 2 hex digits) to see its scale, index and base.'; return; }
    const sib = decodeSib(value, m.mod);
    sibOut.textContent = `SIB ${sib.hex} = ${sib.binary.slice(0, 2)} ${sib.binary.slice(2, 5)} ${sib.binary.slice(5)}: scale ${sib.scale}, ${sib.indexName ? `index ${sib.indexName}` : 'no index (100)'}, ${sib.baseName ? `base ${sib.baseName}` : 'no base register (101 with mod 00)'}. The address is ${sib.expression}.`;
  };

  const render = (next: number, fromInput: boolean): void => {
    byte = next;
    const m = decodeModRM(next);
    if (!fromInput) input.value = m.hex;
    modSelect.value = String(m.mod); regSelect.value = String(m.reg); rmSelect.value = String(m.rm);
    hexOut.textContent = m.hex;
    binOut.textContent = `${m.modBits} ${m.regBits} ${m.rmBits}`;
    root.querySelectorAll<HTMLElement>('[data-mr-bit]').forEach(bit => { bit.textContent = m.binary.charAt(Number(bit.dataset.mrBit)); });
    text('mod-bits', m.modBits); text('reg-bits', m.regBits); text('rm-bits', m.rmBits); text('table-mod', m.modBits);
    text('mod', describeMod(m.mod)); text('reg', describeReg(m)); text('rm', describeRm(m));
    text('form', m.addressForm); text('follow', describeFollow(m));
    modLabel.textContent = `${m.modBits} = ${m.mod}`; regLabel.textContent = `${m.regBits} = ${m.reg}`; rmLabel.textContent = `${m.rmBits} = ${m.rm}`;
    if (renderedMod !== m.mod) {
      renderedMod = m.mod;
      rmBody.replaceChildren(...rmRows(m.mod).map(r => {
        const tr = document.createElement('tr');
        tr.dataset.mrRm = String(r.rm);
        tr.append(cell(r.bits), cell(r.form), cell(r.hex));
        return tr;
      }));
    }
    rmBody.querySelectorAll<HTMLElement>('tr').forEach(tr => { if (Number(tr.dataset.mrRm) === m.rm) tr.setAttribute('aria-current', 'true'); else tr.removeAttribute('aria-current'); });
    regBody.querySelectorAll<HTMLElement>('tr').forEach(tr => { if (Number(tr.dataset.mrReg) === m.reg) tr.setAttribute('aria-current', 'true'); else tr.removeAttribute('aria-current'); });
    root.querySelectorAll<HTMLButtonElement>('[data-mr-example]').forEach(button => { button.setAttribute('aria-pressed', String(Number(button.dataset.mrExample) === next)); });
    renderSib(m);
  };

  form.addEventListener('submit', (event: SubmitEvent) => event.preventDefault(), options);
  input.addEventListener('input', () => {
    const value = parseHexNumber(input.value, 2);
    if (value === null) { complain(input.value.trim() === '' ? 'Type one or two hex digits, such as 45.' : 'A ModR/M byte is one or two hex digits (0 to 9, A to F).'); return; }
    complain(''); render(value, true);
  }, options);
  sibInput.addEventListener('input', () => {
    const value = parseHexNumber(sibInput.value, 2);
    if (value === null && sibInput.value.trim() !== '') complain('A SIB byte is one or two hex digits (0 to 9, A to F).', sibInput); else complain('');
    renderSib(decodeModRM(byte));
  }, options);
  form.addEventListener('change', (event: Event) => {
    if (!(event.target instanceof HTMLSelectElement) || !event.target.dataset.mrSelect) return;
    const mod = Number(modSelect.value), reg = Number(regSelect.value), rm = Number(rmSelect.value);
    complain(''); render(encodeModRM(mod, reg, rm), false);
  }, options);
  root.addEventListener('click', (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-mr-example]');
    if (!button || !root.contains(button)) return;
    complain(''); render(Number(button.dataset.mrExample), false);
  }, options);
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
  form.hidden = false;
  render(initial, false);
}

export function mountModRMDecoders(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-modrm]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountModRMDecoders());
