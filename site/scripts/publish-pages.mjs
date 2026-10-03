// Publish the built book to the gh-pages branch as plain files.
//
// GitHub's built-in "pages build and deployment" job serves a branch without
// needing the repository's own Actions workflows, so this keeps the live site
// updating while those workflows cannot run. `.nojekyll` tells that job to copy
// the files as they are instead of running Jekyll over them.
//
// The new commit is made on a detached copy of origin/gh-pages and pushed with
// `HEAD:gh-pages`, so no local branch is ever moved: another checkout may have
// gh-pages open, and resetting it under that checkout would leave its files
// out of step with its branch.
//
//   bun run publish:pages             build, commit on top of gh-pages, and push
//   bun run publish:pages --dry-run   build and commit locally (as the
//                                     gh-pages-preview branch), but do not push
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BRANCH = 'gh-pages';
const dryRun = process.argv.includes('--dry-run');

function git(args, cwd, quiet = true) {
	return execFileSync('git', args, {
		cwd,
		encoding: 'utf8',
		stdio: ['ignore', quiet ? 'pipe' : 'inherit', 'inherit'],
	})?.trim();
}

function succeeds(args, cwd) {
	try {
		execFileSync('git', args, { cwd, stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

const root = git(['rev-parse', '--show-toplevel'], process.cwd());
const siteDir = join(root, 'site');
const distDir = join(siteDir, 'dist');

// The published site must match a commit, so its message can name that commit.
// The build also copies in every lab folder, so they count as much as site/.
const SOURCES = ['site', 'rust-labs', 'windows-labs', 'lua-labs', 'advanced-memory-labs', 'firmware-labs', 'docs.json'];
if (git(['status', '--porcelain', '--', ...SOURCES.filter((entry) => existsSync(join(root, entry)))], root)) {
	console.error('Commit or stash your changes to the book (site/, the labs, docs.json) first, so the live site matches a commit.');
	process.exit(1);
}
const source = git(['rev-parse', '--short', 'HEAD'], root);

// Start from an empty dist/, so a build that silently does nothing (a broken
// `bun` on PATH, say) cannot publish the previous build as if it were new.
rmSync(distDir, { recursive: true, force: true });
execFileSync('bun', ['run', 'build'], { cwd: siteDir, stdio: 'inherit' });
if (!existsSync(join(distDir, 'index.html'))) {
	console.error('The build did not produce site/dist/index.html; nothing was published.');
	process.exit(1);
}

const worktree = mkdtempSync(join(tmpdir(), 'gha-pages-'));
try {
	// Continue the published branch's history when it exists, so each publish
	// adds one commit instead of replacing the branch.
	if (succeeds(['ls-remote', '--exit-code', '--heads', 'origin', BRANCH], root)) {
		git(['fetch', '--quiet', 'origin', BRANCH], root);
		git(['worktree', 'add', '--quiet', '--force', '--detach', worktree, `origin/${BRANCH}`], root);
	} else {
		git(['worktree', 'add', '--quiet', '--force', '--detach', worktree], root);
		git(['checkout', '--quiet', '--orphan', BRANCH], worktree);
	}

	// Replace the branch's files with the fresh build. In a worktree `.git` is a
	// file that points back at the repository, so it has to stay.
	for (const entry of readdirSync(worktree)) {
		if (entry !== '.git') rmSync(join(worktree, entry), { recursive: true, force: true });
	}
	cpSync(distDir, worktree, { recursive: true });
	writeFileSync(join(worktree, '.nojekyll'), '');

	git(['add', '--all'], worktree);
	if (git(['status', '--porcelain'], worktree)) {
		git(['commit', '--quiet', '-m', `Publish the book from ${source}`], worktree);
	}

	// Compare with what GitHub has, not with the last local commit: a dry run
	// may already have committed this build without pushing it.
	const local = git(['rev-parse', 'HEAD'], worktree);
	const remote = git(['ls-remote', 'origin', `refs/heads/${BRANCH}`], root).split(/\s+/)[0];
	if (local === remote) {
		console.log(`GitHub's ${BRANCH} branch already has this build; nothing to publish.`);
	} else if (dryRun) {
		git(['branch', '--force', `${BRANCH}-preview`, 'HEAD'], root);
		console.log(`Dry run: the build is committed to the local ${BRANCH}-preview branch but not pushed.`);
	} else {
		git(['push', 'origin', `HEAD:refs/heads/${BRANCH}`], worktree, false);
		console.log(`Pushed ${BRANCH}. GitHub Pages redeploys it within a few minutes.`);
	}
} finally {
	succeeds(['worktree', 'remove', '--force', worktree], root);
	rmSync(worktree, { recursive: true, force: true });
}
