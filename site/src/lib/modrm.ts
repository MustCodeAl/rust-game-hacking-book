/**
 * x86 ModR/M and SIB bytes in 32-bit addressing (Intel SDM Vol. 2, Table 2-2 and Table 2-3).
 * ModR/M = mod(2 bits) | reg(3 bits) | r/m(3 bits). Pure model: no browser API.
 */
import { toHex } from './hex-field.ts';

export const REG8 = ['AL', 'CL', 'DL', 'BL', 'AH', 'CH', 'DH', 'BH'] as const;
export const REG16 = ['AX', 'CX', 'DX', 'BX', 'SP', 'BP', 'SI', 'DI'] as const;
export const REG32 = ['EAX', 'ECX', 'EDX', 'EBX', 'ESP', 'EBP', 'ESI', 'EDI'] as const;
/** Operation selected by the reg field (/digit) for opcodes 80, 81 and 83. */
export const GROUP1 = ['ADD', 'OR', 'ADC', 'SBB', 'AND', 'SUB', 'XOR', 'CMP'] as const;
/** The twelve bytes the lesson's decoder offers as one-click examples. */
export const EXAMPLE_BYTES: readonly number[] = [0x00, 0x08, 0x45, 0x84, 0xc0, 0xd8, 0xe5, 0x05, 0x24, 0x15, 0x7f, 0xff];

export type Mod = 0 | 1 | 2 | 3;
export type RmKind = 'register' | 'base' | 'base+disp8' | 'base+disp32' | 'sib' | 'sib+disp8' | 'sib+disp32' | 'disp32';

export interface RegisterNames { readonly r8: string; readonly r16: string; readonly r32: string }

export interface ModRM {
  readonly byte: number;
  readonly hex: string;
  /** Eight binary digits. */
  readonly binary: string;
  readonly mod: Mod;
  readonly reg: number;
  readonly rm: number;
  readonly modBits: string;
  readonly regBits: string;
  readonly rmBits: string;
  readonly regNames: RegisterNames;
  /** The reg field read as an opcode extension: /digit and the group-1 operation it selects. */
  readonly regDigit: number;
  readonly group1: string;
  readonly rmKind: RmKind;
  /** Effective-address text in the notation of Intel's Table 2-2. */
  readonly addressForm: string;
  /** For mod = 11, the register the r/m field names. */
  readonly rmNames: RegisterNames | null;
  readonly hasSib: boolean;
  /** Displacement bytes that follow the ModR/M byte (and the SIB byte, if any). */
  readonly displacementBytes: 0 | 1 | 4;
  /** Bytes after the ModR/M byte that belong to the operand: SIB + displacement. */
  readonly followBytes: number;
  /** mod = 00 with a SIB byte: a SIB base field of 101 adds a 32-bit displacement and no base register. */
  readonly sibMayAddDisp32: boolean;
}

export function isByte(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xff;
}

export function encodeModRM(mod: number, reg: number, rm: number): number {
  if (![mod, reg, rm].every(Number.isInteger) || mod < 0 || mod > 3 || reg < 0 || reg > 7 || rm < 0 || rm > 7) throw new RangeError('mod is 0 to 3; reg and r/m are 0 to 7.');
  return (mod << 6) | (reg << 3) | rm;
}

const names = (index: number): RegisterNames => ({ r8: REG8[index] ?? '?', r16: REG16[index] ?? '?', r32: REG32[index] ?? '?' });
const bits = (value: number, width: number): string => value.toString(2).padStart(width, '0');

/** Effective-address text for one mod and r/m, exactly as Table 2-2 writes it. */
export function effectiveAddress(mod: Mod, rm: number): { form: string; kind: RmKind } {
  const base = REG32[rm] ?? '?';
  if (mod === 3) return { form: `${REG32[rm]}/${REG16[rm]}/${REG8[rm]}`, kind: 'register' };
  if (rm === 4) return { form: mod === 0 ? '[--][--]' : `[--][--]+disp${mod === 1 ? 8 : 32}`, kind: mod === 0 ? 'sib' : mod === 1 ? 'sib+disp8' : 'sib+disp32' };
  if (mod === 0) return rm === 5 ? { form: 'disp32', kind: 'disp32' } : { form: `[${base}]`, kind: 'base' };
  return { form: `[${base}]+disp${mod === 1 ? 8 : 32}`, kind: mod === 1 ? 'base+disp8' : 'base+disp32' };
}

