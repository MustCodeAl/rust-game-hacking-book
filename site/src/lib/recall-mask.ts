/** One authored source fragment and one optional complete token to recall. */
export type RecallKind = 'api' | 'argument' | 'import' | 'type' | 'logic';
export type RecallFocus = 'mixed' | 'calls' | 'imports' | 'logic';

export interface RecallFragment {
  readonly text: string;
  readonly hint: string;
  readonly mask?: string;
  readonly kind?: RecallKind;
}

export interface RecallTarget {
  /** UTF-16 offsets, matching source.indexOf and DOM text offsets. */
  readonly start: number;
  readonly end: number;
  readonly token: string;
  readonly hint: string;
  readonly kind: RecallKind;
}

export interface RecallPlan {
  readonly targets: readonly RecallTarget[];
  readonly eligibleCharacters: number;
  readonly hiddenCharacters: number;
  readonly budget: number;
  readonly exceedsPreferredBudget: boolean;
}

interface SourceToken {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export interface RecallOptions {
  readonly focus?: RecallFocus;
  readonly rotation?: number;
}

const KINDS: readonly RecallKind[] = ['api', 'argument', 'import', 'type', 'logic'];
const MAX_GAPS = 3;
const SEPARATION = 8;
const PREFERRED_RATIO = 0.15;
// One indivisible token can exceed the preferred budget, but most code must stay visible.
const SINGLE_TOKEN_RATIO = 0.25;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKind(value: unknown): value is RecallKind {
  return typeof value === 'string' && KINDS.some(kind => kind === value);
}

/** Decode untrusted dataset JSON without letting arbitrary objects into the client. */
export function parseRecallFragments(value: unknown): RecallFragment[] {
  if (!Array.isArray(value)) return [];
  const items: readonly unknown[] = value;
  const fragments: RecallFragment[] = [];
  for (const item of items) {
    if (!isRecord(item) || typeof item.text !== 'string' || !/[!-~]/.test(item.text) ||
        typeof item.hint !== 'string' || !item.hint.trim()) continue;
    if (item.mask !== undefined && (typeof item.mask !== 'string' || !isSingleToken(item.mask))) continue;
    if (item.kind !== undefined && !isKind(item.kind)) continue;
    const fragment: RecallFragment = {
      text: item.text,
      hint: item.hint,
      ...(typeof item.mask === 'string' ? { mask: item.mask } : {}),
      ...(isKind(item.kind) ? { kind: item.kind } : {}),
    };
    fragments.push(fragment);
  }
  return fragments;
}

function tokens(source: string): SourceToken[] {
  const found: SourceToken[] = [];
  const pattern = /[A-Za-z_][A-Za-z0-9_]*|\d(?:[A-Za-z0-9_]|\.(?=\d))*|===|!==|>>=|<<=|\.\.=|\.\.|::|->|=>|>=|<=|==|!=|&&|\|\||\+=|-=|\*=|\/=|%=|>>|<<|[+*\/%<>=!&|^~?\-]/g;
  for (const match of source.matchAll(pattern)) {
    const text = match[0];
    if (text) found.push({ start: match.index, end: match.index + text.length, text });
  }
  return found;
}

function isSingleToken(source: string): boolean {
  const matches = tokens(source);
  const token = matches[0];
  return matches.length === 1 && token?.start === 0 && token.end === source.length;
}

function legacyMask(fragment: RecallFragment): string | undefined {
  // Prefer a complete callable name when the old fragment includes its call.
  const call = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(fragment.text)?.[1];
  if (call) return call;
  const list = tokens(fragment.text);
  const operator = list.find(token => /^(?:>=|<=|==|!=|&&|\|\||\+=|-=|>>|<<|[+*\/%<>])$/.test(token.text));
  if (operator) return operator.text;
  const type = list.find(token => /^(?:[A-Z][A-Za-z0-9_]*|[iu](?:8|16|32|64|128|size)|f(?:32|64)|bool)$/.test(token.text));
  return type?.text ?? list.find(token => /^[A-Za-z_]/.test(token.text))?.text;
}

function accepts(focus: RecallFocus, kind: RecallKind): boolean {
  if (focus === 'calls') return kind === 'api' || kind === 'argument';
  if (focus === 'imports') return kind === 'import' || kind === 'type';
  return focus === 'mixed' || kind === 'logic';
}

/** Only explicitly authored kinds introduce a focus option; old snippets retain their simple UI. */
export function recallFocusChoices(fragments: readonly RecallFragment[]): RecallFocus[] {
  const kinds = new Set(fragments.flatMap(fragment => fragment.kind ? [fragment.kind] : []));
  const choices: RecallFocus[] = ['mixed'];
  if (kinds.has('api') || kinds.has('argument')) choices.push('calls');
  if (kinds.has('import') || kinds.has('type')) choices.push('imports');
  if (kinds.has('logic')) choices.push('logic');
  return choices;
}

export function parseRecallFocus(value: string): RecallFocus {
  return value === 'calls' || value === 'imports' || value === 'logic' ? value : 'mixed';
}

/** Resolve complete tokens inside exact authored context; never clip an identifier to fit. */
export function createRecallPlan(
  source: string,
  fragments: readonly RecallFragment[],
  options: RecallOptions = {},
): RecallPlan {
  const eligibleCharacters = source.match(/[!-~]/g)?.length ?? 0;
  const budget = Math.floor(eligibleCharacters * PREFERRED_RATIO);
  const sourceTokens = tokens(source);
  const focus = options.focus ?? 'mixed';
  const candidates: RecallTarget[] = [];
  const occupied = new Set<string>();
  for (const fragment of fragments) {
    const kind = fragment.kind ?? 'logic';
    if (!accepts(focus, kind)) continue;
    const mask = fragment.mask ?? legacyMask(fragment);
    if (!mask || !isSingleToken(mask)) continue;
    let contextStart = source.indexOf(fragment.text);
    while (contextStart !== -1) {
      const contextEnd = contextStart + fragment.text.length;
      for (const token of sourceTokens) {
        if (token.text !== mask || token.start < contextStart || token.end > contextEnd) continue;
        const key = `${token.start}:${token.end}`;
        if (occupied.has(key)) continue;
        occupied.add(key);
        candidates.push({ start: token.start, end: token.end, token: mask, hint: fragment.hint, kind });
      }
      contextStart = source.indexOf(fragment.text, contextStart + Math.max(1, fragment.text.length));
    }
  }
  const rotation = Math.max(0, Math.floor(options.rotation ?? 0));
  const offset = candidates.length ? rotation % candidates.length : 0;
  const ordered = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  const selected: RecallTarget[] = [];
  let hiddenCharacters = 0;
  const separated = (target: RecallTarget): boolean => selected.every(previous =>
    target.end + SEPARATION <= previous.start || target.start >= previous.end + SEPARATION);
  for (const target of ordered) {
    if (selected.length >= MAX_GAPS) break;
    if (hiddenCharacters + target.token.length > budget || !separated(target)) continue;
    selected.push(target);
    hiddenCharacters += target.token.length;
  }
  if (!selected.length) {
    const whole = ordered.find(target => target.token.length <= eligibleCharacters * SINGLE_TOKEN_RATIO);
    if (whole) {
      selected.push(whole);
      hiddenCharacters = whole.token.length;
    }
  }
  return {
    targets: selected.sort((left, right) => left.start - right.start),
    eligibleCharacters,
    hiddenCharacters,
    budget,
    exceedsPreferredBudget: hiddenCharacters > budget,
  };
}
