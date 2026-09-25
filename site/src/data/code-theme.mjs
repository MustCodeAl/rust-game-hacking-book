// One code theme whose colours are role markers, not a final palette.
//
// Expressive Code writes each token's colour inline (`style="--0:#ff9d7a"`).
// Every syntax role below gets its own colour, so src/styles/code-theme.css can
// find a role by its colour and repaint it with the reader's chosen palette
// (`--syntax-keyword`, `--syntax-string`, ...). The colours are the Academy dark
// palette, so a block still reads correctly if that stylesheet never loads.
//
// Keep ROLE_COLORS in step with the attribute selectors in code-theme.css.
export const ROLE_COLORS = {
	text: '#f8f1e3',
	comment: '#bdb19d',
	keyword: '#ff9d7a',
	type: '#ffd477',
	string: '#b9df8a',
	escape: '#79e2d0',
	function: '#8ecdf4',
	identifier: '#eee8dc',
	variable: '#a9d7ff',
	enumVariant: '#ff96bd',
	number: '#d9afff',
	safety: '#ff9a9a',
	added: '#a7e6b8',
	removed: '#ffb0ac',
	error: '#fffffe',
};

const rule = (role, scope, fontStyle) => ({
	scope,
	settings: { foreground: ROLE_COLORS[role], ...(fontStyle ? { fontStyle } : {}) },
});

export const academyCodeTheme = {
	name: 'academy-roles',
	type: 'dark',
	colors: {
		'editor.background': '#080a0d',
		'editor.foreground': ROLE_COLORS.text,
		'editor.selectionBackground': '#35415080',
		'terminal.background': '#080a0d',
		'titleBar.activeBackground': '#11151b',
		'titleBar.activeForeground': ROLE_COLORS.text,
		'tab.activeBackground': '#080a0d',
		'tab.activeForeground': ROLE_COLORS.text,
		'editorGroupHeader.tabsBackground': '#11151b',
		'widget.shadow': '#00000000',
	},
	tokenColors: [
		rule('comment', ['comment', 'punctuation.definition.comment'], 'italic'),
		rule('keyword', [
			'keyword',
			'keyword.control',
			'keyword.other',
			'keyword.declaration',
			'storage',
			'storage.type',
			'storage.modifier',
			'keyword.operator.word',
			'keyword.operator.new',
			'keyword.operator.expression',
		]),
		rule('text', [
			'keyword.operator',
			'punctuation',
			'punctuation.separator',
			'punctuation.terminator',
			'punctuation.accessor',
			'meta.brace',
		]),
		rule('type', [
			'entity.name.type',
			'entity.name.class',
			'entity.name.namespace',
			'entity.name.module',
			'entity.other.inherited-class',
			'support.type',
			'support.class',
			'storage.type.primitive',
			'storage.type.core',
			'entity.name.type.primitive',
			'entity.name.type.numeric',
			'constant.language',
			'variable.other.constant',
			'meta.preprocessor',
			'keyword.control.directive',
			'entity.name.tag',
			'entity.name.label',
			'markup.heading',
			'storage.modifier.lifetime',
			'entity.name.type.lifetime',
			'punctuation.definition.lifetime',
		]),
		rule('string', ['string', 'string.quoted', 'punctuation.definition.string', 'markup.inline.raw']),
		rule('escape', [
			'constant.character.escape',
			'constant.character',
			'constant.other.placeholder',
			'punctuation.definition.template-expression',
			'support.function.builtin',
			'variable.language',
		]),
		rule('function', [
			'entity.name.function',
			'support.function',
			'entity.other.attribute-name',
			'entity.name.function.macro',
			'support.function.macro',
			'meta.function-call.generic',
		]),
		rule('identifier', ['variable', 'variable.other', 'meta.definition.variable']),
		rule('variable', [
			'variable.parameter',
			'variable.other.readwrite',
			'punctuation.definition.variable',
			'variable.other.member',
		]),
		rule('enumVariant', ['meta.attribute', 'entity.name.function.decorator', 'meta.decorator']),
		rule('number', ['constant.numeric', 'constant.other.caps']),
		rule('safety', ['keyword.other.unsafe', 'storage.modifier.unsafe']),
		rule('added', ['markup.inserted']),
		rule('removed', ['markup.deleted']),
		rule('error', ['invalid', 'invalid.illegal']),
	],
};
