// Worked IA-32 / legacy SSE examples. These model the named instructions, not
// a complete CPU, assembler, calling convention, or floating-point environment.
// Intel SDM revision 093, volumes 1 and 2, was checked while authoring them.

const hex = n => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
const byte = n => (n & 255).toString(16).toUpperCase().padStart(2, '0');
const range = (id, label, min, max, value, step = 1) => ({ id, label, type: 'range', min, max, step, value });
const select = (id, label, value, pairs) => ({ id, label, type: 'select', value, options: pairs.map(([value, label]) => ({ value, label })) });
const defaults = { ZF: 0, SF: 0, CF: 0, OF: 0, PF: 1 };
function record() {
  const steps = [], vars = {};
  return { steps, push(line, say, change = {}, mem) {
    Object.assign(vars, change);
    steps.push({ line, say, vars: { ...vars }, mem });
  } };
}
function resultFlags(n) {
  const u = n >>> 0;
  let ones = 0;
  for (let b = u & 255; b; b >>>= 1) ones += b & 1;
  return { ZF: Number(u === 0), SF: u >>> 31, PF: Number(ones % 2 === 0) };
}
function arithmetic(a, b, subtract = false) {
  const ua = a >>> 0, ub = b >>> 0;
  const result = (subtract ? ua - ub : ua + ub) >>> 0;
  const overflow = subtract ? ((ua ^ ub) & (ua ^ result)) : (~(ua ^ ub) & (ua ^ result));
  return { result, flags: { ...resultFlags(result), CF: Number(subtract ? ua < ub : ua + ub > 0xFFFFFFFF), OF: Number((overflow & 0x80000000) !== 0) } };
}
const bytes = (title, n) => ({ title, cells: [0, 1, 2, 3].map(i => ({ label: '+' + i, value: byte(n >>> (8 * i)), note: 'little-endian byte' })) });
const bits = (title, n) => ({ title, cells: [3, 2, 1, 0].map(i => ({ label: 'bit ' + i, value: String((n >>> i) & 1), note: 'low four bits only' })) });
const stack = (value, active) => ({ title: 'One illustrative stack slot; a pop does not erase its bytes', cells: [{ label: '0x00007FFC', value: String(value), note: active ? 'current top: esp points here' : 'inactive slot: esp is above it' }] });
const floatBytes = (title, n) => {
  const data = new DataView(new ArrayBuffer(4)); data.setFloat32(0, n, true);
  return { title, cells: [0, 1, 2, 3].map(i => ({ label: '+' + i, value: byte(data.getUint8(i)), note: 'binary32 byte' })) };
};
const printable = n => Number.isNaN(n) ? 'NaN' : String(Object.is(n, -0) ? 0 : n);

