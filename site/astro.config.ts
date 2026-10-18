import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { ExpressiveCodeTheme } from '@astrojs/starlight/expressive-code';
import { satteri } from '@astrojs/markdown-satteri';
import { academyCodeTheme } from './src/data/code-theme.ts';
import { basePathLinks, glossaryTerms, lazyImages, lessonReferences, mathBlocks, mermaidBlocks, scrollableTables } from './src/plugins/satteri-academy.ts';
import { CHAPTERS, chapterTone } from './src/data/chapters.ts';
import { getLessonIndex } from './src/data/lesson-index.ts';
import { designLayerScript } from './src/data/design-script.ts';
import { readerSettingsScript } from './src/data/reader-settings.ts';
import type { Plugin } from 'vite';
import { BASE, SITE } from './src/data/site.ts';


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

// KaTeX's stylesheet lists each font three times (woff2, woff, ttf). Every
// browser that can read this book takes the woff2, so the other two are dropped
// before the build bundles the fonts, instead of shipping files nobody fetches.
const katexWoff2Only: Plugin = {
	name: 'katex-woff2-only',
	enforce: 'pre',
	transform(code: string, id: string) {
		if (!/katex[\\/]dist[\\/].*\.css$/.test(id)) return;
		return code.replace(/,url\([^)]*\.woff\)\s*format\("woff"\)/g, '').replace(/,url\([^)]*\.ttf\)\s*format\("truetype"\)/g, '');
	},
};

export default defineConfig({
	site: SITE,
	vite: { plugins: [katexWoff2Only] },
	base: BASE,
	trailingSlash: 'always',
	// Fetch a lesson as soon as the pointer rests on its link, so the click
	// that follows usually finds the page already downloaded.
	prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
	markdown: {
		processor: satteri({
			// $$ ... $$ is maths; one dollar sign stays a dollar sign.
			features: { math: { singleDollarTextMath: false } },
			hastPlugins: [mermaidBlocks(), mathBlocks(), glossaryTerms(), lessonReferences(), scrollableTables(), lazyImages(), basePathLinks(BASE)],
		}),
	},
	integrations: [
		starlight({
			title: 'Game Hacking Academy',
			description:
				'A beginner-friendly systems course for learning how games, memory, debuggers, graphics, networking, and reverse-engineering tools work.',
			// The header draws the mark inline (SiteTitle override) so it can use the palette's colours; logo.svg is the same mark as a file.
			logo: { src: './src/assets/logo.svg', alt: 'Game Hacking Academy' },
			favicon: '/favicon.svg',
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
				'./src/styles/reader-progress.css',
				'./src/styles/hover-cards.css',
				'./src/styles/speedtype.css',
				'./src/styles/kit.css',
				'katex/dist/katex.min.css',
				'./src/styles/mermaid.css',
				'./src/styles/home.css',
				'./src/styles/print.css',
				'./src/styles/design/index.css',
				'./src/styles/reader-semantic.css',
				'./src/styles/reader-modern.css',
				'./src/styles/mobile-touch.css',
				'./src/styles/mobile-chrome.css',
				'./src/styles/notes-panel.css',
				'./src/styles/kit-polish.css',
			],
			components: {
				Head: './src/components/overrides/Head.astro',
				PageTitle: './src/components/overrides/PageTitle.astro',
				MarkdownContent: './src/components/overrides/MarkdownContent.astro',
				ThemeSelect: './src/components/overrides/ThemeSelect.astro',
				Pagination: './src/components/overrides/Pagination.astro',
				Sidebar: './src/components/overrides/Sidebar.astro',
				PageSidebar: './src/components/overrides/PageSidebar.astro',
				SiteTitle: './src/components/overrides/SiteTitle.astro',
				Footer: './src/components/overrides/Footer.astro',
			},
			head: [
				// The design layer (src/styles/design/) is the site's theme: it always applies. data-design is only the specificity anchor its selectors use, and the script mirrors the reader-theme choices (data-academy-*) into the attributes those styles read.
				{ tag: 'script', content: designLayerScript },

				// Apply every saved reader-theme choice before first paint, so a dark
				// palette or a light code theme never flashes the defaults. The keys
				// match the Jekyll edition, so returning readers keep their settings.
				{
					tag: 'script',
					content: readerSettingsScript,
				},
				// Icons and the social card (written by scripts/make-identity-assets.mjs). The .ico serves browsers without SVG icons.
				{ tag: 'link', attrs: { rel: 'icon', href: `${BASE}/favicon.ico`, sizes: '32x32' } },
				{ tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${BASE}/apple-touch-icon.png` } },
				{ tag: 'meta', attrs: { property: 'og:image', content: `${SITE}${BASE}/og-card.png` } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
				{ tag: 'meta', attrs: { property: 'og:image:alt', content: 'Game Hacking Academy: a health bar at 100 above the four bytes 64 00 00 00 that store it in memory.' } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: `${SITE}${BASE}/og-card.png` } },
				{ tag: 'link', attrs: { rel: 'glossary', href: `${BASE}/glossary/` } },
				{ tag: 'link', attrs: { rel: 'glossary-index', type: 'application/json', href: `${BASE}/assets/glossary-index.json` } },
				{ tag: 'link', attrs: { rel: 'alternate', type: 'text/plain', title: 'LLM-friendly summary', href: `${BASE}/llms.txt` } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/print-book.js`, defer: true } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/reader-progress.js`, defer: true } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/academy.js?v=sparse-2`, defer: true } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/hover-cards.js`, defer: true } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/kit.js`, defer: true } },
				{ tag: 'script', attrs: { src: `${BASE}/scripts/pager.js`, defer: true } },

				{ tag: 'script', attrs: { src: `${BASE}/scripts/learning-widgets.js?v=sparse-2`, defer: true } },
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
						{ label: 'How games work', link: '/how-games-work/' },
						{ label: 'Glossary', link: '/glossary/' },
						{ label: 'Print or save as PDF', link: '/print/' },
						{ label: 'Using AI assistants', link: '/ai-assistants/' },
						{ label: 'What’s new', link: '/updates/' },
						{ label: 'Lesson components', link: '/components/' },
					],
				},
				...chapterGroups,
			],
		}),
	],
});
