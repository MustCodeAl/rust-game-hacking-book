// Generate the browser .mjs modules that the legacy learning-widgets.js loader imports.
// All authored quiz logic stays in the TypeScript sources; this file only transpiles them.
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries: readonly (readonly [source: string, target: string])[] = [
  ['src/lib/quiz-session.ts', 'public/scripts/quiz-session.mjs'],
  ['src/scripts/quiz-identity-migration.ts', 'public/scripts/quiz-identity-migration.mjs'],
  ['src/scripts/lesson-quiz.ts', 'public/scripts/lesson-quiz.mjs'],
];
const check = process.argv.includes('--check');
let stale = false;
for (const [source, target] of entries) {
  const body = ts.transpileModule(readFileSync(resolve(site, source), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, newLine: ts.NewLineKind.LineFeed },
  }).outputText
    .replaceAll("'../lib/quiz-session'", "'./quiz-session.mjs'")
    .replaceAll("'./quiz-identity-migration'", "'./quiz-identity-migration.mjs'");
  const generated = `// Generated from ${source}; edit TypeScript and run scripts/generate-quiz-compatibility.ts.\n${body}`;
  if (check) {
    if (readFileSync(resolve(site, target), 'utf8') !== generated) {
      console.error(`Stale quiz compatibility: ${target}`);
      stale = true;
    }
  } else writeFileSync(resolve(site, target), generated);
}
if (stale) process.exitCode = 1;
else console.log(`quiz compatibility modules: ${entries.length} ${check ? 'verified' : 'generated'}`);