export function decodeModRM(byte: number): ModRM {
  if (!isByte(byte)) throw new RangeError('A ModR/M byte is 0x00 to 0xFF.');
  const mod = (byte >> 6) as Mod;
  const reg = (byte >> 3) & 7;
  const rm = byte & 7;
  const { form, kind } = effectiveAddress(mod, rm);
  const hasSib = mod !== 3 && rm === 4;
  const displacementBytes: 0 | 1 | 4 = mod === 3 ? 0 : kind === 'disp32' ? 4 : mod === 1 ? 1 : mod === 2 ? 4 : 0;
  return {
    byte, hex: toHex(byte, 2), binary: bits(byte, 8), mod, reg, rm,
    modBits: bits(mod, 2), regBits: bits(reg, 3), rmBits: bits(rm, 3),
    regNames: names(reg), regDigit: reg, group1: GROUP1[reg] ?? '?',
    rmKind: kind, addressForm: form, rmNames: mod === 3 ? names(rm) : null,
    hasSib, displacementBytes, followBytes: (hasSib ? 1 : 0) + displacementBytes,
    sibMayAddDisp32: hasSib && mod === 0,
  };
}

/** One row of Table 2-2's left block for a chosen mod. */
export interface RmRow { readonly rm: number; readonly bits: string; readonly form: string; readonly hex: string }
export function rmRows(mod: Mod): readonly RmRow[] {
  return Array.from({ length: 8 }, (_, rm) => ({ rm, bits: bits(rm, 3), form: effectiveAddress(mod, rm).form, hex: toHex(encodeModRM(mod, 0, rm), 2) }));
}

/** One row of the reg field: the register in each width, the /digit and the group-1 operation. */
export interface RegRow extends RegisterNames { readonly reg: number; readonly bits: string; readonly group1: string }
export function regRows(): readonly RegRow[] {
  return Array.from({ length: 8 }, (_, reg) => ({ reg, bits: bits(reg, 3), ...names(reg), group1: GROUP1[reg] ?? '?' }));
}

export function describeMod(mod: Mod): string {
  switch (mod) {
    case 0: return 'A memory operand with no displacement, except that r/m = 101 means a 32-bit absolute address.';
    case 1: return 'A memory operand plus an 8-bit displacement (one byte) after this byte.';
    case 2: return 'A memory operand plus a 32-bit displacement (four bytes) after this byte.';
    case 3: return 'A register operand. No memory is read or written.';
  }
}

export function describeReg(m: ModRM): string {
  return `As a register operand: ${m.regNames.r8} (8-bit), ${m.regNames.r16} (16-bit) or ${m.regNames.r32} (32-bit); the opcode decides the width. Or, for opcodes such as 83, an opcode extension: /${m.regDigit}, which selects ${m.group1}.`;
}

export function describeRm(m: ModRM): string {
  if (m.rmNames) return `The register ${m.rmNames.r32} (32-bit), ${m.rmNames.r16} (16-bit) or ${m.rmNames.r8} (8-bit) is the operand.`;
  switch (m.rmKind) {
    case 'register': return 'The register named by r/m is the operand.';
    case 'disp32': return 'No base register: the 32-bit displacement that follows is the whole address.';
    case 'base': return `The address is the value in ${REG32[m.rm]}.`;
    case 'base+disp8': return `The address is ${REG32[m.rm]} plus the signed 8-bit displacement that follows.`;
    case 'base+disp32': return `The address is ${REG32[m.rm]} plus the 32-bit displacement that follows.`;
    case 'sib': return 'r/m = 100 does not name a register here. It means a SIB byte follows and supplies the base and index.';
    case 'sib+disp8': return 'r/m = 100 means a SIB byte follows, then a signed 8-bit displacement.';
    case 'sib+disp32': return 'r/m = 100 means a SIB byte follows, then a 32-bit displacement.';
  }
}

export function describeFollow(m: ModRM): string {
  const parts: string[] = [];
  if (m.hasSib) parts.push('a SIB byte');
  if (m.displacementBytes === 1) parts.push('an 8-bit displacement (1 byte)');
  if (m.displacementBytes === 4) parts.push('a 32-bit displacement (4 bytes)');
  if (parts.length === 0) return 'Nothing more belongs to this operand: the instruction continues with its next field (such as an immediate) or ends.';
  const extra = m.sibMayAddDisp32 ? ' If the SIB base field is 101, a 32-bit displacement follows too and there is no base register.' : '';
  return `After this byte come ${parts.join(' and ')}: ${m.followBytes} byte${m.followBytes === 1 ? '' : 's'}.${extra}`;
}

