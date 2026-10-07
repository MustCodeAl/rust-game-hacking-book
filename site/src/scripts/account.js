// Optional account sign-in (Google, Discord, GitHub) through Supabase, used
// only to keep a reader's progress across devices. No library is loaded: this
// file speaks to Supabase's auth and REST endpoints with fetch. Progress stays
// in this browser whether or not anyone signs in; signing in merges it with the
// copy in the reader's account (finished lessons are unioned, best typing
// results and finished quiz attempts win), so nothing is overwritten.
//
// The same row includes notes, reader comments, and the latest reading position.
// Supabase holds the sign-in itself; this progress row does not contain a name
// or e-mail address. Comment tombstones preserve deletions across devices.

import { bubbleRecords, mergeBubbleRecords } from './bubble-records.js';

const SESSION_KEY = 'gha-account-session';
const DONE = 'gha-done';
const TYPING = 'gha-speedtype-';
const QUIZ = 'gha-quiz:v7:';
const NOTE = 'gha-note:';
const BUBBLES = 'gha-bubbles:';
const LAST = 'gha-last';
const PROVIDERS = { google: 'Google', discord: 'Discord', github: 'GitHub' };

const el = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
};
const read = key => { try { return window.localStorage.getItem(key); } catch { return null; } };
const parse = text => { try { return JSON.parse(text); } catch { return null; } };

// ---------------------------------------------------------------- progress
export function snapshot(storage = window.localStorage) {
	const data = { done: [], typing: {}, quiz: {}, notes: {}, bubbles: {}, last: storage.getItem(LAST) };
	const done = parse(storage.getItem(DONE) || '[]');
	if (Array.isArray(done)) data.done = done.filter(id => typeof id === 'string').sort();
	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if (typeof key !== 'string') continue;
		if (key.startsWith(TYPING)) data.typing[key.slice(TYPING.length)] = storage.getItem(key);
		else if (key.startsWith(QUIZ)) data.quiz[key.slice(QUIZ.length)] = storage.getItem(key);
		else if (key.startsWith(NOTE)) data.notes[key.slice(NOTE.length)] = storage.getItem(key);
		else if (key.startsWith(BUBBLES)) data.bubbles[key.slice(BUBBLES.length)] = JSON.stringify(bubbleRecords(storage.getItem(key)));
	}
	return data;
}

const bestWpm = text => { const value = parse(text); return value && Number.isFinite(value.wpm) ? value.wpm : -1; };
const editedAt = text => { const value = parse(text); return value && Number.isFinite(value.at) ? value.at : 0; };
const isComplete = text => { const value = parse(text); return Boolean(value && value.complete === true); };

// Lessons are unioned, the faster typing result stays,
// and a finished quiz attempt beats an unfinished one (ties keep this device).
export function mergeProgress(local, remote) {
	const other = remote && typeof remote === 'object' ? remote : {};
	const merged = { done: [], typing: { ...(other.typing || {}) }, quiz: { ...(other.quiz || {}) }, notes: { ...(other.notes || {}) }, bubbles: {}, last: other.last ?? null };
	merged.done = Array.from(new Set([...(local.done || []), ...(Array.isArray(other.done) ? other.done : [])])).sort();
	for (const [key, value] of Object.entries(local.typing || {})) {
		if (!(key in merged.typing) || bestWpm(value) >= bestWpm(merged.typing[key])) merged.typing[key] = value;
	}
	for (const [key, value] of Object.entries(local.quiz || {})) {
		if (!(key in merged.quiz) || isComplete(value) || !isComplete(merged.quiz[key])) merged.quiz[key] = value;
	}
	// The reading position is the newer of the two.
	if (local.last && (!merged.last || editedAt(local.last) > editedAt(merged.last))) merged.last = local.last;
	// A note keeps whichever edit is newer (an emptied note is an edit too).
	for (const [key, value] of Object.entries(local.notes || {})) {
		if (!(key in merged.notes) || editedAt(value) > editedAt(merged.notes[key])) merged.notes[key] = value;
	}
	// Merge individual comments, including deletion records. Legacy arrays receive
	// the same deterministic IDs on both devices before the merge.
	const keys = new Set([...Object.keys(local.bubbles || {}), ...Object.keys(other.bubbles || {})]);
	merged.bubbles = Object.fromEntries([...keys].sort().map(key => [key, JSON.stringify(mergeBubbleRecords(local.bubbles?.[key], other.bubbles?.[key]))]));
	return merged;
}

