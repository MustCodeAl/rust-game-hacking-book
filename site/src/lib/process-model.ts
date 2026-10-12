// Program, process and thread as one worked example (lesson 6.6, pages/10/06.mdx). Pure functions, no browser API: Astro renders
// the default view from sceneAt(null), the script redraws from sceneAt(i), and scripts/check-pe-diagram-models.ts checks every
// number by hand-computed values. The numbers continue the PE lessons: the image base, the entry point and the .data section
// are the ones from the sample file in lesson 5.1.
import { FILE_SIZE, PREFERRED_BASE, SECTIONS, SIZE_OF_IMAGE } from './pe-address.ts';
import { toHex } from './hex-field.ts';

export type ThreadId = 'A' | 'B';
export const THREADS: readonly ThreadId[] = ['A', 'B'];

/** The entry point of the sample file (lesson 5.1) as an RVA: any address inside .text, here 0x12C0. */
export const ENTRY_RVA = 0x12c0;
/** Thread A starts at the entry point: base 0x00400000 + RVA 0x12C0. */
export const ENTRY_A = PREFERRED_BASE + ENTRY_RVA;
/** Thread B starts at a worker function elsewhere in .text (illustrative). */
export const ENTRY_B = 0x00401500;
/** `add eax, 1` is the three bytes 83 C0 01, so every instruction moves EIP on by 3. */
export const INSTRUCTION_BYTES = 3;
/** The scheduler hands out turns of this many ticks. A tick is one instruction here; a real time slice is millions. */
export const SLICE_TICKS = 3;
/** Each stack reserves 1 MiB of address space, the PE default. */
export const STACK_BYTES = 0x100000;
/** Stacks grow downwards from the top of their region, so an empty stack's ESP is the first address past it. */
export const STACK_TOP: Readonly<Record<ThreadId, number>> = { A: 0x00300000, B: 0x00400000 };
/** The first byte of .data in memory: base + the section's RVA. A global variable `score` lives here. */
export const DATA_RVA = SECTIONS.find(section => section.name === '.data')?.virtualAddress ?? 0;
export const GLOBAL_ADDRESS = PREFERRED_BASE + DATA_RVA;
/** A local variable sits one word below the stack top. */
export const LOCAL_OFFSET = 4;
export const SCORE_VALUE = 10;
/** Who runs on each tick, 1 to 9. */
export const SCHEDULE: readonly ThreadId[] = ['A', 'A', 'A', 'B', 'B', 'B', 'A', 'A', 'A'];

export const hex8 = (value: number): string => `0x${toHex(value, 8)}`;
export const stackRegion = (thread: ThreadId): { readonly low: number; readonly high: number } => ({ low: STACK_TOP[thread] - STACK_BYTES, high: STACK_TOP[thread] - 1 });
export const localAddress = (thread: ThreadId): number => STACK_TOP[thread] - LOCAL_OFFSET;
const range = (low: number, high: number): string => `${hex8(low)} to ${hex8(high)}`;
const imageEnd = PREFERRED_BASE + SIZE_OF_IMAGE - 1;

export interface Registers { readonly eip: number; readonly esp: number; readonly eax: number }
export type ThreadState = 'absent' | 'running' | 'ready';

export interface ThreadView {
  readonly id: ThreadId;
  readonly state: ThreadState;
  /** The registers of this thread: live in the CPU while it runs, parked in its thread context in memory otherwise. */
  readonly registers: Registers;
  readonly where: 'cpu' | 'context' | 'none';
}

export interface Scene {
  readonly index: number | null;
  readonly title: string;
  readonly explain: string;
  readonly fileLit: boolean;
  readonly processPresent: boolean;
  readonly threads: readonly ThreadView[];
  /** Ticks completed so far (0 to 9). */
  readonly tick: number;
  /** The thread the CPU is running, or has just been given, and the registers it holds. */
  readonly cpu: { readonly runner: ThreadId | null; readonly registers: Registers | null };
  /** True in the steps that show registers being saved and loaded. */
  readonly switching: boolean;
  /** The shared global `score` has been written. */
  readonly scoreWritten: boolean;
}

