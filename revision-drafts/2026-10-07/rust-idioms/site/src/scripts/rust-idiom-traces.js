// Worked Rust examples. These simulate values; they never execute reader code.
const range = (id, label, min, max, value) => ({ id, label, type: 'range', min, max, step: 1, value });
const select = (id, label, value, entries) => ({ id, label, type: 'select', value, options: entries.map(([value, label]) => ({ value, label })) });
function record() {
  const steps = [], vars = {};
  return { steps, push(line, say, change = {}, mem) { Object.assign(vars, change); steps.push({ line, say, vars: { ...vars }, mem }); } };
}
const opt = value => value === null ? 'None' : `Some(${value})`;
const bytes = values => ({ title: 'Owned byte buffer', cells: values.map((value, i) => ({ label: `+${i}`, value: value.toString(16).toUpperCase().padStart(2, '0') })) });

export const RUST_IDIOM_TRACES = {
  'idiom-option-chain': {
    title: 'Transform a value, then ask a fallible question',
    intro: 'The middle inventory slot starts at 8. Change the slot and cost to see which closure gets called.',
    code: ['let costs = [4_u32, 8, 12];', 'let price = costs.get(slot).copied();', 'let doubled = price.map(|n| n * 2);', 'let left = doubled.and_then(|n| budget.checked_sub(n));', 'let result = left.ok_or("not affordable");'],
    inputs: [range('slot', 'Inventory slot', 0, 4, 1), range('budget', 'Available gold', 0, 30, 20)],
    run({ slot, budget }) {
      const { steps, push } = record(), costs = [4, 8, 12];
      push(0, 'The array owns three prices. A slot beyond its length has no value.', { slot, budget, costs: '[4, 8, 12]' });
      const price = slot < costs.length ? costs[slot] : null;
      push(1, price === null ? 'get returns None; copied also keeps None.' : `get lends the price; copied copies the u32 into Some(${price}).`, { price: opt(price) });
      const doubled = price === null ? null : price * 2;
      push(2, price === null ? 'map does not call its closure for None.' : `map calls the closure once: ${price} times 2 is ${doubled}.`, { doubled: opt(doubled) });
      const left = doubled === null || doubled > budget ? null : budget - doubled;
      push(3, doubled === null ? 'and_then also skips its closure for None.' : left === null ? 'checked_sub returns None. and_then keeps that single Option layer.' : `checked_sub returns Some(${left}); and_then avoids Some(Some(...)).`, { left: opt(left) });
      push(4, left === null ? 'ok_or turns missing success into an explicit error reason.' : 'ok_or keeps the successful amount, including zero.', { result: left === null ? 'Err(not affordable)' : `Ok(${left})` });
      return steps;
    },
  },
  'idiom-result-chain': {
    title: 'A reason travels through Result and question mark',
    intro: 'Choose valid text, invalid text or an unaffordable cost. The first failure stops the sequence.',
    code: ['fn buy(text: &str, gold: u32) -> Result<u32, &\'static str> {', '    let cost = text.parse::<u32>().map_err(|_| "bad cost")?;', '    let left = gold.checked_sub(cost).ok_or("not enough gold")?;', '    Ok(left)', '}'],
    inputs: [select('text', 'Cost text', '4', [['4', '4'], ['20', '20'], ['oops', 'oops']]), range('gold', 'Available gold', 0, 25, 12)],
    run({ text, gold }) {
      const { steps, push } = record();
      push(0, 'The function promises either remaining gold or an error reason.', { text, gold });
      if (text === 'oops') { push(1, 'Parsing fails. map_err changes the error description; ? returns it now. No subtraction runs.', { result: 'Err(bad cost)', cost: 'not set' }); return steps; }
      const cost = Number(text);
      push(1, `Parsing gives Ok(${cost}). map_err skips its closure; ? supplies ${cost} to cost.`, { cost });
      if (gold < cost) { push(2, 'checked_sub returns None; ok_or supplies a reason and ? returns the Err now.', { result: 'Err(not enough gold)' }); return steps; }
      const left = gold - cost;
      push(2, 'Subtraction fits. ok_or makes Ok and ? takes out its value.', { left });
      push(3, 'The caller receives success and can choose what to do with the remaining amount.', { result: `Ok(${left})` });
      return steps;
    },
  },
  'idiom-result-combinators': {
    title: 'Result map changes success; and_then can fail again',
    intro: 'A small sensor reading becomes a doubled score. Try a missing reading or a score too large for u8.',
    code: ['let reading: Result<u8, &str> = input;', 'let score = reading.map(|n| u16::from(n) * 2);', 'let small = score.and_then(|n| u8::try_from(n)', '    .map_err(|_| "score too large"));'],
    inputs: [select('ok', 'Sensor', 'yes', [['yes', 'Reading received'], ['no', 'Read failed']]), range('value', 'Reading value', 0, 200, 100)],
    run({ ok, value }) {
      const { steps, push } = record();
      push(0, ok === 'yes' ? 'A successful reading carries a u8.' : 'A failed reading carries a reason and no number.', { reading: ok === 'yes' ? `Ok(${value})` : 'Err(read failed)' });
      if (ok !== 'yes') { push(1, 'map skips its success closure and passes the Err on.', { score: 'Err(read failed)' }); push(2, 'and_then also skips its closure; the original failure remains.', { small: 'Err(read failed)' }); return steps; }
      const score = value * 2;
      push(1, `map transforms ${value} into ${score} inside Ok. Widening first prevents u8 multiplication overflow.`, { score: `Ok(${score})` });
      push(2, score <= 255 ? 'The next operation succeeds, so and_then keeps one Result layer.' : 'The next operation fails; map_err explains the conversion failure.', { small: score <= 255 ? `Ok(${score})` : 'Err(score too large)' });
      return steps;
    },
  },
  'idiom-state-enum': {
    title: 'Only the current state carries its data',
    intro: 'A cooldown stores its remaining ticks; Ready has no cooldown count. Change the starting count.',
    code: ['enum Dash { Ready, Cooling { ticks: u32 } }', 'let state = Dash::Cooling { ticks };', 'let next = match state {', '    Dash::Cooling { ticks } if ticks > 1 => Dash::Cooling { ticks: ticks - 1 },', '    Dash::Cooling { .. } => Dash::Ready,', '    Dash::Ready => Dash::Ready,', '};'],
    inputs: [range('ticks', 'Cooldown ticks', 0, 5, 3)],
    run({ ticks }) {
      const { steps, push } = record();
      push(1, 'Cooling contains the count needed by that state. There is no separate ready flag to contradict it.', { state: `Cooling { ticks: ${ticks} }` });
      push(2, 'match checks the variant, then its optional guard.', { ticks });
      const cooling = ticks > 1;
      push(cooling ? 3 : 4, cooling ? 'The guard is true: one tick elapses and the next state carries the smaller count.' : 'Zero or one tick reaches Ready. The wildcard ignores the unused count.', { next: cooling ? `Cooling { ticks: ${ticks - 1} }` : 'Ready' });
      push(6, 'Exactly one arm produced the next state; every variant has an arm.');
      return steps;
    },
  },
  'idiom-patterns': {
    title: 'Name the successful shape, then test its meaning',
    intro: 'A missing player exits early. An existing player is then compared with a low-health rule.',
    code: ['let Some(health) = player_health else { return "no player"; };', 'let alive = matches!(health, 1..=100);', 'match health {', '    n if n < 25 && alive => "heal",', '    0 => "respawn",', '    _ => "wait",', '}'],
    inputs: [select('present', 'Player snapshot', 'yes', [['yes', 'Player present'], ['no', 'Player missing']]), range('health', 'Health in snapshot', 0, 100, 20)],
    run({ present, health }) {
      const { steps, push } = record();
      push(0, present === 'yes' ? 'let else names the health inside Some. Its else branch is skipped.' : 'None cannot match Some. The else branch returns before health is used.', { player_health: present === 'yes' ? `Some(${health})` : 'None', result: present === 'no' ? 'no player' : 'not chosen' });
      if (present !== 'yes') return steps;
      const alive = health >= 1 && health <= 100;
      push(1, 'matches! produces a bool; it does not bind a new variable outside the macro.', { health, alive });
      push(2, 'Arms are tried in order, and a guard may reject an otherwise matching pattern.');
      const result = health > 0 && health < 25 ? 'heal' : health === 0 ? 'respawn' : 'wait';
      push(result === 'heal' ? 3 : result === 'respawn' ? 4 : 5, `The selected arm returns ${result}.`, { result });
      return steps;
    },
  },
  'idiom-filter-map-fold': {
    title: 'Keep affordable costs, transform them, then accumulate',
    intro: 'The shop has costs 3, 8 and 12. Each cost is checked independently against the same budget.',
    code: ['let prices = [3_u32, 8, 12];', 'let total = prices.into_iter()', '    .filter(|cost| *cost <= budget)', '    .map(|cost| cost * 2)', '    .fold(0, |sum, cost| sum + cost);'],
    inputs: [range('budget', 'Per-item budget', 0, 15, 8)],
    run({ budget }) {
      const { steps, push } = record(); let sum = 0;
      push(0, 'The owned array contains three prices. This query does not make purchases or reduce the budget.', { budget, sum, prices: '[3, 8, 12]' });
      push(1, 'into_iter yields each u32 by value. The adaptors are lazy until fold asks for values.');
      for (const cost of [3, 8, 12]) {
        const keep = cost <= budget;
        push(2, `filter borrows ${cost} to test it: ${keep ? 'keep' : 'skip'}.`, { cost, kept: keep });
        if (keep) { const doubled = cost * 2; push(3, 'map receives the kept number by value and doubles it.', { doubled }); sum += doubled; push(4, 'fold adds it to the accumulator and requests the next item.', { sum }); }
      }
      push(4, 'No items remain. The total is the fold accumulator, including zero when no price passed.', { total: sum });
      return steps;
    },
  },
  'idiom-windows': {
    title: 'Overlapping windows keep neighboring samples together',
    intro: 'Change the middle position and watch which adjacent differences change.',
    code: ['let positions = [2_i32, middle, 10];', 'let deltas: Vec<i32> = positions.windows(2)', '    .map(|pair| pair[1] - pair[0])', '    .collect();'],
    inputs: [range('middle', 'Middle position', 0, 12, 6)],
    run({ middle }) {
      const { steps, push } = record(); const positions = [2, middle, 10], deltas = [];
      push(0, 'The array owns three samples. Each two-element window borrows consecutive elements.', { positions: `[${positions.join(', ')}]`, middle });
      for (let i = 0; i < 2; i++) { push(1, 'The next window overlaps the previous one by one sample.', { pair: `[${positions[i]}, ${positions[i + 1]}]` }); deltas.push(positions[i + 1] - positions[i]); push(2, 'A window has exactly two elements, so these two indexes are in bounds.', { delta: deltas.at(-1) }); }
      push(3, 'collect consumes the iterator into a new owned Vec. The original positions remain unchanged.', { deltas: `[${deltas.join(', ')}]` }); return steps;
    },
  },
  'idiom-chunks': {
    title: 'Fixed records leave a remainder that must be handled',
    intro: 'Two bytes make one toy record. Toggle a trailing byte to see why chunks_exact alone cannot validate a packet.',
    code: ['let records = bytes.chunks_exact(2);', 'let tail = records.remainder();', 'if !tail.is_empty() { return Err("partial record"); }', 'let totals: Vec<u16> = records', '    .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))', '    .collect();'],
    inputs: [select('tail', 'Packet shape', 'no', [['no', 'Two complete records'], ['yes', 'Two records and one trailing byte']])],
    run({ tail }) {
      const { steps, push } = record(), values = [4, 0, 9, 0, ...(tail === 'yes' ? [255] : [])];
      push(0, 'Non-overlapping chunks contain exactly two bytes each. A zero chunk size would panic; this example fixes it at two.', { length: values.length, record_size: 2 }, bytes(values));
      push(1, 'remainder borrows the short tail; the record iterator has not consumed anything yet.', { tail: tail === 'yes' ? '[FF]' : '[]' });
      if (tail === 'yes') { push(2, 'The guard returns an error. A partial record is never silently dropped.', { result: 'Err(partial record)' }); return steps; }
      push(3, 'The tail is empty, so the complete record iterator can be consumed.');
      push(4, 'Each two-byte pair decodes using an explicit little-endian order.', { record: 4 });
      push(4, 'The next pair becomes 9. Its bytes did not overlap the first pair.', { record: 9 });
      push(5, 'The complete packet yields two values.', { totals: '[4, 9]' }); return steps;
    },
  },
  'idiom-byte-conversion': {
    title: 'A bounded slice becomes a number, then bytes again',
    intro: 'The default buffer holds the four bytes for 300. Try a short buffer; decoding stops before indexing.',
    code: ['fn read_gold(bytes: &[u8]) -> Option<u32> {', '    let raw: [u8; 4] = bytes.get(..4)?.try_into().ok()?;', '    Some(u32::from_le_bytes(raw))', '}', 'let encoded = gold.to_le_bytes();'],
    inputs: [select('length', 'Bytes available', '4', [['4', 'All four bytes'], ['3', 'Only three bytes']]), range('gold', 'Gold to serialize', 0, 1000, 300)],
    run({ length, gold }) {
      const { steps, push } = record(), values = [44, 1, 0, 0].slice(0, Number(length));
      push(0, 'A shared slice lends bytes and their length; it does not transfer their ownership.', { length: values.length, gold }, bytes(values));
      if (length === '3') push(1, 'get(..4) returns None. ? returns None; no array or number is read.', { decoded: 'None' });
      else { push(1, 'The checked slice has exactly four bytes; try_into copies them into a four-byte array.', { raw: '[2C, 01, 00, 00]' }); push(2, 'Little-endian conversion makes the low byte first. The number is 300.', { decoded: 'Some(300)' }); }
      const encoded = [gold & 255, (gold >>> 8) & 255, (gold >>> 16) & 255, (gold >>> 24) & 255];
      push(4, 'to_le_bytes chooses the same explicit order for writing. It does not depend on the host CPU.', { encoded: encoded.map(n => n.toString(16).toUpperCase().padStart(2, '0')).join(' ') }); return steps;
    },
  },
  'idiom-integer-safety': {
    title: 'Choose what an overflowing counter means',
    intro: 'A u8 holds 0 through 255. The three operations use three different policies for the same addition.',
    code: ['let count: u8 = start;', 'let checked = count.checked_add(gain);', 'let wrapping = count.wrapping_add(gain);', 'let saturating = count.saturating_add(gain);'],
    inputs: [range('start', 'Starting count', 0, 255, 250), range('gain', 'Gain', 0, 20, 10)],
    run({ start, gain }) {
      const { steps, push } = record(), total = start + gain;
      push(0, 'The mathematical sum may be wider than the destination type.', { count: start, gain, mathematical: total });
      push(1, total <= 255 ? 'The sum fits; checked_add gives Some.' : 'The sum does not fit; checked_add gives None and lets the caller reject it.', { checked: total <= 255 ? `Some(${total})` : 'None' });
      push(2, 'wrapping_add keeps the low eight bits. Use this when the counter is intentionally cyclic.', { wrapping: total % 256 });
      push(3, 'saturating_add clamps at the largest value. Use this for a meter that must stop at its limit.', { saturating: Math.min(255, total) }); return steps;
    },
  },
  'idiom-layout': {
    title: 'C layout includes alignment padding',
    intro: 'On the Windows x64 layout used here, changing gold changes bytes but leaves offsets and size alone.',
    code: ['#[repr(C)]', 'struct Record { tag: u8, gold: u32, zone: u16 }', 'let record = Record { tag: 1, gold, zone: 2 };', 'let offset = std::mem::offset_of!(Record, gold);', 'let size = std::mem::size_of::<Record>();'],
    inputs: [range('gold', 'Gold field value', 0, 1000, 300)],
    run({ gold }) {
      const { steps, push } = record();
      const cells = [{ label: '+0', value: 'tag' }, { label: '+1..3', value: 'padding' }, { label: '+4..7', value: `gold ${gold}` }, { label: '+8..9', value: 'zone' }, { label: '+10..11', value: 'padding' }];
      push(0, 'repr(C) chooses C field ordering and alignment rules for the target platform. It is not a disk-file format.', { target: 'Windows x64', gold });
      push(1, 'tag begins at zero; gold needs four-byte alignment, so three bytes of padding precede it.', { alignment: 4 }, { title: 'Field layout, not serialized bytes', cells });
      push(2, 'The value changes; the type layout does not.', { tag: 1, zone: 2 });
      push(3, 'offset_of! reports gold at offset four for this target layout.', { gold_offset: 4 });
      push(4, 'Two tail padding bytes round the total up to a multiple of the struct alignment.', { size: 12 }); return steps;
    },
  },
  'idiom-borrowed-slice': {
    title: 'A returned view stays tied to its owner',
    intro: 'Change the requested length. A valid prefix borrows the buffer; too long gives None.',
    code: ['fn prefix<\'a>(bytes: &\'a [u8], count: usize) -> Option<&\'a [u8]> {', '    bytes.get(..count)', '}', 'let buffer = [10_u8, 20, 30, 40];', 'let view = prefix(&buffer, count);'],
    inputs: [range('count', 'Prefix length', 0, 6, 2)],
    run({ count }) {
      const { steps, push } = record(), values = [10, 20, 30, 40];
      push(3, 'The caller owns buffer. No lifetime annotation extends how long it lives.', { owner: 'buffer in caller', count }, bytes(values));
      push(4, 'The function receives a temporary shared borrow, plus the requested count.');
      push(1, count <= 4 ? 'get lends a view into the same allocation. It does not copy the elements.' : 'The end lies beyond the buffer; get returns None.', { view: count <= 4 ? `Some(&[${values.slice(0, count).join(', ')}])` : 'None', copied_bytes: 0 });
      push(4, 'A valid view can be used only while its owner is alive and the borrow rules permit it. The compiler checks this relationship.', { lifetime: 'view cannot outlive buffer' }); return steps;
    },
  },
  'idiom-newtype-display': {
    title: 'Give one number a type and a readable spelling',
    intro: 'The same numeric offset has a distinct type. Conversion and formatting do not validate a live address.',
    code: ['#[derive(Debug, Clone, Copy, PartialEq, Eq)]', 'struct Rva(u32);', 'impl From<u32> for Rva { fn from(n: u32) -> Self { Self(n) } }', 'impl std::fmt::Display for Rva {', '    fn fmt(&self, f: &mut std::fmt::Formatter<\'_>) -> std::fmt::Result {', '        write!(f, "RVA 0x{:X}", self.0)', '    }', '}', 'let offset: Rva = raw.into();', 'let label = offset.to_string();'],
    inputs: [range('raw', 'Raw offset', 0, 4096, 512)],
    run({ raw }) {
      const { steps, push } = record();
      push(1, 'Rva is a distinct type, so a function taking Rva cannot accidentally receive a different newtype.', { raw, offset: 'not constructed' });
      push(0, 'derive generates the named trait implementations from the field. Copy fits this plain numeric wrapper; it would be wrong for an owned handle.', { traits: 'Debug, Clone, Copy, PartialEq, Eq' });
      push(8, 'Implementing From<u32> also supplies Into<Rva>. The destination annotation chooses the conversion.', { offset: `Rva(${raw})` });
      push(5, 'Display writes an intended user-facing label into the formatter.', { label: `RVA 0x${raw.toString(16).toUpperCase()}` });
      push(9, 'to_string uses Display. The number has a clearer role, but its validity still depends on the target module.', { validated: false }); return steps;
    },
  },
  'idiom-trait-reader': {
    title: 'One capability lets a function use different readers',
    intro: 'Swap a deterministic fixture for a missing-data fixture. The function calls the same trait method.',
    code: ['trait GoldReader { fn gold(&self) -> Option<u32>; }', 'struct Fixture(u32);', 'impl GoldReader for Fixture {', '    fn gold(&self) -> Option<u32> { Some(self.0) }', '}', 'fn affordable(reader: &impl GoldReader, price: u32) -> bool {', '    reader.gold().is_some_and(|gold| gold >= price)', '}'],
    inputs: [select('reader', 'Reader implementation', 'fixture', [['fixture', 'Fixture: Some(20)'], ['missing', 'Missing: None']]), range('price', 'Item price', 0, 30, 12)],
    run({ reader, price }) {
      const { steps, push } = record();
      push(0, 'The trait defines the capability, not where the data comes from.', { reader, price });
      push(5, 'The argument borrows one concrete implementation. impl Trait here asks for any type with this capability.', { access: 'shared borrow' });
      push(6, reader === 'fixture' ? 'This implementation returns Some(20). The closure compares its number with the price.' : 'This implementation returns None. is_some_and skips the closure and returns false.', { gold: reader === 'fixture' ? 'Some(20)' : 'None', affordable: reader === 'fixture' && price <= 20 });
      push(7, 'Both readers use the same function. The trait does not grant operating-system access or turn missing data into a valid value.'); return steps;
    },
  },
  'idiom-builder': {
    title: 'A builder accumulates choices before validating',
    intro: 'The default sampling limit is valid. Try zero; build reports an error before any sampler is started.',
    code: ['let draft = SamplerBuilder::default();', 'let draft = draft.limit(limit).label("gold");', 'let sampler = draft.build();'],
    inputs: [range('limit', 'Samples per tick', 0, 8, 3)],
    run({ limit }) {
      const { steps, push } = record();
      push(0, 'Default creates an ordinary draft with a limit of one and a label of sample.', { limit: 1, label: 'sample', validated: false });
      push(1, 'Each consuming method returns the updated draft so the next method can use it.', { limit, label: 'gold' });
      push(2, limit === 0 ? 'build rejects a zero limit. No ready sampler is produced.' : 'build checks the limit once and returns a ready sampler.', { validated: limit > 0, result: limit > 0 ? `Ok(Sampler { limit: ${limit}, label: gold })` : 'Err(limit must be positive)' }); return steps;
    },
  },
  'idiom-drop-guard': {
    title: 'A scope guard restores a local toy byte on every return',
    intro: 'Both paths drop the guard. This models ownership cleanup without touching executable memory.',
    code: ['fn probe(byte: &mut u8, stop: bool) -> Result<(), &\'static str> {', '    let original = *byte;', '    let _guard = Restore { byte, original };', '    *_guard.byte = 0x90;', '    if stop { return Err("stop early"); }', '    Ok(())', '}', '// Restore::drop assigns original back to byte.'],
    inputs: [select('stop', 'Exit path', 'no', [['no', 'Normal return'], ['yes', 'Early error return']])],
    run({ stop }) {
      const { steps, push } = record();
      push(0, 'The caller lends one ordinary data byte to the probe.', { byte: '0x75', stop: stop === 'yes', guard: 'not created' });
      push(1, 'Save the original value before changing the byte.', { original: '0x75' });
      push(2, 'The guard holds the exclusive borrow and the saved value.', { guard: 'owns cleanup duty' });
      push(3, 'Only access through the guard can change the borrowed byte in this scope.', { byte: '0x90' });
      push(stop === 'yes' ? 4 : 5, stop === 'yes' ? 'return begins leaving the scope with an error.' : 'The final expression begins leaving with success.', { result: stop === 'yes' ? 'Err(stop early)' : 'Ok(())' });
      push(7, 'Drop restores the original byte before the caller can use its borrow again.', { byte: '0x75', guard: 'dropped' }); return steps;
    },
  },
  'idiom-error-layers': {
    title: 'Keep a typed reason, then add application context',
    intro: 'The library distinguishes malformed text from an excessive limit. The command adds the operation name.',
    code: ['fn parse_limit(text: &str) -> Result<u32, LimitError> {', '    let n: u32 = text.parse()?;', '    if n > 60 { return Err(LimitError::TooLarge(n)); }', '    Ok(n)', '}', 'let limit = parse_limit(text).context("load sampler limit")?;'],
    inputs: [select('text', 'Setting text', '12', [['12', '12: valid'], ['80', '80: too large'], ['oops', 'oops: not a number']])],
    run({ text }) {
      const { steps, push } = record();
      push(0, 'The library returns a named error enum that another caller can match.', { text });
      if (text === 'oops') push(1, '? uses the generated From<ParseIntError> conversion and returns the Parse variant.', { library: 'Err(LimitError::Parse)' });
      else { const n = Number(text); push(1, 'Parsing succeeded; ? yields the number.', { n }); push(n > 60 ? 2 : 3, n > 60 ? 'The range check returns a distinct TooLarge variant.' : 'The library returns its validated amount.', { library: n > 60 ? `Err(LimitError::TooLarge(${n}))` : `Ok(${n})` }); }
      push(5, text === '12' ? 'The application receives success. Context does not change the number.' : 'The command attaches what it was doing while preserving the source error chain.', { application: text === '12' ? 'limit = 12' : 'error: load sampler limit → typed source' }); return steps;
    },
  },
};
