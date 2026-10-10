// The kinds of hover card a lesson can write (kit/HoverCard.astro), each with
// the label the card carries and the reading role its colour comes from. The
// label is always in the card as words, so colour is never the only way to tell
// kinds apart. The roles are the book's (reader-appearance.css): information
// for what a thing is, process for how it works, result for what to do or
// what comes back, caution for what goes wrong. hover-cards.css and kit.css
// map `data-card-kind` to the same roles; keep the three in step.
export const CARD_KINDS = {
	definition: { label: 'Definition', role: 'information', for: 'What a word means, when the glossary does not cover it.' },
	explanation: { label: 'Explanation', role: 'information', for: 'A closer second account of an idea, for a reader who wants more.' },
	reference: { label: 'Reference', role: 'information', for: 'Where to read more: a page of documentation or a tool’s manual (give an href).' },
	example: { label: 'Example', role: 'process', for: 'One concrete case of what the sentence says: real values, a real output.' },
	alternative: { label: 'Alternative', role: 'process', for: 'Another way to do the same job: a different tool or method.' },
	tip: { label: 'Tip', role: 'result', for: 'Something that saves effort.' },
	recommendation: { label: 'Recommended', role: 'result', for: 'What the book would choose, and why.' },
	caution: { label: 'Caution', role: 'caution', for: 'A likely mistake, or something that cannot be undone.' },
};
