// Shared by authored and reader comments. Include it even when a lesson has no
// authored MarginNote, and adopt each content area only once.
const mounted = new WeakSet();

export function mountMarginNotes() {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mountMarginNotes, { once: true });
		return;
	}
	const content = document.querySelector('.sl-markdown-content');
	if (!content || mounted.has(content)) return;
	mounted.add(content);
	const root = document.documentElement;
	const LEFT = ['alternative', 'clarification', 'code note', 'math'];
	const neededSpace = () => 16.5 * parseFloat(getComputedStyle(root).fontSize);
	const isCode = node => !!node && (node.matches('pre, .expressive-code, .kit-speedtype, .kit-github, .code-trace, .code-blanks, [data-code-trace]') || !!node.querySelector('pre, .expressive-code'));
	let notes = [];
	const toggle = note => {
		if (root.dataset.noteMode !== 'pin') return;
		const open = note.dataset.open !== 'true';
		notes.forEach(n => n.removeAttribute('data-open'));
		if (open) note.dataset.open = 'true';
	};
	const adopt = note => {
		if (note.dataset.adopted) return;
		note.dataset.adopted = 'true';
		const label = (note.getAttribute('aria-label') || '').toLowerCase();
		const nearCode = isCode(note.previousElementSibling) || isCode(note.nextElementSibling) || (note.previousElementSibling?.querySelectorAll('code').length ?? 0) >= 2;
		note.dataset.side = nearCode || LEFT.includes(label) ? 'left' : 'right';
		note.dataset.preferredSide = note.dataset.side;
		note.tabIndex = 0;
		const before = note.previousElementSibling;
		if (!note.classList.contains('margin-note--mine') && before && /^(P|UL|OL|BLOCKQUOTE)$/.test(before.tagName)) before.before(note);
		note.addEventListener('click', () => toggle(note));
		note.addEventListener('keydown', event => {
			// Buttons and links keep their own keyboard behavior.
			if (event.target !== note) return;
			if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(note); }
			if (event.key === 'Escape') note.removeAttribute('data-open');
		});
	};
	const settle = () => {
		const bottoms = { left: 0, right: 0 };
		notes.forEach(note => {
			note.style.top = '';
			const natural = note.offsetTop, side = note.dataset.side || 'right';
			const top = Math.max(natural, bottoms[side] + 10);
			if (top !== natural) note.style.top = top + 'px';
			bottoms[side] = top + note.offsetHeight;
		});
	};
	const layout = () => {
		notes = Array.from(content.querySelectorAll('[data-margin-note]'));
		notes.forEach(adopt);
		const right = window.innerWidth - content.getBoundingClientRect().right >= neededSpace();
		const left = content.getBoundingClientRect().left >= neededSpace();
		notes.forEach(n => (n.dataset.side = n.dataset.preferredSide || 'right'));
		notes.forEach(n => n.removeAttribute('data-open'));
		if (window.innerWidth < 640) root.removeAttribute('data-note-mode');
		else if (right && left) root.dataset.noteMode = 'margin';
		else if (right) { notes.forEach(n => (n.dataset.side = 'right')); root.dataset.noteMode = 'margin'; }
		else if (left) { notes.forEach(n => (n.dataset.side = 'left')); root.dataset.noteMode = 'margin'; }
		else root.dataset.noteMode = 'pin';
		if (root.dataset.noteMode) settle();
	};
	layout();
	// Late image sizing still warrants layout, but never gates initialization.
	window.addEventListener('load', layout);
	let pending = 0, resizeTimer = 0;
	const scheduleLayout = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(layout); };
	new ResizeObserver(scheduleLayout).observe(content);
	document.addEventListener('academy:reader-preference', scheduleLayout);
	new MutationObserver(scheduleLayout).observe(root, { attributes: true, attributeFilter: ['data-academy-sidebar', 'data-academy-toc'] });
	window.addEventListener('gha:bubbles', layout);
	window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 150); });
	document.addEventListener('click', event => {
		if (!(event.target instanceof Element) || !event.target.closest('[data-margin-note]')) notes.forEach(n => n.removeAttribute('data-open'));
	});
}
