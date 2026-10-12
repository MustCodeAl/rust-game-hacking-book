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

import { bubbleRecords, mergeBubbleRecords } from './bubble-records.ts';

const SESSION_KEY = 'gha-account-session';
const DONE = 'gha-done';
const TYPING = 'gha-speedtype-';
const QUIZ = 'gha-quiz:v7:';
const NOTE = 'gha-note:';
const BUBBLES = 'gha-bubbles:';
const LAST = 'gha-last';

type ProviderName = 'google' | 'discord' | 'github';
const PROVIDERS: Readonly<Record<ProviderName, string>> = { google: 'Google', discord: 'Discord', github: 'GitHub' };
const isProvider = (name: string): name is ProviderName => Object.hasOwn(PROVIDERS, name);

/** A localStorage value copied as it is stored (null if the key vanished while it was read). */
type Stored = string | null;

/**
 * The progress row kept in the reader's account. Each map is keyed by the part of the
 * localStorage key after its prefix ("gha-speedtype-", "gha-quiz:v7:", "gha-note:",
 * "gha-bubbles:"); values are the stored JSON text.
 */
export interface Progress {
	readonly done: readonly string[];
	readonly typing: Readonly<Record<string, Stored>>;
	readonly quiz: Readonly<Record<string, Stored>>;
	readonly notes: Readonly<Record<string, Stored>>;
	readonly bubbles: Readonly<Record<string, string>>;
	readonly last: Stored;
}
/** What a device may hand to the merge: any part can be missing. */
export type ProgressPatch = Partial<Progress>;

type ReadableStorage = Pick<Storage, 'length' | 'key' | 'getItem'>;
type WritableStorage = Pick<Storage, 'getItem' | 'setItem'>;

interface AccountUser {
	readonly id: string;
	readonly name?: string;
	readonly avatar?: string;
	readonly email?: string;
}
interface AccountSession {
	readonly access_token: string;
	readonly refresh_token: string | null;
	readonly expires_at: number;
	readonly user: AccountUser;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const optionalString = (value: unknown): value is string | undefined => value === undefined || typeof value === 'string';
/** The first value that is a non-empty string. */
const firstText = (...values: readonly unknown[]): string | undefined => values.find((value): value is string => typeof value === 'string' && value !== '');

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}
const read = (key: string): string | null => { try { return window.localStorage.getItem(key); } catch { return null; } };
const parse = (text: string | null | undefined): unknown => { try { return JSON.parse(text ?? 'null'); } catch { return null; } };

// ---------------------------------------------------------------- progress
export function snapshot(storage: ReadableStorage = window.localStorage): Progress {
	const typing: Record<string, Stored> = {};
	const quiz: Record<string, Stored> = {};
	const notes: Record<string, Stored> = {};
	const bubbles: Record<string, string> = {};
	const stored = parse(storage.getItem(DONE) || '[]');
	const done = Array.isArray(stored) ? stored.filter(isString).sort() : [];
	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if (typeof key !== 'string') continue;
		if (key.startsWith(TYPING)) typing[key.slice(TYPING.length)] = storage.getItem(key);
		else if (key.startsWith(QUIZ)) quiz[key.slice(QUIZ.length)] = storage.getItem(key);
		else if (key.startsWith(NOTE)) notes[key.slice(NOTE.length)] = storage.getItem(key);
		else if (key.startsWith(BUBBLES)) bubbles[key.slice(BUBBLES.length)] = JSON.stringify(bubbleRecords(storage.getItem(key)));
	}
	return { done, typing, quiz, notes, bubbles, last: storage.getItem(LAST) };
}

const field = (text: Stored | undefined, name: string): unknown => { const value = parse(text); return isRecord(value) ? value[name] : undefined; };
const bestWpm = (text: Stored | undefined): number => { const wpm = field(text, 'wpm'); return typeof wpm === 'number' && Number.isFinite(wpm) ? wpm : -1; };
const editedAt = (text: Stored | undefined): number => { const at = field(text, 'at'); return typeof at === 'number' && Number.isFinite(at) ? at : 0; };
const isComplete = (text: Stored | undefined): boolean => field(text, 'complete') === true;

