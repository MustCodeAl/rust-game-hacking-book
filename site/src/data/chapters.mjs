// The book's chapters, in reading order. The sidebar, lesson headers, print
// book, and llms.txt all read this list, so a new chapter is added once here.
export const CHAPTERS = [
	{ number: 1, title: 'Start Here', emoji: '🧠', summary: 'Source-grounded questions, computers, memory, game data, and repeatable experiments.' },
	{ number: 2, title: 'Debugging & Control Flow', emoji: '🔍', summary: 'Assembly, breakpoints, code caves, moving addresses, and pointer paths.' },
	{ number: 3, title: 'Memory, Types & Ownership', emoji: '🦀', summary: 'External tools, C++ object layouts, containers, obfuscated values, strings, and DLL contracts.' },
	{ number: 4, title: 'Game State & Automation', emoji: '♟️', summary: 'Snapshots, fog of war, state machines, pathfinding, events, and telemetry.' },
	{ number: 5, title: '3D Games & Rendering', emoji: '🧭', summary: 'Coordinates, OpenGL state, aiming, recoil, radar, and overlays.' },
	{ number: 6, title: 'Protocols, Networks & IPC', emoji: '🌐', summary: 'Packets, framing, local proxies, shared memory, and named pipes.' },
	{ number: 7, title: 'Windows Binaries & Analysis Tools', emoji: '🧰', summary: 'PE files, exports, scanners, disassemblers, debuggers, call logs, and ETW.' },
	{ number: 8, title: 'DLLs, Hooks & In-Process Tools', emoji: '🛠️', summary: 'DLLs, injection, detours, imports, input, menus, and reliable tool design.' },
	{ number: 9, title: 'Game Files, Mods & Integrity', emoji: '🗂️', summary: 'Saves, textures, unit data, safe archives, reversible manifests, signatures, and encryption.' },
	{ number: 10, title: 'Processes, Handles & Threads', emoji: '🪟', summary: 'Build identity, least-privilege handles, memory maps, threads, API layers, and crash dumps.' },
	{ number: 11, title: 'DLL Loading, Defenses & DMA', emoji: '🛡️', summary: 'DLL loading, optional APIs, harmless toy defenses, the kernel boundary, and offline DMA evidence.' },
	{ number: 12, title: 'Lua Automation', emoji: '🌙', summary: 'Tables, host APIs, snapshots, state machines, limits, and virtual-machine internals.' },
	{ number: 13, title: 'Advanced Game Hacking', emoji: '🧩', summary: 'Game-state invariants, integrity gaps, anti-debug behavior, value transforms, robust hooks, update-resistant layouts, and bypass analysis.' },
	{ number: 14, title: 'Kernels, Hardware & Consoles', emoji: '🔌', summary: 'Kernels, device drivers, hypervisors, JTAG, game consoles, and emulators.' },
];

/** The chapter record for a lesson number such as "5.10". */
export function chapterOf(lesson) {
	const number = Number.parseInt(String(lesson).split('.')[0], 10);
	return CHAPTERS.find((chapter) => chapter.number === number);
}

/** Compare two lesson numbers numerically, so "5.10" sorts after "5.9". */
export function compareLessons(a, b) {
	const [ac, al] = String(a).split('.').map(Number);
	const [bc, bl] = String(b).split('.').map(Number);
	return ac - bc || al - bl;
}
