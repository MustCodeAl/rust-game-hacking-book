// Interactive side of PagingSegmentation.astro: bounded inputs recompute both translators with the pure model.
import { MAX_LOGICAL, MAX_OFFSET, pagingOutcome, pagingSteps, segmentOutcome, segmentSteps, splitBits, translatePage, translateSegment } from '../lib/address-translation';
import { parseHexNumber, toHex } from '../lib/hex-field';

const mounted = new WeakSet<HTMLElement>();

function setSteps(list: HTMLElement, steps: readonly string[]): void {
  list.replaceChildren(...steps.map(step => { const li = document.createElement('li'); li.textContent = step.replace(/^\d\. /, ''); return li; }));
}

function markRow(body: HTMLElement | null, attr: 'psRow' | 'psSegRow', index: number): void {
  body?.querySelectorAll<HTMLElement>('tr').forEach(row => { if (Number(row.dataset[attr]) === index) row.setAttribute('aria-current', 'true'); else row.removeAttribute('aria-current'); });
}

function mount(root: HTMLElement): void {
  if (mounted.has(root)) return;
  const q = <T extends HTMLElement>(selector: string): T | null => root.querySelector<T>(selector);
  const pageForm = q<HTMLFormElement>('[data-ps-form="paging"]');
  const segForm = q<HTMLFormElement>('[data-ps-form="segmentation"]');
  const addressInput = q<HTMLInputElement>('[data-ps-address]');
  const segmentSelect = q<HTMLSelectElement>('[data-ps-segment]');
  const offsetInput = q<HTMLInputElement>('[data-ps-offset-input]');
  const pageError = q<HTMLElement>('[data-ps-error="paging"]');
  const segError = q<HTMLElement>('[data-ps-error="segmentation"]');
  const pageNumber = q<HTMLElement>('[data-ps-page-number]');
  const pageOffset = q<HTMLElement>('[data-ps-offset]');
  const addressText = q<HTMLElement>('[data-ps-address-text]');
  const bitsText = q<HTMLElement>('[data-ps-bits]');
  const pageSteps = q<HTMLElement>('[data-ps-steps="paging"]');
  const pageResult = q<HTMLElement>('[data-ps-result="paging"]');
  const segNumber = q<HTMLElement>('[data-ps-seg-number]');
  const segOffset = q<HTMLElement>('[data-ps-seg-offset]');
  const segSteps = q<HTMLElement>('[data-ps-steps="segmentation"]');
  const segResult = q<HTMLElement>('[data-ps-result="segmentation"]');
  const pageBody = q<HTMLElement>('[data-ps-pagetable] tbody');
  const segBody = q<HTMLElement>('[data-ps-segtable] tbody');
  if (!pageForm || !segForm || !addressInput || !segmentSelect || !offsetInput || !pageError || !segError || !pageNumber || !pageOffset || !addressText || !bitsText
    || !pageSteps || !pageResult || !segNumber || !segOffset || !segSteps || !segResult || !pageBody || !segBody) return;
  mounted.add(root);
  const abort = new AbortController();
  const options = { signal: abort.signal };

  const renderPaging = (address: number): void => {
    const result = translatePage(address);
    const bits = splitBits(address);
    pageNumber.textContent = String(result.page);
    pageOffset.textContent = `0x${toHex(result.offset, 3)}`;
    addressText.textContent = toHex(address, 4);
    bitsText.textContent = `${bits.page} ${bits.offset}`;
    setSteps(pageSteps, pagingSteps(result));
    pageResult.textContent = pagingOutcome(result);
    pageResult.dataset.outcome = result.kind === 'mapped' ? 'ok' : 'fault';
    markRow(pageBody, 'psRow', result.page);
  };
  const renderSegment = (segment: number, offset: number): void => {
    const result = translateSegment(segment, offset);
    segNumber.textContent = `S${segment}`;
    segOffset.textContent = `0x${toHex(offset, 4)}`;
    setSteps(segSteps, segmentSteps(result));
    segResult.textContent = segmentOutcome(result);
    segResult.dataset.outcome = result.kind === 'ok' ? 'ok' : 'fault';
    markRow(segBody, 'psSegRow', segment);
  };

  const readPaging = (): void => {
    const value = parseHexNumber(addressInput.value, 4);
    if (value === null) { pageError.textContent = addressInput.value.trim() === '' ? 'Type 1 to 4 hex digits, such as 4234.' : 'Use 1 to 4 hex digits (0 to 9, A to F).'; addressInput.setAttribute('aria-invalid', 'true'); return; }
    if (value > MAX_LOGICAL) { pageError.textContent = `This example has 8 pages of 4 KiB, so logical addresses are 0000 to ${toHex(MAX_LOGICAL, 4)}.`; addressInput.setAttribute('aria-invalid', 'true'); return; }
    pageError.textContent = ''; addressInput.removeAttribute('aria-invalid');
    renderPaging(value);
  };
  const readSegment = (): void => {
    const segment = Number(segmentSelect.value);
    const value = parseHexNumber(offsetInput.value, 4);
    if (value === null || value > MAX_OFFSET || !Number.isInteger(segment)) { segError.textContent = offsetInput.value.trim() === '' ? 'Type 1 to 4 hex digits, such as 0234.' : 'Use 1 to 4 hex digits (0 to 9, A to F).'; offsetInput.setAttribute('aria-invalid', 'true'); return; }
    segError.textContent = ''; offsetInput.removeAttribute('aria-invalid');
    renderSegment(segment, value);
  };

  addressInput.addEventListener('input', readPaging, options);
  offsetInput.addEventListener('input', readSegment, options);
  segmentSelect.addEventListener('change', readSegment, options);
  pageForm.addEventListener('submit', (event: SubmitEvent) => event.preventDefault(), options);
  segForm.addEventListener('submit', (event: SubmitEvent) => event.preventDefault(), options);
  root.addEventListener('click', (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const pagePreset = event.target.closest<HTMLButtonElement>('[data-ps-page-preset]');
    if (pagePreset && root.contains(pagePreset)) { addressInput.value = toHex(Number(pagePreset.dataset.psPagePreset), 4); readPaging(); return; }
    const segPreset = event.target.closest<HTMLButtonElement>('[data-ps-seg-preset]');
    if (segPreset && root.contains(segPreset)) {
      const [segment, offset] = (segPreset.dataset.psSegPreset ?? '0:0').split(':').map(Number);
      segmentSelect.value = String(segment ?? 0); offsetInput.value = toHex(offset ?? 0, 4); readSegment();
    }
  }, options);
  document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { once: true });
  pageForm.hidden = false; segForm.hidden = false;
}

export function mountPagingSegmentation(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-ps]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountPagingSegmentation());
