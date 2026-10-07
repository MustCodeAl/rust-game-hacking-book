// Step-by-step code tracer (see components/CodeTrace.astro).
//
// Every trace is DATA in the TRACES map below, so adding one never touches the
// engine:
//
//   'my-trace': {
//     title, intro,                         // heading and one sentence of invitation
//     code: ['line 0', 'line 1', ...],      // <= 12 ASCII lines (or code(values) -> lines)
//     inputs: [                             // optional; each one re-runs the trace live
//       { id, label, type: 'range', min, max, step, value, show: v => '...' },
//       { id, label, type: 'select', value: 'a', options: [{ value: 'a', label: '...' }] },
//     ],
//     run(values) -> [ { line, vars: { name: value }, say, mem? } ],
//   }
//
// line   index into code[] that this step is executing (highlighted).
// vars   every variable's value AFTER the step. The engine compares each step with the
//        previous one and marks what changed (text tag + "was ..." + a short flash).
//        A name that has not appeared yet shows as "not set yet".
// say    one or two plain sentences: what this step did and why. Always visible.
// mem    optional row of boxes (bytes, array slots): { title, cells: [{ label, value, note? }] }.
//        Cells whose value differs from the previous step are tagged "changed".
//        A step without mem keeps the previous one.
//
// The first step must show the starting state, including every input, so the reader sees
// the example before touching anything. The last step's `say` should state the result
// (it is also the caption shown with JavaScript off). Nothing here is graded.


import { ORIGINAL_TRACES } from './original-traces.js';
import { HANDOFF_TRACES } from './handoff-traces.js';
import { SCENE_TRACES } from './scene-traces.js';
import { ASSEMBLY_TRACES } from './assembly-traces.js';
import { RUST_IDIOM_TRACES } from './rust-idiom-traces.js';

// Small syntax highlighter for lab code (Rust, Lua, Python-like, assembly).
function academyGuessLang(text) {
  if (/^\s*(?:[a-z_]\w*:\s*)?(mov|lea|push|pop|jmp|call|ret|cmp|add|sub|inc|dec|imul|idiv|test|nop|int3|movzx|movsx|shl|shr|sar|and|or|xor|not|movss|addss|mulss|cvtsi2ss|cvttss2si|comiss)\b(?:\s|$)/im.test(text)) return "asm";
  if (/\b(local|function|then|elseif)\b/.test(text) && !/\bfn\b|\blet\b/.test(text)) return "lua";
  if (/^\s*(def |for .* in .*:|#)/m.test(text) && !/[{};]/.test(text)) return "py";
  return "rust";
}
function academyHighlight(text, lang) {
  var KW = " fn let mut if else match return use struct enum impl for while in loop const pub as break continue local function end then elseif do not and or def import from mov lea push pop jmp call ret cmp add sub inc dec imul idiv test nop int3 movzx movsx shl shr sar xor movss addss mulss cvtsi2ss cvttss2si comiss ";
  var LIT = " true false nil None Some Ok Err self null True False ";
  var comment = lang === "lua" ? "--" : lang === "py" ? "#" : lang === "asm" ? ";" : "//";
  var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var span = function (k, s) { return '<span class="hl-' + k + '">' + esc(s) + "</span>"; };
  var out = "", i = 0, m;
  while (i < text.length) {
    var rest = text.slice(i);
    if (rest.indexOf(comment) === 0) { out += span("c", rest); break; }
    if ((m = /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/.exec(rest))) { out += span("s", m[0]); i += m[0].length; continue; }
    if (!/\w/.test(text.charAt(i - 1)) && (m = /^0x[0-9a-fA-F_]+|^\d[\d_.]*/.exec(rest))) { out += span("n", m[0]); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_]\w*/.exec(rest))) {
      var w = m[0], after = rest.charAt(w.length);
      var kind = KW.indexOf(" " + (lang === "asm" ? w.toLowerCase() : w) + " ") >= 0 ? "k" : LIT.indexOf(" " + w + " ") >= 0 ? "l" : after === "(" ? "f" : /^[A-Z]/.test(w) ? "t" : "";
      out += kind ? span(kind, w) : esc(w); i += w.length; continue;
    }
    out += esc(text.charAt(i)); i++;
  }
  return out;
}

const el = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
};

// ---------------------------------------------------------------- helpers
const hex = (n, width = 8) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(width, '0');
const hex2 = n => (n & 255).toString(16).toUpperCase().padStart(2, '0');
const fix2 = n => n.toFixed(2);
const plural = (n, one, many) => (n === 1 ? one : many);

function recorder() {
	const steps = [];
	const vars = {};
	const push = (line, say, change, mem) => {
		Object.assign(vars, change || {});
		steps.push({ line, vars: { ...vars }, say, mem });
	};
	return { steps, push };
}

