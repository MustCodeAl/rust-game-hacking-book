// The book's chapters, in reading order. The sidebar, lesson headers, print
// book, and llms.txt all read this list, so a new chapter is added once here.
export const CHAPTERS = [
	{ number: 1, title: 'Game Hacking Foundations', emoji: '🧠', summary: 'From computer and game loops to Rust, memory, and a first scan: learn the core model before the tools.' },
	{ number: 2, title: 'Instructions, Debuggers, and Addresses', emoji: '🔍', summary: 'Follow changing game state through assembly, breakpoints, stable addresses, and reversible detours.' },
	{ number: 3, title: 'Types, Object Layouts, and Boundaries', emoji: '🦀', summary: 'Turn bytes into typed values and object layouts across process and language boundaries.' },
	{ number: 4, title: 'Game State, Decisions, and Automation', emoji: '♟️', summary: 'Model a game as snapshots, decisions, and feedback before building guarded observers and automation.' },
	{ number: 5, title: 'Executable Files and Runtime Analysis', emoji: '🧰', summary: 'Read executable layout, then use scanning, disassembly, debugging, and traces to explain running code.' },
	{ number: 6, title: 'In-Process Code, Hooks, and Input', emoji: '🛠️', summary: 'Follow DLL loading through reversible detours, import hooks, input paths, and a separate tool menu.' },
	{ number: 7, title: '3D Space, Rendering, and Tool Design', emoji: '🧭', summary: 'Connect coordinates and camera motion to pixels, then bring rendering features into a reliable tool.' },
	{ number: 8, title: 'Messages Across Networks and Processes', emoji: '🌐', summary: 'Follow messages from bytes and framing through protocol states, proxies, and local channels.' },
	{ number: 9, title: 'Game Files, Mods, and Trust', emoji: '🗂️', summary: 'Read text and binary saves, assets, and mods as formats with integrity and trust constraints.' },
	{ number: 10, title: 'Lua, Host Boundaries, and Virtual Machines', emoji: '🌙', summary: 'Use Lua to express game behavior safely, then see how its host interface and virtual machine work.' },
	{ number: 11, title: 'Windows Process Internals', emoji: '🪟', summary: 'Deepen the process model through build identity, access rights, virtual memory, threads, API paths, and dumps.' },
	{ number: 12, title: 'Process Boundaries and Physical Memory', emoji: '🛡️', summary: 'Trace DLL loading and kernel trust boundaries before validating offline physical-memory captures.' },
	{ number: 13, title: 'Advanced Game Hacking', emoji: '🧩', summary: 'Reason from invariants and telemetry to integrity failures, value transforms, hooks, and repairs.' },
	{ number: 14, title: 'Kernels, Hardware, and Consoles', emoji: '🔌', summary: 'Follow execution beyond user mode into kernels, drivers, hypervisors, hardware, and emulators.' },
];

/** The chapter record for a lesson number such as "5.10". */
export function chapterOf(lesson) {
	const number = Number.parseInt(String(lesson).split('.')[0], 10);
	return CHAPTERS.find((chapter) => chapter.number === number);
}

/**
 * Which of the palette's four accent colours a chapter wears, 1 to 4 in turn:
 * chapter 1 takes the first, chapter 5 the first again. The home card, the
 * sidebar number, and the lesson header all use it, so a chapter keeps one
 * colour wherever it appears.
 */
export function chapterTone(number) {
	return ((Math.max(1, number) - 1) % 4) + 1;
}

/** Compare two lesson numbers numerically, so "5.10" sorts after "5.9". */
export function compareLessons(a, b) {
	const [ac, al] = String(a).split('.').map(Number);
	const [bc, bl] = String(b).split('.').map(Number);
	return ac - bc || al - bl;
}
