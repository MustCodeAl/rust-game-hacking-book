(function () {
  "use strict";

  var THEMES = [
    { id: "paper", label: "Paper", browser: { light: "#f7f9fc", dark: "#0f1216" } },
    { id: "purple", label: "Purple", browser: { light: "#f7f1fb", dark: "#0f0917" } },
    { id: "midnight", label: "Midnight", browser: { light: "#eef6fb", dark: "#07111d" } },
    { id: "forest", label: "Forest", browser: { light: "#eef3e8", dark: "#0d1710" } },
    { id: "contrast", label: "Contrast", browser: { light: "#ffffff", dark: "#000000" } }
  ];
  var MODES = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" }
  ];
  var NATURAL_MODES = {
    paper: "light",
    purple: "dark",
    midnight: "dark",
    forest: "light",
    contrast: "light"
  };
  var themeEventsReady = false;
  var themeObserverReady = false;
  var tocEventsReady = false;
  var LANGUAGE_LABELS = {
    diff: "before → after",
    nasm: "x86 assembly",
    plaintext: "text",
    powershell: "PowerShell",
    rust: "Rust",
    text: "output",
    toml: "TOML"
  };
  var SEMANTIC_TOKENS = {
    safety: [
      "unsafe", "transmute", "from_raw", "from_raw_parts", "from_raw_parts_mut",
      "read_unaligned", "write_unaligned"
    ],
    result: [
      "Result", "Option"
    ],
    "enum-variant": [
      "Ok", "Err", "Some", "None"
    ],
    windows: [
      "BOOL", "DWORD", "HANDLE", "HMODULE", "HWND", "LPVOID", "MODULEENTRY32W",
      "PROCESSENTRY32W", "CloseHandle", "CreateRemoteThread", "CreateToolhelp32Snapshot",
      "GetLastError", "GetModuleHandleW", "GetProcAddress", "Module32FirstW",
      "Module32NextW", "OpenProcess", "Process32FirstW", "Process32NextW",
      "ReadProcessMemory", "VirtualAllocEx", "VirtualFreeEx", "VirtualProtect",
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

  function findTheme(id) {
    return THEMES.find(function (theme) { return theme.id === id; }) || THEMES[0];
  }

  function findMode(id) {
    return MODES.find(function (mode) { return mode.id === id; }) || MODES[0];
  }

  function readSavedTheme() {
    try {
      return localStorage.getItem("gha-theme");
    } catch (error) {
      return null;
    }
  }

  function saveTheme(id) {
    try {
      localStorage.setItem("gha-theme", id);
    } catch (error) {
      /* A blocked storage API should not block reading the book. */
    }
  }

  function readSavedMode() {
    try {
      return localStorage.getItem("gha-mode");
    } catch (error) {
      return null;
    }
  }

  function saveMode(id) {
    try {
      localStorage.setItem("gha-mode", id);
    } catch (error) {
      /* A blocked storage API should not block reading the book. */
    }
  }

  function readSavedCodeMode() {
    try {
      return localStorage.getItem("gha-code-mode");
    } catch (error) {
      return null;
    }
  }

  function saveCodeMode(id) {
    try {
      localStorage.setItem("gha-code-mode", id);
    } catch (error) {
      /* A blocked storage API should not block reading the book. */
    }
  }

  function updateThemeControls(theme, mode) {
    document.querySelectorAll("[data-theme-label]").forEach(function (label) {
      label.textContent = theme.label;
    });
    document.querySelectorAll("[data-mode-label]").forEach(function (label) {
      label.textContent = mode.label;
    });
    document.querySelectorAll("[data-theme-choice]").forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        button.dataset.themeChoice === theme.id ? "true" : "false"
      );
    });
    document.querySelectorAll("[data-mode-choice]").forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        button.dataset.modeChoice === mode.id ? "true" : "false"
      );
    });
  }

  function applyAppearance(themeId, modeId, persist) {
    var theme = findTheme(themeId);
    var mode = findMode(modeId);
    document.documentElement.dataset.academyTheme = theme.id;
    document.documentElement.dataset.academyMode = mode.id;
    updateThemeControls(theme, mode);

    var browserColor = document.querySelector('meta[name="theme-color"]');
    if (browserColor) browserColor.setAttribute("content", theme.browser[mode.id]);
    if (persist !== false) {
      saveTheme(theme.id);
      saveMode(mode.id);
    }
  }

  function updateCodeModeControls(mode) {
    document.querySelectorAll("[data-code-mode-label]").forEach(function (label) {
      label.textContent = mode.label;
    });
    document.querySelectorAll("[data-code-mode-choice]").forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        button.dataset.codeModeChoice === mode.id ? "true" : "false"
      );
    });
  }

  function applyCodeMode(id, persist) {
    var requestedMode = MODES.some(function (mode) { return mode.id === id; }) ? id : "dark";
    var mode = findMode(requestedMode);
    document.documentElement.dataset.academyCodeMode = mode.id;
    updateCodeModeControls(mode);
    if (persist !== false) saveCodeMode(mode.id);
  }

  function applyTheme(id, persist) {
    var mode = document.documentElement.dataset.academyMode || readSavedMode() || "light";
    applyAppearance(id, mode, persist);
  }

  function applyMode(id, persist) {
    var theme = document.documentElement.dataset.academyTheme || readSavedTheme() || "paper";
    applyAppearance(theme, id, persist);
  }

  function cycleTheme() {
    var current = findTheme(document.documentElement.dataset.academyTheme);
    var index = THEMES.findIndex(function (theme) { return theme.id === current.id; });
    applyTheme(THEMES[(index + 1) % THEMES.length].id);
  }

  function cycleMode() {
    var current = findMode(document.documentElement.dataset.academyMode);
    applyMode(current.id === "light" ? "dark" : "light");
  }

  function cycleCodeMode() {
    var current = findMode(document.documentElement.dataset.academyCodeMode || "dark");
    applyCodeMode(current.id === "dark" ? "light" : "dark");
  }

  function closeThemeMenu(switcher) {
    var toggle = switcher.querySelector(".theme-switcher__toggle");
    var menu = switcher.querySelector(".theme-switcher__menu");
    if (!toggle || !menu) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  function closeThemeMenus(except) {
    document.querySelectorAll("[data-theme-switcher]").forEach(function (switcher) {
      if (switcher !== except) closeThemeMenu(switcher);
    });
  }

  function initThemeSwitcher() {
    var savedTheme = document.documentElement.dataset.academyTheme || readSavedTheme() || "paper";
    var savedMode = document.documentElement.dataset.academyMode || readSavedMode();
    if (savedTheme === "light" || savedTheme === "dark") {
      savedMode = savedTheme;
      savedTheme = "paper";
    }
    if (!savedMode) savedMode = NATURAL_MODES[findTheme(savedTheme).id] || "light";
    applyAppearance(savedTheme, savedMode, false);
    applyCodeMode(
      document.documentElement.dataset.academyCodeMode || readSavedCodeMode() || "dark",
      false
    );

    document.querySelectorAll("[data-theme-switcher]").forEach(function (switcher) {
      var toggle = switcher.querySelector(".theme-switcher__toggle");
      var menu = switcher.querySelector(".theme-switcher__menu");
      if (!toggle || !menu) return;
      switcher.dataset.themeReady = "true";
    });

    if (themeEventsReady) return;
    themeEventsReady = true;

    /*
     * GitBook swaps lesson markup without reloading this file. Event delegation
     * keeps the switcher working even when the header or sidebar is replaced.
     */
    document.addEventListener("click", function (event) {
      var choice = event.target.closest("[data-theme-choice]");
      if (choice) {
        applyTheme(choice.dataset.themeChoice);
        return;
      }

      var modeChoice = event.target.closest("[data-mode-choice]");
      if (modeChoice) {
        applyMode(modeChoice.dataset.modeChoice);
        return;
      }

      var codeModeChoice = event.target.closest("[data-code-mode-choice]");
      if (codeModeChoice) {
        applyCodeMode(codeModeChoice.dataset.codeModeChoice);
        return;
      }

      var printButton = event.target.closest("[data-print-book]");
      if (printButton) {
        closeThemeMenus();
        requestAnimationFrame(function () { window.print(); });
        return;
      }

      var toggle = event.target.closest(".theme-switcher__toggle");
      if (toggle) {
        var switcher = toggle.closest("[data-theme-switcher]");
        var menu = switcher && switcher.querySelector(".theme-switcher__menu");
        if (!switcher || !menu) return;
        var willOpen = menu.hidden;
        closeThemeMenus(willOpen ? switcher : null);
        menu.hidden = !willOpen;
        toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
        return;
      }

      var activeSwitcher = event.target.closest("[data-theme-switcher]");
      closeThemeMenus(activeSwitcher);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeThemeMenus();
      if (event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        cycleTheme();
      }
      if (event.altKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        cycleMode();
      }
      if (event.altKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        cycleCodeMode();
      }
    });
  }

  function observeThemeSwitchers() {
    if (themeObserverReady || typeof MutationObserver === "undefined") return;
    themeObserverReady = true;

    var scheduled = false;
    var observer = new MutationObserver(function () {
      if (!document.querySelector('[data-theme-switcher]:not([data-theme-ready="true"])')) {
        return;
      }
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        initThemeSwitcher();
      });
    });

    observer.observe(document.querySelector(".book") || document.body, {
      childList: true,
      subtree: true
    });
  }

  function initTableOfContents() {
    if (tocEventsReady) return;
    tocEventsReady = true;
    document.addEventListener("click", function (event) {
      var toggle = event.target.closest("[data-toc-chapter-toggle]");
      if (!toggle) return;
      var chapter = toggle.dataset.tocChapterToggle;
      var willOpen = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      document.querySelectorAll(
        '.book-summary li.chapter[data-academy-chapter="' + chapter + '"]'
      ).forEach(function (lesson) {
        lesson.hidden = !willOpen;
      });
    });
  }

  function updateReadingProgress() {
    var body = document.querySelector(".body-inner");
    var bar = document.querySelector(".reading-progress span");
    if (!body || !bar) return;

    var remaining = body.scrollHeight - body.clientHeight;
    var percent = remaining > 0 ? (body.scrollTop / remaining) * 100 : 0;
    bar.style.width = Math.min(100, Math.max(0, percent)) + "%";
  }

  function bindReadingProgress() {
    var body = document.querySelector(".body-inner");
    if (!body || body.dataset.progressReady === "true") return;
    body.dataset.progressReady = "true";
    body.addEventListener("scroll", updateReadingProgress, { passive: true });
    updateReadingProgress();
  }

  function labelCodeBlocks() {
    var codeBlocks = Array.from(document.querySelectorAll(".markdown-section pre code"));
    var pageEnumVariants = {};

    codeBlocks.forEach(function (code) {
      if (findCodeLanguage(code) !== "rust") return;
      Object.assign(pageEnumVariants, findDeclaredEnumVariants(code));
    });

    codeBlocks.forEach(function (code) {
      var pre = code.parentElement;
      if (!pre || pre.dataset.enhanced === "true") return;

      var language = findCodeLanguage(code);

      pre.dataset.language = LANGUAGE_LABELS[language] || language;
      pre.dataset.languageId = language;
      applySemanticHighlighting(code, language, pageEnumVariants);
      pre.dataset.enhanced = "true";
    });
  }

  function findCodeLanguage(code) {
    var languageContainer = code.closest('[class*="language-"]');
    var languageClass = languageContainer && Array.from(languageContainer.classList)
      .find(function (name) { return name.indexOf("language-") === 0; });
    return languageClass ? languageClass.replace("language-", "") : "text";
  }

  function applySemanticHighlighting(code, language, declaredEnumVariants) {

    code.querySelectorAll("span").forEach(function (token) {
      if (token.children.length > 0) return;

      decorateCodeComment(token);

      var value = token.textContent.trim();
      if (!value) return;

      var role = null;
      if (language === "rust") {
        Object.keys(SEMANTIC_TOKENS).some(function (candidate) {
          if (candidate === "command") return false;
          if (SEMANTIC_TOKENS[candidate].indexOf(value) === -1) return false;
          role = candidate;
          return true;
        });
        if (!role && declaredEnumVariants[value]) role = "enum-variant";
        if (
          !role
          && token.classList.contains("n")
          && /^[a-z_][A-Za-z0-9_]*$/.test(value)
        ) role = "variable";
      } else if (language === "nasm") {
        if (token.classList.contains("nf")) role = "instruction";
        if (token.classList.contains("nb")) role = "register";
        if (token.classList.contains("mh") || token.classList.contains("mi")) role = "memory";
      } else if (language === "powershell") {
        if (SEMANTIC_TOKENS.command.indexOf(value) !== -1) role = "command";
        if (!role && (
          token.classList.contains("nv")
          || token.classList.contains("vc")
          || token.classList.contains("vg")
          || token.classList.contains("vi")
        )) role = "variable";
      }

      if (!role) return;
      token.classList.add("semantic-token", "semantic-token--" + role);
    });
  }

  function decorateCodeComment(token) {
    var commentClasses = ["c", "ch", "cd", "cm", "cpf", "c1", "cs"];
    var isComment = commentClasses.some(function (className) {
      return token.classList.contains(className);
    });
    if (!isComment || token.dataset.commentEmoji === "true") return;

    var original = token.textContent;
    var marker = original.match(/^(\s*(?:(?:\/\/+)|(?:<!--)|(?:--(?!>))|#|;|\/\*+|\*+)\s*)/);
    if (!marker) return;

    var comment = original.slice(marker[0].length);
    if (/^(?:🛡️|⚠️|✅|🔍|🛠️|💡|🧠|🧪)/u.test(comment)) return;

    var emoji = "💡";
    if (/\b(?:warning|caution|danger|never|do not)\b/i.test(comment)) emoji = "⚠️";
    else if (/\b(?:safety|safe|permission|validate|bounds?|guard)\b/i.test(comment)) emoji = "🛡️";
    else if (/\b(?:test|assert|verify|expect|check)\b/i.test(comment)) emoji = "✅";
    else if (/\b(?:read|find|scan|observe|inspect|look|trace)\b/i.test(comment)) emoji = "🔍";
    else if (/\b(?:todo|build|create|write|implement|replace)\b/i.test(comment)) emoji = "🛠️";

    token.textContent = marker[0] + emoji + (comment ? " " + comment : "");
    token.dataset.commentEmoji = "true";
    token.classList.add("semantic-comment");
  }

  function decorateLessonText() {
    var rules = [
      { pattern: /^checkpoint\b/i, emoji: "✅" },
      { pattern: /^(?:avoid|do not|never|wrong|bad|fragile)\b/i, emoji: "❌" },
      { pattern: /^(?:a safe|good|correct|preferred|recommended|verified)\b/i, emoji: "✅" },
      { pattern: /^(?:scope|safety|permission)\b/i, emoji: "🛡️" },
      { pattern: /^(?:test|try|run the (?:lab|tool)|exercise)\b/i, emoji: "🧪" }
    ];

    document.querySelectorAll(".markdown-section h2, .markdown-section h3").forEach(function (heading) {
      if (heading.dataset.emojiReady === "true") return;
      heading.dataset.emojiReady = "true";
      var text = heading.textContent.trim();
      var rule = rules.find(function (candidate) { return candidate.pattern.test(text); });
      if (!rule) return;
      var icon = document.createElement("span");
      icon.className = "lesson-heading__emoji";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = rule.emoji;
      heading.insertBefore(icon, heading.firstChild);
    });

    document.querySelectorAll(".markdown-section th, .markdown-section td").forEach(function (block) {
      if (block.dataset.comparisonCue === "true" || block.closest("pre")) return;
      block.dataset.comparisonCue = "true";
      var text = block.textContent.trim();
      var emoji = null;
      if (/^(?:do not|don't|never|avoid|bad|wrong|fragile|incorrect)\b/i.test(text)) emoji = "❌";
      else if (/^(?:good|a good|correct|safer?|recommended|preferred|verified)\b/i.test(text)) emoji = "✅";
      if (!emoji) return;
      var cue = document.createElement("span");
      cue.className = "comparison-cue";
      cue.setAttribute("aria-hidden", "true");
      cue.textContent = emoji;
      block.insertBefore(cue, block.firstChild);
    });
  }

  function findDeclaredEnumVariants(code) {
    var variants = {};
    var depth = 0;
    var enumDepth = null;
    var waitingForName = false;
    var waitingForBody = false;
    var expectingVariant = false;

    code.querySelectorAll("span").forEach(function (token) {
      var value = token.textContent.trim();
      if (!value) return;

      if (value === "enum") {
        waitingForName = true;
        return;
      }
      if (waitingForName && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
        waitingForName = false;
        waitingForBody = true;
        return;
      }
      if (
        enumDepth !== null
        && depth === enumDepth
        && expectingVariant
        && /^[A-Z][A-Za-z0-9_]*$/.test(value)
      ) {
        variants[value] = true;
        expectingVariant = false;
      }

      if (!token.classList.contains("p")) return;

      Array.from(value).forEach(function (character) {
        if (character === "{" || character === "(" || character === "[") {
          depth += 1;
          if (waitingForBody && character === "{") {
            waitingForBody = false;
            enumDepth = depth;
            expectingVariant = true;
          }
          return;
        }
        if (character === "," && enumDepth !== null && depth === enumDepth) {
          expectingVariant = true;
          return;
        }
        if (character === "}" || character === ")" || character === "]") {
          depth = Math.max(0, depth - 1);
          if (enumDepth !== null && depth < enumDepth) {
            enumDepth = null;
            expectingVariant = false;
          }
        }
      });
    });

    return variants;
  }

  function initializePageFeatures() {
    initThemeSwitcher();
    initTableOfContents();
    bindReadingProgress();
    labelCodeBlocks();
    decorateLessonText();
  }

  function bindGitBookLifecycle() {
    if (!window.gitbook || !window.gitbook.events) return;
    window.gitbook.events.bind("page.change", function () {
      requestAnimationFrame(initializePageFeatures);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initializePageFeatures();
    bindGitBookLifecycle();
    observeThemeSwitchers();
  });
})();
