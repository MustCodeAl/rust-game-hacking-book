// Message-flow scenarios for lesson 9.3 (src/content/docs/pages/6/02.mdx).
// 203.0.113.0/24 is the documentation range reserved for examples (RFC 5737).
import type { FlowScenario } from '../lib/flow-model';

export const infrastructureFlows: readonly FlowScenario[] = [
  {
    id: 'dhcp', tab: 'Get configured',
    title: 'DHCP: a device joins the LAN',
    summary: 'A device with no address asks the network for a lease. The reply also names the router and the DNS servers.',
    lanes: [{ id: 'client', label: 'New device' }, { id: 'server', label: 'DHCP server' }],
    steps: [
      { from: 'client', to: 'server', kind: 'control', label: 'DISCOVER (broadcast)', caption: 'The device has no address yet, so it shouts to everyone on the LAN: is there a DHCP server?' },
      { from: 'server', to: 'client', kind: 'control', label: 'OFFER: 192.168.1.40', caption: 'The server proposes an address and a lease time, plus the router and DNS server addresses.' },
      { from: 'client', to: 'server', kind: 'control', label: 'REQUEST: I accept 192.168.1.40', caption: 'The device accepts one offer. If several servers answered, this tells the others to withdraw.' },
      { from: 'server', to: 'client', kind: 'control', label: 'ACK: lease confirmed', caption: 'The lease is now recorded. The device configures itself; it has learned nothing about any game server yet.' },
    ],
  },
  {
    id: 'dns', tab: 'Look up a name',
    title: 'DNS: from a name to an address',
    summary: 'A resolver follows the name to the CDN and returns one address. Nothing is downloaded yet.',
    lanes: [{ id: 'client', label: 'Client' }, { id: 'resolver', label: 'Resolver' }, { id: 'site', label: "Site's DNS" }, { id: 'cdn', label: "CDN's DNS" }],
    steps: [
      { from: 'client', to: 'resolver', kind: 'request', label: 'assets.example?', caption: 'The client asks the resolver it was configured with (often learned through DHCP).' },
      { from: 'resolver', to: 'resolver', kind: 'local', label: 'Check cache: nothing fresh', caption: 'A cached answer that has not expired would end the lookup here.' },
      { from: 'resolver', to: 'site', kind: 'request', label: 'assets.example?', caption: 'The resolver asks the name servers responsible for the name. Root and top-level referrals are left out to keep the picture short.' },
      { from: 'site', to: 'resolver', kind: 'response', label: 'CNAME assets.example.cdn.example', caption: 'The site points its name at the CDN’s name. The site’s DNS does not hold the file or the final address.' },
      { from: 'resolver', to: 'cdn', kind: 'request', label: 'assets.example.cdn.example?', caption: 'The resolver now asks the CDN’s name servers about the CDN’s own name.' },
      { from: 'cdn', to: 'resolver', kind: 'response', label: 'A 203.0.113.7 · TTL 30 s', caption: 'The CDN chooses an edge near the resolver and sets a short lifetime, so it can steer players elsewhere soon.' },
      { from: 'resolver', to: 'client', kind: 'response', label: '203.0.113.7', caption: 'The resolver remembers the answer for 30 seconds and returns it. The client has an address, not the map.' },
    ],
  },
  {
    id: 'cdn-hit', tab: 'Fetch: cache hit',
    title: 'CDN edge with a fresh copy',
    summary: 'After the connection and TLS handshake, a nearby edge answers from its cache.',
    lanes: [{ id: 'client', label: 'Client' }, { id: 'edge', label: 'CDN edge' }],
    steps: [
      { from: 'client', to: 'edge', kind: 'request', label: 'HTTPS: GET /maps/42.bin', caption: 'The client connects to 203.0.113.7, completes the TLS handshake, then asks for the map.' },
      { from: 'edge', to: 'edge', kind: 'local', label: 'Cache lookup: fresh copy found', caption: 'The edge may reuse a stored copy while the origin’s cache rules say it is still fresh.' },
      { from: 'edge', to: 'client', kind: 'response', label: '200 OK + map bytes', caption: 'The map arrives from a nearby machine; the origin never saw this request.' },
    ],
  },
  {
    id: 'cdn-miss', tab: 'Fetch: cache miss',
    title: 'CDN edge without a copy',
    summary: 'A miss climbs the cache hierarchy toward the origin, and each cache may keep the answer on the way back.',
    lanes: [{ id: 'client', label: 'Client' }, { id: 'edge', label: 'CDN edge' }, { id: 'parent', label: 'Regional cache' }, { id: 'origin', label: 'Origin' }],
    steps: [
      { from: 'client', to: 'edge', kind: 'request', label: 'HTTPS: GET /maps/42.bin', caption: 'The request is the same as before; the client cannot tell hit from miss.' },
      { from: 'edge', to: 'edge', kind: 'local', label: 'Cache lookup: miss', caption: 'The edge has no usable copy.' },
      { from: 'edge', to: 'parent', kind: 'request', label: 'GET /maps/42.bin', caption: 'A larger regional cache is asked before the distant origin.' },
      { from: 'parent', to: 'origin', kind: 'request', label: 'GET /maps/42.bin (miss too)', caption: 'The regional cache also misses, so it fetches from the origin storage.' },
      { from: 'origin', to: 'parent', kind: 'response', label: '200 OK + map bytes', caption: 'The origin supplies the file. The regional cache stores a copy if the response headers allow it.' },
      { from: 'parent', to: 'edge', kind: 'response', label: '200 OK + map bytes', caption: 'The edge receives the file and can store it too.' },
      { from: 'edge', to: 'client', kind: 'response', label: '200 OK + map bytes', caption: 'The player waits for the whole chain once. The next nearby request is a hit until the copy expires.' },
    ],
  },
];

