// Emit the classic browser scripts that the site loads from public/scripts/ out of their TypeScript sources.
// Convention: every src/client/NAME.ts becomes public/scripts/NAME.js, transpiled (types erased, nothing else
// rewritten) as a plain script: no imports or exports, the file is an IIFE or top-level script exactly as before.
// Load order, document.currentScript, ?v= cache keys and global behaviour therefore do not change.
//   node scripts/generate-client-scripts.ts           write the outputs
//   node scripts/generate-client-scripts.ts --check   fail when an output is stale or missing
import ts from 'typescript';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sources = resolve(site, 'src/client');
const check = process.argv.includes('--check');
const names = existsSync(sources) ? readdirSync(sources).filter(name => name.endsWith('.ts') && !name.endsWith('.d.ts')).sort() : [];
let stale = 0;
for (const name of names) {
  const source = `src/client/${name}`;
  const target = `public/scripts/${name.replace(/\.ts$/, '.js')}`;
  const text = readFileSync(resolve(site, source), 'utf8');
  if (/^\s*(import|export)\s/m.test(text)) throw new Error(`${source}: client scripts are classic scripts; imports and exports are not allowed`);
  const body = ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, newLine: ts.NewLineKind.LineFeed, alwaysStrict: false, removeComments: false },
  }).outputText;
  const generated = `// Generated from ${source}; edit the TypeScript and run scripts/generate-client-scripts.ts.\n${body}`;
  const file = resolve(site, target);
  if (check) {
    if (!existsSync(file) || readFileSync(file, 'utf8') !== generated) { console.error(`Stale client script: ${target}`); stale++; }
  } else writeFileSync(file, generated);
}
if (stale) process.exitCode = 1;
else console.log(`client scripts: ${names.length} ${check ? 'verified' : 'generated'}`);
