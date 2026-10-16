// Interactive side of PredictReveal.astro. The server markup is complete without scripts (answer written out, slot open);
// with scripts the options appear, the answer and the slot wait until a pick, and a wrong pick explains itself and allows another try.

const mounted = new WeakSet<HTMLElement>();

function mount(root: HTMLElement): void {
	if (mounted.has(root)) return;
	const options = root.querySelector<HTMLElement>('.predict__options');
	const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-predict-opt]'));
	const feedback = root.querySelector<HTMLElement>('[data-predict-feedback]');
	const answer = root.querySelector<HTMLElement>('[data-predict-static]');
	const after = root.querySelector<HTMLElement>('[data-predict-after]');
	if (!options || !feedback || !answer || !after || buttons.length < 2) return;
	mounted.add(root);
	root.dataset.predictState = 'asking';
	options.hidden = false;
	answer.hidden = true;
	after.hidden = true;
	let tries = 0;

	const pick = (button: HTMLButtonElement): void => {
		if (root.dataset.predictState === 'answered') return;
		tries++;
		const right = button.dataset.correct === 'true';
		const why = button.dataset.why ?? '';
		button.dataset.picked = right ? 'right' : 'wrong';
		if (right) {
			root.dataset.predictState = 'answered';
			for (const other of buttons) other.disabled = other !== button;
			feedback.textContent = `${tries === 1 ? 'Correct on the first try. ' : 'Correct. '}${why}`;
			feedback.dataset.result = 'right';
			after.hidden = false;
		} else {
			button.disabled = true;
			feedback.textContent = `Not quite. ${why} Try another answer.`;
			feedback.dataset.result = 'wrong';
		}
	};
	for (const button of buttons) button.addEventListener('click', () => pick(button));
}

export function mountPredictReveals(scope: ParentNode = document): void {
	scope.querySelectorAll<HTMLElement>('[data-predict]').forEach(mount);
}
document.addEventListener('astro:page-load', () => mountPredictReveals());
