/** Renumbering changes labels, never the identity of an existing v7 attempt. */
export interface QuizStorageReader { getItem(key: string): string | null }
export interface QuizStorageIdentity {
  readonly legacyNumber: string;
  readonly displayNumber: string;
  readonly quizId: string;
}
export interface CompletionState {
  readonly complete?: boolean;
  readonly responses?: Readonly<Record<string, unknown>>;
}
export interface QuizRecovery<T> {
  readonly storageKey: string;
  readonly sourceKey: string | null;
  readonly attempt: T | null;
}
export function quizStorageKey(number: string, quizId: string): string {
  return `gha-quiz:v7:${number}:${quizId}`;
}

/**
 * Keep the old key as the write identity. A cached older runtime can have used
 * the newly displayed number; recover that candidate only through the caller's
 * full ID/fingerprint validator. Completed attempts beat unfinished attempts;
 * unfinished candidates with more saved answers retain that progress. Equal
 * candidates keep the canonical legacy key. Batches are never combined.
 * This function never writes, deletes, renames or sanitizes stored bytes.
 */
export function recoverQuizAttempt<T extends CompletionState>(
  storage: QuizStorageReader | null,
  identity: QuizStorageIdentity,
  accept: (raw: string | null) => T | null,
): QuizRecovery<T> {
  const storageKey = quizStorageKey(identity.legacyNumber, identity.quizId);
  const candidates = [...new Set([storageKey, quizStorageKey(identity.displayNumber, identity.quizId)])];
  let attempt: T | null = null;
  let sourceKey: string | null = null;
  for (const key of candidates) {
    let candidate: T | null = null;
    try { candidate = accept(storage?.getItem(key) ?? null); } catch { /* refused or malformed storage */ }
    const morePartialAnswers = candidate && attempt && candidate.complete !== true && attempt.complete !== true &&
      Object.keys(candidate.responses ?? {}).length > Object.keys(attempt.responses ?? {}).length;
    if (candidate && (!attempt || (candidate.complete === true && attempt.complete !== true) || morePartialAnswers)) {
      attempt = candidate;
      sourceKey = key;
    }
  }
  return { storageKey, sourceKey, attempt };
}
