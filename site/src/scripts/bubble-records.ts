// Reader comments are merged individually. Retained tombstones stop an older
// device from resurrecting a deleted comment; an empty list alone cannot do so.

/** A comment a reader pinned beside a section of a lesson. */
export interface BubbleComment {
	readonly id: string;
	readonly at: number;
	readonly heading: string;
	readonly text: string;
	readonly kind: string;
	readonly deleted?: false;
}
/** What remains of a deleted comment: it identifies the record and when it was removed. */
export interface BubbleTombstone {
	readonly id: string;
	readonly at: number;
	readonly deleted: true;
}
export type BubbleRecord = BubbleComment | BubbleTombstone;

export const isLiveBubble = (record: BubbleRecord): record is BubbleComment => record.deleted !== true;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const parse = (value: unknown): unknown => {
	if (typeof value !== 'string') return value;
	try { return JSON.parse(value); } catch { return null; }
};
const timestamp = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;

// Deterministic migration for legacy {at, heading, text, kind} arrays. Two
// independent 32-bit fingerprints avoid putting the comment text in its ID.
function fingerprint(text: string): string {
	let a = 2166136261, b = 3339675911;
	for (const ch of text) {
		const point = ch.codePointAt(0) ?? 0;
		a = Math.imul(a ^ point, 16777619);
		b = Math.imul(b ^ point, 2246822519);
	}
	return [a, b].map(n => (n >>> 0).toString(16).padStart(8, '0')).join('');
}

export function newBubbleId(): string {
	return globalThis.crypto?.randomUUID?.() || `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function newer(a: BubbleRecord, b: BubbleRecord): BubbleRecord {
	if (a.at !== b.at) return a.at > b.at ? a : b;
	if (Boolean(a.deleted) !== Boolean(b.deleted)) return a.deleted ? a : b;
	// Equal timestamps converge regardless of which device initiates the merge.
	return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

/** Normalizes a stored list (JSON text, a list, or a {records} envelope) into sorted, de-duplicated records. */
export function bubbleRecords(value: unknown): BubbleRecord[] {
	const parsed = parse(value);
	const list: readonly unknown[] = Array.isArray(parsed) ? parsed : isObject(parsed) && Array.isArray(parsed.records) ? parsed.records : [];
	const records = new Map<string, BubbleRecord>();
	const occurrences = new Map<string, number>();
	for (const item of list) {
		if (!isObject(item)) continue;
		const at = timestamp(item.at);
		let id = typeof item.id === 'string' && item.id ? item.id : '';
		if (item.deleted === true) {
			if (!id) continue; // A deletion must identify the record it removed.
			const record: BubbleTombstone = { id, at, deleted: true };
			const existing = records.get(id);
			records.set(id, existing ? newer(record, existing) : record);
			continue;
		}
		if (typeof item.text !== 'string' || !item.text.trim()) continue;
		const heading = typeof item.heading === 'string' ? item.heading : '';
		const kind = typeof item.kind === 'string' ? item.kind : 'mine';
		const text = item.text;
		if (!id) {
			const signature = JSON.stringify([at, heading, kind, text]);
			const count = occurrences.get(signature) || 0;
			occurrences.set(signature, count + 1);
			id = `legacy-${at.toString(36)}-${fingerprint(signature)}-${count}`;
		}
		const record: BubbleComment = { id, at, heading, text, kind };
		const existing = records.get(id);
		records.set(id, existing ? newer(record, existing) : record);
	}
	return Array.from(records.values()).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function mergeBubbleRecords(local: unknown, remote: unknown): BubbleRecord[] {
	// Normalize sides separately so matching legacy records get matching IDs.
	return bubbleRecords([...bubbleRecords(local), ...bubbleRecords(remote)]);
}

export function deleteBubble(record: { readonly id: string; readonly at: number }, now: number = Date.now()): BubbleTombstone {
	return { id: record.id, at: Math.max(timestamp(now), timestamp(record.at) + 1), deleted: true };
}
