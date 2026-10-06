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

export function noteDocument(note, url) {
	return `# Lesson ${note.lesson} — ${note.title}\n\nSource: ${url}\nLast edited: ${new Date(note.at).toISOString().slice(0, 10)}\n\n${note.text.trim()}\n`;
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
		const { noteId: id, noteLesson: lesson, noteTitle: title } = root.dataset;
		const key = PREFIX + id;
		const area = root.querySelector('[data-note-text]');
		const preview = root.querySelector('[data-note-preview]');
		const status = root.querySelector('[data-note-status]');
		const summary = root.querySelector('[data-note-summary]');
		const details = root.querySelector('details');
		const tabs = Array.from(root.querySelectorAll('[data-note-tab]'));
		const saved = parse(read(key) || 'null');
		area.value = saved && typeof saved.text === 'string' ? saved.text : '';
		if (area.value.trim()) details.open = true;
		let timer = 0;

		const words = () => (area.value.trim() ? area.value.trim().split(/\s+/).length : 0);
		const refresh = () => { summary.textContent = area.value.trim() ? `· ${words()} word${words() === 1 ? '' : 's'}` : ''; };
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
				notes.map(note => `## Lesson ${note.lesson} — ${note.title}\n\nSource: ${base}${note.id}/\n\n${note.text.trim()}\n`).join('\n');
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
	}
}
