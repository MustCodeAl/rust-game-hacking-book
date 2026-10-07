// Small deterministic models for the original handoff's uncovered lessons.
// These listings are explanatory pseudocode. They never inspect or run a lab.
const range = (id, label, min, max, value) => ({ id, label, type: 'range', min, max, step: 1, value });
const select = (id, label, value, choices) => ({ id, label, type: 'select', value, options: choices.map(([value, label]) => ({ value, label })) });
const hex = n => '0x' + n.toString(16).toUpperCase();
const memory = (title, entries) => ({ title, cells: entries.map(([label, value, note = '']) => ({ label, value: String(value), note })) });
function record(initial) {
  let vars = { ...initial };
  const steps = [];
  return { steps, add(line, say, changes = {}, mem) {
    vars = { ...vars, ...changes };
    steps.push({ line, say, vars: { ...vars }, ...(mem ? { mem } : {}) });
  } };
}
const model = (title, intro, code, inputs, execute) => ({
  title, intro: 'Illustrative pseudocode model. ' + intro, code, inputs,
  run(values) {
    const r = record(values);
    r.add(0, 'Start with the selected inputs. Follow the highlighted operation and the changing state below.');
    execute(r, values);
    return r.steps;
  },
});
export const HANDOFF_TRACES = {
  'handoff-evidence-scope': model('Separate an observation from its explanation',
    'Choose what you saw and whether the input was independently checked. A missing result leaves several possible causes.',
    ['record the visible motion', 'record whether the input arrived', 'keep unverified causes as possibilities', 'compare what each observation establishes', 'choose the next discriminating check', 'report the observed result and its limits'],
    [select('motion', 'Visible result', 'rose', [['rose', 'Character rose'], ['still', 'Character stayed still']]), select('input', 'Input evidence', 'unknown', [['unknown', 'Input arrival not checked'], ['checked', 'Input arrival confirmed']])],
    (r, { motion, input }) => {
      r.add(1, input === 'checked' ? 'The second observation confirms input arrival; it does not identify the jump calculation.' : 'The key press alone does not show whether the game received it.', { input_arrival: input === 'checked' ? 'confirmed' : 'unknown' });
      const possibilities = motion === 'rose' ? 'some path produced upward motion' : input === 'checked' ? 'jump conditions or later calculation' : 'input delivery or jump conditions or later calculation';
      r.add(2, 'Keep explanations separate from the visible result.', { possible_explanations: possibilities });
      r.add(3, motion === 'rose' ? 'A visible rise answers the small motion question, but not which mechanism caused it.' : 'No rise establishes only that no rise was observed in this trial.', { observed: motion === 'rose' ? 'rise' : 'no rise' });
      r.add(4, input === 'unknown' ? 'Checking input arrival can separate a delivery failure from a later problem.' : 'With arrival known, inspect the starting conditions or the calculation next.', { next_check: input === 'unknown' ? 'input arrival' : 'jump condition and starting state' });
      r.add(5, 'Result: ' + (motion === 'rose' ? 'a rise was observed; the cause still needs evidence.' : 'no rise was observed; the remaining explanations are ' + possibilities + '.'));
    }),
  'handoff-cpu-store': model('A register change reaches memory and the display',
    'Change the coin count and follow an add-one calculation. A temporary result is not yet the stored game state.',
    ['RAM.gold = starting_gold', 'working = RAM.gold', 'working = working + 1', 'RAM.gold = working', 'display = RAM.gold', 'draw the copied display value'],
    [range('gold', 'Starting gold', 0, 200, 100)], (r, { gold }) => {
      let stored = gold, working = 'not loaded', displayed = gold;
      const mem = () => memory('Three separate values', [['RAM.gold', stored], ['working', working], ['display', displayed]]);
      r.add(0, 'RAM and the last drawn display start at ' + gold + '.', { stored_gold: stored, working, display: displayed }, mem());
      working = gold; r.add(1, 'Copy the stored amount into a working register.', { working }, mem());
      working += 1; r.add(2, 'Add one to the temporary value. RAM still contains ' + stored + '.', { working }, mem());
      stored = working; r.add(3, 'Store the result. Future calculations can now read the new amount.', { stored_gold: stored }, mem());
      displayed = stored; r.add(4, 'Copy the stored amount for drawing.', { display: displayed }, mem());
      r.add(5, 'Result: memory and the new display both contain ' + displayed + '; they changed at different steps.', {}, mem());
    }),
  'handoff-affordable-purchase': model('One purchase algorithm, different inputs',
    'Try a price below, equal to, or above the current gold. The comparison prevents subtracting an unaffordable unsigned amount.',
    ['gold = starting_gold', 'cost = item_cost', 'can_pay = gold >= cost', 'if can_pay: gold = gold - cost', 'otherwise keep gold unchanged', 'return gold'],
    [range('gold', 'Starting gold', 0, 120, 100), range('cost', 'Item cost', 0, 120, 25)], (r, { gold, cost }) => {
      r.add(1, 'The price is an input; this algorithm changes only gold.', { stored_gold: gold, item_cost: cost });
      const allowed = gold >= cost; r.add(2, gold + ' >= ' + cost + ' is ' + allowed + '.', { can_pay: allowed });
      const result = allowed ? gold - cost : gold;
      r.add(allowed ? 3 : 4, allowed ? 'The accepted purchase subtracts the price.' : 'The rejected purchase skips subtraction entirely.', { stored_gold: result });
      r.add(5, 'Result: ' + result + ' gold. ' + (allowed ? 'The cost stays ' + cost + '.' : 'No negative or wrapped amount was created.'));
    }),
  'handoff-instruction-span': model('Make room without cutting an instruction',
    'Change the jump size. The illustrated original instructions occupy two bytes and four bytes; the return must land after whole instructions.',
    ['sizes = [2, 4]', 'covered = 0', 'take the next whole instruction', 'repeat until covered >= jump_size', 'padding = covered - jump_size', 'resume = hook_start + covered'],
    [range('jump', 'Bytes required by the replacement', 1, 6, 5)], (r, { jump }) => {
      let covered = 0; r.add(1, 'Begin at illustrative hook address 0x1000.', { covered, hook: '0x1000' });
      covered = 2; r.add(2, 'Cover the complete first instruction, which is two bytes.', { covered }, memory('Original instruction span', [['0x1000', '8B'], ['+1', '01'], ['+2', '8D'], ['+3', '74'], ['+4', '26'], ['+5', '00']]));
      if (covered < jump) { covered += 4; r.add(3, 'The first instruction is too short, so also cover the entire four-byte second instruction.', { covered }); }
      const padding = covered - jump; r.add(4, 'The replacement fits, leaving ' + padding + ' byte(s) of padding.', { padding });
      r.add(5, 'Result: cover ' + covered + ' bytes and resume at ' + hex(0x1000 + covered) + ', a complete instruction boundary.', { resume: hex(0x1000 + covered) });
    }),
  'handoff-vtable-receiver': model('A table slot dispatches to one object',
    'Choose the receiver in an invented 64-bit layout. Shared method pointers do not make object fields shared.',
    ['receiver = selected_object', 'table = receiver.vptr', 'slot_address = table + 4 * 8', 'function = read_pointer(slot_address)', 'call function(receiver)', 'record which object received the call'],
    [select('object', 'Receiver', 'A', [['A', 'Object A'], ['B', 'Object B']])], (r, { object }) => {
      const base = object === 'A' ? 0x1000 : 0x2000;
      r.add(0, 'The selected object has its own base address.', { receiver: hex(base), calls_A: 0, calls_B: 0 });
      r.add(1, 'Both objects point to this illustrative shared table.', { table: '0x3000' });
      r.add(2, 'Slot four lies four eight-byte entries after slot zero.', { slot_address: '0x3020' });
      r.add(3, 'Read the function pointer from that slot.', { function: '0x4000' });
      r.add(4, 'Pass the selected object as the receiver.', { calls_A: object === 'A' ? 1 : 0, calls_B: object === 'B' ? 1 : 0 });
      r.add(5, 'Result: object ' + object + ' received the call. The table gives a dispatch mechanism, not the original source class name.');
    }),
  'handoff-vector-range': model('Live elements versus allocated room',
    'Change the reported end or stride in the lesson’s example. Divisibility is necessary, but a wrong stride can still produce a plausible count.',
    ['begin = 0x04531000; capacity_bytes = 1024', 'used_bytes = end - begin', 'check 0 <= used_bytes <= capacity_bytes', 'check used_bytes % stride == 0', 'count = used_bytes / stride', 'report checked count and remaining uncertainty'],
    [range('used', 'Bytes through end', 0, 1100, 320), select('stride', 'Assumed element stride', '32', [['32', '32 bytes'], ['16', '16 bytes'], ['24', '24 bytes']])], (r, { used, stride }) => {
      const width = Number(stride), bounded = used <= 1024;
      r.add(1, 'End is ' + hex(0x04531000 + used) + '; capacity end is 0x04531400.', { end: hex(0x04531000 + used), capacity_bytes: 1024 });
      r.add(2, 'Compare the live range with the allocation.', { bounded });
      const divisible = used % width === 0; r.add(3, 'The remainder after dividing by stride is ' + used % width + '.', { divisible });
      const count = bounded && divisible ? used / width : 'rejected';
      r.add(4, bounded && divisible ? 'The structural checks allow this count.' : 'Do not manufacture a count from the invalid range.', { count });
      r.add(5, 'Result: ' + count + '. ' + (count === 'rejected' ? 'Fix the range or stride before reading elements.' : 'Confirm the stride from observed accesses; readable, divisible bytes alone do not prove it.'));
    }),
  'handoff-event-order': model('One event, two system schedules',
    'Choose the order for frame ten. Each reader sees only events already published when it runs.',
    ['start frame 10 with score = 0', 'run the first selected system', 'collision publishes BrickHit(7)', 'score reads only published events', 'start frame 11 and read pending events', 'report the frame of the score change'],
    [select('order', 'System order', 'collision-first', [['collision-first', 'Collision then score'], ['score-first', 'Score then collision']])], (r, { order }) => {
      r.add(0, 'The queue starts empty.', { frame: 10, pending: 0, score: 0 });
      if (order === 'score-first') r.add(3, 'Score runs first and finds nothing yet.', { score: 0 });
      r.add(2, 'Collision publishes one brick-hit event.', { pending: 1 });
      if (order === 'collision-first') r.add(3, 'Score reads the already published event during frame ten.', { pending: 0, score: 1, changed_frame: 10 });
      else r.add(4, 'The next score pass consumes the pending event in frame eleven.', { frame: 11, pending: 0, score: 1, changed_frame: 11 });
      r.add(5, 'Result: one score increment in frame ' + (order === 'collision-first' ? 10 : 11) + '. Order changed the latency, not the event’s meaning.');
    }),
  'handoff-recorder-queue': model('A bounded sampler reports overload',
    'Change how many events arrive and how many the writer drains. This toy queue holds four events; the production lesson uses 128.',
    ['queue = []; capacity = 4', 'for each arriving event:', '  if room: queue.push(event)', '  else: dropped += 1', 'writer drains up to its chosen count', 'report written, queued, and dropped'],
    [range('arrivals', 'Arriving events', 0, 8, 5), range('drain', 'Events the writer can drain', 0, 4, 2)], (r, { arrivals, drain }) => {
      const accepted = Math.min(4, arrivals), dropped = arrivals - accepted;
      r.add(1, 'Capture does not wait for the writer.', { queued: 0, dropped: 0, written: 0 });
      r.add(2, 'Accept ' + accepted + ' events into the available slots.', { queued: accepted });
      r.add(3, 'Record ' + dropped + ' overflow event(s) as dropped.', { dropped });
      const written = Math.min(accepted, drain); r.add(4, 'The writer drains ' + written + ' accepted events.', { written, queued: accepted - written });
      r.add(5, 'Result: ' + written + ' written, ' + (accepted - written) + ' pending, ' + dropped + ' dropped. Those counts account for every arrival.');
    }),
  'handoff-export-ordinal': model('Public ordinal versus address-table index',
    'Change the requested public ordinal. This invented export table has base one and three address entries.',
    ['ordinal_base = 1; entries = 3', 'index = public_ordinal - ordinal_base', 'check index is within the address table', 'entry = functions[index]', 'classify the entry before using it', 'report an RVA, forwarder, or missing export'],
    [range('ordinal', 'Requested public ordinal', 0, 5, 2)], (r, { ordinal }) => {
      const index = ordinal - 1; r.add(1, ordinal + ' - 1 = ' + index + '.', { index });
      const valid = index >= 0 && index < 3; r.add(2, 'There are three entries, indexed zero through two.', { valid });
      const values = ['RVA 0x1200', 'OTHER.RealName', 'RVA 0x1800'];
      const entry = valid ? values[index] : 'missing'; r.add(3, valid ? 'Read the selected entry.' : 'The range check prevents an out-of-table access.', { entry });
      const type = !valid ? 'missing' : index === 1 ? 'forwarder' : 'direct RVA'; r.add(4, index === 1 ? 'This fixture marks entry one as a string within the export directory, so it is a forwarder.' : 'Classify the bounded entry; an address-like number alone is not enough.', { type });
      r.add(5, 'Result: ordinal ' + ordinal + ' selects ' + entry + '. ' + (type === 'forwarder' ? 'Follow the forwarded DLL and name instead of treating its text bytes as code.' : 'Indexes and public ordinals remain different numbers.'));
    }),
  'handoff-call-destination': model('A relative call starts measuring after itself',
    'Change the signed displacement in an illustrative five-byte x86 near call. Negative values can point backward.',
    ['call_site = 0x1000; length = 5', 'next_ip = call_site + length', 'target = next_ip + signed_displacement', 'push next_ip as the return address', 'instruction_pointer = target', 'ret later resumes at saved next_ip'],
    [range('displacement', 'Signed displacement', -64, 64, 10)], (r, { displacement }) => {
      r.add(1, 'The instruction immediately after the call is at 0x1005.', { next_ip: '0x1005' });
      const target = 0x1005 + displacement; r.add(2, 'Add ' + displacement + ' to the end address, not the call’s beginning.', { target: hex(target) });
      r.add(3, 'Save 0x1005 so the called function knows where to return.', { saved_return: '0x1005' });
      r.add(4, 'Execution enters the computed destination.', { instruction_pointer: hex(target) });
      r.add(5, 'Result: call enters ' + hex(target) + ' and a matching return resumes at 0x1005. The saved return is independent of the signed displacement.', { instruction_pointer: '0x1005' });
    }),
  'handoff-patch-restore': model('Verified installation owns its undo bytes',
    'Choose whether the live bytes match and whether the feature fails. This models ownership, not an executable detour or concurrent code writer.',
    ['capture expected and current byte span', 'if current != expected: reject', 'save the verified original span', 'install the planned replacement', 'restore saved bytes on exit', 'compare the final span with the original'],
    [select('match', 'Initial live span', 'yes', [['yes', 'Expected bytes'], ['no', 'Different bytes']]), select('finish', 'Feature outcome', 'success', [['success', 'Normal finish'], ['error', 'Feature returns an error']])], (r, { match, finish }) => {
      const original = match === 'yes' ? '8B 01 8D 74 26 00' : 'different live span';
      r.add(0, 'The original six-byte example is the lesson’s span; the replacement is represented symbolically.', { current: original, installed: false, owns_saved_bytes: false });
      if (match === 'no') { r.add(1, 'Reject before writing because the live build disagrees.', { result: 'rejected' }); r.add(5, 'Result: the unmatched span stayed unchanged; no restoration owner or patch was created.'); return; }
      r.add(2, 'Retain the verified bytes before modifying the span.', { owns_saved_bytes: true });
      r.add(3, 'The applied patch owns its cleanup record.', { current: 'jump plus padding', installed: true });
      r.add(4, finish === 'error' ? 'The feature returns an error, and cleanup still restores the saved span.' : 'Normal shutdown restores the saved span.', { current: original, installed: false, result: finish });
      r.add(5, 'Result: the byte span matches the original after ' + finish + '. Real code must also report restoration errors and drain in-flight execution.');
    }),
  'handoff-input-edge': model('A held button and a new press are different',
    'Choose last frame’s state and this frame’s state. Only the up-to-down transition creates one press event.',
    ['previous = last_frame_down', 'current = this_frame_down', 'pressed = current and not previous', 'released = previous and not current', 'store previous = current for the next sample', 'report level, press edge, and release edge'],
    [select('previous', 'Last frame', 'up', [['up', 'Up'], ['down', 'Down']]), select('current', 'This frame', 'down', [['up', 'Up'], ['down', 'Down']])], (r, { previous, current }) => {
      const p = previous === 'down', c = current === 'down'; r.add(1, 'Read the current level independently of the remembered level.', { was_down: p, is_down: c });
      r.add(2, 'A press exists only when current is down and previous was up.', { pressed: c && !p });
      r.add(3, 'A release exists only when previous was down and current is up.', { released: p && !c });
      r.add(4, 'Remember this level; another unchanged sample will have no edge.', { next_previous: c });
      r.add(5, 'Result: level=' + c + ', pressed=' + (c && !p) + ', released=' + (p && !c) + '. A held button does not create another press.');
    }),
  'handoff-draw-forward': model('Observe a draw without holding up rendering',
    'Change the bounded log queue’s availability. The wrapper must forward the draw even when its observation is dropped.',
    ['receive DrawElements(count = 9)', 'copy a compact sample', 'try to enqueue without waiting', 'if full: increment dropped count', 'forward the original arguments once', 'report submitted draws and stored samples'],
    [select('queue', 'Sample queue', 'room', [['room', 'Room available'], ['full', 'Queue full']])], (r, { queue }) => {
      r.add(1, 'The copied sample contains count 9; this count is indices, not a model identity.', { sampled_count: 9, accepted: 0, dropped: 0, forwarded: 0 });
      r.add(2, 'The queue operation returns immediately.', { accepted: queue === 'room' ? 1 : 0 });
      r.add(3, queue === 'full' ? 'Report the lost sample instead of blocking the render thread.' : 'No sample was dropped.', { dropped: queue === 'full' ? 1 : 0 });
      r.add(4, 'Pass the same draw arguments to the saved original function once.', { forwarded: 1 });
      r.add(5, 'Result: one draw forwarded, ' + (queue === 'room' ? 'one sample accepted.' : 'one sample dropped.') + ' CPU submission does not establish GPU completion.');
    }),
  'handoff-com-receiver': model('COM dispatch keeps the hidden receiver',
    'Choose a swap-chain instance in an invented 64-bit table. Present is slot eight for this interface, but its code address belongs to this implementation.',
    ['receiver = selected_swap_chain', 'table = read_pointer(receiver)', 'entry = table + 8 * 8', 'present = read_pointer(entry)', 'present(receiver, sync_interval, flags)', 'record which instance was called'],
    [select('object', 'Swap chain receiving Present', 'A', [['A', 'Swap chain A'], ['B', 'Swap chain B']])], (r, { object }) => {
      const base = object === 'A' ? 0x1000 : 0x2000; r.add(0, 'The two instances share this illustrative implementation table.', { receiver: hex(base), calls_A: 0, calls_B: 0 });
      r.add(1, 'The first pointer supplies the table.', { table: '0x3000' });
      r.add(2, 'Eight entries times eight bytes gives offset 0x40.', { entry: '0x3040' });
      r.add(3, 'Read this implementation’s pointer from the selected slot.', { present: '0x4000' });
      r.add(4, 'The hidden first parameter is ' + hex(base) + ', the selected interface pointer.', { calls_A: object === 'A' ? 1 : 0, calls_B: object === 'B' ? 1 : 0 });
      r.add(5, 'Result: Present received swap chain ' + object + '. A slot number locates a pointer; it is not a universal function address.');
    }),
  'handoff-draw-bound-state': model('Identical draw arguments, different bound state',
    'Choose a world or UI pass. One illustrative fragment has depth 0.8 over stored depth 0.3; the pass chooses its texture and depth comparison.',
    ['arguments = DrawIndexed(6, 0, 0)', 'bind the selected pass state', 'incoming_depth = 0.8; stored_depth = 0.3', 'test according to the bound comparison', 'write the pass color only if accepted', 'report what the arguments did not identify'],
    [select('pass', 'Bound pass', 'world', [['world', 'Character texture; LESS depth test'], ['ui', 'UI texture; ALWAYS comparison']])], (r, { pass }) => {
      r.add(0, 'Both submissions use six indices and the same offsets.', { indices: 6, start_index: 0, base_vertex: 0, pixel: 'earlier background' });
      r.add(1, 'The context supplies information outside the draw arguments.', { texture: pass === 'world' ? 'character' : 'UI', comparison: pass === 'world' ? 'LESS' : 'ALWAYS' });
      r.add(2, 'The fragment’s depth is0.8 and the earlier depth is0.3.', { incoming_depth: 0.8, stored_depth: 0.3 });
      const accepted = pass === 'ui'; r.add(3, accepted ? 'ALWAYS accepts this fragment.' : '0.8 is not less than 0.3, so this fragment fails.', { accepted });
      r.add(4, 'Only an accepted fragment updates this model’s pixel.', { pixel: accepted ? 'UI color' : 'earlier background' });
      r.add(5, 'Result: ' + (accepted ? 'a UI-colored pixel.' : 'the earlier pixel remains.') + ' Identical index arguments did not establish identical pixels or an object category.');
    }),
  'handoff-menu-wrap': model('Move a menu cursor through its boundary',
    'Choose a row and direction in an illustrative four-row menu. Handle the wrap before using an index.',
    ['rows = 4; cursor = selected_row', 'delta = -1 for up, +1 for down', 'shifted = cursor + delta + rows', 'next = shifted % rows', 'cursor = next', 'highlight the valid selected row'],
    [range('cursor', 'Starting row', 0, 3, 0), select('direction', 'Direction', 'up', [['up', 'Up'], ['down', 'Down']])], (r, { cursor, direction }) => {
      const delta = direction === 'up' ? -1 : 1; r.add(1, 'Calculate the direction using a signed temporary value.', { delta });
      const shifted = cursor + delta + 4; r.add(2, 'Add the row count before taking the remainder, keeping this intermediate nonnegative.', { shifted });
      const next = shifted % 4; r.add(3, 'The remainder selects a row from zero through three.', { next });
      r.add(4, 'Store the checked row.', { selected_row: next }, memory('Menu rows', [0, 1, 2, 3].map(n => ['row ' + n, n === next ? 'selected' : 'unselected'])));
      r.add(5, 'Result: row ' + cursor + ' moves ' + direction + ' to row ' + next + '. Wrapping did not create an unsigned underflow or an out-of-list index.');
    }),
  'handoff-shared-snapshot': model('A wake-up does not protect a shared record',
    'Choose whether both reader and writer use a mutex. This scheduled two-field example shows why an event alone cannot prevent a mixed copy.',
    ['record = {health: 100, gold: 80}', 'reader attempts to copy health', 'writer updates health and gold together', 'reader attempts to copy gold', 'release the shared mutex if used', 'publish only the copied observation'],
    [select('coordination', 'Shared-record protection', 'mutex', [['mutex', 'Both sides hold the same mutex'], ['event', 'Wake-up event only']])], (r, { coordination }) => {
      let health = 100, gold = 80; const mem = () => memory('Shared fields', [['health', health], ['gold', gold]]);
      r.add(0, 'Begin with an intact old record.', { copied_health: 'not copied', copied_gold: 'not copied' }, mem());
      if (coordination === 'mutex') {
        r.add(1, 'The reader holds the mutex while copying both fields; the writer waits.', { copied_health: 100 }, mem());
        r.add(3, 'Copy gold before releasing the same lock.', { copied_gold: 80 }, mem());
        r.add(4, 'The reader releases the mutex; the writer can now proceed.');
        health = 80; gold = 60; r.add(2, 'The waiting writer publishes its complete newer record.', {}, mem());
      } else {
        r.add(1, 'The reader copies the old health without excluding the writer.', { copied_health: 100 }, mem());
        health = 80; gold = 60; r.add(2, 'The writer changes both fields between the two reads.', {}, mem());
        r.add(3, 'The reader now copies the newer gold.', { copied_gold: 60 }, mem());
      }
      r.add(5, coordination === 'mutex' ? 'Result: copied health 100 and gold 80 belong to the same protected record.' : 'Result: copied health 100 and gold 60 never existed together in this model. A wake-up event did not make the copy atomic.', { consistent: coordination === 'mutex' });
    }),
  'handoff-pipe-fragments': model('One byte-stream message can arrive in pieces',
    'Change the first read size for an eight-byte payload. A byte-mode pipe has no promise that one read fills the whole request.',
    ['promised_payload_bytes = 8', 'copied = read(first_fragment)', 'remaining = promised_payload_bytes - copied', 'read again until remaining == 0', 'parse only the complete bounded payload', 'report read calls and assembled bytes'],
    [range('first', 'Bytes returned by the first read', 1, 8, 3)], (r, { first }) => {
      r.add(0, 'The length prefix already promised eight payload bytes.', { expected: 8, copied: 0, read_calls: 0 });
      r.add(1, 'The first successful read supplies ' + first + ' bytes.', { copied: first, read_calls: 1 });
      const remaining = 8 - first; r.add(2, 'Keep track of the exact unfilled amount.', { remaining });
      if (remaining) r.add(3, 'In this illustration the next read fills the remaining ' + remaining + ' bytes. Real code loops until full or an error.', { copied: 8, remaining: 0, read_calls: 2 });
      r.add(4, 'The parser receives the complete eight-byte payload, not its first fragment.', { parsed: true });
      r.add(5, 'Result: eight bytes assembled in ' + (remaining ? 2 : 1) + ' read call(s). A disconnected or malformed sender must fail instead of inventing missing bytes.');
    }),
  'handoff-archive-containment': model('Check an archive entry before staging bytes',
    'Choose an archived name and decompressed size. The example retains the lesson’s64 MiB per-entry limit and writes only into a private staging folder.',
    ['root = private staging directory', 'validate the entry name components', 'check declared decompressed size <= 64 MiB', 'count actual bytes while copying', 'accept only the complete bounded entry', 'report staged bytes without installing them'],
    [select('path', 'Archive entry name', 'safe', [['safe', 'textures/grass.png'], ['parent', '../outside.txt'], ['absolute', '/outside.txt']]), range('declared', 'Declared decompressed MiB', 0, 80, 32), range('size', 'Actual decompressed MiB', 0, 80, 32)], (r, { path, size, declared }) => {
      const enclosed = path === 'safe'; r.add(1, enclosed ? 'The relative name stays within the chosen staging root in this fixture.' : 'Reject parent traversal or an absolute name before creating output.', { enclosed, staged_mib: 0 });
      const within_limit = declared <= 64; r.add(2, 'Compare declared size ' + declared + ' with 64 MiB.', { within_limit });
      r.add(3, 'A real extractor counts output even if declared sizes look acceptable.', { actual_mib: size });
      const accepted = enclosed && within_limit && size <= 64; r.add(4, accepted ? 'The complete entry fits both checks.' : 'An invalid entry cannot become an installed file.', { accepted, staged_mib: accepted ? size : 0 });
      r.add(5, 'Result: ' + (accepted ? size + ' MiB staged for later format and manifest validation.' : 'entry rejected and staging discarded.') + ' Passing one path check alone does not approve an entire archive.');
    }),
  'handoff-envelope-context': model('Authenticated context belongs to one envelope',
    'Change the requested save slot or the assumed byte-authentication result. This demonstrates protocol decisions; it does not implement encryption or calculate a tag.',
    ['saved_context = slot 3, format 1', 'requested_context = selected_slot, format 1', 'compare the contexts used by authentication', 'combine with the assumed byte-tag result', 'return plaintext only after authentication', 'report failure without partial plaintext'],
    [select('slot', 'Slot claimed while opening', '3', [['3', 'Original slot 3'], ['4', 'Different slot 4']]), select('tag', 'Assumed authentication of ciphertext bytes', 'valid', [['valid', 'Bytes and tag verify'], ['invalid', 'Bytes or tag fail verification']])], (r, { slot, tag }) => {
      r.add(1, 'The stored envelope was sealed with readable context slot 3, format 1.', { saved_context: 'slot 3:format 1', requested_context: 'slot' + slot + ':format 1', plaintext: 'not returned' });
      const context_matches = slot === '3'; r.add(2, 'A different context must not be substituted silently.', { context_matches });
      const authenticated = context_matches && tag === 'valid'; r.add(3, 'This teaching model takes the byte-tag result as an input; a real AEAD implementation computes and checks it.', { authenticated });
      r.add(4, authenticated ? 'Release the illustrative saved data only after the whole check succeeds.' : 'Keep all plaintext unavailable.', { plaintext: authenticated ? 'fixture saved data' : 'not returned' });
      r.add(5, authenticated ? 'Result: the original context and assumed valid bytes permit opening.' : 'Result: opening fails; no partial plaintext is returned. This model establishes a control path, not cryptographic security.');
    }),
  'handoff-lua-sequence': model('A sequence hole ends ipairs early',
    'Choose whether key 2 exists. This models the iteration order, not Lua’s private table layout.',
    ['items = { [1]="A", [2]="B", [3]="C" }', 'if selected: items[2] = nil', 'index = 1', 'while items[index] exists: visit it', 'index = index + 1; repeat', 'stop at the first missing index'],
    [select('hole', 'Key 2', 'present', [['present', 'Present'], ['missing', 'Missing']])], (r, { hole }) => {
      const values = ['A', hole === 'present' ? 'B' : 'nil', 'C']; r.add(1, 'Setting a sequence entry to nil removes that key.', { visited: '', index: 1 }, memory('Logical table entries', values.map((v, i) => [String(i + 1), v])));
      const visited = [];
      for (let i = 0; i < values.length && values[i] !== 'nil'; i++) {
        visited.push(values[i]); r.add(3, 'Visit key' + (i + 1) + ': ' + values[i] + '.', { visited: visited.join(', '), index: i + 1 });
        r.add(4, 'Advance to the next numeric key.', { index: i + 2 });
      }
      r.add(5, 'Result: visited ' + visited.join(', ') + '. ' + (hole === 'missing' ? 'Key 3 still exists, but ipairs stops at missing key 2.' : 'The next missing key is 4.'));
    }),
  'handoff-script-commit': model('A script proposes; the host commits',
    'Choose a successful script, an error, or a changed snapshot. Prepared requests have no effect until the host accepts the complete plan.',
    ['copy snapshot version 17', 'script prepares one selection request', 'wait for script execution to finish', 'check result and current snapshot version', 'commit only the accepted plan', 'report actual host changes'],
    [select('outcome', 'Execution boundary', 'ok', [['ok', 'Script succeeds; version 17 remains'], ['error', 'Script fails after preparing request'], ['stale', 'Script succeeds; current version 18']])], (r, { outcome }) => {
      r.add(0, 'The host supplies copied data, not live game pointers.', { snapshot_version: 17, changes: 0, pending: 0 });
      r.add(1, 'Preparing a request is ordinary data construction.', { pending: 1 });
      r.add(2, 'Return to the host before considering effects.', { script_succeeded: outcome !== 'error' });
      const version = outcome === 'stale' ? 18 : 17; const accepted = outcome === 'ok';
      r.add(3, 'Compare the recorded version with the current owner’s version and require successful execution.', { current_version: version, accepted });
      r.add(4, accepted ? 'The host accepts this current request.' : 'Discard the plan rather than applying stale or half-failed work.', { changes: accepted ? 1 : 0, pending: 0 });
      r.add(5, 'Result: ' + (accepted ? 'one accepted host change.' : 'no host change.') + ' Language conversion alone did not establish action validity.');
    }),
  'handoff-tape-increment': model('Carry one through a binary tape',
    'Change the four-bit number. The lesson’s three transition cases write symbols one cell at a time; leading carry can create a new digit.',
    ['state = carry; head = rightmost digit', 'read the current symbol', 'if symbol == 1: write 0; move left', 'if symbol == 0: write 1; state = done', 'if symbol is blank: write 1; state = done', 'halt in done; read the resulting number'],
    [range('number', 'Starting number', 0, 15, 11)], (r, { number }) => {
      const tape = ['_', ...number.toString(2).padStart(4, '0')]; let head = 4;
      const mem = () => memory('Tape cells; current head is marked', tape.map((v, i) => [String(i), v, i === head ? 'head' : '']));
      r.add(0, 'Start in carry at the rightmost digit.', { state: 'carry', head, tape: tape.join('') }, mem());
      while (tape[head] === '1') {
        r.add(1, 'The head reads 1, so this carry is not finished.', {}, mem());
        tape[head] = '0'; head -= 1;
        r.add(2, 'Write 0 and move one cell left with the carry still active.', { head, tape: tape.join('') }, mem());
      }
      const blank = tape[head] === '_'; tape[head] = '1';
      r.add(blank ? 4 : 3, blank ? 'The carry reached the leading blank; write a new 1.' : 'The head found 0; write 1 and consume the carry.', { state: 'done', tape: tape.join('') }, mem());
      r.add(5, 'Result: ' + number + ' becomes ' + (number + 1) + ', represented by ' + tape.join('').replace('_', '') + '. Done has no further transition.', { result: number + 1 }, mem());
    }),
  'handoff-cycle-reachability': model('A cycle can keep counts positive without a root',
    'Keep or remove the root to table A. Tables A and B hold strong references to each other in this small ownership model.',
    ['root -> A; A -> B; B -> A', 'count strong references to each table', 'optionally remove the external root', 'count references again', 'trace reachable objects starting from roots', 'compare reachability with reference counts'],
    [select('root', 'External root', 'removed', [['kept', 'Keep the root'], ['removed', 'Remove the root']])], (r, { root }) => {
      r.add(1, 'A has a root reference plus B’s reference; B has A’s reference.', { refs_A: 2, refs_B: 1, reachable_A: true, reachable_B: true });
      const kept = root === 'kept'; r.add(2, kept ? 'The external root remains.' : 'Remove only the external reference; the cycle remains.', { external_roots: kept ? 1 : 0 });
      r.add(3, 'Neither cycle edge disappears when the root is removed.', { refs_A: kept ? 2 : 1, refs_B: 1 });
      r.add(4, kept ? 'Tracing follows the root to A and then its edge to B.' : 'No root reaches either table.', { reachable_A: kept, reachable_B: kept });
      r.add(5, kept ? 'Result: both tables are reachable and still needed by the root.' : 'Result: both counts are 1, yet neither table is reachable. A tracing collector can reclaim this unreachable cycle.', { reclaimable_by_tracing: !kept });
    }),
  'handoff-shared-upvalue': model('Two closures must share one captured counter',
    'Choose the real shared-cell behavior or an intentionally wrong copy. Observe how the second closure sees the first closure’s update.',
    ['count = 0', 'make closures A and B capture count', 'A increments its captured value', 'A returns that value', 'B increments its captured value', 'B returns; compare captured storage'],
    [select('storage', 'Captured storage', 'shared', [['shared', 'One shared upvalue cell'], ['copied', 'Separate copies: deliberately wrong']])], (r, { storage }) => {
      r.add(1, 'Both closures initially observe zero.', { cell_A: 0, cell_B: 0 });
      r.add(2, 'Closure A increments its cell.', { cell_A: 1, cell_B: storage === 'shared' ? 1 : 0 });
      r.add(3, 'Closure A returns 1.', { returned_A: 1 });
      const result = storage === 'shared' ? 2 : 1;
      r.add(4, storage === 'shared' ? 'Closure B sees the already updated shared 1 and increments it to 2.' : 'The wrong copied cell still contains 0, so B increments it to 1.', { cell_A: storage === 'shared' ? 2 : 1, cell_B: result });
      r.add(5, 'Result: A returned 1; B returned ' + result + '. ' + (storage === 'shared' ? 'Both closures refer to the same final cell.' : 'Copying broke the shared-variable behavior.'), { returned_B: result });
    }),
  'handoff-runtime-lifetime': model('A layout does not keep an object at an address',
    'Choose an illustrative collector and a lifetime event. The nonmoving case is one separate allocation, not a resizable container.',
    ['object begins at address 0x1000', 'remember address and field offset 8', 'apply the selected lifetime event', 'resolve the current object identity', 'compare the remembered address', 'read only through a still-valid identity'],
    [select('collector', 'Collector in this model', 'moving', [['moving', 'Compacting collector'], ['nonmoving', 'Nonmoving allocation']]), select('event', 'Event', 'collect', [['collect', 'Collection while object stays alive'], ['destroy', 'Object destroyed']])], (r, { collector, event }) => {
      r.add(1, 'The remembered field address is0x1008.', { remembered_base: '0x1000', remembered_field: '0x1008' });
      const alive = event !== 'destroy', base = alive ? collector === 'moving' ? 0x2000 : 0x1000 : null;
      r.add(2, !alive ? 'The object’s lifetime ends.' : collector === 'moving' ? 'This collection moves the object to0x2000.' : 'This object remains at 0x1000 for this event.', { alive, current_base: base === null ? 'none' : hex(base) });
      r.add(3, 'Resolve identity again instead of treating the old readable number as ownership.', { current_field: base === null ? 'none' : hex(base + 8) });
      const remembered_valid = base === 0x1000; r.add(4, 'The stored pointer is valid only if it still identifies the live allocation.', { remembered_valid });
      r.add(5, 'Result: ' + (!alive ? 'no read: the object is gone.' : remembered_valid ? 'this old address remains valid for this event.' : 'use the newly resolved field at 0x2008.') + ' The unchanged offset never guaranteed lifetime or location.');
    }),
  'handoff-layout-update': model('An inserted field shifts only later fields',
    'Choose how many aligned bytes are inserted before health in a toy layout. The old offset can remain readable while naming another field.',
    ['old health offset = 8; position offset = 0', 'insert selected bytes before health', 'new health offset = 8 + inserted_bytes', 'compare the old offset with the new access', 'recover the offset from the health writer', 'keep earlier fields and build identity separate'],
    [select('inserted', 'Inserted bytes', '4', [['0', 'No insertion'], ['4', 'One four-byte field'], ['8', 'Two four-byte fields']])], (r, { inserted }) => {
      const n = Number(inserted); r.add(1, 'Insert fields after position and before health.', { old_health_offset: 8, position_offset: 0, old_profile_build: 'A', current_build: n ? 'B' : 'A' });
      const newOffset = 8 + n; r.add(2, 'This simplified aligned layout moves health by ' + n + ' bytes.', { new_health_offset: newOffset });
      r.add(3, n ? 'The old offset now names an inserted field that happens to contain60.' : 'With no insertion, the old access still names health.', { old_offset_read: n ? 60 : 80, actual_health: 80, profile_matches: n === 0 });
      r.add(4, 'A controlled health change identifies the writer’s new field access.', { recovered_health_offset: newOffset });
      r.add(5, 'Result: health is at+' + newOffset + ', position stays at +0. ' + (n ? 'Adding the same shift to every old offset would corrupt the earlier position access.' : 'The old layout remains valid for this unchanged build.'));
    }),
  'handoff-handle-mask': model('An issued handle carries specific rights',
    'Choose query-only or query-plus-read, then choose the requested operation. This models one right check, not the entire Windows authorization procedure.',
    ['granted = selected_handle_mask', 'needed = selected_operation_right', 'intersection = granted & needed', 'allowed = intersection == needed', 'perform only the allowed operation', 'report the issued authority'],
    [select('handle', 'Granted handle rights', 'read', [['query', 'Query 0x1000'], ['read', 'Query 0x1000 plus read 0x0010']]), select('operation', 'Requested operation', 'read', [['query', 'Limited query'], ['read', 'Memory read']])], (r, { handle, operation }) => {
      const granted = handle === 'read' ? 0x1010 : 0x1000, needed = operation === 'read' ? 0x10 : 0x1000;
      r.add(0, 'These masks were fixed when this illustrative handle was issued.', { granted: hex(granted) });
      r.add(1, 'The selected operation needs this right.', { needed: hex(needed) });
      const intersection = granted & needed; r.add(2, 'AND keeps rights that both masks contain.', { intersection: hex(intersection) });
      const allowed = intersection === needed; r.add(3, 'All needed bits must remain.', { allowed });
      r.add(4, allowed ? 'The right check permits this operation.' : 'Reject the operation; the handle cannot acquire the missing bit during the call.', { operation_performed: allowed });
      r.add(5, 'Result: ' + operation + ' ' + (allowed ? 'permitted by this mask.' : 'denied by this mask.') + ' A PID or correct build name does not supply a missing right.');
    }),
  'handoff-page-read': model('A readable query can become a failed read',
    'Choose page metadata and whether it changes after querying. The live process continues running between those two operations.',
    ['query the page region', 'require committed, readable, non-guarded', 'process may change the mapping', 'attempt a bounded read if eligible', 'accept copied bytes only on success', 'report skipped, failed, or copied'],
    [select('page', 'Queried region', 'readable', [['readable', 'Committed and readable'], ['reserved', 'Reserved only'], ['guard', 'Guard page']]), select('change', 'After the query', 'stable', [['stable', 'Mapping stays readable'], ['removed', 'Mapping becomes unreadable']])], (r, { page, change }) => {
      r.add(0, 'The metadata describes the query moment.', { copied_bytes: 0, status: 'queried' });
      const eligible = page === 'readable'; r.add(1, eligible ? 'This region is eligible for a read.' : 'Skip the reserved or guarded region.', { eligible });
      r.add(2, change === 'removed' ? 'The target changes the mapping after the query.' : 'The mapping stays stable for this trial.', { live_readable: eligible && change === 'stable' });
      const copied = eligible && change === 'stable';
      r.add(3, !eligible ? 'No read is attempted.' : copied ? 'The bounded four-byte read succeeds.' : 'The attempted read fails normally; metadata was not a reservation.', { status: !eligible ? 'skipped' : copied ? 'copied' : 'read failed' });
      r.add(4, 'Use only successfully copied bytes.', { copied_bytes: copied ? 4 : 0 });
      r.add(5, 'Result: ' + (!eligible ? 'skipped.' : copied ? 'four bytes copied.' : 'read failed.') + ' The scanner must handle a mapping race even after checking page metadata.');
    }),
  'handoff-dump-content': model('A snapshot captures a calculation at one moment',
    'Choose capture before or after a pending store. The invented calculation has75 in memory and80 in a register; the dump records selected state, not earlier history.',
    ['memory = 75; register = 80', 'choose the capture moment', 'if after store: memory = register', 'copy selected memory and register state', 'save this captured state', 'explain what this snapshot cannot establish'],
    [select('moment', 'Capture moment', 'before', [['before', 'Before the pending store'], ['after', 'After the store']])], (r, { moment }) => {
      r.add(0, 'The calculation’s temporary result has not yet been stored.', { live_memory: 75, live_register: 80 });
      r.add(1, 'Capture at the selected boundary.', { moment });
      const stored = moment === 'after' ? 80 : 75; r.add(2, moment === 'after' ? 'The store executes before capture.' : 'The store has not executed when capture begins.', { live_memory: stored });
      r.add(3, 'Copy the selected state into the diagnostic file.', { saved_memory: stored, saved_register: 80 });
      r.add(4, 'The saved values remain available after this model process exits.', { saved: true });
      r.add(5, 'Result: dump memory=' + stored + ', register=80. A memory-only view would omit the temporary result; this snapshot alone cannot reconstruct the preceding event history.');
    }),
  'handoff-module-identity': model('The same DLL name can identify different bytes',
    'Choose two invented installations. Their identical basename is only one field of the module evidence record.',
    ['basename = zlib1.dll', 'read the selected loaded path', 'record this build fingerprint and architecture', 'record its loaded range', 'compare the full identity with the baseline', 'report which evidence changed'],
    [select('installation', 'Loaded installation', 'A', [['A', 'Known installation A'], ['B', 'Different installation B']])], (r, { installation }) => {
      r.add(0, 'Both records begin with the same name.', { basename: 'zlib1.dll' });
      r.add(1, 'The process inventory supplies the actual loaded path.', { path: '/fixture/' + installation + '/zlib1.dll' });
      r.add(2, 'Fingerprint labels are illustrative records, not computed cryptographic digests.', { fingerprint: 'recorded-build-' + installation, architecture: '32-bit' });
      const base = installation === 'A' ? 0x1000 : 0x6000; r.add(3, 'This run has a specific loaded range.', { base: hex(base), end: hex(base + 0x1000) });
      r.add(4, 'Compare the complete record rather than accepting the basename.', { matches_baseline: installation === 'A' });
      r.add(5, installation === 'A' ? 'Result: this fixture matches its baseline identity.' : 'Result: path and fingerprint differ despite the same name. Investigate the change; a difference alone does not establish malicious behavior.');
    }),
  'handoff-optional-api': model('Missing capability is different from a failed call',
    'Choose export presence and the call result. A documented missing API uses a defined fallback; an error from a present API remains an error.',
    ['look up the documented export', 'if absent: choose the labelled fallback', 'otherwise call the typed function', 'check its actual return result', 'record result source and limitations', 'return a value or an explicit error'],
    [select('export', 'Documented export', 'present', [['present', 'Present'], ['absent', 'Absent']]), select('call', 'Present API’s result', 'ok', [['ok', 'Query succeeds'], ['denied', 'Access denied']])], (r, { export: availability, call }) => {
      r.add(0, 'Feature detection checks the capability itself.', { present: availability === 'present', called: false });
      if (availability === 'absent') {
        r.add(1, 'Use the fixture’s ToolHelp fallback; do not call an unresolved pointer.', { source: 'module snapshot', result: 'fixture path' });
        r.add(4, 'The path came from a moment-in-time module observation.', { limitation: 'module can change after snapshot' });
      } else {
        r.add(2, 'Call the resolved function with its documented signature.', { called: true, source: 'documented query' });
        r.add(3, call === 'ok' ? 'The query returned the path.' : 'The query reports denial; presence was not permission.', { result: call === 'ok' ? 'fixture path' : 'access error' });
        r.add(4, 'Keep the API result and its source visible.', { limitation: 'call can fail despite presence' });
      }
      r.add(5, 'Result: ' + (availability === 'absent' ? 'labelled snapshot fallback.' : call === 'ok' ? 'successful documented query.' : 'explicit query error.') + ' Export presence and operation success are separate checks.');
    }),
  'handoff-ioctl-fields': model('Pack and unpack four control-code fields',
    'Change access or the function number in an invented private device code. Shifts place fields; masks recover them. This does not send a driver request.',
    ['device_type = 0x8000; method = 0', 'place device_type in bits 16..31', 'place access in bits 14..15', 'place function in bits 2..13', 'combine the nonoverlapping fields', 'extract fields again and compare'],
    [select('access', 'Access field', '1', [['0', 'Any0'], ['1', 'Read1'], ['2', 'Write2'], ['3', 'Read and write3']]), range('function', 'Private function number', 2048, 2052, 2048)], (r, { access, function: fn }) => {
      const a = Number(access), d = 0x8000 * 65536;
      r.add(1, 'The high 16 bits hold the device type.', { device_part: hex(d) });
      const ap = a * 16384; r.add(2, 'Two access bits start at bit 14.', { access_part: hex(ap) });
      const fp = fn * 4; r.add(3, 'The 12-bit function field starts at bit 2; the two method bits remain zero.', { function_part: hex(fp), method: 0 });
      const code = (d + ap + fp) >>> 0; r.add(4, 'Combine fields that occupy different bit positions.', { control_code: hex(code) });
      r.add(5, 'Result: ' + hex(code) + ' extracts device 0x8000, access ' + a + ', function ' + fn + ', method 0. Packing did not itself grant the caller access.', { decoded_device: code >>> 16, decoded_access: code >>> 14 & 3, decoded_function: code >>> 2 & 4095, decoded_method: code & 3 });
    }),
  'handoff-address-translation': model('The address-space root changes the answer',
    'Choose a page-table root and page in a tiny illustrative mapping. A virtual address needs its process map; an unmapped page has no invented RAM location.',
    ['select the address-space root', 'split virtual page and byte offset', 'look up the page in that root’s map', 'reject if the entry is absent', 'physical = frame * 4096 + offset', 'report the mapping and its owner'],
    [select('root', 'Page-table root', 'A', [['A', 'ProcessA root'], ['B', 'ProcessB root']]), range('page', 'Virtual page number', 0, 3, 1), range('offset', 'Byte offset in the page', 0, 4095, 26)], (r, { root, page, offset }) => {
      const maps = { A: [5, 7, null, 2], B: [9, 3, 8, null] };
      r.add(0, 'These four-entry maps illustrate context; they are not full x86 page tables.', { virtual_address: hex(page * 4096 + offset) });
      r.add(1, 'With 4 KiB pages, the offset must remain within 0..4095.', { virtual_page: page, byte_offset: offset });
      const frame = maps[root][page]; r.add(2, 'Use the selected root rather than a global mapping.', { physical_frame: frame === null ? 'absent' : frame });
      if (frame === null) { r.add(3, 'Stop before a physical read because this page is absent.', { physical_address: 'none' }); r.add(5, 'Result: virtual page ' + page + ' is unmapped under root ' + root + '.'); return; }
      const physical = frame * 4096 + offset; r.add(4, 'Combine the mapped frame and unchanged offset.', { physical_address: hex(physical) });
      r.add(5, 'Result: root ' + root + ' maps the virtual address to ' + hex(physical) + '. Choosing another valid root can give a different valid answer.');
    }),
  'handoff-capture-validation': model('A successful walk still needs the intended object',
    'Change the capture build or object identity. The illustrative translation succeeds in every case, exposing the separate evidence checks.',
    ['walk the saved page tables', 'check the recorded capture build', 'check the selected object identity', 'check field relationships', 'accept only when all evidence agrees', 'report translated versus validated'],
    [select('build', 'Capture build', 'expected', [['expected', 'Expected build'], ['other', 'Different build']]), select('identity', 'Object reached', 'expected', [['expected', 'Expected entity'], ['other', 'Other entity with plausible fields']])], (r, { build, identity }) => {
      r.add(0, 'This model always reaches mapped physical address 0x7020.', { translated: true, physical: '0x7020' });
      r.add(1, 'Compare provenance with the layout profile.', { build_matches: build === 'expected' });
      r.add(2, 'A plausible health value does not identify the entity.', { identity_matches: identity === 'expected' });
      r.add(3, 'The toy health 80 and maximum 100 satisfy their relation in both objects.', { health: 80, maximum: 100, fields_plausible: true });
      const accepted = build === 'expected' && identity === 'expected'; r.add(4, 'Translation is only one stage of validation.', { accepted });
      r.add(5, accepted ? 'Result: all selected fixture checks agree; return a labelled snapshot.' : 'Result: reject the snapshot even though the page walk and health relation succeeded. Correct translation can identify the wrong thing.');
    }),
  'handoff-integrity-generation': model('A correct earlier decision can become stale',
    'Choose whether the toy record updates after verification. A generation binds the saved decision to the state it checked.',
    ['record = generation 17, health 80', 'verify and save checked_generation 17', 'optionally update record to generation 18', 'compare checked generation with current', 'consume the decision only when current', 'report whether the effect was permitted'],
    [select('update', 'Between verification and use', 'unchanged', [['unchanged', 'Record remains unchanged'], ['changed', 'Record updates before use']])], (r, { update }) => {
      r.add(0, 'Start with one named record.', { generation: 17, health: 80, effect: false });
      r.add(1, 'The check is correct for generation 17.', { checked_generation: 17, earlier_check: true });
      const changed = update === 'changed'; r.add(2, changed ? 'The owner changes health to 70 and advances the generation.' : 'The checked record stays unchanged.', { generation: changed ? 18 : 17, health: changed ? 70 : 80 });
      const current = !changed; r.add(3, 'Compare 17 with the current generation.', { decision_current: current });
      r.add(4, current ? 'The decision still refers to this state.' : 'Reject the stale decision before the guarded effect.', { effect: current });
      r.add(5, current ? 'Result: the current decision permits the fixture effect.' : 'Result: no effect. The old true result was not wrong when computed; its state changed before use.');
    }),
  'handoff-effect-boundary': model('The engine checks an award at the effect boundary',
    'Change engine permission or the bonus amount. The UI stays unlocked in this worked case, so its appearance cannot substitute for authorization.',
    ['ui_unlocked = true; bonus = 0', 'read engine-owned permission', 'candidate = bonus + amount', 'require permission and candidate <= 100', 'apply only the accepted candidate', 'emit the decision and final bonus'],
    [select('permission', 'Engine permits an award', 'no', [['no', 'No'], ['yes', 'Yes']]), range('amount', 'Requested bonus', 0, 150, 25)], (r, { permission, amount }) => {
      r.add(0, 'The presentation flag is true in every trial.', { ui_unlocked: true, bonus: 0 });
      const permitted = permission === 'yes'; r.add(1, 'The simulation owner supplies permission.', { engine_permission: permitted });
      r.add(2, 'Calculate the bounded integer candidate.', { candidate: amount });
      const allowed = permitted && amount <= 100; const reason = !permitted ? 'EnginePolicyDenied' : amount > 100 ? 'ValueOutOfRange' : 'Allowed';
      r.add(3, 'The decision checks the actual effect conditions.', { allowed, reason });
      r.add(4, allowed ? 'Store the accepted bonus.' : 'Keep the previous bonus unchanged.', { bonus: allowed ? amount : 0 });
      r.add(5, 'Result: ' + reason + ', bonus=' + (allowed ? amount : 0) + '. The same unlocked button appears beside both accepted and rejected effects.');
    }),
  'handoff-vm-snapshot': model('Restore the state that makes a running guest',
    'Choose a complete running checkpoint or disk-only rollback in an invented machine. Registers and device state can disagree with restored disk bytes.',
    ['checkpoint = registers 6, RAM 4, disk 2, device Idle', 'guest continues and changes each state', 'select the checkpoint contents to restore', 'restore the selected components', 'compare every component with the checkpoint', 'report whether the running state is complete'],
    [select('contents', 'Checkpoint contents restored', 'full', [['full', 'Registers, RAM, disk, and device state'], ['disk', 'Disk bytes only']])], (r, { contents }) => {
      r.add(0, 'All numbers are illustrative state values, not file sizes.', { register: 6, ram: 4, disk: 2, device: 'idle' });
      r.add(1, 'The guest executes beyond the checkpoint.', { register: 9, ram: 8, disk: 5, device: 'pending interrupt' });
      r.add(2, contents === 'full' ? 'Restore every selected running-machine component.' : 'A disk rollback selects only persistent bytes.');
      const full = contents === 'full'; r.add(3, 'Apply the selected rollback.', { register: full ? 6 : 9, ram: full ? 4 : 8, disk: 2, device: full ? 'idle' : 'pending interrupt' });
      r.add(4, 'Disk agrees in both cases; running state agrees only in the complete checkpoint.', { complete: full });
      r.add(5, full ? 'Result: all illustrated guest state matches the checkpoint.' : 'Result: old disk bytes are combined with newer running state. A disk-only snapshot is not a resume point for this running machine.');
    }),
  'handoff-nested-translation': model('Keep the page offset through two mappings',
    'Change the final host frame or byte offset. Guest virtual, guest physical, and host physical addresses remain separately named.',
    ['guest_virtual_page = 0x403', 'split the selected 12-bit offset', 'guest table maps page0x403 to frame 0x17', 'hypervisor maps frame 0x17 to host frame', 'combine host frame and unchanged offset', 'report all three addresses'],
    [select('frame', 'Host physical frame', '164', [['164', 'Frame 0xA4'], ['180', 'Frame 0xB4']]), range('offset', 'Offset within the page', 0, 4095, 2604)], (r, { frame, offset }) => {
      const host = Number(frame); r.add(0, 'These addresses follow one small worked mapping, not a full hardware page walk.', { guest_virtual: hex(0x403000 + offset) });
      r.add(1, 'The lowest 12 bits select the byte within its 4 KiB page.', { offset: hex(offset) });
      r.add(2, 'The guest’s tables select guest physical frame 0x17.', { guest_physical: hex(0x17000 + offset) });
      r.add(3, 'The hypervisor supplies a separate second-stage frame.', { host_frame: hex(host) });
      r.add(4, 'The second mapping changes the frame, not the within-page byte position.', { host_physical: hex(host * 4096 + offset) });
      r.add(5, 'Result: GVA ' + hex(0x403000 + offset) + ' -> GPA ' + hex(0x17000 + offset) + ' -> HPA ' + hex(host * 4096 + offset) + '. Both mapping owners matter.');
    }),
  'handoff-jtag-shift': model('Captured pin bits leave through one wire',
    'Change the four-bit captured value and incoming bit. Four clocks shift out the original low bit first while loading a new pattern.',
    ['capture selected 4-bit pin pattern', 'out = register & 1', 'register = register >> 1', 'put incoming bit in position 3', 'repeat for four clocks', 'report outgoing bits and new register'],
    [range('pattern', 'Captured pattern as a number', 0, 15, 13), select('incoming', 'Incoming bit on each clock', '0', [['0', 'Zero'], ['1', 'One']])], (r, { pattern, incoming }) => {
      let value = pattern; const output = [], bit = Number(incoming);
      const mem = () => memory('Four shift-register cells', [3, 2, 1, 0].map(i => ['b' + i, value >>> i & 1]));
      r.add(0, 'The four captured cells are shown from high bit to low bit.', { register: value, outgoing: '' }, mem());
      for (let clock = 1; clock <= 4; clock++) {
        const out = value & 1; output.push(out); r.add(1, 'Clock ' + clock + ' emits the old low bit ' + out + '.', { clock, outgoing: output.join('') }, mem());
        value >>>= 1; r.add(2, 'Move the remaining bits toward the output.', { register: value }, mem());
        value |= bit << 3; r.add(3, 'Insert the chosen new bit at the high end.', { register: value }, mem());
      }
      r.add(5, 'Result: outgoing ' + output.join('') + ', new register=' + value.toString(2).padStart(4, '0') + '. The original pattern left low bit first.', {}, mem());
    }),
  'handoff-bypass-chain': model('A test bit measures a chain of one-bit registers',
    'Change the chip count. All chips are assumed to be in BYPASS already; this traces their one-bit data path, not the full TAP state machine.',
    ['each chip contributes one zero bit', 'send one 1 through TDI, then zeros', 'sample the old last cell at TDO', 'shift every chip from its old neighbor', 'count zero outputs before the pulse', 'report the serial chain delay'],
    [range('chips', 'Chips in BYPASS', 1, 4, 2)], (r, { chips }) => {
      let cells = Array(chips).fill(0); let zeroOutputs = 0, out = 0;
      const mem = () => memory('One BYPASS cell per chip', cells.map((v, i) => ['chip ' + (i + 1), v, i === chips - 1 ? 'nearest TDO' : '']));
      r.add(0, 'The cells start at zero; chip 1 is nearest TDI.', { zero_outputs: 0 }, mem());
      for (let clock = 1; clock <= chips + 1; clock++) {
        const incoming = clock === 1 ? 1 : 0; r.add(1, 'Clock ' + clock + ' drives TDI=' + incoming + '.', { clock, incoming }, mem());
        out = cells[chips - 1]; r.add(2, 'Sample the old last cell at the output.', { tdo: out }, mem());
        cells = [incoming, ...cells.slice(0, -1)]; r.add(3, 'Every cell takes its old neighbor, so the pulse advances one chip.', {}, mem());
        if (!out) zeroOutputs += 1; r.add(4, 'Count the zero outputs before the first 1.', { zero_outputs: zeroOutputs }, mem());
      }
      r.add(5, 'Result: ' + zeroOutputs + ' zero samples precede the pulse, showing ' + chips + ' serial BYPASS cells in this sampling convention.', { inferred_chips: zeroOutputs }, mem());
    }),
  'handoff-emulator-step': model('An emulator performs one guest add instruction',
    'Change the immediate operand in the lesson’s invented 8-bit CPU. The host follows the guest encoding; no real game or lab program is executed.',
    ['PC = 0x04; A = 10', 'opcode = memory[PC]', 'operand = memory[PC + 1]', 'decode 0x03 as ADD immediate', 'A = (A + operand) modulo 256; PC += 2', 'report the accumulator and next fetch'],
    [range('operand', 'Immediate operand', 0, 255, 5)], (r, { operand }) => {
      const mem = () => memory('Guest instruction bytes', [['0x04', '03'], ['0x05', operand.toString(16).toUpperCase().padStart(2, '0')]]);
      r.add(0, 'Start at the opcode with accumulator 10.', { PC: '0x04', A: 10 }, mem());
      r.add(1, 'Fetch the opcode byte.', { opcode: '0x03' }, mem());
      r.add(2, 'Fetch the immediate byte after the opcode.', { immediate: operand }, mem());
      r.add(3, 'The made-up instruction set defines 0x03 as an immediate add.', { operation: 'ADD' });
      const result = (10 + operand) % 256; r.add(4, 'Add in the 8-bit accumulator and advance past both instruction bytes.', { A: result, PC: '0x06', mathematical_sum: 10 + operand });
      r.add(5, 'Result: A=' + result + ', next fetch at 0x06. ' + (10 + operand > 255 ? 'The 8-bit result wraps; the ordinary mathematical sum is larger.' : 'The result fits in the 8-bit register.'));
    }),
};
