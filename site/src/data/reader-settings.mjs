// Share first-paint preferences between the lesson, reader, and print routes.
// Storage can be unavailable in private browsing; every choice has a default.
export const readerSettingsScript = `(${function () {
  var root = document.documentElement;
  function get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function choose(value, values, fallback) { return values.indexOf(value) >= 0 ? value : fallback; }
  var settings = [
    ['academyTheme', 'gha-theme', ['paper', 'purple', 'midnight', 'forest', 'contrast'], 'paper'],
    ['academySyntax', 'gha-syntax-palette', ['academy', 'cyber', 'aurora', 'solar', 'ocean', 'mono'], 'academy'],
    ['academyDiagramBackground', 'gha-diagram-background', ['theme', 'page', 'warm', 'cool', 'rose', 'neutral'], 'theme'],
    ['academyDiagramFill', 'gha-diagram-fill', ['tinted', 'plain'], 'tinted'],
    ['academyDiagramLabels', 'gha-diagram-labels', ['soft', 'outlined', 'none'], 'soft'],
    ['academyDiagramBorders', 'gha-diagram-borders', ['soft', 'strong', 'none'], 'soft'],
    ['academyDiagramSize', 'gha-diagram-size', ['fit', 'actual'], 'fit'],
    ['academyGrid', 'gha-grid', ['on', 'off'], 'on'],
    ['academyCards', 'gha-cards', ['on', 'off'], 'on'],
    ['academyChat', 'gha-chat', ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'off'], 'bottom-right'],
    ['academyGradients', 'gha-gradients', ['on', 'off'], 'on'],
    ['academyMotion', 'gha-motion', ['system', 'onrequest', 'off'], 'system'],
    ['academyAnimationSpeed', 'gha-animation-speed', ['slow', 'normal', 'fast'], 'normal'],
    ['academyHeadingStyle', 'gha-heading-style', ['boxed', 'plain'], 'boxed'],
    ['academyTextSize', 'gha-text-size', ['small', 'standard', 'large'], 'standard'],
    ['academySpacing', 'gha-spacing', ['compact', 'comfortable', 'spacious'], 'comfortable'],
    ['academySemantic', 'gha-semantic-highlighting', ['on', 'off'], 'on'],
    ['academyLigatures', 'gha-code-ligatures', ['on', 'off'], 'off'],
    ['academySidebar', 'gha-sidebar', ['shown', 'hidden'], 'shown'],
    ['academyToc', 'gha-toc', ['shown', 'hidden'], 'shown'],
    ['academyUi', 'gha-ui', ['classic', 'refined'], 'classic'],
    ['academySurface', 'gha-surface', ['default', 'unified'], 'default'],
    ['academyInlineCode', 'gha-inline-code', ['classic', 'soft'], 'classic'],
    ['academyFloating', 'gha-floating', ['docked', 'minimal'], 'docked'],
    ['academyTocTone', 'gha-toc-tone', ['page', 'light', 'dark'], 'page'],
    ['academyMeasure', 'gha-measure', ['narrow', 'standard', 'wide'], 'standard']
  ];
  settings.forEach(function (setting) { root.dataset[setting[0]] = choose(get(setting[1]), setting[2], setting[3]); });
  root.dataset.academyBackground = choose(get('gha-background-tone') || get('gha-background'), ['theme', 'warm', 'cool', 'rose', 'neutral'], 'theme');
  root.dataset.academyMode = choose(get('gha-mode'), ['light', 'dark', 'auto'], 'auto');
  root.dataset.theme = root.dataset.academyMode === 'auto'
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : root.dataset.academyMode;
  // Code brightness: "page" (the default) follows the page, so a light page gets a light code surface; "dark" and "light" are
  // explicit. academyCodeChoice is what the reader chose, academyCodeMode is what the stylesheets key on.
  root.dataset.academyCodeChoice = choose(get('gha-code-mode'), ['page', 'dark', 'light'], 'dark');
  root.dataset.academyCodeMode = root.dataset.academyCodeChoice === 'page' ? root.dataset.theme : root.dataset.academyCodeChoice;
}.toString()})();`;
