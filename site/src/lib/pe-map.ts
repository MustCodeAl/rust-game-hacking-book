// The PE32 / PE32+ header layout as data, laid out for one concrete file: every offset is derived from the sizes of the
// structures before it. Pure functions, no browser API: Astro renders both formats from this, the script only switches
// between them, and scripts/check-pe-diagram-models.ts checks every derived number by hand-computed values.
import { toHex } from './hex-field.ts';
import {
  FILE_ALIGNMENT, PREFERRED_BASE, SECTIONS, SECTION_ALIGNMENT, SIZE_OF_HEADERS, SIZE_OF_IMAGE, alignUp, hex, hex8,
  type PeSection,
} from './pe-address.ts';

export type PeFormat = 'pe32' | 'pe32plus';
export const PE_FORMATS: readonly { readonly id: PeFormat; readonly label: string; readonly short: string }[] = [
  { id: 'pe32', label: 'PE32: 32-bit', short: 'PE32' },
  { id: 'pe32plus', label: 'PE32+: 64-bit', short: 'PE32+' },
];

export type BlockId = 'dos' | 'stub' | 'signature' | 'coff' | 'standard' | 'windows' | 'directories' | 'sections' | 'padding' | 'data';
/** Which colour role a block takes, so the ruler and its explanation agree. */
export type BlockRole = 'legacy' | 'identity' | 'optional' | 'directory' | 'section' | 'empty';

/** Where in the file the example puts the PE signature. Real files vary: 0x80 and 0xE8 are both common. */
export const E_LFANEW = 0x80;
export const DOS_HEADER_BYTES = 0x40;
export const SIGNATURE_BYTES = 4;
export const COFF_BYTES = 20;
export const DIRECTORY_COUNT = 16;
export const DIRECTORY_BYTES = 8;
export const SECTION_HEADER_BYTES = 40;

type PerFormat<T> = T | Readonly<Record<PeFormat, T>>;

interface FieldSpec {
  readonly id: string;
  readonly name: string;
  /** Width in bytes; 0 for a format that does not have the field. */
  readonly bytes: PerFormat<number>;
  readonly meaning: string;
  /** What the worked example stores here, and how that value is derived (see `why`). */
  readonly value?: PerFormat<string>;
  readonly why?: PerFormat<string>;
}

export interface LaidField {
  readonly id: string;
  readonly name: string;
  readonly bytes: number;
  /** Distance from the start of the structure this field belongs to (the optional header for its three parts). */
  readonly relative: number;
  /** File offset of the first byte. */
  readonly offset: number;
  readonly meaning: string;
  readonly value: string | null;
  readonly why: string | null;
}

export interface LaidBlock {
  readonly id: BlockId;
  readonly role: BlockRole;
  readonly title: string;
  readonly summary: string;
  /** File offset of the first byte, and the number of bytes. */
  readonly start: number;
  readonly bytes: number;
  /** The arithmetic that places `start`, with every number named. */
  readonly derivation: string;
  /** The structure the fields count their `relative` offset from. */
  readonly anchor: string;
  readonly fields: readonly LaidField[];
  /** Prose for blocks that are a region and not a list of fields. */
  readonly text: string | null;
}

export interface PeLayout {
  readonly format: PeFormat;
  readonly blocks: readonly LaidBlock[];
  readonly optionalStart: number;
  readonly optionalBytes: number;
  readonly sectionTableStart: number;
  readonly headersEnd: number;
}

const pick = <T>(value: PerFormat<T>, format: PeFormat): T => (typeof value === 'object' && value !== null && 'pe32' in value ? value[format] : value as T);
const first = <T>(items: readonly T[], what: string): T => {
  const item = items[0];
  if (item === undefined) throw new Error(`No ${what} in the example.`);
  return item;
};
const text = (section: PeSection): string => section.name;

