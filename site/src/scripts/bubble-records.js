// Reader comments are merged individually. Retained tombstones stop an older
// device from resurrecting a deleted comment; an empty list alone cannot do so.
const parse = value => {
	if (typeof value !== 'string') return value;
	try { return JSON.parse(value); } catch { return null; }
};
const timestamp = value => Number.isFinite(value) && value >= 0 ? value : 0;

// Deterministic migration for legacy {at, heading, text, kind} arrays. Two
// independent 32-bit fingerprints avoid putting the comment text in its ID.
function fingerprint(text) {
	let a = 2166136261, b = 3339675911;
	for (const ch of text) {
		const point = ch.codePointAt(0);
		a = Math.imul(a ^ point, 16777619);
		b = Math.imul(b ^ point, 2246822519);
	}
	return [a, b].map(n => (n >>> 0).toString(16).padStart(8, '0')).join('');
}

export function newBubbleId() {
	return globalThis.crypto?.randomUUID?.() || `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function newer(a, b) {
	if (a.at !== b.at) return a.at > b.at ? a : b;
	if (Boolean(a.deleted) !== Boolean(b.deleted)) return a.deleted ? a : b;
	// Equal timestamps converge regardless of which device initiates the merge.
	return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

export function bubbleRecords(value) {
	const parsed = parse(value);
	const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.records) ? parsed.records : [];
	const records = new Map(), occurrences = new Map();
	for (const item of list) {
		if (!item || typeof item !== 'object') continue;
		const at = timestamp(item.at);
		let id = typeof item.id === 'string' && item.id ? item.id : '';
		if (item.deleted === true) {
			if (!id) continue; // A deletion must identify the record it removed.
			const record = { id, at, deleted: true };
			records.set(id, records.has(id) ? newer(record, records.get(id)) : record);
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
		const record = { id, at, heading, text, kind };
		records.set(id, records.has(id) ? newer(record, records.get(id)) : record);
	}
	return Array.from(records.values()).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function mergeBubbleRecords(local, remote) {
	// Normalize sides separately so matching legacy records get matching IDs.
	return bubbleRecords([...bubbleRecords(local), ...bubbleRecords(remote)]);
}

export function deleteBubble(record, now = Date.now()) {
	return { id: record.id, at: Math.max(timestamp(now), timestamp(record.at) + 1), deleted: true };
}
