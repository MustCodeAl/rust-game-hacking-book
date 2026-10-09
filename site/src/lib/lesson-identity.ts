import rawManifest from '../data/lesson-identities.json';

export interface LessonIdentity {
  readonly id: string;
  readonly number: string;
  readonly legacyQuizNumber: string;
  readonly title: string;
  readonly route: string;
}
interface IdentityManifest {
  readonly byId: Readonly<Record<string, LessonIdentity>>;
  readonly legacyQuizNumberToId: Readonly<Record<string, string>>;
  readonly displayNumberToId: Readonly<Record<string, string>>;
}
const manifest: IdentityManifest = rawManifest;

/** Current labels resolve by stable lesson ID; stored numbers are never identity. */
export function lessonIdentityById(id: unknown): LessonIdentity | undefined {
  if (typeof id !== 'string' || !Object.hasOwn(manifest.byId, id)) return undefined;
  return manifest.byId[id];
}
export function currentLessonNumber(id: unknown): string | undefined {
  return lessonIdentityById(id)?.number;
}
export function lessonIdentityByDisplayedNumber(number: string): LessonIdentity | undefined {
  if (!Object.hasOwn(manifest.displayNumberToId, number)) return undefined;
  return lessonIdentityById(manifest.displayNumberToId[number]);
}
/** Frozen historical quiz aliases; never substitute the new display map here. */
export function lessonIdentityByLegacyQuizNumber(number: string): LessonIdentity | undefined {
  if (!Object.hasOwn(manifest.legacyQuizNumberToId, number)) return undefined;
  return lessonIdentityById(manifest.legacyQuizNumberToId[number]);
}
/** Bare authored prose uses the same frozen pre-balancing number namespace. */
export function lessonIdentityByAuthoredNumber(number: string): LessonIdentity | undefined {
  return lessonIdentityByLegacyQuizNumber(number);
}
