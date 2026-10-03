// What the GitHub card says about a file in this repository, worked out while
// building. The link points at the exact commit the book was built from, so it
// shows the version of the file the lesson describes even after the file changes.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const REPO = 'MustCodeAl/rust-game-hacking-book';
// The repository root is the parent of the site folder, which is where Astro runs.
// (This file is bundled while building, so its own location says nothing.)
const ROOT = `${resolve(process.cwd(), '..')}/`;

// The lab folders are copied into the published site (scripts/sync-labs.mjs),
// so their files can be opened from the book as well as on GitHub.
const SERVED = ['rust-labs', 'windows-labs', 'lua-labs', 'advanced-memory-labs', 'firmware-labs'];
const LANGUAGES = { rs: 'Rust', lua: 'Lua', toml: 'TOML', c: 'C', cpp: 'C++', h: 'C header', ps1: 'PowerShell', sh: 'shell script', md: 'Markdown', json: 'JSON', mjs: 'JavaScript', js: 'JavaScript', ts: 'TypeScript' };

let ref;
function sourceRef() {
	if (ref) return ref;
	ref = process.env.GITHUB_SHA ?? '';
	if (!ref) {
		try {
			ref = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
		} catch {
			// Not a git checkout: GitHub resolves HEAD to the default branch.
			ref = 'HEAD';
		}
	}
	return ref;
}

/** Facts about one repository file, for the GitHub card. Fails the build for a path that does not exist. */
export function sourceInfo(path) {
	if (path.startsWith('/') || path.split('/').includes('..')) {
		throw new Error(`<GitHub path="${path}"> must be a path from the repository root.`);
	}
	const file = `${ROOT}${path}`;
	if (!existsSync(file)) throw new Error(`<GitHub path="${path}"> does not exist in the repository.`);
	const text = readFileSync(file, 'utf8');
	const extension = path.split('.').at(-1);
	return {
		lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0),
		language: LANGUAGES[extension] ?? extension.toUpperCase(),
		githubUrl: `https://github.com/${REPO}/blob/${sourceRef()}/${path}`,
		served: SERVED.includes(path.split('/')[0]),
	};
}