function addOrSubtract(kind) {
  const subtract = kind === 'sub';
  return {
    title: subtract ? 'Subtract a price and inspect a borrow' : 'Add a reward and inspect overflow',
    intro: 'The example already works. Change the amount or boundary case, then compare the stored bits with the flags.',
    inputs: [select('case', 'Starting gold', 'ordinary', subtract ? [['ordinary', '100 gold'], ['signed-limit', '0x80000000: signed minimum']] : [['ordinary', '100 gold'], ['unsigned-limit', '0xFFFFFFFF: unsigned maximum'], ['signed-limit', '0x7FFFFFFF: signed maximum']]), range('amount', subtract ? 'Price' : 'Reward', 1, subtract ? 150 : 25, subtract ? 25 : 10)],
    code(v) { const start = v.case === 'ordinary' ? 100 : v.case === 'unsigned-limit' ? 0xFFFFFFFF : subtract ? 0x80000000 : 0x7FFFFFFF; return [`mov eax, ${hex(start)}`, `${kind} eax, ${v.amount}`, 'mov [gold], eax']; },
    run(v) {
      const { steps, push } = record();
      const start = v.case === 'ordinary' ? 100 : v.case === 'unsigned-limit' ? 0xFFFFFFFF : subtract ? 0x80000000 : 0x7FFFFFFF;
      const { result, flags } = arithmetic(start, v.amount, subtract);
      push(0, `Load ${hex(start)} into eax. This copy leaves the comparison flags alone.`, { case: v.case, amount: v.amount, eax: start, 'eax bits': hex(start), ...defaults }, bytes('Gold before the update', start));
      push(1, `${subtract ? 'Subtract' : 'Add'} ${v.amount}. The 32-bit result is ${hex(result)}. CF=${flags.CF} describes unsigned ${subtract ? 'borrowing' : 'carry'}; OF=${flags.OF} describes signed overflow.`, { eax: result, 'eax bits': hex(result), 'signed reading': result | 0, ...flags });
      push(2, `Store ${hex(result)} in gold. The mov does not repair overflow or change these flags.`, { gold: result }, bytes('Gold after the update', result));
      return steps;
    },
  };
}
function incrementOrDecrement(kind) {
  const decrement = kind === 'dec';
  return {
    title: decrement ? 'Use one ammo while preserving carry' : 'Count a collected coin while preserving carry',
    intro: 'Carry starts at one here. Change the starting count and watch which flags change and which one survives.',
    inputs: [select('case', 'Starting count', 'ordinary', decrement ? [['ordinary', '1 ammo'], ['zero', '0: unsigned underflow'], ['signed-limit', '0x80000000: signed minimum']] : [['ordinary', '4 coins'], ['unsigned-limit', '0xFFFFFFFF: unsigned maximum'], ['signed-limit', '0x7FFFFFFF: signed maximum']])],
    code(v) { const n = v.case === 'ordinary' ? (decrement ? 1 : 4) : v.case === 'zero' ? 0 : v.case === 'unsigned-limit' ? 0xFFFFFFFF : decrement ? 0x80000000 : 0x7FFFFFFF; return [`mov eax, ${hex(n)}`, `${kind} eax`, 'mov [count], eax']; },
    run(v) {
      const { steps, push } = record();
      const n = v.case === 'ordinary' ? (decrement ? 1 : 4) : v.case === 'zero' ? 0 : v.case === 'unsigned-limit' ? 0xFFFFFFFF : decrement ? 0x80000000 : 0x7FFFFFFF;
      const { result, flags } = arithmetic(n, 1, decrement);
      push(0, 'The starting comparison flags are illustrative. In particular, CF is already one.', { case: v.case, eax: n, 'eax bits': hex(n), ...defaults, CF: 1 }, bytes('Starting count', n));
      push(1, `${kind} changes the count by one. Its result is ${hex(result)}, but CF stays one; it is not a fresh carry or borrow answer.`, { eax: result, 'eax bits': hex(result), ...flags, CF: 1 });
      push(2, `The stored count is ${hex(result)}. Check the new ZF/SF/OF when needed; do not treat the preserved CF as this operation's overflow test.`, { count: result }, bytes('Stored count', result));
      return steps;
    },
  };
}
function extension(kind) {
  const signed = kind === 'movsx';
  return {
    title: signed ? 'Keep the sign when widening a byte' : 'Widen a byte without a sign',
    intro: 'The byte starts at 255. Move the slider across 127 and 128 to explore the meaning of its top bit.',
    inputs: [range('value', 'Byte stored in the player record', 0, 255, 255)],
    code(v) { return [`mov bl, ${v.value}`, `${kind} eax, bl`, 'mov [expanded], eax']; },
    run({ value }) {
      const { steps, push } = record(), result = signed && value >= 128 ? value - 256 : value;
      push(0, `bl contains the eight-bit pattern ${byte(value)}. The pattern itself does not declare a signed type.`, { value, bl: byte(value), ...defaults }, { title: 'One source byte', cells: [{ label: 'byte', value: byte(value), note: '8 bits' }] });
      push(1, signed ? `Repeat the source sign bit into the new upper bits. ${byte(value)} becomes ${hex(result)}, read as ${result}.` : `Fill the new upper bits with zero. ${byte(value)} becomes ${hex(result)}, read as ${result}.`, { eax: result, 'eax bits': hex(result) });
      push(2, `Store the widened value ${result}. The original byte and the flags are unchanged.`, { expanded: result }, bytes('Four-byte destination', result));
      return steps;
    },
  };
}

