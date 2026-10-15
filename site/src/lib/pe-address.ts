// The worked PE image used by the offset-to-address calculator (lesson 5.1, pages/7/01.mdx) and, for its section
// numbers, by the PE file map. Pure functions, no browser API: Astro renders the default view from them, the browser
// script redraws from them, and scripts/check-pe-diagram-models.ts checks them by hand-derived values.
import { toHex } from './hex-field.ts';

export interface PeSection {
  readonly name: string;
  /** VirtualSize: bytes the section occupies in memory. */
  readonly virtualSize: number;
  /** VirtualAddress: the RVA of the first byte in memory. */
  readonly virtualAddress: number;
  /** SizeOfRawData: bytes the section occupies in the file (a multiple of FileAlignment). */
  readonly rawSize: number;
  /** PointerToRawData: the file offset of the first byte. */
  readonly rawPointer: number;
  /** Characteristics flag bits. */
  readonly flags: number;
  readonly role: 'code' | 'rdata' | 'data' | 'resource';
  /** What the section holds, in one sentence. */
  readonly holds: string;
}

/** Sections start at multiples of this in memory (one 4 KiB page). */
export const SECTION_ALIGNMENT = 0x1000;
/** Raw data starts at multiples of this in the file. */
export const FILE_ALIGNMENT = 0x200;
/** The old default ImageBase for a 32-bit EXE. */
export const PREFERRED_BASE = 0x00400000;
/** The combined size of the DOS header, DOS stub, PE headers and section table, rounded up to FILE_ALIGNMENT. */
export const SIZE_OF_HEADERS = 0x400;

export const IMAGE_SCN_CNT_CODE = 0x00000020;
export const IMAGE_SCN_CNT_INITIALIZED_DATA = 0x00000040;
export const IMAGE_SCN_MEM_EXECUTE = 0x20000000;
export const IMAGE_SCN_MEM_READ = 0x40000000;
export const IMAGE_SCN_MEM_WRITE = 0x80000000;

export const SECTIONS: readonly PeSection[] = [
  { name: '.text', virtualSize: 0x1a3c, virtualAddress: 0x1000, rawSize: 0x1c00, rawPointer: 0x400, role: 'code',
    flags: IMAGE_SCN_CNT_CODE + IMAGE_SCN_MEM_EXECUTE + IMAGE_SCN_MEM_READ, holds: 'machine code' },
  { name: '.rdata', virtualSize: 0x0b10, virtualAddress: 0x3000, rawSize: 0x0c00, rawPointer: 0x2000, role: 'rdata',
    flags: IMAGE_SCN_CNT_INITIALIZED_DATA + IMAGE_SCN_MEM_READ, holds: 'read-only data and the import tables' },
  { name: '.data', virtualSize: 0x1800, virtualAddress: 0x4000, rawSize: 0x0400, rawPointer: 0x2c00, role: 'data',
    flags: IMAGE_SCN_CNT_INITIALIZED_DATA + IMAGE_SCN_MEM_READ + IMAGE_SCN_MEM_WRITE, holds: 'writable globals' },
  { name: '.rsrc', virtualSize: 0x0650, virtualAddress: 0x6000, rawSize: 0x0800, rawPointer: 0x3000, role: 'resource',
    flags: IMAGE_SCN_CNT_INITIALIZED_DATA + IMAGE_SCN_MEM_READ, holds: 'icons, dialogs and version info' },
];

export const alignUp = (value: number, alignment: number): number => Math.ceil(value / alignment) * alignment;

const lastSection = (): PeSection => {
  const last = SECTIONS[SECTIONS.length - 1];
  if (!last) throw new Error('The example image has no sections.');
  return last;
};

/** Bytes in the file: the end of the last section's raw data. */
export const FILE_SIZE = lastSection().rawPointer + lastSection().rawSize;
/** SizeOfImage: the end of the last section in memory, rounded up to SECTION_ALIGNMENT. */
export const SIZE_OF_IMAGE = alignUp(lastSection().virtualAddress + lastSection().virtualSize, SECTION_ALIGNMENT);

