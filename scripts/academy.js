// Game Hacking Academy page features for the Starlight site: the reader-theme
// panel, semantic code colours, the reading progress bar, the projection
// playground, and glossary links. Anything that would rewrite the whole page
// on load (table wrappers, code badges) is done by the build or by CSS instead,
// and the rest runs lazily, so a long lesson stays quick to open and scroll.
(function () {
  "use strict";

  var root = document.documentElement;

  var THEMES = [
    { id: "paper", label: "Paper" },
    { id: "purple", label: "Purple" },
    { id: "midnight", label: "Midnight" },
    { id: "forest", label: "Forest" },
    { id: "contrast", label: "Contrast" }
  ];
  var MODE_LABELS = { light: "Light", dark: "Dark", auto: "Auto" };
  var CODE_MODES = ["dark", "light"];
  var SYNTAX_PALETTES = ["academy", "cyber", "aurora", "solar", "ocean", "mono"];
  var BACKGROUND_TONES = ["theme", "warm", "cool", "rose", "neutral"];
  // These choices change presentation only. Chapter identity, diagram roles,
  // and code syntax keep their own meanings regardless of the selected surface.
  var READER_CHOICES = {
    diagramBackground: { attribute: "academyDiagramBackground", key: "gha-diagram-background", values: BACKGROUND_TONES.concat(["page"]), fallback: "theme", control: "data-diagram-background-choice" },
    diagramFill: { attribute: "academyDiagramFill", key: "gha-diagram-fill", values: ["tinted", "plain"], fallback: "tinted", control: "data-diagram-fill-choice" },
    diagramLabels: { attribute: "academyDiagramLabels", key: "gha-diagram-labels", values: ["soft", "outlined", "none"], fallback: "soft", control: "data-diagram-labels-choice" },
    diagramBorders: { attribute: "academyDiagramBorders", key: "gha-diagram-borders", values: ["soft", "strong", "none"], fallback: "soft", control: "data-diagram-borders-choice" },
    diagramSize: { attribute: "academyDiagramSize", key: "gha-diagram-size", values: ["fit", "actual"], fallback: "fit", control: "data-diagram-size-choice" },
    grid: { attribute: "academyGrid", key: "gha-grid", values: ["on", "off"], fallback: "on", control: "data-grid-choice" },
    gradients: { attribute: "academyGradients", key: "gha-gradients", values: ["on", "off"], fallback: "on", control: "data-gradients-choice" },
    motion: { attribute: "academyMotion", key: "gha-motion", values: ["system", "onrequest", "off"], fallback: "system", control: "data-motion-choice" },
    animationSpeed: { attribute: "academyAnimationSpeed", key: "gha-animation-speed", values: ["slow", "normal", "fast"], fallback: "normal", control: "data-animation-speed-choice" },
    headingStyle: { attribute: "academyHeadingStyle", key: "gha-heading-style", values: ["boxed", "plain"], fallback: "boxed", control: "data-heading-style-choice" },
    textSize: { attribute: "academyTextSize", key: "gha-text-size", values: ["small", "standard", "large"], fallback: "standard", control: "data-text-size-choice" },
    spacing: { attribute: "academySpacing", key: "gha-spacing", values: ["compact", "comfortable", "spacious"], fallback: "comfortable", control: "data-spacing-choice" }
  };

  var SEMANTIC_TOKENS = {
    safety: [
      "unsafe", "transmute", "from_raw", "from_raw_parts", "from_raw_parts_mut",
      "read_unaligned", "write_unaligned"
    ],
    result: ["Result", "Option"],
    "enum-variant": ["Ok", "Err", "Some", "None"],
    windows: [
      "BOOL", "DWORD", "HANDLE", "HMODULE", "HWND", "LPVOID", "MODULEENTRY32W",
      "PROCESSENTRY32W", "CloseHandle", "CreateRemoteThread", "CreateToolhelp32Snapshot",
      "ClientToScreen", "EnumWindows", "GetAsyncKeyState", "GetClientRect",
      "GetForegroundWindow", "GetLastError", "GetModuleHandleW", "GetProcAddress",
      "GetWindowThreadProcessId", "Module32FirstW", "Module32NextW", "OpenProcess",
      "Process32FirstW", "Process32NextW", "PostMessageW", "ReadProcessMemory", "SendInput",
      "SendMessageTimeoutW", "SendMessageW", "VirtualAllocEx", "VirtualFreeEx", "VirtualProtect",
      "VirtualProtectEx", "WaitForSingleObject", "WriteProcessMemory"
    ],
    memory: [
      "address", "base_address", "offset", "pointer", "ptr", "usize", "isize",
      "MEM_COMMIT", "MEM_RELEASE", "MEM_RESERVE", "PAGE_EXECUTE_READWRITE",
      "PAGE_READONLY", "PAGE_READWRITE"
    ],
    command: [
      "cargo", "cd", "git", "rustc", "rustup", "Get-Process", "Get-Content",
      "Set-Location", "Select-String"
    ]
  };
  var RUST_ROLES = ["safety", "result", "enum-variant", "windows", "memory"];
  var REGISTER = /^(?:[re]?(?:ax|bx|cx|dx|si|di|sp|bp|ip)|[abcd][lh]|r(?:[89]|1[0-5])[dwb]?|[xyz]mm\d{1,2}|[cdefgs]s|cr[0-8]|dr[0-7])$/i;
  // Role colours from src/data/code-theme.mjs, as Expressive Code writes them.
  var IDENTIFIER_COLOR = "#eee8dc";
  var COMMENT_COLOR = "#bdb19d";

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) { /* private mode */ }
  }

  function storageRemove(key) {
    try { window.localStorage.removeItem(key); } catch (error) { /* private mode */ }
  }

  // ------------------------------------------------------------------
  // Reader theme
  // ------------------------------------------------------------------

  function savedMode() {
    // Keep a click effective even when private browsing blocks storage.
    var mode = root.dataset.academyMode || storageGet("gha-mode");
    return mode === "light" || mode === "dark" ? mode : "auto";
  }

  function systemMode() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function setPressed(attribute, value) {
    document.querySelectorAll("[" + attribute + "]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute(attribute) === value ? "true" : "false");
    });
  }

  function syncThemeControls() {
    var theme = THEMES.find(function (candidate) { return candidate.id === root.dataset.academyTheme; }) || THEMES[0];
    var mode = savedMode();
    document.querySelectorAll("[data-theme-label]").forEach(function (label) { label.textContent = theme.label; });
    document.querySelectorAll("[data-mode-label]").forEach(function (label) { label.textContent = MODE_LABELS[mode]; });
    setPressed("data-theme-choice", theme.id);
    setPressed("data-mode-choice", mode);
    setPressed("data-code-mode-choice", root.dataset.academyCodeMode || "dark");
    setPressed("data-syntax-palette-choice", root.dataset.academySyntax || "academy");
    setPressed("data-background-choice", root.dataset.academyBackground || "theme");
    setPressed("data-semantic-choice", root.dataset.academySemantic === "off" ? "off" : "on");
    setPressed("data-ligature-choice", root.dataset.academyLigatures === "on" ? "on" : "off");
    Object.keys(READER_CHOICES).forEach(function (name) {
      var choice = READER_CHOICES[name];
      setPressed(choice.control, root.dataset[choice.attribute] || choice.fallback);
    });
    syncPanelToggles();
  }

  // The lesson list on the left and "On this page" on the right can each be
  // hidden. A button's aria-pressed is "true" while its panel is showing.
  var PANELS = {
    sidebar: { key: "gha-sidebar", attribute: "academySidebar", label: "the lesson list", shortcut: "Alt+N" },
    toc: { key: "gha-toc", attribute: "academyToc", label: "“On this page”", shortcut: "Alt+O" }
  };

  function panelShown(name) {
    return root.dataset[PANELS[name].attribute] !== "hidden";
  }

  function syncPanelToggles() {
    document.querySelectorAll("[data-panel-toggle]").forEach(function (button) {
      var name = button.getAttribute("data-panel-toggle");
      if (!PANELS[name]) return;
      var shown = panelShown(name);
      button.setAttribute("aria-pressed", shown ? "true" : "false");
      button.title = (shown ? "Hide " : "Show ") + PANELS[name].label + " (" + PANELS[name].shortcut + ")";
    });
  }

  function applyPanel(name, shown) {
    var panel = PANELS[name];
    if (!panel) return;
    root.dataset[panel.attribute] = shown ? "shown" : "hidden";
    if (shown) storageRemove(panel.key);
    else storageSet(panel.key, "hidden");
    syncPanelToggles();
  }

  function togglePanel(name) {
    applyPanel(name, !panelShown(name));
  }

  function applyTheme(id) {
    var theme = THEMES.some(function (candidate) { return candidate.id === id; }) ? id : "paper";
    root.dataset.academyTheme = theme;
    storageSet("gha-theme", theme);
    syncThemeControls();
  }

  // Starlight keeps its own copy of the mode under "starlight-theme"; both are
  // written so the two scripts agree on the next page load.
  function applyMode(id) {
    var mode = id === "light" || id === "dark" ? id : "auto";
    root.dataset.academyMode = mode;
    root.dataset.theme = mode === "auto" ? systemMode() : mode;
    if (mode === "auto") {
      storageRemove("gha-mode");
      storageSet("starlight-theme", "");
    } else {
      storageSet("gha-mode", mode);
      storageSet("starlight-theme", mode);
    }
    syncThemeControls();
  }

  function applyCodeMode(id) {
    var mode = CODE_MODES.indexOf(id) === -1 ? "dark" : id;
    root.dataset.academyCodeMode = mode;
    storageSet("gha-code-mode", mode);
    syncThemeControls();
  }

  function applySyntaxPalette(id) {
    var palette = SYNTAX_PALETTES.indexOf(id) === -1 ? "academy" : id;
    root.dataset.academySyntax = palette;
    storageSet("gha-syntax-palette", palette);
    syncThemeControls();
  }

  function applyBackground(id) {
    var tone = BACKGROUND_TONES.indexOf(id) === -1 ? "theme" : id;
    root.dataset.academyBackground = tone;
    storageSet("gha-background-tone", tone);
    storageRemove("gha-background");
    syncThemeControls();
  }

  function applyReaderChoice(name, id) {
    var choice = READER_CHOICES[name];
    var value = choice.values.indexOf(id) === -1 ? choice.fallback : id;
    root.dataset[choice.attribute] = value;
    storageSet(choice.key, value);
    syncThemeControls();
    if (typeof window.CustomEvent === "function") document.dispatchEvent(new window.CustomEvent("academy:reader-preference", { detail: { name: name, value: value } }));
  }

  function applySemanticSetting(id) {
    var setting = id === "off" ? "off" : "on";
    root.dataset.academySemantic = setting;
    storageSet("gha-semantic-highlighting", setting);
    refreshSemanticHighlighting();
    syncThemeControls();
  }

  function applyLigatureSetting(id) {
    var setting = id === "on" ? "on" : "off";
    root.dataset.academyLigatures = setting;
    storageSet("gha-code-ligatures", setting);
    syncThemeControls();
  }

  function cycle(list, current) {
    return list[(list.indexOf(current) + 1) % list.length];
  }

  function closeThemeMenus(except) {
    document.querySelectorAll("[data-theme-switcher]").forEach(function (switcher) {
      if (switcher === except) return;
      var toggle = switcher.querySelector(".theme-switcher__toggle");
      var menu = switcher.querySelector(".theme-switcher__menu");
      if (!toggle || !menu) return;
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  function onThemeClick(event) {
    var target = event.target.closest(
      "[data-theme-choice], [data-mode-choice], [data-code-mode-choice], [data-syntax-palette-choice], " +
      "[data-background-choice], [data-semantic-choice], [data-ligature-choice], [data-theme-reset], " +
      "[data-diagram-background-choice], [data-diagram-fill-choice], [data-heading-style-choice], [data-text-size-choice], [data-spacing-choice], " +
      "[data-diagram-labels-choice], [data-diagram-borders-choice], [data-diagram-size-choice], [data-grid-choice], [data-gradients-choice], [data-motion-choice], [data-animation-speed-choice], " +
      "[data-print-book], [data-panel-toggle], .theme-switcher__toggle"
    );
    if (!target) {
      closeThemeMenus(event.target.closest("[data-theme-switcher]"));
      return;
    }
    var data = target.dataset;
    if ("themeChoice" in data) return applyTheme(data.themeChoice);
    if ("modeChoice" in data) return applyMode(data.modeChoice);
    if ("codeModeChoice" in data) return applyCodeMode(data.codeModeChoice);
    if ("syntaxPaletteChoice" in data) return applySyntaxPalette(data.syntaxPaletteChoice);
    if ("backgroundChoice" in data) return applyBackground(data.backgroundChoice);
    if ("diagramBackgroundChoice" in data) return applyReaderChoice("diagramBackground", data.diagramBackgroundChoice);
    if ("diagramFillChoice" in data) return applyReaderChoice("diagramFill", data.diagramFillChoice);
    if ("diagramLabelsChoice" in data) return applyReaderChoice("diagramLabels", data.diagramLabelsChoice);
    if ("diagramBordersChoice" in data) return applyReaderChoice("diagramBorders", data.diagramBordersChoice);
    if ("diagramSizeChoice" in data) return applyReaderChoice("diagramSize", data.diagramSizeChoice);
    if ("gridChoice" in data) return applyReaderChoice("grid", data.gridChoice);
    if ("gradientsChoice" in data) return applyReaderChoice("gradients", data.gradientsChoice);
    if ("motionChoice" in data) return applyReaderChoice("motion", data.motionChoice);
    if ("animationSpeedChoice" in data) return applyReaderChoice("animationSpeed", data.animationSpeedChoice);
    if ("headingStyleChoice" in data) return applyReaderChoice("headingStyle", data.headingStyleChoice);
    if ("textSizeChoice" in data) return applyReaderChoice("textSize", data.textSizeChoice);
    if ("spacingChoice" in data) return applyReaderChoice("spacing", data.spacingChoice);
    if ("semanticChoice" in data) return applySemanticSetting(data.semanticChoice);
    if ("ligatureChoice" in data) return applyLigatureSetting(data.ligatureChoice);
    if ("panelToggle" in data) return togglePanel(data.panelToggle);
    if ("themeReset" in data) {
      applyTheme("paper");
      applyMode("auto");
      applyBackground("theme");
      applyCodeMode("dark");
      applySyntaxPalette("academy");
      applySemanticSetting("on");
      applyLigatureSetting("off");
      Object.keys(READER_CHOICES).forEach(function (name) {
        applyReaderChoice(name, READER_CHOICES[name].fallback);
      });
      applyPanel("sidebar", true);
      applyPanel("toc", true);
      return;
    }
    if ("printBook" in data) {
      closeThemeMenus();
      if (window.AcademyPrint) window.AcademyPrint.open();
      return;
    }
    var switcher = target.closest("[data-theme-switcher]");
    var menu = switcher && switcher.querySelector(".theme-switcher__menu");
    if (!menu) return;
    var willOpen = menu.hidden;
    closeThemeMenus(willOpen ? switcher : null);
    menu.hidden = !willOpen;
    target.setAttribute("aria-expanded", willOpen ? "true" : "false");
  }

  // Shortcuts use the physical key (event.code), because Option + T on a Mac
  // types "†" rather than reporting "t".
  function onThemeKey(event) {
    if (event.key === "Escape") {
      // Closing a menu that holds focus sends focus back to its toggle, so a
      // keyboard reader is not left on a button that just disappeared.
      var active = document.activeElement;
      var holder = active && active.closest && active.closest("[data-theme-switcher]");
      closeThemeMenus();
      if (holder) holder.querySelector(".theme-switcher__toggle").focus();
    }
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest && event.target.closest("input, textarea, select, [contenteditable]")) return;
    var actions = {
      KeyT: function () { applyTheme(cycle(THEMES.map(function (t) { return t.id; }), root.dataset.academyTheme)); },
      KeyD: function () { applyMode(root.dataset.theme === "dark" ? "light" : "dark"); },
      KeyC: function () { applyCodeMode(root.dataset.academyCodeMode === "light" ? "dark" : "light"); },
      KeyS: function () { applySyntaxPalette(cycle(SYNTAX_PALETTES, root.dataset.academySyntax || "academy")); },
      KeyH: function () { applySemanticSetting(root.dataset.academySemantic === "off" ? "on" : "off"); },
      KeyL: function () { applyLigatureSetting(root.dataset.academyLigatures === "on" ? "off" : "on"); },
      KeyN: function () { togglePanel("sidebar"); },
      KeyO: function () { togglePanel("toc"); }
    };
    if (!actions[event.code]) return;
    event.preventDefault();
    actions[event.code]();
  }

  function initThemeSwitcher() {
    syncThemeControls();
    if (window.__academyThemeEventsBound) return;
    window.__academyThemeEventsBound = true;
    document.addEventListener("click", onThemeClick);
    document.addEventListener("keydown", onThemeKey);
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", function () {
        if (savedMode() === "auto") root.dataset.theme = systemMode();
      });
    }
  }

  // ------------------------------------------------------------------
  // Code blocks: language badges and semantic colours
  // ------------------------------------------------------------------

  function codeFrames() {
    return Array.prototype.slice.call(document.querySelectorAll(".sl-markdown-content .expressive-code .frame"));
  }

  function frameLanguage(frame) {
    var pre = frame.querySelector("pre[data-language]");
    return pre ? pre.getAttribute("data-language") : "text";
  }

  function frameText(frame) {
    return Array.prototype.map.call(frame.querySelectorAll(".ec-line"), function (line) {
      return line.textContent;
    }).join("\n");
  }

  // Variants declared in this page's Rust enums, so `State::Chase` and a bare
  // `Chase` both read as variants in later blocks.
  function findDeclaredEnumVariants() {
    var variants = {};
    codeFrames().forEach(function (frame) {
      if (frameLanguage(frame) !== "rust") return;
      var text = frameText(frame).replace(/\/\/[^\n]*/g, "");
      var pattern = /\benum\s+[A-Za-z_]\w*\s*(?:<[^>{]*>)?\s*\{/g;
      var match;
      while ((match = pattern.exec(text))) {
        var depth = 1;
        var start = pattern.lastIndex;
        var index = start;
        while (index < text.length && depth > 0) {
          var character = text[index];
          if (character === "{" || character === "(" || character === "[") depth += 1;
          if (character === "}" || character === ")" || character === "]") depth -= 1;
          if (depth === 1 && character === ",") text = text.slice(0, index) + "\u0000" + text.slice(index + 1);
          index += 1;
        }
        text.slice(start, index - 1).split("\u0000").forEach(function (part) {
          var variant = part.replace(/#\[[^\]]*\]/g, "").trim().match(/^([A-Z][A-Za-z0-9_]*)/);
          if (variant) variants[variant[1]] = true;
        });
      }
    });
    return variants;
  }

  function spanColor(node) {
    var span = node.parentElement && node.parentElement.closest("span[style]");
    var match = span && /--0:\s*(#[0-9a-f]{6})/i.exec(span.getAttribute("style") || "");
    return match ? match[1].toLowerCase() : "";
  }

  function roleForWord(language, word, context) {
    if (language === "rust") {
      for (var i = 0; i < RUST_ROLES.length; i += 1) {
        if (SEMANTIC_TOKENS[RUST_ROLES[i]].indexOf(word) !== -1) return RUST_ROLES[i];
      }
      if (context.variants[word]) return "enum-variant";
      if (context.color === IDENTIFIER_COLOR && /^[a-z_][A-Za-z0-9_]*$/.test(word)) return "variable";
      return null;
    }
    if (language === "asm" || language === "nasm") {
      if (REGISTER.test(word)) return "register";
      if (context.firstWord && /^[a-z]{2,8}$/i.test(word)) return "instruction";
      if (/^(?:0x[0-9a-f]+|[0-9][0-9a-f]*h)$/i.test(word)) return "memory";
      return null;
    }
    if (language === "powershell" || language === "ps1") {
      if (SEMANTIC_TOKENS.command.indexOf(word) !== -1) return "command";
      if (/^\$\w+$/.test(word)) return "variable";
    }
    return null;
  }

  // A small icon after a comment's marker gives each comment a visible purpose.
  function decorateComment(span) {
    if (span.dataset.commentOriginal !== undefined) return;
    var original = span.textContent;
    var marker = original.match(/^(\s*(?:\/\/+|<!--|--(?!>)|#|;|\/\*+|\*+)\s*)/);
    if (!marker) return;
    var comment = original.slice(marker[0].length);
    if (!comment || /^(?:🛡️|⚠️|✅|❌|🔍|🛠️|💡|🧠|🧪|📦|🎯|🧹|📏|🔁|🧭|🔒)/u.test(comment)) return;
    var emoji = "💡";
    if (/\b(?:warning|caution|danger|never|do not)\b/i.test(comment)) emoji = "⚠️";
    else if (/\b(?:safety|safe|permission|validate|bounds?|guard)\b/i.test(comment)) emoji = "🛡️";
    else if (/\b(?:test|assert|verify|expect|check)\b/i.test(comment)) emoji = "✅";
    else if (/\b(?:read|find|scan|observe|inspect|look|trace)\b/i.test(comment)) emoji = "🔍";
    else if (/\b(?:todo|build|create|write|implement|replace)\b/i.test(comment)) emoji = "🛠️";
    span.dataset.commentOriginal = original;
    span.textContent = marker[0] + emoji + " " + comment;
  }

  function clearSemanticHighlighting(frame) {
    frame.querySelectorAll(".semantic-token").forEach(function (token) {
      token.replaceWith(document.createTextNode(token.textContent));
    });
    frame.querySelectorAll("[data-comment-original]").forEach(function (span) {
      span.textContent = span.dataset.commentOriginal;
      delete span.dataset.commentOriginal;
    });
    frame.querySelectorAll(".ec-line .code").forEach(function (code) { code.normalize(); });
    delete frame.dataset.semanticReady;
  }

  function highlightFrame(frame, variants) {
    var language = frameLanguage(frame);
    if (["rust", "asm", "nasm", "powershell", "ps1"].indexOf(language) === -1) return;
    frame.dataset.semanticReady = "true";
    frame.querySelectorAll(".ec-line .code").forEach(function (code) {
      var walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      var firstWordSeen = false;
      nodes.forEach(function (node) {
        var color = spanColor(node);
        if (color === COMMENT_COLOR) {
          decorateComment(node.parentElement.closest("span[style]"));
          return;
        }
        var text = node.nodeValue;
        var pattern = language === "powershell" || language === "ps1" ? /\$?[A-Za-z_][\w-]*/g : /[A-Za-z_][A-Za-z0-9_]*/g;
        var pieces = [];
        var last = 0;
        var match;
        while ((match = pattern.exec(text))) {
          var firstWord = !firstWordSeen && !/\S/.test(text.slice(0, match.index).replace(/^\s+/, "")) && !/:$/.test(text.slice(match.index + match[0].length, match.index + match[0].length + 1));
          firstWordSeen = true;
          var role = roleForWord(language, match[0], { variants: variants, color: color, firstWord: firstWord });
          if (!role) continue;
          pieces.push(document.createTextNode(text.slice(last, match.index)));
          var token = document.createElement("span");
          token.className = "semantic-token semantic-token--" + role;
          token.textContent = match[0];
          pieces.push(token);
          last = match.index + match[0].length;
        }
        if (/\S/.test(text)) firstWordSeen = true;
        if (!pieces.length) return;
        pieces.push(document.createTextNode(text.slice(last)));
        var fragment = document.createDocumentFragment();
        pieces.forEach(function (piece) { fragment.appendChild(piece); });
        node.replaceWith(fragment);
      });
    });
  }

  // Colour each block only as it comes near the screen, so a long lesson never
  // pays up front for blocks the reader has not reached.
  var semanticObserver = null;
  var semanticVariants = null;

  function pageVariants() {
    if (!semanticVariants) semanticVariants = findDeclaredEnumVariants();
    return semanticVariants;
  }

  function refreshSemanticHighlighting() {
    var frames = codeFrames();
    if (semanticObserver) semanticObserver.disconnect();
    frames.forEach(function (frame) {
      if (frame.dataset.semanticReady) clearSemanticHighlighting(frame);
    });
    if (root.dataset.academySemantic === "off" || !frames.length) return;
    if (!("IntersectionObserver" in window)) {
      frames.forEach(function (frame) { highlightFrame(frame, pageVariants()); });
      return;
    }
    semanticObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        highlightFrame(entry.target, pageVariants());
      });
    }, { rootMargin: "600px 0px" });
    frames.forEach(function (frame) { semanticObserver.observe(frame); });
  }

  // Work the reader cannot see waits until the browser has nothing else to do.
  function whenIdle(task) {
    if ("requestIdleCallback" in window) window.requestIdleCallback(task, { timeout: 2000 });
    else window.setTimeout(task, 200);
  }

  // ------------------------------------------------------------------
  // The reading progress bar
  // ------------------------------------------------------------------

  function bindReadingProgress() {
    if (!document.querySelector(".lesson-header") || document.querySelector(".reading-progress")) return;
    var bar = document.createElement("div");
    bar.className = "reading-progress";
    bar.setAttribute("aria-hidden", "true");
    bar.appendChild(document.createElement("span"));
    document.body.appendChild(bar);
    var fill = bar.firstChild;
    var scheduled = false;
    // Scaling the bar is handled by the compositor; changing its width would
    // make the browser redo layout on every scrolled frame.
    function update() {
      scheduled = false;
      var remaining = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = remaining > 0 ? window.scrollY / remaining : 0;
      fill.style.transform = "scaleX(" + Math.min(1, Math.max(0, ratio)) + ")";
    }
    window.addEventListener("scroll", function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    }, { passive: true });
    // Measure on the next frame, after the browser's own first layout, rather
    // than forcing that layout early by reading scrollHeight right now.
    requestAnimationFrame(update);
  }

  function initProjectionPlaygrounds() {
    document.querySelectorAll("[data-projection-lab]").forEach(function (lab) {
      if (lab.dataset.projectionReady === "true") return;

      var inputs = {};
      var outputs = {};
      lab.querySelectorAll("[data-projection-input]").forEach(function (input) {
        inputs[input.dataset.projectionInput] = input;
      });
      lab.querySelectorAll("[data-projection-output]").forEach(function (output) {
        outputs[output.dataset.projectionOutput] = output;
      });

      var requiredInputs = ["x", "y", "z", "fov"];
      if (!requiredInputs.every(function (name) { return inputs[name] && outputs[name]; })) {
        return;
      }

      var frustumTop = lab.querySelector('[data-frustum-edge="top"]');
      var frustumBottom = lab.querySelector('[data-frustum-edge="bottom"]');
      var frustumPoint = lab.querySelector("[data-frustum-point]");
      var frustumLabel = lab.querySelector("[data-frustum-point-label]");
      var screenPoint = lab.querySelector("[data-screen-point]");
      var screenLabel = lab.querySelector("[data-screen-point-label]");
      var status = lab.querySelector("[data-projection-status]");
      var math = lab.querySelector("[data-projection-math]");

      if (!frustumTop || !frustumBottom || !frustumPoint || !frustumLabel
          || !screenPoint || !screenLabel || !status || !math) {
        return;
      }

      function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
      }

      function updateProjection() {
        var x = Number(inputs.x.value);
        var y = Number(inputs.y.value);
        var z = Number(inputs.z.value);
        var fovDegrees = Number(inputs.fov.value);
        var aspect = 1280 / 720;
        var tangent = Math.tan((fovDegrees * Math.PI / 180) / 2);
        var halfWidth = z * tangent * aspect;
        var halfHeight = z * tangent;
        var ndcX = x / halfWidth;
        var ndcY = y / halfHeight;
        var inside = z > 0.1 && Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1;
        var screenX = (ndcX + 1) * 640;
        var screenY = (1 - ndcY) * 360;

        outputs.x.textContent = x.toFixed(1);
        outputs.y.textContent = y.toFixed(1);
        outputs.z.textContent = z.toFixed(1);
        outputs.fov.textContent = fovDegrees.toFixed(0) + "°";

        var farHalfWidth = 20 * tangent * aspect;
        var worldScale = 85 / Math.max(farHalfWidth, 10);
        frustumTop.setAttribute("y2", String(115 - farHalfWidth * worldScale));
        frustumBottom.setAttribute("y2", String(115 + farHalfWidth * worldScale));

        var frustumX = 44 + clamp(z / 20, 0, 1) * 368;
        var frustumY = clamp(115 - x * worldScale, 16, 214);
        frustumPoint.setAttribute("cx", frustumX.toFixed(1));
        frustumPoint.setAttribute("cy", frustumY.toFixed(1));
        frustumPoint.classList.toggle("is-outside", !inside);
        frustumLabel.setAttribute("x", (frustumX > 350 ? frustumX - 11 : frustumX + 11).toFixed(1));
        frustumLabel.setAttribute("y", clamp(frustumY - 10, 18, 214).toFixed(1));
        frustumLabel.setAttribute("text-anchor", frustumX > 350 ? "end" : "start");

        var viewportX = clamp(26 + ((ndcX + 1) / 2) * 348, 26, 374);
        var viewportY = clamp(12 + ((1 - ndcY) / 2) * 196, 12, 208);
        screenPoint.setAttribute("cx", viewportX.toFixed(1));
        screenPoint.setAttribute("cy", viewportY.toFixed(1));
        screenPoint.classList.toggle("is-outside", !inside);
        screenLabel.setAttribute("x", (viewportX > 300 ? viewportX - 12 : viewportX + 12).toFixed(1));
        screenLabel.setAttribute("y", clamp(viewportY - 10, 26, 204).toFixed(1));
        screenLabel.setAttribute("text-anchor", viewportX > 300 ? "end" : "start");
        screenLabel.textContent = inside
          ? "(" + Math.round(screenX) + ", " + Math.round(screenY) + ")"
          : "outside viewport";

        status.textContent = inside ? "Inside the view" : "Outside the view";
        math.textContent = "w = " + z.toFixed(1)
          + " · NDC (" + ndcX.toFixed(2) + ", " + ndcY.toFixed(2) + ")"
          + (inside ? " · screen (" + Math.round(screenX) + ", " + Math.round(screenY) + ")" : "");
      }

      requiredInputs.forEach(function (name) {
        inputs[name].addEventListener("input", updateProjection);
      });
      lab.dataset.projectionReady = "true";
      updateProjection();
    });
  }

  // Glossary term -> anchor, fetched once per visit and reused across pages.
  var glossaryIndexPromise = null;

  function loadGlossaryIndex() {
    if (glossaryIndexPromise) return glossaryIndexPromise;
    var link = document.querySelector('link[rel="glossary-index"]');
    if (!link || typeof fetch !== "function") {
      glossaryIndexPromise = Promise.resolve(null);
      return glossaryIndexPromise;
    }
    glossaryIndexPromise = fetch(link.href)
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (entries) {
        if (!Array.isArray(entries)) return null;
        var byTerm = new Map();
        entries.forEach(function (entry) {
          if (!entry || !entry.t || !entry.a) return;
          byTerm.set(normalizeTerm(entry.t), entry.a);
        });
        return byTerm;
      })
      .catch(function () {
        // A missing index must never break the lesson text.
        return null;
      });
    return glossaryIndexPromise;
  }

  function normalizeTerm(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/’/g, "'")
      .replace(/\s+/g, " ")
      .replace(/^[^a-z0-9]+|[^a-z0-9)*+]+$/g, "")
      .trim();
  }

  // The book bolds a term where it defines it. Turning that first bold into a
  // link gives a beginner a definition one click away without peppering the
  // prose with links on every later mention.
  function linkGlossaryTerms() {
    var section = document.querySelector(".sl-markdown-content");
    if (!section || document.querySelector(".academy-glossary")) return;
    if (section.dataset.glossaryLinked === "true") return;
    section.dataset.glossaryLinked = "true";

    var glossaryLink = document.querySelector('link[rel="glossary"]');
    if (!glossaryLink) return;

    loadGlossaryIndex().then(function (byTerm) {
      if (!byTerm || !byTerm.size) return;
      var used = new Set();

      Array.prototype.forEach.call(section.querySelectorAll("strong"), function (node) {
        if (node.closest("a, pre, h1, h2, h3, h4, .academy-quiz")) return;

        var direct = normalizeTerm(node.textContent);
        var anchor = byTerm.get(direct);
        // Lessons often define a term in the plural ("libraries", "console
        // variables") while the glossary lists the singular.
        if (!anchor && direct.length > 5 && direct.slice(-3) === "ies") {
          anchor = byTerm.get(direct.slice(0, -3) + "y");
        }
        if (!anchor && direct.length > 4 && direct.slice(-1) === "s") {
          anchor = byTerm.get(direct.slice(0, -1));
        }
        if (!anchor || used.has(anchor)) return;
        used.add(anchor);

        var link = document.createElement("a");
        link.className = "glossary-term-link";
        link.href = glossaryLink.href + "#" + anchor;
        link.title = "Definition of " + node.textContent.trim() + " in the glossary";
        link.setAttribute("data-glossary-term", "true");
        while (node.firstChild) link.appendChild(node.firstChild);
        node.appendChild(link);
      });
    });
  }

  // Highlight the glossary entry a reader just jumped to. Driven by a class
  // rather than :target so that following a link to the anchor you are already
  // on still flashes the entry instead of doing nothing visible.
  function highlightGlossaryTarget() {
    var list = document.querySelector(".academy-glossary");
    if (!list) return;

    var previous = list.querySelector("dt.is-glossary-highlight");
    if (previous) previous.classList.remove("is-glossary-highlight");

    var id = (window.location.hash || "").replace(/^#/, "");
    if (!id) return;

    var entry = document.getElementById(id);
    if (!entry || entry.tagName !== "DT") return;

    entry.classList.add("is-glossary-highlight");
    entry.scrollIntoView({ block: "center", behavior: "auto" });
  }

  function bindGlossaryHighlight() {
    if (window.__academyGlossaryHighlightBound) return;
    window.__academyGlossaryHighlightBound = true;
    window.addEventListener("hashchange", highlightGlossaryTarget);
  }

  function initializePageFeatures() {
    initThemeSwitcher();
    refreshSemanticHighlighting();
    bindReadingProgress();
    initProjectionPlaygrounds();
    whenIdle(linkGlossaryTerms);
    highlightGlossaryTarget();
    bindGlossaryHighlight();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePageFeatures, { once: true });
  } else {
    initializePageFeatures();
  }
})();
