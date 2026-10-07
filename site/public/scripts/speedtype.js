// Typing practice on a code block (src/components/kit/SpeedType.astro). A button
// under the block turns it into a typing test: the code stays on screen, dimmed;
// each correct key lights up the next character; a wrong key flashes and does not
// advance; Backspace takes back the last character; Enter starts the next line
// and the indentation is filled in for you, as are characters a keyboard cannot
// easily type (an emoji in a comment). It finishes when every character is right
// and shows words per minute (five characters count as a word), accuracy, time,
// and the reader's best for that snippet. Nothing is sent anywhere; the best is
// kept in this browser. The code block itself is copied, not changed, so the page
// reads, prints, and searches as before. Authored recall fragments add a second
// optional mode: blanks replace those fragments in the copy until they are typed.
(function () {
  "use strict";

  var SENTINEL = " ";
  var STORAGE = "gha-speedtype-";
  var active = null;

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) { /* private mode */ }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function button(text, className) {
    var node = el("button", className, text);
    node.type = "button";
    return node;
  }

  // Phone keyboards turn quotes and dashes into typographic ones.
  function normalize(ch) {
    return ({ "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2013": "-", "\u2014": "-", "\u00a0": " ", "\r": "\n" })[ch] || ch;
  }

  function printable(ch) {
    return ch.length === 1 && ch >= " " && ch <= "~";
  }

  function readBest(id) {
    try { return JSON.parse(storageGet(STORAGE + id) || "null"); } catch (error) { return null; }
  }

  function readRecall(root) {
    try {
      var fragments = JSON.parse(root.dataset.speedtypeRecall || "[]");
      return Array.isArray(fragments) ? fragments.filter(function (fragment) {
        return fragment && typeof fragment.text === "string" && /[!-~]/.test(fragment.text) &&
          typeof fragment.hint === "string" && fragment.hint.trim();
      }) : [];
    } catch (error) { return []; }
  }

  // ------------------------------------------------------------------
  // One typing session over one copy of the block
  // ------------------------------------------------------------------

  // Wrap every character of the copied block in a span, line by line, and list
  // them in order. A line's leading and trailing blanks, and any character that
  // cannot be typed on an ordinary keyboard, are filled in for the reader.
  function buildSequence(block) {
    var seq = [];
    var lines = block.querySelectorAll(".ec-line .code");
    lines.forEach(function (code, index) {
      // The renderer fills an empty row with a newline. Our own Enter marker
      // already represents that row, so keep the copy to one visible line.
      if (/^[ \t\r\n]*$/.test(code.textContent || "")) code.textContent = "";
      var walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      var texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      var line = [];
      texts.forEach(function (node) {
        var fragment = document.createDocumentFragment();
        Array.from(node.nodeValue).forEach(function (ch) {
          var span = el("span", "st-c", ch);
          span.dataset.s = "todo";
          fragment.appendChild(span);
          line.push({ ch: ch, el: span, auto: false, nl: false });
        });
        node.parentNode.replaceChild(fragment, node);
      });
      var first = 0;
      while (first < line.length && (line[first].ch === " " || line[first].ch === "\t")) first += 1;
      var last = line.length;
      while (last > first && (line[last - 1].ch === " " || line[last - 1].ch === "\t")) last -= 1;
      line.forEach(function (item, k) {
        item.auto = k < first || k >= last || !(printable(item.ch) || item.ch === "\t");
      });
      seq = seq.concat(line);
      if (index < lines.length - 1) {
        var mark = el("span", "st-c st-nl", "↵");
        mark.dataset.s = "todo";
        mark.setAttribute("aria-hidden", "true");
        code.appendChild(mark);
        seq.push({ ch: "\n", el: mark, auto: false, nl: true });
      }
    });
    return seq;
  }

  // Match against the real code, using UTF-16 offsets just like indexOf. The
  // sequence uses code points, so counting sequence items would skew a match
  // after an emoji. Keep whitespace and automatically filled characters visible.
  function addRecall(seq, fragments) {
    var source = "";
    var offsets = seq.map(function (item) {
      var offset = source.length;
      source += item.ch;
      return offset;
    });
    fragments.forEach(function (fragment) {
      var start = source.indexOf(fragment.text);
      while (start !== -1) {
        var end = start + fragment.text.length;
        seq.forEach(function (item, index) {
          if (offsets[index] >= start && offsets[index] < end && !item.auto &&
            !/\s/.test(item.ch) && !item.recallHint) item.recallHint = fragment.hint;
        });
        start = source.indexOf(fragment.text, start + 1);
      }
    });
  }

  function open(root, block, starter, fragments) {
    if (active) active.close();
    var id = root.dataset.speedtypeId || "snippet";
    var title = root.dataset.speedtypeTitle || "this code";
    var recallMode = !!(fragments && fragments.length);
    var bestId = id + (recallMode ? ":recall" : "");

    var panel = el("div", "kit-speedtype__panel");
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", (recallMode ? "Recall practice: " : "Typing practice: ") + title);
    panel.setAttribute("data-speedtype-active", "");
    panel.dataset.speedtypeMode = recallMode ? "recall" : "copy";

    var stats = el("div", "kit-speedtype__stats");
    var wpmOut = el("strong", null, "0");
    var accOut = el("strong", null, "100%");
    var timeOut = el("strong", null, "0:00");
    var errOut = el("strong", null, "0");
    [["wpm", wpmOut], ["accuracy", accOut], ["time", timeOut], ["mistakes", errOut]].forEach(function (pair) {
      var item = el("span", "kit-speedtype__stat");
      item.appendChild(pair[1]);
      item.appendChild(document.createTextNode(" " + pair[0]));
      stats.appendChild(item);
    });
    var modeOut = recallMode ? el("span", "kit-speedtype__mode", "Unaided recall") : null;
    if (modeOut) stats.appendChild(modeOut);
    var track = el("div", "kit-speedtype__progress");
    var bar = el("span");
    track.appendChild(bar);
    track.setAttribute("aria-hidden", "true");

    var copy = block.cloneNode(true);
    copy.removeAttribute("hidden");
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll(".copy, button, [data-code]").forEach(function (extra) { extra.remove(); });
    copy.classList.add("kit-speedtype__code");
    var seq = buildSequence(copy);
    if (recallMode) addRecall(seq, fragments);

    var input = el("textarea", "kit-speedtype__input");
    input.value = SENTINEL;
    input.rows = 1;
    input.setAttribute("aria-label", "Typing field for " + title + (recallMode ? ". Type the whole snippet, filling the underscores from memory. Hint gives a clue for the current or next blank; Show hidden code reveals the answers. Both mark this run as assisted." : ". Type the code that is shown.") + " Enter starts a new line and the indentation is filled in. Backspace corrects. Escape closes.");
    ["autocomplete", "autocorrect", "autocapitalize", "spellcheck"].forEach(function (name) {
      input.setAttribute(name, name === "autocapitalize" ? "none" : "off");
    });
    input.setAttribute("data-gramm", "false");

    var hint = el("p", "kit-speedtype__hint", recallMode ? "Type the whole snippet, filling the underscores from memory. Correct characters appear; spaces and indentation stay in place. Hint or Show hidden code marks this run as assisted. Enter starts a new line, Backspace corrects, Esc closes." : "Click here and type the code. A wrong key flashes and waits. Enter starts a new line and fills in the indentation. Backspace corrects, Esc closes.");
    var clue = recallMode ? el("p", "kit-speedtype__clue") : null;
    if (clue) {
      clue.setAttribute("role", "status");
      clue.setAttribute("aria-live", "polite");
      clue.setAttribute("aria-atomic", "true");
    }
    var result = el("p", "kit-speedtype__result");
    result.setAttribute("role", "status");
    var actions = el("div", "kit-speedtype__actions");
    var help = recallMode ? button("Hint", "kit-speedtype__action") : null;
    var reveal = recallMode ? button("Show hidden code", "kit-speedtype__action") : null;
    if (help) actions.appendChild(help);
    if (reveal) {
      reveal.setAttribute("aria-pressed", "false");
      actions.appendChild(reveal);
    }
    var again = button("Start over", "kit-speedtype__action");
    var done = button("Back to reading", "kit-speedtype__action");
    actions.appendChild(again);
    actions.appendChild(done);

    var shell = el("div", "kit-speedtype__shell");
    shell.appendChild(copy);
    shell.appendChild(input);
    var paused = el("div", "kit-speedtype__paused", "Click to keep typing");
    paused.hidden = true;
    shell.appendChild(paused);

    panel.appendChild(stats);
    panel.appendChild(track);
    panel.appendChild(shell);
    panel.appendChild(hint);
    if (clue) panel.appendChild(clue);
    panel.appendChild(result);
    panel.appendChild(actions);

    // ---- state ------------------------------------------------------
    var pos = 0;
    var keys = 0;
    var errors = 0;
    var begun = 0;
    var ended = 0;
    var ticker = 0;
    var current = null;
    var finished = false;
    var answersVisible = false;
    var assisted = false;
    var typeable = seq.filter(function (item) { return !item.auto; }).length;

    function setState(index, state) {
      var item = seq[index];
      item.el.dataset.s = state;
      if (item.recallHint) {
        var masked = state === "todo" && !answersVisible;
        item.el.textContent = masked ? "_" : item.ch;
        item.el.toggleAttribute("data-recall-hidden", masked);
      }
    }

    function markAssisted() {
      assisted = true;
      modeOut.textContent = "Assisted recall";
    }

    function showHint() {
      var next = seq.slice(pos).find(function (item) { return item.recallHint; });
      if (next) {
        markAssisted();
        clue.textContent = "Hint: " + next.recallHint;
      } else clue.textContent = "All hidden fragments are complete. Start over to practise them again.";
      input.focus({ preventScroll: true });
    }

    function toggleAnswers() {
      answersVisible = !answersVisible;
      if (answersVisible && !finished) markAssisted();
      reveal.textContent = answersVisible ? "Hide answers" : "Show hidden code";
      reveal.setAttribute("aria-pressed", String(answersVisible));
      seq.forEach(function (item, index) { setState(index, item.el.dataset.s); });
      input.focus({ preventScroll: true });
    }

    function mark() {
      if (current) delete current.dataset.cur;
      var item = seq[pos];
      current = item ? item.el : null;
      if (current) current.dataset.cur = "true";
    }

    function skipAuto() {
      while (pos < seq.length && seq[pos].auto) {
        setState(pos, "ok");
        pos += 1;
      }
    }

    function typedCount() {
      var count = 0;
      for (var i = 0; i < pos; i += 1) if (!seq[i].auto) count += 1;
      return count;
    }

    function seconds() {
      if (!begun) return 0;
      return ((ended || window.performance.now()) - begun) / 1000;
    }

    function clock(total) {
      var whole = Math.floor(total);
      return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
    }

    function wpm(count) {
      var s = seconds();
      return s < 1.5 ? 0 : Math.round((count / 5) / (s / 60));
    }

    function accuracy() {
      return keys ? Math.round(((keys - errors) / keys) * 100) : 100;
    }

    function paint() {
      var count = typedCount();
      wpmOut.textContent = String(wpm(count));
      accOut.textContent = accuracy() + "%";
      timeOut.textContent = clock(seconds());
      errOut.textContent = String(errors);
      bar.style.width = (typeable ? (count / typeable) * 100 : 100) + "%";
    }

    function begin() {
      if (begun) return;
      begun = window.performance.now();
      hint.hidden = !recallMode;
      ticker = window.setInterval(paint, 250);
    }

    function finish() {
      finished = true;
      ended = window.performance.now();
      window.clearInterval(ticker);
      mark();
      var speed = wpm(typeable);
      var acc = accuracy();
      paint();
      var previous = readBest(bestId);
      var better = !assisted && (!previous || speed > previous.wpm);
      if (better) storageSet(STORAGE + bestId, JSON.stringify({ wpm: speed, acc: acc }));
      result.textContent = (recallMode ? (assisted ? "Finished recall (assisted): " : "Finished recall: ") : "Finished: ") + speed + " words per minute, " + acc + "% accuracy, " + clock(seconds()) + ", " +
        errors + (errors === 1 ? " mistake." : " mistakes.") +
        (assisted ? " This assisted run does not change your unaided recall best." :
          (previous ? (better ? " A new best; the last was " + previous.wpm + "." : " Your best is " + previous.wpm + ".") : " That is your first time on this one."));
      result.dataset.done = "true";
      panel.dataset.done = "true";
      starter.updateBest();
    }

    function flash(item) {
      item.el.dataset.bad = "true";
      window.setTimeout(function () { delete item.el.dataset.bad; }, 220);
    }

    function advance() {
      var newLine = seq[pos].nl;
      setState(pos, "ok");
      pos += 1;
      skipAuto();
      mark();
      if (pos >= seq.length) finish();
      else if (newLine) keepInView();
    }

    function keepInView() {
      if (!current) return;
      var box = current.getBoundingClientRect();
      if (box.top < 80 || box.bottom > window.innerHeight - 80) current.scrollIntoView({ block: "center" });
    }

    function typeChar(ch) {
      if (finished || pos >= seq.length) return;
      begin();
      var item = seq[pos];
      keys += 1;
      if (item.ch === ch) advance();
      else {
        errors += 1;
        flash(item);
        paint();
      }
    }

    function enter() {
      typeChar("\n");
    }

    function tab() {
      if (!finished && seq[pos] && seq[pos].ch === "\t") typeChar("\t");
    }

    function back() {
      if (finished) return;
      var p = pos - 1;
      while (p >= 0 && seq[p].auto) p -= 1;
      if (p < 0) return;
      for (var i = p; i < pos; i += 1) setState(i, "todo");
      pos = p;
      mark();
      paint();
    }

    function onKeydown(event) {
      event.stopPropagation();
      if (event.isComposing || event.keyCode === 229) return;
      var key = event.key;
      if (key === "Escape") { event.preventDefault(); close(); return; }
      if (key === "Backspace") { event.preventDefault(); back(); return; }
      if (key === "Enter") { event.preventDefault(); enter(); return; }
      if (key === "Tab") {
        if (!event.shiftKey && !finished && seq[pos] && seq[pos].ch === "\t") {
          event.preventDefault();
          tab();
        }
        return;
      }
      if (key.length === 1 && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        typeChar(normalize(key));
        return;
      }
      if (key.indexOf("Arrow") === 0 || key === "Home" || key === "End") event.preventDefault();
    }

    // Phone keyboards report most keys as "Unidentified", so what was typed is
    // read from the field, which always holds one blank so Backspace has something to take.
    function onInput(event) {
      var kind = event.inputType || "";
      var value = input.value;
      if (kind.indexOf("delete") === 0 || value.length < SENTINEL.length) back();
      else if (kind === "insertLineBreak" || kind === "insertParagraph") enter();
      else {
        var typed = event.data != null ? event.data : value.replace(SENTINEL, "");
        Array.from(typed).forEach(function (ch) {
          if (ch === "\n") enter();
          else typeChar(normalize(ch));
        });
      }
      input.value = SENTINEL;
      input.setSelectionRange(SENTINEL.length, SENTINEL.length);
    }

    function reset() {
      window.clearInterval(ticker);
      answersVisible = false; assisted = false;
      if (recallMode) {
        modeOut.textContent = "Unaided recall";
        clue.textContent = "";
        reveal.textContent = "Show hidden code";
        reveal.setAttribute("aria-pressed", "false");
      }
      seq.forEach(function (item, index) { setState(index, "todo"); delete item.el.dataset.bad; });
      pos = 0; keys = 0; errors = 0; begun = 0; ended = 0; finished = false;
      result.textContent = "";
      delete result.dataset.done;
      delete panel.dataset.done;
      hint.hidden = false;
      skipAuto();
      mark();
      paint();
      input.value = SENTINEL;
      input.focus({ preventScroll: true });
    }

    function close() {
      window.clearInterval(ticker);
      document.removeEventListener("visibilitychange", onHide);
      panel.remove();
      block.hidden = false;
      starter.node.hidden = false;
      delete document.documentElement.dataset.typing;
      active = null;
      starter.button.focus();
    }

    input.addEventListener("keydown", onKeydown);
    input.addEventListener("input", onInput);
    input.addEventListener("paste", function (event) { event.preventDefault(); });
    input.addEventListener("focus", function () {
      paused.hidden = true;
      panel.dataset.focus = "true";
      input.setSelectionRange(SENTINEL.length, SENTINEL.length);
    });
    input.addEventListener("blur", function () { paused.hidden = finished; delete panel.dataset.focus; });
    shell.addEventListener("click", function () { input.focus({ preventScroll: true }); });
    if (help) help.addEventListener("click", showHint);
    if (reveal) reveal.addEventListener("click", toggleAnswers);
    again.addEventListener("click", reset);
    done.addEventListener("click", close);
    function onHide() { if (document.hidden && !finished && begun) input.blur(); }
    document.addEventListener("visibilitychange", onHide);

    block.hidden = true;
    starter.node.hidden = true;
    block.parentNode.insertBefore(panel, block.nextSibling);
    document.documentElement.dataset.typing = "true";
    active = { close: close };
    seq.forEach(function (item, index) { setState(index, "todo"); });
    skipAuto();
    mark();
    paint();
    input.focus({ preventScroll: true });
    panel.scrollIntoView({ block: "nearest" });
  }

  function enhance(root) {
    if (root.dataset.speedtypeReady) return;
    var block = root.querySelector(".expressive-code");
    if (!block || !block.querySelector(".ec-line .code")) return;
    root.dataset.speedtypeReady = "true";
    var id = root.dataset.speedtypeId || "snippet";
    var fragments = readRecall(root);
    var wrap = el("div", "kit-speedtype__bar");
    var start = button("⌨ Practise typing this", "kit-speedtype__start");
    var best = el("span", "kit-speedtype__best");
    var recallStart = fragments.length ? button("Recall practice", "kit-speedtype__start") : null;
    var recallBest = fragments.length ? el("span", "kit-speedtype__best") : null;
    wrap.appendChild(start);
    wrap.appendChild(best);
    if (recallStart) {
      wrap.appendChild(recallStart);
      wrap.appendChild(recallBest);
    }
    root.appendChild(wrap);
    var starter = {
      node: wrap,
      button: start,
      updateBest: function () {
        var saved = readBest(id);
        best.textContent = saved ? "Your best: " + saved.wpm + " wpm, " + saved.acc + "% accuracy" : "";
        if (recallBest) {
          var recalled = readBest(id + ":recall");
          recallBest.textContent = recalled ? "Recall best (unaided): " + recalled.wpm + " wpm, " + recalled.acc + "% accuracy" : "";
        }
      },
    };
    starter.updateBest();
    start.addEventListener("click", function () { open(root, block, starter); });
    if (recallStart) recallStart.addEventListener("click", function () {
      open(root, block, { node: wrap, button: recallStart, updateBest: starter.updateBest }, fragments);
    });
  }

  function init() {
    document.querySelectorAll("[data-speedtype]").forEach(enhance);
  }

  document.addEventListener("astro:page-load", init);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
