// Generated from src/scripts/quiz-identity-migration.ts with strict TypeScript.
export function quizStorageKey(number, quizId) {
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
export function recoverQuizAttempt(storage, identity, accept) {
    const storageKey = quizStorageKey(identity.legacyNumber, identity.quizId);
    const candidates = [...new Set([storageKey, quizStorageKey(identity.displayNumber, identity.quizId)])];
    let attempt = null;
    let sourceKey = null;
    for (const key of candidates) {
        let candidate = null;
        try {
            candidate = accept(storage?.getItem(key) ?? null);
        }
        catch { /* refused or malformed storage */ }
        const morePartialAnswers = candidate && attempt && candidate.complete !== true && attempt.complete !== true &&
            Object.keys(candidate.responses ?? {}).length > Object.keys(attempt.responses ?? {}).length;
        if (candidate && (!attempt || (candidate.complete === true && attempt.complete !== true) || morePartialAnswers)) {
            attempt = candidate;
            sourceKey = key;
        }
    }
    return { storageKey, sourceKey, attempt };
}