const instructionsRun = (thread: ThreadId, ticks: number): number => SCHEDULE.slice(0, ticks).filter(who => who === thread).length;

/** The registers of a thread after `ticks` ticks of the schedule: EAX counts its ticks and EIP moves 3 bytes per tick. */
export function registersAfter(thread: ThreadId, ticks: number): Registers {
  const n = instructionsRun(thread, ticks);
  return { eip: (thread === 'A' ? ENTRY_A : ENTRY_B) + INSTRUCTION_BYTES * n, esp: STACK_TOP[thread], eax: n };
}

interface StepSpec {
  readonly title: string;
  readonly explain: string;
  readonly file: boolean;
  readonly process: boolean;
  readonly threads: readonly ThreadId[];
  readonly ticks: number;
  readonly runner: ThreadId | null;
  readonly switching?: boolean;
  readonly score?: boolean;
}

const a3 = registersAfter('A', 3), a6 = registersAfter('A', 6), a9 = registersAfter('A', 9);
const b0 = registersAfter('B', 0), b6 = registersAfter('B', 6);

export const STEPS: readonly StepSpec[] = [
  { title: 'A program is a file', file: true, process: false, threads: [], ticks: 0, runner: null,
    explain: `game.exe sits on disk: ${FILE_SIZE.toLocaleString('en-US')} bytes (${hex8(FILE_SIZE)}) of headers, instructions and data. Nothing in it is running. It uses no CPU time and no memory, only disk space.` },
  { title: 'Starting it creates a process', file: true, process: true, threads: [], ticks: 0, runner: null,
    explain: `Windows creates a process: a private address space, a handle table for the files and events it will open, and an owner. The loader maps the file's sections into that space at the image base. The image is ${hex8(SIZE_OF_IMAGE)} bytes, so it covers ${range(PREFERRED_BASE, imageEnd)}. No instruction has run yet: a process only holds resources.` },
  { title: 'The first thread starts', file: false, process: true, threads: ['A'], ticks: 0, runner: null,
    explain: `Windows creates thread A inside the process. It gets its own stack, ${STACK_BYTES / 0x100000} MiB of address space (${range(stackRegion('A').low, stackRegion('A').high)}), and its own registers. EIP starts at the entry point: base ${hex8(PREFERRED_BASE)} + RVA ${hex8(ENTRY_RVA)} = ${hex8(ENTRY_A)}. ESP is the first address past the empty stack, ${hex8(STACK_TOP.A)}.` },
  { title: 'A second thread joins', file: false, process: true, threads: ['A', 'B'], ticks: 0, runner: null,
    explain: `The game starts thread B. It lives in the same process, so it gets no new address space, only its own stack (${range(stackRegion('B').low, stackRegion('B').high)}) and its own registers: EIP ${hex8(ENTRY_B)}, ESP ${hex8(STACK_TOP.B)}. One process can hold many threads.` },
  { title: 'Memory is shared, stacks are not', file: false, process: true, threads: ['A', 'B'], ticks: 0, runner: null, score: true,
    explain: `Both threads see the same address ${hex8(GLOBAL_ADDRESS)}, the start of .data (base ${hex8(PREFERRED_BASE)} + RVA ${hex8(DATA_RVA)}). If A stores ${SCORE_VALUE} in the global score, B reads ${SCORE_VALUE}. A local variable is different: it lives on the thread's own stack, ${hex8(STACK_TOP.A)} − ${LOCAL_OFFSET} = ${hex8(localAddress('A'))} for A and ${hex8(STACK_TOP.B)} − ${LOCAL_OFFSET} = ${hex8(localAddress('B'))} for B, so the two never collide.` },
  { title: 'One core runs one thread at a time', file: false, process: true, threads: ['A', 'B'], ticks: 3, runner: 'A', score: true,
    explain: `On a single core the scheduler gives each thread a turn of ${SLICE_TICKS} ticks. Thread A goes first. Each tick runs add eax, 1, which is ${INSTRUCTION_BYTES} bytes, so EAX goes 1, 2, 3 and EIP goes ${hex8(ENTRY_A)} + ${INSTRUCTION_BYTES} × 3 = ${hex8(a3.eip)}. (A tick is one instruction here. A real time slice lasts a few milliseconds, millions of instructions.)` },
  { title: 'The turn ends: save one thread, load the other', file: false, process: true, threads: ['A', 'B'], ticks: 3, runner: 'B', switching: true, score: true,
    explain: `A context switch. The scheduler saves A's registers into A's thread context in memory: EAX ${a3.eax}, EIP ${hex8(a3.eip)}. Then it loads B's saved registers into the CPU: EAX ${b0.eax}, EIP ${hex8(b0.eip)}. EIP now points into B's code, so B is what runs next.` },
  { title: 'Thread B runs its turn', file: false, process: true, threads: ['A', 'B'], ticks: 6, runner: 'B', score: true,
    explain: `Ticks 4 to 6 belong to B: EAX goes 1, 2, 3 and EIP goes ${hex8(ENTRY_B)} + ${INSTRUCTION_BYTES} × 3 = ${hex8(b6.eip)}. Thread A waits, ready to run, with its registers parked in its context.` },
  { title: 'Switch back: restore A', file: false, process: true, threads: ['A', 'B'], ticks: 6, runner: 'A', switching: true, score: true,
    explain: `The scheduler saves B (EAX ${b6.eax}, EIP ${hex8(b6.eip)}) and restores A's saved registers: EAX ${a6.eax}, EIP ${hex8(a6.eip)}. A cannot tell it was ever paused: the next instruction it runs is exactly the one it was about to run.` },
  { title: 'Thread A carries on', file: false, process: true, threads: ['A', 'B'], ticks: 9, runner: 'A', score: true,
    explain: `Ticks 7 to 9 belong to A again. EAX goes from ${a6.eax} to ${a9.eax} and EIP goes ${hex8(a6.eip)} + ${INSTRUCTION_BYTES} × 3 = ${hex8(a9.eip)}. In nine ticks A ran six instructions and B three, and neither lost its place.` },
];

