// "Continue where you left off". Lesson pages remember the lesson and the
// section being read (localStorage "gha-last"); the home page turns that into a
// button that opens the same section. The section is a heading id, so it still
// works if the page is edited. Nothing is sent anywhere.

import { currentLessonNumber } from '../lib/lesson-identity';

const KEY = 'gha-last';
const read = () => { try { return JSON.parse(window.localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const sectionNow = () => {
	const line = window.innerHeight * 0.35;
	let found = null;
	for (const heading of document.querySelectorAll('.sl-markdown-content h2[id], .sl-markdown-content h3[id]')) {
		if (heading.getBoundingClientRect().top > line) break;
		found = heading;
	}
	return found;
};

function record(root) {
	const { resumeId: id, resumeLesson: lesson, resumeTitle: title } = root.dataset;
	const save = () => {
		const heading = sectionNow();
		try {
			window.localStorage.setItem(KEY, JSON.stringify({
				id, lesson, title, at: Date.now(),
				heading: heading ? heading.id : '',
				headingText: heading ? heading.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : '',
			}));
		} catch { /* storage may be refused */ }
	};
	let timer = 0;
	save();
	window.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(save, 400); }, { passive: true });
	window.addEventListener('pagehide', save);
}

function show(link) {
	const last = read();
	if (!last || !/^pages\/\d+\/\d+$/.test(last.id || '')) return;
	const base = link.dataset.resumeBase || '';
	link.href = `${base}/${last.id}/${last.heading ? '#' + encodeURIComponent(last.heading) : ''}`;
	// Keep the saved route, heading and timestamp. Only the displayed number refreshes.
	link.querySelector('[data-resume-label]').textContent = `Continue Lesson ${currentLessonNumber(last.id) ?? last.lesson}`;
	const detail = link.querySelector('[data-resume-detail]');
	detail.textContent = last.headingText && last.headingText !== last.title ? `${last.title} · ${last.headingText}` : last.title;
	link.hidden = false;
	link.addEventListener('click', () => { try { window.sessionStorage.setItem('gha-resume-jump', link.getAttribute('href')); } catch { /* optional */ } });
	document.querySelector('[data-resume-start]')?.classList.replace('button--primary', 'button--ghost');
}

// Long lessons lay out their later sections lazily, so the browser's own jump to
// a heading can land short. After a Continue click, line the heading up again
// once the page has settled.
function realign() {
	let wanted = null;
	try { wanted = window.sessionStorage.getItem('gha-resume-jump'); window.sessionStorage.removeItem('gha-resume-jump'); } catch { return; }
	if (!wanted || !location.hash || !wanted.endsWith(location.hash)) return;
	const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
	if (!target) return;
	const fix = () => { const top = target.getBoundingClientRect().top; if (top < 0 || top > window.innerHeight * 0.5) target.scrollIntoView(); };
	window.addEventListener('load', () => { setTimeout(fix, 250); setTimeout(fix, 900); }, { once: true });
	if (document.readyState === 'complete') { setTimeout(fix, 250); setTimeout(fix, 900); }
}

export function mountResume() {
	realign();
	for (const root of document.querySelectorAll('[data-resume-record]')) record(root);
	for (const link of document.querySelectorAll('[data-resume-link]')) show(link);
}
