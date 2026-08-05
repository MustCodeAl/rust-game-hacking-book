(function () {
  "use strict";

  var THEMES = [
    { id: "paper", label: "Paper", browser: "#15130f" },
    { id: "purple", label: "Purple", browser: "#1e0028" },
    { id: "midnight", label: "Midnight", browser: "#07111d" },
    { id: "forest", label: "Forest", browser: "#102018" },
    { id: "contrast", label: "Contrast", browser: "#000000" }
  ];
  var themeEventsReady = false;
  var themeObserverReady = false;
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

  function updateThemeControls(theme) {
    document.querySelectorAll("[data-theme-label]").forEach(function (label) {
      label.textContent = theme.label;
    });
    document.querySelectorAll("[data-theme-choice]").forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        button.dataset.themeChoice === theme.id ? "true" : "false"
      );
    });
  }

  function applyTheme(id, persist) {
    var theme = findTheme(id);
    document.documentElement.dataset.academyTheme = theme.id;
    updateThemeControls(theme);

    var browserColor = document.querySelector('meta[name="theme-color"]');
    if (browserColor) browserColor.setAttribute("content", theme.browser);
    if (persist !== false) saveTheme(theme.id);
  }

  function cycleTheme() {
    var current = findTheme(document.documentElement.dataset.academyTheme);
    var index = THEMES.findIndex(function (theme) { return theme.id === current.id; });
    applyTheme(THEMES[(index + 1) % THEMES.length].id);
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
    var saved = document.documentElement.dataset.academyTheme || readSavedTheme() || "paper";
    applyTheme(saved, false);

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
        var choiceSwitcher = choice.closest("[data-theme-switcher]");
        applyTheme(choice.dataset.themeChoice);
        if (choiceSwitcher) {
          closeThemeMenu(choiceSwitcher);
          var choiceToggle = choiceSwitcher.querySelector(".theme-switcher__toggle");
          if (choiceToggle) choiceToggle.focus();
        }
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
    bindReadingProgress();
    labelCodeBlocks();
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
