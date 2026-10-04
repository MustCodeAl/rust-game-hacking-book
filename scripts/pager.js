// The previous/next lesson links, available from anywhere on the page. The
// bottom of a lesson already has them as cards; this copies those two links into
// a pair of controls fixed beside the text, so a reader does not have to scroll
// to the end to move on. Wide windows get a tab in each side margin, level with
// the middle of the screen; narrow ones get a small pair at the bottom that
// steps out of the way while the page is scrolled down. The left and right arrow
// keys do the same when no field has the keyboard. Without scripts the cards at
// the bottom remain, and nothing here is read twice by a screen reader.
(function () {
  "use strict";

  var NARROW = "(max-width: 49.99rem)";
  var MIN_MARGIN = 22;
  var MAX_TAB = 34;
  // Places an arrow key must not take over: anything a reader types in or steers
  // with the arrows, and code blocks that scroll sideways.
  var KEEP_ARROWS = "input, textarea, select, [contenteditable], [role='tab'], [role='slider'], [role='radio'], pre, .expressive-code, [data-speedtype-active], .scene, .academy-quiz, .kit-tabs";

  var nav = null;
  var observer = null;

  function arrow(pointsRight) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", pointsRight ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2.4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }

  function control(source, rel) {
    var link = document.createElement("a");
    link.className = "floating-pager__link floating-pager__link--" + rel;
    link.href = source.getAttribute("href");
    link.rel = rel;
    var title = source.querySelector(".link-title");
    var name = (title ? title.textContent : source.textContent).replace(/\s+/g, " ").trim();
    var word = rel === "prev" ? "Previous" : "Next";
    link.setAttribute("aria-label", word + " lesson: " + name + " (" + (rel === "prev" ? "left" : "right") + " arrow key)");
    var tone = source.getAttribute("data-tone");
    if (tone) link.setAttribute("data-tone", tone);
    link.appendChild(arrow(rel === "next"));
    var label = document.createElement("span");
    label.className = "floating-pager__label";
    label.setAttribute("aria-hidden", "true");
    label.textContent = word;
    link.appendChild(label);
    return link;
  }

  // The tabs sit in the margins beside the text. Their size follows the room
  // there, so on a narrow-margin layout they get slimmer instead of covering words.
  function place() {
    if (!nav) return;
    var text = document.querySelector(".sl-markdown-content");
    var main = document.querySelector("main");
    if (!text || !main) return;
    var t = text.getBoundingClientRect();
    var m = main.getBoundingClientRect();
    var left = t.left - Math.max(m.left, 0);
    var right = Math.min(m.right, window.innerWidth) - t.right;
    var narrow = window.matchMedia(NARROW).matches || Math.min(left, right) < MIN_MARGIN;
    nav.dataset.layout = narrow ? "bottom" : "sides";
    if (narrow) return;
    var tab = Math.min(MAX_TAB, Math.floor(Math.min(left, right) - 2));
    nav.style.setProperty("--pager-tab", tab + "px");
    nav.style.setProperty("--pager-left", Math.round(t.left - tab - 1) + "px");
    nav.style.setProperty("--pager-right", Math.round(window.innerWidth - t.right - tab - 1) + "px");
  }

  // On a phone the pair would cover the text it is there to leave, so it hides
  // while the page scrolls down and returns when it scrolls up or reaches an end.
  var lastY = 0;
  var ticking = false;
  function onScroll() {
    if (ticking || !nav) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY;
      var atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 80;
      var away = y > lastY + 6 && y > 160 && !atEnd;
      var back = y < lastY - 6 || y <= 160 || atEnd;
      if (away) nav.dataset.away = "true";
      else if (back) nav.dataset.away = "false";
      lastY = y;
    });
  }

  function onKey(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    var target = event.target;
    if (target && target.closest && target.closest(KEEP_ARROWS)) return;
    if (document.documentElement.dataset.typing) return;
    var link = nav && nav.querySelector(event.key === "ArrowLeft" ? ".floating-pager__link--prev" : ".floating-pager__link--next");
    if (!link) return;
    event.preventDefault();
    window.location.assign(link.href);
  }

  function init() {
    if (nav) { nav.remove(); nav = null; }
    if (observer) { observer.disconnect(); observer = null; }
    var prev = document.querySelector('.pagination-links a[rel="prev"]');
    var next = document.querySelector('.pagination-links a[rel="next"]');
    if (!prev && !next) return;
    nav = document.createElement("nav");
    nav.className = "floating-pager";
    nav.setAttribute("aria-label", "Quick lesson navigation");
    nav.dataset.layout = "sides";
    nav.dataset.away = "false";
    if (prev) nav.appendChild(control(prev, "prev"));
    if (next) nav.appendChild(control(next, "next"));
    document.body.appendChild(nav);
    place();
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver(place);
      var main = document.querySelector("main");
      if (main) observer.observe(main);
      var text = document.querySelector(".sl-markdown-content");
      if (text) observer.observe(text);
    }
  }

  window.addEventListener("resize", place, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("keydown", onKey);
  document.addEventListener("astro:page-load", init);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
