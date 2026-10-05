// Hover cards: a short preview of what a word or link on the page means.
//   - a glossary word in the lesson text (marked at build time with data-gloss,
//     see glossaryTerms() in src/plugins/satteri-academy.mjs): its definition
//   - a link to a glossary entry: the same definition
//   - a link to another lesson, inside a lesson or in the previous/next cards:
//     its chapter, summary, study time, and whether it is done
//   - anything with data-tip: what a button or icon does
//   - words a lesson wraps in a HoverCard (src/components/kit/HoverCard.astro):
//     an example, reference, tip, alternative, recommendation, or closer
//     explanation, read from the card's own text in the page
// A card opens after a short pause under the mouse, or at once when a key moves
// focus to the element, or when a word is tapped (touch has no hover). A tap on
// a link in a lesson shows its card instead of following the link, and the card
// carries an "Open" link; a second tap on the same words follows the link.
// It closes when the pointer leaves, on Escape, and when the page scrolls, so
// nothing is redrawn while the page moves. Definitions and lesson summaries
// are fetched once, the first time a card needs them; the page itself does no
// scanning, because the words were marked when the book was built.
(function () {
  "use strict";

  var CARD_ID = "academy-hovercard";
  var OPEN_DELAY = 400;
  var SWITCH_DELAY = 120;
  var CLOSE_DELAY = 200;
  var GAP = 8;
  var EDGE = 10;
  // Where lesson links live: inside a lesson, and in its previous/next cards.
  var LESSON_LINKS = ".sl-markdown-content a[href], .pagination-links a[href], .floating-pager a[href]";
  // The links a finger's tap shows a card for: words inside a lesson's prose, and
  // the links a lesson wrote cards for. Link cards, buttons, tiles, and the
  // previous/next cards are navigation, so they open on the first tap.
  var TAP_LINKS = ".sl-markdown-content a[href], a.kit-card__trigger";
  var NAVIGATION = ".not-content, .sl-link-card, .sl-link-button, .kit-tile, .pagination-links, .floating-pager";

  var card = null;
  var trigger = null;
  var shown = null;
  var openTimer = 0;
  var closeTimer = 0;
  var pending = null;
  var requests = {};
  // A click does not say whether a finger made it, and only a finger needs the
  // card shown before the link is followed, so the last pointer is remembered.
  var lastPointer = "mouse";

  function glossaryHref() {
    var link = document.querySelector('link[rel="glossary"]');
    return link ? link.href : null;
  }

  function lessonIdOf(href) {
    if (window.AcademyProgress) return window.AcademyProgress.idOf(href);
    var match = /\/(pages\/\d+\/\d+)\/?$/.exec(new URL(href, document.baseURI).pathname);
    return match ? match[1] : null;
  }

  var thisPage = lessonIdOf(window.location.href);

  // The card data sits beside glossary-index.json, wherever the site is served.
  function fetchJson(name) {
    var index = document.querySelector('link[rel="glossary-index"]');
    if (!index || typeof fetch !== "function") return Promise.resolve(null);
    var url = new URL(name, index.href).href;
    if (!requests[url]) {
      requests[url] = fetch(url)
        .then(function (response) { return response.ok ? response.json() : null; })
        .catch(function () { return null; });
    }
    return requests[url];
  }

  // ------------------------------------------------------------------
  // What an element would show
  // ------------------------------------------------------------------

  // The Reader theme panel can turn every card off.
  function cardsOff() {
    return document.documentElement.dataset.academyCards === "off";
  }

  function describe(element) {
    if (cardsOff() || !element || !element.closest || element.closest("#" + CARD_ID)) return null;

    var tip = element.closest("[data-tip]");
    if (tip) return { node: tip, kind: "tip" };

    var written = element.closest(".kit-card__trigger");
    if (written && written.closest(".kit-card")) return { node: written, kind: "card", card: written.closest(".kit-card") };

    var word = element.closest("[data-gloss]");
    if (word) return { node: word, kind: "term", anchor: word.getAttribute("data-gloss") };

    var link = element.closest(LESSON_LINKS);
    if (!link) return null;
    var url;
    try {
      url = new URL(link.getAttribute("href"), window.location.href);
    } catch (error) {
      return null;
    }
    if (url.origin !== window.location.origin) return null;
    // A link to a glossary entry, from a lesson or from another entry.
    var glossary = glossaryHref();
    if (/^#term-/.test(url.hash) && glossary && url.pathname === new URL(glossary).pathname) {
      return { node: link, kind: "term", anchor: url.hash.slice(1) };
    }
    var id = lessonIdOf(url.href);
    if (id && id !== thisPage) return { node: link, kind: "lesson", id: id };
    return null;
  }

  // ------------------------------------------------------------------
  // Card contents, built as text nodes only
  // ------------------------------------------------------------------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function readingTime(minutes) {
    if (!minutes) return "";
    if (minutes < 60) return "about " + minutes + " min";
    return "about " + Math.round((minutes / 60) * 2) / 2 + " h";
  }

  function doneNote(text) {
    var note = el("span", "academy-hovercard__done");
    note.appendChild(el("span", null, "✓ "));
    note.appendChild(document.createTextNode(text));
    return note;
  }

  // The way on for a link whose card a tap opened: the card is all a finger sees
  // of the link until it is followed, so the card holds a link of its own.
  function openLink(node, label) {
    var link = el("a", "academy-hovercard__link academy-hovercard__open", label);
    link.href = node.href;
    if (node.target) link.target = node.target;
    if (node.rel) link.rel = node.rel;
    return link;
  }

  // Resolves to { parts, tone, role } or null when there is nothing to show.
  function contents(info) {
    if (info.kind === "tip") {
      return Promise.resolve({ parts: [el("p", "academy-hovercard__tip", info.node.getAttribute("data-tip"))] });
    }

    if (info.kind === "card") {
      // The card says what the lesson wrote beside the words: its kind as the
      // label, an optional heading, and the text with its code and links.
      var text = info.card.querySelector(".kit-card__text");
      if (!text) return Promise.resolve(null);
      var parts = [el("p", "academy-hovercard__eyebrow", info.card.getAttribute("data-card-label") || "")];
      var heading = info.card.getAttribute("data-card-title");
      if (heading) parts.push(el("p", "academy-hovercard__title", heading));
      var body = el("p", "academy-hovercard__text");
      Array.prototype.forEach.call(text.childNodes, function (child) { body.appendChild(child.cloneNode(true)); });
      parts.push(body);
      // A card on a link to another site says where the link goes; one a tap
      // opened also holds the link.
      if (info.node.tagName === "A") {
        var external = info.node.origin !== window.location.origin;
        var host = info.node.hostname.replace(/^www\./, "");
        if (info.touch) parts.push(openLink(info.node, external ? "Open " + host : "Open the page"));
        else if (external) parts.push(el("p", "academy-hovercard__meta", "Opens " + host));
      }
      return Promise.resolve({ parts: parts, cardKind: info.card.getAttribute("data-card-kind") });
    }

    if (info.kind === "term") {
      return fetchJson("glossary-cards.json").then(function (cards) {
        var entry = cards && cards[info.anchor];
        var glossary = glossaryHref();
        if (!entry || !glossary) return null;
        var open = el("a", "academy-hovercard__link", "Open in the glossary");
        open.href = glossary + "#" + info.anchor;
        return {
          parts: [
            el("p", "academy-hovercard__eyebrow", "Glossary"),
            el("p", "academy-hovercard__title", entry.t),
            el("p", "academy-hovercard__text", entry.d),
            open
          ]
        };
      });
    }

    return fetchJson("lesson-cards.json").then(function (data) {
      var lesson = data && data.lessons[info.id];
      var chapter = lesson && data.chapters[lesson.n.split(".")[0]];
      if (!chapter) return null;
      var meta = el("p", "academy-hovercard__meta", readingTime(lesson.m));
      if (window.AcademyProgress && window.AcademyProgress.isDone(info.id)) {
        if (lesson.m) meta.appendChild(document.createTextNode(" · "));
        meta.appendChild(doneNote("Done"));
      }
      var parts = [
        el("p", "academy-hovercard__eyebrow", "Lesson " + lesson.n + " · " + chapter.t),
        el("p", "academy-hovercard__title", lesson.t),
        el("p", "academy-hovercard__text", lesson.s),
        meta
      ];
      if (info.touch && info.node.tagName === "A") parts.push(openLink(info.node, "Open lesson " + lesson.n));
      return { tone: chapter.tone, parts: parts };
    });
  }

  // ------------------------------------------------------------------
  // Showing, placing, and hiding the card
  // ------------------------------------------------------------------

  function ensureCard() {
    if (card) return card;
    card = el("div", "academy-hovercard");
    card.id = CARD_ID;
    card.setAttribute("role", "tooltip");
    card.setAttribute("data-reader-skip", "");
    card.hidden = true;
    document.body.appendChild(card);
    return card;
  }

  // A word or link that wraps over two lines has two boxes; use the one under
  // the pointer so the card opens beside the words being pointed at.
  function anchorRect(node, pointer) {
    var rects = node.getClientRects();
    if (pointer && rects.length > 1) {
      for (var i = 0; i < rects.length; i++) {
        var rect = rects[i];
        if (pointer.y >= rect.top - 2 && pointer.y <= rect.bottom + 2) return rect;
      }
    }
    return rects.length ? rects[0] : node.getBoundingClientRect();
  }

  // Below the words, or above them when there is no room below.
  function place(info, pointer) {
    var rect = anchorRect(info.node, pointer);
    var width = card.offsetWidth;
    var height = card.offsetHeight;
    var viewWidth = document.documentElement.clientWidth;
    var viewHeight = window.innerHeight;
    var left = Math.min(Math.max(EDGE, rect.left), viewWidth - width - EDGE);
    var top = rect.bottom + GAP;
    if (top + height > viewHeight - EDGE && rect.top - GAP - height >= EDGE) top = rect.top - GAP - height;
    card.style.left = Math.round(left) + "px";
    card.style.top = Math.round(top) + "px";
  }

  function accessibleName(node) {
    return (node.getAttribute("aria-label") || node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function setDescribedBy(node, on) {
    var ids = (node.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (id) {
      return id && id !== CARD_ID;
    });
    if (on) ids.push(CARD_ID);
    if (ids.length) node.setAttribute("aria-describedby", ids.join(" "));
    else node.removeAttribute("aria-describedby");
  }

  function open(info, pointer) {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    var request = {};
    pending = request;
    contents(info).then(function (result) {
      if (pending !== request) return;
      pending = null;
      if (!result || !info.node.isConnected) return hide();
      if (trigger && trigger !== info.node) setDescribedBy(trigger, false);
      ensureCard();
      trigger = info.node;
      shown = { info: info, pointer: pointer };
      card.replaceChildren.apply(card, result.parts);
      card.dataset.kind = info.kind;
      if (result.cardKind) card.dataset.cardKind = result.cardKind;
      else card.removeAttribute("data-card-kind");
      if (result.tone) card.dataset.tone = String(result.tone);
      else card.removeAttribute("data-tone");
      card.classList.remove("is-open");
      card.hidden = false;
      place(info, pointer);
      card.classList.add("is-open");
      // A tip that only repeats the button's own name adds nothing for a
      // screen reader, so it is not attached as a description.
      // A card the lesson wrote is already the trigger's description, from the
      // text kept in the page, so the popup is not attached a second time.
      var repeats = info.kind === "tip" && result.parts[0].textContent.trim() === accessibleName(info.node);
      if (!repeats && info.kind !== "card") setDescribedBy(trigger, true);
    });
  }

  function hide() {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    pending = null;
    if (trigger) setDescribedBy(trigger, false);
    trigger = null;
    shown = null;
    if (card && !card.hidden) {
      card.hidden = true;
      card.classList.remove("is-open");
    }
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(hide, CLOSE_DELAY);
  }

  // ------------------------------------------------------------------
  // Events, all delegated from the document
  // ------------------------------------------------------------------

  document.addEventListener("pointerover", function (event) {
    if (event.pointerType !== "mouse") return;
    if (card && card.contains(event.target)) {
      clearTimeout(closeTimer);
      return;
    }
    var info = describe(event.target);
    if (!info) return;
    if (trigger === info.node) {
      clearTimeout(closeTimer);
      return;
    }
    var pointer = { x: event.clientX, y: event.clientY };
    clearTimeout(openTimer);
    openTimer = setTimeout(function () { open(info, pointer); }, card && !card.hidden ? SWITCH_DELAY : OPEN_DELAY);
  });

  document.addEventListener("pointerout", function (event) {
    if (event.pointerType !== "mouse") return;
    var to = event.relatedTarget;
    var info = describe(event.target);
    if (info && !(to && info.node.contains(to))) clearTimeout(openTimer);
    if (!trigger) return;
    var staying = to && (trigger.contains(to) || (card && card.contains(to)));
    if (!staying) scheduleClose();
  });

  // Touch has no hover, so tapping a glossary word, or words with a card, shows
  // its card, and tapping it again, or anywhere else, hides it.
  var TAPPABLE = "[data-gloss], span.kit-card__trigger";

  // A link in a lesson that has a card (a lesson, a glossary entry, or a card the
  // lesson wrote) is the same: a finger's first tap shows the card and does not
  // follow the link, which is what hovering does for a mouse. The card holds an
  // "Open" link, and a second tap on the words follows the link too. Taps from a
  // mouse, a pen, or the keyboard still follow it at once.
  function tappedLink(target) {
    if (cardsOff() || lastPointer !== "touch" || !target || !target.closest) return null;
    var link = target.closest(TAP_LINKS);
    if (!link || link.closest(NAVIGATION) || (card && card.contains(link))) return null;
    var info = describe(link);
    return info && info.kind !== "tip" ? info : null;
  }

  document.addEventListener("click", function (event) {
    var word = event.target.closest && event.target.closest(TAPPABLE);
    if (word) {
      var info = describe(word);
      if (!info) return;
      if (trigger === word) hide();
      else open(info, null);
      return;
    }
    // A click with no detail is the keyboard's or a script's, not a tap.
    if (event.defaultPrevented || !event.detail) return;
    var link = tappedLink(event.target);
    if (!link) return;
    if (trigger === link.node) {
      hide();
      return;
    }
    event.preventDefault();
    link.touch = true;
    open(link, null);
  });

  // Keyboard focus opens a card at once; a mouse click that focuses a link
  // does not, since the pointer has already had its chance to hover.
  document.addEventListener("focusin", function (event) {
    var info = describe(event.target);
    if (!info || info.node !== event.target) return;
    var keyboard = true;
    try {
      keyboard = event.target.matches(":focus-visible");
    } catch (error) {}
    if (keyboard) open(info, null);
  });

  // Moving focus into the card, to follow its link, is not leaving the words:
  // hiding the card then would take the link away from under the finger.
  document.addEventListener("focusout", function (event) {
    if (!trigger || event.target !== trigger) return;
    if (event.relatedTarget && card && card.contains(event.relatedTarget)) return;
    hide();
  });

  document.addEventListener("keydown", function (event) {
    lastPointer = "key";
    if (event.key === "Escape" && trigger) hide();
  });

  document.addEventListener("pointerdown", function (event) {
    lastPointer = event.pointerType || lastPointer;
    var onWord = event.target.closest && (event.target.closest(TAPPABLE) || (lastPointer === "touch" && tappedLink(event.target)));
    if ((!card || !card.contains(event.target)) && !onWord) hide();
  }, true);

  // A hovered card closes when anything scrolls. A card opened by keyboard
  // focus or a tap follows its element instead, because moving focus to an
  // element off the screen is itself what scrolls the page. A link a tap opened
  // a card for may never have had focus (iOS does not focus links), so a tap
  // counts as much as focus does.
  var following = false;
  document.addEventListener("scroll", function () {
    if (!shown) return hide();
    if (shown.pointer || (document.activeElement !== trigger && !shown.info.touch)) return hide();
    if (following) return;
    following = true;
    requestAnimationFrame(function () {
      following = false;
      if (shown && !shown.pointer) place(shown.info, null);
    });
  }, { capture: true, passive: true });
  window.addEventListener("resize", hide, { passive: true });

  // Glossary words are marked as plain text, so the keyboard can reach them
  // only if they are made focusable; a card then opens when focus lands. With
  // cards off they are ordinary text again, with no keyboard stop. The same goes
  // for the words of a lesson's own cards, except links, which are always focusable.
  function syncWordFocus() {
    document.querySelectorAll("[data-gloss], span.kit-card__trigger").forEach(function (word) {
      if (cardsOff()) word.removeAttribute("tabindex");
      else if (!word.hasAttribute("tabindex")) word.setAttribute("tabindex", "0");
    });
  }

  document.addEventListener("academy:reader-preference", function (event) {
    if (!event.detail || event.detail.name !== "cards") return;
    hide();
    syncWordFocus();
  });

  // The text of a lesson's own cards stays in the page for print, search, and
  // the listening edition. Once this script has taken over, the CSS hides it on
  // screen and each trigger is described by it, so a screen reader still has it.
  function wireCards() {
    var count = 0;
    document.querySelectorAll(".kit-card").forEach(function (wrap) {
      var body = wrap.querySelector(".kit-card__body");
      var trigger = wrap.querySelector(".kit-card__trigger");
      if (!body || !trigger) return;
      if (!body.id) body.id = "kit-card-text-" + (++count);
      trigger.setAttribute("aria-describedby", body.id);
    });
    document.documentElement.setAttribute("data-cards-ready", "");
  }

  function start() {
    wireCards();
    syncWordFocus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
