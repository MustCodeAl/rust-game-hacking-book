interface Sample { clock: boolean; input: boolean; stored: boolean; rising: boolean }
const mounted = new WeakSet<HTMLElement>();
export function mountLogicWaveforms(): void {
  document.querySelectorAll<HTMLElement>('[data-logic-waveform]').forEach((root) => {
    if (mounted.has(root)) return;
    const controls = root.querySelector<HTMLElement>('[data-wave-controls]');
    const input = root.querySelector<HTMLInputElement>('[data-wave-input]');
    const step = root.querySelector<HTMLButtonElement>('[data-wave-step]');
    const reset = root.querySelector<HTMLButtonElement>('[data-wave-reset]');
    const values = root.querySelector<HTMLOutputElement>('[data-wave-values]');
    const status = root.querySelector<HTMLElement>('[data-wave-status]');
    const clockPath = root.querySelector<SVGPathElement>('[data-wave-clock]');
    const inputPath = root.querySelector<SVGPathElement>('[data-wave-data]');
    const storedPath = root.querySelector<SVGPathElement>('[data-wave-stored]');
    const edges = root.querySelector<SVGPathElement>('[data-wave-edges]');
    const svg = root.querySelector('svg');
    if (!controls || !input || !step || !reset || !values || !status || !clockPath || !inputPath || !storedPath || !edges || !svg) return;
    mounted.add(root);
    const abort = new AbortController();
    const options = { signal: abort.signal };
    let clock = false, stored = false, count = 0;
    let samples: Sample[] = [{ clock, input: false, stored, rising: false }];
    const path = (field: 'clock' | 'input' | 'stored', low: number): string => {
      const first = samples[0];
      if (!first) return '';
      let drawing = `M94 ${first[field] ? low - 24 : low}`;
      samples.forEach((sample, index) => { if (index > 0) drawing += `H${94 + index * 46}V${sample[field] ? low - 24 : low}`; });
      return `${drawing}H462`;
    };
    const render = (): void => {
      clockPath.setAttribute('d', path('clock', 44));
      inputPath.setAttribute('d', path('input', 104));
      storedPath.setAttribute('d', path('stored', 164));
      edges.setAttribute('d', samples.map((sample, index) => sample.rising ? `M${94 + index * 46} 10V174` : '').join(''));
      values.value = `Clock ${Number(clock)} · data ${Number(input.checked)} · stored ${Number(stored)}`;
      svg.setAttribute('aria-label', `Recent clock history. Current clock ${Number(clock)}, input ${Number(input.checked)}, stored ${Number(stored)}. ${count} clock steps.`);
      root.dataset.waveStored = String(Number(stored)); root.dataset.waveClock = String(Number(clock));
    };
    input.addEventListener('change', () => {
      status.textContent = `Data is now ${Number(input.checked)}. Stored value stays ${Number(stored)} until a rising clock edge.`;
      const current = samples.at(-1); if (current) current.input = input.checked;
      render();
    }, options);
    step.addEventListener('click', () => {
      const before = stored;
      clock = !clock; count += 1;
      if (clock) stored = input.checked;
      samples.push({ clock, input: input.checked, stored, rising: clock });
      samples = samples.slice(-8);
      status.textContent = clock ? `Rising edge ${count}: stored ${Number(before)} → ${Number(stored)}. Captured data ${Number(input.checked)}.` : `Falling edge ${count}: stored ${Number(stored)} → ${Number(stored)}. This edge keeps the stored value.`;
      render();
    }, options);
    reset.addEventListener('click', () => {
      clock = stored = input.checked = false; count = 0;
      samples = [{ clock, input: false, stored, rising: false }];
      status.textContent = 'Reset: clock, data and stored value are 0. Choose data, then step the clock.';
      render();
    }, options);
    controls.hidden = false;
    status.textContent = 'Clock, data and stored value are 0. Choose data, then step the clock.';
    render();
    document.addEventListener('astro:before-swap', () => { abort.abort(); mounted.delete(root); }, { ...options, once: true });
  });
}
document.addEventListener('astro:page-load', mountLogicWaveforms);
