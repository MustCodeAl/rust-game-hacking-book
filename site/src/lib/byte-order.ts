export const MAX_U32 = 0xffff_ffff;
export type ByteIndex = 0 | 1 | 2 | 3;
export interface BytePart { index: ByteIndex; hex: string; decimal: number; weight: number }
export function isUnsigned32(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_U32;
}
export function byteParts(value: number): readonly BytePart[] {
  if (!isUnsigned32(value)) throw new RangeError('Byte order requires an unsigned 32-bit integer.');
  return ([0, 1, 2, 3] as const).map(index => {
    const decimal = (value >>> (index * 8)) & 0xff;
    return { index, decimal, hex: decimal.toString(16).padStart(2, '0').toUpperCase(), weight: 256 ** index };
  });
}
export function unsignedHex(value: number): string {
  if (!isUnsigned32(value)) throw new RangeError('Hex representation requires an unsigned 32-bit integer.');
  return value.toString(16).padStart(8, '0').toUpperCase();
}