export function applyProgress(data, storage = window.localStorage, events = globalThis.window) {
	const get = key => { try { return storage.getItem(key); } catch { return null; } };
	const put = (key, value) => { try { storage.setItem(key, value); } catch { /* storage may be refused */ } };
	const before = get(DONE);
	if (data.done?.length) put(DONE, JSON.stringify(data.done));
	for (const [key, value] of Object.entries(data.typing || {})) if (typeof value === 'string') put(TYPING + key, value);
	for (const [key, value] of Object.entries(data.quiz || {})) if (typeof value === 'string') put(QUIZ + key, value);
	for (const [key, value] of Object.entries(data.notes || {})) if (typeof value === 'string') put(NOTE + key, value);
	for (const [key, value] of Object.entries(data.bubbles || {})) put(BUBBLES + key, JSON.stringify(bubbleRecords(value)));
	if (typeof data.last === 'string') put(LAST, data.last);
	if (get(DONE) !== before) {
		// reader-progress.js listens for this to redraw its ticks and counts.
		try { events?.dispatchEvent(new StorageEvent('storage', { key: DONE })); } catch { /* older browsers */ }
	}
	events?.dispatchEvent(new Event('gha:progress-sync'));
}

// ----------------------------------------------------------------- session
const loadSession = () => parse(read(SESSION_KEY) || 'null');
const saveSession = session => {
	try {
		if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
		else window.localStorage.removeItem(SESSION_KEY);
	} catch { /* storage may be refused */ }
};