/** A cloud map keeps only the stored text it can read back; anything else is not progress. */
const storedMap = (value: unknown): Record<string, Stored> => {
	const map: Record<string, Stored> = {};
	if (!isRecord(value)) return map;
	for (const [key, item] of Object.entries(value)) if (typeof item === 'string' || item === null) map[key] = item;
	return map;
};

// Lessons are unioned, the faster typing result stays,
// and a finished quiz attempt beats an unfinished one (ties keep this device).
export function mergeProgress(local: ProgressPatch, remote: unknown): Progress {
	const other: Record<string, unknown> = isRecord(remote) ? remote : {};
	const typing = storedMap(other.typing);
	const quiz = storedMap(other.quiz);
	const notes = storedMap(other.notes);
	let last: Stored = typeof other.last === 'string' ? other.last : null;
	const done = Array.from(new Set([...(local.done ?? []), ...(Array.isArray(other.done) ? other.done.filter(isString) : [])])).sort();
	for (const [key, value] of Object.entries(local.typing ?? {})) {
		if (!(key in typing) || bestWpm(value) >= bestWpm(typing[key])) typing[key] = value;
	}
	for (const [key, value] of Object.entries(local.quiz ?? {})) {
		if (!(key in quiz) || isComplete(value) || !isComplete(quiz[key])) quiz[key] = value;
	}
	// The reading position is the newer of the two.
	if (local.last && (!last || editedAt(local.last) > editedAt(last))) last = local.last;
	// A note keeps whichever edit is newer (an emptied note is an edit too).
	for (const [key, value] of Object.entries(local.notes ?? {})) {
		if (!(key in notes) || editedAt(value) > editedAt(notes[key])) notes[key] = value;
	}
	// Merge individual comments, including deletion records. Legacy arrays receive
	// the same deterministic IDs on both devices before the merge.
	const remoteBubbles: Record<string, unknown> = isRecord(other.bubbles) ? other.bubbles : {};
	const keys = new Set([...Object.keys(local.bubbles ?? {}), ...Object.keys(remoteBubbles)]);
	const bubbles = Object.fromEntries([...keys].sort().map((key): [string, string] => [key, JSON.stringify(mergeBubbleRecords(local.bubbles?.[key], remoteBubbles[key]))]));
	return { done, typing, quiz, notes, bubbles, last };
}

export function applyProgress(data: ProgressPatch, storage: WritableStorage = window.localStorage, events: EventTarget | undefined = globalThis.window): void {
	const get = (key: string): string | null => { try { return storage.getItem(key); } catch { return null; } };
	const put = (key: string, value: string): void => { try { storage.setItem(key, value); } catch { /* storage may be refused */ } };
	const before = get(DONE);
	if (data.done?.length) put(DONE, JSON.stringify(data.done));
	for (const [key, value] of Object.entries(data.typing ?? {})) if (typeof value === 'string') put(TYPING + key, value);
	for (const [key, value] of Object.entries(data.quiz ?? {})) if (typeof value === 'string') put(QUIZ + key, value);
	for (const [key, value] of Object.entries(data.notes ?? {})) if (typeof value === 'string') put(NOTE + key, value);
	for (const [key, value] of Object.entries(data.bubbles ?? {})) put(BUBBLES + key, JSON.stringify(bubbleRecords(value)));
	if (typeof data.last === 'string') put(LAST, data.last);
	if (get(DONE) !== before) {
		// reader-progress.js listens for this to redraw its ticks and counts.
		try { events?.dispatchEvent(new StorageEvent('storage', { key: DONE })); } catch { /* older browsers */ }
	}
	events?.dispatchEvent(new Event('gha:progress-sync'));
}

