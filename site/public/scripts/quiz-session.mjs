// Order and recovery rules shared by the browser and offline checks.
export function shuffleOrder(items, previous = [], random = Math.random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.length > 1 && result.every((item, i) => item === previous[i])) {
    result.push(result.shift());
  }
  return result;
}

export function drawBatch(pool, size, previous = [], random = Math.random) {
  const count = Math.min(size, pool.length);
  const result = shuffleOrder(pool, [], random).slice(0, count);
  // A new batch must change membership when an unused question is available,
  // even when randomness happens to produce the same set.
  if (pool.length > count && result.every(id => previous.includes(id))) {
    const unused = pool.filter(id => !result.includes(id));
    result[result.length - 1] = unused[Math.floor(random() * unused.length)];
  }
  return shuffleOrder(result, previous, random);
}

export function choiceValues(question) {
  if (question.type === 'short-answer') return [];
  if (question.type === 'tracing') return ['true', 'false'];
  return question.options.map((_option, index) => String(index));
}

export function normalized(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isCorrect(question, value) {
  return [question.answer, ...(question.alternatives || [])].some(answer => normalized(answer) === normalized(value));
}

export function fingerprint(questions) {
  let result = 2166136261;
  for (const char of JSON.stringify(questions)) result = Math.imul(result ^ char.charCodeAt(0), 16777619) >>> 0;
  return result.toString(16);
}

export function restoreAttempt(raw, questions, size, revision) {
  try {
    const saved = JSON.parse(raw);
    const byId = new Map(questions.map(question => [question.id, question]));
    if (saved.revision !== revision || !Array.isArray(saved.ids) || saved.ids.length !== size ||
        new Set(saved.ids).size !== size || saved.ids.some(id => !byId.has(id)) ||
        !Number.isInteger(saved.index) || saved.index < 0 || saved.index >= size) return null;
    const responses = {};
    const orders = {};
    for (const id of saved.ids) {
      const question = byId.get(id);
      const choices = choiceValues(question);
      const response = saved.responses?.[id];
      if (typeof response === 'string' && response.trim() && response.length <= 320 &&
          (question.type === 'short-answer' || choices.includes(response))) responses[id] = response;
      const order = saved.orders?.[id];
      if (Array.isArray(order) && order.length === choices.length && new Set(order).size === choices.length &&
          order.every(value => choices.includes(value))) orders[id] = order;
    }
    const complete = saved.complete === true && saved.ids.every(id => Object.hasOwn(responses, id));
    return { revision, ids: saved.ids, index: saved.index, responses, orders, complete };
  } catch { return null; }
}
