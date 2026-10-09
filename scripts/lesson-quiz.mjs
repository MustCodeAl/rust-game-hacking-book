import { choiceValues, drawBatch, fingerprint, isCorrect, restoreAttempt, shuffleOrder } from './quiz-session.mjs';
import { recoverQuizAttempt } from './quiz-identity-migration.mjs';

const mounted = new WeakSet();
// Optional sound: reading-audio.js plays these only when the reader has turned effects on.
const sound = kind => document.dispatchEvent(new CustomEvent('academy:sound', { detail: { kind } }));
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export function mountQuiz(root) {
  if (mounted.has(root)) return;
  const specification = root.querySelector('[data-quiz-bank]');
  if (!specification) return;
  const { questions, batchSize } = JSON.parse(specification.textContent);
  if (!questions.length) return;
  mounted.add(root);
  const byId = new Map(questions.map(question => [question.id, question]));
  const pool = [...byId.keys()];
  const size = Math.min(batchSize, pool.length);
  const revision = fingerprint(questions);
  let storage = null;
  try { storage = window.localStorage; } catch { /* storage can be refused */ }
  const recovery = recoverQuizAttempt(storage, {
    legacyNumber: root.dataset.quizStorageLesson || root.dataset.quizLesson || '',
    displayNumber: root.dataset.quizLesson || '',
    quizId: root.dataset.quizId || '',
  }, raw => restoreAttempt(raw, questions, size, revision));
  const storageKey = recovery.storageKey;
  let attempt = recovery.attempt || fresh();
  const header = root.querySelector('.academy-quiz__header');
  if (root.dataset.quizLesson) header.querySelector('h3').textContent = 'Lesson ' + root.dataset.quizLesson + ' quiz';
  root.querySelectorAll(':scope > :not(.academy-quiz__header):not(script)').forEach(node => node.remove());
  header.querySelectorAll('[data-quiz-runtime]').forEach(node => node.remove());
  const progress = el('span', 'academy-quiz__question-progress');
  progress.dataset.quizRuntime = 'true';
  header.append(progress);
  const savedLabel = root.querySelector('[data-quiz-saved]');
  const stage = el('div', 'academy-quiz__stage');
  const controls = el('div', 'academy-quiz__actions academy-quiz__after');
  const retake = el('button', 'academy-quiz__retry', 'Retake quiz');
  const newQuiz = el('button', 'academy-quiz__retry', 'New quiz');
  retake.type = newQuiz.type = 'button';
  newQuiz.hidden = pool.length <= size;
  controls.append(retake, newQuiz);
  root.append(stage, controls);
  retake.addEventListener('click', () => {
    attempt = fresh('retake', attempt);
    save();
    render();
  });
  newQuiz.addEventListener('click', () => {
    attempt = fresh('new', attempt);
    save();
    render();
  });

  function fresh(kind = 'new', old = null) {
    return {
      revision,
      ids: kind === 'retake' ? shuffleOrder(old.ids, old.ids) : drawBatch(pool, size, old?.ids || []),
      index: 0, responses: {}, orders: { ...(old?.orders || {}) }, complete: false
    };
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(attempt)); } catch {}
  }
  function fill(node, html, text) {
    // HTML comes only from the author's build-time inline Markdown renderer.
    if (html) node.innerHTML = html; else node.textContent = text;
  }
  function render() {
    stage.replaceChildren();
    root.classList.remove('is-unanswered', 'is-correct', 'is-incorrect', 'is-follow-up-active');
    root.dataset.quizBatch = attempt.ids.join(' ');
    retake.hidden = !attempt.complete;
    newQuiz.hidden = pool.length <= size || !attempt.complete;
    controls.hidden = !attempt.complete;
    savedLabel.hidden = !Object.keys(attempt.responses).length;
    savedLabel.textContent = 'Saved';
    if (attempt.complete) { renderScore(); return; }
    const question = byId.get(attempt.ids[attempt.index]);
    root.dataset.quizQuestion = question.id;
    progress.textContent = 'Question ' + (attempt.index + 1) + ' of ' + size;
    const prompt = el('div', 'academy-quiz__prompt');
    const promptText = el('p');
    fill(promptText, question.promptHTML, question.prompt);
    prompt.append(promptText);
    stage.append(prompt);
    if (question.type === 'tracing') {
      const program = el('pre', 'academy-quiz__program');
      program.append(el('code', 'language-rust', question.program));
      stage.append(program);
    }
    let selected = null;
    let input = null;
    const buttons = [];
    if (question.type === 'short-answer') {
      const label = el('label', 'academy-quiz__answer-label');
      input = el('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.maxLength = 320;
      input.dataset.quizInput = '';
      label.append(el('span', '', 'Your answer'), input);
      stage.append(label);
    } else {
      const options = el('div', 'academy-quiz__options');
      options.setAttribute('role', 'radiogroup');
      options.setAttribute('aria-label', 'Answer choices');
      const previousOrder = attempt.orders[question.id] || [];
      const order = shuffleOrder(choiceValues(question), previousOrder);
      attempt.orders[question.id] = order;
      order.forEach((value, index) => {
        const button = el('button');
        button.type = 'button';
        button.dataset.quizOption = value;
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', 'false');
        const text = el('span');
        const optionText = question.type === 'tracing' ? value === 'true' ? 'It compiles' : 'It does not compile' : question.options[Number(value)];
        fill(text, question.optionsHTML?.[Number(value)], optionText);
        button.append(el('span', 'academy-quiz__option-letter', String.fromCharCode(65 + index)), text);
        button.addEventListener('click', () => {
          selected = value;
          buttons.forEach(candidate => {
            const active = candidate === button;
            candidate.classList.toggle('is-selected', active);
            candidate.setAttribute('aria-checked', String(active));
          });
        });
        button.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault();
          const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
          const next = buttons[(index + direction + buttons.length) % buttons.length];
          next.focus();
          next.click();
        });
        buttons.push(button);
        options.append(button);
      });
      stage.append(options);
    }
    const feedback = el('div', 'academy-quiz__feedback');
    feedback.dataset.quizFeedback = '';
    feedback.setAttribute('aria-live', 'polite');
    feedback.hidden = true;
    const result = el('strong');
    result.dataset.quizResult = '';
    const explanation = el('p');
    feedback.append(result, explanation);
    const actions = el('div', 'academy-quiz__actions');
    const check = el('button', 'academy-quiz__check', 'Check answer');
    const next = el('button', 'academy-quiz__check', attempt.index === size - 1 ? 'See quiz score' : 'Next question');
    check.type = next.type = 'button';
    check.dataset.quizSubmit = '';
    next.hidden = true;
    actions.append(check, next);
    stage.append(actions, feedback);
    function reveal(value, silent = false) {
      const correct = isCorrect(question, value);
      if (!silent) sound(correct ? 'correct' : 'wrong');
      root.classList.add(correct ? 'is-correct' : 'is-incorrect');
      feedback.hidden = false;
      result.textContent = correct ? 'Correct.' : 'Not quite.';
      fill(explanation, question.explanationHTML, question.explanation);
      for (const button of buttons) {
        button.disabled = true;
        button.classList.toggle('is-correct-answer', isCorrect(question, button.dataset.quizOption));
        button.classList.toggle('is-wrong-answer', button.dataset.quizOption === value && !correct);
      }
      if (input) { input.value = value; input.disabled = true; }
      check.hidden = true;
      next.hidden = false;
      savedLabel.hidden = false;
    }
    check.addEventListener('click', () => {
      const value = input ? input.value.trim() : selected;
      if (value === null || value === '') {
        feedback.hidden = false;
        result.textContent = 'Choose or type an answer first.';
        explanation.textContent = '';
        return;
      }
      attempt.responses[question.id] = value;
      reveal(value);
      save();
    });
    input?.addEventListener('keydown', event => { if (event.key === 'Enter') check.click(); });
    next.addEventListener('click', () => {
      if (attempt.index === size - 1) { attempt.complete = true; sound('finish'); }
      else attempt.index++;
      save();
      render();
    });
    if (Object.hasOwn(attempt.responses, question.id)) reveal(attempt.responses[question.id], true);
    save();
  }
  function renderScore() {
    root.dataset.quizQuestion = '';
    progress.textContent = 'Complete';
    const score = attempt.ids.filter(id => isCorrect(byId.get(id), attempt.responses[id])).length;
    const summary = el('div', 'academy-quiz__extension-summary');
    summary.append(el('strong', 'academy-quiz__extension-score', score + ' / ' + size));
    summary.append(el('p', '', pool.length > size ? 'Retake uses these questions in a different order. New quiz draws a different batch.' : 'Retake lets you try these questions again.'));
    const review = el('details');
    review.append(el('summary', '', 'Review answers'));
    for (const id of attempt.ids) {
      const question = byId.get(id);
      const item = el('div', 'academy-quiz__review-item');
      item.append(el('strong', '', question.prompt));
      const answer = question.type === 'short-answer' ? question.answer : question.type === 'tracing'
        ? String(question.answer) === 'true' ? 'It compiles' : 'It does not compile'
        : question.options[Number(question.answer)];
      item.append(el('p', '', 'Answer: ' + answer));
      const explanation = el('p');
      fill(explanation, question.explanationHTML, question.explanation);
      item.append(explanation);
      review.append(item);
    }
    summary.append(review);
    stage.append(summary);
  }
  render();
}
