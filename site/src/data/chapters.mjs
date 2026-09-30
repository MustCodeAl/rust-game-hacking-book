// The book's chapters, in reading order. The sidebar, lesson headers, print
// book, and llms.txt all read this list, so a new chapter is added once here.
export const CHAPTERS = [
	{ number: 1, area: 'foundations', title: 'Game Hacking Foundations', emoji: '🧠', summary: 'Connect computer and game loops to programming, Rust, memory, and a first scan.' },
	{ number: 2, area: 'foundations', title: 'Instructions, Debuggers, and Addresses', emoji: '🔍', summary: 'Connect a built program to assembly, breakpoints, stable addresses, and reversible detours.' },
	{ number: 3, area: 'foundations', title: 'Types, Object Layouts, and Boundaries', emoji: '🦀', summary: 'Decode bytes into numbers, then recover typed values, objects, and collections across process boundaries.' },
	{ number: 4, area: 'foundations', title: 'Game State, Decisions, and Automation', emoji: '♟️', summary: 'Follow engine-owned state through snapshots, coordinates, decisions, feedback, and NPC behavior.' },
	{ number: 5, area: 'runtime', title: 'Executable Files and Runtime Analysis', emoji: '🧰', summary: 'Read executable layout, then use scanning, disassembly, debugging, and traces to explain running code.' },
	{ number: 6, area: 'runtime', title: 'In-Process Code, Hooks, and Input', emoji: '🛠️', summary: 'Build from DLL contracts to loading, hooks, input, commands, and reliable feature lifetimes.' },
	{ number: 7, area: 'runtime', title: '3D Space, Rendering, and Tool Design', emoji: '🧭', summary: 'Turn coordinates into camera views and pixels, then integrate rendering features and menus.' },
	{ number: 8, area: 'interfaces', title: 'Messages Across Networks and Processes', emoji: '🌐', summary: 'Follow messages from bytes and framing through protocol states, proxies, and local channels.' },
	{ number: 9, area: 'interfaces', title: 'Game Files, Mods, and Trust', emoji: '🗂️', summary: 'Read text and binary saves, assets, and mods as formats with integrity and trust constraints.' },
	{ number: 10, area: 'interfaces', title: 'Lua, Host Boundaries, and Virtual Machines', emoji: '🌙', summary: 'Express behavior through Lua, then connect computation limits to bytecode, values, and call frames.' },
	{ number: 11, area: 'systems', title: 'Windows Process Internals', emoji: '🪟', summary: 'Connect build and object identity to access rights, memory, threads, kernel services, and dumps.' },
	{ number: 12, area: 'systems', title: 'Process Boundaries and Physical Memory', emoji: '🛡️', summary: 'Trace DLL and driver boundaries before validating offline physical-memory captures.' },
	{ number: 13, area: 'systems', title: 'Advanced Game Hacking', emoji: '🧩', summary: 'Use invariants and telemetry to explain integrity checks, value transforms, control gaps, and repairs.' },
	{ number: 14, area: 'systems', title: 'Virtual Machines, Hardware, and Consoles', emoji: '🔌', summary: 'Compare guest execution, console architecture, hardware debugging, and software emulation.' },
];

// Reading colours identify subject areas, not a chapter's position in a cycle.
// Labels accompany them on the course map and contents; status and code-syntax
// colours have separate roles and never determine a chapter's colour.
export const READING_AREAS = [
	{ id: 'foundations', label: 'Foundations', tone: 1 },
	{ id: 'runtime', label: 'Runtime analysis', tone: 2 },
	{ id: 'interfaces', label: 'Formats and interfaces', tone: 3 },
	{ id: 'systems', label: 'Systems and trust', tone: 4 },
];

/** The chapter record for a lesson number such as "5.10". */
export function chapterOf(lesson) {
	const number = Number.parseInt(String(lesson).split('.')[0], 10);
	return CHAPTERS.find((chapter) => chapter.number === number);
}

/** The named subject area a chapter belongs to. */
export function chapterArea(number) {
	const chapter = CHAPTERS.find((chapter) => chapter.number === number);
	return READING_AREAS.find((area) => area.id === chapter?.area);
}

/** A chapter's explicitly assigned reading colour, shared by every surface. */
export function chapterTone(number) {
	const area = chapterArea(number);
	if (!area) throw new Error(`Chapter ${number} needs an explicit reading colour role.`);
	return area.tone;
}

/** Compare two lesson numbers numerically, so "5.10" sorts after "5.9". */
export function compareLessons(a, b) {
	const [ac, al] = String(a).split('.').map(Number);
	const [bc, bl] = String(b).split('.').map(Number);
	return ac - bc || al - bl;
}
