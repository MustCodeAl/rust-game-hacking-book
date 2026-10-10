// SPDX-License-Identifier: CC0-1.0
// Original 16-by-16 pixel drawings for the book. No external art is used.
// Regenerate the four small PNGs with: node scripts/make-path-sprites.mjs
import { mkdir, stat } from 'node:fs/promises';
import sharp from 'sharp';

const SIZE = 16;
const destination = new URL('../public/assets/images/original/', import.meta.url);
const ink = '#293c52';

// Each rectangle occupies whole pixels: [x, y, width, height, colour].
type PixelRect = [x: number, y: number, width: number, height: number, colour: string];
interface Sprite { background: string | null; rects: PixelRect[] }
const sprites: Record<string, Sprite> = {
	hero: {
		background: null,
		rects: [
			[5, 1, 6, 4, ink], [6, 3, 4, 3, '#edbc92'], [9, 3, 1, 1, ink],
			[4, 6, 8, 7, ink], [3, 7, 2, 6, '#315b82'], [11, 7, 2, 6, '#315b82'],
			[5, 6, 6, 6, '#478bb4'], [6, 6, 2, 4, '#8ac8dc'],
			[3, 7, 2, 3, '#edbc92'], [11, 7, 2, 3, '#edbc92'],
			[5, 10, 6, 1, ink], [8, 10, 1, 1, '#e9c46a'],
			[5, 12, 2, 3, ink], [9, 12, 2, 3, ink],
		],
	},
	chest: {
		background: null,
		rects: [
			[3, 4, 10, 2, ink], [2, 6, 12, 8, ink],
			[3, 5, 10, 3, '#d89b46'], [3, 9, 10, 4, '#9d6235'],
			[3, 6, 10, 1, '#edc678'], [3, 11, 10, 1, '#bf8445'],
			[4, 5, 1, 8, '#e5bd69'], [11, 5, 1, 8, '#e5bd69'],
			[2, 8, 12, 1, ink], [7, 8, 3, 4, ink],
			[8, 9, 1, 2, '#f1d48a'],
		],
	},
	wall: {
		background: null,
		rects: [
			[1, 2, 14, 12, ink], [2, 3, 12, 10, '#7f909e'],
			[2, 3, 5, 1, '#b8c6d0'], [9, 3, 5, 1, '#b8c6d0'],
			[2, 7, 12, 1, '#cbd3d8'], [7, 3, 1, 4, '#cbd3d8'],
			[4, 8, 1, 5, '#cbd3d8'], [11, 8, 1, 5, '#cbd3d8'],
			[2, 11, 2, 1, '#637681'], [5, 11, 6, 1, '#637681'],
			[12, 11, 2, 1, '#637681'],
		],
	},
	floor: {
		background: '#e7ecee',
		rects: [
			[0, 0, 16, 1, '#cad3d7'], [0, 15, 16, 1, '#cad3d7'],
			[0, 1, 1, 14, '#cad3d7'], [15, 1, 1, 14, '#cad3d7'],
			[1, 7, 14, 1, '#d0d9dd'], [7, 1, 1, 6, '#d0d9dd'],
			[4, 8, 1, 7, '#d0d9dd'], [11, 8, 1, 7, '#d0d9dd'],
			[2, 2, 3, 1, '#f8fafb'], [9, 2, 3, 1, '#f8fafb'],
			[6, 10, 3, 1, '#f8fafb'],
		],
	},
};

await mkdir(destination, { recursive: true });
for (const [name, { background, rects }] of Object.entries(sprites)) {
	for (const [x, y, width, height] of rects) {
		if (![x, y, width, height].every(Number.isInteger)
			|| x < 0 || y < 0 || width <= 0 || height <= 0
			|| x + width > SIZE || y + height > SIZE) {
			throw new Error(`${name}: rectangle leaves the pixel grid`);
		}
	}
	const pixels: PixelRect[] = background ? [[0, 0, SIZE, SIZE, background], ...rects] : rects;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" shape-rendering="crispEdges">${pixels.map(([x, y, width, height, fill]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`).join('')}</svg>`;
	const output = new URL(`path-${name}.png`, destination);
	await sharp(Buffer.from(svg)).png({ palette: true, effort: 10 }).toFile(output.pathname);
	const { size } = await stat(output);
	if (size >= 30_000) throw new Error(`${name}: asset exceeds the 30 KB budget`);
	console.log(`path-${name}.png: ${SIZE} × ${SIZE}; ${size} bytes; ${background ? 'opaque' : 'transparent'}`);
}
