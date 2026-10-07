// Sort boards (see components/SortBoard.astro). Chips are dragged (or tapped,
// then a zone tapped) into zones or a two-circle Venn. Every board opens already
// sorted the way the lesson sorts it, with a plain-English reason for each chip.
// The reader moves things around and a line says what that placement means.
// Nothing is graded: amber only means "different from the lesson's version".
//
// To add a board: add an entry to BOARDS below, then <SortBoard board="your-id" />.
//   mode      'zones' (2-4 boxes) or 'venn' (zones in this order: left-only, both,
//             right-only, and an optional fourth "outside" zone)
//   zones     [{ id, name, sub }]
//   items     [{ id, label, home: zoneId, why: { zoneId: 'sentence' } }]
//             why[home] is the lesson's reason; why[other] says what the other
//             placement would claim (optional; a generic line is used if missing)
//   spotlight item id explained when the board first opens
//   summary   (countsByZone) => one sentence about what the sorted groups mean

export const BOARDS = {
	'menu-vs-worker': {
		eyebrow: 'Sort it',
		title: 'Who does what: the menu or the worker?',
		description:
			'Every chip is a job in the tool. It starts where the lesson puts it. Drag a chip to the other side, or tap it and then tap a zone, and read what that move would mean.',
		mode: 'zones',
		zones: [
			{ id: 'menu', name: 'The menu window', sub: 'draws widgets, edits plain settings, sends commands' },
			{ id: 'worker', name: 'The worker', sub: 'owns handles, reads, writes, cleanup' },
		],
		items: [
			{ id: 'names', label: 'The "Show names" checkbox', home: 'menu',
				why: { menu: 'A checkbox only edits an ordinary setting (show_names). The menu’s job is to edit settings, so this belongs here.',
					worker: 'If the worker owned the checkbox, low-level code would be tangled up with how the window looks.' } },
			{ id: 'fov', label: 'The field-of-view slider', home: 'menu',
				why: { menu: 'A slider borrows one setting for a moment and changes it when you drag. That is ordinary UI work, so it stays in the menu.' } },
			{ id: 'last', label: 'Remembering the last settings sent (last_applied)', home: 'menu',
				why: { menu: 'The menu keeps what it last submitted so it can say "Nothing changed" instead of resending identical settings.' } },
			{ id: 'shutdown', label: 'Sending Command::Shutdown when the window closes', home: 'menu',
				why: { menu: 'on_exit in the menu only sends the command. The worker does the actual cleanup, and the main thread waits for it.' } },
			{ id: 'handle', label: 'The process handle', home: 'worker',
				why: { worker: 'The worker is the only place that should own Windows handles, so the low-level code can be reviewed in one place.',
					menu: 'A menu that owns a handle puts a low-level resource right next to code that repaints many times a second.' } },
			{ id: 'rw', label: 'Reading and writing game memory', home: 'worker',
				why: { worker: 'The menu must not patch memory sixty times per second. Low-level work waits for a deliberate command and runs in the worker.',
					menu: 'Doing this while painting a widget repeats a side effect just because the window redrew.' } },
			{ id: 'chain', label: 'Walking a pointer chain', home: 'worker',
				why: { worker: 'The lesson says the menu should not execute pointer chains while painting a checkbox. That work belongs to the worker.' } },
			{ id: 'restore', label: 'Restoring changed bytes at shutdown', home: 'worker',
				why: { worker: 'On Shutdown the worker restores what it changed, unhooks only its own hooks and closes its handles. The window vanishing proves nothing; joining the worker does.' } },
		],
		spotlight: 'handle',
		summary: c => `Menu: ${c.menu}. Worker: ${c.worker}. The menu\u2019s jobs only edit ordinary settings and send commands; the worker\u2019s jobs (handles, reads, writes, cleanup) are easy to review because they sit in one place.`,
	},

	'module-jobs': {
		eyebrow: 'Sort it',
		title: 'Which stage owns this job?',
		description:
			'The lesson splits the main loop into observe, decide and apply. Each chip is one job. Move a chip to see what it would mean for a different stage to own it.',
		mode: 'zones',
		zones: [
			{ id: 'observe', name: 'observe.rs', sub: 'turns verified Win32 reads into local snapshots' },
			{ id: 'decide', name: 'decide.rs', sub: 'applies pure feature rules to a snapshot' },
			{ id: 'apply', name: 'apply.rs', sub: 'owns guarded writes, patches, hooks and restoration' },
		],
		items: [
			{ id: 'copy', label: 'Copy health and gold out of the live game object', home: 'observe',
				why: { observe: 'An observer resolves live game objects and copies the few fields it needs, so nothing else borrows pointers into the game.',
					apply: 'The apply stage writes. Copying a value out is observing, and keeping that separate means a display and a logger can read the same snapshot.' } },
			{ id: 'range', label: 'Check the copied values are in range', home: 'observe',
				why: { observe: 'The observer checks ranges while it copies, then hands back ordinary Rust values that later stages can trust.' } },
			{ id: 'snap', label: 'Return a ToolSnapshot of plain numbers', home: 'observe',
				why: { observe: 'The snapshot is the output of observing. Once it exists its fields stay valid even if the game destroys the object they came from.' } },
			{ id: 'rule', label: 'A rule: "given this snapshot, what does the feature propose?"', home: 'decide',
				why: { decide: 'A pure rule takes a snapshot and returns a proposal. It makes no Windows calls, so you can test it without launching the game.',
					apply: 'If a rule also wrote memory, you could no longer test the decision without touching a game.' } },
			{ id: 'enabled', label: 'Choose what each enabled feature proposes', home: 'decide',
				why: { decide: 'The loop asks decide.rs what each enabled feature proposes, from the one validated snapshot.' } },
			{ id: 'verify', label: 'Compare live bytes with the expected original instruction before patching', home: 'apply',
				why: { apply: 'Guarded writes belong to apply.rs. A changed build must produce a clear rejection, not a plausible value from the wrong place.',
					observe: 'Observing reads and copies. Deciding whether it is safe to patch an address is part of guarding the write.' } },
			{ id: 'write', label: 'Write the patch', home: 'apply',
				why: { apply: 'Only the apply stage owns guarded writes, patches and hooks, so a safer restoration rule is changed in one file.',
					decide: 'The decide stage must stay free of Windows calls; if it wrote, its rules could not be tested on their own.' } },
			{ id: 'restore', label: 'Restore the original bytes on shutdown', home: 'apply',
				why: { apply: 'Whoever makes a change must be able to undo it. Restoration lives with the code that wrote the patch, not in every checkbox handler.' } },
		],
		spotlight: 'rule',
		summary: c => `observe.rs: ${c.observe}. decide.rs: ${c.decide}. apply.rs: ${c.apply}. In the lesson\u2019s split only apply.rs touches the game, so a write can only come from one place, and each file has one main reason to change.`,
	},

	'colored-vs-player': {
		eyebrow: 'Sort it',
		title: 'What did the colour rule get right and wrong?',
		description:
			'A made-up capture of ten draws, sorted by two questions: did the rule colour it, and is it really a player? Move a draw and watch precision and recall change.',
		mode: 'venn',
		venn: { legend: 'Left circle: the rule coloured it. Right circle: it really is a player. The overlap is both.' },
		zones: [
			{ id: 'fp', name: 'Coloured, not a player', sub: 'false positive' },
			{ id: 'tp', name: 'Coloured player', sub: 'true positive' },
			{ id: 'fn', name: 'Player left unchanged', sub: 'false negative' },
			{ id: 'tn', name: 'Not coloured and not a player', sub: 'true negative' },
		],
		items: [
			{ id: 'p1', label: 'Player, standing', home: 'tp', why: { tp: 'The rule coloured it and it really is a player: a true positive.', fp: 'It really is a player, so colouring it is correct, not a false positive.', fn: 'The rule did colour this one, so it is not a missed player.' } },
			{ id: 'p2', label: 'Player, running', home: 'tp', why: { tp: 'Coloured and really a player: a true positive.' } },
			{ id: 'p3', label: 'Player, far away', home: 'tp', why: { tp: 'Coloured and really a player: a true positive.' } },
			{ id: 'p4', label: 'Player, aiming', home: 'tp', why: { tp: 'Coloured and really a player: a true positive.' } },
			{ id: 'crate', label: 'Crate with a player-sized vertex count', home: 'fp',
				why: { fp: 'The rule coloured it but it is not a player: a false positive. A vertex count is a quick first filter, not a durable identifier.',
					tp: 'It is a crate, not a player, so counting it as a true positive would hide the rule’s mistake.',
					tn: 'A crate that gets coloured is a false positive. Leaving it uncoloured would be a true negative.' } },
			{ id: 'shadow', label: 'Player drawn in the shadow pass', home: 'fn',
				why: { fn: 'A player draw the rule left unchanged: a false negative. The same player appears in several passes, and a filter that recognises one does not recognise them all.',
					tp: 'The rule did not colour this draw, so it is a miss, not a hit.' } },
			{ id: 'portrait', label: 'Player portrait in the HUD', home: 'fn',
				why: { fn: 'Another pass of the same player (the HUD portrait) that the rule did not recognise: a false negative.' } },
			{ id: 'wall', label: 'Wall', home: 'tn', why: { tn: 'Not a player and not coloured: a true negative. Correct, and it does not show up in precision or recall.', fp: 'This would mean the rule coloured a wall, a mistake it did not make.' } },
			{ id: 'sky', label: 'Sky', home: 'tn', why: { tn: 'Not a player and not coloured: a true negative.' } },
			{ id: 'floor', label: 'Floor', home: 'tn', why: { tn: 'Not a player and not coloured: a true negative.' } },
		],
		spotlight: 'crate',
		summary: c => {
			const ratio = (a, b) => (a + b === 0 ? 'undefined (no denominator, so no score is invented)' : `${a} ÷ ${a + b} = ${(a / (a + b)).toFixed(2)}`);
			const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
			return `${pl(c.tp, 'true positive')}, ${pl(c.fp, 'false positive')}, ${pl(c.fn, 'false negative')}, ${pl(c.tn, 'true negative')}. Precision (when it says player, how often is it right?) = ${ratio(c.tp, c.fp)}. Recall (of all player draws, how many did it find?) = ${ratio(c.tp, c.fn)}.`;
		},
	},

	'snapshot-contents': {
		eyebrow: 'Sort it',
		title: 'What travels in the frame snapshot?',
		description:
			'The overlay, radar and aim analysis all read one snapshot. Each chip is something a feature might use. See which ones belong in the snapshot and which would show a different moment.',
		mode: 'zones',
		zones: [
			{ id: 'in', name: 'Travels in the snapshot', sub: 'owned values from one observation pass' },
			{ id: 'out', name: 'Keep out of it', sub: 'could describe a different moment or a freed object' },
		],
		items: [
			{ id: 'local', label: 'The local player record (PlayerSnapshot)', home: 'in', why: { in: 'A local record of identity, position and other validated fields. It borrows no pointer into the game.' } },
			{ id: 'players', label: 'The list of players (an owned Vec)', home: 'in', why: { in: 'Owned rather than borrowed, so nothing points back into the game and every feature reads the same copy.' } },
			{ id: 'matrix', label: 'The camera matrix from the same update', home: 'in',
				why: { in: 'Positions and the camera that projects them must describe the same update, so the matrix travels with the players.',
					out: 'Leaving the matrix out means each feature would fetch its own, a few milliseconds apart.' } },
			{ id: 'viewport', label: 'The viewport size', home: 'in', why: { in: 'It travels with the matrix and players so a feature can project this frame’s positions without asking the game again.' } },
			{ id: 'ref', label: 'A reference into a game entity', home: 'out',
				why: { out: 'If the game frees the entity, the reference is the stale-pointer failure from Lesson 1.8. Copy once, then read from the copy.',
					in: 'A reference inside the snapshot would stay alive after the game destroys the thing it points to.' } },
			{ id: 'old', label: 'Last frame’s camera matrix', home: 'out',
				why: { out: 'Projecting this frame’s positions through last frame’s camera draws everything slightly behind where it belongs, worst when you turn quickly.',
					in: 'It would look almost right and be wrong in a way that is easy to blame on the projection maths.' } },
			{ id: 'late', label: 'A camera matrix the overlay reads on its own, later', home: 'out',
				why: { out: 'If the radar reads players now and the overlay reads the camera a few milliseconds later, the two describe different updates and markers land where enemies used to be.' } },
		],
		spotlight: 'old',
		summary: c => `In the snapshot: ${c.in} (one bounded observation pass, owned values). Kept out: ${c.out} (each could make two features describe different moments, or point at something the game has freed).`,
	},

	'network-layers': {
		eyebrow: 'Sort it',
		title: 'Which layer is this about?',
		description:
			'A packet row in a capture is not automatically a game-message row. Each chip belongs to one layer. Move one and read what that layer would then be claiming.',
		mode: 'zones',
		zones: [
			{ id: 'game', name: 'Game protocol message', sub: 'login, chat, lobby update' },
			{ id: 'tcp', name: 'TCP byte stream', sub: 'ordered, reliable bytes between two sockets' },
			{ id: 'ip', name: 'IP packet', sub: 'routed data between host addresses' },
			{ id: 'cap', name: 'Capture', sub: 'what the capture interface records' },
		],
		items: [
			{ id: 'login', label: 'A login message', home: 'game', why: { game: 'Login, chat and lobby updates are game protocol messages. That is the level your parser works at.' } },
			{ id: 'prefix', label: 'A length prefix saying where a message ends', home: 'game',
				why: { game: 'The receiver sees an ordered stream, so protocol parsing needs its own framing rule such as a length prefix or a delimiter.',
					tcp: 'TCP delivers bytes in order but has no idea where one game message ends and the next begins.' } },
			{ id: 'order', label: 'Bytes arrive in order, none missing', home: 'tcp', why: { tcp: 'That is the TCP promise: an ordered, reliable stream of bytes between two sockets.' } },
			{ id: 'tuple', label: 'The four-tuple: source address and port, destination address and port', home: 'tcp', why: { tcp: 'A TCP connection is identified by these four values, which is why one connection reads differently in each direction.' } },
			{ id: 'split', label: 'One game message split across several segments', home: 'tcp',
				why: { tcp: 'TCP may split one message across several segments or combine bytes from several messages into one. A segment boundary is not a message boundary.',
					game: 'The game message is one unit to your parser. How it was cut up on the way is a TCP detail.' } },
			{ id: 'route', label: 'Routing data between host addresses', home: 'ip', why: { ip: 'Moving data between hosts by address is the IP packet’s job.' } },
			{ id: 'row', label: 'The row you see in the capture tool', home: 'cap',
				why: { cap: 'A capture records bytes and timing at one point. A row there is not automatically a game message, and it cannot say why it was sent.',
					game: 'A packet row can hold part of a message, or pieces of two, so it is not a game-message row.' } },
		],
		spotlight: 'split',
		summary: c => `Game protocol: ${c.game}. TCP stream: ${c.tcp}. IP packet: ${c.ip}. Capture: ${c.cap}. Keeping the layers apart is why you find message boundaries yourself instead of trusting packet boundaries.`,
	},

	'loopback-check': {
		eyebrow: 'Sort it',
		title: 'Would the proxy accept this endpoint?',
		description:
			'The lesson’s require_loopback check runs on both endpoints before any connection is opened. Move a chip and read what that endpoint would mean for the proxy.',
		mode: 'zones',
		zones: [
			{ id: 'ok', name: 'Accepted', sub: 'a loopback address, so it stays on this computer' },
			{ id: 'no', name: 'Refused with an error', sub: 'proxy endpoints must be loopback addresses' },
		],
		items: [
			{ id: 'server', label: '127.0.0.1:15000 (the local Wesnoth server)', home: 'ok', why: { ok: '127.0.0.1 is the IPv4 loopback address, so this endpoint stays on the same computer.' } },
			{ id: 'proxy', label: '127.0.0.1:27015 (the proxy’s own address)', home: 'ok', why: { ok: 'Same loopback address. The check looks at the IP address, not the port.' } },
			{ id: 'v6', label: '[::1]:15000 (IPv6 localhost)', home: 'ok', why: { ok: 'The check accepts the IPv6 localhost address too, so this one passes as well.' } },
			{ id: 'lan', label: '192.168.1.20:15000 (another computer on the network)', home: 'no',
				why: { no: 'It is not loopback. This proxy is intentionally not a general remote interception tool, so the check refuses before opening any connection.',
					ok: 'Accepting it would let a copied address from a different test point the proxy at another machine.' } },
			{ id: 'public', label: '8.8.8.8:15000 (a public internet address)', home: 'no', why: { no: 'Not loopback, so it is refused before anything connects.' } },
			{ id: 'any', label: '0.0.0.0:27015 (every network interface)', home: 'no',
				why: { no: 'The code compares with the localhost addresses exactly, and 0.0.0.0 is not one of them, so it is refused.',
					ok: 'Listening on every interface could let other machines connect, which is what the check exists to prevent.' } },
		],
		spotlight: 'lan',
		summary: c => `Accepted: ${c.ok} (these stay on this computer). Refused: ${c.no} (refused before any connection is opened, so a copied address from another test cannot quietly point the proxy elsewhere).`,
	},

	'live-vs-data-mod': {
		eyebrow: 'Sort it',
		title: 'Live memory patch or data-file mod?',
		description:
			'Both approaches can change one enemy. Each chip is a property. See which belong to one approach, which to the other, and which to both.',
		mode: 'venn',
		venn: { legend: 'Left circle: a live memory patch. Right circle: a data-file mod. The overlap is both.' },
		zones: [
			{ id: 'live', name: 'Live patch only', sub: '' },
			{ id: 'both', name: 'Both', sub: '' },
			{ id: 'data', name: 'Data mod only', sub: '' },
		],
		items: [
			{ id: 'ptr', label: 'You must find a live pointer or rewrite code', home: 'live', why: { live: 'A unit file lets you change an enemy without finding a live pointer or rewriting executable code. A live patch has to do one of those.', data: 'A data mod avoids this entirely: that is its advantage.' } },
			{ id: 'raw', label: 'Raw process memory is involved', home: 'live', why: { live: 'A live patch works inside the running process. The file-based mod involves no raw process memory.' } },
			{ id: 'teach', label: 'Teaches how a game represents behaviour', home: 'both', why: { both: 'The lesson says both approaches teach how games represent behaviour, which is why the course starts with a live number and ends with a mod.' } },
			{ id: 'enemy', label: 'Can change one enemy’s stats', home: 'both', why: { both: 'Either way the goal can be the same: change one number such as an enemy’s hit points.' } },
			{ id: 'diff', label: 'The change is a readable diff', home: 'data', why: { data: 'A text definition shows exactly what changed, line by line.', live: 'A patched byte in a running process leaves no readable record of what changed.' } },
			{ id: 'validate', label: 'The game can validate it', home: 'data', why: { data: 'The game checks the definition through its own rules when it loads it, so a mistake is caught there.' } },
			{ id: 'install', label: 'Players can install and remove it', home: 'data', why: { data: 'It is a package in its own folder with a manifest, so removing it leaves the base game untouched.' } },
			{ id: 'track', label: 'Updates are easy to track', home: 'data', why: { data: 'A manifest names the version and the tested game build (for example Flare 1.12), so compatibility is a quick check.' } },
		],
		spotlight: 'diff',
		summary: c => `Live patch only: ${c.live}. Both: ${c.both}. Data mod only: ${c.data}. When a supported extension point exists and meets the goal, the lesson says to choose it.`,
	},
};

