// Optional account sign-in (Google, Discord, GitHub) through Supabase, used
// only to keep a reader's progress across devices. No library is loaded: this
// file speaks to Supabase's auth and REST endpoints with fetch. Progress stays
// in this browser whether or not anyone signs in; signing in merges it with the
// copy in the reader's account (finished lessons are unioned, best typing
// results and finished quiz attempts win), so nothing is overwritten.
//
// What is stored, in one row per user (see ACCOUNT_SETUP.md): finished lessons,
// typing-practice bests, and quiz attempts. No name, e-mail or reading history
// is written by this site; Supabase holds the sign-in itself.

const SESSION_KEY = 'gha-account-session';
const DONE = 'gha-done';
const TYPING = 'gha-speedtype-';
const QUIZ = 'gha-quiz:v7:';
const PROVIDERS = { google: 'Google', discord: 'Discord', github: 'GitHub' };

const el = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
};
const read = key => { try { return window.localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { window.localStorage.setItem(key, value); } catch { /* storage may be refused */ } };
const parse = text => { try { return JSON.parse(text); } catch { return null; } };

// ---------------------------------------------------------------- progress
export function snapshot(storage = window.localStorage) {
	const data = { done: [], typing: {}, quiz: {} };
	const done = parse(storage.getItem(DONE) || '[]');
	if (Array.isArray(done)) data.done = done.filter(id => typeof id === 'string').sort();
	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if (key.startsWith(TYPING)) data.typing[key.slice(TYPING.length)] = storage.getItem(key);
		else if (key.startsWith(QUIZ)) data.quiz[key.slice(QUIZ.length)] = storage.getItem(key);
	}
	return data;
}

const bestWpm = text => { const value = parse(text); return value && Number.isFinite(value.wpm) ? value.wpm : -1; };
const isComplete = text => { const value = parse(text); return Boolean(value && value.complete === true); };

// Never loses anything: lessons are unioned, the faster typing result stays,
// and a finished quiz attempt beats an unfinished one (ties keep this device).
export function mergeProgress(local, remote) {
	const other = remote && typeof remote === 'object' ? remote : {};
	const merged = { done: [], typing: { ...(other.typing || {}) }, quiz: { ...(other.quiz || {}) } };
	merged.done = Array.from(new Set([...(local.done || []), ...(Array.isArray(other.done) ? other.done : [])])).sort();
	for (const [key, value] of Object.entries(local.typing || {})) {
		if (!(key in merged.typing) || bestWpm(value) >= bestWpm(merged.typing[key])) merged.typing[key] = value;
	}
	for (const [key, value] of Object.entries(local.quiz || {})) {
		if (!(key in merged.quiz) || isComplete(value) || !isComplete(merged.quiz[key])) merged.quiz[key] = value;
	}
	return merged;
}

function applyProgress(data) {
	const before = read(DONE);
	if (data.done.length) write(DONE, JSON.stringify(data.done));
	for (const [key, value] of Object.entries(data.typing)) if (typeof value === 'string') write(TYPING + key, value);
	for (const [key, value] of Object.entries(data.quiz)) if (typeof value === 'string') write(QUIZ + key, value);
	if (read(DONE) !== before) {
		// reader-progress.js listens for this to redraw its ticks and counts.
		try { window.dispatchEvent(new StorageEvent('storage', { key: DONE })); } catch { /* older browsers */ }
	}
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
	const roots = Array.from(document.querySelectorAll('[data-account]'));
	if (!roots.length) return;
	const { supabaseUrl, anonKey, providers } = roots[0].dataset;
	const offered = (providers || '').split(/\s+/).filter(name => PROVIDERS[name]);
	let session = loadSession();
	let lastSynced = '';
	let timer = 0;
	let message = '';

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
				body.append(el('small', '', 'Only your finished lessons, quiz answers and typing bests are saved.'));
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
		session = null; lastSynced = ''; clearInterval(timer);
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
		if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
		if (!session.refresh_token) { signOut(); return null; }
		const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
			method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }),
		});
		if (!response.ok) { signOut(); say('Your sign-in expired. Please sign in again.'); return null; }
		const next = await response.json();
		session = { ...session, access_token: next.access_token, refresh_token: next.refresh_token || session.refresh_token, expires_at: Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600) };
		saveSession(session);
		return session.access_token;
	}

	async function push(data, keepalive = false) {
		const token = await freshToken();
		if (!token) return false;
		const response = await fetch(`${supabaseUrl}/rest/v1/progress?on_conflict=user_id`, {
			method: 'POST', keepalive,
			headers: headers(token, { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
			body: JSON.stringify({ user_id: session.user.id, data, updated_at: new Date().toISOString() }),
		});
		return response.ok;
	}

	async function syncNow(announce = false) {
		if (!session) return;
		try {
			const token = await freshToken();
			if (!token) return;
			const response = await fetch(`${supabaseUrl}/rest/v1/progress?select=data`, { headers: headers(token) });
			if (!response.ok) throw new Error(String(response.status));
			const rows = await response.json();
			const merged = mergeProgress(snapshot(), rows[0]?.data);
			applyProgress(merged);
			const text = JSON.stringify(merged);
			if (text !== JSON.stringify(rows[0]?.data ?? null)) {
				if (!(await push(merged))) throw new Error('save');
			}
			lastSynced = JSON.stringify(snapshot());
			say(announce ? 'Synced at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.' : 'Progress synced.');
		} catch {
			say('The account service could not be reached. Your progress is safe in this browser.');
		}
	}

	// Saves quietly when something changed, and when the page is put away.
	async function pushIfChanged(keepalive = false) {
		if (!session) return;
		const current = JSON.stringify(snapshot());
		if (current === lastSynced) return;
		try { if (await push(snapshot(), keepalive)) lastSynced = current; } catch { /* retried on the next tick */ }
	}

	document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') pushIfChanged(true); });
	document.addEventListener('academy:completed', () => setTimeout(pushIfChanged, 1500));

	(async () => {
		try { await takeReturn(); } catch { say('Sign-in could not be completed. Please try again.'); }
		render();
		if (session) {
			await syncNow(false);
			render();
			timer = setInterval(() => { if (document.visibilityState === 'visible') pushIfChanged(); }, 20000);
		}
	})();
}
