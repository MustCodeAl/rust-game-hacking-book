/** Bounded hexadecimal field helpers shared by the memory diagrams. Pure: no browser API. */

/** Remove one optional `0x`/`0X` prefix and surrounding spaces. */
export function stripHexPrefix(text: string): string {
  const trimmed = text.trim();
  return /^0x/i.test(trimmed) ? trimmed.slice(2) : trimmed;
}

/** True when `text` is one to `maxDigits` hexadecimal digits (after an optional 0x prefix). */
export function isBoundedHex(text: string, maxDigits: number): boolean {
  const digits = stripHexPrefix(text);
  return digits.length >= 1 && digits.length <= maxDigits && /^[0-9a-fA-F]+$/.test(digits);
}

/** Parse bounded hexadecimal text to a bigint, or null when it is empty, too long or not hexadecimal. */
export function parseHexBig(text: string, maxDigits: number): bigint | null {
  return isBoundedHex(text, maxDigits) ? BigInt(`0x${stripHexPrefix(text)}`) : null;
}

/** Parse bounded hexadecimal text to a number (use only when maxDigits <= 13). */
export function parseHexNumber(text: string, maxDigits: number): number | null {
  if (maxDigits > 13) throw new RangeError('parseHexNumber is exact only up to 13 hexadecimal digits.');
  const value = parseHexBig(text, maxDigits);
  return value === null ? null : Number(value);
}

/** Upper-case hexadecimal, zero-padded to `digits`. */
export function toHex(value: number | bigint, digits: number): string {
  if (value < 0) throw new RangeError('Hexadecimal display needs a non-negative value.');
  return value.toString(16).toUpperCase().padStart(digits, '0');
}
