// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { ExpressiveCodeTheme } from '@astrojs/starlight/expressive-code';
import { satteri } from '@astrojs/markdown-satteri';
import { academyCodeTheme } from './src/data/code-theme.mjs';
import { basePathLinks, glossaryTerms, lazyImages, lessonReferences, mathBlocks, mermaidBlocks, scrollableTables } from './src/plugins/satteri-academy.mjs';
import { CHAPTERS, chapterTone } from './src/data/chapters.mjs';
import { getLessonIndex } from './src/data/lesson-index.mjs';
import { readerSettingsScript } from './src/data/reader-settings.mjs';
import { BASE, SITE } from './src/data/site.mjs';


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
const katexWoff2Only = {
	name: 'katex-woff2-only',
	enforce: 'pre',
	transform(code, id) {
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
			],
			components: {
				Head: './src/components/overrides/Head.astro',
				PageTitle: './src/components/overrides/PageTitle.astro',
				MarkdownContent: './src/components/overrides/MarkdownContent.astro',
				ThemeSelect: './src/components/overrides/ThemeSelect.astro',
				Pagination: './src/components/overrides/Pagination.astro',
				Sidebar: './src/components/overrides/Sidebar.astro',
				PageSidebar: './src/components/overrides/PageSidebar.astro',
			},
			head: [
				// The design layer (src/styles/design/) is the site's theme: it always applies. data-design is only the specificity anchor its selectors use, and the script mirrors the reader-theme choices (data-academy-*) into the attributes those styles read.
				{ tag: 'script', content: "(function(){try{var r=document.documentElement;r.setAttribute('data-design','v2');function set(k,v){if(v==null||v==='')r.removeAttribute(k);else if(r.getAttribute(k)!==v)r.setAttribute(k,v)}var A=['theme','academy-mode','academy-theme','academy-background','academy-code-choice','academy-semantic','academy-ligatures','academy-cards','academy-comments','academy-chat','academy-gradients','academy-grid','academy-heading-style','academy-diagram-background','academy-diagram-fill','academy-diagram-labels','academy-diagram-borders','academy-diagram-size','academy-text-size','academy-spacing','academy-motion','academy-tier','academy-appearance','academy-drawer','academy-depth','academy-surface','academy-inline-code','academy-floating','academy-toc-tone','academy-measure'];function sync(){var d=r.dataset;set('data-palette',d.academyTheme||'paper');set('data-brightness',d.academyMode||(d.theme==='dark'?'dark':'light'));set('data-bg',d.academyBackground||'theme');set('data-code-brightness',d.academyCodeChoice==='page'?'match':(d.academyCodeChoice||'dark'));set('data-semantic',d.academySemantic==='off'?'off':'on');set('data-ligatures',d.academyLigatures==='on'?'on':'off');set('data-hovercards',d.academyCards==='off'?'off':'on');set('data-comments',d.academyComments==='hide'?'hide':'show');set('data-chat-position',d.academyChat||'bottom-right');set('data-gradients',d.academyGradients==='off'?'off':'on');set('data-page-grid',d.academyGrid==='off'?'off':'on');set('data-heading-boxes',d.academyHeadingStyle==='plain'?'off':'on');set('data-diagram-bg',d.academyDiagramBackground||'theme');set('data-diagram-boxes',d.academyDiagramFill||'tinted');set('data-diagram-labels',d.academyDiagramLabels||'soft');set('data-diagram-frames',d.academyDiagramBorders||'soft');set('data-diagram-size',d.academyDiagramSize==='actual'?'full':'fit');set('data-font-size',d.academyTextSize==='small'||d.academyTextSize==='large'?d.academyTextSize:'default');set('data-spacing',d.academySpacing==='compact'||d.academySpacing==='spacious'?d.academySpacing:'default');set('data-motion',d.academyMotion==='off'?'off':(d.academyMotion==='onrequest'?'on-play':'system'));set('data-settings-tier',d.academyTier||'basic');set('data-drawer',d.academyDrawer==='sheet'?'sheet':'popover');set('data-depth',d.academyDepth==='soft'?'soft':'flat');set('data-surface-contrast',d.academySurface==='unified'?'unified':'default');set('data-inline-code',d.academyInlineCode==='soft'?'soft':'classic');set('data-floating-ui',d.academyFloating==='minimal'?'minimal':'docked');set('data-toc-tone',d.academyTocTone&&d.academyTocTone!=='page'?d.academyTocTone:null);set('data-measure',d.academyMeasure&&d.academyMeasure!=='standard'?d.academyMeasure:null)}new MutationObserver(sync).observe(r,{attributes:true,attributeFilter:A.map(function(n){return'data-'+n})});document.addEventListener('DOMContentLoaded',sync);sync()}catch(e){}})()" },

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
