// Typing practice on a code block (src/components/kit/SpeedType.astro). A button
// under the block turns it into a typing test: the code stays on screen, dimmed;
// each correct key lights up the next character; a wrong key flashes and does not
// advance; Backspace takes back the last character; Enter starts the next line
// and the indentation is filled in for you, as are characters a keyboard cannot
// easily type (an emoji in a comment). It finishes when every character is right
// and shows words per minute (five characters count as a word), accuracy, time,
// and the reader's best for that snippet. Nothing is sent anywhere; the best is
// kept in this browser. The code block itself is copied, not changed, so the page
// reads, prints, and searches as before. When recall fragments are authored,
// the main practice button hides those fragments until they are typed. Copying
// visible code remains a separate optional practice button.

import { createRecallPlan, parseRecallFragments, parseRecallFocus, recallFocusChoices } from '../lib/recall-mask';
import type { RecallFocus, RecallFragment, RecallPlan } from '../lib/recall-mask';

type CharacterState = 'todo' | 'ok';
interface SequenceItem {
  ch: string;
  el: HTMLSpanElement;
  auto: boolean;
  nl: boolean;
  offset: number;
  recallHint?: string;
}
interface BestRecord { wpm: number; acc: number }
interface Starter {
  node: HTMLDivElement;
  button: HTMLButtonElement;
  updateBest(): void;
}
interface ActiveSession { close(): void }

const SENTINEL = " ";
const STORAGE = "gha-speedtype-";
let active: ActiveSession | null = null;

function storageGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch (error) { return null; }
}
function storageSet(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch (error) { /* private mode */ }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string | null, text?: string | null): HTMLElementTagNameMap[K] {
  let node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function button(text: string, className?: string): HTMLButtonElement {
  let node = el("button", className, text);
  node.type = "button";
  return node;
}

// Phone keyboards turn quotes and dashes into typographic ones.
function normalize(ch: string): string {
  const alternatives: Readonly<Record<string, string>> = { "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2013": "-", "\u2014": "-", "\u00a0": " ", "\r": "\n" };
  return alternatives[ch] ?? ch;
}

function printable(ch: string): boolean {
  return ch.length === 1 && ch >= " " && ch <= "~";
}

function readBest(id: string): BestRecord | null {
  try {
    const value: unknown = JSON.parse(storageGet(STORAGE + id) ?? 'null');
    if (typeof value !== 'object' || value === null ||
        !('wpm' in value) || typeof value.wpm !== 'number' || !Number.isFinite(value.wpm) || value.wpm < 0 ||
        !('acc' in value) || typeof value.acc !== 'number' || !Number.isFinite(value.acc) || value.acc < 0 || value.acc > 100) return null;
    return { wpm: value.wpm, acc: value.acc };
  } catch { return null; }
}

function readRecall(root: HTMLElement): RecallFragment[] {
  try {
    const value: unknown = JSON.parse(root.dataset.speedtypeRecall ?? '[]');
    return parseRecallFragments(value);
  } catch { return []; }
}

// ------------------------------------------------------------------
// One typing session over one copy of the block
// ------------------------------------------------------------------

// Wrap every character of the copied block in a span, line by line, and list
// them in order. A line's leading and trailing blanks, and any character that
// cannot be typed on an ordinary keyboard, are filled in for the reader.
function buildSequence(block: HTMLElement): SequenceItem[] {
  let seq: SequenceItem[] = [];
  let lines = block.querySelectorAll<HTMLElement>(".ec-line .code");
  lines.forEach(function (code, index) {
    // The renderer fills an empty row with a newline. Our own Enter marker
    // already represents that row, so keep the copy to one visible line.
    if (/^[ \t\r\n]*$/.test(code.textContent || "")) code.textContent = "";
    let walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    while (walker.nextNode()) { if (walker.currentNode instanceof Text) texts.push(walker.currentNode); }
    const line: SequenceItem[] = [];
    texts.forEach(function (node) {
      let fragment = document.createDocumentFragment();
      Array.from(node.nodeValue ?? "").forEach(function (ch) {
        let span = el("span", "st-c", ch);
        span.dataset.s = "todo";
        fragment.appendChild(span);
        line.push({ ch: ch, el: span, auto: false, nl: false, offset: 0 });
      });
      node.parentNode?.replaceChild(fragment, node);
    });
    let first = 0;
    while (first < line.length && (line[first]?.ch === " " || line[first]?.ch === "\t")) first += 1;
    let last = line.length;
    while (last > first && (line[last - 1]?.ch === " " || line[last - 1]?.ch === "\t")) last -= 1;
    line.forEach(function (item, k) {
      item.auto = k < first || k >= last || !(printable(item.ch) || item.ch === "\t");
    });
    seq = seq.concat(line);
    if (index < lines.length - 1) {
      let mark = el("span", "st-c st-nl", "↵");
      mark.dataset.s = "todo";
      mark.setAttribute("aria-hidden", "true");
      code.appendChild(mark);
      seq.push({ ch: "\n", el: mark, auto: false, nl: true, offset: 0 });
    }
  });
  let offset = 0;
  for (const item of seq) { item.offset = offset; offset += item.ch.length; }
  return seq;
}

// Match against the real code, using UTF-16 offsets just like indexOf. The
// sequence uses code points, so counting sequence items would skew a match
// after an emoji. Keep whitespace and automatically filled characters visible.
function applyRecall(
  seq: readonly SequenceItem[], source: string, fragments: readonly RecallFragment[], focus: RecallFocus, rotation: number,
): RecallPlan {
  const plan = createRecallPlan(source, fragments, { focus, rotation });
  for (const item of seq) {
    delete item.recallHint;
    for (const target of plan.targets) {
      if (item.offset >= target.start && item.offset + item.ch.length <= target.end && !item.auto) {
        item.recallHint = target.hint;
        break;
      }
    }
    item.el.removeAttribute('data-recall-hidden');
  }
  return plan;
}

function open(root: HTMLElement, block: HTMLElement, starter: Starter, fragments: readonly RecallFragment[] = []): void {
  if (active) active.close();
  let id = root.dataset.speedtypeId || "snippet";
  let title = root.dataset.speedtypeTitle || "this code";
  let recallMode = !!(fragments && fragments.length);
  let bestId = id + (recallMode ? ":recall" : "");

  let panel = el("div", "kit-speedtype__panel");
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", (recallMode ? "Recall practice: " : "Typing practice: ") + title);
  panel.setAttribute("data-speedtype-active", "");
  panel.dataset.speedtypeMode = recallMode ? "recall" : "copy";

  let stats = el("div", "kit-speedtype__stats");
  let wpmOut = el("strong", null, "0");
  let accOut = el("strong", null, "100%");
  let timeOut = el("strong", null, "0:00");
  let errOut = el("strong", null, "0");
  const statsParts: readonly (readonly [string, HTMLElement])[] = [["wpm", wpmOut], ["accuracy", accOut], ["time", timeOut], ["mistakes", errOut]];
  statsParts.forEach(function ([name, output]) {
    let item = el("span", "kit-speedtype__stat");
    item.appendChild(output);
    item.appendChild(document.createTextNode(" " + name));
    stats.appendChild(item);
  });
  let modeOut = recallMode ? el("span", "kit-speedtype__mode", "Unaided recall") : null;
  if (modeOut) stats.appendChild(modeOut);
  let track = el("div", "kit-speedtype__progress");
  let bar = el("span");
  track.appendChild(bar);
  track.setAttribute("aria-hidden", "true");

  const copy = block.cloneNode(true);
  if (!(copy instanceof HTMLElement)) return;
  copy.removeAttribute("hidden");
  copy.setAttribute("aria-hidden", "true");
  copy.querySelectorAll(".copy, button, [data-code]").forEach(function (extra) { extra.remove(); });
  copy.classList.add("kit-speedtype__code");
  let seq = buildSequence(copy);
  const source = seq.map(item => item.ch).join('');
  let focus: RecallFocus = 'mixed';
  let rotation = 0;
  let recallPlan = recallMode ? applyRecall(seq, source, fragments, focus, rotation) : null;
  const focusChoices = recallFocusChoices(fragments);
  const focusSelect = recallMode && focusChoices.length > 1 ? el('select', 'kit-speedtype__action') : null;
  const focusLabel = focusSelect ? el('label', 'kit-speedtype__best', 'Practice focus: ') : null;
  if (focusSelect && focusLabel) {
    const labels: Record<RecallFocus, string> = { mixed: 'Mixed', calls: 'Calls & arguments', imports: 'Imports & types', logic: 'Logic' };
    focusSelect.id = `${id}-practice-focus`;
    focusSelect.setAttribute('aria-label', 'Practice focus');
    focusLabel.htmlFor = focusSelect.id;
    for (const choice of focusChoices) {
      const option = el('option', null, labels[choice]);
      option.value = choice;
      focusSelect.appendChild(option);
    }
    focusLabel.appendChild(focusSelect);
    panel.dataset.speedtypeFocus = focus;
  }

  // Keep a plain reading copy available to assistive readers while the
  // animated characters stay quiet. Recall uses the same masks as the screen.
  let readable = el("div", "sr-only");
  readable.id = id + "-practice-code";
  readable.setAttribute("data-speedtype-readable", "");
  let readableChars = seq.map(function (item) { return item.el.textContent ?? ""; });
  let readableFrame = 0;
  function syncReadable(immediate = false): void {
    if (immediate) {
      if (readableFrame) window.cancelAnimationFrame(readableFrame);
      readableFrame = 0; readable.textContent = readableChars.join("");
    } else if (!readableFrame) {
      readableFrame = window.requestAnimationFrame(function () { readableFrame = 0; readable.textContent = readableChars.join(""); });
    }
  }

  let input = el("textarea", "kit-speedtype__input");
  input.value = SENTINEL;
  input.rows = 1;
  input.setAttribute("aria-label", "Typing field for " + title + (recallMode ? ". Type the snippet with a few short blanks. Most code stays visible. Hint gives a clue for the current or next blank; Show hidden code reveals the answers. Both mark this run as assisted." : ". Type the code that is shown.") + " Enter starts a new line and the indentation is filled in. Backspace corrects. Escape closes.");
  input.setAttribute("aria-describedby", readable.id);
  ["autocomplete", "autocorrect", "autocapitalize", "spellcheck"].forEach(function (name) {
    input.setAttribute(name, name === "autocapitalize" ? "none" : "off");
  });
  input.setAttribute("data-gramm", "false");

  let hint = el("p", "kit-speedtype__hint", recallMode ? "Type the snippet with a few short blanks. Most code stays visible. Correct characters appear; spaces and indentation stay in place. Hint or Show hidden code marks this run as assisted. Enter starts a new line, Backspace corrects, Esc closes." : "Click here and type the code. A wrong key flashes and waits. Enter starts a new line and fills in the indentation. Backspace corrects, Esc closes.");
  let clue = recallMode ? el("p", "kit-speedtype__clue") : null;
  if (clue) {
    clue.setAttribute("role", "status");
    clue.setAttribute("aria-live", "polite");
    clue.setAttribute("aria-atomic", "true");
  }
  let result = el("p", "kit-speedtype__result");
  result.setAttribute("role", "status");
  let actions = el("div", "kit-speedtype__actions");
  let help = recallMode ? button("Hint", "kit-speedtype__action") : null;
  let reveal = recallMode ? button("Show hidden code", "kit-speedtype__action") : null;
  if (help) actions.appendChild(help);
  if (reveal) {
    reveal.setAttribute("aria-pressed", "false");
    actions.appendChild(reveal);
  }
  let again = button("Start over", "kit-speedtype__action");
  let done = button("Back to reading", "kit-speedtype__action");
  actions.appendChild(again);
  actions.appendChild(done);

  let shell = el("div", "kit-speedtype__shell");
  shell.appendChild(copy);
  shell.appendChild(input);
  let paused = el("div", "kit-speedtype__paused", "Click to keep typing");
  paused.hidden = true;
  shell.appendChild(paused);

  panel.appendChild(stats);
  panel.appendChild(track);
  if (focusLabel) panel.appendChild(focusLabel);
  panel.appendChild(readable);
  panel.appendChild(shell);
  panel.appendChild(hint);
  if (clue) panel.appendChild(clue);
  panel.appendChild(result);
  panel.appendChild(actions);

  // ---- state ------------------------------------------------------
  let pos = 0;
  let keys = 0;
  let errors = 0;
  let begun = 0;
  let ended = 0;
  let ticker = 0;
  let current: HTMLSpanElement | null = null;
  let finished = false;
  let answersVisible = false;
  let assisted = recallMode && recallPlan?.targets.length === 0;
  const workedHint = hint.textContent ?? '';
  const visibleHint = 'No complete token fits this short snippet while keeping most code visible. You can still copy the visible code.';
  if (recallPlan) panel.toggleAttribute('data-speedtype-budget-exception', recallPlan.exceedsPreferredBudget);
  if (assisted && modeOut) { modeOut.textContent = 'Visible code practice'; hint.textContent = visibleHint; }
  let typeable = seq.filter(function (item) { return !item.auto; }).length;

  function setState(index: number, state: CharacterState): void {
    const item = seq[index];
    if (!item) return;
    item.el.dataset.s = state;
    if (item.recallHint || item.el.hasAttribute("data-recall-hidden")) {
      const masked = !!item.recallHint && state === "todo" && !answersVisible;
      const display = item.nl ? "↵" : masked ? "_" : item.ch;
      if (item.el.textContent !== display) item.el.textContent = display;
      readableChars[index] = display;
      item.el.toggleAttribute("data-recall-hidden", masked);
    }
  }

  function markAssisted() {
    assisted = true;
    if (modeOut) modeOut.textContent = "Assisted recall";
  }

  function showHint() {
    if (!clue) return;
    let next = seq.slice(pos).find(function (item) { return item.recallHint; });
    if (next) {
      markAssisted();
      clue.textContent = "Hint: " + next.recallHint;
    } else clue.textContent = "All hidden fragments are complete. Start over to practise them again.";
    input.focus({ preventScroll: true });
  }

  function toggleAnswers() {
    if (!reveal) return;
    answersVisible = !answersVisible;
    if (answersVisible && !finished) markAssisted();
    reveal.textContent = answersVisible ? "Hide answers" : "Show hidden code";
    reveal.setAttribute("aria-pressed", String(answersVisible));
    seq.forEach(function (item, index) { setState(index, item.el.dataset.s === "ok" ? "ok" : "todo"); });
    syncReadable(true);
    input.focus({ preventScroll: true });
  }

  function mark() {
    if (current) delete current.dataset.cur;
    let item = seq[pos];
    current = item ? item.el : null;
    if (current) current.dataset.cur = "true";
    syncReadable();
  }

  function skipAuto() {
    while (pos < seq.length && seq[pos]?.auto) {
      setState(pos, "ok");
      pos += 1;
    }
  }

  function typedCount() {
    let count = 0;
    for (let i = 0; i < pos; i += 1) if (!seq[i]?.auto) count += 1;
    return count;
  }

  function seconds() {
    if (!begun) return 0;
    return ((ended || window.performance.now()) - begun) / 1000;
  }

  function clock(total: number): string {
    let whole = Math.floor(total);
    return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
  }

  function wpm(count: number): number {
    let s = seconds();
    return s < 1.5 ? 0 : Math.round((count / 5) / (s / 60));
  }

  function accuracy() {
    return keys ? Math.round(((keys - errors) / keys) * 100) : 100;
  }

  function paint() {
    let count = typedCount();
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
    let speed = wpm(typeable);
    let acc = accuracy();
    paint();
    let previous = readBest(bestId);
    let better = !assisted && (!previous || speed > previous.wpm);
    if (better) storageSet(STORAGE + bestId, JSON.stringify({ wpm: speed, acc: acc }));
    result.textContent = (recallMode ? (assisted ? "Finished recall (assisted): " : "Finished recall: ") : "Finished: ") + speed + " words per minute, " + acc + "% accuracy, " + clock(seconds()) + ", " +
      errors + (errors === 1 ? " mistake." : " mistakes.") +
      (assisted ? " This assisted run does not change your unaided recall best." :
        (previous ? (better ? " A new best; the last was " + previous.wpm + "." : " Your best is " + previous.wpm + ".") : " That is your first time on this one."));
    result.dataset.done = "true";
    panel.dataset.done = "true";
    starter.updateBest();
  }

  function flash(item: SequenceItem): void {
    item.el.dataset.bad = "true";
    window.setTimeout(function () { delete item.el.dataset.bad; }, 220);
  }

  function advance() {
    const item = seq[pos];
    if (!item) return;
    const newLine = item.nl;
    setState(pos, "ok");
    pos += 1;
    skipAuto();
    mark();
    if (pos >= seq.length) finish();
    else if (newLine) keepInView();
  }

  function keepInView() {
    if (!current) return;
    let box = current.getBoundingClientRect();
    if (box.top < 80 || box.bottom > window.innerHeight - 80) current.scrollIntoView({ block: "center" });
  }

  function typeChar(ch: string): void {
    if (finished || pos >= seq.length) return;
    begin();
    const item = seq[pos];
    if (!item) return;
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
    if (!finished && seq[pos] && seq[pos]?.ch === "\t") typeChar("\t");
  }

  function back() {
    if (finished) return;
    let p = pos - 1;
    while (p >= 0 && seq[p]?.auto) p -= 1;
    if (p < 0) return;
    for (let i = p; i < pos; i += 1) setState(i, "todo");
    pos = p;
    mark();
    paint();
  }

  function onKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.isComposing || event.keyCode === 229) return;
    let key = event.key;
    if (key === "Escape") { event.preventDefault(); close(); return; }
    if (key === "Backspace") { event.preventDefault(); back(); return; }
    if (key === "Enter") { event.preventDefault(); enter(); return; }
    if (key === "Tab") {
      if (!event.shiftKey && !finished && seq[pos] && seq[pos]?.ch === "\t") {
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
  function onInput(event: Event): void {
    const kind = event instanceof InputEvent ? event.inputType : "";
    const data = event instanceof InputEvent ? event.data : null;
    let value = input.value;
    if (kind.indexOf("delete") === 0 || value.length < SENTINEL.length) back();
    else if (kind === "insertLineBreak" || kind === "insertParagraph") enter();
    else {
      const typed = data ?? value.replace(SENTINEL, "");
      Array.from(typed).forEach(function (ch) {
        if (ch === "\n") enter();
        else typeChar(normalize(ch));
      });
    }
    input.value = SENTINEL;
    input.setSelectionRange(SENTINEL.length, SENTINEL.length);
  }

  function reset(rotate = false): void {
    // Retired targets must be restored before the next plan clears their tags.
    // Reset is an explicit whole-snippet action; ordinary keys keep the cached buffer.
    seq.forEach((item, index) => {
      const display = item.nl ? "↵" : item.ch;
      item.el.textContent = display;
      readableChars[index] = display;
      item.el.removeAttribute("data-recall-hidden");
    });
    if (recallMode) {
      if (rotate) rotation += 1;
      recallPlan = applyRecall(seq, source, fragments, focus, rotation);
      panel.dataset.speedtypeFocus = focus;
      panel.toggleAttribute('data-speedtype-budget-exception', recallPlan.exceedsPreferredBudget);
    }
    window.clearInterval(ticker);
    answersVisible = false; assisted = recallMode && recallPlan?.targets.length === 0;
    hint.textContent = assisted ? visibleHint : workedHint;
    if (recallMode && modeOut && clue && reveal) {
      modeOut.textContent = assisted ? "Visible code practice" : "Unaided recall";
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
    if (readableFrame) window.cancelAnimationFrame(readableFrame);
    panel.remove();
    block.hidden = false;
    starter.node.hidden = false;
    delete document.documentElement.dataset.typing;
    document.dispatchEvent(new Event("academy:typing-state"));
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
  again.addEventListener("click", () => reset(true));
  if (focusSelect) focusSelect.addEventListener('change', () => {
    focus = parseRecallFocus(focusSelect.value);
    rotation = 0;
    reset();
  });
  done.addEventListener("click", close);
  function onHide() { if (document.hidden && !finished && begun) input.blur(); }
  document.addEventListener("visibilitychange", onHide);

  document.documentElement.dataset.typing = "true";
  block.hidden = true;
  starter.node.hidden = true;
  block.parentNode?.insertBefore(panel, block.nextSibling);
  document.documentElement.dataset.typing = "true";
  active = { close: close };
  seq.forEach(function (item, index) { setState(index, "todo"); });
  skipAuto();
  mark();
  syncReadable(true);
  paint();
  input.focus({ preventScroll: true });
  panel.scrollIntoView({ block: "nearest" });
}

function enhance(root: HTMLElement): void {
  if (root.dataset.speedtypeReady) return;
  const block = root.querySelector<HTMLElement>(".expressive-code");
  if (!block || !block.querySelector(".ec-line .code")) return;
  root.dataset.speedtypeReady = "true";
  let id = root.dataset.speedtypeId || "snippet";
  let fragments = readRecall(root);
  let wrap = el("div", "kit-speedtype__bar");
  let start = button("⌨ Practise typing this", "kit-speedtype__start");
  let best = el("span", "kit-speedtype__best");
  let copyStart = fragments.length ? button("Copy visible code", "kit-speedtype__start") : null;
  let copyBest = fragments.length ? el("span", "kit-speedtype__best") : null;
  start.dataset.speedtypeStart = fragments.length ? "recall" : "copy";
  wrap.appendChild(start);
  wrap.appendChild(best);
  if (copyStart) {
    copyStart.dataset.speedtypeStart = "copy";
    wrap.appendChild(copyStart);
    if (copyBest) wrap.appendChild(copyBest);
    wrap.appendChild(el("span", "kit-speedtype__best", "Practice leaves most code visible with a few short blanks; hints are available."));
  }
  root.appendChild(wrap);
  let starter = {
    node: wrap,
    button: start,
    updateBest: function () {
      let saved = readBest(id + (fragments.length ? ":recall" : ""));
      best.textContent = saved ? (fragments.length ? "Recall best (unaided): " : "Your best: ") + saved.wpm + " wpm, " + saved.acc + "% accuracy" : "";
      if (copyBest) {
        let copied = readBest(id);
        copyBest.textContent = copied ? "Copy best: " + copied.wpm + " wpm, " + copied.acc + "% accuracy" : "";
      }
    },
  };
  starter.updateBest();
  start.addEventListener("click", function () { open(root, block, starter, fragments); });
  if (copyStart) copyStart.addEventListener("click", function () {
    open(root, block, { node: wrap, button: copyStart, updateBest: starter.updateBest });
  });
}

export function initSpeedType(): void {
  document.querySelectorAll<HTMLElement>("[data-speedtype]").forEach(enhance);
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initSpeedType);
  document.addEventListener('astro:before-swap', () => active?.close());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSpeedType, { once: true });
  else initSpeedType();
}
