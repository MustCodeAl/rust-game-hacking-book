// Answer-length balance for multiple-choice quiz questions.
// The correct choice must not stand out by length: not clearly the longest,
// not far above the average wrong choice, and not conspicuously short either.

export interface BalanceQuestion {
  readonly type?: string | undefined;
  readonly options?: readonly string[] | undefined;
  readonly answer: string | number | boolean;
}

/** A loosely authored question as it appears in a JSON file under review. */
export interface AuthoredQuestion extends BalanceQuestion {
  readonly id?: string | undefined;
  readonly prompt?: string | undefined;
  readonly explanation?: string | undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Read the fields a review needs from untrusted JSON; absent answers become NaN. */
export function readAuthoredQuestion(value: unknown): AuthoredQuestion {
  const record = isRecord(value) ? value : {};
  const { id, type, prompt, explanation, options, answer } = record;
  return {
    id: typeof id === 'string' ? id : undefined,
    type: typeof type === 'string' ? type : undefined,
    prompt: typeof prompt === 'string' ? prompt : undefined,
    explanation: typeof explanation === 'string' ? explanation : undefined,
    options: Array.isArray(options) && options.every((option): option is string => typeof option === 'string') ? options : undefined,
    answer: typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean' ? answer : Number.NaN,
  };
}

export function balanceProblem(question: BalanceQuestion): string | null {
  if (question.type && question.type !== 'multiple-choice') return null;
  const lengths = (question.options ?? []).map(option => option.length);
  const right = lengths[Number(question.answer)];
  if (right === undefined) return null;
  const wrong = lengths.filter((_length, index) => index !== Number(question.answer));
  const mean = wrong.reduce((sum, length) => sum + length, 0) / wrong.length;
  if (right > 1.1 * Math.max(...wrong) && right > mean + 6) return 'correct choice is clearly the longest';
  if (right > 1.3 * mean && right > mean + 12) return 'correct choice is much longer than the average wrong choice';
  if (right < 0.6 * mean && right < mean - 12) return 'correct choice is much shorter than the average wrong choice';
  return null;
}