// ---------------------------------------------------------------- traces
export const TRACES = {
  ...ORIGINAL_TRACES,
  ...SCENE_TRACES,
  ...ASSEMBLY_TRACES,
  ...RUST_IDIOM_TRACES,
  ...HANDOFF_TRACES,
  'rust-dash-branch': {
    title: 'A comparison chooses whether stamina changes',
    intro: 'Start with 12 stamina and a cost of 4. Change either input, then step through the path the comparison selects.',
    code: ['let mut stamina = start;', 'let cost = dash_cost;', 'if stamina >= cost {', '    stamina -= cost;', '} else {', '    println!("Rest first");', '}'],
    inputs: [
      { id: 'start', label: 'Starting stamina', type: 'range', min: 0, max: 16, step: 1, value: 12 },
      { id: 'dash_cost', label: 'Dash cost', type: 'range', min: 1, max: 8, step: 1, value: 4 },
    ],
    run({ start, dash_cost }) {
      const { steps, push } = recorder();
      push(0, `The runner starts with ${start} stamina. This binding can change because it uses mut.`, { start, dash_cost, stamina: start });
      push(1, `This dash costs ${dash_cost}. Naming the cost does not spend it.`, { cost: dash_cost });
      const fits = start >= dash_cost;
      push(2, `${start} >= ${dash_cost} is ${fits}. Only the selected branch runs.`, { can_dash: fits });
      if (fits) push(3, `The check passed, so subtract ${dash_cost} and store ${start - dash_cost}.`, { stamina: start - dash_cost, path: 'dash' });
      else push(5, 'The cost is too high. Print the message and leave stamina unchanged.', { path: 'rest' });
      push(6, `The branch ends with ${fits ? start - dash_cost : start} stamina. ${fits ? 'The guarded subtraction spent the cost.' : 'No subtraction ran on the failed path.'}`);
      return steps;
    },
  },
  'rust-dash-loop': {
    title: 'The next attempt uses the amount left by the previous one',
    intro: 'The costs are 4, 10, and 2. Step through the worked example, then change the starting amount to see which attempts fit.',
    code: ['let mut stamina = start;', 'for cost in [4_u32, 10, 2] {', '    if stamina >= cost {', '        stamina -= cost;', '    }', '}', '// the loop has finished'],
    inputs: [{ id: 'start', label: 'Starting stamina', type: 'range', min: 0, max: 16, step: 1, value: 12 }],
    run({ start }) {
      const { steps, push } = recorder();
      let stamina = start;
      const costs = [4, 10, 2];
      const memory = (current) => ({ title: 'Three costs visited in order', cells: costs.map((cost, i) => ({ label: 'attempt ' + (i + 1), value: String(cost), note: i === current ? 'current cost' : '' })) });
      push(0, `Begin with ${stamina} stamina. A new pass does not reset this binding.`, { start, stamina }, memory(-1));
      costs.forEach((cost, i) => {
        push(1, `Pass ${i + 1} takes cost ${cost} from the collection.`, { cost, attempt: i + 1 }, memory(i));
        const fits = stamina >= cost;
        push(2, `${stamina} >= ${cost} is ${fits}. Test the amount remaining now.`, { can_dash: fits });
        if (fits) { stamina -= cost; push(3, `Spend ${cost}; ${stamina} stamina remains.`, { stamina }); }
        else push(4, `Skip this subtraction because ${cost} is more than ${stamina}. The loop still visits the next cost.`);
      });
      push(6, `All three costs have been visited. The final stamina is ${stamina}.`, {}, memory(-1));
      return steps;
    },
  },
  'rust-checked-option': {
    title: 'Some zero is different from no answer',
    intro: 'The default stamina equals the cost. Step through Some(0), then lower stamina to see the None path.',
    code: ['let remaining = stamina.checked_sub(cost);', 'match remaining {', '    Some(left) => println!("Left: {left}"),', '    None => println!("Not enough stamina"),', '}'],
    inputs: [
      { id: 'stamina', label: 'Available stamina', type: 'range', min: 0, max: 12, step: 1, value: 4 },
      { id: 'cost', label: 'Requested cost', type: 'range', min: 0, max: 8, step: 1, value: 4 },
    ],
    run({ stamina, cost }) {
      const { steps, push } = recorder();
      push(0, `Ask for ${stamina} minus ${cost} without allowing an unsigned underflow.`, { stamina, cost });
      const fits = stamina >= cost;
      const remaining = fits ? `Some(${stamina - cost})` : 'None';
      push(0, fits ? `The answer fits, so checked_sub returns ${remaining}. Zero is a valid number.` : 'The mathematical answer is below zero. checked_sub returns None instead of wrapping.', { remaining });
      push(1, `match selects the arm for the ${fits ? 'Some' : 'None'} shape.`);
      if (fits) push(2, `The Some arm names the number left and prints ${stamina - cost}.`, { left: stamina - cost, output: `Left: ${stamina - cost}` });
      else push(3, 'The None arm has no number to unwrap. It prints a message.', { output: 'Not enough stamina' });
      push(4, fits ? `The result is ${remaining}; the caller can use the stored number.` : 'The result is None; the caller handles the missing answer explicitly.');
      return steps;
    },
  },

	// Lesson 1.9: what Next Scan does to the candidate list.
	'scan-narrowing': {
		title: 'What Next Scan does with each candidate',
		intro: 'Three addresses held 100 at the first scan, then you recruited a unit. Step through how Next Scan keeps or drops each one. Try changing the gold the screen shows after the purchase, even back to 100.',
		code: [
			'candidates = [A, B, C]  # every address that held 100',
			'# you recruit a unit; the screen now shows new_gold',
			'kept = []',
			'for addr in candidates:',
			'    now = read_4_bytes(addr)',
			'    if now == new_gold:',
			'        kept.append(addr)  # keep it',
			'  # otherwise it is dropped',
			'candidates = kept',
		],
		inputs: [{ id: 'gold', label: 'Gold on screen after the purchase', type: 'range', min: 70, max: 100, step: 1, value: 85, show: v => String(v) }],
		run({ gold }) {
			const { steps, push } = recorder();
			const names = ['A', 'B', 'C'];
			const mem = (values, now) => ({
				title: 'The four bytes at each candidate, read as a number',
				cells: names.map((label, i) => ({ label: 'address ' + label, value: String(values[i]), note: now === i ? 'reading now' : '' })),
			});
			const before = [100, 100, 100];
			const after = [100, gold, gold];
			push(0, 'The first scan for 100 left three candidates. Each one only proved that its four bytes read as 100 at that moment.', { candidates: 'A, B, C' }, mem(before));
			push(1, gold === 100
				? 'You act in the game, but the screen still shows 100, so nothing changed in memory. Keep that in mind for the end.'
				: `The screen now shows ${gold}. B and C changed with it, but A, which only happened to be 100, did not.`, { new_gold: gold }, mem(after));
			push(2, 'Start an empty list for the addresses that survive.', { kept: '(empty)' });
			const kept = [];
			after.forEach((value, i) => {
				const name = names[i];
				push(3, `Take the next candidate: ${name}.`, { addr: name }, mem(after, i));
				push(4, `Read the four bytes at ${name} right now. They read as ${value}.`, { now: value }, mem(after, i));
				if (value === gold) {
					kept.push(name);
					push(6, `${value} equals ${gold}, so ${name} stays in the list.`, { kept: kept.join(', ') }, mem(after, i));
				} else {
					push(7, `${value} does not equal ${gold}, so ${name} is dropped. Its value did not follow the gold.`, {}, mem(after, i));
				}
			});
			const end = kept.length === 3
				? 'All three survive, because nothing changed in the game, so the scan learned nothing. A change you cause is what separates the real gold from numbers that merely equal it.'
				: `Next Scan leaves ${kept.join(' and ')}. Both followed the gold, so one may be the field and the other a copy for the screen. Repeat with a different change to tell them apart.`;
			push(8, end, { candidates: kept.join(', ') }, mem(after));
			return steps;
		},
	},

	// Lesson 2.5: one subtract instruction as a state transition.
	'sub-instruction': {
		title: 'One instruction, step by step: sub dword ptr [esi+30h], eax',
		intro: 'This is the instruction that changes gold, split into the steps the CPU performs. Try changing the price in eax and watch the four bytes and the flags.',
		code: [
			'; sub dword ptr [esi+30h], eax',
			'address = esi + 0x30',
			'old     = read_u32(address)',
			'new     = old - eax  ; low 32 bits',
			'write_u32(address, new)',
			'flags   = ZF, SF, CF, OF from this result',
		],
		inputs: [{ id: 'price', label: 'Price in eax', type: 'range', min: 0, max: 130, step: 1, value: 15, show: v => `${v} gold` }],
		run({ price }) {
			const { steps, push } = recorder();
			const esi = 0x0A3C1200;
			const address = esi + 0x30;
			const old = 100;
			const result = (old - price) >>> 0;
			const signed = result | 0;
			const flag = { ZF: result === 0 ? 1 : 0, SF: result >>> 31, CF: old < price ? 1 : 0, OF: ((old ^ price) & (old ^ result)) >>> 31 };
			const bytes = value => ({
				title: `The four bytes at ${hex(address)} to ${hex(address + 3)}, lowest address first`,
				cells: [0, 1, 2, 3].map(i => ({ label: '\u2026' + hex(address + i).slice(-4), value: hex2(value >>> (8 * i)) })),
			});
			push(0, `Before it runs: esi holds ${hex(esi)} and eax holds the price, ${price}. The four bytes at ${hex(address)} hold the gold, 100, stored lowest byte first as 64 00 00 00.`, { esi: hex(esi), eax: String(price) }, bytes(old));
			push(1, `Brackets mean an address calculation first: ${hex(esi)} + 0x30 = ${hex(address)}. Nothing is read yet.`, { address: hex(address) });
			push(2, `Now read the four bytes at ${hex(address)} as one number: 0x64 = 100.`, { old: String(old) });
			push(3, price <= old
				? `Subtract the price: 100 - ${price} = ${result}. The result is held in the CPU and has not touched memory yet.`
				: `Subtract the price: 100 - ${price} is below zero, so the 32-bit result wraps around to ${result} (${hex(result)}). Read as a signed number it is ${signed}.`,
			{ new: price <= old ? String(result) : `${hex(result)} (${signed} if signed)` });
			push(4, `Store the result back to the same four bytes. They now read ${[0, 1, 2, 3].map(i => hex2(result >>> (8 * i))).join(' ')}.`, {}, bytes(result));
			const reads = [];
			if (flag.ZF) reads.push('ZF is 1, so a following je would be taken');
			if (flag.CF) reads.push('CF is 1 because the unsigned subtraction had to borrow');
			if (flag.SF) reads.push('SF is 1 because the top bit of the result is set');
			push(5, `The flags are set from the result: ZF (zero) ${flag.ZF}, SF (top bit) ${flag.SF}, CF (borrow) ${flag.CF}, OF (signed overflow) ${flag.OF}. ${reads.length ? reads.join('; ') + '. ' : ''}Later conditional jumps read these flags, not the stored gold, so a patch that removes this instruction removes them too.`,
			{ flags: `ZF=${flag.ZF} SF=${flag.SF} CF=${flag.CF} OF=${flag.OF}` });
			return steps;
		},
	},

	// Lesson 2.6: a comparison chain that dispatches menu actions.
	'menu-dispatch': {
		title: 'A comparison chain choosing a menu action',
		intro: 'Each comparison asks one question about the number in eax, and the first yes picks the branch. Try the three values to see which destination each one reaches.',
		code: [
			'cmp eax, 3  ; MENU_RECRUIT?',
			'je  handle_recruit',
			'cmp eax, 5  ; MENU_DESCRIPTION?',
			'je  show_description',
			'cmp eax, MENU_CANCEL  ; ...and so on down the chain',
			'je  close_menu',
		],
		inputs: [{
			id: 'action', label: 'Menu action the player chose', type: 'select', value: '3',
			options: [
				{ value: '3', label: 'Recruit (compared value 3)' },
				{ value: '5', label: 'Terrain description (compared value 5)' },
				{ value: '9', label: 'Some other number (9)' },
			],
		}],
		run({ action }) {
			const value = Number(action);
			const { steps, push } = recorder();
			const names = { 3: 'Recruit', 5: 'Terrain description' };
			const target = { 3: '0x00CCA140 (handle_recruit)', 5: '0x00CCAF20 (show_description)' };
			push(0, `The menu code has put the chosen action's number, ${value}, in eax. The comparison chain starts.`, { eax: String(value) });
			push(0, value === 3 ? 'cmp eax, 3 subtracts without storing and records the result in the flags. 3 - 3 is 0, so the zero flag becomes 1.' : `cmp eax, 3 compares ${value} with 3. They differ, so the zero flag becomes 0.`, { ZF: value === 3 ? 1 : 0 });
			if (value === 3) {
				push(1, 'je means jump if equal, which reads ZF = 1. It is 1, so the jump is taken and the next instruction run is at the Recruit handler.', { next: target[3] });
				push(1, 'This one run gave you a pairing: the number 3 leads to the Recruit handler. Naming it is your model of the code, not something the program says.', { your_name: 'MenuAction::Recruit = 3' });
				return steps;
			}
			push(1, 'ZF is 0, so je is not taken and execution falls through to the next comparison.', { next: 'the next instruction (cmp eax, 5)' });
			push(2, value === 5 ? 'cmp eax, 5 gives 5 - 5 = 0, so ZF becomes 1.' : `cmp eax, 5 compares ${value} with 5. They differ, so ZF stays 0.`, { ZF: value === 5 ? 1 : 0 });
			if (value === 5) {
				push(3, 'ZF is 1, so this je is taken, to a different handler than Recruit. Same chain, different constant, different target.', { next: target[5] });
				push(3, 'Now two experiments give two pairings: 3 for Recruit, 5 for Terrain description. The addresses belong to one run of one build; the shape carries over.', { your_name: 'MenuAction::TerrainDescription = 5' });
				return steps;
			}
			push(3, 'ZF is 0 again, so this je is not taken either.', { next: 'the next instruction (cmp eax, MENU_CANCEL)' });
			push(4, 'The chain moves on to the next constant, MENU_CANCEL. This lesson does not give that constant, so the trace stops here. A real chain keeps comparing until one matches or it runs out of tests.', {});
			return steps;
		},
	},

	// Lesson 2.10: the round trip through a detour, and what each mistake does.
	'detour-roundtrip': {
		title: 'One trip through a detour',
		intro: 'The game reaches the hook site, jumps into your cave and has to come back with the state it expects. Run the lesson\'s order first, then try the two mistakes in the menu. The register values are made up for the example; the hook address and bytes are the lesson\'s.',
		code(v) {
			const lines = ['hook:  jmp cave  ; 6 bytes: jmp + nop padding'];
			if (v.cave === 'norestore') lines.push('cave:  mov ecx, 1  ; added behaviour borrows ecx');
			else lines.push('cave:  push ecx  ; save what we will change', '       mov ecx, 1  ; added behaviour borrows ecx', '       pop ecx  ; restore it');
			if (v.cave !== 'noreplay') lines.push('       mov eax, [ecx]  ; replay displaced instruction', '       lea esi, [esi+0]  ; replay displaced instruction');
			lines.push('       jmp 0x00CCAF90  ; first untouched instruction');
			return lines;
		},
		inputs: [{
			id: 'cave', label: 'What the cave does', type: 'select', value: 'good',
			options: [
				{ value: 'good', label: 'The lesson\'s order: save, restore, replay' },
				{ value: 'norestore', label: 'Borrows ecx and never restores it' },
				{ value: 'noreplay', label: 'Forgets to replay the displaced code' },
			],
		}],
		run({ cave }) {
			const { steps, push } = recorder();
			const code = TRACES['detour-roundtrip'].code({ cave });
			const at = text => code.findIndex(line => line.includes(text));
			const site = () => ({
				title: 'The six bytes now at the hook site, 0x00CCAF8A to 0x00CCAF8F (.. is the distance to the cave)',
				cells: ['E9', '..', '..', '..', '..', '90'].map((value, i) => ({ label: '\u2026' + hex(0x00CCAF8A + i).slice(-4), value, note: ['jmp', 'to cave', 'to cave', 'to cave', 'to cave', 'nop'][i] })),
			});
			push(0, 'The game reaches 0x00CCAF8A. The six bytes there used to be 8B 01 8D 74 26 00, which is mov eax,[ecx] (2 bytes) plus an alignment lea (4 bytes). Now they hold a jump to the cave and a nop, so the CPU goes to the cave instead.',
				{ ip: '0x00CCAF8A', ecx: hex(0x0A3C1000), eax: '0x00000000 (old value)', stack: 'empty' }, site());
			if (cave !== 'norestore') push(at('push ecx'), 'The cave first saves ecx on the stack, because the added code is about to change it and the game still needs it.', { ip: 'in the cave', stack: `ecx (${hex(0x0A3C1000)})` });
			push(at('mov ecx, 1'), 'The added behaviour uses ecx as scratch space and sets it to 1. This is the "something our code changes" the lesson warns about.', { ip: 'in the cave', ecx: hex(1) });
			if (cave !== 'norestore') push(at('pop ecx'), 'Restore ecx from the stack. The stack is empty again, so the game\'s stack pointer is back where it was.', { ecx: hex(0x0A3C1000), stack: 'empty' });
			if (cave === 'norestore') {
				push(at('replay displaced instruction'), 'Nothing put ecx back, so the replayed mov eax,[ecx] reads from address 0x00000001 instead of the game object at 0x0A3C1000. That address is not readable, so the game would fault here. Choose the first menu option to compare.', { ip: 'in the cave' });
				return steps;
			}
			if (cave === 'noreplay') {
				push(at('jmp 0x'), 'The cave jumps back to 0x00CCAF90, the first untouched instruction. The mov eax,[ecx] that used to run was never replayed, so eax still holds the old 0x00000000. Everything looks fine until later code uses eax.', { ip: '0x00CCAF90' });
				return steps;
			}
			push(at('mov eax'), 'Replay the first displaced instruction exactly once: mov eax,[ecx] reads the value at 0x0A3C1000, which is 7, into eax. The game gets the value it would have got without the detour.', { eax: '0x00000007' });
			push(at('lea'), 'Replay the second displaced instruction. This lea only pads alignment and changes nothing, but it must still be replayed so the byte count adds up.', {});
			push(at('jmp 0x'), 'Jump to 0x00CCAF90, which is 0x00CCAF8A + 6, the first byte after the displaced instructions. The game continues with ecx, eax and the stack exactly as if the detour had never been there.', { ip: '0x00CCAF90' });
			return steps;
		},
	},

	// Lesson 4.1: the fixed-timestep accumulator, with the lesson's three frames.
	'fixed-timestep': {
		title: 'A game loop turning frames into fixed steps',
		intro: 'Frames arrive at uneven times, but the rules advance in equal 16.67 ms steps. Step through the lesson\'s three frames, then try a different length for frame 3.',
		code: [
			'STEP = 1000 / 60;  waiting = 0  # ms of game time per step',
			'each frame, real_ms has passed:',
			'    waiting = waiting + real_ms',
			'    while waiting >= STEP:',
			'        run_one_step()  # rules advance by STEP',
			'        waiting = waiting - STEP',
			'    draw()  # blend by what is left',
		],
		inputs: [{ id: 'third', label: 'Real time of frame 3', type: 'range', min: 5, max: 60, step: 1, value: 30, show: v => `${v} ms` }],
		run({ third }) {
			const { steps, push } = recorder();
			const STEP = 1000 / 60;
			const frames = [20, 20, third];
			let waiting = 0;
			let ran = 0;
			push(0, 'One rules step is 1000 / 60 = 16.67 ms of game time. Nothing is waiting to be simulated yet.', { STEP: fix2(STEP) + ' ms', waiting: '0.00 ms', steps_run: 0 });
			frames.forEach((ms, f) => {
				const before = waiting;
				waiting += ms;
				push(2, `Frame ${f + 1} arrives ${fix2(ms)} ms after the last one. Add it to the time already waiting: ${fix2(before)} + ${fix2(ms)} = ${fix2(waiting)} ms.`, { frame: f + 1, real_ms: fix2(ms) + ' ms', waiting: fix2(waiting) + ' ms' });
				let perFrame = 0;
				while (waiting + 1e-9 >= STEP) {
					push(3, `${fix2(waiting)} is at least ${fix2(STEP)}, so there is a whole step to run.`, {});
					ran += 1;
					perFrame += 1;
					push(4, `Run the rules for one step. That is ${ran} ${plural(ran, 'step', 'steps')} so far, which is ${fix2(ran * STEP)} ms of game time.`, { steps_run: ran, game_time: fix2(ran * STEP) + ' ms' });
					const left = waiting - STEP;
					push(5, `Take that step's time out of the waiting pile: ${fix2(waiting)} - ${fix2(STEP)} = ${fix2(Math.max(left, 0))} ms.`, { waiting: fix2(Math.max(left, 0)) + ' ms' });
					waiting = Math.max(left, 0);
				}
				push(3, `${fix2(waiting)} is less than ${fix2(STEP)}, so no more whole steps fit in this frame.${perFrame === 0 ? ' This frame ran no step at all.' : ''}`, {});
				const blend = Math.round((waiting / STEP) * 100);
				push(6, `Draw the frame. ${fix2(waiting)} ms is still waiting, which is ${blend}% of the way to the next step, so many engines blend the last two steps by that fraction.`, { blend: blend + '%' });
			});
			const total = frames.reduce((a, b) => a + b, 0);
			steps[steps.length - 1].say = `After ${fix2(total)} ms of real time the game ran ${ran} ${plural(ran, 'step', 'steps')}, which is ${fix2(ran * STEP)} ms of game time, with ${fix2(waiting)} ms waiting. ${fix2(ran * STEP)} + ${fix2(waiting)} = ${fix2(ran * STEP + waiting)} ms, so no time was lost.`;
			return steps;
		},
	},

	// Lesson 4.8: the nearest-enemy decision as a plain loop.
	'nearest-enemy': {
		title: 'Choosing the nearest valid enemy',
		intro: 'The lesson\'s iterator chain, unrolled as a plain loop so you can see each decision. The player is at (0, 0). Try a garbage reading, a NaN, or an empty list.',
		code: [
			'let mut best = None;',
			'let mut best_d = f32::MAX;',
			'for e in enemies {',
			'    if !e.is_reasonable() { continue; }',
			'    let d = player.distance_to(e);',
			'    if d < best_d { best = Some(e); best_d = d; }',
			'}',
			'best',
		],
		inputs: [{
			id: 'enemies', label: 'Enemy list read from the game', type: 'select', value: 'lesson',
			options: [
				{ value: 'lesson', label: 'The lesson\'s two: (3, 4) and (1, 0)' },
				{ value: 'huge', label: 'Plus a third with a garbage x of 1000000' },
				{ value: 'nan', label: 'Plus a third whose x read as NaN' },
				{ value: 'empty', label: 'An empty list' },
			],
		}],
		run({ enemies }) {
			const { steps, push } = recorder();
			const list = { lesson: [[3, 4], [1, 0]], huge: [[3, 4], [1, 0], [1000000, 0]], nan: [[3, 4], [1, 0], [NaN, 0]], empty: [] }[enemies];
			const show = p => `(${Number.isNaN(p[0]) ? 'NaN' : p[0]}, ${p[1]})`;
			const reasonable = p => Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) < 100000 && Math.abs(p[1]) < 100000;
			push(0, `The player is at (0, 0) and the list holds ${list.length} ${plural(list.length, 'enemy', 'enemies')}${list.length ? ': ' + list.map(show).join(', ') : ''}. Nothing has been chosen yet, so best starts as None.`, { enemies: list.length ? list.map(show).join(' ') : '(empty list)', best: 'None' });
			push(1, 'best_d holds the shortest distance seen so far. It starts as the largest possible f32 so that the first valid enemy always beats it.', { best_d: 'f32::MAX' });
			let best = null;
			let bestD = Infinity;
			list.forEach(p => {
				push(2, `Take the next enemy, ${show(p)}.`, { e: show(p) });
				if (!reasonable(p)) {
					push(3, `${show(p)} is not reasonable: ${Number.isNaN(p[0]) ? 'NaN is not a finite number' : 'its x is far beyond the 100000 limit'}. The loop skips it and never measures a distance, so it cannot poison the comparison.`, { is_reasonable: 'false' });
					return;
				}
				push(3, `${show(p)} passes the plausibility check: both coordinates are finite and under 100000.`, { is_reasonable: 'true' });
				const d = Math.hypot(p[0], p[1]);
				push(4, `Distance from (0, 0): sqrt(${p[0]}*${p[0]} + ${p[1]}*${p[1]}) = sqrt(${p[0] * p[0] + p[1] * p[1]}) = ${d}.`, { d: String(d) });
				if (d < bestD) {
					best = p;
					bestD = d;
					push(5, `${d} is smaller than the best distance so far, so ${show(p)} becomes the best.`, { best: `Some(${show(p)})`, best_d: String(d) });
				} else {
					push(5, `${d} is not smaller than ${bestD}, so the best enemy stays ${show(best)}.`, {});
				}
			});
			push(7, best
				? `The loop is over, so the answer is Some(${show(best)}), the enemy ${bestD} unit${bestD === 1 ? '' : 's'} away. Only coordinates that passed the check were ever compared.`
				: 'Nothing valid was found, so the answer is None. Returning None is better than inventing a target.', {});
			return steps;
		},
	},

	// Lesson 5.7: the life of one software breakpoint.
	'breakpoint-cycle': {
		title: 'The two-step life of a software breakpoint',
		intro: 'A breakpoint is more than one changed byte. Follow the bytes and the debugger\'s state through one hit, then try an int3 the debugger did not set.',
		code: [
			'orig = read_byte(addr)  # set the breakpoint',
			'write_byte(addr, 0xCC)  # int3 replaces the first byte',
			'# the game reaches addr; the CPU raises int3',
			'if exception_addr not in map: pass it on',
			'write_byte(addr, orig)  # put the real byte back',
			'ip = ip - 1  # int3 was 1 byte long',
			'trap_flag = 1  # stop after ONE instruction',
			'# the instruction runs; single-step exception',
			'write_byte(addr, 0xCC)  # re-arm',
			'trap_flag = 0  # continue the game',
		],
		inputs: [{
			id: 'who', label: 'Who raised the int3?', type: 'select', value: 'ours',
			options: [
				{ value: 'ours', label: 'Our breakpoint (address is in our map)' },
				{ value: 'other', label: 'An int3 the game itself contains' },
			],
		}],
		run({ who }) {
			const { steps, push } = recorder();
			const addr = 0x00A31000;
			const original = ['29', '46', '30'];
			const cells = (bytes, ip) => ({
				title: `Example bytes at ${hex(addr)} (sub dword ptr [esi+30h], eax is 29 46 30)`,
				cells: bytes.map((value, i) => ({ label: '\u2026' + hex(addr + i).slice(-4), value, note: ip === i ? 'ip points here' : '' })),
			});
			push(0, `To set a breakpoint at ${hex(addr)} the debugger first reads the byte there, 0x29, and remembers it in its map. Without that saved byte it could never run the real instruction.`, { addr: hex(addr), orig: '0x29', phase: 'Disabled' }, cells(original));
			push(1, 'It overwrites that one byte with 0xCC, the one-byte int3 instruction. The rest of the instruction is untouched. The breakpoint is now armed.', { phase: 'Armed' }, cells(['CC', '46', '30']));
			if (who === 'other') {
				push(2, `The game executes an int3 of its own at ${hex(0x00A31200)}, an address the debugger never touched. The CPU raises the same exception either way, so the exception code alone does not say who set it.`, { exception_addr: hex(0x00A31200) });
				push(3, `${hex(0x00A31200)} is not in the breakpoint map, so this one is not ours. The debugger passes the exception on unhandled and leaves our bytes alone. Choose "Our breakpoint" to see the full cycle.`, {});
				return steps;
			}
			push(2, 'The game reaches the breakpoint. The CPU executes the 0xCC byte, which raises int3, and the debugger gets a debug event. The CPU has already moved ip past that one byte.', { exception_addr: hex(addr), ip: hex(addr + 1) }, cells(['CC', '46', '30'], 1));
			push(3, `${hex(addr)} is in the map, so this breakpoint is ours and the debugger handles it.`, {});
			push(4, 'Restore the original byte, 0x29, so the real instruction is whole again. The breakpoint is disarmed for exactly this one run of it.', { phase: 'SteppingOriginal' }, cells(original, 1));
			push(5, 'Move ip back one byte. It had stepped past the int3, but the instruction that should run is the real one, which starts at the breakpoint address.', { ip: hex(addr) }, cells(original, 0));
			push(6, 'Set the CPU\'s trap flag, so the CPU raises a single-step exception after exactly one instruction. Then the debugger continues the game.', { trap_flag: 1 });
			push(7, 'The real instruction runs once. Because of the trap flag, the CPU immediately raises a single-step exception and the debugger regains control.', { ip: hex(addr + 3) }, cells(original));
			push(8, 'Put 0xCC back so the breakpoint fires next time too. This second step is why a breakpoint has state and is not just a changed byte.', { phase: 'Armed' }, cells(['CC', '46', '30']));
			push(9, 'Clear the trap flag and let the game run freely. The cycle ends where it began: armed, with the original byte safely in the map.', { trap_flag: 0 });
			return steps;
		},
	},

	// Lesson 5.9: starting a trace creates system state that must be cleaned up.
	'etw-cleanup': {
		title: 'Starting a trace, and cleaning up when something fails',
		intro: 'Starting a recording creates system state that outlives the helper program. Follow it through a normal run, then try making a step fail.',
		code: [
			'run_wpr("-start", "GeneralProfile")  # recording begins',
			'print("Press Enter to stop.")',
			'if read_line() fails:',
			'    run_wpr("-cancel")  # best effort',
			'    return Err("trace was cancelled")',
			'stop = run_wpr("-stop", "gha-game.etl")',
			'if stop fails: run_wpr("-cancel")',
			'print("Saved gha-game.etl")',
		],
		inputs: [{
			id: 'fail', label: 'What happens', type: 'select', value: 'none',
			options: [
				{ value: 'none', label: 'You press Enter and everything works' },
				{ value: 'read', label: 'Reading Enter fails' },
				{ value: 'stop', label: 'Stopping the recording fails' },
			],
		}],
		run({ fail }) {
			const { steps, push } = recorder();
			push(0, 'wpr.exe is asked to start recording with the GeneralProfile. WPR is a separate program that keeps recording after this command returns, so the recorder is now running as system state.', { recorder: 'running', etl_file: 'none yet' });
			push(1, 'The helper tells you to exercise the game and press Enter. The recording runs while you do.', {});
			if (fail === 'read') {
				push(2, 'Reading from the terminal fails, for example because the input stream closed. The helper cannot wait for Enter any more.', { read_line: 'failed' });
				push(3, 'It asks WPR to cancel. Without this call the recorder would keep running after the helper exits, filling a buffer nobody will save. The result is ignored on purpose: the read error is the more useful thing to report.', { recorder: 'cancelled' });
				push(4, 'It returns the original error, so you learn that the trace was cancelled and why. No .etl file was written, and nothing is left running.', { etl_file: 'none' });
				return steps;
			}
			push(2, 'Reading Enter works. You pressed Enter, so the helper moves on to stop the recording.', { read_line: 'ok' });
			if (fail === 'stop') {
				push(5, 'wpr.exe -stop fails, for example because the file could not be written. The recorder may still be running.', { stop: 'failed' });
				push(6, 'The helper cancels the recording, so a failed stop does not leave a recorder behind. Then it reports the stop error.', { recorder: 'cancelled', etl_file: 'none' });
				return steps;
			}
			push(5, 'wpr.exe -stop writes everything captured to gha-game.etl and ends the recording.', { stop: 'ok', recorder: 'stopped', etl_file: 'gha-game.etl saved' });
			push(7, 'The helper reports the saved file. Open it in Windows Performance Analyzer. Every path above ended with the recorder not running, and cleanup is part of correctness.', {});
			return steps;
		},
	},

	// Lesson 6.1: how a caller reads a function's return value.
	'call-site': {
		title: 'Reading a call site: what the caller does with the result',
		intro: 'These four instructions call gha_start and branch on what it returns. Try different return values and watch which way the branch goes.',
		code: [
			'xor ecx, ecx',
			'call qword ptr [gha_start]',
			'test eax, eax',
			'jne start_failed',
			'; zero: the success path continues here',
		],
		inputs: [{ id: 'result', label: 'Value gha_start returns in eax', type: 'range', min: 0, max: 9, step: 1, value: 0, show: v => String(v) }],
		run({ result }) {
			const { steps, push } = recorder();
			push(0, 'xor ecx, ecx exclusive-ors a register with itself, which always gives zero. The caller is putting zero in the first argument register.', { ecx: '0 (first argument)' });
			push(1, `call goes through the import slot to gha_start and runs it. The function leaves its return value in eax; here it is ${result}.`, { eax: String(result) });
			push(2, result === 0
				? 'test eax, eax combines eax with itself and records the outcome in the flags without changing eax. Zero gives ZF = 1.'
				: `test eax, eax combines eax with itself and records the outcome in the flags without changing eax. ${result} is not zero, so ZF = 0.`, { ZF: result === 0 ? 1 : 0 });
			if (result === 0) {
				push(3, 'jne jumps if not equal, which reads ZF = 0. ZF is 1, so the jump is not taken.', {});
				push(4, 'Execution falls through to the success path. From this one call site you can write the tentative contract: zero in the first argument, zero back for success.', {});
			} else {
				push(3, 'jne reads ZF = 0 and jumps. The caller treats any nonzero result as failure and goes to start_failed.', { next: 'start_failed' });
			}
			return steps;
		},
	},

	// Lesson 6.3: every step of the loader can fail and must clean up.
	'loader-cleanup': {
		title: 'Every step can fail, and cleanup still happens',
		intro: 'The loader owns a block of memory in another process. Follow it through a clean run, then make a different step fail and see what still gets released. The addresses are made up for the example.',
		code: [
			'let process = open_process(pid)?;',
			'let addr = VirtualAllocEx(process, path_len);',
			'ensure!(!addr.is_null(), "VirtualAllocEx failed");',
			'let remote = RemoteAllocation { process, addr };',
			'process.write_exact(addr, path_bytes)?;',
			'let load = GetProcAddress(kernel32, "LoadLibraryW")?;',
			'let thread = CreateRemoteThread(process, load, addr)?;',
			'let module = wait_for_thread(&thread)?;',
			'ensure!(module != 0, "LoadLibraryW returned null");',
			'// scope ends: remote is dropped, VirtualFreeEx runs',
		],
		inputs: [{
			id: 'fail', label: 'Which step fails?', type: 'select', value: 'none',
			options: [
				{ value: 'none', label: 'None: every step succeeds' },
				{ value: 'alloc', label: 'The allocation returns null' },
				{ value: 'write', label: 'Writing the path fails' },
				{ value: 'null', label: 'LoadLibraryW returns null' },
			],
		}],
		run({ fail }) {
			const { steps, push } = recorder();
			const addr = '0x01F40000';
			push(0, 'The loader opens the exact game process by id. Everything after this needs that handle, and it is closed when the function ends.', { process: 'open', remote_memory: 'none', thread: 'none' });
			push(1, `VirtualAllocEx asks the other process for a block big enough for the DLL path.${fail === 'alloc' ? ' This time it returns null.' : ` It returns the block's address, ${addr}.`}`, { addr: fail === 'alloc' ? 'null' : addr });
			if (fail === 'alloc') {
				push(2, 'ensure! sees the null address and returns an error. No RemoteAllocation was created, because there is no memory to own, so there is nothing to free. Only the process handle closes.', { process: 'closed' });
				return steps;
			}
			push(2, 'The address is not null, so the check passes.', {});
			push(3, 'Wrap the address in RemoteAllocation at once. From here on, whichever way the function exits, its drop method will release the block.', { remote_memory: `owned at ${addr}` });
			if (fail === 'write') {
				push(4, 'write_exact fails: fewer bytes were written than requested. The ? returns the error early, skipping every line below.', { write: 'failed' });
				push(9, 'Leaving the function drops remote, and VirtualFreeEx releases the block. The early return still cleaned up what the earlier lines created.', { remote_memory: 'released', process: 'closed' });
				return steps;
			}
			push(4, 'write_exact copies the full path into the remote block and checks that every byte arrived.', { write: 'ok' });
			push(5, 'GetProcAddress finds LoadLibraryW in kernel32. That is the function the remote thread will run.', { load: 'LoadLibraryW found' });
			push(6, 'CreateRemoteThread starts a thread in the game that runs LoadLibraryW with the path as its argument. The handle is wrapped so it also closes automatically.', { thread: 'started' });
			push(7, 'wait_for_thread waits for the thread to finish and returns its result, which is the loaded module\'s handle.', { thread: 'finished', module: fail === 'null' ? '0' : '0x6A2E0000' });
			if (fail === 'null') {
				push(8, 'The module handle is 0: LoadLibraryW could not load the DLL. The check turns that into an error instead of pretending it worked.', {});
				push(9, 'Leaving the function drops remote, and VirtualFreeEx releases the path block. The thread handle and process handle close too.', { remote_memory: 'released', process: 'closed', thread: 'closed' });
				return steps;
			}
			push(8, 'The module handle is not zero, so the DLL loaded and the check passes.', {});
			push(9, 'The function ends. remote is dropped, VirtualFreeEx releases the path block, and the handles close. The path was only needed while LoadLibraryW ran.', { remote_memory: 'released', process: 'closed', thread: 'closed' });
			return steps;
		},
	},
};

