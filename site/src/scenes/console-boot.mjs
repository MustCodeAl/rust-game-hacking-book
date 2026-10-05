// Lesson 14.4: its example image has version 3, 65,536 code bytes and an
// RSA-2048 key/signature (2,048 / 8 = 256 bytes each). Three set fuses mean 3.
// Later images use symbolic sizes; their signatures are checked before entry.
import { scene, cell, text, note, line, rect, poly, group, timeline } from '../lib/scene/kit.mjs';

const stages = ['ROM', 'Bootloader', 'Kernels', 'System', 'Game'];
const codeParts = (prefix, role) => Array.from({ length: 4 }, (_, i) => rect(`${prefix}${i}`, i * 17, 0, 13, 15, { role, r: 2 }));
const actors = [
	text('imageTitle', 20, 36, 'Next image: bootloader', { size: 13, role: 'input' }),
	rect('image', 20, 52, 181, 117, { role: 'input' }),
	text('imageFields', 31, 75, ['security version: 3', 'key: 256 bytes', 'code: 65,536 bytes', 'signature: 256 bytes'], { size: 12, mono: true }),
	cell('active', 235, 14, 225, 28, 'Boot ROM running', { size: 13, role: 'state' }),
	cell('trustedKey', 235, 58, 104, 30, 'fused key hash', { size: 11, role: 'state' }),
	cell('imageKey', 349, 58, 111, 30, 'image key hash', { size: 11, look: 'ghost' }),
	line('keyCompare', 341, 73, 347, 73, { role: 'process', arrow: true, draw: 0 }),
	text('keyResult', 235, 112, 'Compare before trusting the key.', { size: 12, role: 'process' }),
	cell('codeHash', 235, 136, 104, 30, 'hash(header+code)', { mono: true, size: 10, look: 'ghost' }),
	cell('signatureCheck', 355, 136, 105, 30, 'check signature', { size: 11, look: 'ghost' }),
	line('hashToCheck', 341, 151, 352, 151, { role: 'process', arrow: true, draw: 0 }),
	note('fuseTitle', 20, 189, 'Anti-rollback fuses', { size: 12 }),
	...[1, 1, 1, 0, 0, 0, 0, 0].map((v, i) => cell(`fuse${i}`, 20 + i * 20, 196, 17, 20, String(v), { size: 11, mono: true, role: v ? 'state' : 'muted' })),
	note('minimum', 20, 236, '1 + 1 + 1 = 3 minimum', { size: 12, mono: true }),
	cell('accept', 235, 190, 225, 28, 'not checked', { size: 12, look: 'ghost' }),
	note('refuse', 235, 235, 'Failed check → refuse', { size: 11, role: 'caution' }),
	...stages.map((s, i) => note(`stageName${i}`, 62 + i * 89, 249, s, { anchor: 'middle', size: 11 })),
	...stages.map((_, i) => rect(`loaded${i}`, 20 + i * 89, 256, 84, 34, { look: 'ghost', role: 'muted' })),
	...stages.map((_, i) => group(`loadedCode${i}`, 28 + i * 89, 265, codeParts(`code${i}.`, i ? 'output' : 'state'), { o: i ? 0 : 1 })),
	poly('execution', 55, 305, [[0, 0], [14, 0], [7, -9]], { role: 'state' }),
	cell('keyCopy', 24, 83, 172, 26, 'public key bytes', { size: 12, role: 'input', o: 0 }),
	cell('hashCopy', 24, 115, 172, 26, 'header + code', { size: 12, role: 'input', o: 0 }),
	cell('signatureCopy', 24, 132, 172, 26, 'signature bytes', { size: 12, role: 'input', o: 0 }),
	group('codeCopy', 355, 170, codeParts('movingCode.', 'output'), { o: 0 }),
	text('status', 20, 328, 'RSA-2048: 2,048 ÷ 8 = 256-byte key and signature.', { size: 12, role: 'process' }),
];
const tl = timeline(actors);
tl.cue(0, 'Power on begins in factory-written boot ROM. The bootloader image is stored but not executing. Its example key and signature each occupy 2,048 divided by 8, or 256 bytes.');

tl.cue(4, 'Hash the public key supplied with the image. Compare that result with the unchangeable fused key hash. A different key would stop the boot; a matching hash allows signature verification to continue.');
tl.at(4.1).show('keyCopy').move('keyCopy', 349, 58, 0.9).resize('keyCopy', 111, 30, 0.9);
tl.at(5.2).text('keyCopy', 'hash(key)');
tl.at(6).hide('keyCopy').role('imageKey', 'output').draw('keyCompare', 1, 0.5).text('keyResult', 'Key hash matches the fused hash.');

