// Static versus dynamic linking for LinkingModes.astro. Pure data and arithmetic: the sizes are illustrative, but every total
// below is computed from them, and the call chain is the only thing that differs between the two modes.
export type LinkId = 'static' | 'dynamic';

/** Illustrative sizes: the game's own code, and the library it uses. */
export const YOUR_CODE_KIB = 40;
export const LIBRARY_KIB = 60;

export type StackItem =
  | { readonly type: 'module'; readonly id: string; readonly title: string; readonly note: string; readonly parts: readonly string[] }
  | { readonly type: 'call'; readonly kind: 'function' | 'system'; readonly label: string };

export interface LinkMode {
  readonly id: LinkId;
  readonly tab: string;
  readonly title: string;
  readonly summary: string;
  /** Files on disk: name, KiB, and what is inside. */
  readonly files: readonly { readonly name: string; readonly kib: number; readonly inside: string }[];
  /** The running process from the game's code down to the kernel. */
  readonly stack: readonly StackItem[];
  readonly facts: readonly string[];
}

const exeStatic = YOUR_CODE_KIB + LIBRARY_KIB;

export const LINK_MODES: readonly LinkMode[] = [
  {
    id: 'static', tab: 'Static linking', title: 'Static linking: the library is copied into the program',
    summary: 'The linker copies the library code the game needs into game.exe when the program is built. One file, one image.',
    files: [{ name: 'game.exe', kib: exeStatic, inside: `your code ${YOUR_CODE_KIB} KiB + library copy ${LIBRARY_KIB} KiB` }],
    stack: [
      { type: 'module', id: 'exe', title: 'game.exe image', note: 'One image holds your code and its own copy of the library.', parts: ['your code', 'library code (copied in)'] },
      { type: 'call', kind: 'function', label: 'Function call into a system DLL: still user mode' },
      { type: 'module', id: 'system', title: 'ntdll.dll image', note: 'A system DLL every Windows process has; its stubs run the system call.', parts: ['system-call stubs'] },
      { type: 'call', kind: 'system', label: 'System call: the CPU switches to kernel mode' },
    ],
    facts: [
      'The copy happens at build time, so the library cannot change unless you build and ship a new game.exe.',
      'Calling the library is an ordinary function call inside one image. It never leaves user mode.',
    ],
  },
  {
    id: 'dynamic', tab: 'Dynamic linking (DLL)', title: 'Dynamic linking: the library stays in its own DLL',
    summary: 'The linker only records which DLL and which functions the game needs. When the program starts, the loader maps library.dll into the same process.',
    files: [
      { name: 'game.exe', kib: YOUR_CODE_KIB, inside: `your code ${YOUR_CODE_KIB} KiB and an import table` },
      { name: 'library.dll', kib: LIBRARY_KIB, inside: `library code ${LIBRARY_KIB} KiB` },
    ],
    stack: [
      { type: 'module', id: 'exe', title: 'game.exe image', note: 'Your code only, plus the import address table the loader fills in.', parts: ['your code'] },
      { type: 'call', kind: 'function', label: 'Function call into another image: still user mode, same address space' },
      { type: 'module', id: 'dll', title: 'library.dll image', note: 'A separate image, mapped into the same process on the calling thread’s stack.', parts: ['library code'] },
      { type: 'call', kind: 'function', label: 'Function call into a system DLL: still user mode' },
      { type: 'module', id: 'system', title: 'ntdll.dll image', note: 'A system DLL every Windows process has; its stubs run the system call.', parts: ['system-call stubs'] },
      { type: 'call', kind: 'system', label: 'System call: the CPU switches to kernel mode' },
    ],
    facts: [
      'The loader resolves the imports at start-up, so a fixed library.dll improves every program that uses it without rebuilding them.',
      'Calling the library jumps into another image, but still in user mode: the same process, the same address space.',
    ],
  },
];

/** Disk space for `programs` programs that all use the library, as the sum that gives it. */
export function diskTotal(id: LinkId, programs: number): { readonly kib: number; readonly sum: string } {
  if (id === 'static') {
    const each = YOUR_CODE_KIB + LIBRARY_KIB;
    return { kib: programs * each, sum: `${programs} × (${YOUR_CODE_KIB} + ${LIBRARY_KIB}) = ${programs * each} KiB` };
  }
  return { kib: programs * YOUR_CODE_KIB + LIBRARY_KIB, sum: `${programs} × ${YOUR_CODE_KIB} + ${LIBRARY_KIB} = ${programs * YOUR_CODE_KIB + LIBRARY_KIB} KiB` };
}

/** Every call in a mode's stack, in order. The last is always the system call into the kernel. */
export const callsOf = (mode: LinkMode): readonly ('function' | 'system')[] => mode.stack.flatMap(item => (item.type === 'call' ? [item.kind] : []));
export const imagesOf = (mode: LinkMode): readonly string[] => mode.stack.flatMap(item => (item.type === 'module' ? [item.title] : []));
