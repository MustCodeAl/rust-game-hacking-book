// Render ```mermaid blocks (turned into <pre class="mermaid"> at build time).
// Mermaid is loaded only on pages that contain a diagram, and pinned to one
// version so a diagram that renders today renders the same tomorrow.
const MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.3/dist/mermaid.esm.min.mjs';

async function renderDiagrams() {
	const blocks = document.querySelectorAll('pre.mermaid:not([data-processed])');
	if (!blocks.length) return;

	// Mermaid measures label text while laying out nodes; wait for the book's
	// fonts so a late font swap cannot make labels wider than their boxes.
	if (document.fonts?.ready) await document.fonts.ready;

	const { default: mermaid } = await import(MERMAID_URL);
	mermaid.initialize({
		startOnLoad: false,
		theme: 'default',
		securityLevel: 'strict',
		// Without this, Mermaid names each diagram after Date.now(), so two
		// diagrams rendered in the same millisecond share an id and the second
		// is drawn into the first. A counter keeps every id on the page unique.
		deterministicIds: true,
		flowchart: { htmlLabels: true, useMaxWidth: true },
	});
	await mermaid.run({ nodes: blocks });

	// Let Mermaid finish styling labels, then rebuild each viewBox from the
	// whole SVG's bounds so labels and arrowheads stay inside the canvas.
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	document.querySelectorAll('pre.mermaid[data-processed="true"] svg').forEach((svg) => {
		let box;
		try {
			box = svg.getBBox();
		} catch {
			box = svg.viewBox?.baseVal;
		}
		if (!box || box.width <= 0 || box.height <= 0) return;
		const padX = Math.max(18, box.width * 0.025);
		const padY = Math.max(14, box.height * 0.035);
		svg.setAttribute('viewBox', [box.x - padX, box.y - padY, box.width + padX * 2, box.height + padY * 2].join(' '));
		svg.style.setProperty('--mermaid-natural-width', `${Math.ceil(box.width + padX * 2)}px`);
		svg.setAttribute('width', '100%');
		svg.removeAttribute('height');
		svg.style.removeProperty('max-width');
		svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
	});
}

renderDiagrams().catch((error) => console.error('Could not render Mermaid diagrams', error));
