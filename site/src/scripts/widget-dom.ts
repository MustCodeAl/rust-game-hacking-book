// Small typed DOM building blocks shared by the explorable widgets (SimLab,
// Visual, SortBoard and FormulaBuilder). These helpers do not touch `document`
// at load time: Visual.astro, SortBoard.astro and FormulaBuilder.astro import
// their widget modules on the server to print a caption without JavaScript.

/** Creates an element typed by its tag, with an optional class name and text. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

/**
 * Returns a value that the widget's own data guarantees is present.
 * An indexed lookup is `T | undefined` under `noUncheckedIndexedAccess`; where the
 * data makes a missing entry impossible, a broken invariant is reported loudly
 * instead of being passed on as `undefined`.
 */
export function required<T>(value: T | null | undefined, what: string): T {
	if (value === null || value === undefined) throw new Error(`Widget data is missing ${what}.`);
	return value;
}
