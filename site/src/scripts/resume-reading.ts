// "Continue where you left off". Lesson pages remember the lesson and the
// section being read (localStorage "gha-last"); the home page turns that into a
// button that opens the same section. The section is a heading id, so it still
// works if the page is edited. Nothing is sent anywhere.

import { currentLessonNumber } from '../lib/lesson-identity';

const KEY = 'gha-last';

/** The reading position as it is saved under "gha-last". */
interface LastRead {
	readonly id: string;
	readonly lesson: string;
	readonly title: string;
	readonly at: number;
	readonly heading: string;
	readonly headingText: string;
}
/** Every field read back from storage as text; a field that is not text reads as empty. */
type StoredLast = Omit<LastRead, 'at'>;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const read = (): StoredLast | null => {
	try {
		const value: unknown = JSON.parse(window.localStorage.getItem(KEY) || 'null');
		if (!isRecord(value)) return null;
		return { id: text(value.id), lesson: text(value.lesson), title: text(value.title), heading: text(value.heading), headingText: text(value.headingText) };
	} catch { return null; }
};
const sectionNow = (): HTMLHeadingElement | null => {
	const line = window.innerHeight * 0.35;
	let found: HTMLHeadingElement | null = null;
	for (const heading of document.querySelectorAll<HTMLHeadingElement>('.sl-markdown-content h2[id], .sl-markdown-content h3[id]')) {
		if (heading.getBoundingClientRect().top > line) break;
		found = heading;
	}
	return found;
};

function record(root: HTMLElement): void {
	const { resumeId: id = '', resumeLesson: lesson = '', resumeTitle: title = '' } = root.dataset;
	const save = (): void => {
		const heading = sectionNow();
		const last: LastRead = {
			id, lesson, title, at: Date.now(),
			heading: heading ? heading.id : '',
			headingText: heading ? (heading.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) : '',
		};
		try {
			window.localStorage.setItem(KEY, JSON.stringify(last));
		} catch { /* storage may be refused */ }
	};
	let timer = 0;
	save();
	window.addEventListener('scroll', () => { window.clearTimeout(timer); timer = window.setTimeout(save, 400); }, { passive: true });
	window.addEventListener('pagehide', save);
}

function show(link: HTMLAnchorElement): void {
	const last = read();
	if (!last || !/^pages\/\d+\/\d+$/.test(last.id)) return;
	const label = link.querySelector('[data-resume-label]');
	const detail = link.querySelector('[data-resume-detail]');
	if (!label || !detail) return;
	const base = link.dataset.resumeBase || '';
	link.href = `${base}/${last.id}/${last.heading ? '#' + encodeURIComponent(last.heading) : ''}`;
	// Keep the saved route, heading and timestamp. Only the displayed number refreshes.
	label.textContent = `Continue Lesson ${currentLessonNumber(last.id) ?? last.lesson}`;
	detail.textContent = last.headingText && last.headingText !== last.title ? `${last.title} · ${last.headingText}` : last.title;
	link.hidden = false;
	link.addEventListener('click', () => { try { window.sessionStorage.setItem('gha-resume-jump', link.getAttribute('href') ?? ''); } catch { /* optional */ } });
	document.querySelector('[data-resume-start]')?.classList.replace('button--primary', 'button--ghost');
}

// Long lessons lay out their later sections lazily, so the browser's own jump to
// a heading can land short. After a Continue click, line the heading up again
// once the page has settled.
function realign(): void {
	let wanted: string | null = null;
	try { wanted = window.sessionStorage.getItem('gha-resume-jump'); window.sessionStorage.removeItem('gha-resume-jump'); } catch { return; }
	if (!wanted || !location.hash || !wanted.endsWith(location.hash)) return;
	const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
	if (!target) return;
	const fix = (): void => { const top = target.getBoundingClientRect().top; if (top < 0 || top > window.innerHeight * 0.5) target.scrollIntoView(); };
	window.addEventListener('load', () => { setTimeout(fix, 250); setTimeout(fix, 900); }, { once: true });
	if (document.readyState === 'complete') { setTimeout(fix, 250); setTimeout(fix, 900); }
}

export function mountResume(): void {
	realign();
	for (const root of document.querySelectorAll<HTMLElement>('[data-resume-record]')) record(root);
	for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-resume-link]')) show(link);
}
