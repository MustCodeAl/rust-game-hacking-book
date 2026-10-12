// Per-lesson notes in Markdown. Each note is kept in localStorage under
// "gha-note:<lesson id>" as { text, at, title, lesson }; when the reader is
// signed in, account.ts carries the same records to their account (the newer
// edit of a note wins). Export writes plain Markdown that opens in massCode or
// any other notes app.

import { bubbleRecords, deleteBubble, isLiveBubble, newBubbleId, type BubbleComment, type BubbleRecord } from './bubble-records.ts';
import { mountMarginNotes } from './margin-notes.ts';

const PREFIX = 'gha-note:';
const read = (key: string): string | null => { try { return window.localStorage.getItem(key); } catch { return null; } };
const parse = (text: string | null): unknown => { try { return JSON.parse(text ?? 'null'); } catch { return null; } };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A note exactly as the editor saves it under "gha-note:<lesson id>". */
export interface NoteRecord {
	readonly text: string;
	readonly at: number;
	readonly title: string;
	readonly lesson: string;
}
/** A note read back from storage. Only its text is checked: the rest is shown as it was saved. */
export interface StoredNote {
	readonly text: string;
	readonly at?: unknown;
	readonly title?: unknown;
	readonly lesson?: unknown;
}
export type NoteEntry = StoredNote & { readonly id: string };
const isStoredNote = (value: unknown): value is StoredNote => isRecord(value) && typeof value.text === 'string';

/** Where the Notes button sits and whether it is hidden: the reader's choice, kept in this browser. */
interface NotesUi { corner: string; hidden: boolean }

