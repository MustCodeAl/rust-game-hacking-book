// Lesson 9.7: hashes are symbolic fingerprints because the lesson gives no sample digest.
import { scene, cell, rect, text, note, line, group, timeline } from '../lib/scene/kit.mjs';

function contents(id, x, y, role, label, opacity = 1) {
  return group(id, x, y, [
    rect(`${id}Page`, 0, 0, 154, 104, { look: 'plain', role, r: 3 }),
    text(`${id}Label`, 12, 24, label, { size: 13 }),
    ...[0, 1, 2].map((i) => rect(`${id}Stripe${i}`, 12, 39 + i * 16, i === 1 ? 96 : 128, 7, { role, r: 0 })),
  ], { o: opacity });
}
const actors = [
  note('destination', 22, 23, 'game destination', { size: 13 }),
  note('backupLabel', 206, 23, 'preserved original', { size: 13 }),
  note('receiptLabel', 390, 23, 'manifest', { size: 13 }),
  contents('old', 22, 45, 'input', 'original file'),
  contents('backupFile', 22, 45, 'input', 'original file', 0),
  contents('mod', 22, 190, 'process', 'mod replacement', 0),
  contents('restore', 206, 45, 'input', 'temporary restore', 0),
  rect('receipt', 390, 45, 174, 194, { look: 'plain', role: 'state', r: 3 }),
  text('status', 402, 73, 'Planned', { mono: true, size: 14 }),
  text('receiptData', 402, 102, ['relative destination', 'old hash', 'new hash', 'backup location'], { size: 12, mono: true }),
  cell('currentHash', 22, 159, 154, 28, 'current: old hash', { size: 11 }),
  cell('expectedHash', 206, 159, 154, 28, 'expected: old hash', { size: 11 }),
  line('comparison', 181, 173, 199, 173, { role: 'process', arrow: true, draw: 0 }),
  cell('backupHash', 206, 208, 154, 28, 'backup: old hash', { size: 11, o: 0 }),
  cell('backupExpected', 402, 208, 150, 28, 'recorded: old hash', { size: 10, o: 0 }),
  line('backupComparison', 365, 222, 395, 222, { role: 'process', arrow: true, draw: 0 }),
  note('temporaryLabel', 206, 199, 'temporary file', { size: 12, o: 0 }),
  text('result', 22, 331, 'Compare before either write.', { size: 12, role: 'muted' }),
];
const tl = timeline(actors);
tl.cue(0, 'Plan a replacement at the relative destination. Record the expected original hash, new hash, and backup location.');
tl.cue(3, 'Compute the current file hash and compare it with the planned original hash. A mismatch stops the replacement.');
tl.at(3).draw('comparison').role('currentHash', 'output').role('expectedHash', 'output').text('result', 'Original hash matches the plan.').role('result', 'output');
tl.cue(6, 'Copy the original file to its backup before replacing the destination. The manifest advances to BackedUp.');
tl.at(6).show('backupFile').move('backupFile', 206, 45, 0.7).text('status', 'BackedUp');
tl.cue(9, 'Install the planned mod file. Its contents take the game destination while the original stays in the backup.');
tl.at(9).show('mod').move('mod', 22, 45, 0.8).wait(0.85).hide('old').hide('comparison').text('currentHash', 'current: new hash').text('expectedHash', 'awaiting receipt').role('currentHash', 'process').role('expectedHash', 'state');
tl.cue(12, 'Write the manifest status Installed and keep the installed hash. That receipt describes the reached state after interruption.');
tl.at(12).text('status', 'Installed').show('comparison').text('currentHash', 'current: new hash').text('expectedHash', 'receipt: new hash').text('result', 'Backup and installed hash are recorded.');
tl.cue(16, 'Before uninstalling, verify two hashes: the current file must match the installed hash, and the backup must match the recorded original hash. A mismatch stops restoration.');
tl.at(16).role('currentHash', 'process').role('expectedHash', 'process').text('expectedHash', 'installed: new hash').show('backupHash').show('backupExpected').draw('backupComparison').text('result', 'Both expected hashes must match.');
tl.at(17).role('currentHash', 'output').role('expectedHash', 'output').role('backupHash', 'output').role('backupExpected', 'output').text('result', 'Current and backup hashes match.');
tl.cue(20, 'Copy the verified backup into a temporary restore file. Keep the destination in place while preparing its replacement.');
tl.at(20).hide('backupHash').hide('backupComparison').text('backupExpected', 'backup verified').show('temporaryLabel').show('restore').move('restore', 206, 208, 0.9).text('result', 'Copy verified backup to the temporary file.');
tl.cue(23, 'Replace the destination through the temporary file. Hash the restored output and compare it with the recorded original hash. Mark Restored only after that verification succeeds.');
tl.at(23).hide('comparison').hide('temporaryLabel').move('restore', 22, 45, 0.8).wait(0.85).hide('mod').text('restoreLabel', 'restored original').text('currentHash', 'hashing output…').text('expectedHash', 'recorded: old hash').role('currentHash', 'process').role('expectedHash', 'process').text('result', 'Replacement reached the destination; verify its hash.');
tl.at(24.7).text('currentHash', 'restored: old hash').show('comparison').role('currentHash', 'output').role('expectedHash', 'output').text('result', 'Restored output matches the original hash.');
tl.at(25).text('status', 'Restored').role('receipt', 'output');
tl.at(25.8).text('result', 'Restored output verified; manifest updated.');
export default scene({ id: 'reversible-mod', title: 'The backup and manifest give a replacement its route back', w: 588, h: 338,
  alt: 'A replacement checks the current original hash, makes a backup, installs new contents, and records the installed hash. Uninstall verifies both the current installed file and the backup original hash. It restores through a temporary file, hashes the restored output, and marks Restored only after the output matches the original hash. Hash labels are symbolic rather than sample digests.',
  caption: 'This depicts replacing an existing file. Creating a new file needs a different undo action: remove it only while its installed hash still matches.', actors, cues: tl.cues, tracks: tl.tracks });
