// Message-flow scenarios for lesson 9.1 (src/content/docs/pages/6/01.mdx): who owns which data, and in what order a purchase or a
// leaderboard update reaches it. Plain data for FlowDiagram.astro; scripts/check-pe-diagram-models.ts checks the ordering claims.
import type { FlowScenario } from '../lib/flow-model';

/** Login, match allocation, asset delivery and the owner of each kind of data. */
export const serviceFlows: readonly FlowScenario[] = [
  {
    id: 'login', tab: 'Log in',
    title: 'Log in: the database owns the account',
    summary: 'Identity comes from the durable account record. After that, every request carries a session instead of the password.',
    lanes: [{ id: 'client', label: 'Client' }, { id: 'gateway', label: 'Gateway' }, { id: 'db', label: 'Database' }],
    steps: [
      { from: 'client', to: 'gateway', kind: 'request', label: 'Log in: name and password', caption: 'The client talks to the gateway, the single public entry point. It never talks to the database itself.' },
      { from: 'gateway', to: 'gateway', kind: 'local', label: 'Middleware checks the request', caption: 'Shared checks run before any service sees it: bound the size, enforce permissions, record the outcome.' },
      { from: 'gateway', to: 'db', kind: 'request', label: 'Look up the account', caption: 'The database is the durable owner of account records and balances. The gateway asks it; it does not keep a copy it would trust more.' },
      { from: 'db', to: 'gateway', kind: 'response', label: 'Account found, password matches', caption: 'The stored (hashed) password agrees with what was sent, so the player is authenticated.' },
      { from: 'gateway', to: 'client', kind: 'response', label: 'Session token', caption: 'A session lets later requests refer to this login. It can outlive one TCP connection, so a dropped socket does not mean logging in again.' },
    ],
  },
  {
    id: 'match', tab: 'Join match 42',
    title: 'Join match 42: one match server owns the world',
    summary: 'The matchmaker only arranges a place to play. The authoritative match server that owns match 42 decides positions and damage.',
    lanes: [{ id: 'client', label: 'Client' }, { id: 'gateway', label: 'Gateway' }, { id: 'matchmaker', label: 'Match-maker' }, { id: 'record', label: 'Owner record' }, { id: 'server', label: 'Match server' }],
    steps: [
      { from: 'client', to: 'gateway', kind: 'request', label: 'Join match 42 with the session', caption: 'The request names the match and carries the token from the login.' },
      { from: 'gateway', to: 'gateway', kind: 'local', label: 'Middleware validates the session', caption: 'An unknown or expired session stops here, before any matchmaking work.' },
      { from: 'gateway', to: 'matchmaker', kind: 'request', label: 'Find or allocate match 42', caption: 'The matchmaker groups compatible players and arranges a match location. It does not calculate their movement.' },
      { from: 'matchmaker', to: 'record', kind: 'control', label: 'Which worker owns match 42?', caption: 'A coordination record says which worker owns the match. If that worker fails, a replacement needs a new ownership generation so the old one cannot write late.' },
      { from: 'record', to: 'matchmaker', kind: 'response', label: 'Owner: this match server', caption: 'The answer names one owner. Commands must go to it, not to a random empty worker.' },
      { from: 'matchmaker', to: 'gateway', kind: 'response', label: 'Match 42 runs on that server', caption: 'The gateway learns where the match lives.' },
      { from: 'gateway', to: 'client', kind: 'response', label: 'Address of the match server', caption: 'The client now knows where to send its game commands.' },
      { from: 'client', to: 'server', kind: 'request', label: 'Game command: move north', caption: 'Commands go to the owner of match 42, which checks them against the rules.' },
      { from: 'server', to: 'client', kind: 'response', label: 'Accepted position (10, 14)', caption: 'The server keeps the accepted state; each client draws what the server accepted. A wall would have left the position at (10, 15).' },
    ],
  },
  {
    id: 'assets', tab: 'Download a patch',
    title: 'Download a patch: assets come from the CDN',
    summary: 'Large files that are the same for every player come from a content delivery network, not from the match server or the database.',
    lanes: [{ id: 'client', label: 'Client' }, { id: 'cdn', label: 'CDN edge' }, { id: 'storage', label: 'Object storage' }],
    steps: [
      { from: 'client', to: 'cdn', kind: 'request', label: 'Get patch file v12', caption: 'The patch is a versioned file, so any nearby copy is as good as the original.' },
      { from: 'cdn', to: 'cdn', kind: 'local', label: 'Cache lookup: no copy yet', caption: 'This edge has not served the file before, so it must go to the origin once.' },
      { from: 'cdn', to: 'storage', kind: 'request', label: 'Fetch the file by its key', caption: 'Object storage keeps larger files addressed by keys, such as versioned patches and replay recordings. It is the origin, the owner of the original bytes.' },
      { from: 'storage', to: 'cdn', kind: 'data', label: 'File bytes', caption: 'The origin returns the file.' },
      { from: 'cdn', to: 'client', kind: 'data', label: 'File bytes, copy kept at the edge', caption: 'The edge stores a copy for later requests that are eligible for caching.' },
      { from: 'client', to: 'cdn', kind: 'request', label: 'The next player asks for v12', caption: 'A different player, near the same edge, asks for the same file.' },
      { from: 'cdn', to: 'client', kind: 'data', label: 'Served from the edge', caption: 'A cache hit avoids the origin fetch. Personal account responses follow separate rules: an old cached balance must never authorize a new purchase.' },
    ],
  },
  {
    id: 'owners', tab: 'Who owns what',
    title: 'Three questions, three owners',
    summary: 'Each kind of data has one place that is allowed to answer authoritatively. The gateway routes; it owns none of them.',
    lanes: [{ id: 'client', label: 'Client' }, { id: 'gateway', label: 'Gateway' }, { id: 'server', label: 'Match server' }, { id: 'db', label: 'Database' }, { id: 'cache', label: 'Cache' }],
    steps: [
      { from: 'client', to: 'gateway', kind: 'request', label: 'Ask: move north', caption: 'A request to change the world. The gateway checks it and routes it, but does not decide the result.' },
      { from: 'gateway', to: 'server', kind: 'request', label: 'Route to the match’s owner', caption: 'Positions and damage belong to the authoritative match server for that match.' },
      { from: 'server', to: 'client', kind: 'response', label: 'Accepted position (10, 14)', caption: 'Owner of positions: the match server. Its answer is the truth the clients show.' },
      { from: 'client', to: 'gateway', kind: 'request', label: 'Ask: what is my balance?', caption: 'A question about money, which must be exactly right.' },
      { from: 'gateway', to: 'db', kind: 'request', label: 'Read the balance', caption: 'Owner of balances and inventory: the database, in protected, durable storage.' },
      { from: 'db', to: 'client', kind: 'response', label: 'Balance: 1,000 coins', caption: 'A current, authoritative answer. A cached value could be old, so it is never used to approve spending.' },
      { from: 'client', to: 'gateway', kind: 'request', label: 'Ask: how many players in the lobby?', caption: 'A question where a slightly old answer is harmless.' },
      { from: 'gateway', to: 'cache', kind: 'request', label: 'Read the cached count', caption: 'A cache holds a reusable result that can be rebuilt. It owns no original data.' },
      { from: 'cache', to: 'client', kind: 'response', label: 'Count, possibly a few seconds old', caption: 'Fast and cheap, and good enough for a label. If it is lost, it is rebuilt from the real data.' },
    ],
  },
];

