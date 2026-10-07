// Authored, deterministic teaching models. They do not inspect or modify a game.
// The book's shared CodeTrace engine registers ORIGINAL_TRACES alongside TRACES.
const range = (id, label, min, max, value) => ({ id, label, type: 'range', min, max, step: 1, value });
const select = (id, label, value, options) => ({ id, label, type: 'select', value, options: options.map(([value, label]) => ({ value, label })) });
const hex = value => '0x' + value.toString(16).toUpperCase().padStart(4, '0');
const bits = value => value.toString(2).padStart(8, '0');

function record(initial) {
	let vars = { ...initial };
	const steps = [];
	return {
		steps,
		add(line, say, changes = {}, mem) {
			vars = { ...vars, ...changes };
			steps.push({ line, say, vars: { ...vars }, ...(mem ? { mem } : {}) });
		},
	};
}

export const ORIGINAL_TRACES = {
  'original-network-topology': {
    title: 'The same movement request, three arrangements',
    intro: 'Choose where the request goes and whether a wall blocks it. This worked model compares message paths with the program that calculates the result.',
    code: ['start at (10, 15)', 'request move north', 'deliver input to the selected participants', 'check destination against the shared map', 'accept (10, 14) or keep (10, 15)', 'draw the accepted position'],
    inputs: [select('model', 'Arrangement', 'dedicated', [['dedicated', 'Dedicated authoritative server'], ['host', 'Player-hosted authoritative server'], ['peers', 'Peer input exchange with lockstep']]), select('wall', 'Destination', 'clear', [['clear', 'Free tile'], ['blocked', 'Wall']])],
    run({ model, wall }) {
      const peer = model === 'peers';
      const owner = peer ? 'each peer, from identical inputs and map' : model === 'host' ? 'server program on the host player’s computer' : 'dedicated server program';
      const result = wall === 'blocked' ? '(10, 15)' : '(10, 14)';
      const r = record({ arrangement: model, destination: wall, position: '(10, 15)', calculator: owner });
      r.add(0, 'The worked match begins at the same position in each arrangement.');
      r.add(1, 'The player requests north; this request does not itself establish the final position.');
      r.add(2, peer ? 'Peers exchange the input for this tick. This lockstep example assumes every peer receives the same ordered inputs and uses the same starting map.' : `The client sends the request to the ${owner}.`);
      r.add(3, `${owner} checks the destination. A wall keeps the player in place.`, { blocked: wall === 'blocked' });
      r.add(4, `The calculation accepts ${result}.`, { position: result });
      r.add(5, `Each player draws ${result}. ${peer ? 'Identical deterministic simulations give the same result in this example; other peer designs may assign authority differently.' : 'The server’s accepted result determines the final position, even when that program runs on a player’s computer.'}`);
      return r.steps;
    },
  },
	'original-class-instance': {
		title: 'One Player definition, two independent players',
		intro: 'Choose who takes damage. Both players use the same method; each keeps a separate health field. This is explanatory pseudocode.',
		code: [
			'class Player: gold, health',
			'  damage(amount):',
			'    self.health = max(0, self.health - amount)',
			'Ada = Player(gold=75, health=60)',
			'Bo = Player(gold=40, health=50)',
			'target.damage(amount)',
		],
		inputs: [select('target', 'Player taking damage', 'Ada', [['Ada', 'Ada'], ['Bo', 'Bo']]), range('amount', 'Damage', 0, 80, 20)],
		run({ target, amount }) {
			const health = { Ada: 60, Bo: 50 };
			const mem = () => ({ title: 'Separate instance fields', cells: [
				{ label: 'Ada.gold', value: '75' }, { label: 'Ada.health', value: String(health.Ada) },
				{ label: 'Bo.gold', value: '40' }, { label: 'Bo.health', value: String(health.Bo) },
			] });
			const r = record({ target, amount, 'Ada.health': 60, 'Bo.health': 50, self: 'not selected yet' });
			r.add(3, 'The two instances start with different fields. Declaring Player did not make their health one shared value.', {}, mem());
			r.add(5, `Calling ${target}.damage selects ${target} as self. The method body is shared; the receiver is specific.`, { self: target }, mem());
			const before = health[target];
			health[target] = Math.max(0, before - amount);
			r.add(2, `${target}'s health becomes max(0, ${before} - ${amount}) = ${health[target]}. Gold is not used by this calculation.`, { [`${target}.health`]: health[target] }, mem());
			r.add(5, `${target} now has ${health[target]} health. ${target === 'Ada' ? 'Bo keeps 50' : 'Ada keeps 60'} health, and both gold fields stay unchanged.`, {}, mem());
			return r.steps;
		},
	},
	'original-nested-return': {
		title: 'Two calls need two return addresses',
		intro: 'Change the starting score, then follow two nested near calls in this simplified 32-bit x86 example. Labels stand for instruction addresses.',
		code: [
			'main:        mov eax, start',
			'             call add_bonus',
			'after_bonus: mov [score], eax',
			'             jmp done',
			'add_bonus:   call add_one',
			'after_one:   ret',
			'add_one:     add eax, 1',
			'             ret',
			'done:        nop',
		],
		inputs: [range('start', 'Starting score', 0, 9, 4)],
		run({ start }) {
			let depth = 0;
			const mem = () => ({ title: 'Saved return-address slots', cells: [
				{ label: '0x0FF8', value: depth === 0 ? 'after_one (old bytes)' : depth === 1 ? 'after_one (old bytes)' : 'after_one', note: depth === 2 ? 'top of active stack' : 'outside active stack' },
				{ label: '0x0FFC', value: 'after_bonus', note: depth >= 1 ? (depth === 1 ? 'top of active stack' : 'next return') : 'outside active stack' },
			] });
			const r = record({ start, EIP: 'main', ESP: '0x1000', EAX: start, score: 'not stored yet', 'call depth': 0 });
			r.add(0, `Start with EAX = ${start} and ESP = 0x1000. Neither return slot is active yet.`);
			depth = 1;
			// The inner slot has not been written on the first call.
			r.add(1, 'The first call saves after_bonus at 0x0FFC, subtracts four from ESP, and enters add_bonus.', { EIP: 'add_bonus', ESP: '0x0FFC', 'call depth': depth }, { title: 'Saved return-address slots', cells: [
				{ label: '0x0FF8', value: 'not written yet', note: 'outside active stack' },
				{ label: '0x0FFC', value: 'after_bonus', note: 'top of active stack' },
			] });
			depth = 2;
			r.add(4, 'The nested call saves after_one at 0x0FF8. It does not overwrite the outer return address.', { EIP: 'add_one', ESP: '0x0FF8', 'call depth': depth }, mem());
			r.add(6, `add_one adds one: EAX becomes ${start + 1}. Both saved return addresses remain in their slots.`, { EAX: start + 1 }, mem());
			depth = 1;
			r.add(7, 'The inner ret takes after_one from the top and adds four to ESP. Popping releases the slot; it does not erase its bytes.', { EIP: 'after_one', ESP: '0x0FFC', 'call depth': depth }, mem());
			depth = 0;
			r.add(5, 'The outer ret takes after_bonus next. Execution returns to main, and ESP is back at 0x1000.', { EIP: 'after_bonus', ESP: '0x1000', 'call depth': depth }, mem());
			r.add(2, `main stores ${start + 1} to score. Returning did not undo the calculation.`, { score: start + 1 }, mem());
			r.add(8, `The result is ${start + 1}. Two calls returned in reverse order, and the stack pointer recovered its starting value.`, { EIP: 'done' }, mem());
			return r.steps;
		},
	},
	'original-bubbling': {
		title: 'The same gold write can have different callers',
		intro: 'Choose an action and a player. First execute the small model, then inspect the recorded path from the write toward its callers. Inspection does not run the purchase again.',
		code: [
			'dispatch(action, player, amount):',
			'  if action == Buy:',
			'    buy_item(player, amount)',
			'  else: pay_fine(player, amount)',
			'buy_item(player, price):',
			'  spend_gold(player, price)',
			'pay_fine(player, fine):',
			'  spend_gold(player, fine)',
			'spend_gold(player, amount):',
			'  if player.gold >= amount:',
			'    player.gold = player.gold - amount',
			'  return',
		],
		inputs: [select('action', 'Requested action', 'Buy', [['Buy', 'Buy item'], ['Fine', 'Pay fine']]), select('player', 'Player', 'Ada', [['Ada', 'Ada: 100 gold'], ['Bo', 'Bo: 40 gold']]), range('amount', 'Price or fine', 0, 100, 25)],
		run({ action, player, amount }) {
			const initial = player === 'Ada' ? 100 : 40;
			const handler = action === 'Buy' ? 'buy_item' : 'pay_fine';
			const handlerLine = action === 'Buy' ? 5 : 7;
			const r = record({ phase: 'execute', action, player, amount, gold: initial, focus: 'dispatch' });
			r.add(0, `${player} starts with ${initial} gold. The selected action is ${action === 'Buy' ? 'a purchase' : 'a fine payment'}, and its amount is ${amount}.`);
			r.add(action === 'Buy' ? 2 : 3, `dispatch selects ${handler} and passes this player and amount.`, { focus: handler });
			r.add(handlerLine, `${handler} calls the shared spend_gold helper. The caller gives the amount its meaning.`, { focus: 'spend_gold' });
			const accepted = initial >= amount;
			r.add(9, `${initial} >= ${amount} is ${accepted}. The comparison controls whether the write can run.`, { accepted });
			if (accepted) r.add(10, `The anchor writes ${initial} - ${amount} = ${initial - amount} to ${player}'s gold.`, { gold: initial - amount });
			else r.add(11, `The function returns without a write. ${player}'s gold stays ${initial}; this trial cannot trigger a breakpoint on line 11.`);
			r.add(8, 'Now inspect the recorded path. spend_gold identifies the affected player and subtraction, but the helper name alone does not identify the action.', { phase: 'inspect recorded callers' });
			r.add(handlerLine, `One level up, ${handler} explains why ${amount} was supplied: ${action === 'Buy' ? 'an item price' : 'a fine amount'}.`, { focus: handler });
			r.add(0, `Context: ${player} requested ${action === 'Buy' ? 'a purchase' : 'a fine payment'} for ${amount}; the check ${accepted ? 'accepted it' : 'rejected it'}, and gold ended at ${accepted ? initial - amount : initial}. Inspection changed no fields.`, { focus: 'dispatch' });
			return r.steps;
		},
	},
	'original-object-method': {
		title: 'The receiver selects which object the method changes',
		intro: 'This invented 32-bit layout puts health at base + 8. Choose an object and follow the same method body. The addresses and offsets are teaching values, not a game layout.',
		code: [
			'mov ecx, selected_base',
			'call damage',
			'jmp done',
			'damage: mov eax, [ecx+8]',
			'        sub eax, amount',
			'        mov [ecx+8], eax',
			'        ret',
			'done:   nop',
		],
		inputs: [select('target', 'Object receiving the call', 'Ada', [['Ada', 'Ada at 0x1000'], ['Bo', 'Bo at 0x2000']]), range('amount', 'Damage', 0, 50, 20)],
		run({ target, amount }) {
			const base = target === 'Ada' ? 0x1000 : 0x2000;
			const health = { Ada: 60, Bo: 50 };
			const mem = () => ({ title: 'One offset, different object bases', cells: [
				{ label: 'Ada: 0x1008', value: String(health.Ada), note: target === 'Ada' ? 'selected health field' : 'other instance' },
				{ label: 'Bo: 0x2008', value: String(health.Bo), note: target === 'Bo' ? 'selected health field' : 'other instance' },
			] });
			const r = record({ target, amount, ECX: hex(base), EAX: 'not loaded yet', 'field address': hex(base + 8), 'Ada.health': 60, 'Bo.health': 50 });
			r.add(0, `The caller supplies ${target}'s base, ${hex(base)}, in ECX for this simplified x86 member call.`, {}, mem());
			r.add(3, `The method reads ${hex(base)} + 8 = ${hex(base + 8)}. EAX receives ${health[target]}.`, { EAX: health[target] }, mem());
			const result = health[target] - amount;
			r.add(4, `Subtract ${amount}: the temporary register becomes ${result}. The field has not been stored yet.`, { EAX: result }, mem());
			health[target] = result;
			r.add(5, `Store ${result} through the same receiver-relative address. Only ${target}'s field changes.`, { [`${target}.health`]: result }, mem());
			r.add(7, `${target} has ${result} health; ${target === 'Ada' ? 'Bo still has 50' : 'Ada still has 60'}. Sharing a method and field offset did not share the field's storage.`, {}, mem());
			return r.steps;
		},
	},
	'original-displaced-replay': {
		title: 'Preserve the input, replay the displaced work once',
		intro: 'Choose a deliberate mistake to see its effect in a toy register model. This omits instruction relocation, flags, ABI details, threads, and patch bytes; the lesson below covers those contracts.',
		inputs: [range('gold', 'Starting gold', 0, 100, 100), range('bonus', 'Original bonus', 1, 10, 5), select('strategy', 'Trampoline behavior', 'correct', [['correct', 'Save register; replay once'], ['skip', 'Save register; skip replay'], ['twice', 'Save register; replay twice'], ['clobber', 'Change register; replay once']])],
		code({ strategy }) {
			const preserve = strategy !== 'clobber';
			return [
				'mov eax, [gold]', 'jmp observer',
				preserve ? 'observer: push eax' : 'observer: ; no save',
				'add eax, 10 ; temporary observer work',
				preserve ? 'pop eax' : '; no restore',
				strategy === 'skip' ? '; displaced add omitted' : 'add eax, bonus ; displaced operation',
				strategy === 'twice' ? 'add eax, bonus ; wrong second replay' : '; no second replay',
				'jmp continuation', 'continuation: mov [gold], eax',
			];
		},
		run({ gold, bonus, strategy }) {
			const preserve = strategy !== 'clobber';
			const r = record({ gold, bonus, EAX: gold, expected: gold + bonus, saved: 'none', strategy });
			r.add(0, `The original path would load ${gold}, add ${bonus} once, and store ${gold + bonus}.`);
			if (preserve) r.add(2, `Save the incoming EAX value, ${gold}, before temporary observer work.`, { saved: gold });
			let eax = gold + 10;
			r.add(3, `Temporary observer work changes EAX to ${eax}. That value must not leak into the original calculation.`, { EAX: eax });
			if (preserve) { eax = gold; r.add(4, `Restore EAX to ${gold}. Restoring this register has not yet performed the original bonus addition.`, { EAX: eax, saved: 'released' }); }
			if (strategy !== 'skip') { eax += bonus; r.add(5, `Replay the displaced addition once: EAX becomes ${eax}.`, { EAX: eax }); }
			else r.add(5, 'The displaced addition was omitted. Saving the register did not replace that missing game operation.');
			if (strategy === 'twice') { eax += bonus; r.add(6, `A second replay adds the bonus again, making EAX ${eax}.`, { EAX: eax }); }
			r.add(8, `Store ${eax}. ${eax === gold + bonus ? 'This matches the original result.' : `The original result should have been ${gold + bonus}; the selected mistake changed the computation.`}`, { gold: eax, matches: eax === gold + bonus });
			return r.steps;
		},
	},
	'original-bit-operations': {
		title: 'Change one byte, mask, or bit operation',
		intro: 'Start with AND, then compare setting, flipping, shifting, and rotating. The strip shows eight positions, most significant first; every result remains one unsigned byte.',
		inputs: [range('byte', 'Byte value', 0, 255, 5), range('mask', 'Mask value', 0, 255, 4), select('operation', 'Operation', 'and', [['and', 'AND: keep selected bits'], ['or', 'OR: set selected bits'], ['xor', 'XOR: flip selected bits'], ['not', 'NOT: flip all eight bits'], ['left', 'Shift left'], ['right', 'Shift right'], ['rotateLeft', 'Rotate left'], ['rotateRight', 'Rotate right']]), range('count', 'Shift or rotation count', 0, 7, 1)],
		code({ operation, byte, mask, count }) {
			const expression = { and: 'byte & mask', or: 'byte | mask', xor: 'byte ^ mask', not: '!byte', left: 'byte << count', right: 'byte >> count', rotateLeft: 'byte.rotate_left(count)', rotateRight: 'byte.rotate_right(count)' }[operation];
			return [`let byte: u8 = 0b${bits(byte)};`, `let mask: u8 = 0b${bits(mask)};`, `let count: u32 = ${count}; // 0..=7`, `let result: u8 = ${expression};`];
		},
		run({ byte, mask, operation, count }) {
			const results = { and: byte & mask, or: byte | mask, xor: byte ^ mask, not: (~byte) & 255, left: (byte << count) & 255, right: byte >>> count, rotateLeft: ((byte << count) | (byte >>> (8 - count))) & 255, rotateRight: ((byte >>> count) | (byte << (8 - count))) & 255 };
			const result = results[operation];
			const mem = (value, title) => ({ title, cells: Array.from({ length: 8 }, (_, i) => ({ label: `bit ${7 - i}: ${2 ** (7 - i)}`, value: String((value >>> (7 - i)) & 1) })) });
			const r = record({ byte, 'byte bits': bits(byte), mask, 'mask bits': bits(mask), count, operation, result: 'not computed yet' });
			r.add(0, `${byte} is ${bits(byte)}. Add the weights of its 1 positions to recover the decimal value.`, {}, mem(byte, 'Input byte: eight positions'));
			const usesMask = ['and', 'or', 'xor'].includes(operation);
			if (usesMask) r.add(1, `The mask is ${bits(mask)} (${mask}). Its 1 positions choose the bits this operation examines or changes.`, {}, mem(mask, 'Mask: selected positions'));
			const explanations = {
				and: 'AND keeps a position at 1 only when both input bits are 1.',
				or: 'OR makes a position 1 when either input bit is 1; mask 0 positions preserve the byte.',
				xor: 'XOR flips positions where the mask has 1 and preserves positions where it has 0.',
				not: 'NOT flips each of the eight u8 bits; the mask and count are not used.',
				left: `Shift left by ${count}: bits leaving the eight-bit width are discarded, and zeros enter on the right. The mask is not used.`,
				right: `Unsigned shift right by ${count}: low bits are discarded, and zeros enter on the left. The mask is not used.`,
				rotateLeft: `Rotate left by ${count}: bits leaving the left edge re-enter at the right. No bits are discarded. The mask is not used.`,
				rotateRight: `Rotate right by ${count}: bits leaving the right edge re-enter at the left. No bits are discarded. The mask is not used.`,
			};
			r.add(3, `${explanations[operation]} The result is ${bits(result)} = ${result}.`, { result, 'result bits': bits(result) }, mem(result, 'Result byte: same eight positions'));
			return r.steps;
		},
	},
	'original-vm-branch': {
		title: 'A recovery point and a second VM solve different problems',
		intro: 'Choose a snapshot, linked clone, or full clone, then follow one invented save-file change. This model runs in the page; it creates no virtual machine.',
		code: [
			'baseline: save_gold = 100',
			'choose snapshot, linked_clone, or full_clone',
			'prepare a separate test copy, if cloning',
			'test_copy.save_gold = changed_gold',
			'check baseline and disk dependencies',
			'restore the snapshot or reset the test copy',
		],
		inputs: [select('kind', 'Recovery choice', 'snapshot', [['snapshot', 'Snapshot: rewind one VM'], ['linked', 'Linked clone: separate writes, shared base'], ['full', 'Full clone: copied virtual disks']]), range('changed', 'Gold saved during the test', 0, 200, 75)],
		run({ kind, changed }) {
			const snapshot = kind === 'snapshot';
			const dependency = kind === 'linked' ? 'source base disks required' : kind === 'full' ? 'copied disks' : 'snapshot disk chain';
			const r = record({ choice: kind, changed, baseline: 100, test: 100, 'disk dependency': dependency, 'second VM': !snapshot });
			r.add(0, 'The known starting save records 100 gold. We want to compare a change against this starting condition.');
			r.add(2, snapshot ? 'A snapshot records a recovery point for this VM. It does not create a second machine for simultaneous comparison.' : kind === 'linked' ? 'A linked clone reads unchanged disk content from its source base and records its own changes in differencing disks.' : 'A full clone copies the dependent virtual disks for a second VM. Copied guest settings still need review.');
			r.add(3, snapshot ? `The same VM now saves ${changed}. Its recovery point still describes 100.` : `The clone saves ${changed}; the source VM's save remains 100 in this model.`, { test: changed });
			r.add(4, kind === 'linked' ? 'Separate writes do not remove the dependency on the source base disks. Deleting that base would make this clone unusable.' : kind === 'full' ? 'Copied disks remove this source-disk dependency. They do not automatically isolate networking or shared host folders.' : 'Restoring will rewind the same VM to the recovery point. It does not undo changes to an external shared folder.');
			r.add(5, `Reset returns the test save to 100. ${snapshot ? 'You have one VM at its recorded starting condition.' : 'Before running both VMs, check network adapter addresses, guest network settings, and host sharing separately.'}`, { test: 100 });
			return r.steps;
		},
	},
};
