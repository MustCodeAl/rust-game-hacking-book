// Copy the lab sources that lessons link to into public/, so a link such as
// /windows-labs/src/bin/driver_inventory.rs serves the real file. The crates
// at the repository root stay the source of truth; these copies are ignored.
import { cp, rm } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const publicDir = new URL('../public/', import.meta.url);
const labs = ['rust-labs', 'windows-labs', 'lua-labs', 'advanced-memory-labs'];
const skip = /[\\/](target|\.git|node_modules)([\\/]|$)/;

for (const lab of labs) {
	const target = new URL(`${lab}/`, publicDir);
	await rm(target, { recursive: true, force: true });
	await cp(new URL(`${lab}/`, root), target, { recursive: true, filter: (source) => !skip.test(source) });
}
console.log(`synced ${labs.length} lab folders into public/`);
