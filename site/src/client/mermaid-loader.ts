// Render ```mermaid blocks (turned into <pre class="mermaid"> at build time).
//
// The published site arrives with its diagrams already drawn:
// scripts/prerender-diagrams.mjs runs this file in a browser after each build
// and writes the SVGs into the pages. This script draws only what that step
// could not, such as every diagram under `astro dev`.
//
// Mermaid is large, so it is fetched only when the first diagram is about to
// scroll into view, and each diagram is drawn as it approaches instead of all
// of them at once when the page opens. The version is pinned so a diagram that
// renders today renders the same tomorrow.
//
// astro.config.mjs loads this file with type="module", so it has module scope in
// the browser. It uses no import or export statement (Mermaid arrives through a
// dynamic import) and no top-level await. The function wrapper below keeps its
// names private for the TypeScript program that checks every client script
// together, exactly as module scope keeps them private in the browser.
(() => {
	interface MermaidConfig {
		startOnLoad: boolean;
		theme: string;
		securityLevel: string;
		flowchart: { htmlLabels: boolean; useMaxWidth: boolean };
	}
	interface MermaidRendered {
		svg: string;
		bindFunctions?: (element: Element) => void;
	}
	interface Mermaid {
		initialize(config: MermaidConfig): void;
		render(id: string, text: string, container?: Element): Promise<MermaidRendered>;
	}
	// The page-wide hook that printing uses to draw every diagram.
	type DiagramWindow = Window & { academyRenderAllDiagrams?: () => Promise<unknown> };

	const MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.3/dist/mermaid.esm.min.mjs';

	let mermaidReady: Promise<Mermaid> | null = null;
	let queue: Promise<void> = Promise.resolve();
	const pending = new Set<HTMLElement>();

	function isMermaid(value: unknown): value is Mermaid {
		return typeof value === 'object' && value !== null
			&& 'initialize' in value && typeof value.initialize === 'function'
			&& 'render' in value && typeof value.render === 'function';
	}

	function loadMermaid(): Promise<Mermaid> {
		if (!mermaidReady) {
			mermaidReady = (async () => {
				// Mermaid measures label text while laying out nodes; wait for the
				// book's fonts so a late font swap cannot make labels overflow.
				if (document.fonts?.ready) await document.fonts.ready;
				const loaded: unknown = await import(MERMAID_URL);
				const mermaid = typeof loaded === 'object' && loaded !== null && 'default' in loaded ? loaded.default : undefined;
				if (!isMermaid(mermaid)) throw new Error('The Mermaid module did not load as expected.');
				mermaid.initialize({
					startOnLoad: false,
					theme: 'default',
					securityLevel: 'strict',
					flowchart: { htmlLabels: true, useMaxWidth: true },
				});
				return mermaid;
			})();
		}
		return mermaidReady;
	}

	// Rebuild the viewBox from the drawing's real bounds, so labels and arrowheads
	// stay inside the canvas, and let the SVG scale to the column.
	function fitViewBox(svg: SVGSVGElement | null): void {
		if (!svg) return;
		let box: DOMRect | undefined;
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
	}

	// Mermaid's HTML labels need one padded backing, rather than a separate
	// background on every span/line. SVG backings also survive printing and keep
	// their geometry when the reader changes the diagram palette.
	function prepareDiagram(svg: SVGSVGElement | null): void {
		if (!svg) return;
		for (const label of svg.querySelectorAll<SVGForeignObjectElement>('.edgeLabel foreignObject')) {
			const width = Number(label.getAttribute('width'));
			const height = Number(label.getAttribute('height'));
			if (!(width > 0 && height > 0) || !(label.textContent ?? '').trim()) continue;
			const parent = label.parentElement;
			if (!parent) continue;
			if (parent.querySelector('.academy-edge-label-box')) continue;
			const backing = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			backing.classList.add('academy-edge-label-box');
			backing.setAttribute('x', String((Number(label.getAttribute('x')) || 0) - 5));
			backing.setAttribute('y', String((Number(label.getAttribute('y')) || 0) - 3));
			backing.setAttribute('width', String(width + 10));
			backing.setAttribute('height', String(height + 6));
			backing.setAttribute('rx', '4');
			backing.setAttribute('aria-hidden', 'true');
			parent.insertBefore(backing, label);
		}
		// Stable source node names let an authored walkthrough follow a specific
		// route through the original graph, including its branches and grouped steps.
		for (const node of svg.querySelectorAll<SVGElement>('.node[id]')) {
			const key = node.id.match(/^flowchart-(.+)-\d+$/)?.[1];
			if (key) node.dataset.diagramNodeKey = key;
		}
		for (const edge of svg.querySelectorAll<SVGElement>('.flowchart-link')) {
			const classes = Array.from(edge.classList);
			const from = classes.find((name) => name.startsWith('LS-'));
			const to = classes.find((name) => name.startsWith('LE-'));
			if (from && to) {
				edge.dataset.diagramFrom = from.slice(3);
				edge.dataset.diagramTo = to.slice(3);
			}
		}
	}

	// Name the SVG after the diagram's text (the build's `data-diagram` hash), so a
	// drawing made here and one made while building are the same markup. Ids must
	// stay unique on a page: Mermaid finds its scratch element by id, and each
	// SVG's styles and arrowheads refer to it. So a diagram that appears twice on
	// one page gets a numbered id the second time.
	function diagramId(block: HTMLElement): string {
		const base = `mermaid-${block.dataset.diagram || 'diagram'}`;
		let id = base;
		for (let copy = 2; document.getElementById(id); copy++) id = `${base}-${copy}`;
		return id;
	}

	async function renderBlock(block: HTMLElement): Promise<void> {
		if (block.dataset.processed) return;
		const mermaid = await loadMermaid();
		const id = diagramId(block);
		try {
			// Drawing inside the block itself, as mermaid.run does, lets Mermaid
			// measure labels in the book's font; measured anywhere else, the boxes
			// are sized for Mermaid's default font and the real labels overflow them.
			const { svg, bindFunctions } = await mermaid.render(id, block.textContent ?? '', block);
			// The SVG comes from Mermaid's strict mode, which sanitizes labels, and
			// its source is the lesson's own diagram text; this is what mermaid.run
			// itself does with the result.
			block.innerHTML = svg;
			bindFunctions?.(block);
			block.dataset.processed = 'true';
			await new Promise<number>((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
			prepareDiagram(block.querySelector('svg'));
			fitViewBox(block.querySelector('svg'));
			block.dispatchEvent(new CustomEvent('academy:diagram-ready', { bubbles: true }));
		} catch (error) {
			block.dataset.processed = 'error';
			console.error('Could not render a Mermaid diagram', error);
		}
	}

	// Mermaid is not safe to run twice at once, so diagrams render one after
	// another in the order they were requested.
	function enqueue(block: HTMLElement): Promise<void> {
		if (pending.has(block) || block.dataset.processed) return queue;
		pending.add(block);
		queue = queue.then(() => renderBlock(block)).finally(() => pending.delete(block));
		return queue;
	}

	function unrendered(): HTMLElement[] {
		return [...document.querySelectorAll<HTMLElement>('pre.mermaid:not([data-processed])')];
	}

	// Printing needs every diagram, not only the ones already scrolled past.
	const host: DiagramWindow = window;
	host.academyRenderAllDiagrams = () => Promise.all(unrendered().map(enqueue));

	function start(): void {
		for (const svg of document.querySelectorAll<SVGSVGElement>('pre.mermaid[data-processed="true"] svg')) prepareDiagram(svg);
		const blocks = unrendered();
		if (!blocks.length) return;
		// The whole-book print page is read on paper, so it draws everything.
		if (document.querySelector('.print-book-lesson') || !('IntersectionObserver' in window)) {
			blocks.forEach(enqueue);
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					observer.unobserve(entry.target);
					if (entry.target instanceof HTMLElement) enqueue(entry.target);
				}
			},
			{ rootMargin: '1200px 0px' },
		);
		blocks.forEach((block) => observer.observe(block));
	}

	start();
})();
