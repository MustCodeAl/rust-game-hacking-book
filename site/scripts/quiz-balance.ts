// CLI: node scripts/quiz-balance.mjs questions.json [more.json ...]
// Each file holds an array of questions (options as an array), or a bank object with batchSize and questions.
import { readFileSync } from 'node:fs';
import { balanceProblem, isRecord, readAuthoredQuestion } from '../src/lib/quiz-balance.ts';

let bad = 0;
const report = (message: string): void => { bad++; console.log(message); };

for (const file of process.argv.slice(2)) {
  const data: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const rawList: unknown = Array.isArray(data) ? data : isRecord(data) ? data.questions : undefined;
  const list = (Array.isArray(rawList) ? rawList : []).map(readAuthoredQuestion);
  if (!Array.isArray(data) && isRecord(data)) {
    const need = 3 * Number(data.batchSize);
    const ids = list.map(question => question.id);
    const prompts = list.map(question => (question.prompt ?? '').trim().toLowerCase());
    if (list.length < need) report(`${file}: ${list.length} questions, needs at least ${need}`);
    if (new Set(ids).size !== ids.length) report(`${file}: duplicate ids`);
    if (new Set(prompts).size !== prompts.length) report(`${file}: duplicate prompts`);
  }
  for (const question of list) {
    const multipleChoice = !question.type || question.type === 'multiple-choice';
    if (!question.id || !question.prompt || !question.explanation) report(`${file} · ${question.id}: missing id/prompt/explanation`);
    if (multipleChoice && (question.options?.length !== 4 || new Set(question.options).size !== 4 || !(Number(question.answer) >= 0 && Number(question.answer) <= 3))) {
      report(`${file} · ${question.id}: needs four distinct options and a valid answer index`);
      continue;
    }
    const problem = balanceProblem(question);
    if (problem) report(`${file} · ${question.id}: ${problem}`);
  }
}
console.log(bad ? `${bad} unbalanced` : 'all balanced');
process.exit(bad ? 1 : 0);