const DOS_FIELDS: readonly FieldSpec[] = [
  { id: 'e_magic', name: 'e_magic', bytes: 2, meaning: 'The two letters MZ (bytes 4D 5A). A parser checks them first: without MZ this is not a PE file.', value: 'MZ (4D 5A)', why: 'The two ASCII letters, always at the very start of the file.' },
  { id: 'e_dos', name: 'other DOS fields', bytes: 58, meaning: 'Old MS-DOS values (page counts, relocation hints). Windows never reads them.' },
  { id: 'e_lfanew', name: 'e_lfanew', bytes: 4, meaning: 'The file offset of the PE signature. A file offset, not an RVA and not a live address.', value: hex(E_LFANEW, 8), why: `The DOS header (0x40 bytes) plus a 0x40-byte DOS stub end at ${hex(E_LFANEW)}, where the example puts the signature.` },
];

const COFF_FIELDS: readonly FieldSpec[] = [
  { id: 'machine', name: 'Machine', bytes: 2, meaning: 'Which CPU the machine code is for.', value: { pe32: '0x014C (x86)', pe32plus: '0x8664 (x64)' }, why: 'The format defines 0x014C for 32-bit x86 and 0x8664 for x86-64.' },
  { id: 'numberofsections', name: 'NumberOfSections', bytes: 2, meaning: 'How many 40-byte section rows follow the optional header.', value: String(SECTIONS.length), why: `One row each for ${SECTIONS.map(text).join(', ')}.` },
  { id: 'timedatestamp', name: 'TimeDateStamp', bytes: 4, meaning: 'When the linker built the file, in seconds since 1 January 1970. Some builds store a hash instead.' },
  { id: 'pointertosymboltable', name: 'PointerToSymbolTable', bytes: 4, meaning: 'File offset of an old COFF symbol table. Zero in modern programs, whose debug data lives elsewhere.' },
  { id: 'numberofsymbols', name: 'NumberOfSymbols', bytes: 4, meaning: 'Number of entries in that table: zero when there is none.' },
  { id: 'sizeofoptionalheader', name: 'SizeOfOptionalHeader', bytes: 2, meaning: 'Bytes in the optional header, data directories included. It tells a parser how far to jump to reach the section table.',
    value: { pe32: '0x00E0 (224)', pe32plus: '0x00F0 (240)' }, why: { pe32: '96 bytes of fields + 16 directories × 8 bytes = 96 + 128 = 224 = 0xE0.', pe32plus: '112 bytes of fields + 16 directories × 8 bytes = 112 + 128 = 240 = 0xF0.' } },
  { id: 'characteristics', name: 'Characteristics', bytes: 2, meaning: 'Flag bits: an executable image, a DLL, 32-bit machine, and more.',
    value: { pe32: '0x0102', pe32plus: '0x0022' }, why: { pe32: '0x0002 (executable image) + 0x0100 (32-bit machine) = 0x0102.', pe32plus: '0x0002 (executable image) + 0x0020 (can use addresses above 2 GiB) = 0x0022.' } },
];

const STANDARD_FIELDS: readonly FieldSpec[] = [
  { id: 'magic', name: 'Magic', bytes: 2, meaning: 'Tells the parser how to read everything after it: 0x010B means PE32, 0x020B means PE32+.', value: { pe32: '0x010B', pe32plus: '0x020B' }, why: 'The two magic numbers the format defines.' },
  { id: 'majorlinker', name: 'MajorLinkerVersion', bytes: 1, meaning: 'Major version of the linker that made the file.' },
  { id: 'minorlinker', name: 'MinorLinkerVersion', bytes: 1, meaning: 'Minor version of that linker.' },
  { id: 'sizeofcode', name: 'SizeOfCode', bytes: 4, meaning: 'Total file size of the code sections.', value: hex(SECTIONS.reduce((sum, s) => (s.role === 'code' ? sum + s.rawSize : sum), 0), 8), why: 'Only .text holds code here, so this is its SizeOfRawData.' },
  { id: 'sizeofinitializeddata', name: 'SizeOfInitializedData', bytes: 4, meaning: 'Total size of sections that hold initialised data.' },
  { id: 'sizeofuninitializeddata', name: 'SizeOfUninitializedData', bytes: 4, meaning: 'Total size of sections that are zero-filled in memory and take no file space.' },
  { id: 'entry', name: 'AddressOfEntryPoint', bytes: 4, meaning: 'RVA of the first instruction Windows runs. It must lie inside the code section.', value: '0x000012C0', why: 'Illustrative: any RVA inside .text (0x1000 to 0x2A3B) is valid; the linker picks the real one.' },
  { id: 'baseofcode', name: 'BaseOfCode', bytes: 4, meaning: 'RVA where the code section begins.', value: hex(first(SECTIONS, 'section').virtualAddress, 8), why: 'The RVA of .text in the section table.' },
  { id: 'baseofdata', name: 'BaseOfData', bytes: { pe32: 4, pe32plus: 0 }, meaning: 'RVA where the data begins. PE32+ dropped this field to make room for a wider ImageBase.', value: hex(SECTIONS[1]?.virtualAddress ?? 0, 8), why: 'The RVA of .rdata, the first data section.' },
];