/** The first and last byte of a section's raw data, and of its bytes in memory. */
export const rawEnd = (section: PeSection): number => section.rawPointer + section.rawSize - 1;
export const virtualEnd = (section: PeSection): number => section.virtualAddress + section.virtualSize - 1;
/** Bytes that are zero in memory but have no file bytes (VirtualSize larger than SizeOfRawData). */
export const zeroTail = (section: PeSection): number => Math.max(0, section.virtualSize - section.rawSize);
/** Bytes of file padding that never reach memory (SizeOfRawData larger than VirtualSize). */
export const filePadding = (section: PeSection): number => Math.max(0, section.rawSize - section.virtualSize);

export const hex = (value: number, digits = 4): string => `0x${toHex(value, digits)}`;
export const hex8 = (value: number): string => hex(value, 8);

/** Every problem found in the example table; an empty list means each rule from the PE format holds. */
export function sectionProblems(): string[] {
  const problems: string[] = [];
  let expectedRaw = SIZE_OF_HEADERS;
  let expectedVirtual = alignUp(SIZE_OF_HEADERS, SECTION_ALIGNMENT);
  for (const section of SECTIONS) {
    if (section.rawPointer !== expectedRaw) problems.push(`${section.name}: raw data should start at ${hex(expectedRaw)}`);
    if (section.rawPointer % FILE_ALIGNMENT !== 0 || section.rawSize % FILE_ALIGNMENT !== 0) problems.push(`${section.name}: raw start and size must be multiples of FileAlignment`);
    if (section.virtualAddress !== expectedVirtual) problems.push(`${section.name}: RVA should be ${hex(expectedVirtual)}`);
    if (section.virtualAddress % SECTION_ALIGNMENT !== 0) problems.push(`${section.name}: RVA must be a multiple of SectionAlignment`);
    if (section.rawSize > alignUp(section.virtualSize, FILE_ALIGNMENT)) problems.push(`${section.name}: raw size is larger than the virtual size rounded up to FileAlignment`);
    expectedRaw += section.rawSize;
    expectedVirtual += alignUp(section.virtualSize, SECTION_ALIGNMENT);
  }
  return problems;
}

export type Place =
  | 'headers' | 'header-tail' | 'mapped' | 'file-padding' | 'zero-fill' | 'gap'
  | 'outside-file' | 'outside-image' | 'below-base';

export interface Translation {
  readonly place: Place;
  readonly section: PeSection | null;
  /** The file offset when the byte has a file position. */
  readonly fileOffset: number | null;
  /** The RVA when the byte has a position in the image. */
  readonly rva: number | null;
  /** The live virtual address when the byte has a position in the image. */
  readonly va: number | null;
  /** The working, one line per step, with every number explained. */
  readonly steps: readonly string[];
  /** One sentence naming the outcome. */
  readonly summary: string;
}

/** A module base Windows can use: a multiple of 64 KiB and the whole image inside the default 2 GiB of user space. */
export function baseProblem(base: number): string | null {
  if (!Number.isInteger(base) || base < 0x10000) return 'The module base must be at least 0x00010000, the first usable address.';
  if (base % 0x10000 !== 0) return 'The module base must be a multiple of 0x10000 (64 KiB), the granularity Windows uses for images.';
  if (base + SIZE_OF_IMAGE > 0x7fff0000) return `The whole image (${hex(SIZE_OF_IMAGE)} bytes) must end below 0x7FFF0000, the top of default 32-bit user space.`;
  return null;
}

const sectionByRaw = (offset: number): PeSection | null => SECTIONS.find(s => offset >= s.rawPointer && offset <= rawEnd(s)) ?? null;
const sectionByRva = (rva: number): PeSection | null => SECTIONS.find(s => rva >= s.virtualAddress && rva <= virtualEnd(s)) ?? null;

function vaStep(rva: number, base: number): { va: number; step: string } {
  const va = base + rva;
  return { va, step: `Virtual address = module base ${hex8(base)} + RVA ${hex(rva)} = ${hex8(va)}.` };
}