const branches = {
  je: ['equal / zero', f => f.ZF === 1], jne: ['not equal / nonzero', f => f.ZF === 0],
  jb: ['unsigned below', f => f.CF === 1], jae: ['unsigned above or equal', f => f.CF === 0],
  jbe: ['unsigned below or equal', f => f.CF === 1 || f.ZF === 1], ja: ['unsigned above', f => f.CF === 0 && f.ZF === 0],
  jl: ['signed less', f => f.SF !== f.OF], jge: ['signed greater or equal', f => f.SF === f.OF],
  jle: ['signed less or equal', f => f.ZF === 1 || f.SF !== f.OF], jg: ['signed greater', f => f.ZF === 0 && f.SF === f.OF],
  jc: ['carry set', f => f.CF === 1], jnc: ['carry clear', f => f.CF === 0],
  jo: ['overflow set', f => f.OF === 1], jno: ['overflow clear', f => f.OF === 0],
  js: ['sign set', f => f.SF === 1], jns: ['sign clear', f => f.SF === 0],
  jp: ['even low-byte parity', f => f.PF === 1], jnp: ['odd low-byte parity', f => f.PF === 0],
};
const branchCase = name => ({ signed: [-1, 2], equal: [3, 3], ordinary: [2, 3], overflow: [-2147483648, 1] })[name];
function callOrReturn(focus) {
  return {
    title: focus === 'call' ? 'Save a continuation before entering the helper' : 'Resume the caller from the stack',
    intro: 'The stack slot shows a symbolic return label instead of real machine-code bytes. Change the starting gold and follow the round trip.',
    inputs: [range('gold', 'Gold before the helper', 0, 20, 10)],
    code(v) { return [`mov eax, ${v.gold}`, 'call grant_coin', 'mov [gold], eax', 'jmp done', 'grant_coin: add eax, 1', 'ret', 'done:']; },
    run({ gold }) {
      const { steps, push } = record(), out = arithmetic(gold, 1);
      push(0, 'The caller loads gold. esp starts at an illustrative address; no argument passing convention is being modeled.', { gold, eax: gold, esp: hex(0x8000), continuation: 'not saved yet', ...defaults });
      push(1, 'A near 32-bit call lowers esp by four, stores the address of the instruction after call, then enters grant_coin.', { esp: hex(0x7FFC), continuation: 'line 3: store gold', eip: 'grant_coin' }, stack('line 3: store gold', true));
      push(4, 'The helper adds one coin. The return address is still on top of the stack.', { eax: out.result, ...out.flags });
      push(5, 'ret reads the saved address, advances esp by four, and resumes line 3. It does not itself put the result in eax.', { esp: hex(0x8000), eip: 'line 3: store gold', continuation: 'consumed' }, stack('line 3: store gold', false));
      push(2, `The caller stores ${out.result} gold. eax carries the helper's result because this example chose that convention.`, { gold: out.result }, bytes('Caller stores the returned value', out.result));
      push(3, 'Jump past the helper body; otherwise ordinary fall-through could enter it a second time.', { eip: 'done' });
      push(6, `The round trip ends with ${out.result} gold and the original esp. The saved stack bytes can remain, but they are no longer an active return address.`);
      return steps;
    },
  };
}
function pushOrPop(focus) {
  return {
    title: focus === 'push' ? 'Save a temporary register value on the stack' : 'Recover the last saved value',
    intro: 'The worked example saves health, reuses the register, and restores it. Change health and inspect both esp and the stored bytes.',
    inputs: [range('health', 'Health value to preserve', 0, 100, 80)],
    code(v) { return [`mov ebx, ${v.health}`, 'push ebx', 'mov ebx, 0', 'pop ebx', 'mov [health], ebx']; },
    run({ health }) {
      const { steps, push } = record();
      push(0, 'Load health into ebx. The illustrative 32-bit stack grows toward lower addresses.', { health, ebx: health, esp: hex(0x8000), ...defaults });
      push(1, 'push lowers esp by four and writes the current ebx value into that stack slot.', { esp: hex(0x7FFC) }, stack(health, true));
      push(2, 'Reuse ebx for temporary work. The saved copy remains on the stack.', { ebx: 0 });
      push(3, 'pop reads the top slot into ebx, then advances esp by four. It does not erase the old memory.', { ebx: health, esp: hex(0x8000) }, stack(health, false));
      push(4, `Store the restored health value ${health}. The push/pop pair balanced esp and preserved the flags.`, { health }, bytes('Health after restoring ebx', health));
      return steps;
    },
  };
}
function shift(kind) {
  const right = kind !== 'shl', signed = kind === 'sar';
  return {
    title: kind === 'shl' ? 'Shift a packed value left' : signed ? 'Shift a signed movement delta right' : 'Shift a bit pattern right with zero fill',
    intro: 'Try a shift count of zero, one, then two. CF records the last bit lost; OF has a defined shift result only for a count of one.',
    inputs: [range('value', 'Starting 32-bit value', -16, 16, right ? -12 : 5), range('count', 'Shift count', 0, 3, 1)],
    code(v) { return [`mov eax, ${v.value}`, `${kind} eax, ${v.count}`, 'mov [packed], eax']; },
    run({ value, count }) {
      const { steps, push } = record(), u = value >>> 0;
      const result = count === 0 ? u : kind === 'shl' ? (u << count) >>> 0 : signed ? (value >> count) >>> 0 : u >>> count;
      const cf = count === 0 ? 1 : right ? (u >>> (count - 1)) & 1 : (u >>> (32 - count)) & 1;
      const of = count === 0 ? 1 : count !== 1 ? 'undefined' : kind === 'shl' ? ((result >>> 31) ^ cf) : signed ? 0 : u >>> 31;
      push(0, `Start with ${hex(u)} (${value} as signed). The illustrative previous CF and OF are both one.`, { value, count, eax: u, 'signed reading': value, 'eax bits': hex(u), ...defaults, CF: 1, OF: 1 }, bits('Low four bits before shifting', u));
      push(1, count === 0 ? 'A zero effective count leaves the value and flags unchanged.' : `${kind} shifts ${count} place${count === 1 ? '' : 's'} ${right ? 'right' : 'left'}, ${signed ? 'repeating the sign bit' : 'filling new positions with zero'}. The last bit lost becomes CF=${cf}; OF=${of}.`, { eax: result, 'signed reading': result | 0, 'eax bits': hex(result), ...(count ? resultFlags(result) : {}), CF: cf, OF: of }, bits('Low four bits after shifting', result));
      push(2, `Store ${hex(result)}. Its signed reading is ${result | 0}. ${signed ? 'For a nonzero count, signed right shift rounds negative values downward when discarded bits are nonzero.' : right ? 'Zero-fill right shift treats the original bit pattern as unsigned.' : 'Left shift keeps only the bits that fit in the selected width.'}`, { packed: result }, bytes('Stored 32-bit bit pattern', result));
      return steps;
    },
  };
}
function logic(kind) {
  const mask = kind === 'and' ? 3 : 4;
  return {
    title: ({ and: 'Keep only the selected status bits', or: 'Set a status bit without clearing others', xor: 'Toggle one status bit', not: 'Invert every bit in the word' })[kind],
    intro: 'The boxes show only the low four bits; eax still contains a full 32-bit word. Change the starting flags and compare the operation.',
    inputs: [range('value', 'Starting status bits', 0, 15, 5)],
    code(v) { return [`mov eax, ${v.value}`, kind === 'not' ? 'not eax' : `${kind} eax, ${mask}`, 'mov [status], eax']; },
    run({ value }) {
      const { steps, push } = record();
      const result = (kind === 'and' ? value & mask : kind === 'or' ? value | mask : kind === 'xor' ? value ^ mask : ~value) >>> 0;
      push(0, `Start with ${hex(value)}. Previous CF and ZF are deliberately one to make flag preservation visible.`, { value, eax: value, 'eax bits': hex(value), ...defaults, CF: 1, ZF: 1 }, bits('Low four status bits before', value));
      const why = kind === 'and' ? 'A bit survives only where both inputs have one.' : kind === 'or' ? 'A bit becomes one if either input has one.' : kind === 'xor' ? 'A bit becomes one when the two input bits differ.' : 'Every bit flips, including the 28 upper bits absent from these boxes. Unlike and/or/xor, not leaves the flags alone.';
      push(1, why, { eax: result, 'eax bits': hex(result), ...(kind === 'not' ? {} : { ...resultFlags(result), CF: 0, OF: 0 }) }, bits('Low four status bits after', result));
      push(2, `Store ${hex(result)} in status. ${kind === 'not' ? 'The prior comparison flags still survive.' : 'ZF describes whether the complete result is zero, not whether one chosen status bit is clear.'}`, { status: result }, bytes('All four bytes of status', result));
      return steps;
    },
  };
}

