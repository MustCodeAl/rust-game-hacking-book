// Checks the plain functions of the chat box's Tab completion
// (public/scripts/chat-suggest.js): how terms read in a question, which
// questions a page offers and in what order, and how what a reader has typed is
// matched. The part that draws the grey text needs a browser and is checked there.
//
//   node scripts/check-chat-suggest.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// The file is a classic browser script (this package's .js files are modules), so
// it is run as one, with `self` as the object it publishes on. It runs in this
// realm, so the arrays it returns compare equal to the ones written here.
interface SuggestionInput {
	kind?: string; heading?: string | null; sectionTerms?: string[]; pageTerms?: string[];
	terms?: string[]; lessons?: string[][]; conversation?: boolean;
}
interface PreparedSuggestions { items: string[]; folded: string[] }
interface SuggestAPI {
	fold(text: string | null): string;
	inSentence(term: string): string;
	aboutHeading(heading: string | null): string | null;
	buildPool(input: SuggestionInput): string[];
	prepare(items: string[]): PreparedSuggestions;
	match(value: string, questions: PreparedSuggestions, terms: PreparedSuggestions, limit: number): { value: string; ghost: string }[];
}
const testGlobal = globalThis as unknown as { self: { AcademyChatSuggest?: SuggestAPI } };
testGlobal.self = {};
vm.runInThisContext(readFileSync(new URL('../public/scripts/chat-suggest.js', import.meta.url), 'utf8'));
const suggest = testGlobal.self.AcademyChatSuggest;
assert.ok(suggest, 'chat-suggest.js did not publish AcademyChatSuggest');

let checks = 0;
const check = (name: string, fn: () => void) => {
	try {
		fn();
		checks += 1;
	} catch (error) {
		console.error(`FAILED: ${name}`);
		throw error;
	}
};

check('fold ignores case, typographic quotes, dashes, and runs of spaces', () => {
	assert.equal(suggest.fold('What  does “dead zone” mean—?'), 'what does "dead zone" mean-?');
	assert.equal(suggest.fold("It’s"), "it's");
	assert.equal(suggest.fold(null), '');
});

check('a term reads as it would mid-sentence', () => {
	for (const [term, expected] of [
		['Delta time', 'delta time'],
		['Dead zone', 'dead zone'],
		['ECS', 'ECS'],
		['A*', 'A*'],
		['2D', '2D'],
		['DllMain', 'DllMain'],
		['x86-64', 'x86-64'],
		['Boot ROM', 'Boot ROM'],
		['Lua', 'Lua'],
		['Win32', 'Win32'],
		['Turing complete', 'Turing complete'],
		['  Fixed   timestep ', 'fixed timestep'],
	]) {
		assert.equal(suggest.inSentence(term), expected, term);
	}
});

check('a heading with a colon asks about what is before it; one without is quoted', () => {
	assert.equal(suggest.aboutHeading('Change detection: do work only for what changed'), 'Explain change detection');
	assert.equal(suggest.aboutHeading('Commands wait for a safe moment'), 'Summarize “Commands wait for a safe moment”');
	assert.equal(suggest.aboutHeading('  '), null);
	assert.equal(suggest.aboutHeading(null), null);
	// "A: B" is too short a lead-in to be a topic.
	assert.equal(suggest.aboutHeading('3: Three'), 'Summarize “3: Three”');
});

const input = {
	kind: 'lesson',
	heading: 'Change detection: do work only for what changed',
	sectionTerms: ['change detection', 'deferred command', 'resource', 'query'],
	pageTerms: ['schedule', 'resource'],
	terms: ['delta time', 'dead zone', 'change detection', 'ECS'],
	lessons: [
		['4.1', 'Game Engines: Where the Rules Live'],
		['4.2', 'How an Engine Orders and Shares Its Work'],
	],
};

check('the pool puts the section first, then the page, then the book, without repeats', () => {
	const pool = suggest.buildPool(input);
	assert.equal(pool[0], 'What does change detection mean?');
	assert.equal(pool[1], 'What does deferred command mean?');
	assert.equal(pool[2], 'What does resource mean?');
	// Only three terms of the section get questions of their own, so "query" waits.
	assert.ok(!pool.slice(0, 3).includes('What does query mean?'));
	assert.equal(pool[3], 'Explain change detection');
	assert.equal(pool[4], 'Summarize this lesson');
	assert.equal(new Set(pool.map(suggest.fold)).size, pool.length);
	assert.ok(pool.includes('What does dead zone mean?'));
	assert.ok(pool.includes('Which lesson explains ECS?'));
	assert.ok(pool.includes('Summarize lesson 4.2'));
	assert.ok(pool.includes('Explain How an Engine Orders and Shares Its Work'));
	// A term on the page and in the section is asked about once.
	assert.equal(pool.filter((q) => q === 'What does resource mean?').length, 1);
});

