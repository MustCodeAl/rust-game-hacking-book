/**
 * Three storage roles and how long each lasts: module (static) data, a function's stack frame, and a heap block.
 * One small story told in five steps. Pure model: no browser API.
 */
import { toHex } from './hex-field.ts';

export type Place = 'static' | 'stack' | 'heap';
export type Life = 'absent' | 'live' | 'released';

export interface Item { readonly id: string; readonly place: Place; readonly name: string; readonly note: string }

/** The block's address is illustrative; the pointer's value is, by definition, the same number. */
export const BLOCK_ADDRESS = 0x00a41f00;
const ADDRESS = `0x${toHex(BLOCK_ADDRESS, 8)}`;

export const ITEMS: readonly Item[] = [
  { id: 'max', place: 'static', name: 'MAX_UNITS', note: 'A global constant in the module’s data. It exists for the whole run of the program, or until the module is unloaded.' },
  { id: 'caller', place: 'stack', name: 'Caller’s frame', note: 'The frame of the function that calls recruit(). It stays until that function returns.' },
  { id: 'callee', place: 'stack', name: 'recruit() frame', note: 'Created by the call and released by the return. Its locals, including the pointer p, end with it.' },
  { id: 'block', place: 'heap', name: 'Unit block', note: 'A heap allocation. It lasts from allocation until its owner frees it, whatever the stack is doing.' },
];

export interface StepView {
  readonly index: number;
  readonly title: string;
  readonly caption: string;
  readonly lives: Readonly<Record<string, Life>>;
  readonly values: Readonly<Record<string, string>>;
}

/** The step shown when no single step is selected: the moment when all three roles exist at once. */
export const DEFAULT_STEP = 2;

export function lifetimeSteps(): readonly StepView[] {
  return [
    { index: 0, title: 'The program is running',
      caption: 'Static data exists. The caller’s frame is on the stack. The heap holds no Unit yet, and its variable unit is not set.',
      lives: { max: 'live', caller: 'live', callee: 'absent', block: 'absent' },
      values: { max: '6', caller: 'unit = not set', callee: '—', block: '—' } },
    { index: 1, title: 'Call recruit()',
      caption: 'The call creates a new frame on the stack, with room for count and the pointer p. p holds no address yet.',
      lives: { max: 'live', caller: 'live', callee: 'live', block: 'absent' },
      values: { max: '6', caller: 'unit = not set', callee: 'count = 3, p = not set', block: '—' } },
    { index: 2, title: 'Allocate a Unit on the heap',
      caption: `The allocator hands back a block at ${ADDRESS}. That number is stored in p, so p, a slot inside the stack frame, now refers to an object that is not inside the frame.`,
      lives: { max: 'live', caller: 'live', callee: 'live', block: 'live' },
      values: { max: '6', caller: 'unit = not set', callee: `count = 3, p = ${ADDRESS}`, block: `at ${ADDRESS}: Unit { hp: 10 }` } },
    { index: 3, title: 'recruit() returns the pointer',
      caption: `Returning ends the frame, so count and p are released. The heap block is not part of the frame, so it stays. The caller received the number ${ADDRESS} and keeps it in unit.`,
      lives: { max: 'live', caller: 'live', callee: 'released', block: 'live' },
      values: { max: '6', caller: `unit = ${ADDRESS}`, callee: 'released; old bytes may linger', block: `at ${ADDRESS}: Unit { hp: 10 }` } },
    { index: 4, title: 'The owner frees the block',
      caption: `Freeing ends the block’s life. The caller’s variable still holds ${ADDRESS}, but that number now names memory the program no longer owns: a dangling pointer. Static data is untouched throughout.`,
      lives: { max: 'live', caller: 'live', callee: 'released', block: 'released' },
      values: { max: '6', caller: `unit = ${ADDRESS} (dangling)`, callee: 'released; old bytes may linger', block: 'freed' } },
  ];
}

/** Life state of one item at one step. */
export function lifeOf(step: StepView, id: string): Life {
  const life = step.lives[id];
  if (!life) throw new RangeError(`No item ${id}.`);
  return life;
}