const clientServer = [{ id: 'client', label: 'Client' }, { id: 'server', label: 'Server' }] as const;

export const protocolFlows: readonly FlowScenario[] = [
  {
    id: 'http', tab: 'HTTP',
    title: 'HTTP/1.1 over TCP',
    summary: 'A connection first, then one request and one response.',
    lanes: clientServer,
    steps: [
      { from: 'client', to: 'server', kind: 'control', label: 'TCP handshake: SYN', caption: 'HTTP/1.1 normally runs on TCP, so the connection is set up first. The three handshake packets are drawn as one step here.' },
      { from: 'client', to: 'server', kind: 'request', label: 'GET /lobby HTTP/1.1', caption: 'The request names a method, a path and headers. HTTP itself is readable text.' },
      { from: 'server', to: 'client', kind: 'response', label: '200 OK + body', caption: 'The response carries a status code, headers and the content. The connection can stay open for the next request.' },
    ],
  },
  {
    id: 'https', tab: 'HTTPS',
    title: 'HTTPS: HTTP inside TLS 1.3',
    summary: 'The same request, after both sides have agreed on keys.',
    lanes: clientServer,
    steps: [
      { from: 'client', to: 'server', kind: 'control', label: 'TCP handshake first', caption: 'TLS rides on a TCP connection, so TCP is set up before any TLS message.' },
      { from: 'client', to: 'server', kind: 'secure', label: 'ClientHello + key share', caption: 'The client offers its supported algorithms and a public key share.' },
      { from: 'server', to: 'client', kind: 'secure', label: 'ServerHello + key share + certificate', caption: 'Both sides combine the key shares into the same session keys. The certificate proves the server’s identity, and it already travels encrypted.' },
      { from: 'client', to: 'server', kind: 'secure', label: 'Finished', caption: 'The client checks the certificate and confirms the handshake. Now encrypted application data can flow.' },
      { from: 'client', to: 'server', kind: 'secure', label: 'Encrypted: GET /lobby', caption: 'The HTTP request is the same text as before, but an observer on the path sees only encrypted bytes.' },
      { from: 'server', to: 'client', kind: 'secure', label: 'Encrypted: 200 OK + body', caption: 'The response is protected in the same way.' },
    ],
  },
  {
    id: 'http3', tab: 'HTTP/3',
    title: 'HTTP/3 over QUIC and UDP',
    summary: 'QUIC joins the transport handshake and TLS 1.3, then carries independent streams.',
    lanes: clientServer,
    steps: [
      { from: 'client', to: 'server', kind: 'secure', label: 'Initial: ClientHello + key share', caption: 'QUIC runs over UDP datagrams and includes TLS 1.3 in its own handshake, so transport and security start together.' },
      { from: 'server', to: 'client', kind: 'secure', label: 'Initial/Handshake + certificate', caption: 'The server answers with its key share and certificate, protected as the handshake proceeds.' },
      { from: 'client', to: 'server', kind: 'secure', label: 'Finished + first request', caption: 'The client can send its HTTP/3 request on a new stream as soon as the keys are ready.' },
      { from: 'server', to: 'client', kind: 'secure', label: 'Stream 0: HTTP response', caption: 'Each request uses its own stream, identified by a stream ID.' },
      { from: 'client', to: 'server', kind: 'secure', label: 'Stream 4: another request', caption: 'Streams are independent. A lost packet carrying one stream need not stall the other stream, although both share the connection’s congestion limits.' },
    ],
  },
  {
    id: 'websocket', tab: 'WebSocket',
    title: 'WebSocket: upgrade, then both ways',
    summary: 'An HTTP request turns the connection into a two-way message channel.',
    lanes: clientServer,
    steps: [
      { from: 'client', to: 'server', kind: 'request', label: 'GET /chat + Upgrade: websocket', caption: 'The handshake is an ordinary HTTP/1.1 request that asks to switch protocols. With wss it runs inside TLS.' },
      { from: 'server', to: 'client', kind: 'response', label: '101 Switching Protocols', caption: 'The server agrees. From now on the same connection carries WebSocket frames, not HTTP messages.' },
      { from: 'client', to: 'server', kind: 'data', label: 'Frame: join lobby 7', caption: 'The client sends a framed message whenever it likes.' },
      { from: 'server', to: 'client', kind: 'data', label: 'Frame: lobby 7 roster', caption: 'The server can reply at any moment; no new request is needed.' },
      { from: 'server', to: 'client', kind: 'data', label: 'Frame: player joined', caption: 'The server can also push a message nobody asked for. That is why it suits live chat.' },
    ],
  },
  {
    id: 'tcp', tab: 'TCP',
    title: 'TCP: connect, send, close',
    summary: 'Reliable ordered bytes need a handshake, acknowledgements and a teardown.',
    lanes: clientServer,
    steps: [
      { from: 'client', to: 'server', kind: 'control', label: 'SYN', caption: 'The client proposes a connection and its starting sequence number.' },
      { from: 'server', to: 'client', kind: 'control', label: 'SYN + ACK', caption: 'The server agrees, proposes its own starting number and acknowledges the client’s.' },
      { from: 'client', to: 'server', kind: 'control', label: 'ACK', caption: 'The client acknowledges the server’s number. Both sides now agree on the connection.' },
      { from: 'client', to: 'server', kind: 'data', label: 'Data: 100 bytes (seq 1–100)', caption: 'Every byte has a sequence number so the receiver can put bytes in order and spot gaps.' },
      { from: 'server', to: 'client', kind: 'control', label: 'ACK 101', caption: 'The acknowledgement names the next byte the server expects, which confirms bytes 1 to 100.' },
      { from: 'client', to: 'server', kind: 'control', label: 'FIN', caption: 'The client has nothing more to send and starts closing its direction.' },
      { from: 'server', to: 'client', kind: 'control', label: 'ACK + FIN', caption: 'The server acknowledges and closes its own direction too.' },
      { from: 'client', to: 'server', kind: 'control', label: 'ACK', caption: 'The final acknowledgement finishes the close. The client keeps the connection record briefly to catch stray late packets.' },
    ],
  },
  {
    id: 'udp', tab: 'UDP',
    title: 'UDP: just send a datagram',
    summary: 'No setup, no acknowledgements, no automatic resend.',
    lanes: clientServer,
    steps: [
      { from: 'client', to: 'server', kind: 'data', label: 'Datagram: position update #41', caption: 'There is no handshake. The first packet already carries game data.' },
      { from: 'server', to: 'client', kind: 'data', label: 'Datagram: world snapshot', caption: 'Any reply is another independent datagram, sent when the server decides to send it.' },
      { from: 'client', to: 'server', kind: 'data', label: 'Datagram: position update #42', caption: 'If a datagram vanishes nothing is resent for you. The game’s own sequence numbers can show the gap.' },
    ],
  },
  {
    id: 'smtp', tab: 'SMTP',
    title: 'SMTP: mail moves between servers',
    summary: 'A short text conversation hands the message from one mail server to the next.',
    lanes: [{ id: 'sender', label: 'Sender’s app' }, { id: 'out', label: 'Sender’s server' }, { id: 'in', label: 'Recipient’s server' }],
    steps: [
      { from: 'sender', to: 'out', kind: 'request', label: 'EHLO, MAIL FROM, RCPT TO', caption: 'SMTP is a text conversation. The client names itself, the sender and the recipient before any message is sent.' },
      { from: 'sender', to: 'out', kind: 'data', label: 'DATA: headers + body', caption: 'Then the message itself, ending with a line that holds only a dot.' },
      { from: 'out', to: 'sender', kind: 'response', label: '250 OK, queued', caption: 'The server accepts responsibility for delivering the message.' },
      { from: 'out', to: 'in', kind: 'request', label: 'Relay: the same SMTP commands', caption: 'The server finds the recipient domain’s mail server through DNS and repeats the conversation with it.' },
      { from: 'in', to: 'out', kind: 'response', label: '250 OK, accepted', caption: 'The receiving server takes the message.' },
      { from: 'in', to: 'in', kind: 'local', label: 'Store in the recipient’s mailbox', caption: 'Reading mail later uses other protocols such as IMAP. SMTP only moves the message along.' },
    ],
  },
  {
    id: 'ftp', tab: 'FTP',
    title: 'FTP: commands and files on separate connections',
    summary: 'One connection carries commands; a second connection carries each file.',
    lanes: clientServer,
    steps: [
      { from: 'client', to: 'server', kind: 'control', label: 'Control: USER, PASS', caption: 'Commands travel on the control connection (port 21). Plain FTP sends the password unencrypted; SFTP and FTPS are the protected options.' },
      { from: 'server', to: 'client', kind: 'control', label: 'Control: 230 logged in', caption: 'Numeric reply codes say what happened.' },
      { from: 'client', to: 'server', kind: 'control', label: 'Control: PASV', caption: 'The client asks the server to open a port for a data connection.' },
      { from: 'server', to: 'client', kind: 'control', label: 'Control: 227 use this data port', caption: 'The reply holds the address and port for the data connection.' },
      { from: 'client', to: 'server', kind: 'control', label: 'Control: RETR map42.bin', caption: 'The client names the file it wants.' },
      { from: 'server', to: 'client', kind: 'data', label: 'Data connection: file bytes', caption: 'The file travels on the second connection, separate from the commands.' },
      { from: 'server', to: 'client', kind: 'control', label: 'Control: 226 transfer complete', caption: 'The control connection reports the end of the transfer.' },
    ],
  },
];