const WINDOWS_FIELDS: readonly FieldSpec[] = [
  { id: 'imagebase', name: 'ImageBase', bytes: { pe32: 4, pe32plus: 8 }, meaning: 'The address the linker prefers for the first byte of the image. Always a multiple of 64 KiB.', value: { pe32: hex8(PREFERRED_BASE), pe32plus: '0x0000000140000000' }, why: { pe32: 'The long-standing default for a 32-bit EXE.', pe32plus: 'The usual default for a 64-bit EXE; the field is 8 bytes wide.' } },
  { id: 'sectionalignment', name: 'SectionAlignment', bytes: 4, meaning: 'Sections start at multiples of this in memory.', value: hex(SECTION_ALIGNMENT, 8), why: 'One 4 KiB page.' },
  { id: 'filealignment', name: 'FileAlignment', bytes: 4, meaning: 'Raw section data starts at multiples of this in the file.', value: hex(FILE_ALIGNMENT, 8), why: 'The default, 512 bytes (one old disk sector).' },
  { id: 'majoros', name: 'MajorOperatingSystemVersion', bytes: 2, meaning: 'Major version of Windows the image asks for.' },
  { id: 'minoros', name: 'MinorOperatingSystemVersion', bytes: 2, meaning: 'Minor version of that Windows.' },
  { id: 'majorimage', name: 'MajorImageVersion', bytes: 2, meaning: 'Major version of this program, set by its author.' },
  { id: 'minorimage', name: 'MinorImageVersion', bytes: 2, meaning: 'Minor version of this program.' },
  { id: 'majorsubsystem', name: 'MajorSubsystemVersion', bytes: 2, meaning: 'Major version of the Windows subsystem it needs.' },
  { id: 'minorsubsystem', name: 'MinorSubsystemVersion', bytes: 2, meaning: 'Minor version of that subsystem.' },
  { id: 'win32version', name: 'Win32VersionValue', bytes: 4, meaning: 'Reserved: must be zero.' },
  { id: 'sizeofimage', name: 'SizeOfImage', bytes: 4, meaning: 'Bytes the whole image takes in memory, headers included. A multiple of SectionAlignment.', value: hex(SIZE_OF_IMAGE, 8), why: `Last section .rsrc ends at RVA 0x6000 + 0x650 = 0x6650, and rounding up to a multiple of ${hex(SECTION_ALIGNMENT)} gives ${hex(SIZE_OF_IMAGE)}.` },
  { id: 'sizeofheaders', name: 'SizeOfHeaders', bytes: 4, meaning: 'DOS header, stub, PE headers and section table together, rounded up to FileAlignment. It is where the first section’s raw data begins.', value: hex(SIZE_OF_HEADERS, 8), why: { pe32: 'The headers end at 0x218; rounded up to a multiple of 0x200 that is 0x400.', pe32plus: 'The headers end at 0x228; rounded up to a multiple of 0x200 that is 0x400.' } },
  { id: 'checksum', name: 'CheckSum', bytes: 4, meaning: 'A file checksum. Windows checks it for drivers and boot-time DLLs; many programs leave it zero.' },
  { id: 'subsystem', name: 'Subsystem', bytes: 2, meaning: 'What kind of program this is: 2 means a Windows GUI program, 3 a console program.', value: '0x0002', why: 'A game with a window is a GUI program.' },
  { id: 'dllcharacteristics', name: 'DllCharacteristics', bytes: 2, meaning: 'Flag bits for security features, such as 0x0040 (ASLR may move the image) and 0x0100 (DEP).' },
  { id: 'stackreserve', name: 'SizeOfStackReserve', bytes: { pe32: 4, pe32plus: 8 }, meaning: 'Address space reserved for the first thread’s stack.', value: { pe32: '0x00100000', pe32plus: '0x0000000000100000' }, why: '1 MiB, the usual linker default.' },
  { id: 'stackcommit', name: 'SizeOfStackCommit', bytes: { pe32: 4, pe32plus: 8 }, meaning: 'How much of that stack is backed by memory at the start.', value: { pe32: '0x00001000', pe32plus: '0x0000000000001000' }, why: 'One 4 KiB page, the usual default.' },
  { id: 'heapreserve', name: 'SizeOfHeapReserve', bytes: { pe32: 4, pe32plus: 8 }, meaning: 'Address space reserved for the default heap.', value: { pe32: '0x00100000', pe32plus: '0x0000000000100000' }, why: '1 MiB, the usual linker default.' },
  { id: 'heapcommit', name: 'SizeOfHeapCommit', bytes: { pe32: 4, pe32plus: 8 }, meaning: 'How much of that heap is backed by memory at the start.', value: { pe32: '0x00001000', pe32plus: '0x0000000000001000' }, why: 'One 4 KiB page, the usual default.' },
  { id: 'loaderflags', name: 'LoaderFlags', bytes: 4, meaning: 'Reserved: must be zero.' },
  { id: 'numberofrva', name: 'NumberOfRvaAndSizes', bytes: 4, meaning: 'How many data-directory entries follow. Check it before reading a directory.', value: String(DIRECTORY_COUNT), why: 'The format defines 16 directory slots, and every modern linker writes all 16.' },
];

