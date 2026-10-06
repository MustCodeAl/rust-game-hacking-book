// Checks a rewritten set of quiz questions (see the rewrite spec): each
// question must test a concept in general terms, so it may not lean on the
// lesson's own code identifiers, labs, example names, or "in this lesson".
// node scripts/quiz-concept-check.mjs rw-in/4.3.json rw-out/4.3.json
import fs from 'node:fs';
import { balanceProblem } from './quiz-balance.mjs';
const SPECIFIC = [
  [/\b(lab|labs|lesson|lessons|this page|this chapter|the book|the course|the text|the example|the program|the snippet|the listing)\b/i, 'refers to the lesson/lab/page'],
  [/\b(Mira|Ada|Bo|Sol|Wesnoth|AssaultCube|Urban Terror|Flare|Empyrean|Macrodox)\b/, 'uses a lesson example name'],
  [/\b[A-Za-z]+_[A-Za-z0-9_]+\b/, 'uses a snake_case or UPPER_SNAKE identifier'],
  [/\b[a-z]+[A-Z][A-Za-z0-9]*\(|\b[A-Z][a-z]+[A-Z][A-Za-z]+\b/, 'uses a camelCase or PascalCase identifier'],
];
const [inputFile, outputFile] = process.argv.slice(2);
const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const output = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
const want = new Set(input.flagged.map(question => question.id));
const others = new Set(input.otherPrompts.map(prompt => prompt.trim().toLowerCase()));
let bad = 0;
const fail = (id, message) => { bad++; console.log(outputFile + ' · ' + id + ': ' + message); };
const got = new Set();
for (const question of output) {
  if (!want.has(question.id)) { fail(question.id, 'not one of the flagged ids'); continue; }
  if (got.has(question.id)) fail(question.id, 'duplicate id');
  got.add(question.id);
  if (question.type && question.type !== 'multiple-choice') { fail(question.id, 'must be multiple-choice'); continue; }
  if (question.options?.length !== 4 || new Set(question.options).size !== 4 || String(question.answer) !== '0') fail(question.id, 'needs four distinct options with the right one at index 0');
  if (!question.prompt || !question.explanation) fail(question.id, 'missing prompt or explanation');
  const prompt = (question.prompt || '').trim().toLowerCase();
  if (others.has(prompt)) fail(question.id, 'prompt repeats another question in the lesson');
  others.add(prompt);
  for (const [pattern, message] of SPECIFIC) {
    const text = [question.prompt, ...(question.options || [])].join(' ');
    const hit = text.match(pattern);
    if (hit) fail(question.id, message + ': “' + hit[0] + '”');
  }
  const problem = question.options?.length === 4 && balanceProblem(question);
  if (problem) fail(question.id, problem);
}
for (const id of want) if (!got.has(id)) fail(id, 'missing: every flagged question needs a replacement');
console.log(bad ? bad + ' problems' : 'ok (' + output.length + ' questions)');
process.exit(bad ? 1 : 0);
