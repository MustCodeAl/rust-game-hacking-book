import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 11.8: both local calculations are right; the second write is stale.
import { scene, cell, text, note, path, timeline } from '../lib/scene/kit.ts';
const actors = [
	note('rewardTag', 24, 32, 'reward thread · private register', { size: 12 }),
	note('buyTag', 306, 32, 'purchase · private register', { size: 12 }),
	cell('reward', 24, 48, 138, 42, 'not read yet', { size: 14, role: 'muted' }),
	cell('purchase', 306, 48, 150, 42, 'not read yet', { size: 14, role: 'muted' }),
	text('rewardMath', 24, 117, '+ 500 reward', { mono: true, size: 12, role: 'process' }),
	text('buyMath', 306, 117, '− 300 purchase', { mono: true, size: 12, role: 'process' }),
	note('memTag', 174, 168, 'one shared gold field', { size: 12 }),
	cell('gold', 174, 181, 132, 50, '1,000', { mono: true, size: 21, role: 'state' }),
	path('readReward', 174, 206, 'M0 0L-6 0L-6 -137L-12 -137', { arrow: true, role: 'input', dash: true }),
	path('readPurchase', 306, 206, 'M0 0L-6 0L-6 -137L0 -137', { arrow: true, role: 'input', dash: true }),
	cell('copyReward', 178, 190, 84, 30, '1,000', { mono: true, size: 14, role: 'input', o: 0 }),
	cell('copyPurchase', 220, 190, 84, 30, '1,000', { mono: true, size: 14, role: 'input', o: 0 }),
	cell('writeReward', 52, 54, 82, 30, '1,500', { mono: true, size: 14, role: 'process', o: 0 }),
	cell('writePurchase', 340, 54, 82, 30, '700', { mono: true, size: 14, role: 'caution', o: 0 }),
	text('state', 24, 264, 'A read makes a local copy; it does not reserve the shared field.', { size: 12 }),
	text('expected', 24, 288, '', { mono: true, size: 13, role: 'output' }),
];
const tl = timeline(actors);
tl.cue(0, 'The shared field holds 1,000 gold. The reward thread reads it into its private register, while memory remains 1,000.');
tl.at(0.5).show('copyReward').move('copyReward', 52, 54, 1);
tl.at(1.6).hide('copyReward').text('reward', '1,000').role('reward', 'input');
tl.cue(4, 'Before the reward is written, the purchase thread also reads 1,000. Its private copy does not change when the reward thread later writes memory.');
tl.at(4).show('copyPurchase').move('copyPurchase', 340, 54, 1);
tl.at(5.1).hide('copyPurchase').text('purchase', '1,000').role('purchase', 'input');
tl.cue(8, 'The private calculations produce 1,000 + 500 = 1,500 and 1,000 − 300 = 700. Both are correct. The shared field still holds 1,000.');
tl.at(8).text('reward', '1,500').text('purchase', '700').role('reward', 'process').role('purchase', 'process').text('rewardMath', '1,000 + 500 = 1,500').text('buyMath', '1,000 − 300 = 700');
tl.at(8).text('state', 'Arithmetic changed the private registers, not memory.');
tl.cue(12, 'The reward thread copies 1,500 back into gold. The purchase register remains 700: the completed reward does not repair that earlier calculation.');
tl.at(12).show('writeReward').move('writeReward', 199, 190, 1);
tl.at(13.1).hide('writeReward').text('gold', '1,500').role('gold', 'output').role('purchase', 'caution').text('state', 'Purchase still holds 700, calculated from the earlier 1,000.');
tl.cue(16, 'The purchase writes its stale 700 last and overwrites the reward. The intended total is 1,000 + 500 − 300 = 1,200. The missing 500 is exactly the lost reward.');
tl.at(16).show('writePurchase').move('writePurchase', 199, 190, 1);
tl.at(17.1).hide('writePurchase').text('gold', '700').role('gold', 'caution').text('state', 'The last write wins, even though it used an older read.').text('expected', 'expected: 1,000 + 500 − 300 = 1,200');
export default scene({ id: 'lost-reward', title: 'Two local results race to overwrite one gold field',
	alt: 'Two threads each copy the shared gold value 1,000. One register becomes 1,500 after a 500 reward; the other becomes 700 after a 300 purchase. Writing 1,500 then the stale 700 loses the reward. The intended combined total is 1,200.',
	caption: 'A mutex makes the purchase wait and read the completed 1,500 before subtracting 300. It protects the whole read–modify–write sequence.',
	w: 480, h: 310, actors, cues: tl.cues, tracks: tl.tracks });
