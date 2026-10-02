// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { ExpressiveCodeTheme } from '@astrojs/starlight/expressive-code';
import { satteri } from '@astrojs/markdown-satteri';
import { academyCodeTheme } from './src/data/code-theme.mjs';
import { basePathLinks, lazyImages, mermaidBlocks, scrollableTables } from './src/plugins/satteri-academy.mjs';
import { CHAPTERS, chapterTone } from './src/data/chapters.mjs';
import { getLessonIndex } from './src/data/lesson-index.mjs';
import { readerSettingsScript } from './src/data/reader-settings.mjs';

const SITE = 'https://mustcodeal.github.io';
const BASE = '/rust-game-hacking-book';

// Historical page URLs stay put as lessons move. The displayed chapter and
// lesson numbers in frontmatter control navigation and pagination instead.
const lessonIndex = getLessonIndex();
const chapterGroups = CHAPTERS.map((chapter) => ({
	label: chapter.title,
	collapsed: true,
	items: lessonIndex
		.filter((lesson) => lesson.chapter.startsWith(`${chapter.number}.`))
		.map(({ slug, label }) => ({
			slug, label,
			attrs: { 'data-chapter': chapter.number, 'data-tone': chapterTone(chapter.number) },
		})),
})).filter((chapter) => chapter.items.length);

export default defineConfig({
	site: SITE,
	base: BASE,
	trailingSlash: 'always',
	// Fetch a lesson as soon as the pointer rests on its link, so the click
	// that follows usually finds the page already downloaded.
	prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
	markdown: {
		processor: satteri({
			hastPlugins: [mermaidBlocks(), scrollableTables(), lazyImages(), basePathLinks(BASE)],
		}),
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
				baseUrl: 'https://github.com/MustCodeAl/rust-game-hacking-book/edit/codex/book-revision/site/',
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
				'./src/styles/reader-appearance.css',
				'./src/styles/mermaid.css',
				'./src/styles/home.css',
				'./src/styles/print.css',
			],
			components: {
				Head: './src/components/overrides/Head.astro',
				PageTitle: './src/components/overrides/PageTitle.astro',
				MarkdownContent: './src/components/overrides/MarkdownContent.astro',
				ThemeSelect: './src/components/overrides/ThemeSelect.astro',
				Pagination: './src/components/overrides/Pagination.astro',
			},
			head: [
				// Apply every saved reader-theme choice before first paint, so a dark
				// palette or a light code theme never flashes the defaults. The keys
				// match the Jekyll edition, so returning readers keep their settings.
				{
					tag: 'script',
					content: readerSettingsScript,
				},
				{ tag: 'link', attrs: { rel: 'glossary', href: `${BASE}/glossary/` } },
				{ tag: 'link', attrs: { rel: 'glossary-index', type: 'application/json', href: `${BASE}/assets/glossary-index.json` } },
				{ tag: 'link', attrs: { rel: 'alternate', type: 'text/plain', title: 'LLM-friendly summary', href: `${BASE}/llms.txt` } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/print-book.js`, defer: true } },
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