// ---- SIB byte (scale | index | base) ----
export interface Sib {
  readonly byte: number;
  readonly hex: string;
  readonly binary: string;
  readonly scale: 1 | 2 | 4 | 8;
  readonly index: number;
  readonly base: number;
  readonly indexName: string | null;
  /** null when mod = 00 and base = 101: no base register, a 32-bit displacement instead. */
  readonly baseName: string | null;
  readonly expression: string;
}

export function decodeSib(byte: number, mod: Mod): Sib {
  if (!isByte(byte)) throw new RangeError('A SIB byte is 0x00 to 0xFF.');
  const scaleBits = byte >> 6;
  const index = (byte >> 3) & 7;
  const base = byte & 7;
  const scale = (1 << scaleBits) as 1 | 2 | 4 | 8;
  const indexName = index === 4 ? null : (REG32[index] ?? null);
  const baseName = base === 5 && mod === 0 ? null : (REG32[base] ?? null);
  const disp = mod === 1 ? '+disp8' : mod === 2 ? '+disp32' : '';
  const terms = [baseName, indexName ? (scale === 1 ? indexName : `${indexName}*${scale}`) : null].filter((t): t is string => t !== null);
  const body = terms.join('+');
  const expression = baseName === null ? `[${body ? `${body}+` : ''}disp32]` : `[${body}${disp}]`;
  return { byte, hex: toHex(byte, 2), binary: bits(byte, 8), scale, index, base, indexName, baseName, expression };
}

// ---- worked instructions ----
export interface ModRMExample {
  readonly bytes: readonly number[];
  readonly asm: string;
  /** What the opcode byte says about the operands' roles. */
  readonly opcodeNote: string;
  /** Index of the ModR/M byte within `bytes`. */
  readonly modrmAt: number;
}
export const EXAMPLES: readonly ModRMExample[] = [
  { bytes: [0x8b, 0x45, 0x08], asm: 'mov eax, [ebp+8]', opcodeNote: '8B is MOV r32, r/m32: reg is the destination and r/m is the source.', modrmAt: 1 },
  { bytes: [0x89, 0xd8], asm: 'mov eax, ebx', opcodeNote: '89 is MOV r/m32, r32: r/m is the destination and reg is the source.', modrmAt: 1 },
  { bytes: [0x83, 0xc0, 0x01], asm: 'add eax, 1', opcodeNote: '83 /digit imm8: the reg field picks the operation, so /0 is ADD.', modrmAt: 1 },
  { bytes: [0x83, 0xe8, 0x01], asm: 'sub eax, 1', opcodeNote: '83 /digit imm8: /5 is SUB.', modrmAt: 1 },
  { bytes: [0x8b, 0x04, 0x24], asm: 'mov eax, [esp]', opcodeNote: '8B is MOV r32, r/m32. The SIB byte 24 supplies the base.', modrmAt: 1 },
  { bytes: [0x8b, 0x05, 0x78, 0x56, 0x34, 0x12], asm: 'mov eax, [0x12345678]', opcodeNote: '8B is MOV r32, r/m32. The four displacement bytes are little-endian: 78 56 34 12 is 0x12345678.', modrmAt: 1 },
];

/** Plain-English decode of an example's ModR/M byte, derived from the byte itself. */
export function explainExample(example: ModRMExample): string {
  const byte = example.bytes[example.modrmAt];
  if (byte === undefined) throw new RangeError('The example has no ModR/M byte.');
  const m = decodeModRM(byte);
  const operandRole = m.rmNames ? `r/m ${m.rmBits} names ${m.rmNames.r32}` : `r/m ${m.rmBits} gives ${m.addressForm}`;
  const sib = m.hasSib ? decodeSib(example.bytes[example.modrmAt + 1] ?? 0, m.mod) : null;
  const sibText = sib ? ` SIB ${sib.hex} = ${sib.binary.slice(0, 2)} ${sib.binary.slice(2, 5)} ${sib.binary.slice(5)}: scale ${sib.scale}, ${sib.indexName ? `index ${sib.indexName}` : 'no index'}, base ${sib.baseName ?? 'none'}, so the address is ${sib.expression}.` : '';
  return `ModR/M ${m.hex} = ${m.modBits} ${m.regBits} ${m.rmBits}: mod ${m.modBits} (${m.mod === 3 ? 'register' : 'memory'}), reg ${m.regBits} = ${m.regNames.r32} or /${m.regDigit}, ${operandRole}.${sibText}`;
}