// ------------------------------------------------------------------ markdown
const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(raw: string): string {
	let text = escapeHtml(raw);
	const codes: string[] = [];
	text = text.replace(/`([^`]+)`/g, (_m: string, code: string) => { codes.push(code); return '\u0000' + (codes.length - 1) + '\u0000'; });
	text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m: string, label: string, url: string) => {
		const safe = /^(https?:\/\/|\/|#|\.\.?\/)/.test(url.replace(/&amp;/g, '&')) ? url : null;
		return safe ? `<a href="${safe}" rel="noopener noreferrer">${label}</a>` : label;
	});
	text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, '$1<em>$2</em>');
	text = text.replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
	return text.replace(/\u0000(\d+)\u0000/g, (_m: string, i: string) => `<code>${codes[Number(i)]}</code>`);
}

export function renderMarkdown(source: string): string {
	const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
	const lineAt = (index: number): string => lines[index] ?? '';
	const out: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const line = lineAt(i);
		if (/^```/.test(line)) {
			const code: string[] = [];
			i++;
			while (i < lines.length && !/^```/.test(lineAt(i))) code.push(lineAt(i++));
			i++;
			out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
		} else if (/^\s*$/.test(line)) {
			i++;
		} else if (/^#{1,6}\s/.test(line)) {
			const level = Math.min((line.match(/^#+/)?.[0]?.length ?? 0) + 2, 6);
			out.push(`<h${level}>${inline(line.replace(/^#+\s+/, ''))}</h${level}>`);
			i++;
		} else if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
			out.push('<hr>');
			i++;
		} else if (/^>\s?/.test(line)) {
			const quote: string[] = [];
			while (i < lines.length && /^>\s?/.test(lineAt(i))) quote.push(lineAt(i++).replace(/^>\s?/, ''));
			out.push('<blockquote>' + inline(quote.join(' ')) + '</blockquote>');
		} else if (/^\s*([-*+]|\d+\.)\s/.test(line)) {
			const ordered = /^\s*\d+\./.test(line);
			const items: string[] = [];
			while (i < lines.length && /^\s*([-*+]|\d+\.)\s/.test(lineAt(i))) {
				const body = lineAt(i++).replace(/^\s*([-*+]|\d+\.)\s+/, '');
				const task = /^\[( |x|X)\]\s+(.*)$/.exec(body);
				items.push(task ? `<li>${task[1] === ' ' ? '☐' : '☑'} ${inline(task[2] ?? '')}</li>` : `<li>${inline(body)}</li>`);
			}
			out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
		} else {
			const paragraph: string[] = [];
			while (i < lines.length && !/^\s*$/.test(lineAt(i)) && !/^(```|#{1,6}\s|>\s?|\s*([-*+]|\d+\.)\s)/.test(lineAt(i))) paragraph.push(lineAt(i++));
			out.push('<p>' + inline(paragraph.join(' ')) + '</p>');
		}
	}
	return out.join('\n');
}

// -------------------------------------------------------------------- export
const slug = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const lessonOrder = (note: NoteEntry): number[] => String(note.lesson || '0').split('.').map(Number);

const absolutize = (text: string, url: string): string => text.replace(/\]\(#/g, `](${url}#`);

export function noteDocument(note: NoteRecord, url: string): string {
	return `# Lesson ${note.lesson} — ${note.title}\n\nSource: ${url}\nLast edited: ${new Date(note.at).toISOString().slice(0, 10)}\n\n${absolutize(note.text.trim(), url)}\n`;
}

export function allNotes(): NoteEntry[] {
	const notes: NoteEntry[] = [];
	try {
		for (let i = 0; i < window.localStorage.length; i++) {
			const key = window.localStorage.key(i);
			if (key === null || !key.startsWith(PREFIX)) continue;
			const note = parse(window.localStorage.getItem(key));
			if (isStoredNote(note) && note.text.trim()) notes.push({ ...note, id: key.slice(PREFIX.length) });
		}
	} catch { /* storage may be refused */ }
	return notes.sort((a, b) => {
		const x = lessonOrder(a), y = lessonOrder(b);
		return ((x[0] ?? 0) - (y[0] ?? 0)) || ((x[1] || 0) - (y[1] || 0));
	});
}

function download(filename: string, text: string): void {
	const link = document.createElement('a');
	link.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// ------------------------------------------------------------------- the box
export function mountNotes(): void {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mountNotes, { once: true });
		return;
	}
	mountMarginNotes();
	for (const root of document.querySelectorAll<HTMLElement>('[data-lesson-notes]')) {
		if (root.dataset.noteReady === 'true') continue;
		root.dataset.noteReady = 'true';
		// Fixed-position widgets must live outside the lesson's contained layout, or the sidebars paint over them.
		document.body.append(root);
		const { noteId: id = '', noteLesson: lesson = '', noteTitle: title = '' } = root.dataset;
		const key = PREFIX + id;
		const area = root.querySelector<HTMLTextAreaElement>('[data-note-text]');
		const preview = root.querySelector<HTMLElement>('[data-note-preview]');
		const writePanel = root.querySelector<HTMLElement>('[data-note-write]');
		const status = root.querySelector<HTMLElement>('[data-note-status]');
		const summary = root.querySelector<HTMLElement>('[data-note-summary]');
		const panel = root.querySelector<HTMLElement>('.lesson-notes__panel');
		const fab = root.querySelector<HTMLElement>('[data-note-open]');
		const exportOne = root.querySelector<HTMLElement>('[data-note-export]');
		const exportAll = root.querySelector<HTMLElement>('[data-note-export-all]');
		const clearNote = root.querySelector<HTMLElement>('[data-note-clear]');
		const moveButton = root.querySelector<HTMLElement>('[data-note-move]');
		const hideButton = root.querySelector<HTMLElement>('[data-note-hide]');
		const closeButton = root.querySelector<HTMLElement>('[data-note-close]');
		const addComment = root.querySelector<HTMLElement>('[data-note-bubble]');
		const kindSelect = root.querySelector<HTMLSelectElement>('[data-note-kind]');
		const refButton = root.querySelector<HTMLElement>('[data-note-ref]');
		const quoteButton = root.querySelector<HTMLElement>('[data-note-quote]');
		if (!area || !preview || !writePanel || !status || !summary || !panel || !fab || !exportOne || !exportAll || !clearNote || !moveButton
			|| !hideButton || !closeButton || !addComment || !kindSelect || !refButton || !quoteButton) continue;
		const tabs = Array.from(root.querySelectorAll<HTMLElement>('[data-note-tab]'));
		const saved = parse(read(key));
		area.value = isStoredNote(saved) ? saved.text : '';
		let timer = 0;

		const words = (): number => (area.value.trim() ? area.value.trim().split(/\s+/).length : 0);
		const refresh = (): void => { summary.textContent = area.value.trim() ? `· ${words()}w` : ''; };
		const save = (): void => {
			window.clearTimeout(timer); timer = 0;
			try {
				window.localStorage.setItem(key, JSON.stringify({ text: area.value, at: Date.now(), title, lesson }));
				status.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' in this browser.';
			} catch {
				status.textContent = 'This browser would not save the note. Export it to keep it.';
			}
			refresh();
		};
		area.addEventListener('input', () => { window.clearTimeout(timer); timer = window.setTimeout(save, 400); refresh(); });
		window.addEventListener('pagehide', () => { if (timer) { window.clearTimeout(timer); save(); } });

		const show = (which: string | undefined): void => {
			tabs.forEach(tab => {
				const selected = tab.dataset.noteTab === which;
				tab.setAttribute('aria-selected', String(selected));
				tab.tabIndex = selected ? 0 : -1;
			});
			writePanel.hidden = which === 'preview';
			area.hidden = which === 'preview';
			preview.hidden = which !== 'preview';
			if (which === 'preview') preview.innerHTML = area.value.trim() ? renderMarkdown(area.value) : '<p><em>Nothing written yet.</em></p>';
		};
		tabs.forEach(tab => tab.addEventListener('click', () => show(tab.dataset.noteTab)));
		tabs.forEach((tab, index) => tab.addEventListener('keydown', event => {
			let next: number;
			if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
			else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
			else if (event.key === 'Home') next = 0;
			else if (event.key === 'End') next = tabs.length - 1;
			else return;
			event.preventDefault();
			const target = tabs[next];
			if (!target) return;
			show(target.dataset.noteTab);
			target.focus();
		}));

		exportOne.addEventListener('click', () => {
			if (!area.value.trim()) { status.textContent = 'Write something first, then export it.'; return; }
			const note: NoteRecord = { text: area.value, at: Date.now(), title, lesson };
			download(`lesson-${lesson}-${slug(title)}.md`, noteDocument(note, location.origin + location.pathname));
			status.textContent = 'Exported as a Markdown file.';
		});
		exportAll.addEventListener('click', () => {
			if (timer || area.value.trim()) save();
			const notes = allNotes();
			if (!notes.length) { status.textContent = 'You have no notes to export yet.'; return; }
			const base = location.origin + location.pathname.replace(/pages\/.*$/, '');
			const text = `# Game Hacking Academy — my notes\n\nExported ${new Date().toISOString().slice(0, 10)}\n\n` +
				notes.map(note => `## Lesson ${note.lesson} — ${note.title}\n\nSource: ${base}${note.id}/\n\n${absolutize(note.text.trim(), base + note.id + '/')}\n`).join('\n');
			download('game-hacking-academy-notes.md', text);
			status.textContent = `Exported ${notes.length} note${notes.length === 1 ? '' : 's'}.`;
		});
		clearNote.addEventListener('click', () => {
			if (!area.value.trim() || !window.confirm('Clear this note? This cannot be undone.')) return;
			area.value = '';
			save();
			show('write');
			status.textContent = 'Note cleared.';
		});
		refresh();
		const setOpen = (open: boolean): void => {
			panel.hidden = !open;
			fab.setAttribute('aria-expanded', String(open));
			if (open) (preview.hidden ? area : preview).focus();
		};

		// Where the button sits, and whether it is hidden, are the reader's choice (kept in this browser).
		const UI = 'gha-notes-ui';
		const ui: NotesUi = { corner: 'br', hidden: false };
		const takeUi = (value: unknown): void => {
			if (!isRecord(value)) return;
			if (typeof value.corner === 'string') ui.corner = value.corner;
			if (typeof value.hidden === 'boolean') ui.hidden = value.hidden;
		};
		takeUi(parse(read(UI)));
		const corners = ['br', 'bl', 'tr', 'tl'];
		const applyUi = (): void => {
			root.dataset.corner = corners.includes(ui.corner) ? ui.corner : 'br';
			root.dataset.hidden = String(ui.hidden);
			try { window.localStorage.setItem(UI, JSON.stringify(ui)); } catch { /* optional */ }
			window.dispatchEvent(new CustomEvent('gha:notes-ui', { detail: { ...ui } }));
		};
		applyUi();
		// The Reader theme panel can place or hide the button too (it sends this event; the panel's own Move and Hide stay in sync).
		window.addEventListener('gha:notes-ui-set', event => { takeUi(event instanceof CustomEvent ? event.detail : undefined); applyUi(); if (ui.hidden) setOpen(false); });
		moveButton.addEventListener('click', () => { ui.corner = corners[(corners.indexOf(ui.corner) + 1) % corners.length] ?? 'br'; applyUi(); status.textContent = 'Moved. Press Move again for the next corner.'; });
		hideButton.addEventListener('click', () => { ui.hidden = true; applyUi(); setOpen(false); });
		window.addEventListener('keydown', event => {
			if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey || event.code !== 'KeyN') return;
			event.preventDefault();
			ui.hidden = false;
			applyUi();
			const open = panel.hidden;
			setOpen(open);
			if (!open) fab.focus();
		});

		// Reader-made margin comments: pinned to the section being read, shown beside the text like the authors' notes.
		const BKEY = 'gha-bubbles:' + id;
		const LABELS: Readonly<Record<string, string>> = { mine: 'My note', context: 'Context', clarify: 'Clarification', inquiry: 'Wonder', praise: 'Well spotted', action: 'Try this', code: 'Code note', math: 'Math' };
		const loadBubbles = (): BubbleRecord[] => bubbleRecords(read(BKEY) || '[]');
		const saveBubbles = (list: readonly BubbleRecord[]): void => {
			try { window.localStorage.setItem(BKEY, JSON.stringify(bubbleRecords(list))); } catch { /* optional */ }
			window.dispatchEvent(new Event('gha:bubbles-change'));
		};
		const drawBubbles = (): void => {
			document.querySelectorAll('.margin-note--mine').forEach(n => n.remove());
			const records = loadBubbles().filter(isLiveBubble).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
			for (const b of records) {
				const anchor = (b.heading && document.getElementById(b.heading)) || document.querySelector('.sl-markdown-content > :first-child');
				if (!anchor) continue;
				let spot = anchor.nextElementSibling;
				while (spot && spot.tagName !== 'P') spot = spot.nextElementSibling;
				const aside = document.createElement('aside');
				aside.className = 'margin-note margin-note--mine';
				aside.dataset.marginNote = ''; aside.dataset.bubbleId = b.id; aside.dataset.kind = b.kind; aside.setAttribute('role', 'note');
				aside.setAttribute('aria-label', LABELS[b.kind] || 'My note');
				aside.title = LABELS[b.kind] || 'My note';
				const p = document.createElement('p'); const strong = document.createElement('span'); strong.className = 'margin-note__type';
				strong.textContent = (LABELS[b.kind] || 'My note') + ': ';
				const x = document.createElement('button'); x.type = 'button'; x.className = 'margin-note__x'; x.textContent = '×'; x.setAttribute('aria-label', 'Delete this comment');
				x.addEventListener('click', event => {
					event.stopPropagation();
					saveBubbles(loadBubbles().map(item => item.id === b.id ? deleteBubble(item) : item));
					drawBubbles();
				});
				p.append(strong, document.createTextNode(b.text + ' '), x); aside.append(p);
				(spot || anchor).before(aside);
			}
			window.dispatchEvent(new Event('gha:bubbles'));
		};
		addComment.addEventListener('click', () => {
			const selected = area.value.slice(area.selectionStart ?? 0, area.selectionEnd ?? 0).trim();
			const lines = area.value.split('\n').map(l => l.trim()).filter(Boolean);
			const text = (selected || lines[lines.length - 1] || '').slice(0, 240);
			if (!text) { status.textContent = 'Write something, or select part of the note, then press Add.'; return; }
			const heading = sectionNow();
			const comment: BubbleComment = { id: newBubbleId(), at: Date.now(), heading: heading ? heading.id : '', text, kind: kindSelect.value };
			saveBubbles([...loadBubbles(), comment]);
			drawBubbles();
			status.textContent = 'Added beside ' + (heading ? '“' + (heading.textContent ?? '').trim().slice(0, 40) + '”' : 'the start of the lesson') + '. Delete it with the × on the comment.';
		});
		// The DOM-ready mount above renders saved comments while external requests may still be pending.
		drawBubbles();
		const refreshSyncedNote = (): void => {
			// Do not replace an edit whose debounce has not saved yet.
			if (timer) return;
			const next = parse(read(key));
			area.value = isStoredNote(next) ? next.text : '';
			refresh();
			if (!preview.hidden) show('preview');
		};
		window.addEventListener('gha:progress-sync', () => { drawBubbles(); refreshSyncedNote(); });
		window.addEventListener('storage', event => {
			if (event.key === BKEY || event.key === null) drawBubbles();
			if (event.key === key || event.key === null) refreshSyncedNote();
		});
		fab.addEventListener('click', () => { if (ui.hidden) { ui.hidden = false; applyUi(); return; } setOpen(panel.hidden); });
		closeButton.addEventListener('click', () => { setOpen(false); fab.focus(); });
		panel.addEventListener('keydown', event => { if (event.key === 'Escape') { setOpen(false); fab.focus(); } });

		// A reference to the part being read: a link to its heading, inserted where the cursor is.
		const sectionNow = (): HTMLHeadingElement | null => {
			const line = window.innerHeight * 0.35;
			let found: HTMLHeadingElement | null = null;
			for (const heading of document.querySelectorAll<HTMLHeadingElement>('.sl-markdown-content h2[id], .sl-markdown-content h3[id]')) {
				if (heading.getBoundingClientRect().top > line) break;
				found = heading;
			}
			return found;
		};
		const insert = (text: string): void => {
			show('write');
			const start = area.selectionStart ?? area.value.length, end = area.selectionEnd ?? start;
			area.value = area.value.slice(0, start) + text + area.value.slice(end);
			area.selectionStart = area.selectionEnd = start + text.length;
			area.dispatchEvent(new Event('input', { bubbles: true }));
			area.focus();
		};
		const reference = (): string => {
			const heading = sectionNow();
			const label = heading ? (heading.textContent ?? '').replace(/\s+/g, ' ').trim() : `Lesson ${lesson}: ${title}`;
			return `[${label.replace(/[\[\]]/g, '')}](#${heading ? heading.id : ''})`;
		};
		refButton.addEventListener('click', () => insert(reference() + ' '));
		quoteButton.addEventListener('click', () => {
			const selected = (window.getSelection()?.toString() || '').replace(/\s+/g, ' ').trim().slice(0, 400);
			if (!selected) { status.textContent = 'Select some text in the lesson first, then press this button.'; return; }
			insert(`> ${selected}\n> — ${reference()}\n\n`);
		});
	}
}
