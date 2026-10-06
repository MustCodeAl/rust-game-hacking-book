// Answer-length balance for multiple-choice quiz questions.
// The correct choice must not stand out by length: not clearly the longest,
// not far above the average wrong choice, and not conspicuously short either.
export function balanceProblem(question) {
  if (question.type && question.type !== 'multiple-choice') return null;
  const lengths = question.options.map(option => option.length);
  const right = lengths[Number(question.answer)];
  const wrong = lengths.filter((_length, index) => index !== Number(question.answer));
  const mean = wrong.reduce((sum, length) => sum + length, 0) / wrong.length;
  if (right > 1.1 * Math.max(...wrong) && right > mean + 6) return 'correct choice is clearly the longest';
  if (right > 1.3 * mean && right > mean + 12) return 'correct choice is much longer than the average wrong choice';
  if (right < 0.6 * mean && right < mean - 12) return 'correct choice is much shorter than the average wrong choice';
  return null;
}

// CLI: node scripts/quiz-balance.mjs questions.json [more.json ...]
// Each file holds an array of questions (options as an array).
if (import.meta.url === 'file://' + process.argv[1]) {
  const fs = await import('node:fs');
  let bad = 0;
  for (const file of process.argv.slice(2)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list = Array.isArray(data) ? data : data.questions;
    if (!Array.isArray(data)) {
      const need = 3 * data.batchSize;
      const ids = list.map(question => question.id);
      const prompts = list.map(question => question.prompt.trim().toLowerCase());
      if (list.length < need) { bad++; console.log(file + ': ' + list.length + ' questions, needs at least ' + need); }
      if (new Set(ids).size !== ids.length) { bad++; console.log(file + ': duplicate ids'); }
      if (new Set(prompts).size !== prompts.length) { bad++; console.log(file + ': duplicate prompts'); }
    }
    for (const question of list) {
      const mc = !question.type || question.type === 'multiple-choice';
      if (!question.id || !question.prompt || !question.explanation) { bad++; console.log(file + ' · ' + question.id + ': missing id/prompt/explanation'); }
      if (mc && (question.options?.length !== 4 || new Set(question.options).size !== 4 || !(Number(question.answer) >= 0 && Number(question.answer) <= 3))) {
        bad++; console.log(file + ' · ' + question.id + ': needs four distinct options and a valid answer index'); continue;
      }
      const problem = balanceProblem(question);
      if (problem) { bad++; console.log(file + ' · ' + question.id + ': ' + problem); }
    }
  }
  console.log(bad ? bad + ' unbalanced' : 'all balanced');
  process.exit(bad ? 1 : 0);
}
