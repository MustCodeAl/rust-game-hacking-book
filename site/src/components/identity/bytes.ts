// The real bytes behind the book's identity. Every strip the identity draws is
// computed here from its source text or value, never typed in by hand, so the
// mark, the hero, the print cover and the social card cannot disagree.

/** One byte as two upper-case hex digits, the way lesson figures and debuggers show it. */
export const hexByte = (value: number): string => (value & 0xff).toString(16).toUpperCase().padStart(2, '0');

/** The ASCII bytes of a string (the identity only encodes ASCII text). */
export const asciiBytes = (text: string): number[] =>
	Array.from(text, (char) => {
		const code = char.charCodeAt(0);
		if (code > 0x7f) throw new Error(`Not ASCII: ${char}`);
		return code;
	});

/** The mark: G, H and A as bytes, 47 48 41. */
export const NAME_BYTES: readonly string[] = asciiBytes('GHA').map(hexByte);

export const TITLE = 'Game Hacking Academy';

/** One `hexdump -C` row: offset, sixteen bytes in two groups of eight, and the printable characters. */
export interface DumpRow {
	readonly offset: string;
	readonly bytes: readonly string[];
	readonly text: string;
}

/** A string laid out as `hexdump -C` prints it, sixteen bytes per row. */
export const hexdumpRows = (text: string): DumpRow[] => {
	const bytes = asciiBytes(text);
	const rows: DumpRow[] = [];
	for (let start = 0; start < bytes.length; start += 16) {
		const slice = bytes.slice(start, start + 16);
		rows.push({
			offset: start.toString(16).toUpperCase().padStart(8, '0'),
			bytes: slice.map(hexByte),
			text: String.fromCharCode(...slice),
		});
	}
	return rows;
};

/** The u32 little-endian bytes of a value: the least-significant byte first. */
export const u32Bytes = (value: number): string[] => [0, 8, 16, 24].map((shift) => hexByte(value >>> shift));

/**
 * How one byte's hex digits make its value, in the book's words:
 * 0x4B = 4 × 16 + 11 = 75 (B is 11).
 */
export const byteDerivation = (value: number): string => {
	const high = (value >> 4) & 0xf;
	const low = value & 0xf;
	const letters = [high, low]
		.filter((digit, index, all) => digit > 9 && all.indexOf(digit) === index)
		.map((digit) => `${digit.toString(16).toUpperCase()} is ${digit}`);
	const note = letters.length ? ` (${letters.join(', ')})` : '';
	return `0x${hexByte(value)} = ${high} × 16 + ${low} = ${value}${note}`;
};

/** Lesson 1.8's opening example: a health value of 100 stored as a u32 at 0x1000, and the hit that takes 25. */
export const HEALTH = { start: 100, hit: 25, address: 0x1000 } as const;

export const address = (value: number): string => `0x${value.toString(16).toUpperCase()}`;