/** Where a byte at this file offset ends up in memory. */
export function fromFileOffset(offset: number, base: number): Translation {
  if (offset >= FILE_SIZE) {
    return { place: 'outside-file', section: null, fileOffset: null, rva: null, va: null,
      steps: [`The file is ${hex(FILE_SIZE)} bytes long, so its offsets run from 0x0000 to ${hex(FILE_SIZE - 1)}.`, `${hex(offset)} is past the end: there is no such byte.`],
      summary: 'Outside the file: no byte lives here.' };
  }
  if (offset < SIZE_OF_HEADERS) {
    const { va, step } = vaStep(offset, base);
    return { place: 'headers', section: null, fileOffset: offset, rva: offset, va,
      steps: [`${hex(offset)} is below SizeOfHeaders ${hex(SIZE_OF_HEADERS)}, so it is a header byte, not part of a section.`, `Windows maps the headers at the very start of the image, so the RVA equals the file offset: ${hex(offset)}.`, step],
      summary: 'A header byte, mapped at the same distance from the start of the image.' };
  }
  const section = sectionByRaw(offset);
  if (!section) {
    return { place: 'gap', section: null, fileOffset: offset, rva: null, va: null,
      steps: [`${hex(offset)} is not inside the raw data of any section.`], summary: 'Not part of any section.' };
  }
  const delta = offset - section.rawPointer;
  const head = `${hex(offset)} lies in ${section.name}, whose raw data covers ${hex(section.rawPointer)} to ${hex(rawEnd(section))}.`;
  const into = `${hex(offset)} − ${hex(section.rawPointer)} = ${hex(delta)} bytes into the section.`;
  if (delta >= section.virtualSize) {
    return { place: 'file-padding', section, fileOffset: offset, rva: null, va: null,
      steps: [head, into, `${section.name} is only ${hex(section.virtualSize)} bytes in memory (VirtualSize), and ${hex(delta)} is not below that.`, 'These bytes are padding added to reach FileAlignment. The loader does not map them, so they have no RVA.'],
      summary: 'File padding: present on disk, absent from the image.' };
  }
  const rva = section.virtualAddress + delta;
  const { va, step } = vaStep(rva, base);
  return { place: 'mapped', section, fileOffset: offset, rva, va,
    steps: [head, into, `RVA = section RVA ${hex(section.virtualAddress)} + ${hex(delta)} = ${hex(rva)}.`, step],
    summary: `${section.name} byte ${hex(delta)}: RVA ${hex(rva)}, virtual address ${hex8(va)}.` };
}

/** Where the byte at this RVA lives in the file, if anywhere. */
export function fromRva(rva: number, base: number): Translation {
  const { va, step } = vaStep(rva, base);
  if (rva >= SIZE_OF_IMAGE) {
    return { place: 'outside-image', section: null, fileOffset: null, rva: null, va: null,
      steps: [`SizeOfImage is ${hex(SIZE_OF_IMAGE)}, so RVAs run from 0x0000 to ${hex(SIZE_OF_IMAGE - 1)}.`, `${hex(rva)} is past the end of the image.`],
      summary: 'Outside the image: this RVA is not part of the module.' };
  }
  if (rva < SIZE_OF_HEADERS) {
    return { place: 'headers', section: null, fileOffset: rva, rva, va,
      steps: [`${hex(rva)} is below SizeOfHeaders ${hex(SIZE_OF_HEADERS)}, so it is a header byte.`, `Headers are mapped at the start of the image, so the file offset equals the RVA: ${hex(rva)}.`, step],
      summary: 'A header byte, at the same distance from the start of the file.' };
  }
  const first = SECTIONS[0];
  if (first && rva < first.virtualAddress) {
    return { place: 'header-tail', section: null, fileOffset: null, rva, va,
      steps: [`The headers end at ${hex(SIZE_OF_HEADERS)}, but the first section starts at ${hex(first.virtualAddress)}.`, `${hex(rva)} falls in the rest of the header page: it is zero in memory and has no file bytes.`, step],
      summary: 'Unused space between the headers and the first section.' };
  }
  const section = sectionByRva(rva);
  if (!section) {
    return { place: 'gap', section: null, fileOffset: null, rva, va,
      steps: [`${hex(rva)} is not inside any section's VirtualAddress to VirtualAddress + VirtualSize range.`, 'It lies in alignment padding between two sections, which no section owns.', step],
      summary: 'Alignment padding between sections: no file bytes, no section.' };
  }
  const delta = rva - section.virtualAddress;
  const head = `${hex(rva)} lies in ${section.name}, whose bytes in memory cover RVA ${hex(section.virtualAddress)} to ${hex(virtualEnd(section))}.`;
  const into = `${hex(rva)} − ${hex(section.virtualAddress)} = ${hex(delta)} bytes into the section.`;
  if (delta >= section.rawSize) {
    return { place: 'zero-fill', section, fileOffset: null, rva, va,
      steps: [head, into, `${section.name} has only ${hex(section.rawSize)} bytes in the file (SizeOfRawData), and ${hex(delta)} is not below that.`, 'The loader supplies these bytes as zeros: they exist in memory but nowhere in the file.', step],
      summary: `Zero-filled tail of ${section.name}: in memory, not in the file.` };
  }
  const fileOffset = section.rawPointer + delta;
  return { place: 'mapped', section, fileOffset, rva, va,
    steps: [head, into, `File offset = section raw start ${hex(section.rawPointer)} + ${hex(delta)} = ${hex(fileOffset)}.`, step],
    summary: `${section.name} byte ${hex(delta)}: file offset ${hex(fileOffset)}, RVA ${hex(rva)}.` };
}

