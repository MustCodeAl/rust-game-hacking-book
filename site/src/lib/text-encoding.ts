// Plain ASCII text to bytes to Base64, worked step by step (lesson 3.11, pages/3/07.mdx). Pure functions, no browser API. The
// Base64 here is written out by hand from the bit rules of RFC 4648 and checked against Node's Buffer by
// scripts/check-pe-diagram-models.ts, so the explanation and the real algorithm cannot drift apart.
import { toHex } from './hex-field.ts';

/** The widget takes at most this many characters, so every table stays short enough to read. */
export const MAX_CHARS = 6;
/** Printable ASCII: space (32) to tilde (126), one byte each in ASCII and in UTF-8. */
export const FIRST_PRINTABLE = 32;
export const LAST_PRINTABLE = 126;
export const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export interface ByteView {
  readonly char: string;
  /** How the character reads in a table: a space is written out. */
  readonly shown: string;
  readonly code: number;
  readonly decimal: string;
  readonly hex: string;
  readonly binary: string;
  /** How each number is worked out from the code. */
  readonly explain: string;
}

export interface GroupView {
  readonly index: number;
  /** All six bits of the group, including any zero bits added to complete the last group. */
  readonly bits: string;
  /** Zero bits appended to complete a short last group (0 for every other group). */
  readonly padBits: number;
  readonly value: number;
  readonly symbol: string;
  readonly explain: string;
}

export interface Encoding {
  readonly text: string;
  readonly bytes: readonly ByteView[];
  /** Every bit of every byte, in order, without separators. */
  readonly bits: string;
  readonly groups: readonly GroupView[];
  /** The `=` signs that bring the output to a multiple of four symbols. */
  readonly padSymbols: number;
  readonly base64: string;
  readonly summary: string;
}

const characters = (text: string): string[] => Array.from(text);

/** The reason a text cannot be used, or null when it is fine. The empty text is allowed. */
export function checkText(text: string): string | null {
  const chars = characters(text);
  if (chars.length > MAX_CHARS) return `Use at most ${MAX_CHARS} characters; this text has ${chars.length}.`;
  for (const char of chars) {
    const code = char.codePointAt(0) ?? 0;
    if (code < FIRST_PRINTABLE || code > LAST_PRINTABLE) {
      return `“${char}” is not a plain ASCII character, so it would not be exactly one byte. Use letters, digits, punctuation or a space.`;
    }
  }
  return null;
}

/** 72 -> "64 + 8": the powers of two that add up to `value`, largest first. */
export function binaryParts(value: number): string {
  if (value === 0) return '0';
  const parts: number[] = [];
  for (let power = 1 << 7; power >= 1; power >>= 1) if (value & power) parts.push(power);
  return parts.join(' + ');
}

const bitsOf = (value: number, width: number): string => value.toString(2).padStart(width, '0');
/** "72 = 64 + 8", or "32 is a single power of two" when there is nothing to add up. */
const sumNote = (value: number): string => (binaryParts(value).includes('+') ? `${value} = ${binaryParts(value)}` : `${value} is a single power of two`);

function byteView(char: string): ByteView {
  const code = char.codePointAt(0) ?? 0;
  const high = Math.floor(code / 16), low = code % 16;
  const hex = toHex(code, 2);
  const binary = bitsOf(code, 8);
  const letters = high >= 10 || low >= 10 ? ' (digits above 9 are letters: A is 10, B is 11, up to F is 15)' : '';
  const shown = char === ' ' ? 'space' : char;
  return {
    char, shown, code, decimal: String(code), hex, binary,
    explain: `${shown} is code ${code}. In hex, ${code} = ${high} × 16 + ${low}, so ${hex}${letters}. In binary, ${sumNote(code)}, so ${binary}.`,
  };
}

/** What the symbol for a six-bit value is, and why: the alphabet is A-Z, a-z, 0-9, +, / in that order. */
export function symbolRule(value: number): string {
  const symbol = BASE64_ALPHABET.charAt(value);
  if (value < 26) return `${value} is in 0 to 25, the capital letters (A is 0), so the symbol is ${symbol}`;
  if (value < 52) return `${value} is in 26 to 51, the small letters (a is 26): ${value} − 26 = ${value - 26}, so the symbol is ${symbol}`;
  if (value < 62) return `${value} is in 52 to 61, the digits (0 is 52): ${value} − 52 = ${value - 52}, so the symbol is ${symbol}`;
  return `${value} is ${value === 62 ? 'the plus sign' : 'the slash'}, so the symbol is ${symbol}`;
}

/** Cut `bits` into groups of six; the last group is completed with zero bits. */
export function regroup(bits: string): GroupView[] {
  const groups: GroupView[] = [];
  for (let start = 0; start < bits.length; start += 6) {
    const real = bits.slice(start, start + 6);
    const padBits = 6 - real.length;
    const padded = real + '0'.repeat(padBits);
    const value = parseInt(padded, 2);
    const symbol = BASE64_ALPHABET.charAt(value);
    const note = padBits > 0 ? ` (${real} plus ${padBits} added zero ${padBits === 1 ? 'bit' : 'bits'})` : '';
    groups.push({ index: start / 6, bits: padded, padBits, value, symbol, explain: `${padded}${note} = ${binaryParts(value).includes('+') ? `${binaryParts(value)} = ` : ''}${value}; ${symbolRule(value)}.` });
  }
  return groups;
}

/** `=` signs needed after `symbols` Base64 symbols: enough to reach a multiple of four. */
export const padSymbolsFor = (symbols: number): number => (4 - (symbols % 4)) % 4;

/** Standard Base64 of the printable-ASCII `text`, worked out step by step. Throws RangeError when checkText refuses it. */
export function encode(text: string): Encoding {
  const problem = checkText(text);
  if (problem !== null) throw new RangeError(problem);
  const bytes = characters(text).map(byteView);
  const bits = bytes.map(byte => byte.binary).join('');
  const groups = regroup(bits);
  const padSymbols = padSymbolsFor(groups.length);
  const base64 = groups.map(group => group.symbol).join('') + '='.repeat(padSymbols);
  const n = bytes.length;
  const summary = n === 0
    ? 'No characters, so no bytes, no bits and no symbols: the Base64 of nothing is nothing.'
    : `${n} ${n === 1 ? 'byte' : 'bytes'} × 8 = ${bits.length} bits. ${bits.length} ÷ 6 = ${(bits.length / 6).toFixed(2).replace(/\.00$/, '')}, so ${groups.length} groups of six bits${groups.at(-1)?.padBits ? ` (the last one completed with ${groups.at(-1)?.padBits} zero ${groups.at(-1)?.padBits === 1 ? 'bit' : 'bits'})` : ' with nothing left over'}. ${groups.length} symbols need ${padSymbols === 0 ? 'no padding' : `${padSymbols} “=” to reach ${groups.length + padSymbols}, a multiple of four`}.`;
  return { text, bytes, bits, groups, padSymbols, base64, summary };
}

/** The bytes of the text as numbers, for checking against another Base64 implementation. */
export const byteValues = (encoding: Encoding): number[] => encoding.bytes.map(byte => byte.code);