check('a page of another kind offers its own questions', () => {
	assert.equal(suggest.buildPool({ kind: 'home' })[0], 'What does the book cover?');
	assert.equal(suggest.buildPool({ kind: 'contents' })[0], 'Where should I start?');
	assert.equal(suggest.buildPool({ kind: 'nonsense' })[0], 'Summarize this page');
	assert.deepEqual(suggest.buildPool({}).slice(0, 1), ['Summarize this page']);
});

check('after a first answer the follow-ups come first', () => {
	const pool = suggest.buildPool({ ...input, conversation: true });
	assert.equal(pool[0], 'Explain that more simply');
	assert.ok(pool.includes('What does change detection mean?'));
});

const pool = suggest.prepare(suggest.buildPool(input));
const terms = suggest.prepare(['change detection', 'deferred command', 'dead zone', 'delta time', 'ECS']);
const first = (value: string) => suggest.match(value, pool, terms, 8);

check('an empty box offers the best questions whole', () => {
	const found = first('');
	assert.equal(found.length, 8);
	assert.deepEqual(found[0], { value: 'What does change detection mean?', ghost: 'What does change detection mean?' });
});

check('typing finishes the best question that starts the same way', () => {
	assert.deepEqual(first('what does ch')[0], {
		value: 'What does change detection mean?',
		ghost: 'ange detection mean?',
	});
	// Case and extra spaces do not matter.
	assert.equal(first('WHAT  DOES ch')[0].value, 'What does change detection mean?');
	assert.equal(first('explain d')[0].value, 'Explain deferred command');
});

check('a quote typed straight matches the book’s curly quotes', () => {
	const quoted = suggest.prepare(suggest.buildPool({ kind: 'lesson', heading: 'Commands wait for a safe moment' }));
	const found = suggest.match('Summarize "comm', quoted, suggest.prepare([]), 8);
	assert.deepEqual(found[0], {
		value: 'Summarize “Commands wait for a safe moment”',
		ghost: 'ands wait for a safe moment”',
	});
});

check('a complete question has nothing left to finish', () => {
	assert.deepEqual(first('What does change detection mean?'), []);
	assert.deepEqual(first('Summarize this lesson'), []);
});

check('there can be several completions, best first, and no more than asked for', () => {
	const found = suggest.match('what does ', pool, terms, 3);
	assert.equal(found.length, 3);
	assert.equal(found[0].value, 'What does change detection mean?');
	assert.equal(found[1].value, 'What does deferred command mean?');
});

check('with no question to finish, the word being typed is finished from the terms', () => {
	assert.deepEqual(first('how does change det'), [{ value: 'how does change detection', ghost: 'ection' }]);
	assert.deepEqual(first('tell me about dead z'), [{ value: 'tell me about dead zone', ghost: 'one' }]);
	// The longest run of words that starts a term wins over a shorter one.
	assert.deepEqual(first('how is dead z')[0].value, 'how is dead zone');
	assert.deepEqual(first('how is ec'), []); // two letters are too few
	assert.deepEqual(first('how is ecs'), []); // already whole
	assert.deepEqual(first('how is ecs '), []); // nothing is being typed
});

check('a finished term or question gets nothing added after it', () => {
	// "detection" starts "detection rule", but "change detection" is already a whole term.
	const withRule = suggest.prepare(['change detection', 'detection rule']);
	assert.deepEqual(suggest.match('Explain change detection', pool, withRule, 8), []);
	assert.deepEqual(suggest.match('how does change detection', pool, withRule, 8), []);
	// The same words, typed as far as "detection" alone, may still be finished.
	assert.equal(suggest.match('how does detection', pool, withRule, 8)[0].value, 'how does detection rule');
	assert.deepEqual(suggest.match('Is it a dead zone?', pool, terms, 8), []);
});

check('completion never loses what was typed before the finished word', () => {
	const [only] = suggest.match('compare delta ti', pool, terms, 8);
	assert.equal(only.value, 'compare delta time');
	assert.equal('compare delta ti' + only.ghost, only.value);
});

check('nothing matches nothing', () => {
	assert.deepEqual(first('zzzz qqqq'), []);
	assert.deepEqual(suggest.match('abc', suggest.prepare([]), suggest.prepare([]), 8), []);
});

console.log(`chat-suggest: ${checks} checks passed.`);