export const ASSEMBLY_TRACES = {
  'asm-mov': {
    title: 'Copy ammo through registers into memory',
    intro: 'Change ammo, then watch the source survive both copies. A copy does not consume its source.',
    inputs: [range('ammo', 'Ammo in the player record', 0, 30, 12)],
    code: ['mov eax, [ammo]', 'mov ecx, eax', 'mov [display_ammo], ecx'],
    run({ ammo }) {
      const { steps, push } = record();
      push(0, 'Read four bytes from ammo and copy their value into eax. The source bytes stay in place.', { ammo, eax: ammo, ...defaults }, bytes('Player ammo stays unchanged', ammo));
      push(1, 'Copy eax into ecx. eax keeps the same value, and the flags are not changed.', { ecx: ammo });
      push(2, `Copy ecx into the display field. Both registers and the original ammo still contain ${ammo}.`, { display_ammo: ammo }, bytes('Display field after the store', ammo));
      return steps;
    },
  },
  'asm-lea': {
    title: 'Compute an address without reading the object',
    intro: 'Each toy player occupies 16 bytes. Change the player index and watch the address calculation.',
    inputs: [range('index', 'Player index', 0, 3, 2)],
    code(v) { return ['mov esi, 0x1000', `mov ecx, ${v.index}`, 'shl ecx, 2', 'lea eax, [esi+ecx*4+8]']; },
    run({ index }) {
      const { steps, push } = record(), scaled = index * 4, address = 0x1000 + index * 16 + 8;
      push(0, 'esi holds the base address of the toy collection. The health field is eight bytes into each 16-byte player record.', { index, esi: hex(0x1000), ...defaults });
      push(1, 'ecx holds an index, not an address.', { ecx: index });
      push(2, 'The encoding permits scales 1, 2, 4, or 8. Pre-multiply the index by four so the next scale of four produces a 16-byte stride.', { ecx: scaled, ...resultFlags(scaled), CF: 0, OF: 'undefined' });
      push(3, `lea adds base ${hex(0x1000)} + ${scaled}*4 + 8 = ${hex(address)}. It does not read health or change the flags left by shl.`, { eax: hex(address), 'memory read by lea': 'none' });
      return steps;
    },
  },
  'asm-add': addOrSubtract('add'), 'asm-sub': addOrSubtract('sub'),
  'asm-inc': incrementOrDecrement('inc'), 'asm-dec': incrementOrDecrement('dec'),
  'asm-imul': {
    title: 'Multiply a signed reward and detect truncation',
    intro: 'Try an ordinary reward, a negative adjustment, then a product too large for a signed 32-bit destination.',
    inputs: [select('case', 'Reward before multiplier', 'ordinary', [['ordinary', '6 coins'], ['negative', '-6 coin adjustment'], ['overflow', '1,073,741,824 coins']]), range('factor', 'Multiplier', 1, 4, 3)],
    code(v) { const n = v.case === 'ordinary' ? 6 : v.case === 'negative' ? -6 : 1073741824; return [`mov eax, ${n}`, `imul eax, eax, ${v.factor}`, 'mov [reward], eax']; },
    run({ case: mode, factor }) {
      const { steps, push } = record(), n = mode === 'ordinary' ? 6 : mode === 'negative' ? -6 : 1073741824;
      const exact = BigInt(n) * BigInt(factor), result = Number(BigInt.asIntN(32, exact)), overflow = Number(exact !== BigInt(result));
      push(0, 'eax holds a signed reward. This is the three-operand form: destination, source, immediate multiplier.', { case: mode, factor, eax: n, ...defaults });
      push(1, `The exact product is ${exact}. The destination keeps ${hex(result)}, read as ${result}; CF and OF are ${overflow}. Other arithmetic-result flags are undefined for imul.`, { eax: result, 'eax bits': hex(result), 'exact product': String(exact), CF: overflow, OF: overflow, ZF: 'undefined', SF: 'undefined', PF: 'undefined' });
      push(2, `Store the low 32 bits, ${hex(result)}. ${overflow ? 'The overflow flags warn that this is not the full signed product.' : 'The signed product fits the destination.'}`, { reward: result }, bytes('Stored reward bits', result));
      return steps;
    },
  },
  'asm-idiv': {
    title: 'Share signed coins and keep the remainder',
    intro: 'The worked example divides 23 coins among four players. Try a negative adjustment or zero players to see the boundary.',
    inputs: [range('coins', 'Signed coin total', -25, 25, 23), range('players', 'Number of players', 0, 6, 4)],
    code(v) { return [`mov eax, ${v.coins}`, 'cdq', `mov ecx, ${v.players}`, 'idiv ecx', 'mov [share], eax']; },
    run({ coins, players }) {
      const { steps, push } = record();
      push(0, 'Load the signed total into eax. idiv ecx will divide the double-width EDX:EAX dividend, not eax alone.', { coins, players, eax: coins, ...defaults });
      push(1, `cdq sign-extends eax into EDX:EAX; edx becomes ${coins < 0 ? '-1 (all ones)' : '0'}. It does not change comparison flags.`, { edx: coins < 0 ? -1 : 0 });
      push(2, 'ecx holds the divisor; it is read, not overwritten by idiv.', { ecx: players });
      if (players === 0) { push(3, 'A zero divisor raises a divide-error exception. There is no quotient or share store; the program needs a guard before idiv.', { outcome: 'divide error; no share stored' }); return steps; }
      const quotient = Math.trunc(coins / players), remainder = coins - quotient * players;
      push(3, `Signed division truncates toward zero: eax=${quotient}, edx=${remainder}. The remainder has the dividend's sign when nonzero. The arithmetic flags are undefined.`, { eax: quotient, edx: remainder, CF: 'undefined', OF: 'undefined', ZF: 'undefined', SF: 'undefined', PF: 'undefined' });
      push(4, `Each share is ${quotient}, with ${remainder} left over. The divisor stayed ${players}; a later branch needs a new comparison.`, { share: quotient }, bytes('Stored share bits', quotient));
      return steps;
    },
  },
  'asm-movzx': extension('movzx'), 'asm-movsx': extension('movsx'),
  'asm-cmp': {
    title: 'Compare gold without spending it',
    intro: 'Change the price and watch gold stay fixed while the subtraction flags change.',
    inputs: [range('price', 'Shop price', 0, 150, 25)],
    code(v) { return ['mov eax, 100', `cmp eax, ${v.price}`, 'mov ecx, eax']; },
    run({ price }) {
      const { steps, push } = record(), out = arithmetic(100, price, true);
      push(0, 'Load 100 gold into eax. Nothing has been spent.', { price, eax: 100, ...defaults });
      push(1, `Compute 100 minus ${price} for the flags, then discard the numeric result. eax remains 100; CF=${out.flags.CF}, ZF=${out.flags.ZF}.`, { ...out.flags, 'discarded difference bits': hex(out.result) });
      push(2, 'ecx receives the same 100 gold. A following jump can read the comparison flags because mov does not change them.', { ecx: 100 });
      return steps;
    },
  },
  'asm-test': {
    title: 'Inspect a status bit without clearing the others',
    intro: 'Bit 2 means stunned in this toy record. Change the status word to explore its zero/nonzero test.',
    inputs: [range('status', 'Player status bits', 0, 15, 5)],
    code(v) { return [`mov eax, ${v.status}`, 'test eax, 4', 'mov ecx, eax']; },
    run({ status }) {
      const { steps, push } = record(), masked = status & 4;
      push(0, 'eax contains all status bits. Testing one bit must not destroy the others.', { status, eax: status, ...defaults }, bits('Status word stays intact', status));
      push(1, `Compute the temporary AND result ${masked}, then discard it. ZF=${Number(masked === 0)} answers whether bit 2 is clear; CF and OF become zero.`, { ...resultFlags(masked), CF: 0, OF: 0, 'discarded AND result': masked });
      push(2, `The original status ${status} is still in both eax and ecx. The flags, not a changed status word, report the test.`, { ecx: status });
      return steps;
    },
  },
  'asm-jmp': {
    title: 'Skip an instruction unconditionally',
    intro: 'Change the value on the skipped line. It never reaches the display because this path always jumps over it.',
    inputs: [range('skipped', 'Value written on the skipped line', 0, 99, 99)],
    code(v) { return ['mov eax, 5', 'jmp ready', `mov eax, ${v.skipped}`, 'ready: mov [ammo], eax']; },
    run({ skipped }) {
      const { steps, push } = record();
      push(0, 'eax starts at five. The next instruction chooses where execution continues.', { skipped, eax: 5, ...defaults });
      push(1, 'jmp sets the instruction pointer to ready. It does not test or change the comparison flags.', { 'next line': 4 });
      push(3, `The skipped assignment never ran. Ammo receives five even though the skipped line would have written ${skipped}.`, { ammo: 5 }, bytes('Stored ammo', 5));
      return steps;
    },
  },
  'asm-jcc': {
    title: 'Choose a branch by interpreting the same flags',
    intro: 'Start with signed -1 compared with 2. Switch between jl and jb to see why the same bits need the right signedness.',
    inputs: [select('case', 'Compared values', 'signed', [['signed', '-1 versus 2'], ['equal', '3 versus 3'], ['ordinary', '2 versus 3'], ['overflow', 'signed minimum versus 1']]), select('jump', 'Conditional jump', 'jl', Object.entries(branches).map(([key, [name]]) => [key, key + ': ' + name]))],
    code(v) { const [a, b] = branchCase(v.case); return [`mov eax, ${a}`, `cmp eax, ${b}`, `${v.jump} selected`, 'mov [chosen], 0', 'jmp done', 'selected: mov [chosen], 1', 'done:']; },
    run({ case: mode, jump }) {
      const { steps, push } = record(), [a, b] = branchCase(mode), out = arithmetic(a, b, true), taken = branches[jump][1](out.flags);
      push(0, `eax holds ${hex(a)}, signed ${a} or unsigned ${a >>> 0}. The branch mnemonic decides which interpretation to use.`, { case: mode, jump, eax: a, rhs: b, ...defaults });
      push(1, `cmp keeps eax, discards ${hex(out.result)}, and sets ZF=${out.flags.ZF}, SF=${out.flags.SF}, CF=${out.flags.CF}, OF=${out.flags.OF}, PF=${out.flags.PF}.`, out.flags);
      push(2, `${jump} asks for ${branches[jump][0]}. Its condition is ${taken}; ${taken ? 'jump to selected' : 'continue to the next instruction'}. No flags change.`, { taken });
      push(taken ? 5 : 3, `Only the selected path writes chosen=${taken ? 1 : 0}.`, { chosen: taken ? 1 : 0 });
      if (!taken) push(4, 'The unconditional jump skips the other assignment.');
      push(6, `The result is chosen=${taken ? 1 : 0}. A signed comparison and an unsigned comparison can legitimately choose different paths for identical bits.`);
      return steps;
    },
  },
  'asm-call': callOrReturn('call'), 'asm-ret': callOrReturn('ret'),
  'asm-push': pushOrPop('push'), 'asm-pop': pushOrPop('pop'),
  'asm-shl': shift('shl'), 'asm-shr': shift('shr'), 'asm-sar': shift('sar'),
  'asm-and': logic('and'), 'asm-or': logic('or'), 'asm-xor': logic('xor'), 'asm-not': logic('not'),
  'asm-nop': {
    title: 'Do nothing for one instruction, then continue',
    intro: 'Change the ammo value and step across nop. Watch the later subtraction do the actual work.',
    inputs: [range('ammo', 'Starting ammo', 1, 20, 6)],
    code(v) { return [`mov eax, ${v.ammo}`, 'nop', 'sub eax, 1', 'mov [ammo], eax']; },
    run({ ammo }) {
      const { steps, push } = record(), out = arithmetic(ammo, 1, true);
      push(0, 'Load ammo. The illustrative prior CF is one.', { ammo, eax: ammo, ...defaults, CF: 1 });
      push(1, 'nop advances to the next instruction without changing general registers, comparison flags, or game memory. Time still passes.');
      push(2, 'The following sub, not nop, spends one ammo and produces fresh arithmetic flags.', { eax: out.result, ...out.flags });
      push(3, `The final ammo is ${out.result}. A nop is not a pause, a return, or a guarantee that later code will be safe.`, { ammo: out.result }, bytes('Ammo after the later subtraction', out.result));
      return steps;
    },
  },
  'asm-int3': {
    title: 'Raise a breakpoint exception before the next action',
    intro: 'The default stops at the breakpoint. Choose debugger continuation to explore what happens after the pause in this owned toy program.',
    inputs: [range('ammo', 'Ammo before the breakpoint', 1, 20, 6), select('action', 'Debugger decision', 'pause', [['pause', 'Inspect the paused context'], ['resume', 'Continue the owned toy program']])],
    code(v) { return [`mov eax, ${v.ammo}`, 'int3', 'sub eax, 1', 'mov [ammo], eax']; },
    run({ ammo, action }) {
      const { steps, push } = record(), out = arithmetic(ammo, 1, true);
      push(0, 'The toy program loads ammo before reaching its one-byte CC breakpoint instruction.', { ammo, action, eax: ammo, state: 'running' });
      push(1, 'int3 transfers control through breakpoint-exception handling. The saved instruction pointer is after int3; the later sub has not run.', { state: 'breakpoint exception', 'saved next instruction': 'sub eax, 1' });
      if (action === 'pause') { push(1, `Inspection shows ${ammo} ammo, not ${ammo - 1}. Exception-entry state and the operating-system handler are outside this small model.`, { state: 'paused for inspection' }); return steps; }
      push(2, 'The debugger handles the exception and lets this toy program continue at the following instruction. Now the subtraction runs.', { state: 'continued', eax: out.result });
      push(3, `Continuation stores ${out.result} ammo. Without a handler or debugger decision, int3 is an exception, not an automatic no-op.`, { ammo: out.result }, bytes('Ammo after explicit continuation', out.result));
      return steps;
    },
  },
  'asm-movss': {
    title: 'Move one floating-point speed value',
    intro: 'Change the speed and follow the low 32 bits. The upper parts of legacy XMM registers depend on whether the source is memory or another register.',
    inputs: [range('speed', 'Toy speed as binary32', 0, 8, 2.5, 0.25)],
    code: ['movss xmm0, [speed]', 'movss xmm1, xmm0', 'movss [shown_speed], xmm1'],
    run({ speed }) {
      const { steps, push } = record(), n = Math.fround(speed);
      push(0, 'This legacy movss memory load reads one binary32 value into xmm0 low bits and clears its upper 96 bits. Integer comparison flags stay unchanged.', { speed, 'xmm0 low': n, 'xmm0 upper 96': 'zero', 'xmm1 upper 96': 'previous contents', ...defaults }, floatBytes('Four bytes read from speed', n));
      push(1, 'The register-to-register movss copies only the low value into xmm1. Its upper 96 bits retain their previous contents.', { 'xmm1 low': n });
      push(2, `The memory store writes just four bytes, representing ${n}. It does not store all 128 bits of xmm1.`, { shown_speed: n }, floatBytes('Four bytes stored in shown_speed', n));
      return steps;
    },
  },
  'asm-addss': {
    title: 'Add a floating-point movement step',
    intro: 'The example uses binary32 values and round-to-nearest, ties-to-even. Change the step and compare the new low float with the unchanged integer flags.',
    inputs: [range('position', 'Position', -4, 8, 2.5, 0.25), range('step', 'Movement step', -2, 2, 0.5, 0.25)],
    code: ['movss xmm0, [position]', 'addss xmm0, [step]', 'movss [position], xmm0'],
    run({ position, step }) {
      const { steps, push } = record(), a = Math.fround(position), b = Math.fround(step), result = Math.fround(a + b);
      push(0, `Load position ${a}. This trace shows the low float; the memory load cleared xmm0's upper 96 bits.`, { position, step, 'xmm0 low': a, 'xmm0 upper 96': 'zero', ...defaults }, floatBytes('Position before adding', a));
      push(1, `addss computes ${a} + ${b}, rounded to binary32 ${result}. Its upper 96 bits and integer comparison flags do not change.`, { 'xmm0 low': result });
      push(2, `Store the new position ${result}. SIMD floating-point status in MXCSR is separate from the ZF/SF/CF/OF shown here.`, { position: result }, floatBytes('Position after adding', result));
      return steps;
    },
  },
  'asm-mulss': {
    title: 'Scale a floating-point speed',
    intro: 'The worked example doubles speed. Try a half-speed or negative multiplier and follow the low binary32 value.',
    inputs: [range('speed', 'Starting speed', 0, 8, 2.5, 0.25), range('factor', 'Speed multiplier', -2, 3, 2, 0.25)],
    code: ['movss xmm0, [speed]', 'mulss xmm0, [factor]', 'movss [speed], xmm0'],
    run({ speed, factor }) {
      const { steps, push } = record(), a = Math.fround(speed), b = Math.fround(factor), result = Math.fround(a * b);
      push(0, 'Load a binary32 speed into the low part of xmm0. The rounding mode is nearest, ties-to-even.', { speed, factor, 'xmm0 low': a, 'xmm0 upper 96': 'zero', ...defaults }, floatBytes('Speed before scaling', a));
      push(1, `mulss computes ${a} * ${b} = ${printable(result)} as binary32. Integer comparison flags and the upper 96 XMM bits stay unchanged.`, { 'xmm0 low': printable(result) });
      push(2, `The stored speed is ${printable(result)}. This float multiplication does not produce an integer carry flag.`, { speed: printable(result) }, floatBytes('Speed after scaling', result));
      return steps;
    },
  },
  'asm-cvtsi2ss': {
    title: 'Convert integer points into a float',
    intro: 'Try a small score, then 16,777,217. A numeric conversion can round even though an ordinary byte copy would not.',
    inputs: [select('case', 'Integer score', 'small', [['small', '7 points'], ['negative', '-7 point adjustment'], ['rounded', '16,777,217 points']])],
    code(v) { const n = v.case === 'small' ? 7 : v.case === 'negative' ? -7 : 16777217; return [`mov eax, ${n}`, 'cvtsi2ss xmm0, eax', 'movss [score_float], xmm0']; },
    run({ case: mode }) {
      const { steps, push } = record(), n = mode === 'small' ? 7 : mode === 'negative' ? -7 : 16777217, out = Math.fround(n);
      push(0, 'eax contains a signed integer. The bits are not yet a floating-point encoding.', { case: mode, eax: n, 'xmm0 upper 96': 'previous contents', ...defaults });
      push(1, `Convert the numeric value ${n} to binary32 ${out}. ${out === n ? 'This value is represented exactly.' : 'Nearest, ties-to-even rounding changes the value because this integer is not exactly representable.'} The integer flags stay unchanged.`, { 'xmm0 low': out, 'conversion exact': out === n });
      push(2, `Store float ${out}. eax still holds integer ${n}; the legacy conversion preserved the upper 96 XMM bits.`, { score_float: out }, floatBytes('Converted binary32 score', out));
      return steps;
    },
  },
  'asm-cvttss2si': {
    title: 'Truncate a float toward zero',
    intro: 'Try positive and negative fractions, then invalid input. This example assumes the MXCSR invalid-operation exception is masked.',
    inputs: [select('case', 'Float score', 'positive', [['positive', '2.75 points'], ['negative', '-2.75 points'], ['too-large', '2,147,483,648 points'], ['nan', 'NaN: no ordered number']])],
    code: ['movss xmm0, [score_float]', 'cvttss2si eax, xmm0', 'mov [score_int], eax'],
    run({ case: mode }) {
      const { steps, push } = record(), n = mode === 'positive' ? 2.75 : mode === 'negative' ? -2.75 : mode === 'too-large' ? 2147483648 : NaN;
      const valid = Number.isFinite(n) && n >= -2147483648 && n < 2147483648, out = valid ? Math.trunc(n) : -2147483648;
      push(0, `Load binary32 ${printable(n)}. The example has masked invalid-operation exceptions; an unmasked one would trap instead.`, { case: mode, 'xmm0 low': printable(n), ...defaults }, floatBytes('Float input bytes', n));
      push(1, valid ? `Truncate toward zero: ${n} becomes ${out}. The TT form does not use the rounding direction for this conversion.` : 'The conversion is invalid. With the invalid exception masked, eax receives the indefinite integer 0x80000000 and MXCSR records invalid operation.', { eax: out, 'eax bits': hex(out), 'valid conversion': valid, 'MXCSR invalid raised': !valid });
      push(2, valid ? `Store integer ${out}; the float source and integer comparison flags did not change.` : 'The stored bits are 0x80000000. They also encode a valid signed minimum, so these bits alone cannot distinguish an invalid conversion.', { score_int: out }, bytes('Integer destination', out));
      return steps;
    },
  },
  'asm-comiss': {
    title: 'Compare floats, including an unordered value',
    intro: 'The default speed is below its limit. Explore equality, a greater speed, and NaN; the unordered check must come before treating equality as valid.',
    inputs: [select('case', 'Observed speed', 'below', [['below', '2.5: below the 3.0 limit'], ['equal', '3.0: equal to the limit'], ['above', '4.0: above the limit'], ['nan', 'NaN with invalid exception masked']])],
    code: ['movss xmm0, [speed]', 'comiss xmm0, [limit]', 'jp reject_invalid', 'jb wait_for_speed', '; ordered and at least the limit: continue'],
    run({ case: mode }) {
      const { steps, push } = record(), n = mode === 'below' ? 2.5 : mode === 'equal' ? 3 : mode === 'above' ? 4 : NaN;
      const unordered = Number.isNaN(n), flags = { ZF: Number(unordered || n === 3), PF: Number(unordered), CF: Number(unordered || n < 3), OF: 0, SF: 0 };
      push(0, `Load speed ${printable(n)}; the limit remains 3.0. NaN is not an ordered number.`, { case: mode, 'xmm0 low': printable(n), limit: 3, ...defaults });
      push(1, `comiss preserves both float operands and sets ZF=${flags.ZF}, PF=${flags.PF}, CF=${flags.CF}. ${unordered ? 'With invalid masked, unordered sets all three to one; an unmasked invalid exception would prevent this flag update.' : 'OF and SF are zero: do not use signed-integer jl/jg for this float ordering.'}`, flags);
      push(2, `jp reads PF. ${unordered ? 'It jumps out to reject_invalid before any equality or below test.' : 'PF is zero, so the ordered comparison proceeds.'}`, { unordered });
      if (unordered) { push(2, 'The invalid speed is rejected. ZF=1 here did not mean that the two values were equal.', { outcome: 'reject invalid speed' }); return steps; }
      push(3, `jb reads CF. ${n < 3 ? 'It jumps out to wait_for_speed because the ordered value is below the limit.' : 'It does not jump because speed is at least the limit.'}`, { 'below limit': n < 3 });
      push(n < 3 ? 3 : 4, `The selected path is ${n < 3 ? 'wait for speed' : 'continue'}. A float comparison needs its own flag interpretation.`, { outcome: n < 3 ? 'wait for speed' : 'continue' });
      return steps;
    },
  },
};
