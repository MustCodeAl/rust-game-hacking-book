import type { DebuggerStep } from './debugger-model';

export const CPU_SOURCE = [
  'PC points to the opcode at 0x02',
  'opcode = program[PC]; PC = 0x03',
  'decode opcode 02 as LDA',
  'address = program[PC]; PC = 0x04',
  'A = RAM[address]; Z = (A == 0)',
];

export function cpuDebuggerSteps(byte: number): DebuggerStep[] {
  if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new RangeError('RAM needs a whole byte from 0 to 255.');
  const state = (pc: string, a: number, z: number, cycles: number): Record<string, string | number> => ({ PC: pc, A: a, X: 2, Z: z, cycles });
  return [
    { line: 1, description: 'Starting state. PC selects program address 0x02. Fetch the opcode next.', registers: state('0x02', 0, 0, 2), variables: { 'RAM[0x80]': byte, buffer: '—' } },
    { line: 2, description: 'Fetched opcode 02 from program address 0x02. PC advances to 0x03. One memory read adds one cycle.', registers: state('0x03', 0, 0, 3), variables: { 'RAM[0x80]': byte, buffer: '02' } },
    { line: 3, description: 'Decoded 02 as LDA. Decoding reads no memory, so the cycle count stays at 3.', registers: state('0x03', 0, 0, 3), variables: { 'RAM[0x80]': byte, buffer: '02' } },
    { line: 4, description: 'Fetched operand 80 from program address 0x03. PC advances to 0x04. This read adds one cycle.', registers: state('0x04', 0, 0, 4), variables: { 'RAM[0x80]': byte, buffer: '80', address: '0x80' } },
    { line: 5, description: `Read RAM[0x80] into A. A becomes ${byte}; Z is ${byte === 0 ? '1 because A is zero' : '0 because A is not zero'}. RAM still holds ${byte}. Three reads cost three cycles: 2 + 3 = 5.`, registers: state('0x04', byte, byte === 0 ? 1 : 0, 5), variables: { 'RAM[0x80]': byte, buffer: byte, address: '0x80' } },
  ];
}
