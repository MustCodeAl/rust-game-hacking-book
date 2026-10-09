import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 9.2: Flare's exact build field, preserving xp and both file versions.
import { scene, cell, rect, text, note, line, group, strip, timeline } from '../lib/scene/kit.ts';

function file(id: string, x: number, values: Label[], role: Role, opacity = 1) {
  return group(id, x, 62, [
    rect(`${id}Page`, 0, 0, 176, 132, { role, look: 'plain', r: 3 }),
    text(`${id}Xp`, 12, 25, 'xp=0', { mono: true, size: 13 }),
    text(`${id}Build`, 12, 52, 'build=', { mono: true, size: 13 }),
    strip(`${id}Values`, 12, 65, values, { w: 36, h: 30, gap: 2, mono: true, size: 13, role }),
    line(`${id}Line`, 12, 113, 162, 113, { role: 'muted', width: 1 }),
  ], { o: opacity });
}
const actors = [
  note('originalPath', 22, 24, 'avatar.txt', { mono: true, size: 13 }),
  note('tempPath', 216, 24, 'temporary sibling', { size: 13 }),
  note('backupPath', 410, 24, 'backup of avatar.txt', { size: 13 }),
  file('old', 22, ['5', '1', '1', '2'], 'input'),
  file('new', 216, ['30', '30', '30', '30'], 'state', 0),
  cell('match', 22, 211, 176, 28, 'build= line not checked', { size: 11 }),
  cell('write', 216, 211, 176, 28, 'no temporary file yet', { size: 11 }),
  cell('backup', 410, 211, 176, 28, 'backup absent', { size: 11 }),
  rect('writeTrack', 226, 180, 154, 5, { role: 'muted', o: 0, r: 0 }),
  rect('writeProgress', 226, 180, 0, 5, { role: 'process', o: 0, r: 0 }),
  strip('replacement', 216, 265, ['30', '30', '30', '30'], { w: 36, h: 30, gap: 2, mono: true, size: 13, role: 'process', o: 0 }),
  note('working', 216, 257, 'replacement prepared separately', { size: 11, o: 0 }),
  text('hud', 22, 292, 'game reload: Physical 30, Mental 30, Offense 30, Defense 30', { size: 12, role: 'output', o: 0 }),
];
const tl = timeline(actors);
tl.cue(0, 'Close the game. avatar.txt still contains xp=0 and build=5,1,1,2. Keep these original bytes while preparing a replacement.');
tl.cue(3, 'Require exactly one build= line. Preserve every other line and the existing newline style.');
tl.at(3).text('match', 'exactly one build= line').role('match', 'output');
tl.cue(6, 'Prepare all four new attributes as 30. The original file is unchanged; xp remains 0.');
tl.at(6).show('working').show('replacement');
tl.cue(10, 'Write the complete replacement to a temporary sibling. Flush its bytes and close its handle before replacing the original.');
tl.at(10).show('new').show('writeTrack').show('writeProgress').resize('writeProgress', 154, 5, 1.4).move('replacement', 228, 127, 1.4).wait(1.45).hide('replacement').hide('working').text('write', 'complete; flushed; closed').role('write', 'output');
tl.cue(15, 'One replacement operation installs the complete new file and preserves the original as a backup. An existing backup would make this lab refuse.');
tl.at(15).move('old', 410, 62, 1).move('new', 22, 62, 1).hide('writeTrack').hide('writeProgress').text('write', 'temporary path removed').role('write', 'muted').text('backup', 'original bytes preserved').role('backup', 'output');
tl.cue(20, 'Reload the disposable character. All four visible attributes are 30. Keep the backup until the game has accepted and saved the edited state.');
tl.at(20).show('hud').role('newPage', 'output');
tl.at(24).role('match', 'output');
export default scene({ id: 'recoverable-save', title: 'Prepare a new save while keeping the original recoverable', w: 608, h: 310,
  alt: 'The original avatar.txt contains xp=0 and build=5,1,1,2. A separate temporary file receives xp=0 and build=30,30,30,30, is flushed and closed, then replaces the original in one operation. The original values survive in the backup. The game reload shows all four attributes as 30.',
  caption: 'File movement depicts one directory replacement, with complete old and new contents. Flushing improves durability; the backup remains available for recovery.', actors, cues: tl.cues, tracks: tl.tracks });