// ------------------------------------------------------------------ helpers
const el = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
};

function mountBoard(root, board) {
	const zoneById = Object.fromEntries(board.zones.map(z => [z.id, z]));
	const itemById = Object.fromEntries(board.items.map(i => [i.id, i]));
	const home = () => Object.fromEntries(board.items.map(i => [i.id, i.home]));
	const state = { placed: home(), picked: null, note: null, dragging: null };
	const venn = board.mode === 'venn';

	root.replaceChildren();
	root.classList.toggle('sort-board--venn', venn);
	const copy = el('div', 'concept-lab__header-copy');
	copy.append(el('span', 'concept-lab__eyebrow', board.eyebrow || 'Sort it'), el('h3', '', board.title), el('p', 'concept-lab__description', board.description));
	const head = el('div', 'concept-lab__header');
	head.append(copy, el('span', 'concept-lab__live-badge', 'Explore'));
	const body = el('div', 'concept-lab__body');
	root.append(head, body);

	const invite = el('p', 'sort-board__invite');
	invite.textContent = 'Try moving a chip: drag it, or tap it then a zone. Amber marks a different choice; nothing is scored.';
	const help = el('details', 'sort-board__help');
	help.append(el('summary', '', 'Keyboard help'));
	const keys = el('ul');
	keys.append(
		el('li', '', `Focus a chip and press a zone number (1–${board.zones.length}) to move it there.`),
		el('li', '', 'Or press Enter on a chip, Tab to a zone’s Put here button, then press Enter.'),
		el('li', '', 'Press Escape on a chip to cancel the selection.')
	);
	help.append(keys);
	body.append(invite, help);

	// ---- zones
	const zoneEls = {};
	function makeZone(zone, index) {
		const section = el('section', 'sort-board__zone');
		section.dataset.zone = zone.id;
		const headRow = el('div', 'sort-board__zone-head');
		const titles = el('div');
		const heading = el('h4', 'sort-board__zone-name');
		heading.append(el('span', 'sort-board__key', String(index + 1)), document.createTextNode(zone.name));
		titles.append(heading);
		if (zone.sub) titles.append(el('p', 'sort-board__zone-sub', zone.sub));
		const count = el('span', 'sort-board__count', '0');
		headRow.append(titles, count);
		const put = el('button', 'sort-board__put', 'Put here');
		put.type = 'button';
		const bin = el('div', 'sort-board__bin');
		section.append(headRow, bin, put);
		zoneEls[zone.id] = { section, bin, count, put, index };
		put.addEventListener('click', () => {
			if (!state.picked) { setNote({ plain: 'Pick a chip first (tap it, or press Enter on it), then choose where it goes.' }); return; }
			place(state.picked, zone.id);
		});
		section.addEventListener('click', event => {
			if (event.target.closest('.sort-board__chip, .sort-board__put')) return;
			if (state.picked) place(state.picked, zone.id);
		});
		section.addEventListener('dragover', event => { if (state.dragging) { event.preventDefault(); section.classList.add('is-over'); } });
		section.addEventListener('dragleave', event => { if (!section.contains(event.relatedTarget)) section.classList.remove('is-over'); });
		section.addEventListener('drop', event => {
			event.preventDefault();
			section.classList.remove('is-over');
			const id = state.dragging || event.dataTransfer.getData('text/plain');
			if (itemById[id]) place(id, zone.id);
		});
		return section;
	}

	const stage = el('div', 'sort-board__stage');
	if (venn) {
		const legend = el('p', 'sort-board__legend', board.venn.legend);
		const wrap = el('div', 'sort-board__venn');
		const grid = el('div', 'sort-board__venn-grid');
		const a = el('span', 'sort-board__venn-shape sort-board__venn-shape--a');
		const b = el('span', 'sort-board__venn-shape sort-board__venn-shape--b');
		a.setAttribute('aria-hidden', 'true'); b.setAttribute('aria-hidden', 'true');
		grid.append(...board.zones.slice(0, 3).map(makeZone));
		wrap.append(a, b, grid);
		stage.append(legend, wrap);
		if (board.zones[3]) { const out = makeZone(board.zones[3], 3); out.classList.add('sort-board__zone--outside'); stage.append(out); }
	} else {
		stage.classList.add('sort-board__zones');
		stage.append(...board.zones.map(makeZone));
	}
	body.append(stage);

	const summary = el('p', 'sort-board__summary');
	summary.setAttribute('aria-live', 'polite');
	const explain = el('div', 'sort-board__explain');
	explain.setAttribute('role', 'status');
	explain.setAttribute('aria-live', 'polite');
	const actions = el('div', 'sort-board__actions');
	const mkButton = (label, hint) => { const b = el('button', 'concept-lab__example', label); b.type = 'button'; if (hint) b.title = hint; return b; };
	const mixBtn = mkButton('Mix them up', 'Scatter every chip, then see what each placement would mean');
	const showBtn = mkButton('Show me', 'Put everything where the lesson puts it and list the reasons');
	const resetBtn = mkButton('Reset', 'Back to the lesson’s sorting');
	actions.append(mixBtn, showBtn, resetBtn);

	const why = el('details', 'sort-board__why');
	why.append(el('summary', '', 'Why each one sits where it does in the lesson'));
	const list = el('ul');
	for (const item of board.items) {
		const li = el('li');
		li.append(el('strong', '', item.label), document.createTextNode(` → ${zoneById[item.home].name}. ${item.why[item.home]}`));
		list.append(li);
	}
	why.append(list);
	body.append(summary, explain, actions, why);

	// ---- chips
	const chipEls = {};
	for (const item of board.items) {
		const chip = el('button', 'sort-board__chip', item.label);
		chip.type = 'button';
		chip.draggable = true;
		chip.dataset.item = item.id;
		chip.setAttribute('aria-pressed', 'false');
		chip.setAttribute('aria-keyshortcuts', board.zones.map((_, i) => String(i + 1)).join(' '));
		chip.addEventListener('click', () => {
			state.picked = state.picked === item.id ? null : item.id;
			setNote({ item: item.id });
			render();
		});
		chip.addEventListener('keydown', event => {
			const n = Number(event.key);
			if (n >= 1 && n <= board.zones.length) { event.preventDefault(); place(item.id, board.zones[n - 1].id, true); }
			else if (event.key === 'Escape' && state.picked) { state.picked = null; render(); }
		});
		chip.addEventListener('dragstart', event => {
			state.dragging = item.id;
			event.dataTransfer.setData('text/plain', item.id);
			event.dataTransfer.effectAllowed = 'move';
			chip.classList.add('is-dragging');
		});
		chip.addEventListener('dragend', () => {
			state.dragging = null;
			chip.classList.remove('is-dragging');
			for (const z of Object.values(zoneEls)) z.section.classList.remove('is-over');
		});
		chipEls[item.id] = chip;
	}

	// ---- behaviour
	function place(id, zoneId, keepFocus) {
		state.placed[id] = zoneId;
		state.picked = null;
		setNote({ item: id, landed: true });
		render(keepFocus ? chipEls[id] : null);
		if (keepFocus) chipEls[id].focus();
	}

	function setNote(note) { state.note = note; }

	function renderNote() {
		explain.replaceChildren();
		explain.classList.remove('is-different');
		const note = state.note;
		if (!note) return;
		if (note.plain) { explain.append(el('p', '', note.plain)); return; }
		const item = itemById[note.item];
		const zoneId = state.placed[item.id];
		const zone = zoneById[zoneId];
		const lead = el('p', 'sort-board__lead');
		lead.append(el('strong', '', item.label), document.createTextNode(` → ${zone.name}`));
		explain.append(lead);
		if (zoneId === item.home) {
			explain.append(el('p', '', (note.opening ? 'Here is a worked example. ' : '') + item.why[zoneId]));
		} else {
			explain.classList.add('is-different');
			const tag = el('span', 'sort-board__tag', 'Different from the lesson');
			const here = item.why[zoneId] || `Here it would be read as “${zone.name}”${zone.sub ? ' (' + zone.sub + ')' : ''}.`;
			const p = el('p');
			p.append(tag, document.createTextNode(' ' + here + ' '));
			explain.append(p, el('p', '', `The lesson puts it under “${zoneById[item.home].name}”: ${item.why[item.home]}`));
		}
	}

	function render(focusAfter) {
		const active = focusAfter || (document.activeElement && root.contains(document.activeElement) && document.activeElement.classList.contains('sort-board__chip') ? document.activeElement : null);
		const counts = Object.fromEntries(board.zones.map(z => [z.id, 0]));
		let off = 0;
		for (const item of board.items) {
			const zoneId = state.placed[item.id];
			counts[zoneId]++;
			const chip = chipEls[item.id];
			const different = zoneId !== item.home;
			if (different) off++;
			zoneEls[zoneId].bin.append(chip);
			chip.classList.toggle('is-picked', state.picked === item.id);
			chip.classList.toggle('is-off', different);
			chip.setAttribute('aria-pressed', String(state.picked === item.id));
			chip.setAttribute('aria-label', `${item.label}, in ${zoneById[zoneId].name}${different ? ', different from the lesson' : ''}`);
		}
		for (const zone of board.zones) {
			const z = zoneEls[zone.id];
			z.count.textContent = `${counts[zone.id]} ${counts[zone.id] === 1 ? 'chip' : 'chips'}`;
			z.section.classList.toggle('is-target', !!state.picked);
			z.section.setAttribute('role', 'group');
			z.section.setAttribute('aria-label', `${zone.name}, ${counts[zone.id]} ${counts[zone.id] === 1 ? 'chip' : 'chips'}`);
			z.put.setAttribute('aria-disabled', state.picked ? 'false' : 'true');
			z.put.textContent = state.picked ? `Put “${itemById[state.picked].label.slice(0, 24)}${itemById[state.picked].label.length > 24 ? '…' : ''}” here` : 'Put here';
			z.put.setAttribute('aria-label', state.picked ? `Put ${itemById[state.picked].label} in ${zone.name}` : `Put the picked chip in ${zone.name}`);
		}
		summary.textContent = board.summary(counts) + (off ? ` (${off} ${off === 1 ? 'chip differs' : 'chips differ'} from the lesson’s version.)` : '');
		renderNote();
		if (active && active !== document.activeElement) active.focus();
	}

	mixBtn.addEventListener('click', () => {
		const ids = board.zones.map(z => z.id);
		let tries = 0;
		do {
			for (const item of board.items) state.placed[item.id] = ids[Math.floor(Math.random() * ids.length)];
			tries++;
		} while (tries < 30 && board.items.filter(i => state.placed[i.id] !== i.home).length < Math.ceil(board.items.length / 2));
		state.picked = null;
		setNote({ plain: 'Mixed up. Chips with a dashed amber edge are somewhere other than the lesson puts them. Tap one to read why the lesson sorts it where it does, or press Show me.' });
		render();
	});
	showBtn.addEventListener('click', () => {
		state.placed = home(); state.picked = null; why.open = true;
		setNote({ plain: 'This is the lesson’s sorting. The list below gives the reason for every chip.' });
		render();
	});
	resetBtn.addEventListener('click', () => {
		state.placed = home(); state.picked = null; why.open = false;
		setNote({ item: board.spotlight, opening: true });
		render();
	});

	setNote({ item: board.spotlight, opening: true });
	render();
}

export function mountSortBoards() {
	for (const root of document.querySelectorAll('[data-sort-board]')) {
		if (root.dataset.mounted) continue;
		const board = BOARDS[root.dataset.sortBoard];
		if (!board) continue;
		root.dataset.mounted = 'true';
		mountBoard(root, board);
	}
}