interface DirectorySpec { readonly name: string; readonly meaning: string; readonly value?: string; readonly why?: string }
export const DIRECTORIES: readonly DirectorySpec[] = [
  { name: 'Export table', meaning: 'The functions this module offers to others. DLLs have one; a game EXE usually does not.' },
  { name: 'Import table', meaning: 'Which DLLs and functions this module needs. The loader reads it to fill the import address table.' },
  { name: 'Resource table', meaning: 'Icons, dialogs, version information and other embedded files.', value: 'RVA 0x00006000, size 0x00000650', why: 'Exactly the .rsrc row of the section table: its VirtualAddress and VirtualSize.' },
  { name: 'Exception table', meaning: 'Unwind data the 64-bit system uses to handle exceptions. Normally empty in a 32-bit image.' },
  { name: 'Certificate table', meaning: 'A digital signature. Its first number is a file offset, the one directory that is not an RVA.' },
  { name: 'Base relocation table', meaning: 'Places to patch if the image is loaded away from ImageBase. A relocatable program needs it.' },
  { name: 'Debug directory', meaning: 'Points at debug information, for example the path of the .pdb file.' },
  { name: 'Architecture', meaning: 'Reserved: must be zero.' },
  { name: 'Global pointer', meaning: 'An RVA for CPUs that keep a global pointer register. Its size must be zero.' },
  { name: 'TLS table', meaning: 'Thread-local storage: a template for per-thread variables and start-up callbacks.' },
  { name: 'Load configuration', meaning: 'Security settings such as the stack cookie value and the exception-handler list.' },
  { name: 'Bound import', meaning: 'Pre-computed import addresses. Rarely used today.' },
  { name: 'Import address table', meaning: 'The array the loader fills with the real addresses of the imported functions.' },
  { name: 'Delay import', meaning: 'Imports that are only loaded the first time the program calls them.' },
  { name: 'CLR runtime header', meaning: 'Present only in .NET programs: the entry to their metadata.' },
  { name: 'Reserved', meaning: 'Reserved: must be zero.' },
];