export function mountAccount() {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mountAccount, { once: true });
		return;
	}
	const roots = Array.from(document.querySelectorAll('[data-account]'));
	if (!roots.length || roots.some(root => root.dataset.accountReady === 'true')) return;
	roots.forEach(root => { root.dataset.accountReady = 'true'; });
	const { supabaseUrl, anonKey, providers } = roots[0].dataset;
	const offered = (providers || '').split(/\s+/).filter(name => PROVIDERS[name]);
	let session = loadSession();
	let lastSynced = '';
	let timer = 0;
	let message = '';
	let syncing = null, generation = 0;

	const headers = (token, extra = {}) => ({ apikey: anonKey, Authorization: 'Bearer ' + token, ...extra });

	function say(text) {
		message = text;
		for (const root of roots) root.querySelector('[data-account-status]').textContent = text;
	}

	function render() {
		for (const root of roots) {
			const body = root.querySelector('[data-account-body]');
			root.querySelector('[data-account-summary]').textContent = session ? (session.user?.name || 'Signed in') : 'Signed out';
			body.replaceChildren();
			if (!session) {
				body.append(el('small', '', 'Sign in to keep your progress on every device. Without it, progress stays in this browser.'));
				for (const name of offered) {
					const button = el('button', 'reading-audio__button', 'Continue with ' + PROVIDERS[name]);
					button.type = 'button';
					button.addEventListener('click', () => signIn(name));
					body.append(button);
				}
				body.append(el('small', '', 'Your lesson progress, quiz answers, typing bests, notes, comments and reading position are saved.'));
			} else {
				const who = el('div', 'account-controls__who');
				if (session.user?.avatar) {
					const image = el('img');
					image.src = session.user.avatar; image.alt = ''; image.width = 28; image.height = 28; image.referrerPolicy = 'no-referrer';
					who.append(image);
				}
				who.append(el('span', '', session.user?.name || session.user?.email || 'Signed in'));
				const sync = el('button', 'reading-audio__button', 'Sync now');
				const out = el('button', 'reading-audio__button', 'Sign out');
				sync.type = out.type = 'button';
				sync.addEventListener('click', () => syncNow(true));
				out.addEventListener('click', signOut);
				body.append(who, sync, out, el('small', '', 'Signing out leaves your progress in this browser.'));
			}
			root.querySelector('[data-account-status]').textContent = message;
		}
	}

	function signIn(name) {
		const back = location.origin + location.pathname;
		location.href = `${supabaseUrl}/auth/v1/authorize?provider=${encodeURIComponent(name)}&redirect_to=${encodeURIComponent(back)}`;
	}

	function signOut() {
		generation++; session = null; lastSynced = ''; clearInterval(timer);
		saveSession(null); say('Signed out. Your progress is still saved in this browser.'); render();
	}

	// The return trip from the provider carries the tokens in the URL fragment.
	async function takeReturn() {
		const params = new URLSearchParams(location.hash.replace(/^#/, ''));
		if (params.get('error_description') || params.get('error')) {
			say('Sign-in did not finish: ' + (params.get('error_description') || params.get('error')).replace(/\+/g, ' '));
			history.replaceState(null, '', location.pathname + location.search);
			return;
		}
		const access = params.get('access_token');
		if (!access) return;
		history.replaceState(null, '', location.pathname + location.search);
		const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: headers(access) });
		if (!response.ok) { say('Sign-in could not be completed. Please try again.'); return; }
		const user = await response.json();
		const meta = user.user_metadata || {};
		session = {
			access_token: access,
			refresh_token: params.get('refresh_token'),
			expires_at: Math.floor(Date.now() / 1000) + Number(params.get('expires_in') || 3600),
			user: { id: user.id, name: meta.full_name || meta.name || meta.user_name || user.email || 'Signed in', avatar: meta.avatar_url || meta.picture || '' },
		};
		saveSession(session);
	}

	async function freshToken() {
		if (!session) return null;
		const currentGeneration = generation;
		if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
		if (!session.refresh_token) { signOut(); return null; }
		const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
			method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }),
		});
		if (!session || generation !== currentGeneration) return null;
		if (!response.ok) { signOut(); say('Your sign-in expired. Please sign in again.'); return null; }
		const next = await response.json();
		if (!session || generation !== currentGeneration) return null;
		session = { ...session, access_token: next.access_token, refresh_token: next.refresh_token || session.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600) };
		saveSession(session);
		return session.access_token;
	}

	async function push(data, keepalive = false) {
		const currentGeneration = generation;
		const token = await freshToken();
		if (!token || !session || generation !== currentGeneration) return false;
		const response = await fetch(`${supabaseUrl}/rest/v1/progress?on_conflict=user_id`, {
			method: 'POST', keepalive,
			headers: headers(token, { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
			body: JSON.stringify({ user_id: session.user.id, data, updated_at: new Date().toISOString() }),
		});
		return response.ok;
	}

	function syncNow(announce = false, keepalive = false) {
		if (!session) return Promise.resolve();
		if (syncing) return syncing;
		const currentGeneration = generation;
		syncing = (async () => {
			try {
				const token = await freshToken();
				if (!token || !session || generation !== currentGeneration) return;
				const response = await fetch(`${supabaseUrl}/rest/v1/progress?select=data`, { keepalive, headers: headers(token) });
				if (!response.ok) throw new Error(String(response.status));
				const rows = await response.json();
				if (!session || generation !== currentGeneration) return;
				const merged = mergeProgress(snapshot(), rows[0]?.data);
				applyProgress(merged);
				// Capture before awaiting the save: a later local edit needs another sync.
				const current = JSON.stringify(snapshot());
				if (JSON.stringify(merged) !== JSON.stringify(rows[0]?.data ?? null)) {
					if (!(await push(merged, keepalive))) throw new Error('save');
				}
				if (!session || generation !== currentGeneration) return;
				lastSynced = current;
				say(announce ? 'Synced at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.' : 'Progress synced.');
			} catch {
				if (session && generation === currentGeneration) say('The account service could not be reached. Your progress is safe in this browser.');
			}
		})().finally(() => { syncing = null; });
		return syncing;
	}

	// Read and merge before every save, so another device's comments and
	// tombstones are not replaced by this browser's older copy.
	async function pushIfChanged(keepalive = false) {
		if (!session) return;
		const current = JSON.stringify(snapshot());
		if (current === lastSynced) return;
		await syncNow(false, keepalive);
	}

	document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') pushIfChanged(true); });
	document.addEventListener('academy:completed', () => setTimeout(pushIfChanged, 1500));
	window.addEventListener('gha:bubbles-change', () => setTimeout(pushIfChanged, 1500));

	render();
	(async () => {
		try { await takeReturn(); } catch { say('Sign-in could not be completed. Please try again.'); }
		render();
		if (session) {
			await syncNow(false);
			render();
			// Pull even when local progress did not change: a different device may
			// have added or deleted a comment since the previous sync.
			timer = setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 20000);
		}
	})();
}