// ---------------------------------------------------------------- shared logic
function defaults(trace) {
	const values = {};
	for (const input of trace.inputs || []) values[input.id] = input.value;
	return values;
}

function listing(trace, values) {
	return typeof trace.code === 'function' ? trace.code(values) : trace.code;
}

// Steps with the previous step's mem carried forward.
function runTrace(trace, values) {
	const steps = trace.run(values);
	let last = null;
	for (const step of steps) {
		if (step.mem) last = step.mem;
		else step.mem = last;
	}
	return steps;
}

function describeValue(input, value) {
	if (input.type === 'select') return (input.options.find(o => o.value === value) || {}).label || String(value);
	return input.show ? input.show(Number(value)) : String(value);
}

// For the page's static (JavaScript off) caption: the listing and the final state.
export function staticSummary(id) {
	const trace = TRACES[id];
	const values = defaults(trace);
	const steps = runTrace(trace, values);
	const last = steps[steps.length - 1];
	return {
		title: trace.title,
		code: listing(trace, values),
		end: last.say,
		vars: Object.entries(last.vars).map(([name, value]) => [name, String(value)]),
	};
}

// ---------------------------------------------------------------- the widget
function build(root, id) {
	const trace = TRACES[id];
	const values = defaults(trace);
	let steps = runTrace(trace, values);
	let index = 0;

	root.replaceChildren();
	const copy = el('div', 'concept-lab__header-copy');
	copy.append(el('span', 'concept-lab__eyebrow', 'Step through it'), el('h3', '', trace.title), el('p', 'concept-lab__description', trace.intro));
	const head = el('div', 'concept-lab__header');
	head.append(copy, el('span', 'concept-lab__live-badge', 'Explore'));

	// inputs
	const controls = el('div', 'code-trace__controls');
	const widgets = {};
	for (const input of trace.inputs || []) {
		const field = el('label', 'code-trace__field');
		const out = el('output', 'code-trace__out');
		let control;
		if (input.type === 'select') {
			control = el('select');
			for (const option of input.options) {
				const node = el('option', '', option.label);
				node.value = option.value;
				control.append(node);
			}
		} else {
			control = el('input');
			Object.assign(control, { type: 'range', min: input.min, max: input.max, step: input.step });
		}
		control.value = input.value;
		control.id = `${root.id}-${input.id}`;
		field.htmlFor = control.id;
		field.append(el('span', 'code-trace__field-label', input.label), control);
		if (input.type !== 'select') field.append(out);
		controls.append(field);
		widgets[input.id] = { input, control, out };
	}

	// code listing
	const codePanel = el('div', 'code-trace__panel');
	codePanel.append(el('h4', 'code-trace__label', 'Code'));
	const codeList = el('ol', 'code-trace__code');
	codeList.tabIndex = 0;
	codeList.setAttribute('role', 'group');
	codeList.setAttribute('aria-label', 'Code listing. The highlighted line is the current step. Left and right arrow keys move between steps.');
	codePanel.append(codeList);

	// variables and memory
	const varPanel = el('div', 'code-trace__panel');
	varPanel.append(el('h4', 'code-trace__label', 'Variables'));
	const varTable = el('table', 'code-trace__vars');
	const varBody = el('tbody');
	varTable.append(varBody);
	const memBox = el('div', 'code-trace__mem');
	varPanel.append(varTable, memBox);

	const grid = el('div', 'code-trace__grid');
	grid.append(codePanel, varPanel);

	const say = el('p', 'code-trace__say');
	say.setAttribute('aria-live', 'polite');
	say.setAttribute('aria-atomic', 'true');
	const count = el('span', 'code-trace__count');
	const button = (label, className) => {
		const node = el('button', 'code-trace__btn ' + (className || ''), label);
		node.type = 'button';
		return node;
	};
	const prev = button('Previous');
	const next = button('Next', 'code-trace__btn--main');
	const reset = button('Reset');
	const show = button('Show me the result');
	const nav = el('div', 'code-trace__nav');
	nav.append(prev, next, reset, show, count);
	const diff = el('p', 'code-trace__diff');
	diff.hidden = true;
	const hint = el('p', 'code-trace__hint', 'Tip: the left and right arrow keys also step, and Reset puts everything back to the lesson’s example.');

	// One structured bottom row: the buttons and the step count on a single line, the "different from the lesson" note under them, then the tip.
	const footer = el('div', 'code-trace__footer');
	footer.append(nav, diff, hint);
	root.append(head, controls, grid, say, footer);

	function renderCode() {
		const lines = listing(trace, values);
		const lang = academyGuessLang(lines.join('\n'));
		codeList.replaceChildren(...lines.map((text, i) => {
			const row = el('li', 'code-trace__line');
			row.dataset.line = String(i);
			const codeEl = el('code', '', ''); codeEl.innerHTML = academyHighlight(text, lang);
			row.append(el('span', 'code-trace__ln', String(i + 1)), codeEl);
			return row;
		}));
	}

	function renderInputs() {
		let different = [];
		for (const { input, control, out } of Object.values(widgets)) {
			if (input.type !== 'select') out.textContent = describeValue(input, values[input.id]);
			if (String(values[input.id]) !== String(input.value)) different.push(`${input.label}: the lesson used "${describeValue(input, input.value)}"`);
		}
		diff.hidden = different.length === 0;
		diff.textContent = different.length ? `Different from the lesson’s version. ${different.join('; ')}.` : '';
	}

	function render(flash) {
		const step = steps[index];
		const before = index > 0 ? steps[index - 1] : null;

		for (const row of codeList.children) {
			const current = Number(row.dataset.line) === step.line;
			row.classList.toggle('is-current', current);
			if (current) row.setAttribute('aria-current', 'step'); else row.removeAttribute('aria-current');
		}

		const names = [];
		for (const s of steps) for (const name of Object.keys(s.vars)) if (!names.includes(name)) names.push(name);
		varBody.replaceChildren(...names.map(name => {
			const set = name in step.vars;
			const row = el('tr', 'code-trace__var');
			const value = set ? String(step.vars[name]) : null;
			const had = before && name in before.vars;
			const was = had ? String(before.vars[name]) : null;
			const changed = set && before && (!had || was !== value);
			row.append(el('th', 'code-trace__name', name));
			const cell = el('td', 'code-trace__value');
			if (!set) {
				row.classList.add('is-unset');
				cell.append(el('span', 'code-trace__dim', 'not set yet'));
			} else {
				cell.append(el('span', 'code-trace__val', value));
				if (changed) {
					row.classList.add('is-changed');
					if (flash) row.classList.add('is-flash');
					cell.append(el('span', 'code-trace__tag', had ? 'changed' : 'new'));
					if (had) cell.append(el('span', 'code-trace__was', `was ${was}`));
				}
			}
			row.append(cell);
			return row;
		}));

		memBox.replaceChildren();
		if (step.mem) {
			const prevMem = before && before.mem;
			memBox.append(el('p', 'code-trace__mem-title', step.mem.title));
			const strip = el('div', 'code-trace__cells');
			step.mem.cells.forEach((c, i) => {
				const old = prevMem && prevMem.cells[i] && prevMem.cells[i].label === c.label ? prevMem.cells[i] : null;
				const changed = old && old.value !== c.value;
				const cell = el('div', 'code-trace__cell');
				if (changed) { cell.classList.add('is-changed'); if (flash) cell.classList.add('is-flash'); }
				if (c.note) cell.classList.add('is-marked');
				cell.append(el('span', 'code-trace__cell-label', c.label), el('strong', 'code-trace__cell-value', c.value));
				const tags = [c.note, changed ? 'changed' : ''].filter(Boolean).join(' / ');
				cell.append(el('span', 'code-trace__cell-note', tags || ' '));
				strip.append(cell);
			});
			memBox.append(strip);
		}

		say.textContent = step.say;
		say.dataset.step = String(index + 1);
		count.textContent = `Step ${index + 1} of ${steps.length}`;
		const atStart = index === 0;
		const atEnd = index === steps.length - 1;
		prev.setAttribute('aria-disabled', String(atStart));
		next.setAttribute('aria-disabled', String(atEnd));
		prev.classList.toggle('is-disabled', atStart);
		next.classList.toggle('is-disabled', atEnd);
		root.dataset.step = String(index + 1);
		root.dataset.steps = String(steps.length);
	}

	function go(to) {
		const clamped = Math.max(0, Math.min(steps.length - 1, to));
		if (clamped === index) return;
		index = clamped;
		render(true);
	}

	prev.addEventListener('click', () => go(index - 1));
	next.addEventListener('click', () => go(index + 1));
	show.addEventListener('click', () => go(steps.length - 1));
	reset.addEventListener('click', () => {
		for (const { input, control } of Object.values(widgets)) {
			values[input.id] = input.value;
			control.value = input.value;
		}
		steps = runTrace(trace, values);
		index = 0;
		renderCode();
		renderInputs();
		render(false);
	});
	for (const { input, control } of Object.values(widgets)) {
		const apply = () => {
			values[input.id] = input.type === 'select' ? control.value : Number(control.value);
			steps = runTrace(trace, values);
			index = Math.min(index, steps.length - 1);
			renderCode();
			renderInputs();
			render(false);
		};
		control.addEventListener('input', apply);
		control.addEventListener('change', apply);
	}
	root.addEventListener('keydown', event => {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		const tag = event.target && event.target.tagName;
		if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
		if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
		else if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
		else if (event.key === 'Home') { event.preventDefault(); go(0); }
		else if (event.key === 'End') { event.preventDefault(); go(steps.length - 1); }
	});

	renderCode();
	renderInputs();
	render(false);
}

export function mountCodeTraces() {
	for (const root of document.querySelectorAll('[data-code-trace]')) {
		if (root.dataset.traceReady === 'true') continue;
		if (!TRACES[root.dataset.codeTrace]) continue;
		root.dataset.traceReady = 'true';
		build(root, root.dataset.codeTrace);
	}
}