const SECTION_FIELDS: readonly FieldSpec[] = (() => {
  const text0 = first(SECTIONS, 'section');
  return [
    { id: 'name', name: 'Name', bytes: 8, meaning: 'Eight bytes of text, padded with zeros. Only a convention: the flags decide what a section may do.', value: `${text0.name} (padded to 8 bytes)`, why: 'The first row of the table.' },
    { id: 'virtualsize', name: 'VirtualSize', bytes: 4, meaning: 'Bytes the section occupies in memory. If it is larger than SizeOfRawData, the extra is zero-filled.', value: hex(text0.virtualSize, 8), why: 'Illustrative: the size of the code the compiler produced.' },
    { id: 'virtualaddress', name: 'VirtualAddress', bytes: 4, meaning: 'The RVA where the section starts in memory. A multiple of SectionAlignment.', value: hex(text0.virtualAddress, 8), why: `The headers (${hex(SIZE_OF_HEADERS)} bytes) fit in the first page, so the first section starts at the next multiple of ${hex(SECTION_ALIGNMENT)}.` },
    { id: 'sizeofrawdata', name: 'SizeOfRawData', bytes: 4, meaning: 'Bytes the section occupies in the file. A multiple of FileAlignment.', value: hex(text0.rawSize, 8), why: `VirtualSize ${hex(text0.virtualSize)} rounded up to a multiple of ${hex(FILE_ALIGNMENT)}.` },
    { id: 'pointertorawdata', name: 'PointerToRawData', bytes: 4, meaning: 'The file offset where the section’s bytes start. A multiple of FileAlignment.', value: hex(text0.rawPointer, 8), why: 'Right after the headers, so it equals SizeOfHeaders.' },
    { id: 'pointertorelocations', name: 'PointerToRelocations', bytes: 4, meaning: 'Zero in an executable (object files use it).' },
    { id: 'pointertolinenumbers', name: 'PointerToLinenumbers', bytes: 4, meaning: 'Zero: COFF line numbers are deprecated.' },
    { id: 'numberofrelocations', name: 'NumberOfRelocations', bytes: 2, meaning: 'Zero in an executable.' },
    { id: 'numberoflinenumbers', name: 'NumberOfLinenumbers', bytes: 2, meaning: 'Zero: COFF line numbers are deprecated.' },
    { id: 'characteristics', name: 'Characteristics', bytes: 4, meaning: 'Flag bits that decide the protection of the section’s pages: code, readable, writable, executable.', value: hex(text0.flags, 8), why: '0x00000020 (contains code) + 0x20000000 (executable) + 0x40000000 (readable).' },
  ];
})();

function lay(fields: readonly FieldSpec[], format: PeFormat, anchorStart: number, relativeBase: number, idPrefix: string): LaidField[] {
  const laid: LaidField[] = [];
  let cursor = 0;
  for (const spec of fields) {
    const bytes = pick(spec.bytes, format);
    if (bytes === 0) continue;
    laid.push({
      id: `${idPrefix}-${spec.id}`, name: spec.name, bytes, relative: relativeBase + cursor, offset: anchorStart + cursor,
      meaning: spec.meaning, value: spec.value === undefined ? null : pick(spec.value, format), why: spec.why === undefined ? null : pick(spec.why, format),
    });
    cursor += bytes;
  }
  return laid;
}
const total = (fields: readonly LaidField[]): number => fields.reduce((sum, field) => sum + field.bytes, 0);

