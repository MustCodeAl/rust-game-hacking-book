// Tab completion for the chat button's question box.
//
// The chat button is Context7's "Chat with Documentation" widget, which
// chat-widget.js puts on every page. Its box takes a question and offers no help
// wording one. This adds that help the way a shell does: a question the reader is
// likely to ask is shown in grey after what has been typed, and Tab (or the right
// arrow at the end of the line) finishes it. With the box empty, the grey
// question is the best one for the section being read, and the up and down
// arrows move through the others. Escape puts the grey text away, Enter sends
// what is typed as it is, and Tab does what Tab always does when there is
// nothing to finish, so the keyboard is never trapped in the box.
//
// Where the questions come from, all in the browser and none of it from
// context7.com:
//   - the section being read: the glossary words in it, and its heading
//   - the page: a few questions that fit any lesson, chapter, or list
//   - the book: every glossary term and lesson title, from
//     assets/chat-suggestions.json, fetched when the chat opens
// When nothing starts like what was typed, the word being typed is finished from
// the book's terms instead ("how does change det" becomes "how does change
// detection"). Touch has no Tab key, so the same questions are offered as buttons
// under the welcome message, and a "Use" button in the box finishes the grey one.
//
// The widget keeps its parts in a closed shadow root. chat-widget.js lets it be
// opened while the widget is created (see expose() there) and passes the root to
// attach(). If the widget's markup changes, attach() finds nothing to attach to
// and the box stays as it was. The rest of this file is plain functions on
// strings, which scripts/check-chat-suggest.mjs runs under Node.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AcademyChatSuggest = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MATCHES = 8; // grey completions the arrow keys move through
  var CHIPS = 3; // questions offered as buttons under the welcome message
  var SECTION_TERMS = 3; // terms of the section being read that get questions of their own
  var PAGE_TERMS = 12; // terms from elsewhere on the page that come before the book's

  // ------------------------------------------------------------------
  // Words
  // ------------------------------------------------------------------

  // A term keeps its capital inside a sentence when it is a name ("Lua"), an
  // acronym ("ECS", "A*"), or has capitals or digits after the first letter
  // ("DllMain", "x86"); any other term is written as it would be mid-sentence.
  var PROPER = /^(Lua|Unicode|Authenticode|Turing|Universal Turing|Win32|Windows|Linux|Bevy|Rust|Cheat Engine)\b/;

  function inSentence(term) {
    term = String(term || "").replace(/\s+/g, " ").trim();
    if (PROPER.test(term) || /^[A-Z][^a-z]*$/.test(term) || /[A-Z0-9]/.test(term.slice(1))) return term;
    return term.charAt(0).toLowerCase() + term.slice(1);
  }

  // Lower case, with the typographic quotes the book uses folded to the plain
  // ones a reader types, so "What does" matches "what does" and the length of the
  // result is the length of the original.
  function fold(text) {
    return String(text == null ? "" : text)
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ");
  }

  // ------------------------------------------------------------------
  // The questions
  // ------------------------------------------------------------------

  // How a term is asked about. None needs an article, so every term reads
  // naturally: "What does dead zone mean?", "Explain ECS".
  var ABOUT = [
    function (term) { return "What does " + term + " mean?"; },
    function (term) { return "Explain " + term; },
    function (term) { return "Which lesson explains " + term + "?"; }
  ];

  // Questions that fit any page of a kind, best first.
  var GENERIC = {
    lesson: [
      "Summarize this lesson",
      "Give me a worked example from this lesson",
      "Quiz me on this lesson",
      "What should I know before this lesson?",
      "Where is this used later in the book?"
    ],
    chapter: ["Summarize this chapter", "Which lesson should I read first?", "What will I be able to do after this chapter?"],
    contents: ["Where should I start?", "Which lesson covers memory scanning?", "How long does the whole book take?"],
    home: ["What does the book cover?", "Where should I start?", "Do I need to know Rust first?"],
    glossary: ["Which terms should I learn first?", "What is the difference between a hash and a signature?"],
    page: ["Summarize this page", "Where should I start?"]
  };

  // After a first answer, the likeliest next question is about that answer.
  var FOLLOW_UPS = [
    "Explain that more simply",
    "Show a worked example with numbers",
    "Which lesson covers this?",
    "What should I read next?"
  ];

  // "Change detection: do work only for what changed" asks about "change
  // detection"; a heading with no colon is quoted whole.
  function aboutHeading(heading) {
    var text = String(heading || "").replace(/\s+/g, " ").trim();
    if (!text) return null;
    var colon = text.indexOf(":");
    if (colon > 2) return "Explain " + inSentence(text.slice(0, colon));
    return "Summarize “" + text.replace(/["“”]/g, "") + "”";
  }

  function unique(list) {
    var seen = {};
    return list.filter(function (item) {
      var key = fold(item);
      if (!item || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  /**
   * The questions, best first: the section being read, then the page, then the
   * terms elsewhere on the page, then everything in the book.
   *
   * input.kind          "lesson", "chapter", "contents", "home", "glossary", or "page"
   * input.heading       the heading of the section being read, or null
   * input.sectionTerms  names of glossary terms in that section
   * input.pageTerms     names of glossary terms on the rest of the page
   * input.terms         names of every glossary term in the book
   * input.lessons       [number, title] for every lesson
   * input.conversation  true once the reader has asked something
   */
  function buildPool(input) {
    var pool = [];
    var section = (input.sectionTerms || []).slice(0, SECTION_TERMS);
    var page = (input.pageTerms || []).slice(0, PAGE_TERMS);
    if (input.conversation) pool = pool.concat(FOLLOW_UPS);
    section.forEach(function (term) { pool.push(ABOUT[0](term)); });
    pool.push(aboutHeading(input.heading));
    pool = pool.concat(GENERIC[input.kind] || GENERIC.page);
    section.concat(page).forEach(function (term) { pool.push(ABOUT[0](term)); });
    section.concat(page).forEach(function (term) { pool.push(ABOUT[1](term), ABOUT[2](term)); });
    (input.terms || []).forEach(function (term) {
      ABOUT.forEach(function (ask) { pool.push(ask(term)); });
    });
    (input.lessons || []).forEach(function (lesson) {
      pool.push("Summarize lesson " + lesson[0], "What does lesson " + lesson[0] + " cover?", "Explain " + lesson[1]);
    });
    return unique(pool);
  }

  // A list with its folded forms kept beside it, so a keystroke folds only what
  // was typed.
  function prepare(list) {
    return { items: list, folded: list.map(fold) };
  }

  // The grey completions for what has been typed, best first. Each is
  // { value, ghost }: the whole text the box would hold, and the part of it not
  // typed yet. Empty text asks for the best questions as they are.
  function match(value, questions, terms, limit) {
    var typed = fold(value).replace(/^ /, "");
    var found = [];
    var i;
    if (!typed) {
      for (i = 0; i < questions.items.length && found.length < limit; i++) {
        found.push({ value: questions.items[i], ghost: questions.items[i] });
      }
      return found;
    }
    for (i = 0; i < questions.items.length && found.length < limit; i++) {
      var folded = questions.folded[i];
      if (folded.length > typed.length && folded.indexOf(typed) === 0) {
        found.push({ value: questions.items[i], ghost: questions.items[i].slice(typed.length) });
      }
    }
    return found.length ? found : completeTerm(value, terms, limit);
  }

  // With no whole question that starts like the text, finish the word being
  // typed from the book's terms. The longest run of the last words (up to four,
  // at least three letters) that starts a term wins, and the term replaces them.
  // A run that already is a term is finished, so nothing is added after it, and
  // neither is anything after a sentence's end or a space.
  function completeTerm(value, terms, limit) {
    if (!value || /[\s?!.,;:]$/.test(value)) return [];
    var starts = [];
    var word = /\S+/g;
    var hit;
    while ((hit = word.exec(value))) starts.push(hit.index);
    var found = [];
    for (var run = Math.min(4, starts.length); run >= 1 && !found.length; run--) {
      var start = starts[starts.length - run];
      var typed = fold(value.slice(start));
      if (typed.length < 3) continue;
      if (terms.folded.indexOf(typed) !== -1) return [];
      for (var i = 0; i < terms.items.length && found.length < limit; i++) {
        var folded = terms.folded[i];
        if (folded.length > typed.length && folded.indexOf(typed) === 0) {
          found.push({ value: value.slice(0, start) + terms.items[i], ghost: terms.items[i].slice(typed.length) });
        }
      }
    }
    return found;
  }

  // ------------------------------------------------------------------
  // The box
  // ------------------------------------------------------------------

  var STYLE =
    ".c7-input-area{position:relative}" +
    '.c7-input-area[data-c7s="on"] .c7-input{padding-right:58px}' +
    '.c7-input-area[data-c7s="on"] .c7-input::placeholder{color:transparent}' +
    ".c7s-ghost{position:absolute;box-sizing:border-box;margin:0;padding:0 58px 0 14px;border:1px solid transparent;" +
      "font-family:inherit;font-size:16px;white-space:pre;overflow:hidden;text-overflow:ellipsis;color:#78716c;pointer-events:none}" +
    ".c7s-typed{visibility:hidden}" +
    ".c7s-hint{position:absolute;display:flex;align-items:center;margin:0;padding:2px 6px;" +
      "font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#57534e;background:#f5f5f4;" +
      "border:1px solid #d6d3d1;border-radius:6px;cursor:pointer}" +
    ".c7s-hint:hover{border-color:var(--c7s-accent,#944727);color:var(--c7s-accent,#944727)}" +
    ".c7s-ghost[hidden],.c7s-hint[hidden]{display:none}" +
    ".c7s-tap{display:none}" +
    "@media (pointer:coarse){.c7s-key{display:none}.c7s-tap{display:inline}.c7s-hint{padding:7px 10px;font-size:12px}}" +
    ".c7s-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" +
    ".c7s-chips{align-self:flex-start;display:flex;flex-wrap:wrap;gap:6px;max-width:100%}" +
    ".c7s-chips-label{flex:0 0 100%;font-size:12px;color:#57534e}" +
    ".c7s-chip{margin:0;padding:6px 10px;font-family:inherit;font-size:13px;line-height:1.3;text-align:left;" +
      "color:#1c1917;background:#fff;border:1px solid #d6d3d1;border-radius:14px;cursor:pointer}" +
    ".c7s-chip:hover,.c7s-chip:focus-visible{border-color:var(--c7s-accent,#944727);color:var(--c7s-accent,#944727)}";

  function make(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // The names of the glossary terms an element's words are marked with: the
  // build marks a word's first use with data-gloss, and a term a lesson defines
  // in bold is a link to its entry.
  function anchorsIn(scope) {
    var anchors = [];
    var nodes = scope.querySelectorAll ? scope.querySelectorAll("[data-gloss], a[data-glossary-term]") : [];
    Array.prototype.forEach.call(nodes, function (node) {
      var anchor = node.getAttribute("data-gloss");
      if (!anchor) {
        var found = /#(term-[^#?]+)$/.exec(node.getAttribute("href") || "");
        anchor = found && found[1];
      }
      if (anchor && anchors.indexOf(anchor) === -1) anchors.push(anchor);
    });
    return anchors;
  }

  // The elements of a section: everything after its heading, up to the next
  // heading of the same or a higher level.
  function sectionScopes(heading) {
    var wrapper = (heading.closest && heading.closest(".sl-heading-wrapper")) || heading;
    var level = /level-h(\d)/.exec(wrapper.className || "");
    var depth = level ? Number(level[1]) : 2;
    var scopes = [];
    for (var node = wrapper.nextElementSibling; node; node = node.nextElementSibling) {
      var next = /level-h(\d)/.exec(node.className || "");
      if (next && Number(next[1]) <= depth) break;
      scopes.push(node);
    }
    return scopes;
  }

  /**
   * Gives the chat box completions. `shadow` is the widget's (opened) shadow
   * root. options:
   *   context   { kind, ... } as chat-widget.js reads it from the page
   *   accent    the widget's colour, for the buttons
   *   heading() the heading element of the section being read, or null
   *   load()    a Promise of chat-suggestions.json's contents, or null
   * Returns false when the widget's markup is not what this expects, or when
   * the box already has completions.
   */
  function attach(shadow, options) {
    var input = shadow && shadow.querySelector(".c7-input");
    var area = shadow && shadow.querySelector(".c7-input-area");
    var messages = shadow && shadow.querySelector(".c7-messages");
    if (!input || !area || !messages || input.__academySuggest) return false;
    input.__academySuggest = true;
    options = options || {};
    var doc = shadow.ownerDocument || document;
    var kind = (options.context && options.context.kind) || "page";
    var coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

    var data = null; // chat-suggestions.json, once it has arrived
    var questions = prepare([]);
    var suggested = []; // the questions that fit where the reader is, for the buttons
    var terms = prepare([]);
    var matches = [];
    var index = 0;
    var dismissed = false; // Escape was pressed; stay quiet until the text changes
    var composing = false;
    var spoken = "";
    var speakTimer = 0;
    var chips = null;

    var style = make(doc, "style");
    style.textContent = STYLE;
    shadow.appendChild(style);
    if (options.accent && shadow.host) shadow.host.style.setProperty("--c7s-accent", options.accent);

    var ghost = make(doc, "div", "c7s-ghost");
    ghost.setAttribute("aria-hidden", "true");
    ghost.hidden = true;
    var typed = make(doc, "span", "c7s-typed");
    var rest = make(doc, "span", "c7s-rest");
    ghost.appendChild(typed);
    ghost.appendChild(rest);
    var hint = make(doc, "button", "c7s-hint");
    hint.type = "button";
    hint.tabIndex = -1;
    hint.hidden = true;
    hint.setAttribute("aria-hidden", "true");
    hint.appendChild(make(doc, "span", "c7s-key", "Tab"));
    hint.appendChild(make(doc, "span", "c7s-tap", "Use"));
    var live = make(doc, "div", "c7s-live");
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    area.appendChild(ghost);
    area.appendChild(hint);
    area.appendChild(live);
    input.setAttribute("aria-autocomplete", "inline");

    function conversation() {
      return !!messages.querySelector(".c7-msg.user");
    }

    // The questions and terms for where the reader is now. Run again whenever
    // the box gets focus, because the reader may have moved to another section.
    function rebuild() {
      var byAnchor = {};
      var book = [];
      if (data) {
        data.terms.forEach(function (row) {
          byAnchor[row[0]] = inSentence(row[1]);
          row.slice(1).forEach(function (name) { book.push(inSentence(name)); });
        });
      }
      function named(scope) {
        var out = [];
        anchorsIn(scope).forEach(function (anchor) { if (byAnchor[anchor]) out.push(byAnchor[anchor]); });
        return out;
      }
      // Only a lesson has a section and terms worth asking about; the lists and
      // reference pages are full of terms that say nothing about what is being read.
      var lesson = kind === "lesson";
      var heading = lesson && options.heading ? options.heading() : null;
      var sectionTerms = [];
      if (heading) sectionScopes(heading).forEach(function (scope) { sectionTerms = sectionTerms.concat(named(scope)); });
      var content = lesson ? doc.querySelector(".sl-markdown-content") : null;
      var pageTerms = content ? named(content) : [];
      sectionTerms = unique(sectionTerms);
      pageTerms = unique(pageTerms).filter(function (term) { return sectionTerms.indexOf(term) === -1; });
      var here = {
        kind: kind,
        heading: heading && heading.textContent,
        sectionTerms: sectionTerms,
        pageTerms: pageTerms,
        conversation: conversation()
      };
      // The buttons offer what fits where the reader is, never an arbitrary term of the book.
      suggested = buildPool(here);
      here.terms = unique(book);
      here.lessons = data ? data.lessons : [];
      questions = prepare(buildPool(here));
      terms = prepare(unique(sectionTerms.concat(pageTerms, book)));
      refreshChips();
    }

    function atEnd() {
      return input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    }

    function speak(text) {
      if (text === spoken) return;
      clearTimeout(speakTimer);
      speakTimer = setTimeout(function () {
        spoken = text;
        var stop = /[?!.]$/.test(text) ? " " : ". ";
        live.textContent = text ? "Suggestion: " + text + stop + (coarse ? "Tap Use to take it." : "Press Tab to use it.") : "";
      }, 500);
    }

    function hideGhost() {
      matches = [];
      area.removeAttribute("data-c7s");
      ghost.hidden = true;
      hint.hidden = true;
      speak("");
    }

    // Draws the grey text over the box, after what has been typed.
    function paint() {
      var current = matches[index];
      if (!current) return hideGhost();
      area.setAttribute("data-c7s", "on");
      typed.textContent = input.value;
      rest.textContent = current.ghost;
      ghost.style.left = input.offsetLeft + "px";
      ghost.style.top = input.offsetTop + "px";
      ghost.style.width = input.offsetWidth + "px";
      ghost.style.height = input.offsetHeight + "px";
      ghost.style.lineHeight = input.offsetHeight - 2 + "px";
      ghost.hidden = false;
      // Typed text that already fills the box would scroll it, and the grey text
      // would no longer sit after it: leave the box alone then.
      if (typed.offsetWidth > input.offsetWidth - 2 - 14 - 58) return hideGhost();
      hint.hidden = false;
      hint.style.top = input.offsetTop + (input.offsetHeight - hint.offsetHeight) / 2 + "px";
      hint.style.left = input.offsetLeft + input.offsetWidth - hint.offsetWidth - 8 + "px";
      speak(current.value);
    }

    function render() {
      var usable = !input.disabled && !composing && !dismissed && shadow.activeElement === input && atEnd();
      matches = [];
      if (usable && !input.value.trim()) {
        // With nothing typed, the arrows move through the questions that fit here, not the whole book's.
        matches = suggested.slice(0, MATCHES).map(function (text) { return { value: text, ghost: text }; });
      } else if (usable) {
        matches = match(input.value, questions, terms, MATCHES);
      }
      if (index >= matches.length) index = 0;
      paint();
    }

    function setValue(value) {
      input.value = value;
      input.setSelectionRange(value.length, value.length);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function accept() {
      var current = matches[index];
      if (!current) return false;
      setValue(current.value);
      input.focus();
      return true;
    }

    function refreshChips() {
      if (conversation()) {
        if (chips) chips.remove();
        chips = null;
        return;
      }
      if (!chips) {
        chips = make(doc, "div", "c7s-chips");
        chips.setAttribute("role", "group");
        chips.setAttribute("aria-label", "Suggested questions");
        messages.appendChild(chips);
      }
      chips.textContent = "";
      chips.appendChild(make(doc, "span", "c7s-chips-label", "Try asking"));
      suggested.slice(0, CHIPS).forEach(function (text) {
        var chip = make(doc, "button", "c7s-chip", text);
        chip.type = "button";
        chip.addEventListener("click", function () {
          setValue(text);
          input.focus();
        });
        chips.appendChild(chip);
      });
    }

    input.addEventListener("input", function () {
      dismissed = false;
      index = 0;
      render();
    });

    input.addEventListener("focus", function () {
      dismissed = false;
      index = 0;
      rebuild();
      render();
    });

    // Leaving the box puts the grey text away, unless the focus went to the
    // button that finishes it.
    input.addEventListener("blur", function () {
      setTimeout(function () {
        if (shadow.activeElement !== input && shadow.activeElement !== hint) hideGhost();
      }, 0);
    });

    input.addEventListener("compositionstart", function () { composing = true; render(); });
    input.addEventListener("compositionend", function () { composing = false; render(); });
    ["keyup", "click", "select"].forEach(function (name) { input.addEventListener(name, render); });

    input.addEventListener("keydown", function (event) {
      if (composing || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      var key = event.key;
      if (key === "Tab" && !event.shiftKey) {
        // Tab finishes the grey text. With none showing it is left alone, so it
        // moves on through the page as it always does.
        if (accept()) event.preventDefault();
      } else if (key === "ArrowRight" && !event.shiftKey && matches.length && atEnd()) {
        accept();
        event.preventDefault();
      } else if ((key === "ArrowDown" || key === "ArrowUp") && matches.length > 1) {
        index = (index + (key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length;
        paint();
        event.preventDefault();
      } else if (key === "Escape" && matches.length) {
        dismissed = true;
        render();
        event.preventDefault();
        event.stopPropagation();
      } else if (key === "Enter") {
        // The widget sends and clears the box; look again once it has.
        setTimeout(render, 0);
      }
    });

    // The "Use" button must not take the focus from the box: on a phone that
    // would close the keyboard before the tap is finished.
    function keepFocus(event) {
      event.preventDefault();
    }
    hint.addEventListener("mousedown", keepFocus);
    hint.addEventListener("touchstart", keepFocus, { passive: false });
    hint.addEventListener("click", function () { accept(); });

    // The widget disables the box while it waits for an answer and fills the
    // conversation as it goes.
    if (typeof MutationObserver === "function") {
      new MutationObserver(render).observe(input, { attributes: true, attributeFilter: ["disabled"] });
      new MutationObserver(function () {
        if (conversation() && chips) refreshChips();
        render();
      }).observe(messages, { childList: true });
    }

    // The box may already have focus: the widget focuses it as it opens, which
    // can be before this script has arrived.
    rebuild();
    render();
    if (options.load) {
      Promise.resolve(options.load()).then(function (loaded) {
        if (!loaded || !loaded.terms || !loaded.lessons) return;
        data = loaded;
        rebuild();
        render();
      }, function () {});
    }
    return true;
  }

  return {
    attach: attach,
    buildPool: buildPool,
    prepare: prepare,
    match: match,
    completeTerm: completeTerm,
    aboutHeading: aboutHeading,
    inSentence: inSentence,
    fold: fold
  };
});
