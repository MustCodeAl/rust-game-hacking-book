// The book's chapters, in reading order. The sidebar, lesson headers, print
// book, and llms.txt all read this list, so a new chapter is added once here.
export const CHAPTERS = [
	{ number: 1, area: "foundations", title: "Computer, Game, and Code Foundations", emoji: "🧠", summary: "CPU and stored values → game objects → a small Rust program → an owned, resettable lab → memory, scanning, and bits" },
	{ number: 2, area: "foundations", title: "Following Instructions and Addresses", emoji: "🔍", summary: "A changing value → assembly and a paused process → callers → moving addresses and pointer paths → preserved control flow" },
	{ number: 3, area: "foundations", title: "Typed Memory, Ownership, and Object Layouts", emoji: "🦀", summary: "A checked boundary → deeper Rust at that boundary → decoded values → external copies → objects, collections, and text" },
	{ number: 4, area: "foundations", title: "Game State and Bounded Decisions", emoji: "♟️", summary: "An engine frame → copied players → guarded actions → coordinates and grids → feedback, targets, paths, events, and basic NPC decisions" },
	{ number: 5, area: "runtime", title: "Executable Maps, Instruction References, and Scans", emoji: "🧰", summary: "PE layouts and exports → precise instruction lookup → patterns and regions → decoding → tracing profiles and parallel captures" },
	{ number: 6, area: "systems", title: "Windows Processes and Callable Interfaces", emoji: "🪟", summary: "Process resources → rights and owned handles → pages and threads → call contracts → engine scheduling, input queues, debug events, and bounded observation" },
	{ number: 7, area: "runtime", title: "Camera Geometry and Rendering APIs", emoji: "🧭", summary: "Coordinate frames → pipeline state → OpenGL observations → collision and aim geometry → motion, radar, projection, and Direct3D interfaces" },
	{ number: 8, area: "runtime", title: "In-Process Tools, Input, and Integration", emoji: "🛠️", summary: "DLL lifetime → loading → reversible detours and import hooks → game input and commands → rendered menus and snapshots → architecture and safe removal" },
	{ number: 9, area: "interfaces", title: "Network Messages, Authority, and IPC", emoji: "🌐", summary: "Programs exchanging messages → what the server discloses → capture, parsing, and legal session order → clients, relays, local transports, and an engine example" },
	{ number: 10, area: "interfaces", title: "Game Files, Mods, and Artifact Trust", emoji: "🗂️", summary: "Saved state and assets → inspect and edit a copied file → safe packages and reversible mods → hashes, exact build identity, signatures, and encryption" },
	{ number: 11, area: "interfaces", title: "NPC Policy, Lua, and Script Execution", emoji: "🌙", summary: "Remembered observations and decisions → Lua and the host interface → bounded script policy → computability limits → bytecodes, values, and call frames" },
	{ number: 12, area: "systems", title: "Loaders, Kernel Services, and Trust Boundaries", emoji: "🛡️", summary: "Module identity and loading → dynamic calls → kernel authority and system calls → driver requests → trust boundaries and failed checks" },
	{ number: 13, area: "systems", title: "Physical Memory, Machines, and Hardware", emoji: "🔌", summary: "DMA and page translation → virtual guests → firmware and consoles → chip debug access → emulated instructions and time" },
	{ number: 14, area: "systems", title: "Versioned Evidence, State, and Integrity", emoji: "🧩", summary: "An exact-build layout → bounded call logs and saved captures → state invariants and correlated telemetry → integrity signals and reversible representations" },
	{ number: 15, area: "systems", title: "Defensive Design and Anti-Cheat", emoji: "🛡️", summary: "Why validation matters → server and client observations → detection and review → two isolated control-gap examples → documented protection and resilient game design" },
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