/** Lay the whole header out for one format. Every start offset comes from the sizes before it. */
export function layout(format: PeFormat): PeLayout {
  const dos = lay(DOS_FIELDS, format, 0, 0, 'dos');
  const signatureStart = E_LFANEW;
  const coffStart = signatureStart + SIGNATURE_BYTES;
  const optionalStart = coffStart + COFF_BYTES;
  const coff = lay(COFF_FIELDS, format, coffStart, 0, 'coff');
  const standard = lay(STANDARD_FIELDS, format, optionalStart, 0, 'std');
  const windowsStart = optionalStart + total(standard);
  const windows = lay(WINDOWS_FIELDS, format, windowsStart, total(standard), 'win');
  const directoriesStart = windowsStart + total(windows);
  const directoryRelative = total(standard) + total(windows);
  const directories: LaidField[] = DIRECTORIES.map((directory, index) => ({
    id: `dir-${index}`, name: `${index}. ${directory.name}`, bytes: DIRECTORY_BYTES, relative: directoryRelative + index * DIRECTORY_BYTES,
    offset: directoriesStart + index * DIRECTORY_BYTES, meaning: directory.meaning, value: directory.value ?? null, why: directory.why ?? null,
  }));
  const optionalBytes = total(standard) + total(windows) + DIRECTORY_COUNT * DIRECTORY_BYTES;
  const sectionTableStart = optionalStart + optionalBytes;
  const tableBytes = SECTIONS.length * SECTION_HEADER_BYTES;
  const headersEnd = sectionTableStart + tableBytes;
  const sectionFields = lay(SECTION_FIELDS, format, sectionTableStart, 0, 'sec');
  const stubStart = DOS_HEADER_BYTES;
  const fmt = PE_FORMATS.find(f => f.id === format)?.short ?? format;
  const standardBytes = total(standard);
  const windowsBytes = total(windows);

  const blocks: LaidBlock[] = [
    { id: 'dos', role: 'legacy', title: 'DOS header', summary: 'A leftover from MS-DOS that every PE file still begins with. Two fields matter.', start: 0, bytes: DOS_HEADER_BYTES,
      derivation: `Starts at the first byte of the file, 0x0000, and is ${DOS_HEADER_BYTES} (0x40) bytes long: ${dos.map(f => f.bytes).join(' + ')} = ${DOS_HEADER_BYTES}.`, anchor: 'the start of the file', fields: dos, text: null },
    { id: 'stub', role: 'legacy', title: 'DOS stub', summary: 'A tiny MS-DOS program that Windows skips.', start: stubStart, bytes: E_LFANEW - stubStart,
      derivation: `Starts where the DOS header ends, ${hex(stubStart)}, and runs up to e_lfanew ${hex(E_LFANEW)}: ${hex(E_LFANEW)} − ${hex(stubStart)} = ${hex(E_LFANEW - stubStart)} = ${E_LFANEW - stubStart} bytes.`, anchor: 'the start of the file', fields: [],
      text: 'If someone starts the file under MS-DOS, this little 16-bit program prints “This program cannot be run in DOS mode.” and exits. Windows never runs it: it follows e_lfanew instead. Some toolchains also store build information here, so the size varies from file to file.' },
    { id: 'signature', role: 'identity', title: 'PE signature', summary: 'Four bytes that say: the headers of a PE file start here.', start: signatureStart, bytes: SIGNATURE_BYTES,
      derivation: `Starts at the file offset stored in e_lfanew: ${hex(signatureStart)}.`, anchor: 'the signature',
      fields: [{ id: 'sig-signature', name: 'Signature', bytes: 4, relative: 0, offset: signatureStart, meaning: 'The letters P, E and two zero bytes: 50 45 00 00. As a little-endian number that is 0x00004550.', value: 'PE\\0\\0 (50 45 00 00)', why: 'Four fixed bytes. If they are missing, stop: the file is damaged or not a PE file.' }], text: null },
    { id: 'coff', role: 'identity', title: 'COFF file header', summary: 'The basics: which CPU, how many sections, how big the next header is.', start: coffStart, bytes: COFF_BYTES,
      derivation: `Starts right after the signature: e_lfanew + 4 = ${hex(E_LFANEW)} + 4 = ${hex(coffStart)}. It is ${COFF_BYTES} bytes long: ${coff.map(f => f.bytes).join(' + ')} = ${COFF_BYTES}.`, anchor: 'the COFF header', fields: coff, text: null },
    { id: 'standard', role: 'optional', title: 'Optional header: standard fields', summary: `The first part of the optional header for ${fmt}. It is required for programs despite its name.`, start: optionalStart, bytes: standardBytes,
      derivation: `The optional header starts right after the COFF header: e_lfanew + 4 + ${COFF_BYTES} = ${hex(E_LFANEW)} + ${4 + COFF_BYTES} = ${hex(optionalStart)}. These fields are ${standard.map(f => f.bytes).join(' + ')} = ${standardBytes} bytes.`, anchor: 'the optional header', fields: standard, text: null },
    { id: 'windows', role: 'optional', title: 'Optional header: Windows fields', summary: `Fields the Windows loader needs. ${format === 'pe32' ? 'ImageBase is 4 bytes wide.' : 'ImageBase and the stack and heap sizes are 8 bytes wide.'}`, start: windowsStart, bytes: windowsBytes,
      derivation: `Starts after the standard fields: optional header ${hex(optionalStart)} + ${standardBytes} = ${hex(windowsStart)}. These ${windows.length} fields are ${windowsBytes} bytes long.`, anchor: 'the optional header', fields: windows, text: null },
    { id: 'directories', role: 'directory', title: 'Data directories', summary: 'Sixteen RVA-plus-size pairs that point at tables inside the sections.', start: directoriesStart, bytes: DIRECTORY_COUNT * DIRECTORY_BYTES,
      derivation: `Starts after the Windows fields: ${hex(windowsStart)} + ${windowsBytes} = ${hex(directoriesStart)}, which is optional header + ${directoryRelative}. ${DIRECTORY_COUNT} entries × ${DIRECTORY_BYTES} bytes = ${DIRECTORY_COUNT * DIRECTORY_BYTES} bytes.`, anchor: 'the optional header', fields: directories, text: null },
    { id: 'sections', role: 'section', title: 'Section table', summary: `${SECTIONS.length} rows of ${SECTION_HEADER_BYTES} bytes, one per section. The first row is shown field by field.`, start: sectionTableStart, bytes: tableBytes,
      derivation: `Starts after the optional header: optional header ${hex(optionalStart)} + SizeOfOptionalHeader ${optionalBytes} (${hex(optionalBytes)}) = ${hex(sectionTableStart)}. ${SECTIONS.length} rows × ${SECTION_HEADER_BYTES} = ${tableBytes} bytes, so the table ends at ${hex(headersEnd - 1)}.`, anchor: 'the first section row', fields: sectionFields,
      text: `Row n starts at ${hex(sectionTableStart)} + n × ${SECTION_HEADER_BYTES}: ${SECTIONS.map((section, i) => `${section.name} at ${hex(sectionTableStart + i * SECTION_HEADER_BYTES)}`).join(', ')}. The offset calculator above uses these rows.` },
    { id: 'padding', role: 'empty', title: 'Padding to SizeOfHeaders', summary: 'Zero bytes that bring the headers up to the next FileAlignment boundary.', start: headersEnd, bytes: SIZE_OF_HEADERS - headersEnd,
      derivation: `The headers end at ${hex(headersEnd)}. SizeOfHeaders rounds that up to a multiple of ${hex(FILE_ALIGNMENT)}: ${hex(SIZE_OF_HEADERS)}. Padding = ${hex(SIZE_OF_HEADERS)} − ${hex(headersEnd)} = ${SIZE_OF_HEADERS - headersEnd} bytes.`, anchor: 'the end of the headers', fields: [],
      text: 'Nothing lives here. Raw section data must start at a multiple of FileAlignment, so the file is padded with zeros until then.' },
    { id: 'data', role: 'empty', title: 'Section data', summary: 'From here on the file holds the sections themselves.', start: SIZE_OF_HEADERS, bytes: 0,
      derivation: `The first section's PointerToRawData is ${hex(SIZE_OF_HEADERS)}, equal to SizeOfHeaders.`, anchor: 'the end of the headers', fields: [],
      text: `${first(SECTIONS, 'section').name} starts at file offset ${hex(first(SECTIONS, 'section').rawPointer)}. The offset calculator above shows how a file offset becomes an address in memory.` },
  ];
  return { format, blocks, optionalStart, optionalBytes, sectionTableStart, headersEnd };
}