/** One purchase, one effect; and a leaderboard that is allowed to lag. */
export const consistencyFlows: readonly FlowScenario[] = [
  {
    id: 'purchase', tab: 'Buy an item',
    title: 'Buy an item: one transaction, three changes',
    summary: 'The player has 1,000 coins and asks for a 300-coin item with request P7. The debit, the item and the receipt commit together or not at all.',
    lanes: [{ id: 'client', label: 'Client' }, { id: 'gateway', label: 'Gateway' }, { id: 'service', label: 'Game service' }, { id: 'db', label: 'Database' }],
    steps: [
      { from: 'client', to: 'gateway', kind: 'request', label: 'Buy the item for 300 coins (P7)', caption: 'P7 is the request ID. The client states what it wants, but not what it costs: the server knows the price.' },
      { from: 'gateway', to: 'service', kind: 'request', label: 'Forward P7 for this account', caption: 'After the middleware checks, the request reaches the service that owns purchases.' },
      { from: 'service', to: 'db', kind: 'control', label: 'Begin transaction', caption: 'From here to the commit, the changes are all-or-nothing.' },
      { from: 'service', to: 'db', kind: 'request', label: 'Read the price (300) and the balance (1,000)', caption: 'The server’s own price decides the cost. The read is protected by isolation or a lock, so a second request cannot spend the same coins in between.' },
      { from: 'db', to: 'db', kind: 'local', label: 'Debit to 700, add item, record P7', caption: '1,000 − 300 = 700. Three changes: the coins, the item, and the receipt for P7. None of them is visible to anyone else yet.' },
      { from: 'service', to: 'db', kind: 'control', label: 'Commit', caption: 'Only now do all three changes become visible together. A crash before this point would have undone every one of them.' },
      { from: 'db', to: 'service', kind: 'response', label: 'Committed', caption: 'The purchase is durable.' },
      { from: 'service', to: 'gateway', kind: 'response', label: 'Item granted, balance 700 (P7)', caption: 'The reply is sent only after the commit, so the player never sees an effect that could still vanish.' },
      { from: 'gateway', to: 'client', kind: 'response', label: 'Item granted, balance 700 (P7)', caption: 'The client shows the new balance.' },
    ],
  },
  {
    id: 'retry', tab: 'Retry P7',
    title: 'Retry after a lost reply: the receipt answers',
    summary: 'The reply to P7 never arrives, so the client sends P7 again. Idempotency means the repeat has the same effect as one request: no second debit, no second item.',
    lanes: [{ id: 'client', label: 'Client' }, { id: 'gateway', label: 'Gateway' }, { id: 'service', label: 'Game service' }, { id: 'db', label: 'Database' }],
    steps: [
      { from: 'client', to: 'client', kind: 'local', label: 'The reply to P7 never arrives', caption: 'The purchase did commit, but the client cannot know that: the network lost the answer.' },
      { from: 'client', to: 'gateway', kind: 'request', label: 'Retry the same request ID: P7', caption: 'Because the ID is the same, the server can tell this is a repeat and not a second purchase.' },
      { from: 'gateway', to: 'service', kind: 'request', label: 'Forward P7', caption: 'The retry takes the same route as the original.' },
      { from: 'service', to: 'db', kind: 'request', label: 'Look up the receipt for P7', caption: 'The ID is scoped to the account. A changed payload under the same ID would be rejected, not merged.' },
      { from: 'db', to: 'service', kind: 'response', label: 'Receipt found: item granted, balance 700', caption: 'The receipt was saved in the same transaction as the effect, so it exists exactly when the purchase does.' },
      { from: 'service', to: 'gateway', kind: 'response', label: 'The recorded result of P7', caption: 'The service returns the stored result. It does not debit again and does not grant a second item.' },
      { from: 'gateway', to: 'client', kind: 'response', label: 'Item granted, balance 700 (P7)', caption: 'The client finally gets its answer. The balance is still 700, not 400.' },
    ],
  },
  {
    id: 'leaderboard', tab: 'Leaderboard',
    title: 'Leaderboard: allowed to lag, in a known way',
    summary: 'An accepted score is durable at once, but the leaderboard is a derived view. It may show the old score until it catches up, which is fine for a ranking and wrong for a balance.',
    lanes: [{ id: 'server', label: 'Match server' }, { id: 'db', label: 'Database' }, { id: 'cache', label: 'Cache' }, { id: 'player', label: 'Player' }],
    steps: [
      { from: 'server', to: 'db', kind: 'request', label: 'Save the accepted score: 10 to 12', caption: 'The score is a fact the match server has accepted. The database stores it durably.' },
      { from: 'db', to: 'server', kind: 'response', label: 'Committed: the score is 12', caption: 'Anyone who reads the database now sees 12.' },
      { from: 'player', to: 'cache', kind: 'request', label: 'Open the leaderboard', caption: 'The page reads a derived view held in a cache, not the database, so the database stays free for important work.' },
      { from: 'cache', to: 'player', kind: 'data', label: 'Shows 10: an older view', caption: 'The view has not heard about the 12 yet. Showing a clearly dated value is acceptable here.' },
      { from: 'db', to: 'cache', kind: 'control', label: 'Rebuild the view from the new score', caption: 'Eventual consistency promises that the view converges once updates stop and propagation succeeds. It does not promise how long that takes.' },
      { from: 'player', to: 'cache', kind: 'request', label: 'Refresh the leaderboard', caption: 'The player asks again, some time later.' },
      { from: 'cache', to: 'player', kind: 'data', label: 'Shows 12', caption: 'The view caught up. The same lag would not be acceptable for authorizing a purchase, which needs a current protected decision.' },
    ],
  },
];
