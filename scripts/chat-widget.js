// The chat button: Context7's "Chat with Documentation" widget, set up for the
// page being read and for the reader.
//
// The widget is one script, https://context7.com/widget.js, that reads a few
// data- attributes from its own tag when it loads. This file adds that tag, so
// the attributes follow the page and the reader instead of being fixed:
//
//   data-color            the colour of the chapter being read, deepened until
//                         white text on it is easy to read
//   data-position         bottom-right or bottom-left, the two corners the
//                         widget supports
//   data-placeholder      "Ask about ..." the lesson, the chapter, or the page
//   data-welcome-message  where the reader is, in a sentence
//
// What a page is comes from the JSON in #academy-chat (src/lib/chat-context.mjs).
// A page can replace its own wording or colour with a `chat` block in its
// frontmatter. The Reader theme panel picks the corner, or turns the button off
// (data-academy-chat on <html>); with it off, nothing is requested from
// context7.com at all.
//
// The widget keeps its parts in a closed shadow root, which a page cannot
// restyle or read. Two refinements need to reach inside: a top corner, and a
// placeholder that follows the section being read. So while the widget is being
// created, its one attachShadow call is let through as an open root, and the
// original method is put back as soon as the script has run. If Context7
// changes the widget's markup, those two refinements quietly do nothing and the
// widget still works in its own bottom corner with the page's own wording.
//
// The same open root lets chat-suggest.js give the question box Tab completion.
// That file, and the book's term list it completes from, are fetched from this
// site when the chat is first opened, not on every page view.
(function () {
  "use strict";

  // Where the site is served: this script's own address, minus scripts/chat-widget.js.
  var SCRIPT = document.currentScript && document.currentScript.src;
  var BASE = SCRIPT ? SCRIPT.replace(/scripts\/chat-widget\.js(\?.*)?$/, "") : null;

  var LIBRARY = "/mustcodeal/rust-game-hacking-book";
  var WIDGET = "https://context7.com/widget.js";
  var HOST_ID = "context7-widget";
  var CORNERS = ["bottom-right", "bottom-left", "top-right", "top-left"];
  // The widget draws white text on the colour and uses the colour itself as
  // link text on light grey (#f5f5f4). A relative luminance of 0.16 or less
  // gives 4.5:1 or better against both.
  var MAX_LUMINANCE = 0.16;
  // On a dark page a very dark button would sink into it, so it is lightened
  // to about 3.5:1 against the page while keeping 4.5:1 with white.
  var MIN_LUMINANCE_DARK = 0.09;

  var root = document.documentElement;
  var context = readContext();
  var mounted = null;
  var signature = null;
  var timer = 0;

  // ------------------------------------------------------------------
  // What the page is
  // ------------------------------------------------------------------

  function readContext() {
    var node = document.getElementById("academy-chat");
    if (node) {
      try {
        var parsed = JSON.parse(node.textContent);
        if (parsed && typeof parsed === "object") return parsed;
      } catch (error) { /* fall through to the page's own heading */ }
    }
    var heading = document.querySelector("h1");
    return { kind: "page", title: (heading ? heading.textContent : document.title).replace(/\s+/g, " ").trim() };
  }

  // The words, cut at a word boundary to fit the narrow input, without
  // leaving a dangling "with" or "a" at the end. Quotation marks inside them are
  // dropped, because the placeholder puts the words in quotation marks itself.
  function fit(text, max) {
    text = String(text || "").replace(/["“”‘’]/g, "").replace(/\s+/g, " ").trim();
    if (text.length <= max) return text;
    var cut = text.slice(0, max);
    var space = cut.lastIndexOf(" ");
    if (space > max / 2 && text.charAt(max) !== " ") cut = cut.slice(0, space);
    cut = cut.replace(/(\s+(a|an|the|of|to|with|in|on|for|and|or|at|by|from|is|are|as|into|your|you|can|we|it|its|this|that|how|why|what|which|be|do|does|did|not))+$/i, "");
    return cut.replace(/[\s,;:.\-–—]+$/, "") + "…";
  }

  // The section being read: the last heading that has reached the upper part
  // of the screen. Only asked for when the chat opens.
  function currentHeading() {
    var headings = document.querySelectorAll(".sl-markdown-content h2[id], .sl-markdown-content h3[id]");
    var line = window.innerHeight * 0.35;
    var found = null;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top > line) break;
      found = headings[i];
    }
    return found;
  }

  function currentSection() {
    var heading = currentHeading();
    return heading ? heading.textContent.replace(/\s+/g, " ").trim() : null;
  }

  // The input fits about thirty characters, so these stay short.
  function placeholder(section) {
    var c = context;
    if (c.placeholder) return c.placeholder;
    function about(text) { return "Ask about “" + fit(text, 24) + "”"; }
    if (c.kind === "chapter" && c.chapter) return "Ask about chapter " + c.chapter.number;
    if (c.kind === "contents") {
      var heading = section && /^(\d+)\./.exec(section);
      return heading ? "Ask about chapter " + heading[1] : "Ask where to start";
    }
    if (c.kind === "home") return "Ask about the book";
    if (c.kind === "glossary") return "Ask what a term means";
    return about(section || c.title);
  }

  function welcome() {
    var c = context;
    if (c.welcome) return c.welcome;
    var anything = "Ask about it, or about anything else in the book.";
    if (c.kind === "lesson" && c.chapter) {
      return "You are reading lesson " + c.lesson + ", “" + c.title + "”, in chapter " + c.chapter.number + ", " +
        c.chapter.title + ", which is part of " + c.area + ". " + anything;
    }
    if (c.kind === "chapter" && c.chapter) {
      return "This is chapter " + c.chapter.number + ", " + c.chapter.title + ", part of " + c.area +
        ". Ask about any lesson in it, or about anything else in the book.";
    }
    if (c.kind === "home") return "Welcome to Game Hacking Academy. Ask what the book covers, where to start, or what any lesson teaches.";
    if (c.kind === "contents") return "This is the list of every lesson. Ask which lesson covers a topic, or where to start.";
    if (c.kind === "glossary") return "This is the glossary of the terms the lessons define. Ask what a term means, or which lesson explains it.";
    return "You are on “" + c.title + "”. " + anything;
  }

  // ------------------------------------------------------------------
  // The colour
  // ------------------------------------------------------------------

  var pixel = null;

  // Any CSS colour as sRGB bytes, whatever notation the page wrote it in
  // (colour-mix() and oklch() included): a one-pixel canvas does the conversion.
  function toBytes(css) {
    try {
      if (!pixel) {
        var canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        pixel = canvas.getContext("2d", { willReadFrequently: true });
      }
      pixel.clearRect(0, 0, 1, 1);
      pixel.fillStyle = css;
      pixel.fillRect(0, 0, 1, 1);
      var data = pixel.getImageData(0, 0, 1, 1).data;
      return data[3] ? [data[0], data[1], data[2]] : null;
    } catch (error) {
      return null;
    }
  }

  // The colour a CSS value resolves to on the page, as the browser computes it.
  function resolved(value) {
    var node = document.createElement("span");
    node.style.cssText = "position:absolute;width:0;height:0;visibility:hidden;color:" + value;
    document.body.appendChild(node);
    var colour = getComputedStyle(node).color;
    node.remove();
    return colour;
  }

  function luminance(rgb) {
    var c = rgb.map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function mixed(rgb, end, amount) {
    return rgb.map(function (v, i) { return Math.round(v + (end[i] - v) * amount); });
  }

  // The smallest step from the colour towards black (or white) that reaches the
  // wanted luminance, so the hue stays as close to the chapter's as it can.
  function shifted(rgb, end, wanted) {
    var darker = end[0] === 0;
    var low = 0;
    var high = 1;
    for (var i = 0; i < 12; i++) {
      var middle = (low + high) / 2;
      var level = luminance(mixed(rgb, end, middle));
      if (darker ? level <= wanted : level >= wanted) high = middle;
      else low = middle;
    }
    return mixed(rgb, end, high);
  }

  function hex(rgb) {
    return "#" + rgb.map(function (v) { return (v < 16 ? "0" : "") + v.toString(16); }).join("");
  }

  // The chapter's colour on a lesson, the theme's accent elsewhere. A listening
  // edition keeps its chapter colour in --reader-accent. A lesson page has the
  // four subject colours as --tone-1 to --tone-4 (a chapter's number is not its
  // colour: the context says which of the four), and --chapter-accent for the
  // pages that are not about one chapter.
  function accentValue() {
    var tone = Number(context.tone);
    var chain = "var(--chapter-accent, var(--sl-color-accent, #0f6b63))";
    if (tone >= 1 && tone <= 4) chain = "var(--tone-" + tone + ", " + chain + ")";
    return "var(--reader-accent, " + chain + ")";
  }

  function accent() {
    var rgb;
    if (/^#[0-9a-f]{6}$/i.test(context.color || "")) {
      var n = parseInt(context.color.slice(1), 16);
      rgb = [n >> 16, (n >> 8) & 255, n & 255];
    } else {
      rgb = toBytes(resolved(accentValue()));
    }
    if (!rgb) return null;
    var level = luminance(rgb);
    if (level > MAX_LUMINANCE) rgb = shifted(rgb, [0, 0, 0], MAX_LUMINANCE);
    else if (root.dataset.theme === "dark" && level < MIN_LUMINANCE_DARK) rgb = shifted(rgb, [255, 255, 255], MIN_LUMINANCE_DARK);
    return hex(rgb);
  }

  // ------------------------------------------------------------------
  // Putting the widget on the page
  // ------------------------------------------------------------------

  function setting() {
    var value = root.dataset.academyChat;
    return value === "off" || CORNERS.indexOf(value) !== -1 ? value : "bottom-right";
  }

  // The widget only has the two bottom corners. These rules move its button
  // and panel to the top, below the page's header, and turn the panel into a
  // sheet from the top on a phone, as the widget's own is from the bottom.
  // !important because the widget's stylesheet is added after this one.
  function topStyle() {
    var style = document.createElement("style");
    style.textContent =
      ".c7-bubble{top:var(--chat-top,20px)!important;bottom:auto!important}" +
      ".c7-panel{top:calc(var(--chat-top,20px) + 70px)!important;bottom:auto!important;" +
        "height:min(600px,calc(100vh - var(--chat-top,20px) - 86px))!important;" +
        "transform:translateY(-20px) scale(.95)!important}" +
      ".c7-panel.open{transform:none!important}" +
      "@media (max-width:640px){" +
        ".c7-bubble{top:var(--chat-top,16px)!important;bottom:auto!important}" +
        ".c7-panel{top:0!important;bottom:auto!important;height:85%!important;border-radius:0 0 16px 16px!important;" +
          "border:0!important;border-bottom:1px solid #e7e5e4!important;transform:translateY(-100%)!important}" +
        ".c7-panel.open{transform:none!important}}";
    return style;
  }

  // On a phone the button would sit over the text column the whole time, so it
  // is a little smaller and slides out of the way while the reader scrolls down.
  // It comes back on any scroll up, at the top and the bottom of the page, and
  // whenever the chat is open (see onScroll).
  function phoneStyle() {
    var style = document.createElement("style");
    style.textContent =
      "@media (max-width:640px){" +
        ".c7-bubble{transform:scale(.88)!important;transition:transform .2s ease,opacity .2s ease!important}" +
        ":host([data-away=bottom]) .c7-bubble{transform:translateY(calc(100% + 28px)) scale(.88)!important;opacity:0!important;pointer-events:none!important}" +
        ":host([data-away=top]) .c7-bubble{transform:translateY(calc(-100% - 28px)) scale(.88)!important;opacity:0!important;pointer-events:none!important}}" +
      "@media (prefers-reduced-motion:reduce){.c7-bubble{transition:none!important}}";
    return style;
  }

  // A left-hand button and panel start to the right of the lesson list (the page sets --chat-left on the host) instead of over it.
  function leftStyle() {
    var style = document.createElement("style");
    style.textContent =
      "@media (min-width:641px){.c7-bubble{left:var(--chat-left,20px)!important;right:auto!important}" +
        ".c7-panel{left:var(--chat-left,20px)!important;right:auto!important}}";
    return style;
  }

  // A top-right button and panel stop short of the contents column (the page sets --chat-right on the host) instead of covering "On this page".
  function rightStyle() {
    var style = document.createElement("style");
    style.textContent =
      "@media (min-width:641px){.c7-bubble{right:var(--chat-right,20px)!important;left:auto!important}" +
        ".c7-panel{right:var(--chat-right,20px)!important;left:auto!important}}";
    return style;
  }

  // Lets the widget's attachShadow through as an open root, remembering it, and
  // returns the function that puts the original back.
  function expose(capture, top, left, right) {
    var original = Element.prototype.attachShadow;
    var restored = false;
    Element.prototype.attachShadow = function (init) {
      if (this.id !== HOST_ID || !init) return original.call(this, init);
      var shadow = original.call(this, Object.assign({}, init, { mode: "open" }));
      capture.host = this;
      capture.shadow = shadow;
      shadow.appendChild(phoneStyle());
      if (top) shadow.appendChild(topStyle());
      if (left) shadow.appendChild(leftStyle());
      if (right) shadow.appendChild(rightStyle());
      return shadow;
    };
    return function restore() {
      if (restored) return;
      restored = true;
      if (Element.prototype.attachShadow !== original) Element.prototype.attachShadow = original;
    };
  }

  function removeHosts(except) {
    document.querySelectorAll("#" + HOST_ID).forEach(function (host) {
      if (host !== except) host.remove();
    });
  }

  function unmount() {
    if (mounted) {
      mounted.restore();
      mounted.script.remove();
      mounted = null;
    }
    removeHosts(null);
  }

  // Builds the widget for the page and the reader's choice, unless nothing
  // that affects it has changed since the last time.
  function mount() {
    if (!document.body) return;
    var choice = setting();
    var color = choice === "off" ? null : accent();
    var next = choice + "|" + color;
    if (next === signature) return;
    signature = next;
    unmount();
    if (choice === "off") return;

    // The listening edition keeps its player at the top of the screen, so
    // there a top corner is the bottom corner on the same side.
    var corner = document.querySelector("[data-reader-tools]") ? choice.replace(/^top/, "bottom") : choice;
    var capture = { host: null, shadow: null };
    var script = document.createElement("script");
    script.src = WIDGET;
    script.async = true;
    script.setAttribute("data-library", LIBRARY);
    script.setAttribute("data-position", /left$/.test(corner) ? "bottom-left" : "bottom-right");
    if (color) script.setAttribute("data-color", color);
    script.setAttribute("data-placeholder", placeholder(null));
    script.setAttribute("data-welcome-message", welcome());

    var restore = expose(capture, /^top/.test(corner), /left$/.test(corner), corner === "top-right");
    mounted = { script: script, capture: capture, restore: restore, color: color, side: /^top/.test(corner) ? "top" : "bottom" };
    function finished() {
      restore();
      // A script from an earlier build that finished late leaves its own
      // button behind; only the newest one stays.
      if (mounted && mounted.script === script) removeHosts(capture.host);
    }
    script.addEventListener("load", finished);
    script.addEventListener("error", finished);
    document.body.appendChild(script);
  }

  // Tab completion for the question box (chat-suggest.js), and the names it
  // completes from, are fetched the first time the chat opens. A page with the
  // chat turned off never asks for either.
  var completion = null;
  var vocabulary = null;

  function loadVocabulary() {
    if (!vocabulary && BASE && typeof fetch === "function") {
      vocabulary = fetch(BASE + "assets/chat-suggestions.json")
        .then(function (response) { return response.ok ? response.json() : null; })
        .catch(function () { return null; });
    }
    return vocabulary;
  }

  function loadCompletion() {
    if (!completion) {
      completion = new Promise(function (resolve) {
        if (window.AcademyChatSuggest) return resolve(window.AcademyChatSuggest);
        if (!BASE) return resolve(null);
        var script = document.createElement("script");
        script.src = BASE + "scripts/chat-suggest.js";
        script.async = true;
        script.addEventListener("load", function () { resolve(window.AcademyChatSuggest || null); });
        script.addEventListener("error", function () { resolve(null); });
        document.body.appendChild(script);
      });
    }
    return completion;
  }


  // Every message carries where the reader is, so a question like "what does
  // this mean?" can be answered about the right lesson and section. The line is
  // added to the box at the moment of sending (Enter or the send button), once,
  // and it is visible in the sent message.
  var REFERENCE = "[Reading: ";

  function pageReference() {
    var c = context;
    var section = currentSection();
    var where;
    if (c.kind === "lesson" && c.lesson) {
      where = "lesson " + c.lesson + " “" + c.title + "”" + (c.chapter ? " (chapter " + c.chapter.number + ", " + c.chapter.title + ")" : "");
    } else if (c.kind === "chapter" && c.chapter) {
      where = "chapter " + c.chapter.number + " “" + c.chapter.title + "”";
    } else {
      where = (c.kind || "page") + " “" + (c.title || document.title) + "”";
    }
    var text = REFERENCE + where + (section && section !== c.title ? ", section “" + section + "”" : "") + ", page " + location.pathname + "]";
    return text.replace(/\s+/g, " ");
  }

  function addReference(input) {
    var value = input.value;
    if (!value.trim() || value.indexOf(REFERENCE) !== -1) return;
    var next = value.replace(/\s+$/, "") + "\n\n" + pageReference();
    if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
      var native = Object.getOwnPropertyDescriptor(input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value");
      if (native && native.set) native.set.call(input, next); else input.value = next;
    } else {
      input.value = next;
    }
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }

  function referencePages(capture) {
    var shadow = capture.shadow;
    if (!shadow || shadow.__academyReference) return;
    shadow.__academyReference = true;
    function box() { return shadow.querySelector(".c7-input"); }
    shadow.addEventListener("keydown", function (event) {
      var input = box();
      if (input && event.target === input && event.key === "Enter" && !event.shiftKey && !event.isComposing) addReference(input);
    }, true);
    shadow.addEventListener("click", function (event) {
      var input = box();
      var path = event.composedPath ? event.composedPath() : [];
      var button = path.filter(function (node) { return node && node.tagName === "BUTTON"; })[0];
      var area = shadow.querySelector(".c7-input-area");
      if (input && button && area && area.contains(button)) addReference(input);
    }, true);
    shadow.addEventListener("submit", function () {
      var input = box();
      if (input) addReference(input);
    }, true);
  }

  function offerCompletion(capture, color) {
    referencePages(capture);
    loadCompletion().then(function (api) {
      if (!api || !capture.shadow || !capture.host.isConnected) return;
      api.attach(capture.shadow, { context: context, accent: color, heading: currentHeading, load: loadVocabulary });
    });
  }

  // When the chat is about to open, word its placeholder for the section being
  // read, and give its box completions. The click on the button reaches the
  // page with the widget's host as its target.
  document.addEventListener("click", function (event) {
    var capture = mounted && mounted.capture;
    if (!capture || !capture.host || event.target !== capture.host) return;
    var panel = capture.shadow.querySelector(".c7-panel");
    var input = capture.shadow.querySelector(".c7-input");
    if (panel && input && !panel.classList.contains("open")) {
      input.placeholder = placeholder(currentSection());
      offerCompletion(capture, mounted.color);
    }
  }, true);

  // Slides the button away on a scroll down and back on a scroll up, on a phone.
  var phone = window.matchMedia ? window.matchMedia("(max-width: 640px)") : { matches: false };
  var anchor = window.pageYOffset;
  var pending = 0;

  function onScroll() {
    if (pending) return;
    pending = window.setTimeout(function () {
      pending = 0;
      var capture = mounted && mounted.capture;
      var y = window.pageYOffset;
      if (!capture || !capture.host || !phone.matches) {
        anchor = y;
        return;
      }
      var open = capture.shadow && capture.shadow.querySelector(".c7-panel.open");
      var edge = y < 120 || y + window.innerHeight > document.documentElement.scrollHeight - 200;
      if (open || edge || y < anchor - 12) {
        capture.host.removeAttribute("data-away");
        anchor = y;
      } else if (y > anchor + 12) {
        capture.host.setAttribute("data-away", mounted.side);
        anchor = y;
      }
    }, 60);
  }

  function start() {
    window.addEventListener("scroll", onScroll, { passive: true });
    mount();
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(mount, 120);
    }).observe(root, { attributes: true, attributeFilter: ["data-academy-chat", "data-academy-theme", "data-theme"] });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