/** Where a live virtual address sits in the file, given the module base. */
export function fromVirtualAddress(va: number, base: number): Translation {
  if (va < base) {
    return { place: 'below-base', section: null, fileOffset: null, rva: null, va: null,
      steps: [`The module starts at ${hex8(base)}, and ${hex8(va)} is lower.`, 'An address below the base is not part of this module.'],
      summary: 'Below the module: not part of this image.' };
  }
  const rva = va - base;
  const result = fromRva(rva, base);
  const subtract = `RVA = virtual address ${hex8(va)} − module base ${hex8(base)} = ${hex(rva)}.`;
  // The last step of fromRva repeats base + RVA, which is the same arithmetic backwards, so drop it for the reverse lookup.
  const steps = [subtract, ...result.steps.filter(line => !line.startsWith('Virtual address ='))];
  return { ...result, steps };
}

/** Marker positions as 0..1 fractions of the file strip and the image strip, or null when the byte is absent there. */
export function markers(result: Translation): { file: number | null; image: number | null } {
  return {
    file: result.fileOffset === null ? null : result.fileOffset / FILE_SIZE,
    image: result.rva === null ? null : result.rva / SIZE_OF_IMAGE,
  };
}

export interface Segment {
  readonly kind: 'headers' | 'section' | 'zero-fill' | 'gap';
  readonly label: string;
  readonly start: number;
  readonly bytes: number;
  readonly section: PeSection | null;
}

/** The file from first byte to last: the headers, then each section's raw data. Adds up to FILE_SIZE. */
export function fileSegments(): readonly Segment[] {
  return [
    { kind: 'headers', label: 'Headers', start: 0, bytes: SIZE_OF_HEADERS, section: null },
    ...SECTIONS.map((section): Segment => ({ kind: 'section', label: section.name, start: section.rawPointer, bytes: section.rawSize, section })),
  ];
}

/** The image from RVA 0 to SizeOfImage: headers, unused page tail, then each section with its zero-filled tail and padding. */
export function imageSegments(): readonly Segment[] {
  const segments: Segment[] = [{ kind: 'headers', label: 'Headers', start: 0, bytes: SIZE_OF_HEADERS, section: null }];
  const firstSection = SECTIONS[0];
  if (firstSection && firstSection.virtualAddress > SIZE_OF_HEADERS) {
    segments.push({ kind: 'gap', label: 'Unused', start: SIZE_OF_HEADERS, bytes: firstSection.virtualAddress - SIZE_OF_HEADERS, section: null });
  }
  SECTIONS.forEach((section, index) => {
    const fileBacked = Math.min(section.virtualSize, section.rawSize);
    segments.push({ kind: 'section', label: section.name, start: section.virtualAddress, bytes: fileBacked, section });
    if (section.virtualSize > section.rawSize) {
      segments.push({ kind: 'zero-fill', label: `${section.name} zeros`, start: section.virtualAddress + section.rawSize, bytes: section.virtualSize - section.rawSize, section });
    }
    const end = section.virtualAddress + section.virtualSize;
    const next = SECTIONS[index + 1]?.virtualAddress ?? SIZE_OF_IMAGE;
    if (next > end) segments.push({ kind: 'gap', label: 'Padding', start: end, bytes: next - end, section: null });
  });
  return segments;
}

/** The worked example from the lesson: file offset 0x0520 in .text. */
export const LESSON_EXAMPLE = { fileOffset: 0x520, base: PREFERRED_BASE } as const;
