// The journey of one game message from send() to recv(), for the PacketPath diagram (lesson 9.3).
import type { PartId } from '../lib/packet-model';

export type Zone = 'user' | 'kernel' | 'hardware' | 'wire';
export type Side = 'send' | 'network' | 'receive';
export type OsiRow = 'application' | 'presentation' | 'session' | 'transport' | 'network' | 'datalink' | 'physical';

export interface PathStep {
  readonly side: Side;
  readonly zone: Zone;
  readonly title: string;
  readonly caption: string;
  /** Parts of the frame that exist at this moment. */
  readonly parts: readonly PartId[];
  /** Parts added or rewritten by this step, drawn with emphasis. */
  readonly fresh: readonly PartId[];
  readonly osi: OsiRow;
}

const all: readonly PartId[] = ['ethernet', 'ip', 'transport', 'data', 'padding', 'fcs'];

export const zoneNames: Record<Zone, string> = { user: 'User space', kernel: 'Kernel', hardware: 'Network card', wire: 'On the wire' };
export const sideNames: Record<Side, string> = { send: 'Sending computer', network: 'Between the computers', receive: 'Receiving computer' };

export const pathSteps: readonly PathStep[] = [
  { side: 'send', zone: 'user', osi: 'application', parts: ['data'], fresh: ['data'], title: 'Game code calls send()',
    caption: 'The message sits in the program’s own memory. The program hands it to the socket API; it builds no headers itself.' },
  { side: 'send', zone: 'kernel', osi: 'transport', parts: ['data'], fresh: [], title: 'The kernel copies it into the socket’s send buffer',
    caption: 'The operating system copies the bytes out of the program’s memory into a buffer owned by the socket. send() can return once the copy is made; that says nothing about arrival.' },
  { side: 'send', zone: 'kernel', osi: 'transport', parts: ['transport', 'data'], fresh: ['transport'], title: 'The transport layer adds its header',
    caption: 'UDP adds 8 bytes: ports, length, checksum. TCP adds 20: ports, sequence and acknowledgement numbers, flags, window, checksum. The result is a datagram (UDP) or a segment (TCP).' },
  { side: 'send', zone: 'kernel', osi: 'network', parts: ['ip', 'transport', 'data'], fresh: ['ip'], title: 'The IP layer adds the IP header',
    caption: 'Twenty bytes with the source and destination addresses, a time-to-live and the protocol number. The kernel also consults its routing table to choose the next hop and the outgoing interface. The result is a packet.' },
  { side: 'send', zone: 'kernel', osi: 'network', parts: ['ip', 'transport', 'data'], fresh: [], title: 'The packet waits in an output queue',
    caption: 'When several packets are ready, a queue decides which one the card gets next. Linux calls this the queueing discipline, or qdisc. Other systems have comparable queues under other names.' },
  { side: 'send', zone: 'kernel', osi: 'datalink', parts: all, fresh: ['ethernet', 'padding', 'fcs'], title: 'The link layer wraps it in an Ethernet frame',
    caption: 'A 14-byte header holds the next hop’s MAC address, this card’s MAC address and the EtherType (0x0800 means IPv4). A 4-byte check sequence goes at the end, usually computed by the card. A frame shorter than 64 bytes is padded.' },
  { side: 'send', zone: 'hardware', osi: 'physical', parts: all, fresh: [], title: 'The driver hands the frame to the card, which sends bits',
    caption: 'The driver places a descriptor for the frame in a ring buffer in memory. The card reads the frame by direct memory access and turns each byte into signals on the cable or radio: bits.' },
  { side: 'network', zone: 'wire', osi: 'datalink', parts: all, fresh: [], title: 'A switch forwards the frame',
    caption: 'A switch reads only the Ethernet header and sends the frame out of the port where the destination MAC address was last seen. The IP packet inside is untouched.' },
  { side: 'network', zone: 'wire', osi: 'network', parts: all, fresh: ['ethernet', 'ip', 'fcs'], title: 'A router moves the packet onto the next link',
    caption: 'The router throws away the old Ethernet header and check sequence, lowers the IP time-to-live by one, recalculates the IP header checksum and wraps the same packet in a new frame. The transport header and the data are not touched.' },
  { side: 'receive', zone: 'hardware', osi: 'physical', parts: all, fresh: [], title: 'The receiving card accepts the frame',
    caption: 'The card checks the destination MAC address and the check sequence; a damaged frame is dropped. A good frame is written into a ring buffer in memory by direct memory access, and the card raises an interrupt.' },
  { side: 'receive', zone: 'kernel', osi: 'datalink', parts: all, fresh: [], title: 'An interrupt, then deferred processing',
    caption: 'The CPU pauses its work to run a short interrupt handler, which schedules the longer work for later. On Linux that is a softirq run by ksoftirqd; on Windows it is a deferred procedure call. That work empties the ring buffer.' },
  { side: 'receive', zone: 'kernel', osi: 'datalink', parts: ['ip', 'transport', 'data'], fresh: [], title: 'The Ethernet header is removed',
    caption: 'The EtherType says the payload is IPv4, so the packet goes to the IP layer. The link header and trailer have done their one-hop job.' },
  { side: 'receive', zone: 'kernel', osi: 'network', parts: ['transport', 'data'], fresh: [], title: 'The IP header is checked and removed',
    caption: 'The kernel verifies the header checksum and that the destination address is this computer, then reads the protocol number (17 means UDP, 6 means TCP) to choose the transport layer.' },
  { side: 'receive', zone: 'kernel', osi: 'transport', parts: ['data'], fresh: [], title: 'The transport layer finds the socket',
    caption: 'The destination port (for TCP, the whole four-tuple) identifies the socket. TCP also acknowledges, reorders and discards duplicates. The data is placed in the socket’s receive buffer.' },
  { side: 'receive', zone: 'user', osi: 'application', parts: ['data'], fresh: ['data'], title: 'Game code calls recv()',
    caption: 'The kernel copies the bytes from the receive buffer into the program’s memory. Only now does the program see them. With TCP, one recv() need not return exactly what one send() sent, so the game must mark its own message boundaries.' },
];

export interface OsiLayer {
  readonly id: OsiRow;
  readonly number: number;
  readonly name: string;
  readonly examples: string;
  readonly group: 'host' | 'media';
}

export const osiLayers: readonly OsiLayer[] = [
  { id: 'application', number: 7, name: 'Application', examples: 'HTTP, FTP, your game protocol', group: 'host' },
  { id: 'presentation', number: 6, name: 'Presentation', examples: 'Encoding, compression, TLS encryption', group: 'host' },
  { id: 'session', number: 5, name: 'Session', examples: 'Keeping a conversation open', group: 'host' },
  { id: 'transport', number: 4, name: 'Transport', examples: 'TCP, UDP', group: 'host' },
  { id: 'network', number: 3, name: 'Network', examples: 'IP; routers', group: 'media' },
  { id: 'datalink', number: 2, name: 'Data link', examples: 'Ethernet, Wi-Fi; switches', group: 'media' },
  { id: 'physical', number: 1, name: 'Physical', examples: 'Cables, radio, the network card', group: 'media' },
];