/** The pieces that make up the first SizeOfHeaders bytes of the file, in order, for the to-scale ruler. */
export function rulerSegments(model: PeLayout): readonly { readonly id: BlockId; readonly role: BlockRole; readonly bytes: number }[] {
  return model.blocks.filter(block => block.id !== 'data').map(block => ({ id: block.id, role: block.role, bytes: block.bytes }));
}

export interface FormatDifference { readonly what: string; readonly pe32: string; readonly pe32plus: string }

/** Everything that is placed or sized differently in PE32+ than in PE32, derived from the two layouts. */
export function formatDifferences(): readonly FormatDifference[] {
  const a = layout('pe32'), b = layout('pe32plus');
  const fieldsOf = (model: PeLayout): Map<string, LaidField> => new Map(model.blocks.flatMap(block => (block.id === 'sections' ? [] : block.fields)).filter(field => !field.id.startsWith('dir-') && !field.id.startsWith('dos-')).map(field => [field.id, field]));
  const left = fieldsOf(a), right = fieldsOf(b);
  const describe = (field: LaidField | undefined): string => (field ? `${field.bytes} bytes at optional header + ${field.relative}` : 'absent');
  const rows: FormatDifference[] = [];
  for (const [fieldId, field] of left) {
    const other = right.get(fieldId);
    if (!other || other.bytes !== field.bytes || other.relative !== field.relative) {
      if (field.id.startsWith('coff-') || field.id === 'sig-signature') continue;
      rows.push({ what: field.name, pe32: describe(field), pe32plus: describe(other) });
    }
  }
  const row = (what: string, x: number, y: number): FormatDifference => ({ what, pe32: hex(x), pe32plus: hex(y) });
  rows.push({ what: 'SizeOfOptionalHeader', pe32: `${a.optionalBytes} bytes (${hex(a.optionalBytes)})`, pe32plus: `${b.optionalBytes} bytes (${hex(b.optionalBytes)})` });
  rows.push(row('Section table starts at file offset', a.sectionTableStart, b.sectionTableStart));
  rows.push(row('Section table ends before file offset', a.headersEnd, b.headersEnd));
  return rows;
}