tl.cue(8, 'Hash the signed header and code, then check the signature with the trusted key. Check security version 3 against the three set fuses: 3 is at least the minimum 3. Both checks must pass before any jump.');
tl.at(8.1).show('hashCopy').move('hashCopy', 235, 136, 0.9).resize('hashCopy', 104, 30, 0.9).show('signatureCopy').move('signatureCopy', 355, 136, 0.9).resize('signatureCopy', 105, 30, 0.9);
tl.at(9.2).hide('hashCopy').hide('signatureCopy').role('codeHash', 'process').draw('hashToCheck', 1, 0.5);
tl.at(10).text('signatureCheck', 'signature valid').role('signatureCheck', 'output').text('accept', 'version 3 >= minimum 3').role('accept', 'output');

const enter = (index, t, label) => {
	tl.at(t).move('codeCopy', 355, 170, 0).show('codeCopy').move('codeCopy', 28 + index * 89, 265, 0.9);
	tl.at(t + 1).hide('codeCopy').show(`loadedCode${index}`).role(`loaded${index}`, 'output').move('execution', 55 + index * 89, 305, 0.5).text('active', `${label} running`);
};
const nextImage = (t, title, fields) => {
	tl.at(t).text('imageTitle', `Next image: ${title}`).text('imageFields', fields).text('trustedKey', 'trusted key').text('imageKey', 'signer key').role('imageKey', 'input').text('keyResult', 'The earlier stage vouches for this key.').text('signatureCheck', 'check signature').role('signatureCheck', 'process').text('accept', 'next image not checked').role('accept', 'process');
	tl.at(t + 0.2).move('hashCopy', 24, 115, 0).resize('hashCopy', 172, 26, 0).text('hashCopy', 'header + code').show('hashCopy').move('hashCopy', 235, 136, 0.75).resize('hashCopy', 104, 30, 0.75);
	tl.at(t + 0.2).move('signatureCopy', 24, 132, 0).resize('signatureCopy', 172, 26, 0).show('signatureCopy').move('signatureCopy', 355, 136, 0.75).resize('signatureCopy', 105, 30, 0.75);
	tl.at(t + 1.2).hide('hashCopy').hide('signatureCopy').text('signatureCheck', 'signature valid').role('signatureCheck', 'output').text('accept', `${title} verified`).role('accept', 'output');
};

tl.cue(12, 'Only now does the ROM enter the verified bootloader. The loader reads the next privileged image, hashes its signed contents, and verifies its signature before starting the hypervisor and kernels.');
enter(1, 12.1, 'Bootloader');
nextImage(13.4, 'kernels', ['privileged software', 'signed header + code', 'platform signature', 'not executing yet']);
tl.at(14.8).text('status', 'The loader runs; the next privileged image is verified first.');

tl.cue(16, 'Enter the verified privileged code. The hypervisor and kernels check the system components they load. The next code image remains data until its check succeeds.');
enter(2, 16.1, 'Kernels');
nextImage(17.4, 'system', ['system components', 'signed header + code', 'platform signature', 'not executing yet']);
tl.at(18.8).text('status', 'Checked code becomes executable; an unchecked image stays data.');

tl.cue(20, 'The verified system services begin. Before starting the game, they check the package signature and licence, then decrypt the accepted package. A valid signature alone does not supply a licence.');
enter(3, 20.1, 'System services');
nextImage(21.4, 'game', ['game package', 'signed package data', 'signature + licence', 'decrypt after checks']);
tl.at(23).text('accept', 'signature + licence valid').text('status', 'Accepted package: decrypt its code before starting it.');

tl.cue(24, 'The accepted game code enters the execution path. Every later stage ran only after an earlier trusted stage checked it. A failed check would have taken the refusal route instead.');
enter(4, 24.1, 'Game');
tl.at(25.2).text('imageTitle', 'Verified game package').text('imageFields', ['signature accepted', 'licence accepted', 'code decrypted', 'game now running']).text('status', 'Verify the next image → load its code → transfer execution.');

export default scene({
	id: 'console-boot', title: 'Verify each image before transferring execution',
	alt: 'Factory boot ROM checks an image key against fused trust, verifies the signed header and code, and accepts security version 3 against minimum 3. Code enters the bootloader only after those checks. The loader checks privileged code, kernels check system components, and system services check a game signature and licence before decrypting and starting the game.',
	caption: 'The image sizes and fuse values are the lesson’s example. Code blocks move into the execution path only after their checks pass.',
	w: 480, h: 340, actors, cues: tl.cues, tracks: tl.tracks,
});