/** What the complete default view says: the whole picture, not any one step. */
export const OVERVIEW = {
  title: 'The complete picture',
  explain: `Everything at once: the program file, the process Windows built from it, two threads that share the process's memory but keep their own stacks and registers, and one core that took turns between them for nine ticks. Thread A ran ${instructionsRun('A', 9)} instructions, B ran ${instructionsRun('B', 9)}, and each kept its own count in EAX.`,
} as const;

/** The picture after step `index`; `null` is the complete default view (the last step, with everything shown). */
export function sceneAt(index: number | null): Scene {
  const stepIndex = index ?? STEPS.length - 1;
  const spec = STEPS[stepIndex];
  if (!spec) throw new RangeError(`No step ${stepIndex}.`);
  const threads: ThreadView[] = THREADS.map(id => {
    const registers = registersAfter(id, spec.ticks);
    if (!spec.threads.includes(id)) return { id, state: 'absent', registers, where: 'none' };
    return spec.runner === id ? { id, state: 'running', registers, where: 'cpu' } : { id, state: 'ready', registers, where: 'context' };
  });
  return {
    index, title: index === null ? OVERVIEW.title : spec.title, explain: index === null ? OVERVIEW.explain : spec.explain, fileLit: spec.file, processPresent: spec.process, threads, tick: spec.ticks,
    cpu: { runner: spec.runner, registers: spec.runner ? registersAfter(spec.runner, spec.ticks) : null },
    switching: spec.switching === true, scoreWritten: spec.score === true,
  };
}

/** Every problem found in the steps; an empty list means the example is consistent. */
export function modelProblems(): string[] {
  const problems: string[] = [];
  if (SCHEDULE.length !== 9) problems.push('the schedule should have nine ticks');
  for (let tick = 0; tick < SCHEDULE.length; tick += SLICE_TICKS) {
    if (new Set(SCHEDULE.slice(tick, tick + SLICE_TICKS)).size !== 1) problems.push(`ticks ${tick + 1} to ${tick + SLICE_TICKS} are not one thread's turn`);
  }
  if (STACK_TOP.B - STACK_TOP.A !== STACK_BYTES) problems.push('the two stacks should sit one stack-size apart');
  if (STEPS.some(step => step.explain.length === 0)) problems.push('a step has no explanation');
  return problems;
}