// ----------------------------------------------------------------- session
const isSession = (value: unknown): value is AccountSession =>
	isRecord(value) && typeof value.access_token === 'string' &&
	(typeof value.refresh_token === 'string' || value.refresh_token === null) &&
	typeof value.expires_at === 'number' &&
	isRecord(value.user) && typeof value.user.id === 'string' &&
	optionalString(value.user.name) && optionalString(value.user.avatar) && optionalString(value.user.email);
const loadSession = (): AccountSession | null => {
	const stored = parse(read(SESSION_KEY) || 'null');
	return isSession(stored) ? stored : null;
};
const saveSession = (session: AccountSession | null): void => {
	try {
		if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
		else window.localStorage.removeItem(SESSION_KEY);
	} catch { /* storage may be refused */ }
};

/** The REST answer is a list of rows; `null` is not one, and an empty or odd body has no first row. */
const firstRow = (rows: unknown): unknown => {
	if (rows === null) throw new TypeError('The account service returned no rows');
	return Array.isArray(rows) ? rows[0] : undefined;
};

export function mountAccount(): void {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mountAccount, { once: true });
		return;
	}
	const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-account]'));
	const first = roots[0];
	if (!first || roots.some(root => root.dataset.accountReady === 'true')) return;
	roots.forEach(root => { root.dataset.accountReady = 'true'; });
	const { supabaseUrl = '', anonKey = '', providers = '' } = first.dataset;
	const offered = providers.split(/\s+/).filter(isProvider);
	let session = loadSession();
	let lastSynced = '';
	let timer = 0;
	let message = '';
	let syncing: Promise<void> | null = null;
	let generation = 0;

	const headers = (token: string, extra: Record<string, string> = {}): Record<string, string> => ({ apikey: anonKey, Authorization: 'Bearer ' + token, ...extra });

	function say(text: string): void {
		message = text;
		for (const root of roots) {
			const status = root.querySelector('[data-account-status]');
			if (status) status.textContent = text;
		}
	}

	function render(): void {
		for (const root of roots) {
			const body = root.querySelector('[data-account-body]');
			const summary = root.querySelector('[data-account-summary]');
			const status = root.querySelector('[data-account-status]');
			if (!body || !summary || !status) continue;
			summary.textContent = session ? (session.user.name || 'Signed in') : 'Signed out';
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
				if (session.user.avatar) {
					const image = el('img');
					image.src = session.user.avatar; image.alt = ''; image.width = 28; image.height = 28; image.referrerPolicy = 'no-referrer';
					who.append(image);
				}
				who.append(el('span', '', session.user.name || session.user.email || 'Signed in'));
				const sync = el('button', 'reading-audio__button', 'Sync now');
				const out = el('button', 'reading-audio__button', 'Sign out');
				sync.type = out.type = 'button';
				sync.addEventListener('click', () => syncNow(true));
				out.addEventListener('click', signOut);
				body.append(who, sync, out, el('small', '', 'Signing out leaves your progress in this browser.'));
			}
			status.textContent = message;
		}
	}

	function signIn(name: ProviderName): void {
		const back = location.origin + location.pathname;
		location.href = `${supabaseUrl}/auth/v1/authorize?provider=${encodeURIComponent(name)}&redirect_to=${encodeURIComponent(back)}`;
	}

	function signOut(): void {
		generation++; session = null; lastSynced = ''; window.clearInterval(timer);
		saveSession(null); say('Signed out. Your progress is still saved in this browser.'); render();
	}

	// The return trip from the provider carries the tokens in the URL fragment.
	async function takeReturn(): Promise<void> {
		const params = new URLSearchParams(location.hash.replace(/^#/, ''));
		const failure = params.get('error_description') || params.get('error');
		if (failure) {
			say('Sign-in did not finish: ' + failure.replace(/\+/g, ' '));
			history.replaceState(null, '', location.pathname + location.search);
			return;
		}
		const access = params.get('access_token');
		if (!access) return;
		history.replaceState(null, '', location.pathname + location.search);
		const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: headers(access) });
		if (!response.ok) { say('Sign-in could not be completed. Please try again.'); return; }
		const user: unknown = await response.json();
		if (!isRecord(user) || typeof user.id !== 'string') throw new TypeError('The account service sent no user');
		const meta: Record<string, unknown> = isRecord(user.user_metadata) ? user.user_metadata : {};
		session = {
			access_token: access,
			refresh_token: params.get('refresh_token'),
			expires_at: Math.floor(Date.now() / 1000) + Number(params.get('expires_in') || 3600),
			user: { id: user.id, name: firstText(meta.full_name, meta.name, meta.user_name, user.email) ?? 'Signed in', avatar: firstText(meta.avatar_url, meta.picture) ?? '' },
		};
		saveSession(session);
	}

	async function freshToken(): Promise<string | null> {
		if (!session) return null;
		const currentGeneration = generation;
		if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
		if (!session.refresh_token) { signOut(); return null; }
		const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
			method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }),
		});
		if (!session || generation !== currentGeneration) return null;
		const next: unknown = response.ok ? await response.json() : null;
		if (!isRecord(next) || typeof next.access_token !== 'string') { signOut(); say('Your sign-in expired. Please sign in again.'); return null; }
		if (!session || generation !== currentGeneration) return null;
		session = {
			...session,
			access_token: next.access_token,
			refresh_token: firstText(next.refresh_token) ?? session.refresh_token,
			expires_at: Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600),
		};
		saveSession(session);
		return session.access_token;
	}

	async function push(data: Progress, keepalive = false): Promise<boolean> {
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

	function syncNow(announce = false, keepalive = false): Promise<void> {
		if (!session) return Promise.resolve();
		if (syncing) return syncing;
		const currentGeneration = generation;
		const running = (async (): Promise<void> => {
			try {
				const token = await freshToken();
				if (!token || !session || generation !== currentGeneration) return;
				const response = await fetch(`${supabaseUrl}/rest/v1/progress?select=data`, { keepalive, headers: headers(token) });
				if (!response.ok) throw new Error(String(response.status));
				const rows: unknown = await response.json();
				if (!session || generation !== currentGeneration) return;
				const row = firstRow(rows);
				const remote = isRecord(row) ? row.data : undefined;
				const merged = mergeProgress(snapshot(), remote);
				applyProgress(merged);
				// Capture before awaiting the save: a later local edit needs another sync.
				const current = JSON.stringify(snapshot());
				if (JSON.stringify(merged) !== JSON.stringify(remote ?? null)) {
					if (!(await push(merged, keepalive))) throw new Error('save');
				}
				if (!session || generation !== currentGeneration) return;
				lastSynced = current;
				say(announce ? 'Synced at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.' : 'Progress synced.');
			} catch {
				if (session && generation === currentGeneration) say('The account service could not be reached. Your progress is safe in this browser.');
			}
		})().finally(() => { syncing = null; });
		syncing = running;
		return running;
	}

	// Read and merge before every save, so another device's comments and
	// tombstones are not replaced by this browser's older copy.
	async function pushIfChanged(keepalive = false): Promise<void> {
		if (!session) return;
		const current = JSON.stringify(snapshot());
		if (current === lastSynced) return;
		await syncNow(false, keepalive);
	}

	document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') pushIfChanged(true); });
	document.addEventListener('academy:completed', () => window.setTimeout(pushIfChanged, 1500));
	window.addEventListener('gha:bubbles-change', () => window.setTimeout(pushIfChanged, 1500));

	render();
	(async (): Promise<void> => {
		try { await takeReturn(); } catch { say('Sign-in could not be completed. Please try again.'); }
		render();
		if (session) {
			await syncNow(false);
			render();
			// Pull even when local progress did not change: a different device may
			// have added or deleted a comment since the previous sync.
			timer = window.setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 20000);
		}
	})();
}
