// Live calculators for lessons in group C5 (pages/9, pages/10, pages/11). Each lab is a pure function from its inputs to one
// cell frame; they register through live-labs.ts. Colours as there: blue = data, orange = addresses and paths,
// green = accepted or the right call, red = refused or fooled, purple = rules, yellow = arithmetic, gray = unused.
import { cell as c, frame, hot as h, panel, row, type Cell, type CellFrame } from './cell-model';
import type { LiveLab, LiveValues } from './live-model';

const text = (values: LiveValues, id: string): string => values[id] ?? '';
const comma = (value: number): string => value.toLocaleString('en-US');
const byteText = (value: number): string => value.toString(16).toUpperCase().padStart(2, '0');
const hex = (value: number, digits: number): string => `0x${value.toString(16).toUpperCase().padStart(digits, '0')}`;

function integer(values: LiveValues, id: string, label: string, min: number, max: number): number {
  const raw = text(values, id).trim();
  const value = Number(raw);
  if (raw === '' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label}: enter a whole number from ${comma(min)} to ${comma(max)}.`);
  return value;
}

function pick<T extends string>(values: LiveValues, id: string, label: string, allowed: readonly T[]): T {
  const raw = text(values, id);
  const found = allowed.find(option => option === raw);
  if (found === undefined) throw new Error(`${label}: choose one of the listed options.`);
  return found;
}

/** The four bytes of a u32 in the order a little-endian file stores them: lowest first. */
const littleEndian = (value: number): number[] => [value % 256, Math.floor(value / 256) % 256, Math.floor(value / 65536) % 256, Math.floor(value / 16777216)];
const PLACE_VALUES = [1, 256, 65536, 16777216] as const;
const placeLabel = (index: number): string => `× ${comma(PLACE_VALUES[index] ?? 1)}`;
/** "39 × 256 + 15": the non-zero byte terms, biggest place first. */
function placeTerms(bytes: readonly number[]): string {
  const terms = bytes.map((byte, index) => ({ byte, index })).filter(term => term.byte !== 0).reverse()
    .map(({ byte, index }) => (index === 0 ? `${byte}` : `${byte} ${placeLabel(index)}`));
  return terms.length ? terms.join(' + ') : '0';
}
const sum = (numbers: readonly number[]): number => numbers.reduce((total, value) => total + value, 0);

// Lesson 10.3 (pages/9/09.mdx): a u32 field in a binary save.
const goldBytes: LiveLab = {
  id: 'c5-gold-bytes',
  title: 'How the save stores gold',
  summary: 'Type a gold value and read the four bytes a hex editor shows at offsets 0x06 to 0x09, lowest byte first.',
  inputs: [{ kind: 'number', id: 'gold', label: 'Gold (0 to 4,294,967,295)', min: 0, max: 4294967295 }],
  defaults: { gold: '250' },
  presets: [
    { label: 'Nia’s 250', values: { gold: '250' } },
    { label: '1,250', values: { gold: '1250' } },
    { label: '100', values: { gold: '100' } },
    { label: '101', values: { gold: '101' } },
  ],
  compute(values): CellFrame {
    const gold = integer(values, 'gold', 'Gold', 0, 4294967295);
    const bytes = littleEndian(gold);
    const [b0 = 0, b1 = 0, b2 = 0, b3 = 0] = bytes;
    const backwards = b0 * 16777216 + b1 * 65536 + b2 * 256 + b3;
    const digits = String(gold);
    const asText = [...digits].map(digit => byteText(digit.charCodeAt(0))).join(' ');
    return frame('Offsets 0x06 to 0x09 of the save', `${comma(gold)} is stored as ${bytes.map(byteText).join(' ')}. Read biggest byte first, the same four bytes would mean ${comma(backwards)}.`, [
      panel('A u32, lowest byte first: what the save holds', 'blue', [
        row('The four gold bytes', bytes.map((byte, index) => h(byteText(byte), 'blue', 1, { sub: placeLabel(index) })), { ticks: { left: 'offset 0x06', right: 'offset 0x09' } }),
        row('Add each byte times its place', [c(`${placeTerms(bytes)} = ${comma(gold)}`, 'yellow', 4)], { link: 'read lowest byte first' }),
      ]),
      panel('Two wrong readings of a number', 'red', [
        row('Same bytes, biggest first', [c(`${hex(backwards, 8)} = ${comma(backwards)}`, backwards === gold ? 'green' : 'red', 4)]),
        row(`Typed as the text "${digits}"`, [c(asText, 'gray', 4, { sub: `${digits.length} character bytes, not a u32` })]),
      ]),
    ]);
  },
};

// Lesson 10.8 (pages/9/07.mdx): GSAV's plain-sum checksum after a gold edit.
const OTHER_FIELDS = 592; // 842 − 250: magic 305 + version 1 + level 3 + length 3 + name 280
const ORIGINAL_SUM = 842;
const gsavChecksum: LiveLab = {
  id: 'c5-gsav-checksum',
  title: 'Edit Nia’s gold and run the loader’s check',
  summary: 'The loader adds bytes 0x00 to 0x0E and compares the total with the stored checksum. Change the gold and decide what happens to the checksum.',
  inputs: [
    { kind: 'number', id: 'gold', label: 'New gold (0 to 4,294,967,295)', min: 0, max: 4294967295 },
    { kind: 'choice', id: 'checksum', label: 'Checksum bytes', options: [{ value: 'keep', label: 'leave 4A 03 00 00 (842)' }, { value: 'recompute', label: 'recompute and store' }] },
  ],
  defaults: { gold: '9999', checksum: 'keep' },
  presets: [
    { label: '9,999, checksum left alone', values: { gold: '9999', checksum: 'keep' } },
    { label: '1,250, recomputed', values: { gold: '1250', checksum: 'recompute' } },
    { label: '64,000, left alone', values: { gold: '64000', checksum: 'keep' } },
  ],
  compute(values): CellFrame {
    const gold = integer(values, 'gold', 'New gold', 0, 4294967295);
    const mode = pick(values, 'checksum', 'Checksum bytes', ['keep', 'recompute'] as const);
    const bytes = littleEndian(gold);
    const added = sum(bytes);
    const computed = OTHER_FIELDS + added;
    const stored = mode === 'keep' ? ORIGINAL_SUM : computed;
    const loads = computed === stored;
    const caption = mode === 'recompute'
      ? `Recomputing stores ${comma(computed)} as ${littleEndian(computed).map(byteText).join(' ')}, so the loader’s total and the stored checksum agree.`
      : loads && gold !== 250
        ? 'These bytes still add up to 250, the same as Nia’s original FA 00 00 00, so the total stays 842 and the plain sum misses the edit.'
        : loads
          ? 'This is Nia’s original gold, so nothing changed and the file loads.'
          : `The gold bytes now add ${added} instead of 250, so the loader computes ${comma(computed)} while the file still says 842.`;
    return frame('The gold bytes, the total, the verdict', caption, [
      panel('Gold at offsets 0x06 to 0x09', 'blue', [
        row(`${comma(gold)} = ${placeTerms(bytes)}`, bytes.map((byte, index) => h(byteText(byte), 'blue', 1, { sub: placeLabel(index) }))),
        row('What these bytes add to the total', [c(`${bytes.join(' + ')} = ${added}`, 'yellow', 4, { sub: 'Nia’s 250 gold added 250' })], { link: 'add the bytes' }),
      ]),
      panel('The loader’s check', 'purple', [
        row('Total of bytes 0x00 to 0x0E', [c(`${OTHER_FIELDS} + ${added} = ${comma(computed)}`, 'yellow', 4, { sub: 'the other fields add 842 − 250 = 592' })]),
        row(`Stored checksum: ${comma(stored)}${mode === 'keep' ? ', left alone' : ', recomputed'}`, littleEndian(stored).map(byte => c(byteText(byte), 'orange'))),
        row('Verdict', [h(loads ? `loads ${comma(gold)} gold` : `refuses: ${comma(computed)} ≠ ${comma(stored)}`, loads ? 'green' : 'red', 4)]),
      ]),
    ]);
  },
};

// Lesson 10.6 (pages/9/05.mdx): where an archive entry name really lands.
const MOD_FOLDER = 'C:\\Games\\Wesnoth\\mods';
const ENTRY_NAMES = ['textures/grass.png', 'textures/../grass.png', 'textures/../../save.dat', '../../../Windows/System32/example.dll', 'C:/Users/Player/startup.bat'] as const;
const archivePath: LiveLab = {
  id: 'c5-archive-path',
  title: 'Where does this archive entry land?',
  summary: `The installer extracts into ${MOD_FOLDER}. Pick an entry name: the first row walks its parts, the checks below decide.`,
  inputs: [{ kind: 'choice', id: 'entry', label: 'Archive entry name', options: ENTRY_NAMES.map((name, index) => ({ value: String(index), label: name })) }],
  defaults: { entry: '2' },
  presets: [
    { label: 'One folder down, two up', values: { entry: '2' } },
    { label: '.. that stays inside', values: { entry: '1' } },
    { label: 'Three .. climb out', values: { entry: '3' } },
    { label: 'An absolute name', values: { entry: '4' } },
  ],
  compute(values): CellFrame {
    const index = integer(values, 'entry', 'Archive entry name', 0, ENTRY_NAMES.length - 1);
    const name: string = ENTRY_NAMES[index] ?? ENTRY_NAMES[0];
    const parts = name.split('/').filter(part => part !== '');
    const absolute = /^[A-Za-z]:$/.test(parts[0] ?? '');
    const joined = absolute ? name.replaceAll('/', '\\') : `${MOD_FOLDER}\\${name.replaceAll('/', '\\')}`;
    // What the operating system opens: start from the drive (absolute) or the mod folder, apply each part.
    const folders = absolute ? [parts[0] ?? 'C:'] : MOD_FOLDER.split('\\');
    for (const part of absolute ? parts.slice(1) : parts) {
      if (part === '..') { if (folders.length > 1) folders.pop(); } else if (part !== '.') folders.push(part);
    }
    const opened = folders.join('\\');
    const inside = opened.toLowerCase().startsWith(`${MOD_FOLDER.toLowerCase()}\\`);
    // The depth rule: count folders below the mod folder; refuse at the first part that would go above it, or at a drive.
    let depth = 0;
    let refusedAt = absolute ? 0 : -1;
    const walk: Cell[] = parts.map((part, at) => {
      if (refusedAt !== -1 && at > refusedAt) return c(part, 'gray', 1, { sub: 'not checked' });
      if (absolute) return h(part, 'red', 1, { sub: 'a drive: not relative' });
      depth += part === '..' ? -1 : part === '.' ? 0 : 1;
      if (depth < 0) { refusedAt = at; return h(part, 'red', 1, { sub: `depth −${-depth}: above mods` }); }
      return c(part, part === '..' ? 'yellow' : 'blue', 1, { sub: `depth ${depth}` });
    });
    const depthAccepts = refusedAt === -1;
    const prefixAccepts = joined.toLowerCase().startsWith(`${MOD_FOLDER.toLowerCase()}\\`);
    const verdict = (accepts: boolean): Cell => h(accepts ? (inside ? 'accepts' : 'accepts, but the file escapes') : 'refuses', accepts === inside ? 'green' : 'red', 6);
    const caption = absolute
      ? 'Joining an absolute name throws the mod folder away, so the prefix check happens to refuse it. The depth rule refuses it because a drive is not a relative name.'
      : !inside
        ? `The joined text still starts with the mod folder, so the prefix check accepts it, yet opening it climbs out to ${opened}. The depth rule refuses at the first part that goes above the mod folder.`
        : parts.includes('..')
          ? 'Here .. only undoes textures: the depth never drops below 0, so the file lands inside and both checks accept it.'
          : 'An ordinary relative name: both checks accept it, and the file lands inside the mod folder.';
    return frame('Walk the name, then check it', caption, [
      panel('Walk the parts from the mod folder', 'blue', [
        row('Each part, and the depth after it', walk),
        row('What opening the joined path reaches', [h(opened, inside ? 'green' : 'red', 6, { sub: inside ? 'inside the mod folder' : 'outside the mod folder' })], { link: 'resolve every ..' }),
      ]),
      panel('Two checks (green: right call, red: fooled)', 'purple', [
        row('Joined text starts with …\\mods\\ ?', [verdict(prefixAccepts)]),
        row('Depth never goes below 0 ?', [verdict(depthAccepts)]),
      ]),
    ]);
  },
};

// Lesson 6.3 (pages/10/03.mdx): an access mask decides which calls a handle may make.
const RIGHT_BITS = [
  { short: 'QUERY_LIMITED', value: 0x1000 },
  { short: 'QUERY_INFO', value: 0x0400 },
  { short: 'VM_WRITE', value: 0x0020 },
  { short: 'VM_READ', value: 0x0010 },
  { short: 'VM_OPERATION', value: 0x0008 },
] as const;
const CALLS = {
  path: { name: 'QueryFullProcessImageNameW', needs: 'QUERY_LIMITED_INFORMATION or QUERY_INFORMATION', allows: (mask: number) => (mask & 0x1400) !== 0 },
  query: { name: 'VirtualQueryEx', needs: 'QUERY_INFORMATION', allows: (mask: number) => (mask & 0x0400) !== 0 },
  read: { name: 'ReadProcessMemory', needs: 'VM_READ', allows: (mask: number) => (mask & 0x0010) !== 0 },
  write: { name: 'WriteProcessMemory', needs: 'VM_WRITE and VM_OPERATION', allows: (mask: number) => (mask & 0x0028) === 0x0028 },
} as const;
const accessMask: LiveLab = {
  id: 'c5-access-mask',
  title: 'Which calls does this handle allow?',
  summary: 'The PID only chose the process. Every later call checks the rights stored with the handle.',
  inputs: [
    { kind: 'choice', id: 'mask', label: 'Rights requested from OpenProcess', options: [
      { value: '1000', label: 'QUERY_LIMITED_INFORMATION (0x1000)' },
      { value: '0410', label: 'QUERY_INFORMATION | VM_READ (0x0410)' },
      { value: '0438', label: '… | VM_OPERATION | VM_WRITE (0x0438)' },
    ] },
    { kind: 'choice', id: 'call', label: 'Call made with the handle', options: Object.entries(CALLS).map(([value, call]) => ({ value, label: call.name })) },
  ],
  defaults: { mask: '1000', call: 'read' },
  presets: [
    { label: 'Query-only handle, read memory', values: { mask: '1000', call: 'read' } },
    { label: 'Read handle, read memory', values: { mask: '0410', call: 'read' } },
    { label: 'Read handle, write memory', values: { mask: '0410', call: 'write' } },
    { label: 'Write handle, write memory', values: { mask: '0438', call: 'write' } },
  ],
  compute(values): CellFrame {
    const mask = Number.parseInt(pick(values, 'mask', 'Rights', ['1000', '0410', '0438'] as const), 16);
    const call = CALLS[pick(values, 'call', 'Call', ['path', 'query', 'read', 'write'] as const)];
    const set = RIGHT_BITS.filter(right => (mask & right.value) !== 0);
    const allowed = call.allows(mask);
    return frame('The handle’s mask, then the call’s check', allowed
      ? `${hex(mask, 4)} includes ${call.needs}, so ${call.name} may use this handle.`
      : `${hex(mask, 4)} does not include ${call.needs}. The PID is the right one, but ${call.name} checks the rights stored with the handle, so it fails with access denied.`, [
      panel('Rights stored with the handle', 'blue', [
        row('Bits 12, 10, 5, 4 and 3', RIGHT_BITS.map(right => ((mask & right.value) !== 0 ? h('1', 'green', 1, { sub: right.short }) : c('0', 'gray', 1, { sub: right.short })))),
        row('OR of the set bits', [c(`${set.map(right => hex(right.value, 4)).join(' | ')} = ${hex(mask, 4)}`, 'yellow', 5)], { link: 'combine' }),
      ]),
      panel(`${call.name} checks the handle`, 'purple', [
        row('Needs', [c(call.needs, 'purple', 5)]),
        row('Result', [h(allowed ? 'allowed' : 'fails: access denied', allowed ? 'green' : 'red', 5)]),
      ]),
    ]);
  },
};

// Lesson 6.5 (pages/10/05.mdx): the scanner's region filter, then the handle's right.
const PROTECTIONS = {
  ro: { name: 'PAGE_READONLY', rwx: 'R--', readable: true },
  rw: { name: 'PAGE_READWRITE', rwx: 'RW-', readable: true },
  rx: { name: 'PAGE_EXECUTE_READ', rwx: 'R-X', readable: true },
  na: { name: 'PAGE_NOACCESS', rwx: '---', readable: false },
  guard: { name: 'PAGE_READWRITE | PAGE_GUARD', rwx: 'RW- guarded', readable: false },
} as const;
const regionRead: LiveLab = {
  id: 'c5-region-read',
  title: 'Does the scanner read this region?',
  summary: 'VirtualQueryEx describes the region first. The scanner reads only committed, readable, unguarded regions, and the read still needs the handle’s right.',
  inputs: [
    { kind: 'choice', id: 'state', label: 'State', options: [{ value: 'commit', label: 'MEM_COMMIT' }, { value: 'reserve', label: 'MEM_RESERVE' }, { value: 'free', label: 'MEM_FREE' }] },
    { kind: 'choice', id: 'protect', label: 'Protection', options: Object.entries(PROTECTIONS).map(([value, item]) => ({ value, label: `${item.name} (${item.rwx})` })) },
    { kind: 'choice', id: 'rights', label: 'Handle rights', options: [{ value: 'read', label: 'QUERY_INFORMATION | VM_READ' }, { value: 'query', label: 'QUERY_INFORMATION only' }] },
  ],
  defaults: { state: 'commit', protect: 'guard', rights: 'read' },
  presets: [
    { label: 'Committed RW-', values: { state: 'commit', protect: 'rw', rights: 'read' } },
    { label: 'Guard page', values: { state: 'commit', protect: 'guard', rights: 'read' } },
    { label: 'Reserved only', values: { state: 'reserve', protect: 'rw', rights: 'read' } },
    { label: 'Handle without VM_READ', values: { state: 'commit', protect: 'rw', rights: 'query' } },
  ],
  compute(values): CellFrame {
    const state = pick(values, 'state', 'State', ['commit', 'reserve', 'free'] as const);
    const protection = PROTECTIONS[pick(values, 'protect', 'Protection', ['ro', 'rw', 'rx', 'na', 'guard'] as const)];
    const canRead = pick(values, 'rights', 'Handle rights', ['read', 'query'] as const) === 'read';
    const committed = state === 'commit';
    const regionOk = committed && protection.readable;
    const stateName = { commit: 'MEM_COMMIT', reserve: 'MEM_RESERVE', free: 'MEM_FREE' }[state];
    const result = !committed ? 'skips it: no storage is committed'
      : !protection.readable ? (protection.rwx === '---' ? 'skips it: the pages forbid reading' : 'skips it: touching a guard page would raise an exception')
        : canRead ? 'reads it, then checks bytes read = bytes asked' : 'ReadProcessMemory fails: access denied';
    const caption = !regionOk
      ? 'The scanner never calls ReadProcessMemory here, so the handle’s rights are not even used.'
      : canRead ? 'Committed, readable and unguarded, and the handle carries VM_READ: the read goes ahead.'
        : 'The region passes the filter, but the handle lacks VM_READ, so the read itself is refused.';
    return frame('Region filter first, handle right second', caption, [
      panel('What VirtualQueryEx reports', 'blue', [
        row('State', [h(stateName, committed ? 'green' : 'red', 5, { sub: committed ? 'storage is committed' : 'no storage to read' })]),
        row('Protection', [committed ? h(`${protection.name} (${protection.rwx})`, protection.readable ? 'green' : 'red', 5) : c('not used: nothing is committed', 'gray', 5, { ghost: true })]),
      ]),
      panel('What the scanner does', 'purple', [
        row('Handle has VM_READ?', [regionOk ? h(canRead ? 'yes' : 'no', canRead ? 'green' : 'red', 5) : c('not reached', 'gray', 5, { ghost: true })]),
        row('Result', [h(result, regionOk && canRead ? 'green' : 'red', 5)]),
      ]),
    ]);
  },
};

// Lesson 12.1 (pages/11/01.mdx): which example.dll a bare-name LoadLibrary finds.
const FOLDERS = {
  app: { short: 'game folder', path: 'C:\\Games\\Demo' },
  sys: { short: 'System32', path: 'C:\\Windows\\System32' },
  sys16: { short: 'System', path: 'C:\\Windows\\System' },
  win: { short: 'Windows', path: 'C:\\Windows' },
  cwd: { short: 'current folder', path: 'C:\\Users\\Player\\Downloads' },
  path: { short: 'PATH folders', path: 'a PATH folder' },
} as const;
type Folder = keyof typeof FOLDERS;
const COPIES: Readonly<Record<string, readonly Folder[]>> = { sys: ['sys'], app: ['app', 'sys'], cwd: ['cwd', 'sys'], cwdonly: ['cwd'] };
const dllSearch: LiveLab = {
  id: 'c5-dll-search',
  title: 'Which example.dll does LoadLibrary load?',
  summary: 'C:\\Games\\Demo\\demo.exe calls LoadLibrary("example.dll"). It is not loaded yet and not a KnownDLL, so folders are searched in order.',
  inputs: [
    { kind: 'choice', id: 'copies', label: 'Copies of example.dll exist in', options: [
      { value: 'sys', label: 'System32 only' }, { value: 'app', label: 'the game folder and System32' },
      { value: 'cwd', label: 'the current folder and System32' }, { value: 'cwdonly', label: 'the current folder only' },
    ] },
    { kind: 'choice', id: 'safe', label: 'Safe DLL search mode', options: [{ value: 'on', label: 'on (the default)' }, { value: 'off', label: 'off' }] },
  ],
  defaults: { copies: 'cwd', safe: 'on' },
  presets: [
    { label: 'Current folder and System32, safe on', values: { copies: 'cwd', safe: 'on' } },
    { label: 'Same files, safe off', values: { copies: 'cwd', safe: 'off' } },
    { label: 'The game ships its own copy', values: { copies: 'app', safe: 'on' } },
  ],
  compute(values): CellFrame {
    const copies = COPIES[pick(values, 'copies', 'Copies', ['sys', 'app', 'cwd', 'cwdonly'] as const)] ?? ['sys'];
    const safe = pick(values, 'safe', 'Safe DLL search mode', ['on', 'off'] as const) === 'on';
    const order: readonly Folder[] = safe ? ['app', 'sys', 'sys16', 'win', 'cwd', 'path'] : ['app', 'cwd', 'sys', 'sys16', 'win', 'path'];
    const winnerAt = order.findIndex(folder => copies.includes(folder));
    const winner = FOLDERS[order[winnerAt] ?? 'sys'];
    const planted = order[winnerAt] === 'cwd';
    const searched: Cell[] = order.map((folder, at) => at < winnerAt ? c(FOLDERS[folder].short, 'blue', 1, { sub: `${at + 1}: no file` })
      : at === winnerAt ? h(FOLDERS[folder].short, 'green', 1, { sub: `${at + 1}: found` })
        : c(FOLDERS[folder].short, 'gray', 1, { sub: `${at + 1}: not reached`, ghost: true }));
    const caption = `Search ${winnerAt + 1}, the ${winner.short}, is the first with a file named example.dll, so that file loads.${!safe && copies.includes('cwd') ? ' With safe search mode off, the current folder is searched second, ahead of System32.' : ''} The short name is the same whichever file won.`;
    return frame(`The search, safe mode ${safe ? 'on' : 'off'}`, caption, [
      panel('Folders, in the order they are searched', 'blue', [row('The first folder with the file wins', searched)]),
      panel('What a module snapshot then reports', 'orange', [
        row('szModule (short name)', [c('example.dll', 'blue', 6, { sub: 'identical for every copy' })]),
        row('szExePath (full path)', [h(`${winner.path}\\example.dll`, planted ? 'red' : 'orange', 6, { sub: planted ? 'a file that was dropped where you launched from' : 'the file that actually loaded' })]),
      ]),
    ]);
  },
};

// Lesson 14.4 (pages/11/08.mdx): several invariants on one decoded PlayerLayout.
const CANDIDATES = {
  player: { label: 'The intended player', vptr: '0x7FF612458A10', inModule: true, health: '87', healthOk: true, position: '12.5, 0, −3.25', finite: true, items: '0x1F2A0040 ≤ 0x1F2A0058 ≤ 0x1F2A0080', ordered: true },
  reused: { label: 'Stale pointer: a projectile now lives there', vptr: '0x7FF612458B70', inModule: true, health: '1,065,353,216', healthOk: false, position: '140, 2.5, 0', finite: true, items: '0x0 ≤ 0x1F2A0100 > 0x0', ordered: false },
  zeroed: { label: 'Freed memory, filled with zeros', vptr: '0x0', inModule: false, health: '0', healthOk: true, position: '0, 0, 0', finite: true, items: '0x0 ≤ 0x0 ≤ 0x0', ordered: true },
  otherCr3: { label: 'Wrong CR3: another process’s page', vptr: '0x2164C3B0000', inModule: false, health: '4,294,967,295', healthOk: false, position: 'NaN, NaN, NaN', finite: false, items: '0x2164C3B0010 > 0x2164C3B0000 ≤ 0x2164C3B0020', ordered: false },
} as const;
const playerChecks: LiveLab = {
  id: 'c5-player-checks',
  title: 'Four checks on one decoded player',
  summary: 'Each candidate is 48 bytes decoded with the same PlayerLayout. A health of 0 to 100 and a vptr inside the game’s .rdata are expected.',
  inputs: [{ kind: 'choice', id: 'candidate', label: 'Bytes at the translated address', options: Object.entries(CANDIDATES).map(([value, item]) => ({ value, label: item.label })) }],
  defaults: { candidate: 'zeroed' },
  compute(values): CellFrame {
    const item = CANDIDATES[pick(values, 'candidate', 'Candidate', ['player', 'reused', 'zeroed', 'otherCr3'] as const)];
    const results = [item.inModule, item.healthOk, item.finite, item.ordered];
    const passed = results.filter(Boolean).length;
    const mark = (ok: boolean, label: string): Cell => h(`${ok ? 'passes' : 'fails'}: ${label}`, ok ? 'green' : 'red', 2);
    const caption = passed === 4 ? 'Every check passes on different bytes, so this is very likely the player you meant.'
      : passed >= 2 ? `${passed} of 4 checks pass by accident. One failing check is enough to reject the bytes.`
        : `Only ${passed} of 4 checks pass: these bytes were never a player.`;
    return frame(item.label, caption, [
      panel('Decoded with PlayerLayout', 'blue', [row('Field (offset)', [
        c(item.vptr, 'orange', 2, { sub: 'vptr (+0x00)' }), c(item.health, 'blue', 2, { sub: 'health (+0x08)' }),
        c(item.position, 'blue', 2, { sub: 'x, y, z (+0x0C)' }), c(item.items, 'orange', 2, { sub: 'begin, end, capacity (+0x18)' }),
      ])]),
      panel('Checks on different bytes', 'purple', [
        row('Each check', [mark(item.inModule, 'vptr in .rdata'), mark(item.healthOk, '0 to 100'), mark(item.finite, 'finite floats'), mark(item.ordered, 'begin ≤ end ≤ capacity')]),
        row('Verdict', [h(passed === 4 ? 'accept a PlayerSnapshot' : `reject: ${4 - passed} of 4 checks fail`, passed === 4 ? 'green' : 'red', 8)]),
      ]),
    ]);
  },
};

export const labsC5: readonly LiveLab[] = [goldBytes, gsavChecksum, archivePath, accessMask, regionRead, dllSearch, playerChecks];
