// Sizes of one Ethernet frame carrying a game message over IPv4. Every constant is a published field size:
// Ethernet II header 14 bytes (destination MAC 6, source MAC 6, EtherType 2) and a 4-byte frame check sequence,
// IPv4 header 20 bytes without options, UDP header 8 bytes, TCP header 20 bytes without options.
export type Transport = 'udp' | 'tcp';
export type PartId = 'ethernet' | 'ip' | 'transport' | 'data' | 'padding' | 'fcs';

export const ETHERNET_HEADER = 14;
export const FRAME_CHECK = 4;
export const IPV4_HEADER = 20;
export const UDP_HEADER = 8;
export const TCP_HEADER = 20;
/** Largest IP packet an Ethernet link carries by default. */
export const MTU = 1500;
/** A frame, including its check sequence, is never shorter than this; shorter ones are padded. */
export const MIN_FRAME = 64;
export const MAX_UDP_MESSAGE = MTU - IPV4_HEADER - UDP_HEADER;
export const MAX_TCP_SEGMENT_DATA = MTU - IPV4_HEADER - TCP_HEADER;
/** TCP is a byte stream, so the reader may enter several segments' worth. */
export const MAX_TCP_STREAM = 4 * MAX_TCP_SEGMENT_DATA;

export interface PacketPart { readonly id: PartId; readonly label: string; readonly bytes: number }

export interface FrameSizes {
  readonly transport: Transport;
  readonly message: number;
  /** Bytes of the message carried by the first frame. */
  readonly firstData: number;
  readonly segments: number;
  readonly transportHeader: number;
  /** UDP datagram or TCP segment. */
  readonly transportUnit: number;
  readonly ipPacket: number;
  readonly padding: number;
  /** Bytes in the frame including the check sequence. */
  readonly frame: number;
  readonly overheadBytes: number;
  readonly parts: readonly PacketPart[];
}

export function maxMessage(transport: Transport): number {
  return transport === 'udp' ? MAX_UDP_MESSAGE : MAX_TCP_STREAM;
}

export function isValidMessage(transport: Transport, message: number): boolean {
  return Number.isInteger(message) && message >= 1 && message <= maxMessage(transport);
}

export function frameSizes(transport: Transport, message: number): FrameSizes {
  if (!isValidMessage(transport, message)) throw new RangeError(`message must be a whole number from 1 to ${maxMessage(transport)}`);
  const transportHeader = transport === 'udp' ? UDP_HEADER : TCP_HEADER;
  const perFrame = transport === 'udp' ? MAX_UDP_MESSAGE : MAX_TCP_SEGMENT_DATA;
  const firstData = Math.min(message, perFrame);
  const transportUnit = transportHeader + firstData;
  const ipPacket = IPV4_HEADER + transportUnit;
  const minimumPayload = MIN_FRAME - ETHERNET_HEADER - FRAME_CHECK;
  const padding = Math.max(0, minimumPayload - ipPacket);
  const frame = ETHERNET_HEADER + ipPacket + padding + FRAME_CHECK;
  const parts: PacketPart[] = [
    { id: 'ethernet', label: 'Ethernet header', bytes: ETHERNET_HEADER },
    { id: 'ip', label: 'IP header', bytes: IPV4_HEADER },
    { id: 'transport', label: transport === 'udp' ? 'UDP header' : 'TCP header', bytes: transportHeader },
    { id: 'data', label: 'Game message', bytes: firstData },
    ...(padding > 0 ? [{ id: 'padding' as const, label: 'Padding', bytes: padding }] : []),
    { id: 'fcs', label: 'Check sequence', bytes: FRAME_CHECK },
  ];
  return {
    transport, message, firstData, segments: Math.ceil(message / perFrame), transportHeader, transportUnit, ipPacket, padding, frame,
    overheadBytes: frame - firstData, parts,
  };
}

export function overheadPercent(sizes: FrameSizes): number {
  return Math.round((sizes.overheadBytes / sizes.frame) * 100);
}

const fmt = (value: number): string => value.toLocaleString('en-US');

/** One sentence that follows the numbers from the message to the frame. Used by the server render and the script. */
export function describeSizes(sizes: FrameSizes): string {
  const unit = sizes.transport === 'udp' ? 'datagram' : 'segment';
  const pad = sizes.padding > 0 ? ` The frame is padded by ${sizes.padding} bytes to reach the 64-byte minimum.` : '';
  const split = sizes.segments > 1 ? ` TCP would split this stream into ${sizes.segments} segments; the first is shown.` : '';
  return `A ${fmt(sizes.firstData)}-byte message becomes a ${fmt(sizes.transportUnit)}-byte ${unit}, a ${fmt(sizes.ipPacket)}-byte IP packet and a ${fmt(sizes.frame)}-byte frame: ${fmt(sizes.overheadBytes)} of ${fmt(sizes.frame)} bytes (${overheadPercent(sizes)}%) are wrapping.${pad}${split}`;
}

/** Bytes present while only some wrappers exist, for example before the Ethernet header is added. */
export function describePresent(parts: readonly PacketPart[], present: readonly PartId[]): string {
  const shown = parts.filter(part => present.includes(part.id));
  const total = shown.reduce((sum, part) => sum + part.bytes, 0);
  return `${fmt(total)} bytes at this step: ${shown.map(part => `${part.label.toLowerCase()} ${fmt(part.bytes)}`).join(' + ')}.`;
}
