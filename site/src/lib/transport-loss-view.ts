// HTML for the TCP/UDP timelines, built from numbers only so the server render and the script share one code path.
import type { Delivery, LossResult } from './transport-loss';

export type Protocol = 'tcp' | 'udp';

interface Row { readonly label: string; readonly cells: (tick: number) => string }

const chip = (kind: string, message: number, symbol: string, label: string): string =>
  `<span class="tl__chip" data-kind="${kind}" aria-label="${label}">${message + 1}${symbol ? `<i aria-hidden="true">${symbol}</i>` : ''}</span>`;

function rows(protocol: Protocol, items: readonly Delivery[]): Row[] {
  const sent: Row = { label: 'Sent', cells: tick => items.flatMap(item => {
    const out: string[] = [];
    if (item.sentAt === tick) out.push(item.lost ? chip('lost', item.message, '✕', `message ${item.message + 1} sent and lost on the way`) : chip('sent', item.message, '', `message ${item.message + 1} sent`));
    if (item.resentAt === tick) out.push(chip('resent', item.message, '↻', `message ${item.message + 1} sent again`));
    return out;
  }).join('') };
  const arrives: Row = { label: 'Arrives', cells: tick => items.filter(item => item.arrivedAt === tick).map(item => chip(item.resentAt !== null ? 'resent' : 'arrive', item.message, '', `message ${item.message + 1} reaches the computer`)).join('') };
  // Arrived at the computer but not yet given to the game, because an earlier message is still missing.
  const held: Row = { label: 'Held back', cells: tick => items.filter(item => item.arrivedAt !== null && item.deliveredAt !== null && item.arrivedAt < tick && tick < item.deliveredAt)
    .map(item => chip('held', item.message, '', `message ${item.message + 1} is waiting for an earlier message`)).join('') };
  const game: Row = { label: 'Game receives', cells: tick => items.filter(item => item.deliveredAt === tick).map(item => chip('deliver', item.message, '', `the game receives message ${item.message + 1}`)).join('') };
  return protocol === 'tcp' ? [sent, arrives, held, game] : [sent, arrives, game];
}

/** One timeline table. Columns after `at` are marked as future so a time slider can reveal the run. */
export function timelineHtml(protocol: Protocol, result: LossResult, at: number): string {
  const items = protocol === 'tcp' ? result.tcp : result.udp;
  const ticks = Array.from({ length: result.lastTick + 1 }, (_value, tick) => tick);
  const head = ticks.map(tick => `<th scope="col" class="tl__tick${tick > at ? ' is-future' : ''}" data-tick="${tick}">${tick}</th>`).join('');
  const body = rows(protocol, items).map(row => `<tr><th scope="row">${row.label}</th>${ticks.map(tick => `<td class="tl__cell${tick > at ? ' is-future' : ''}" data-tick="${tick}">${row.cells(tick)}</td>`).join('')}</tr>`).join('');
  const name = protocol === 'tcp' ? 'TCP' : 'UDP';
  return `<table class="tl__table" data-tl-table="${protocol}"><caption class="sr-only">${name} timeline. Columns are ticks of time; messages are numbered from 1.</caption><thead><tr><th scope="col"><span class="sr-only">Row</span></th>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export interface HeaderField { readonly label: string; readonly bits: number; readonly meaning: string }

/** Rows of 32 bits, as in the standards' diagrams. */
export const headers: Record<Protocol, readonly (readonly HeaderField[])[]> = {
  udp: [
    [{ label: 'Source port', bits: 16, meaning: 'Identifies the sending socket on its computer.' }, { label: 'Destination port', bits: 16, meaning: 'Identifies the receiving socket on its computer.' }],
    [{ label: 'Length', bits: 16, meaning: 'Header plus data, in bytes.' }, { label: 'Checksum', bits: 16, meaning: 'Detects corrupted bits in the header and data.' }],
  ],
  tcp: [
    [{ label: 'Source port', bits: 16, meaning: 'Identifies the sending socket on its computer.' }, { label: 'Destination port', bits: 16, meaning: 'Identifies the receiving socket on its computer.' }],
    [{ label: 'Sequence number', bits: 32, meaning: 'Position in the byte stream of the first data byte in this segment.' }],
    [{ label: 'Acknowledgement number', bits: 32, meaning: 'The next byte the sender of this segment expects to receive.' }],
    [{ label: 'Offset', bits: 4, meaning: 'Header length in 32-bit words; 5 means 20 bytes.' }, { label: 'Reserved + flags', bits: 12, meaning: 'Flag bits such as SYN, ACK, FIN and RST say what kind of segment this is.' }, { label: 'Window', bits: 16, meaning: 'How many more bytes the sender of this segment will accept (flow control).' }],
    [{ label: 'Checksum', bits: 16, meaning: 'Detects corrupted bits in the header and data.' }, { label: 'Urgent pointer', bits: 16, meaning: 'Used only with the URG flag, which is rarely used.' }],
  ],
};

export function headerBytes(protocol: Protocol): number {
  return headers[protocol].reduce((sum, row) => sum + row.reduce((inner, field) => inner + field.bits, 0), 0) / 8;
}
