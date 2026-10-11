// Adds the size calculator and step-linked highlighting to PacketPath.astro (stepping itself is diagram-player.ts).
import { describePresent, describeSizes, frameSizes, isValidMessage, maxMessage, type FrameSizes, type PartId, type Transport } from '../lib/packet-model';
import type { StepDetail } from './diagram-player';

const mounted = new WeakSet<HTMLElement>();
let listening = false;
const PART_IDS: readonly PartId[] = ['ethernet', 'ip', 'transport', 'data', 'padding', 'fcs'];

const isTransport = (value: unknown): value is Transport => value === 'udp' || value === 'tcp';
const isPart = (value: string): value is PartId => (PART_IDS as readonly string[]).includes(value);
const partList = (text: string | undefined): PartId[] => (text ?? '').split(' ').filter(isPart);

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const calc = root.querySelector<HTMLElement>('[data-pp-calc]');
  const strip = root.querySelector<HTMLElement>('[data-pp-strip]');
  const sizesText = root.querySelector<HTMLElement>('[data-pp-sizes]');
  const now = root.querySelector<HTMLElement>('[data-pp-now]');
  const input = root.querySelector<HTMLInputElement>('[data-pp-input]');
  const reset = root.querySelector<HTMLButtonElement>('[data-pp-reset]');
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-pp-transport]'));
  const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-dg-step]'));
  const initialTransport = root.dataset.ppTransport;
  const initialMessage = Number(root.dataset.ppMessage);
  if (!calc || !strip || !sizesText || !now || !input || !reset || !isTransport(initialTransport) || !isValidMessage(initialTransport, initialMessage)) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let transport: Transport = initialTransport;
  let message = initialMessage;
  let sizes: FrameSizes = frameSizes(transport, message);
  let stepIndex: number | null = null;

  const present = (): readonly PartId[] => {
    if (stepIndex === null) return PART_IDS;
    return partList(steps[stepIndex]?.dataset.parts);
  };
  const paint = (): void => {
    const visible = present();
    const fresh = stepIndex === null ? [] : partList(steps[stepIndex]?.dataset.fresh);
    strip.replaceChildren(...sizes.parts.map(part => {
      const box = document.createElement('span');
      box.className = 'pp__part'; box.dataset.part = part.id;
      box.hidden = !visible.includes(part.id);
      box.classList.toggle('is-fresh', fresh.includes(part.id));
      const label = document.createElement('strong'); label.textContent = part.label;
      const bytes = document.createElement('b'); bytes.dataset.partBytes = part.id; bytes.textContent = `${part.bytes.toLocaleString('en-US')} B`;
      box.append(label, bytes);
      return box;
    }));
    sizesText.textContent = describeSizes(sizes);
    now.hidden = stepIndex === null;
    now.textContent = stepIndex === null ? '' : describePresent(sizes.parts, visible);
    const osi = stepIndex === null ? null : steps[stepIndex]?.dataset.osi ?? null;
    root.querySelectorAll<HTMLElement>('[data-osi-row]').forEach(row => row.classList.toggle('is-current', row.dataset.osiRow === osi));
  };
  const setTransport = (next: Transport): void => {
    transport = next;
    message = Math.min(message, maxMessage(next));
    sizes = frameSizes(transport, message);
    input.max = String(maxMessage(next)); input.value = String(message);
    input.setCustomValidity(''); input.removeAttribute('aria-invalid');
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.ppTransport === next));
    paint();
  };

  root.addEventListener('dg:step', (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const detail: StepDetail = event.detail;
    stepIndex = detail.index;
    paint();
  }, options);
  for (const button of buttons) button.addEventListener('click', () => { const next = button.dataset.ppTransport; if (isTransport(next)) setTransport(next); }, options);
  input.addEventListener('input', () => {
    const value = input.valueAsNumber;
    if (!isValidMessage(transport, value)) {
      input.setCustomValidity(`Enter a whole number from 1 to ${maxMessage(transport)}.`); input.setAttribute('aria-invalid', 'true');
      sizesText.textContent = `Enter a whole number from 1 to ${maxMessage(transport).toLocaleString('en-US')}. The diagram still shows the last valid size, ${message.toLocaleString('en-US')} bytes.`;
      return;
    }
    input.setCustomValidity(''); input.removeAttribute('aria-invalid');
    message = value; sizes = frameSizes(transport, message); paint();
  }, options);
  reset.addEventListener('click', () => { message = initialMessage; setTransport(initialTransport); }, options);
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
  calc.hidden = false;
  paint();
}

export function mountPacketPaths(scope: ParentNode = document): void {
  for (const root of scope.querySelectorAll<HTMLElement>('[data-packet-path]')) mount(root);
  if (!listening) {
    listening = true;
    document.addEventListener('astro:page-load', () => mountPacketPaths());
  }
}
