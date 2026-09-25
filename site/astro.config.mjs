// @ts-check
import { existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { ExpressiveCodeTheme } from '@astrojs/starlight/expressive-code';
import { satteri } from '@astrojs/markdown-satteri';
import { academyCodeTheme } from './src/data/code-theme.mjs';
import { basePathLinks, mermaidBlocks } from './src/plugins/satteri-academy.mjs';
import { CHAPTERS } from './src/data/chapters.mjs';

const SITE = 'https://mustcodeal.github.io';
const BASE = '/rust-game-hacking-book';

// One collapsed sidebar group per chapter that has lessons. Starlight opens
// the group holding the current page, so readers still land expanded. The
// chapter numbers come from a CSS counter in reader.css.
const chapterGroups = CHAPTERS.filter((chapter) =>
	existsSync(new URL(`./src/content/docs/pages/${chapter.number}/`, import.meta.url)),
).map((chapter) => ({
	label: chapter.title,
	collapsed: true,
	items: [{ autogenerate: { directory: `pages/${chapter.number}` } }],
}));

export default defineConfig({
	site: SITE,
	base: BASE,
	trailingSlash: 'always',
	markdown: {
		processor: satteri({ hastPlugins: [mermaidBlocks(), basePathLinks(BASE)] }),
	},
	integrations: [
		starlight({
			title: 'Game Hacking Academy',
			description:
				'A beginner-friendly systems course for learning how games, memory, debuggers, graphics, networking, and reverse-engineering tools work.',
			logo: { src: './src/assets/logo.svg', alt: 'Game Hacking Academy' },
			favicon: '/favicon.ico',
			social: [
				{ icon: 'github', label: 'Source on GitHub', href: 'https://github.com/MustCodeAl/rust-game-hacking-book' },
			],
			editLink: {
				baseUrl: 'https://github.com/MustCodeAl/rust-game-hacking-book/edit/rustgamehackingreimagined/site/',
			},
			lastUpdated: false,
			pagination: true,
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			customCss: [
				'./src/styles/legacy-tokens.css',
				'./src/styles/academy.css',
				'./src/styles/legacy-components.css',
				'./src/styles/learning-widgets.css',
				'./src/styles/code-theme.css',
				'./src/styles/reader.css',
				'./src/styles/mermaid.css',
				'./src/styles/home.css',
			],
			components: {
				PageTitle: './src/components/overrides/PageTitle.astro',
				MarkdownContent: './src/components/overrides/MarkdownContent.astro',
				ThemeSelect: './src/components/overrides/ThemeSelect.astro',
			},
			head: [
				// Apply every saved reader-theme choice before first paint, so a dark
				// palette or a light code theme never flashes the defaults. The keys
				// match the Jekyll edition, so returning readers keep their settings.
				{
					tag: 'script',
					content:
						"(function(){var r=document.documentElement;function g(k){try{return localStorage.getItem(k)}catch(e){return null}}function p(v,l,d){return l.indexOf(v)>=0?v:d}r.dataset.academyTheme=p(g('gha-theme'),['paper','purple','midnight','forest','contrast'],'paper');var m=g('gha-mode');if(m==='light'||m==='dark')r.dataset.theme=m;r.dataset.academyCodeMode=p(g('gha-code-mode'),['dark','light'],'dark');r.dataset.academySyntax=p(g('gha-syntax-palette'),['academy','cyber','aurora','solar','ocean','mono'],'academy');r.dataset.academyBackground=p(g('gha-background-tone')||g('gha-background'),['theme','warm','cool','rose','neutral'],'theme');r.dataset.academySemantic=g('gha-semantic-highlighting')==='off'?'off':'on';r.dataset.academyLigatures=g('gha-code-ligatures')==='on'?'on':'off'})()",
				},
				{ tag: 'link', attrs: { rel: 'glossary', href: `${BASE}/glossary/` } },
				{ tag: 'link', attrs: { rel: 'glossary-index', type: 'application/json', href: `${BASE}/assets/glossary-index.json` } },
				{ tag: 'link', attrs: { rel: 'alternate', type: 'text/plain', title: 'LLM-friendly summary', href: `${BASE}/llms.txt` } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/academy.js`, defer: true } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/learning-widgets.js`, defer: true } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/mermaid-loader.js`, type: 'module' } },
			],
			// Code blocks use one role-marker theme; code-theme.css repaints each role
			// with the reader's code brightness and syntax palette.
			expressiveCode: {
				themes: [new ExpressiveCodeTheme(academyCodeTheme)],
				useStarlightDarkModeSwitch: false,
				useStarlightUiThemeColors: false,
				minSyntaxHighlightingColorContrast: 0,
				shiki: { langAlias: { nasm: 'asm' } },
				defaultProps: { wrap: false },
				styleOverrides: { borderRadius: '10px', codeFontFamily: 'var(--mono)', codeFontSize: '0.84rem', codeLineHeight: '1.72' },
			},
			sidebar: [
				{
					label: 'Start here',
					items: [
						{ label: 'Book home', link: '/' },
						{ label: 'All lessons', link: '/contents/' },
						{ label: 'Glossary', link: '/glossary/' },
						{ label: 'Print or save as PDF', link: '/print/' },
						{ label: 'Using AI assistants', link: '/ai-assistants/' },
					],
				},
				...chapterGroups,
			],
		}),
	],
});
