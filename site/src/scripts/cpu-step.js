// The lesson's made-up CPU: LDA at 0x02 reads its address operand at 0x03,
// then copies RAM[0x80] into A. Each of the three reads costs one cycle.
const mounted = new WeakSet();
export function mountCpuStepLabs(scope = document) {
	for (const root of scope.querySelectorAll('[data-cpu-step]')) {
		if (mounted.has(root)) continue;
		mounted.add(root);
		const field = root.querySelector('[data-cpu-value]');
		const next = root.querySelector('[data-cpu-next]');
		const reset = root.querySelector('[data-cpu-reset]');
		const chip = root.querySelector('[data-cpu-chip]');
		const status = root.querySelector('[data-cpu-status]');
		const path = root.querySelector('[data-cpu-read-path]');
		const routes = { 0: 'M24 58L16 58L16 112L74 130', 2: 'M170 58L190 58L190 112L74 130', 3: 'M448 58L460 58L460 112L162 112L162 158' };
		function markSource(source) {
			root.querySelectorAll('[data-cpu-source]').forEach(node => node.classList.toggle('is-reading', node.dataset.cpuSource === String(source)));
			path.setAttribute('opacity', source in routes ? '1' : '0');
			if (source in routes) path.setAttribute('d', routes[source]);
		}
		const label = (name, value) => { root.querySelector(`[data-cpu-${name}]`).textContent = String(value); };
		let phase = 0;
		let byte = 10;
		let generation = 0;
		let timer = 0;
		let frame = 0;
		const descriptions = [
			'PC is 0x02. A is 0. Fetch the opcode next.',
			'Fetched 02 from address 0x02. PC advanced to 0x03. One read: 2 + 1 = 3 cycles.',
			'Decoded 02 as LDA. Decoding reads no memory, so the count stays at 3 cycles.',
			'Fetched 80 from address 0x03. PC advanced to 0x04. Another read: 3 + 1 = 4 cycles.',
		];
		function render() {
			label('ram', byte);
			label('pc', phase >= 3 ? '0x04' : phase >= 1 ? '0x03' : '0x02');
			label('a', phase === 4 ? byte : 0);
			label('z', phase === 4 && byte === 0 ? 1 : 0);
			label('cycles', phase >= 3 ? phase + 1 : phase >= 1 ? 3 : 2);
			label('buffer', phase === 0 ? 'read buffer: —' : phase < 3 ? 'read buffer: 02' : phase === 3 ? 'read buffer: 80' : `read buffer: ${byte}`);
			root.querySelectorAll('[data-cpu-action]').forEach(node => {
				const step = Number(node.dataset.cpuAction);
				node.classList.toggle('is-done', step < phase);
				if (step === phase) node.setAttribute('aria-current', 'step'); else node.removeAttribute('aria-current');
			});
			const changed = phase === 1 || phase === 3 ? ['pc', 'cycles'] : phase === 4 ? ['a', 'z', 'cycles'] : [];
			root.querySelectorAll('[data-cpu-register]').forEach(node => node.classList.toggle('is-changed', changed.includes(node.dataset.cpuRegister)));
			markSource(phase === 1 ? 0 : phase === 3 ? 2 : phase === 4 ? 3 : -1);
			label('decode', phase >= 2 ? '02 means LDA; operand 80 names RAM[0x80]' : phase === 1 ? 'opcode fetched: 02' : 'opcode not fetched yet');
			status.textContent = phase === 4 ? `Read RAM[0x80]: A is now ${byte}. Z is ${byte === 0 ? '1 because A is zero' : '0 because A is not zero'}. RAM still holds ${byte}. Three reads cost 3 cycles: 2 + 3 = 5. PC 0x04 selects the next instruction.` : descriptions[phase];
			next.disabled = phase === 4;
		}
		function restart() {
			generation += 1;
			window.clearTimeout(timer);
			window.cancelAnimationFrame(frame);
			chip.style.transition = 'none';
			chip.setAttribute('opacity', '0');
			const candidate = Number(field.value);
			if (!field.value.trim() || !Number.isInteger(candidate) || candidate < 0 || candidate > 255) {
				markSource(-1);
				status.textContent = 'Enter a whole byte from 0 to 255. Eight bits have 256 possible values.';
				next.disabled = true;
				return;
			}
			byte = candidate;
			phase = 0;
			render();
		}
		next.addEventListener('click', () => {
			if (phase >= 4) return;
			if (phase === 1) { phase = 2; render(); return; }
			const target = phase + 1;
			const from = phase === 0 ? [24, 38] : phase === 2 ? [102, 38] : [338, 38];
			const to = target === 4 ? [128, 180] : [40, 128];
			chip.querySelector('text').textContent = phase === 0 ? '02' : phase === 2 ? '80' : String(byte);
			chip.style.transition = 'none';
			chip.style.transform = `translate(${from[0]}px, ${from[1]}px)`;
			chip.setAttribute('opacity', '1');
			markSource(phase);
			status.textContent = `Reading ${chip.querySelector('text').textContent} from ${phase === 0 ? 'program address 0x02' : phase === 2 ? 'program address 0x03' : 'RAM address 0x80'}…`;
			next.disabled = true;
			const current = ++generation;
			const calm = document.documentElement.dataset.academyMotion === 'off' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			const finish = () => { if (current !== generation) return; phase = target; chip.setAttribute('opacity', '0'); render(); };
			if (calm) { finish(); return; }
			frame = window.requestAnimationFrame(() => {
				if (current !== generation) return;
				chip.style.transition = 'transform 550ms ease-in-out';
				chip.style.transform = `translate(${to[0]}px, ${to[1]}px)`;
				timer = window.setTimeout(finish, 550);
			});
		});
		field.addEventListener('input', restart);
		reset.addEventListener('click', restart);
	}
}
