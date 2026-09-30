// The book's chapters, in reading order. The sidebar, lesson headers, print
// book, and llms.txt all read this list, so a new chapter is added once here.
export const CHAPTERS = [
	{ number: 1, title: 'Game Hacking Foundations', emoji: '🧠', summary: 'Connect computer and game loops to programming, Rust, memory, and a first scan.' },
	{ number: 2, title: 'Instructions, Debuggers, and Addresses', emoji: '🔍', summary: 'Connect a built program to assembly, breakpoints, stable addresses, and reversible detours.' },
	{ number: 3, title: 'Types, Object Layouts, and Boundaries', emoji: '🦀', summary: 'Decode bytes into numbers, then recover typed values, objects, and collections across process boundaries.' },
	{ number: 4, title: 'Game State, Decisions, and Automation', emoji: '♟️', summary: 'Follow engine-owned state through snapshots, coordinates, decisions, feedback, and NPC behavior.' },
	{ number: 5, title: 'Executable Files and Runtime Analysis', emoji: '🧰', summary: 'Read executable layout, then use scanning, disassembly, debugging, and traces to explain running code.' },
	{ number: 6, title: 'In-Process Code, Hooks, and Input', emoji: '🛠️', summary: 'Build from DLL contracts to loading, hooks, input, commands, and reliable feature lifetimes.' },
	{ number: 7, title: '3D Space, Rendering, and Tool Design', emoji: '🧭', summary: 'Turn coordinates into camera views and pixels, then integrate rendering features and menus.' },
	{ number: 8, title: 'Messages Across Networks and Processes', emoji: '🌐', summary: 'Follow messages from bytes and framing through protocol states, proxies, and local channels.' },
	{ number: 9, title: 'Game Files, Mods, and Trust', emoji: '🗂️', summary: 'Read text and binary saves, assets, and mods as formats with integrity and trust constraints.' },
	{ number: 10, title: 'Lua, Host Boundaries, and Virtual Machines', emoji: '🌙', summary: 'Express behavior through Lua, then connect computation limits to bytecode, values, and call frames.' },
	{ number: 11, title: 'Windows Process Internals', emoji: '🪟', summary: 'Connect build and object identity to access rights, memory, threads, kernel services, and dumps.' },
	{ number: 12, title: 'Process Boundaries and Physical Memory', emoji: '🛡️', summary: 'Trace DLL and driver boundaries before validating offline physical-memory captures.' },
	{ number: 13, title: 'Advanced Game Hacking', emoji: '🧩', summary: 'Use invariants and telemetry to explain integrity checks, value transforms, control gaps, and repairs.' },
	{ number: 14, title: 'Virtual Machines, Hardware, and Consoles', emoji: '🔌', summary: 'Compare guest execution, console architecture, hardware debugging, and software emulation.' },
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
