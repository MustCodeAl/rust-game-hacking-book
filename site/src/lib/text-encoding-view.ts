// HTML for the text-encoding lab, as a pure function of an Encoding. The Astro component renders the default example with it on
// the server and the browser script renders every later text with the very same function, so the two can never drift apart.
// Every piece of user text goes through escapeHtml, and the input is limited to printable ASCII in any case.
import { MAX_CHARS, type Encoding } from './text-encoding.ts';

const ENTITIES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, char => ENTITIES[char] ?? char);

const BLOCK_BYTES = 3;

/** One three-byte block as a grid: bytes on top, the same bits cut into sixes below, every bit in its own column. */
function blockHtml(encoding: Encoding, blockIndex: number): string {
  const first = blockIndex * BLOCK_BYTES;
  const bytes = encoding.bytes.slice(first, first + BLOCK_BYTES);
  const groupCount = Math.ceil((bytes.length * 8) / 6);
  const groups = encoding.groups.slice(blockIndex * 4, blockIndex * 4 + groupCount);
  const cols = Math.max(bytes.length * 8, groupCount * 6);
  const byteCells = bytes.map((byte, i) => {
    const column = `grid-column:${i * 8 + 1} / span 8`;
    const bits = Array.from(byte.binary).map(bit => `<i>${bit}</i>`).join('');
    return `<span class="te-label" style="${column};grid-row:1">${escapeHtml(byte.shown)} · ${byte.hex}</span><span class="te-bits te-bits--byte" style="${column};grid-row:2">${bits}</span>`;
  }).join('');
  const groupCells = groups.map((group, j) => {
    const column = `grid-column:${j * 6 + 1} / span 6`;
    const real = 6 - group.padBits;
    const bits = Array.from(group.bits).map((bit, k) => `<i${k >= real ? ' class="te-pad"' : ''}>${bit}</i>`).join('');
    return `<span class="te-bits te-bits--group" style="${column};grid-row:3">${bits}</span><span class="te-label" style="${column};grid-row:4">${group.value} → ${escapeHtml(group.symbol)}</span>`;
  }).join('');
  return `<div class="te-block" style="--cols:${cols}" role="group" aria-label="Bytes ${first + 1} to ${first + bytes.length}">${byteCells}${groupCells}</div>`;
}

const row = (cells: readonly string[], header = ''): string => `<tr>${header}${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;

/** Everything below the input: the four steps, the result and the comparison table. Empty text gets a short note instead. */
export function outputHtml(encoding: Encoding): string {
  if (encoding.bytes.length === 0) {
    return `<p class="te-empty">${escapeHtml(encoding.summary)} Type up to ${MAX_CHARS} characters to see the steps.</p>`;
  }
  const byteRows = encoding.bytes.map(byte => row([String(byte.decimal), byte.hex, `<code>${byte.binary}</code>`], `<th scope="row"><code>${escapeHtml(byte.shown)}</code></th>`)).join('');
  const groupRows = encoding.groups.map(group => row([`<code>${group.bits}</code>`, String(group.value), `<code>${escapeHtml(group.symbol)}</code>`], `<th scope="row">${group.index + 1}</th>`)).join('');
  const blocks = Array.from({ length: Math.ceil(encoding.bytes.length / BLOCK_BYTES) }, (_, i) => blockHtml(encoding, i)).join('');
  const text = encoding.bytes.map(byte => byte.char).join('');
  const costumes = [
    ['Text (ASCII)', escapeHtml(text), 'Readable characters.'],
    ['Binary', encoding.bytes.map(byte => byte.binary).join(' '), 'Only 0 and 1, in groups of 8.'],
    ['Decimal', encoding.bytes.map(byte => byte.decimal).join(' '), 'Numbers; for printable ASCII always from 32 to 126.'],
    ['Hexadecimal', encoding.bytes.map(byte => byte.hex).join(' '), 'Digits 0 to 9 and letters A to F, two per byte.'],
    ['Base64', escapeHtml(encoding.base64), 'Letters, digits, + and /, with = at the end when the groups run short.'],
  ].map(([name, shown, how]) => `<tr><th scope="row">${name}</th><td data-label="This text"><code>${shown}</code></td><td data-label="How to tell it">${how}</td></tr>`).join('');
  const padNote = encoding.padSymbols === 0
    ? `${encoding.groups.length} is already a multiple of four, so nothing is added.`
    : `${encoding.groups.length} symbols is not a multiple of four, so ${encoding.padSymbols} “=” ${encoding.padSymbols === 1 ? 'sign is' : 'signs are'} added to make ${encoding.groups.length + encoding.padSymbols}. They carry no data: they only tell the decoder how many bytes were missing.`;
  return `<section class="te-step"><h4><b>1</b> Each character is one byte</h4>
<p>ASCII gives each character a number from 32 to 126, and that number fits in one byte of 8 bits. Here it is as decimal, hexadecimal and binary.</p>
<div class="mdg-table-wrap"><table class="mdg-table te-table"><thead><tr><th scope="col">Character</th><th scope="col">Decimal</th><th scope="col">Hex</th><th scope="col">Binary</th></tr></thead><tbody>${byteRows}</tbody></table></div>
<ul class="te-why">${encoding.bytes.map(byte => `<li>${escapeHtml(byte.explain)}</li>`).join('')}</ul></section>
<section class="te-step"><h4><b>2</b> Join the bits, then cut them into groups of six</h4>
<p>${escapeHtml(encoding.summary)}</p>
<div class="te-blocks">${blocks}</div>
<p class="mdg-note">Top: each byte with its character and hex value. Bottom: the same bits, in the same columns, cut into groups of six, each with its value and symbol. Hatched zeros were added to finish the last group; they are not part of the data.</p></section>
<section class="te-step"><h4><b>3</b> Each group is a number, and each number is a symbol</h4>
<p>The Base64 alphabet runs A to Z (0 to 25), a to z (26 to 51), 0 to 9 (52 to 61), then + (62) and / (63).</p>
<div class="mdg-table-wrap"><table class="mdg-table te-table"><thead><tr><th scope="col">Group</th><th scope="col">Bits</th><th scope="col">Value</th><th scope="col">Symbol</th></tr></thead><tbody>${groupRows}</tbody></table></div>
<ul class="te-why">${encoding.groups.map(group => `<li>${escapeHtml(group.explain)}</li>`).join('')}</ul></section>
<section class="te-step"><h4><b>4</b> Pad to a multiple of four symbols</h4>
<p>Base64 output comes in blocks of four symbols. ${escapeHtml(padNote)}</p></section>
<section class="te-step"><h4>The same text in five forms</h4>
<div class="mdg-table-wrap"><table class="mdg-table te-table te-costumes"><thead><tr><th scope="col">Form</th><th scope="col">This text</th><th scope="col">How to tell it</th></tr></thead><tbody>${costumes}</tbody></table></div></section>`;
}

/** The one-line answer shown above the steps. */
export function resultText(encoding: Encoding): string {
  return encoding.bytes.length === 0 ? '(empty)' : encoding.base64;
}
