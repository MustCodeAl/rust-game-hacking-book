// Per-lesson notes in Markdown. Each note is kept in localStorage under
// "gha-note:<lesson id>" as { text, at, title, lesson }; when the reader is
// signed in, account.js carries the same records to their account (the newer
// edit of a note wins). Export writes plain Markdown that opens in massCode or
// any other notes app.

const PREFIX = 'gha-note:';
const read = key => { try { return window.localStorage.getItem(key); } catch { return null; } };
const parse = text => { try { return JSON.parse(text); } catch { return null; } };

// ------------------------------------------------------------------ markdown
const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(raw) {
	let text = escapeHtml(raw);
	const codes = [];
	text = text.replace(/`([^`]+)`/g, (_m, code) => { codes.push(code); return '\u0000' + (codes.length - 1) + '\u0000'; });
	text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
		const safe = /^(https?:\/\/|\/|#|\.\.?\/)/.test(url.replace(/&amp;/g, '&')) ? url : null;
		return safe ? `<a href="${safe}" rel="noopener noreferrer">${label}</a>` : label;
	});
	text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, '$1<em>$2</em>');
	text = text.replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
	return text.replace(/\u0000(\d+)\u0000/g, (_m, i) => `<code>${codes[Number(i)]}</code>`);
}

export function renderMarkdown(source) {
	const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
	const out = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (/^```/.test(line)) {
			const code = [];
			i++;
			while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
			i++;
			out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
		} else if (/^\s*$/.test(line)) {
			i++;
		} else if (/^#{1,6}\s/.test(line)) {
			const level = Math.min(line.match(/^#+/)[0].length + 2, 6);
			out.push(`<h${level}>${inline(line.replace(/^#+\s+/, ''))}</h${level}>`);
			i++;
		} else if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
			out.push('<hr>');
			i++;
		} else if (/^>\s?/.test(line)) {
			const quote = [];
			while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
			out.push('<blockquote>' + inline(quote.join(' ')) + '</blockquote>');
		} else if (/^\s*([-*+]|\d+\.)\s/.test(line)) {
			const ordered = /^\s*\d+\./.test(line);
			const items = [];
			while (i < lines.length && /^\s*([-*+]|\d+\.)\s/.test(lines[i])) {
				const body = lines[i++].replace(/^\s*([-*+]|\d+\.)\s+/, '');
				const task = /^\[( |x|X)\]\s+(.*)$/.exec(body);
				items.push(task ? `<li>${task[1] === ' ' ? '☐' : '☑'} ${inline(task[2])}</li>` : `<li>${inline(body)}</li>`);
			}
			out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
		} else {
			const paragraph = [];
			while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(```|#{1,6}\s|>\s?|\s*([-*+]|\d+\.)\s)/.test(lines[i])) paragraph.push(lines[i++]);
			out.push('<p>' + inline(paragraph.join(' ')) + '</p>');
		}
	}
	return out.join('\n');
}

// -------------------------------------------------------------------- export
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const lessonOrder = a => String(a.lesson || '0').split('.').map(Number);

const absolutize = (text, url) => text.replace(/\]\(#/g, `](${url}#`);

export function noteDocument(note, url) {
	return `# Lesson ${note.lesson} — ${note.title}\n\nSource: ${url}\nLast edited: ${new Date(note.at).toISOString().slice(0, 10)}\n\n${absolutize(note.text.trim(), url)}\n`;
}

export function allNotes() {
	const notes = [];
	try {
		for (let i = 0; i < window.localStorage.length; i++) {
			const key = window.localStorage.key(i);
			if (!key.startsWith(PREFIX)) continue;
			const note = parse(window.localStorage.getItem(key));
			if (note && typeof note.text === 'string' && note.text.trim()) notes.push({ ...note, id: key.slice(PREFIX.length) });
		}
	} catch { /* storage may be refused */ }
	return notes.sort((a, b) => {
		const x = lessonOrder(a), y = lessonOrder(b);
		return (x[0] - y[0]) || ((x[1] || 0) - (y[1] || 0));
	});
}

function download(filename, text) {
	const link = document.createElement('a');
	link.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// ------------------------------------------------------------------- the box
export function mountNotes() {
	for (const root of document.querySelectorAll('[data-lesson-notes]')) {
		if (root.dataset.noteReady === 'true') continue;
		root.dataset.noteReady = 'true';
		// Fixed-position widgets must live outside the lesson's contained layout, or the sidebars paint over them.
		document.body.append(root);
		const { noteId: id, noteLesson: lesson, noteTitle: title } = root.dataset;
		const key = PREFIX + id;
		const area = root.querySelector('[data-note-text]');
		const preview = root.querySelector('[data-note-preview]');
		const status = root.querySelector('[data-note-status]');
		const summary = root.querySelector('[data-note-summary]');
		const panel = root.querySelector('.lesson-notes__panel');
		const fab = root.querySelector('[data-note-open]');
		const tabs = Array.from(root.querySelectorAll('[data-note-tab]'));
		const saved = parse(read(key) || 'null');
		area.value = saved && typeof saved.text === 'string' ? saved.text : '';
		let timer = 0;

		const words = () => (area.value.trim() ? area.value.trim().split(/\s+/).length : 0);
		const refresh = () => { summary.textContent = area.value.trim() ? `· ${words()}w` : ''; };
		const save = () => {
			try {
				window.localStorage.setItem(key, JSON.stringify({ text: area.value, at: Date.now(), title, lesson }));
				status.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' in this browser.';
			} catch {
				status.textContent = 'This browser would not save the note. Export it to keep it.';
			}
			refresh();
		};
		area.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(save, 400); refresh(); });
		window.addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); save(); } });

		const show = which => {
			tabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.noteTab === which)));
			area.hidden = which === 'preview';
			preview.hidden = which !== 'preview';
			if (which === 'preview') preview.innerHTML = area.value.trim() ? renderMarkdown(area.value) : '<p><em>Nothing written yet.</em></p>';
		};
		tabs.forEach(tab => tab.addEventListener('click', () => show(tab.dataset.noteTab)));

		root.querySelector('[data-note-export]').addEventListener('click', () => {
			if (!area.value.trim()) { status.textContent = 'Write something first, then export it.'; return; }
			const note = { text: area.value, at: Date.now(), title, lesson };
			download(`lesson-${lesson}-${slug(title)}.md`, noteDocument(note, location.origin + location.pathname));
			status.textContent = 'Exported as a Markdown file.';
		});
		root.querySelector('[data-note-export-all]').addEventListener('click', () => {
			clearTimeout(timer); if (area.value.trim()) save();
			const notes = allNotes();
			if (!notes.length) { status.textContent = 'You have no notes to export yet.'; return; }
			const base = location.origin + location.pathname.replace(/pages\/.*$/, '');
			const text = `# Game Hacking Academy — my notes\n\nExported ${new Date().toISOString().slice(0, 10)}\n\n` +
				notes.map(note => `## Lesson ${note.lesson} — ${note.title}\n\nSource: ${base}${note.id}/\n\n${absolutize(note.text.trim(), base + note.id + '/')}\n`).join('\n');
			download('game-hacking-academy-notes.md', text);
			status.textContent = `Exported ${notes.length} note${notes.length === 1 ? '' : 's'}.`;
		});
		root.querySelector('[data-note-clear]').addEventListener('click', () => {
			if (!area.value.trim() || !window.confirm('Clear this note? This cannot be undone.')) return;
			area.value = '';
			save();
			show('write');
			status.textContent = 'Note cleared.';
		});
		refresh();

		// Where the button sits, and whether it is hidden, are the reader's choice (kept in this browser).
		const UI = 'gha-notes-ui';
		const ui = { corner: 'br', hidden: false, ...(parse(read(UI) || 'null') || {}) };
		const corners = ['br', 'bl', 'tr', 'tl'];
		const applyUi = () => {
			root.dataset.corner = corners.includes(ui.corner) ? ui.corner : 'br';
			root.dataset.hidden = String(ui.hidden);
			try { window.localStorage.setItem(UI, JSON.stringify(ui)); } catch { /* optional */ }
		};
		applyUi();
		root.querySelector('[data-note-move]').addEventListener('click', () => { ui.corner = corners[(corners.indexOf(ui.corner) + 1) % corners.length]; applyUi(); status.textContent = 'Moved. Press Move again for the next corner.'; });
		root.querySelector('[data-note-hide]').addEventListener('click', () => { ui.hidden = true; applyUi(); setOpen(false); });
		window.addEventListener('keydown', event => { if (event.altKey && event.key.toLowerCase() === 'n') { ui.hidden = false; applyUi(); setOpen(panel.hidden); } });

		// Reader-made margin comments: pinned to the section being read, shown beside the text like the authors' notes.
		const BKEY = 'gha-bubbles:' + id;
		const LABELS = { mine: 'My note', context: 'Context', clarify: 'Clarification', inquiry: 'Wonder', praise: 'Well spotted', action: 'Try this', code: 'Code note', math: 'Math' };
		const loadBubbles = () => { const v = parse(read(BKEY) || '[]'); return Array.isArray(v) ? v : []; };
		const saveBubbles = list => { try { window.localStorage.setItem(BKEY, JSON.stringify(list)); } catch { /* optional */ } };
		const drawBubbles = () => {
			document.querySelectorAll('.margin-note--mine').forEach(n => n.remove());
			for (const b of loadBubbles()) {
				const anchor = (b.heading && document.getElementById(b.heading)) || document.querySelector('.sl-markdown-content > :first-child');
				if (!anchor) continue;
				let spot = anchor.nextElementSibling;
				while (spot && spot.tagName !== 'P') spot = spot.nextElementSibling;
				const aside = document.createElement('aside');
				aside.className = 'margin-note margin-note--mine';
				aside.dataset.marginNote = ''; aside.dataset.kind = b.kind; aside.setAttribute('role', 'note');
				aside.setAttribute('aria-label', LABELS[b.kind] || 'My note');
				aside.title = LABELS[b.kind] || 'My note';
				const p = document.createElement('p'); const strong = document.createElement('span'); strong.className = 'margin-note__type';
				strong.textContent = (LABELS[b.kind] || 'My note') + ': ';
				const x = document.createElement('button'); x.type = 'button'; x.className = 'margin-note__x'; x.textContent = '×'; x.setAttribute('aria-label', 'Delete this comment');
				x.addEventListener('click', event => { event.stopPropagation(); saveBubbles(loadBubbles().filter(item => item.at !== b.at)); drawBubbles(); });
				p.append(strong, document.createTextNode(b.text + ' '), x); aside.append(p);
				(spot || anchor).before(aside);
			}
			window.dispatchEvent(new Event('gha:bubbles'));
		};
		root.querySelector('[data-note-bubble]').addEventListener('click', () => {
			const selected = area.value.slice(area.selectionStart ?? 0, area.selectionEnd ?? 0).trim();
			const lines = area.value.split('\n').map(l => l.trim()).filter(Boolean);
			const text = (selected || lines[lines.length - 1] || '').slice(0, 240);
			if (!text) { status.textContent = 'Write something, or select part of the note, then press Add.'; return; }
			const heading = sectionNow();
			saveBubbles([...loadBubbles(), { at: Date.now(), heading: heading ? heading.id : '', text, kind: root.querySelector('[data-note-kind]').value }]);
			drawBubbles();
			status.textContent = 'Added beside ' + (heading ? '“' + heading.textContent.trim().slice(0, 40) + '”' : 'the start of the lesson') + '. Delete it with the × on the comment.';
		});
		window.addEventListener('load', drawBubbles);
		if (document.readyState === 'complete') drawBubbles();

		const setOpen = open => { panel.hidden = !open; fab.setAttribute('aria-expanded', String(open)); if (open) area.focus(); };
		fab.addEventListener('click', () => { if (ui.hidden) { ui.hidden = false; applyUi(); return; } setOpen(panel.hidden); });
		root.querySelector('[data-note-close]').addEventListener('click', () => { setOpen(false); fab.focus(); });
		panel.addEventListener('keydown', event => { if (event.key === 'Escape') { setOpen(false); fab.focus(); } });

		// A reference to the part being read: a link to its heading, inserted where the cursor is.
		const sectionNow = () => {
			const line = window.innerHeight * 0.35;
			let found = null;
			for (const heading of document.querySelectorAll('.sl-markdown-content h2[id], .sl-markdown-content h3[id]')) {
				if (heading.getBoundingClientRect().top > line) break;
				found = heading;
			}
			return found;
		};
		const insert = text => {
			show('write');
			const start = area.selectionStart ?? area.value.length, end = area.selectionEnd ?? start;
			area.value = area.value.slice(0, start) + text + area.value.slice(end);
			area.selectionStart = area.selectionEnd = start + text.length;
			area.dispatchEvent(new Event('input', { bubbles: true }));
			area.focus();
		};
		const reference = () => {
			const heading = sectionNow();
			const label = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : `Lesson ${lesson}: ${title}`;
			return `[${label.replace(/[\[\]]/g, '')}](#${heading ? heading.id : ''})`;
		};
		root.querySelector('[data-note-ref]').addEventListener('click', () => insert(reference() + ' '));
		root.querySelector('[data-note-quote]').addEventListener('click', () => {
			const selected = (window.getSelection()?.toString() || '').replace(/\s+/g, ' ').trim().slice(0, 400);
			if (!selected) { status.textContent = 'Select some text in the lesson first, then press this button.'; return; }
			insert(`> ${selected}\n> — ${reference()}\n\n`);
		});
	}
}
