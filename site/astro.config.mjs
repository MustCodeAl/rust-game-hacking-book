// @ts-check
import { existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { satteri } from '@astrojs/markdown-satteri';
import { basePathLinks, mermaidBlocks } from './src/plugins/satteri-academy.mjs';
import { CHAPTERS } from './src/data/chapters.mjs';

const SITE = 'https://mustcodeal.github.io';
const BASE = '/rust-game-hacking-book';

// One collapsed sidebar group per chapter that has lessons. Starlight opens
// the group holding the current page, so readers still land expanded.
const chapterGroups = CHAPTERS.filter((chapter) =>
	existsSync(new URL(`./src/content/docs/pages/${chapter.number}/`, import.meta.url)),
).map((chapter) => ({
	label: `${String(chapter.number).padStart(2, '0')} · ${chapter.title}`,
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
				'./src/styles/mermaid.css',
				'./src/styles/home.css',
			],
			components: {
				PageTitle: './src/components/overrides/PageTitle.astro',
				MarkdownContent: './src/components/overrides/MarkdownContent.astro',
				ThemeSelect: './src/components/overrides/ThemeSelect.astro',
			},
			head: [
				// Apply the saved palette before first paint, so a dark palette never
				// flashes the default colours on navigation.
				{
					tag: 'script',
					content:
						"try{var t=localStorage.getItem('gha-theme'),b=localStorage.getItem('gha-background'),r=document.documentElement;r.dataset.academyTheme=['paper','purple','midnight','forest','contrast'].indexOf(t)>=0?t:'paper';if(['warm','cool','rose','neutral'].indexOf(b)>=0)r.dataset.academyBackground=b}catch(e){document.documentElement.dataset.academyTheme='paper'}",
				},
				{ tag: 'link', attrs: { rel: 'glossary', href: `${BASE}/glossary/` } },
				{ tag: 'link', attrs: { rel: 'glossary-index', type: 'application/json', href: `${BASE}/assets/glossary-index.json` } },
				{ tag: 'link', attrs: { rel: 'alternate', type: 'text/plain', title: 'LLM-friendly summary', href: `${BASE}/llms.txt` } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/academy.js`, defer: true } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/learning-widgets.js`, defer: true } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/mermaid-loader.js`, type: 'module' } },
			],
			expressiveCode: {
				shiki: { langAlias: { nasm: 'asm' } },
				defaultProps: { wrap: false },
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