export const rangeText = (block: LaidBlock): string => (block.bytes === 0 ? `from ${hex(block.start)}` : `${hex(block.start)} to ${hex(block.start + block.bytes - 1)}`);
export const sizeText = (bytes: number): string => `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`;
export const fieldHex = (offset: number): string => `0x${toHex(offset, 4)}`;
/** Split a CamelCase field name at its word boundaries, so a narrow screen can break it between words and not inside one. */
export const nameParts = (name: string): string[] => name.split(/(?<=[a-z0-9])(?=[A-Z])/);

/** Every problem found in the layout; an empty list means the format's rules hold for both PE32 and PE32+. */
export function layoutProblems(): string[] {
  const problems: string[] = [];
  for (const { id } of PE_FORMATS) {
    const model = layout(id);
    const where = (message: string): string => `${id}: ${message}`;
    let cursor = 0;
    for (const block of model.blocks) {
      if (block.start !== cursor) problems.push(where(`${block.id} starts at ${hex(block.start)} but the previous block ended at ${hex(cursor)}`));
      if (block.bytes !== 0 && block.fields.length > 0 && block.id !== 'sections' && total(block.fields) !== block.bytes) problems.push(where(`${block.id} fields add up to ${total(block.fields)}, not ${block.bytes}`));
      cursor = block.start + block.bytes;
    }
    if (alignUp(model.headersEnd, FILE_ALIGNMENT) !== SIZE_OF_HEADERS) problems.push(where(`headers end at ${hex(model.headersEnd)}, which does not round up to SizeOfHeaders`));
    const optionalBytes = id === 'pe32' ? 224 : 240;
    if (model.optionalBytes !== optionalBytes) problems.push(where(`optional header is ${model.optionalBytes} bytes, not ${optionalBytes}`));
  }
  return problems;
}
