// A tiny deterministic model of one lost packet. Message i is sent at tick i and arrives `latency` ticks later.
// TCP resends a missing message after `timer` ticks and gives the game its bytes strictly in order.
// UDP gives the game whatever arrives, when it arrives. A resent TCP packet is assumed to arrive.
// Real TCP can resend sooner (fast retransmit after repeated acknowledgements) and tunes its timer; this is a teaching model.

export interface LossInput {
  readonly messages: number;
  /** Zero-based indexes of messages whose first transmission is lost. */
  readonly lost: readonly number[];
  readonly latency: number;
  readonly timer: number;
}

export interface Delivery {
  readonly message: number;
  readonly sentAt: number;
  readonly lost: boolean;
  /** Tick a copy first reaches the receiving computer, or null if none ever does. */
  readonly arrivedAt: number | null;
  /** Tick the game receives it, or null if it never does. */
  readonly deliveredAt: number | null;
  readonly resentAt: number | null;
}

export interface LossResult {
  readonly tcp: readonly Delivery[];
  readonly udp: readonly Delivery[];
  readonly lastTick: number;
}

export const DEFAULT_LOSS: LossInput = { messages: 5, lost: [2], latency: 1, timer: 4 };

export function simulateLoss(input: LossInput): LossResult {
  if (!Number.isInteger(input.messages) || input.messages < 2 || input.messages > 8) throw new RangeError('messages must be 2 to 8');
  if (!Number.isInteger(input.latency) || input.latency < 1 || !Number.isInteger(input.timer) || input.timer < 2) throw new RangeError('latency and timer must be whole ticks');
  const lost = new Set(input.lost.filter(index => index >= 0 && index < input.messages));
  const udp: Delivery[] = [];
  const tcp: Delivery[] = [];
  let ordered = 0;
  for (let message = 0; message < input.messages; message++) {
    const sentAt = message;
    const isLost = lost.has(message);
    const arrivedUdp = isLost ? null : sentAt + input.latency;
    udp.push({ message, sentAt, lost: isLost, arrivedAt: arrivedUdp, deliveredAt: arrivedUdp, resentAt: null });
    const resentAt = isLost ? sentAt + input.timer : null;
    const arrivedTcp = isLost ? (resentAt ?? 0) + input.latency : sentAt + input.latency;
    ordered = Math.max(ordered, arrivedTcp);
    tcp.push({ message, sentAt, lost: isLost, arrivedAt: arrivedTcp, deliveredAt: ordered, resentAt });
  }
  const ticks = [...udp, ...tcp].flatMap(item => [item.arrivedAt, item.deliveredAt, item.resentAt]).filter((tick): tick is number => tick !== null);
  return { tcp, udp, lastTick: Math.max(input.messages - 1, ...ticks) };
}

const list = (numbers: readonly number[]): string => numbers.length === 0 ? 'none'
  : numbers.length === 1 ? String(numbers[0]) : `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;

/** Plain-language outcome used under the timelines. Messages are numbered from 1 for the reader. */
export function describeLoss(result: LossResult): string {
  const lost = result.udp.filter(item => item.lost).map(item => item.message + 1);
  if (lost.length === 0) return 'Nothing is lost, so TCP and UDP both give the game every message the moment it arrives, in order. The difference appears when a packet goes missing.';
  const delayed = result.tcp.filter(item => !item.lost && item.deliveredAt !== null && item.arrivedAt !== null && item.deliveredAt > item.arrivedAt);
  const waits = delayed.map(item => `message ${item.message + 1} waits ${(item.deliveredAt ?? 0) - (item.arrivedAt ?? 0)} ticks`);
  const last = Math.max(...result.tcp.map(item => item.deliveredAt ?? 0));
  const udpNow = result.udp.filter(item => !item.lost).map(item => item.message + 1);
  const tcpText = `TCP resends message ${list(lost)} and gives the game all ${result.tcp.length} in order, finishing at tick ${last}.${waits.length ? ` Messages that had already arrived were held back: ${waits.join('; ')}.` : ''}`;
  const udpText = `UDP gives the game messages ${list(udpNow)} as each arrives and never delivers ${list(lost)} on its own: the game decides whether to ask again or move on to newer data.`;
  return `${tcpText} ${udpText}`;
}
