(function () {
  "use strict";

  // How a name or an allocation is shown in the ownership tracer (the CSS class is `is-` plus the state).
  type MemoryState = "owns" | "empty" | "moved" | "borrowed" | "conflict";
  interface StackItem { name: string; value: string; state: MemoryState }
  interface HeapItem { id: string; value: string; owner: string }
  interface OwnershipStep { line: number; event: string; message: string; stack: StackItem[]; heap: HeapItem[]; loan: string }
  interface OwnershipExample { eyebrow: string; title: string; code: string[]; steps: OwnershipStep[] }

  // The helpers shared with puzzle-labs.js (window.AcademyLearning).
  type ElementFactory = <K extends keyof HTMLElementTagNameMap>(tagName: K, className?: string, text?: string) => HTMLElementTagNameMap[K];
  interface TextControl { label: HTMLLabelElement; input: HTMLInputElement }
  interface ResultCard { card: HTMLDivElement; value: HTMLElement }
  // What the two scripts this file loads publish.
  interface QuizModule { mountQuiz(root: HTMLElement): void }
  interface PuzzleApi { mount(root: HTMLElement, lab: string): void }

  // Classic scripts that are loaded by a <script> element know their own address.
  const loaderScript = document.currentScript;
  if (!(loaderScript instanceof HTMLScriptElement)) throw new Error("learning-widgets.js must be loaded by a script element");
  const initializedQuizRoots = new WeakSet<HTMLElement>();
  const quizModuleURL = new URL('lesson-quiz.mjs', loaderScript.src).href;
  const puzzleScriptURL = new URL('puzzle-labs.js', loaderScript.src).href;

  const OWNERSHIP_EXAMPLES: Record<string, OwnershipExample> = {
    "move-string": {
      eyebrow: "Move a String",
      title: "Watch ownership change hands",
      code: [
        'let s1 = String::from("gold");',
        "let s2 = s1;",
        'println!("{s2}");',
      ],
      steps: [
        {
          line: 0,
          event: "Allocate, then own",
          message:
            "String::from puts the text on the heap. The small String value named s1 remembers where that text lives, and s1 becomes its owner.",
          stack: [
            { name: "s1", value: "ptr → A · len 4", state: "owns" },
            { name: "s2", value: "not created yet", state: "empty" },
          ],
          heap: [{ id: "A", value: '"gold"', owner: "owned by s1" }],
          loan: "No borrow is active.",
        },
        {
          line: 1,
          event: "Move ownership",
          message:
            "The assignment copies the small pointer, length, and capacity into s2, then marks s1 as moved. Rust does not copy the heap text and will not let both names free it.",
          stack: [
            { name: "s1", value: "moved — cannot use", state: "moved" },
            { name: "s2", value: "ptr → A · len 4", state: "owns" },
          ],
          heap: [{ id: "A", value: '"gold"', owner: "owned by s2" }],
          loan: "Ownership changed; no borrow is active.",
        },
        {
          line: 2,
          event: "Borrow to print",
          message:
            "println! only needs to look at s2, so it borrows s2 for this statement. When the statement ends, the short borrow ends and s2 is still the owner.",
          stack: [
            { name: "s1", value: "moved — cannot use", state: "moved" },
            { name: "s2", value: "ptr → A · shared borrow", state: "borrowed" },
          ],
          heap: [{ id: "A", value: '"gold"', owner: "owned by s2" }],
          loan: "Temporary shared loan: println! → s2",
        },
      ],
    },
    "borrow-conflict": {
      eyebrow: "Borrow checker",
      title: "Why this mutation is rejected",
      code: [
        "let mut bytes = vec![10, 20, 30];",
        "let view = &bytes;",
        "bytes.push(40);",
        'println!("{}", view[0]);',
      ],
      steps: [
        {
          line: 0,
          event: "Create the vector",
          message:
            "bytes owns a growable heap allocation. push is allowed in principle because the binding is mut, but only when no conflicting borrow is being used.",
          stack: [
            { name: "bytes", value: "ptr → B · len 3 · cap 3", state: "owns" },
            { name: "view", value: "not created yet", state: "empty" },
          ],
          heap: [{ id: "B", value: "[10, 20, 30]", owner: "owned by bytes" }],
          loan: "No borrow is active.",
        },
        {
          line: 1,
          event: "Create a shared view",
          message:
            "&bytes creates a shared borrow. view may read the vector, while bytes remains the owner. Rust keeps this loan active until view's final use below.",
          stack: [
            { name: "bytes", value: "owner · shared loan active", state: "borrowed" },
            { name: "view", value: "&B · read-only", state: "borrowed" },
          ],
          heap: [{ id: "B", value: "[10, 20, 30]", owner: "owned by bytes" }],
          loan: "Shared loan: view → bytes",
        },
        {
          line: 2,
          event: "Conflicting access",
          message:
            "push needs exclusive mutable access and might move the allocation to make room. That could make view point at old memory, so Rust stops the program at compile time.",
          stack: [
            { name: "bytes", value: "needs exclusive access", state: "conflict" },
            { name: "view", value: "shared loan still needed", state: "borrowed" },
          ],
          heap: [{ id: "B", value: "[10, 20, 30]", owner: "unchanged" }],
          loan: "Conflict: mutable access while a shared loan is live.",
        },
        {
          line: 3,
          event: "The reason the loan stays live",
          message:
            "This line is view's last use. If it came before push, the shared loan could end first and the mutation would be safe. As written, compilation stops before the program runs.",
          stack: [
            { name: "bytes", value: "owner", state: "owns" },
            { name: "view", value: "would read B here", state: "borrowed" },
          ],
          heap: [{ id: "B", value: "[10, 20, 30]", owner: "owned by bytes" }],
          loan: "Move this read before push to avoid the overlap.",
        },
      ],
    },
  };

  // Fisher-Yates. Quiz order is deliberately random rather than seeded: a
  // learner who returns to a page, or retakes the quiz, should meet the same
  // ideas in a different arrangement instead of memorizing "the answer is C".
  function shuffleInPlace<T>(items: T[]): T[] {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      const held = items[index];
      const other = items[swap];
      if (held === undefined || other === undefined) continue;
      items[index] = other;
      items[swap] = held;
    }
    return items;
  }


  // Small syntax highlighter for lab code (Rust, Lua, Python-like, assembly).
  function academyGuessLang(text: string): string {
    if (/^\s*(?:[a-z_]\w*:\s*)?(mov|lea|push|pop|jmp|call|ret|cmp|add|sub|inc|dec|imul|idiv|test|nop|int3|movzx|movsx|shl|shr|sar|and|or|xor|not|movss|addss|mulss|cvtsi2ss|cvttss2si|comiss)\b(?:\s|$)/im.test(text)) return "asm";
    if (/\b(local|function|then|elseif)\b/.test(text) && !/\bfn\b|\blet\b/.test(text)) return "lua";
    if (/^\s*(def |for .* in .*:|#)/m.test(text) && !/[{};]/.test(text)) return "py";
    return "rust";
  }
  function academyHighlight(text: string, lang: string): string {
    var KW = " fn let mut if else match return use struct enum impl for while in loop const pub as break continue local function end then elseif do not and or def import from mov lea push pop jmp call ret cmp add sub inc dec imul idiv test nop int3 movzx movsx shl shr sar xor movss addss mulss cvtsi2ss cvttss2si comiss ";
    var LIT = " true false nil None Some Ok Err self null True False ";
    var comment = lang === "lua" ? "--" : lang === "py" ? "#" : lang === "asm" ? ";" : "//";
    var esc = function (s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
    var span = function (k: string, s: string) { return '<span class="hl-' + k + '">' + esc(s) + "</span>"; };
    var out = "", i = 0, m: RegExpExecArray | null;
    while (i < text.length) {
      var rest = text.slice(i);
      if (rest.indexOf(comment) === 0) { out += span("c", rest); break; }
      if ((m = /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/.exec(rest))) { out += span("s", m[0]); i += m[0].length; continue; }
      if (!/\w/.test(text.charAt(i - 1)) && (m = /^0x[0-9a-fA-F_]+|^\d[\d_.]*/.exec(rest))) { out += span("n", m[0]); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_]\w*/.exec(rest))) {
        var w = m[0], after = rest.charAt(w.length);
        var kind = KW.indexOf(" " + (lang === "asm" ? w.toLowerCase() : w) + " ") >= 0 ? "k" : LIT.indexOf(" " + w + " ") >= 0 ? "l" : after === "(" ? "f" : /^[A-Z]/.test(w) ? "t" : "";
        out += kind ? span(kind, w) : esc(w); i += w.length; continue;
      }
      out += esc(text.charAt(i)); i++;
    }
    return out;
  }

  function element<K extends keyof HTMLElementTagNameMap>(tagName: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function isHeapItem(item: StackItem | HeapItem): item is HeapItem {
    return "id" in item;
  }

  function makeMemoryItem(item: StackItem | HeapItem): HTMLElement {
    const card = element("div", `ownership-scope__memory-item is-${isHeapItem(item) ? "owns" : item.state}`);
    const label = element("span", "ownership-scope__memory-name", isHeapItem(item) ? `heap ${item.id}` : item.name);
    const value = element("strong", "ownership-scope__memory-value", item.value);
    card.append(label, value);

    if (isHeapItem(item)) {
      card.append(element("small", "ownership-scope__memory-owner", item.owner));
    }
    return card;
  }

  function initializeOwnershipScope(root: HTMLElement): void {
    if (root.dataset.learningReady === "true") return;

    const exampleName = root.dataset.ownershipExample;
    const found = exampleName === undefined ? undefined : OWNERSHIP_EXAMPLES[exampleName];
    if (!found) return;
    const example: OwnershipExample = found;

    root.dataset.learningReady = "true";
    root.replaceChildren();

    const header = element("div", "ownership-scope__header");
    header.setAttribute("role", "group");
    header.setAttribute("aria-label", "Ownership visualizer heading");
    const headerCopy = element("div", "ownership-scope__header-copy");
    headerCopy.append(
      element("span", "ownership-scope__eyebrow", example.eyebrow),
      element("h3", "", example.title)
    );
    const stepPill = element("span", "ownership-scope__step-pill");
    header.append(headerCopy, stepPill);

    const stage = element("div", "ownership-scope__stage");
    const codePanel = element("div", "ownership-scope__code-panel");
    codePanel.append(element("span", "ownership-scope__panel-label", "Rust source"));
    const codeLines = element("div", "ownership-scope__code-lines");
    const lineButtons = example.code.map((line, index) => {
      const button = element("button", "ownership-scope__code-line");
      button.type = "button";
      button.dataset.ownershipStep = String(index);
      // The native name includes the exact visible line number and code.
      const number = element("span", "ownership-scope__line-number", String(index + 1).padStart(2, "0"));
      button.append(
        number,
        element("code", "", line)
      );
      codeLines.append(button);
      return button;
    });
    codePanel.append(codeLines);

    const memoryPanel = element("div", "ownership-scope__memory-panel");
    const memoryHeading = element("span", "ownership-scope__panel-label", "What Rust tracks");
    const memoryGrid = element("div", "ownership-scope__memory-grid");
    const stackColumn = element("div", "ownership-scope__memory-column");
    const heapColumn = element("div", "ownership-scope__memory-column");
    stackColumn.append(element("h4", "", "Names and values"));
    heapColumn.append(element("h4", "", "Heap allocation"));
    const stackItems = element("div", "ownership-scope__memory-items");
    const heapItems = element("div", "ownership-scope__memory-items");
    stackColumn.append(stackItems);
    heapColumn.append(heapItems);
    memoryGrid.append(stackColumn, heapColumn);
    memoryPanel.append(memoryHeading, memoryGrid);

    stage.append(codePanel, memoryPanel);

    const explanation = element("div", "ownership-scope__explanation");
    const eventName = element("strong", "ownership-scope__event");
    const message = element("p", "ownership-scope__message");
    const loan = element("p", "ownership-scope__loan");
    explanation.append(eventName, message, loan);

    const controls = element("div", "ownership-scope__controls");
    const previous = element("button", "ownership-scope__control", "← Previous");
    previous.type = "button";
    const hint = element("span", "ownership-scope__hint", "Select a source line or use the buttons.");
    const next = element("button", "ownership-scope__control ownership-scope__control--next", "Next →");
    next.type = "button";
    controls.append(previous, hint, next);

    root.append(header, stage, explanation, controls);

    let activeStep = 0;
    function render(stepIndex: number) {
      activeStep = Math.max(0, Math.min(example.steps.length - 1, stepIndex));
      const step = example.steps[activeStep];
      if (!step) return;

      stepPill.textContent = `Step ${activeStep + 1} of ${example.steps.length}`;
      eventName.textContent = step.event;
      message.textContent = step.message;
      loan.textContent = step.loan;
      stackItems.replaceChildren(...step.stack.map((item) => makeMemoryItem(item)));
      heapItems.replaceChildren(...step.heap.map((item) => makeMemoryItem(item)));

      lineButtons.forEach((button, index) => {
        const isActive = index === step.line;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-current", isActive ? "step" : "false");
      });

      previous.disabled = activeStep === 0;
      next.disabled = activeStep === example.steps.length - 1;
    }

    lineButtons.forEach((button) => {
      button.addEventListener("click", () => render(Number(button.dataset.ownershipStep)));
    });
    previous.addEventListener("click", () => render(activeStep - 1));
    next.addEventListener("click", () => render(activeStep + 1));
    render(0);
  }

  function isQuizModule(value: unknown): value is QuizModule {
    return typeof value === "object" && value !== null && "mountQuiz" in value && typeof value.mountQuiz === "function";
  }

  function initializeQuiz(root: HTMLElement): void {
    if (initializedQuizRoots.has(root)) return;
    initializedQuizRoots.add(root);
    import(quizModuleURL).then((loaded: unknown) => {
      if (!isQuizModule(loaded)) throw new TypeError("lesson-quiz.mjs does not export mountQuiz");
      return loaded.mountQuiz(root);
    }).catch(() => {
      const feedback = root.querySelector<HTMLElement>('[data-quiz-feedback]');
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'The quiz could not load. Reload this page to try again.';
      }
    });
  }

  function makeLabHeader(eyebrow: string, title: string, description: string): HTMLElement {
    const header = element("div", "concept-lab__header");
    header.setAttribute("role", "group");
    header.setAttribute("aria-label", "Interactive lab heading");
    const copy = element("div", "concept-lab__header-copy");
    copy.append(
      element("span", "concept-lab__eyebrow", eyebrow),
      element("h3", "", title),
      element("p", "concept-lab__description", description)
    );
    header.append(copy, element("span", "concept-lab__live-badge", "Live lab"));
    return header;
  }

  function makeTextControl(id: string, labelText: string, value: string): TextControl {
    const label = element("label", "concept-lab__field");
    label.htmlFor = id;
    label.append(element("span", "concept-lab__field-label", labelText));
    const input = element("input", "concept-lab__text-input");
    input.id = id;
    input.type = "text";
    input.value = value;
    input.autocomplete = "off";
    input.spellcheck = false;
    label.append(input);
    return { label, input };
  }

  function makeResult(labelText: string, valueText: string, noteText?: string): ResultCard {
    const card = element("div", "concept-lab__result-card");
    const value = element("strong", "concept-lab__result-value", valueText);
    card.append(element("span", "concept-lab__result-label", labelText), value);
    if (noteText) card.append(element("small", "concept-lab__result-note", noteText));
    return { card, value };
  }

  function addTypeBadge(card: HTMLElement, text: string, kind = "int"): HTMLElement {
    const badge = element("span", "concept-lab__type-badge", text);
    badge.dataset.kind = kind;
    card.prepend(badge);
    return badge;
  }

  function parseFourBytes(raw: string | null | undefined): number[] | null {
    const cleaned = String(raw || "").trim().replace(/0x/gi, "");
    let parts = cleaned.split(/[\s,;:-]+/).filter(Boolean);
    const single = parts[0];
    if (parts.length === 1 && single !== undefined && /^[0-9a-f]{8}$/i.test(single)) {
      parts = single.match(/.{2}/g) || [];
    }
    if (parts.length !== 4 || parts.some((part) => !/^[0-9a-f]{2}$/i.test(part))) {
      return null;
    }
    return parts.map((part) => Number.parseInt(part, 16));
  }

  function readableFloat32(value: number): string {
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "+Infinity";
    if (value === -Infinity) return "-Infinity";
    if (Object.is(value, -0)) return "-0";
    if (value === 0) return "0";
    const magnitude = Math.abs(value);
    if (magnitude >= 10000000 || magnitude < 0.0001) return value.toExponential(5);
    return Number(value.toPrecision(7)).toString();
  }

  function initializeByteLens(root: HTMLElement): void {
    const labId = String(root.dataset.conceptId || "byte-lens").replace(/[^a-z0-9_-]/gi, "-");
    root.replaceChildren();
    root.append(
      makeLabHeader(
        "Byte interpreter",
        "The same four bytes can represent different values",
        "Change the bytes, then compare what happens when the computer reads the exact same bits as different data types."
      )
    );

    const body = element("div", "concept-lab__body");
    // The four byte boxes ARE the input: type two hex digits in each and focus jumps to the next. The old raw text field is kept only as
    // hidden state so the rest of the lab (and any saved value) still reads one string.
    const byteControl = makeTextControl(`${labId}-bytes`, "Four hexadecimal bytes", "64 00 00 00");
    byteControl.label.hidden = true;
    const controls = element("div", "concept-lab__control-row");
    const byteStrip = element("div", "concept-lab__byte-strip");
    byteStrip.setAttribute("role", "group");
    byteStrip.setAttribute("aria-label", "Four bytes, lowest address first. Type two hex digits in each box.");
    const cells = [0, 1, 2, 3].map((index) => {
      const cell = element("label", "concept-lab__byte");
      const input = element("input", "concept-lab__byte-input");
      input.type = "text";
      input.maxLength = 2;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("aria-label", `Byte +${index}, two hex digits`);
      cell.append(element("small", "", `+${index}`), input);
      return { cell, input };
    });
    byteStrip.append(...cells.map((entry) => entry.cell));

    const examples = element("div", "concept-lab__examples");
    examples.append(element("span", "concept-lab__example-label", "Presets:"));
    const chips = ([
      ["100", "64 00 00 00"],
      ["−1", "FF FF FF FF"],
      ["1.0", "00 00 80 3F"],
    ] as const).map(([label, bytes]) => {
      const button = element("button", "concept-lab__example", label);
      button.type = "button";
      button.dataset.bytes = bytes;
      button.setAttribute("aria-pressed", "false");
      examples.append(button);
      return button;
    });
    controls.append(byteStrip, examples);

    const help = element("p", "concept-lab__help", "Two hex digits per byte. The first byte (+0) is stored at the lowest address.");
    help.id = `${labId}-byte-help`;
    const error = element("p", "concept-lab__error");
    error.id = `${labId}-byte-error`;
    error.setAttribute("role", "alert");
    error.hidden = true;

    const results = element("div", "concept-lab__results concept-lab__results--four");
    const unsigned = makeResult("Unsigned 32-bit", "", "Little-endian u32");
    const signed = makeResult("Signed 32-bit", "", "Little-endian i32");
    const floating = makeResult("32-bit decimal", "", "IEEE-754 f32");
    const bigEndian = makeResult("Unsigned, reversed order", "", "Big-endian u32");
    // A small type badge on each card tells the families apart; the big-endian card also shows the byte order it reads.
    ([[unsigned, "INT", "int"], [signed, "INT", "int"], [floating, "FLOAT", "float"], [bigEndian, "ENDIAN", "endian"]] as const).forEach(([result, text, kind]) => {
      const badge = element("span", "concept-lab__type-badge", text);
      badge.dataset.kind = kind;
      result.card.prepend(badge);
    });
    bigEndian.card.append(element("span", "concept-lab__order", "⇄ reads +3 +2 +1 +0"));
    results.append(unsigned.card, signed.card, floating.card, bigEndian.card);

    const takeaway = element(
      "p",
      "concept-lab__takeaway",
      "Memory stores bytes, not labels. A type tells the program how to interpret those bytes."
    );
    takeaway.dataset.kind = "insight";
    body.append(controls, help, error, results, takeaway);
    root.append(body);

    const readCells = () => cells.map((entry) => entry.input.value.padStart(2, "0").toUpperCase());
    const setCells = (parts: string[]) => parts.forEach((part, index) => { const cell = cells[index]; if (cell) cell.input.value = part; });
    function sync() {
      byteControl.input.value = readCells().join(" ");
      render();
    }
    setCells(byteControl.input.value.split(" "));
    cells.forEach(({ input }, index) => {
      input.addEventListener("focus", () => input.select());
      input.addEventListener("click", () => input.select());
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^0-9a-f]/gi, "").toUpperCase().slice(0, 2);
        if (input.value.length === 2 && index < 3) { cells[index + 1]?.input.focus(); }
        sync();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && index > 0) { event.preventDefault(); cells[index - 1]?.input.focus(); }
        if (event.key === "ArrowLeft" && input.selectionStart === 0 && index > 0) { event.preventDefault(); cells[index - 1]?.input.focus(); }
        if (event.key === "ArrowRight" && input.selectionStart === input.value.length && index < 3) { event.preventDefault(); cells[index + 1]?.input.focus(); }
      });
      input.addEventListener("paste", (event) => {
        const parsed = parseFourBytes(event.clipboardData ? event.clipboardData.getData("text") : "");
        if (!parsed) return;
        event.preventDefault();
        setCells(parsed.map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")));
        sync();
      });
    });

    function render() {
      const bytes = parseFourBytes(byteControl.input.value);
      if (!bytes) {
        error.textContent = "Each box needs two hex digits, such as 64.";
        error.hidden = false;
        results.hidden = true;
        return;
      }
      error.hidden = true;
      results.hidden = false;
      const array = Uint8Array.from(bytes);
      const view = new DataView(array.buffer);
      unsigned.value.textContent = view.getUint32(0, true).toLocaleString("en-US");
      const signedValue = view.getInt32(0, true);
      signed.value.textContent = signedValue.toLocaleString("en-US");
      signed.value.dataset.negative = String(signedValue < 0);
      floating.value.textContent = readableFloat32(view.getFloat32(0, true));
      bigEndian.value.textContent = view.getUint32(0, false).toLocaleString("en-US");
      const joined = readCells().join(" ");
      chips.forEach((chip) => {
        const active = chip.dataset.bytes === joined;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", String(active));
      });
    }

    chips.forEach((button) => {
      button.addEventListener("click", () => {
        setCells((button.dataset.bytes ?? "").split(" "));
        sync();
        cells[0]?.input.focus();
      });
    });
    render();
  }

  function parseAddressNumber(raw: string | null | undefined): bigint | null {
    const value = String(raw || "").trim().replace(/_/g, "");
    if (!/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value)) return null;
    try {
      return BigInt(value);
    } catch (_error) {
      return null;
    }
  }

  function formatAddress(value: bigint): string {
    return `0x${value.toString(16).toUpperCase()}`;
  }

  function initializeAddressBuilder(root: HTMLElement): void {
    const labId = String(root.dataset.conceptId || "address-builder").replace(/[^a-z0-9_-]/gi, "-");
    const maxAddress = (1n << 64n) - 1n;
    root.replaceChildren();
    root.append(
      makeLabHeader(
        "Address math",
        "Build a live address",
        "A module can move each time Windows loads it. Add a stable relative offset to today's module base to find the live address."
      )
    );

    const body = element("div", "concept-lab__body");
    const base = makeTextControl(`${labId}-base`, "Module base today", "0x7FF600000000");
    const offset = makeTextControl(`${labId}-offset`, "Relative virtual address (RVA)", "0x1200");
    const error = element("p", "concept-lab__error");
    error.setAttribute("role", "alert");
    error.hidden = true;

    const equation = element("div", "concept-lab__address-equation");
    const baseBlock = makeResult("Base", "", "changes between runs");
    const plus = element("span", "concept-lab__operator", "+");
    const offsetBlock = makeResult("RVA", "", "stable inside this build");
    const equals = element("span", "concept-lab__operator", "=");
    const liveBlock = makeResult("Live address", "", "use for this run");
    baseBlock.value.replaceWith(base.label);
    offsetBlock.value.replaceWith(offset.label);
    addTypeBadge(baseBlock.card, "BASE");
    addTypeBadge(offsetBlock.card, "OFFSET");
    addTypeBadge(liveBlock.card, "ADDRESS", "endian");
    liveBlock.card.classList.add("concept-lab__result-card--accent");
    equation.append(baseBlock.card, plus, offsetBlock.card, equals, liveBlock.card);
    const examples = element("div", "concept-lab__examples");
    examples.append(element("span", "concept-lab__example-label", "Try:"));
    const presets = ([
      ["First launch", "0x7FF600000000", "0x1200"],
      ["New launch, same RVA", "0x7FF700000000", "0x1200"],
      ["64-bit limit", "0xFFFFFFFFFFFFFFFF", "1"],
    ] as const).map(([label, baseValue, offsetValue]) => {
      const button = element("button", "concept-lab__example", label);
      button.type = "button";
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        base.input.value = baseValue;
        offset.input.value = offsetValue;
        render();
      });
      examples.append(button);
      return { button, baseValue, offsetValue };
    });
    const takeaway = element(
      "p",
      "concept-lab__takeaway",
      "The RVA stays the same for this build. Re-read the module base after every launch, then rebuild the live address."
    );
    takeaway.dataset.kind = "insight";
    body.append(equation, examples, error, takeaway);
    root.append(body);

    function render() {
      const baseValue = parseAddressNumber(base.input.value);
      const offsetValue = parseAddressNumber(offset.input.value);
      presets.forEach((preset) => {
        const active = baseValue === parseAddressNumber(preset.baseValue) && offsetValue === parseAddressNumber(preset.offsetValue);
        preset.button.classList.toggle("is-active", active);
        preset.button.setAttribute("aria-pressed", String(active));
      });
      if (baseValue === null || offsetValue === null) {
        error.textContent = "Use a decimal number or a hexadecimal number beginning with 0x.";
        error.hidden = false;
        liveBlock.value.textContent = "Waiting for a number";
        return;
      }
      const liveValue = baseValue + offsetValue;
      if (baseValue > maxAddress || offsetValue > maxAddress || liveValue > maxAddress) {
        error.textContent = "That result does not fit in a 64-bit Windows address.";
        error.hidden = false;
        liveBlock.value.textContent = "Does not fit";
        return;
      }
      error.hidden = true;
      liveBlock.value.textContent = formatAddress(liveValue);
    }

    base.input.addEventListener("input", render);
    offset.input.addEventListener("input", render);
    render();
  }

  function normalizeAngle(delta: number): number {
    return ((delta + 540) % 360) - 180;
  }

  function makeRangeControl(id: string, labelText: string, value: number) {
    const wrapper = element("label", "concept-lab__range");
    wrapper.htmlFor = id;
    const heading = element("span", "concept-lab__range-heading");
    const output = element("strong", "concept-lab__range-value");
    heading.append(element("span", "", labelText), output);
    const input = element("input", "");
    input.id = id;
    input.type = "range";
    input.min = "-180";
    input.max = "180";
    input.step = "1";
    input.value = String(value);
    wrapper.append(heading, input);
    return { wrapper, input, output };
  }

  function initializeAngleLab(root: HTMLElement): void {
    const labId = String(root.dataset.conceptId || "angle-lab").replace(/[^a-z0-9_-]/gi, "-");
    root.replaceChildren();
    root.append(
      makeLabHeader(
        "Angle lab",
        "Find the shortest turn",
        "Move both headings. The direct subtraction can suggest a long spin, while normalization finds the same direction with the smallest turn."
      )
    );

    const body = element("div", "concept-lab__body concept-lab__angle-layout");
    const controls = element("div", "concept-lab__range-controls");
    const current = makeRangeControl(`${labId}-current`, "Current heading", 179);
    const desired = makeRangeControl(`${labId}-desired`, "Desired heading", -179);
    controls.append(current.wrapper, desired.wrapper);

    const visual = element("div", "concept-lab__angle-visual");
    const dial = element("div", "concept-lab__dial");
    dial.setAttribute("aria-hidden", "true");
    const north = element("span", "concept-lab__dial-north", "0°");
    const currentArm = element("span", "concept-lab__dial-arm concept-lab__dial-arm--current");
    const desiredArm = element("span", "concept-lab__dial-arm concept-lab__dial-arm--desired");
    const center = element("span", "concept-lab__dial-center");
    dial.append(north, currentArm, desiredArm, center);

    const results = element("div", "concept-lab__angle-results");
    const direct = makeResult("Direct subtraction", "", "desired − current");
    const shortest = makeResult("Shortest turn", "", "normalized to −180°…180°");
    addTypeBadge(direct.card, "DEGREES", "float");
    addTypeBadge(shortest.card, "DEGREES", "float");
    shortest.card.classList.add("concept-lab__result-card--accent");
    results.append(direct.card, shortest.card);
    visual.append(dial, results);
    const takeaway = element("p", "concept-lab__takeaway concept-lab__angle-takeaway");
    takeaway.dataset.kind = "insight";
    takeaway.setAttribute("aria-live", "polite");
    body.append(controls, visual, takeaway);
    root.append(body);

    function render() {
      const currentValue = Number(current.input.value);
      const desiredValue = Number(desired.input.value);
      const directDelta = desiredValue - currentValue;
      const shortestDelta = normalizeAngle(directDelta);
      current.output.textContent = `${currentValue}°`;
      desired.output.textContent = `${desiredValue}°`;
      direct.value.textContent = `${directDelta > 0 ? "+" : ""}${directDelta}°`;
      shortest.value.textContent = `${shortestDelta > 0 ? "+" : ""}${shortestDelta}°`;
      currentArm.style.transform = `rotate(${currentValue}deg)`;
      desiredArm.style.transform = `rotate(${desiredValue}deg)`;
      if (shortestDelta === 0) {
        takeaway.textContent = "Already aligned: no turn is needed.";
      } else {
        const direction = shortestDelta > 0 ? "clockwise" : "counter-clockwise";
        takeaway.textContent = `Turn ${Math.abs(shortestDelta)}° ${direction}. The sign tells your code which way to rotate.`;
      }
    }

    current.input.addEventListener("input", render);
    desired.input.addEventListener("input", render);
    render();
  }

  // One operation of the worked pointer-chain capture: `source` is the slot being addressed, `read` the slot being copied.
  interface PointerStep { code: string; address: string; source?: number; read?: number; operation: string }

  function initializePointerWalk(root: HTMLElement): void {
    root.replaceChildren();
    root.setAttribute("data-reader-skip", "");
    root.append(
      makeLabHeader(
        "Pointer walk",
        "Calculate an address, then copy what it holds",
        "Step through the capture above. Adding an offset moves the read location; reading copies a value while memory stays in place."
      )
    );
    // These addresses and the gold value are the worked capture in Lesson 2.7.
    const steps: PointerStep[] = [
      { code: "address = module_base;", address: "0x14000000", operation: "Start at the module base. No memory has been read." },
      { code: "address += root_offset;", address: "0x15A2B3C0", source: 0, operation: "Add 0x01A2B3C0 to 0x14000000. The result selects the root slot; it is still an address." },
      { code: "address = read_pointer(address);", address: "0x04531180", read: 0, operation: "Copy the pointer from the root slot into address. The root slot keeps its value." },
      { code: "address += 0x18;", address: "0x04531198", source: 1, operation: "Add 0x18 to the manager pointer. The new address selects its player-pointer field." },
      { code: "address = read_pointer(address);", address: "0x0691A200", read: 1, operation: "Copy the player pointer from that field. The field itself does not move." },
      { code: "address += 0x30;", address: "0x0691A230", source: 2, operation: "Add 0x30 to the player pointer. This selects gold; there is no further pointer to follow." },
      { code: "gold = read_u32(address);", address: "0x0691A230", read: 2, operation: "Copy four bytes into gold. Their value is 250. Keep the field address separate from that ordinary game value." }
    ];
    const body = element("div", "concept-lab__body");
    const code = element("ol", "pointer-tracer__code");
    const codeLines = steps.map((step) => {
      const item = element("li", "");
      var codeEl = element("code", "", ""); codeEl.innerHTML = academyHighlight(step.code, "rust"); item.append(codeEl);
      code.append(item);
      return item;
    });
    const ns = "http://www.w3.org/2000/svg";
    const svgNode = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, text?: string): SVGElementTagNameMap[K] => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const picture = svgNode("svg", { viewBox: "0 0 500 192", class: "pointer-tracer__picture", "aria-hidden": "true" });
    const viewport = element("div", "pointer-tracer__viewport");
    viewport.append(picture);
    picture.append(svgNode("text", { x: 8, y: 16 }, "Captured memory"));
    const sources: Array<[string, string, string]> = [
      ["0x15A2B3C0", "0x04531180", "Root pointer"],
      ["0x04531198", "0x0691A200", "Player pointer"],
      ["0x0691A230", "250", "Gold, four bytes"]
    ];
    const sourceBoxes = sources.map(([address, value, label], index) => {
      const y = 26 + index * 48;
      const box = svgNode("rect", { x: 8, y, width: 175, height: 39, rx: 3, class: "pointer-tracer__memory" });
      picture.append(box,
        svgNode("text", { x: 16, y: y + 15, class: "pointer-tracer__small" }, address),
        svgNode("text", { x: 16, y: y + 31, class: "pointer-tracer__mono" }, value));
      return box;
    });
    const route = svgNode("path", { d: "", class: "pointer-tracer__route" });
    const chip = svgNode("g", { class: "pointer-tracer__copy", opacity: 0 });
    chip.append(svgNode("rect", { x: 0, y: 0, width: 104, height: 28, rx: 3 }));
    const copied = svgNode("text", { x: 52, y: 18, "text-anchor": "middle", class: "pointer-tracer__mono" }, "");
    chip.append(copied);
    picture.append(route, chip,
      svgNode("text", { x: 335, y: 16 }, "Local values"),
      svgNode("rect", { x: 335, y: 26, width: 155, height: 46, rx: 3, class: "pointer-tracer__register" }),
      svgNode("text", { x: 343, y: 42, class: "pointer-tracer__small" }, "address"));
    const addressValue = svgNode("text", { x: 343, y: 61, class: "pointer-tracer__mono" }, "");
    const goldValue = svgNode("text", { x: 343, y: 107, class: "pointer-tracer__mono" }, "gold: not read");
    picture.append(addressValue, goldValue);
    const explanationText = element("p", "pointer-tracer__explanation");
    explanationText.classList.add("concept-lab__takeaway");
    explanationText.dataset.kind = "insight";
    explanationText.setAttribute("role", "status");
    const controls = element("div", "concept-lab__step-controls");
    const previous = element("button", "concept-lab__example", "Previous");
    previous.type = "button";
    const next = element("button", "concept-lab__example", "Next operation");
    next.type = "button";
    const reset = element("button", "concept-lab__example", "Reset");
    reset.type = "button";
    const position = element("small", "");
    controls.append(previous, next, reset, position);
    body.append(code, viewport, explanationText, controls);
    root.append(body);
    let activeStep = 0;
    let animationTimer: number | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionAllowed = () => document.documentElement.dataset.academyMotion !== "off" && !reduced.matches;
    const stopCopyMotion = () => {
      if (!motionAllowed()) { clearTimeout(animationTimer); chip.style.transition = "none"; }
    };
    document.addEventListener("academy:reader-preference", stopCopyMotion);
    reduced.addEventListener("change", stopCopyMotion);
    function render(step: number) {
      clearTimeout(animationTimer);
      activeStep = Math.max(0, Math.min(steps.length - 1, step));
      const current = steps[activeStep];
      if (!current) return;
      codeLines.forEach((item, index) => {
        item.classList.toggle("is-active", index === activeStep);
        item.setAttribute("aria-current", index === activeStep ? "step" : "false");
      });
      const source = current.read ?? current.source;
      sourceBoxes.forEach((box, index) => box.classList.toggle("is-selected", index === source));
      addressValue.textContent = current.address;
      goldValue.textContent = activeStep === 6 ? "gold: 250" : "gold: not read";
      explanationText.textContent = current.operation;
      position.textContent = `${activeStep + 1} / ${steps.length}`;
      chip.setAttribute("opacity", "0");
      route.setAttribute("d", "");
      if (current.read !== undefined) {
        const sourceY = 26 + current.read * 48;
        const targetY = current.read === 2 ? 100 : 54;
        route.setAttribute("d", `M183 ${sourceY + 20} H270 V${targetY} H335`);
        copied.textContent = sources[current.read]?.[1] ?? "";
        chip.style.transition = "none";
        chip.style.transform = `translate(191px, ${sourceY + 6}px)`;
        chip.setAttribute("opacity", "1");
        if (motionAllowed()) {
          animationTimer = setTimeout(() => {
            chip.style.transition = "transform 550ms ease";
            chip.style.transform = `translate(223px, ${targetY - 14}px)`;
          }, 20);
        }
      }
      previous.disabled = activeStep === 0;
      next.disabled = activeStep === steps.length - 1;
    }
    previous.addEventListener("click", () => render(activeStep - 1));
    next.addEventListener("click", () => render(activeStep + 1));
    reset.addEventListener("click", () => render(0));
    window.addEventListener("pagehide", () => clearTimeout(animationTimer), { once: true });
    render(0);
  }

  interface ScanStage { label: string; wanted: number; values: number[]; keep: number[]; note: string }

  function initializeScanFilter(root: HTMLElement): void {
    root.replaceChildren();
    root.append(
      makeLabHeader(
        "Scan simulator",
        "Watch candidates disappear",
        "Each in-game change is followed by a scan that filters the addresses that survived the previous one. Click through three scans."
      )
    );
    const stages: ScanStage[] = [
      { label: "First scan: 100", wanted: 100, values: [100, 100, 100, 100, 100, 100, 100, 100], keep: [0, 1, 2, 3, 4, 5, 6, 7], note: "The first value is common, so all eight addresses are only possibilities." },
      { label: "Next scan: 75", wanted: 75, values: [100, 75, 75, 100, 75, 100, 100, 100], keep: [1, 2, 4], note: "Only addresses B, C, and E changed to the new observed value." },
      { label: "Next scan: 80", wanted: 80, values: [100, 75, 80, 100, 75, 100, 100, 100], keep: [2], note: "Address C is the only old candidate that followed both controlled changes." }
    ];
    const body = element("div", "concept-lab__body");
    const stageButtons = element("div", "concept-lab__scan-stages");
    const memory = element("div", "concept-lab__scan-memory");
    const status = element("p", "concept-lab__takeaway");
    const count = element("strong", "concept-lab__candidate-count");
    status.dataset.kind = "insight";
    stages.forEach((stage, index) => {
      const button = element("button", "concept-lab__example", stage.label);
      button.type = "button";
      button.dataset.scanStage = String(index);
      stageButtons.append(button);
    });
    body.append(stageButtons, count, memory, status);
    root.append(body);

    function render(stageIndex: number) {
      const stage = stages[stageIndex];
      if (!stage) return;
      stageButtons.querySelectorAll("button").forEach((button, index) => {
        const active = index === stageIndex;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      memory.replaceChildren(
        ...stage.values.map((value, index) => {
          const kept = stage.keep.includes(index);
          const card = element("div", `concept-lab__scan-cell ${kept ? "is-kept" : "is-rejected"}`);
          card.append(
            element("span", "", `Address ${String.fromCharCode(65 + index)}`),
            element("strong", "", String(value)),
            element("small", "", kept ? "candidate" : "rejected")
          );
          return card;
        })
      );
      count.textContent = `${stage.keep.length} candidate${stage.keep.length === 1 ? "" : "s"} remain for value ${stage.wanted}.`;
      status.textContent = stage.note;
    }
    stageButtons.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => render(Number(button.dataset.scanStage)));
    });
    render(0);
  }

  function parseByteSequence(raw: string | null | undefined): number[] | null {
    const cleaned = String(raw || "").trim().replace(/0x/gi, "");
    const parts = cleaned.split(/[\s,;:-]+/).filter(Boolean);
    if (!parts.length || parts.some((part) => !/^[0-9a-f]{2}$/i.test(part))) return null;
    return parts.map((part) => Number.parseInt(part, 16));
  }

  function initializePacketFramer(root: HTMLElement): void {
    const labId = String(root.dataset.conceptId || "packet-framer").replace(/[^a-z0-9_-]/gi, "-");
    root.replaceChildren();
    root.append(
      makeLabHeader(
        "Packet framer",
        "Parse a bounded length-prefixed message",
        "The first four bytes advertise a big-endian payload length. Try a valid frame and two broken frames."
      )
    );
    const body = element("div", "concept-lab__body");
    const control = makeTextControl(`${labId}-bytes`, "Frame bytes in hexadecimal", "00 00 00 05 48 65 6C 6C 6F");
    const header = element("fieldset", "concept-lab__packet-header");
    header.append(element("legend", "", "Length header · big-endian u32"));
    const byteStrip = element("div", "concept-lab__byte-strip");
    const cells = [0, 1, 2, 3].map((index) => {
      const cell = element("label", "concept-lab__byte");
      const input = element("input", "concept-lab__byte-input");
      input.type = "text";
      input.maxLength = 2;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("aria-label", `Length byte +${index}, two hex digits`);
      cell.append(element("small", "", `+${index}`), input);
      byteStrip.append(cell);
      return input;
    });
    header.append(byteStrip, element("p", "concept-lab__help", "The leftmost byte carries the most weight. Change 05 to 06 to ask for one more payload byte."));
    const payloadControl = makeTextControl(`${labId}-payload`, "Payload bytes in hexadecimal", "48 65 6C 6C 6F");
    const examples = element("div", "concept-lab__examples");
    examples.append(element("span", "concept-lab__example-label", "Try a frame:"));
    ([
      ["Valid “Hello”", "00 00 00 05 48 65 6C 6C 6F"],
      ["Truncated", "00 00 00 05 48 69"],
      ["Too large", "00 00 10 00 41"],
    ] as const).forEach(([label, bytes]) => {
      const button = element("button", "concept-lab__example", label);
      button.type = "button";
      button.dataset.frameBytes = bytes;
      button.setAttribute("aria-pressed", "false");
      examples.append(button);
    });
    const controlRow = element("div", "concept-lab__control-row");
    controlRow.append(header, payloadControl.label, examples);
    const results = element("div", "concept-lab__results");
    const length = makeResult("Advertised length", "", "Maximum allowed: 1024 bytes");
    const available = makeResult("Bytes available", "", "After the four-byte header");
    const payload = makeResult("Decoded payload", "", "Printable ASCII preview");
    addTypeBadge(length.card, "BE U32", "endian");
    addTypeBadge(available.card, "BYTES");
    addTypeBadge(payload.card, "ASCII", "float");
    results.append(length.card, available.card, payload.card);
    const status = element("p", "concept-lab__takeaway");
    status.dataset.kind = "insight";
    status.setAttribute("aria-live", "polite");
    body.append(controlRow, results, status);
    root.append(body);

    function setFrame(raw: string | undefined) {
      const bytes = parseByteSequence(raw);
      if (!bytes || bytes.length < 4) return;
      const hex = bytes.map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"));
      cells.forEach((input, index) => { input.value = hex[index] ?? ""; });
      payloadControl.input.value = hex.slice(4).join(" ");
      sync();
    }

    function sync() {
      control.input.value = cells.map((input) => input.value.padStart(2, "0")).join(" ") + " " + payloadControl.input.value;
      render();
    }

    cells.forEach((input, index) => {
      input.addEventListener("focus", () => input.select());
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^0-9a-f]/gi, "").toUpperCase();
        if (input.value.length === 2 && index < 3) cells[index + 1]?.focus();
        sync();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && index > 0) { event.preventDefault(); cells[index - 1]?.focus(); }
        if (event.key === "ArrowLeft" && input.selectionStart === 0 && index > 0) { event.preventDefault(); cells[index - 1]?.focus(); }
        if (event.key === "ArrowRight" && input.selectionStart === input.value.length && index < 3) { event.preventDefault(); cells[index + 1]?.focus(); }
      });
      input.addEventListener("paste", (event) => {
        const raw = event.clipboardData ? event.clipboardData.getData("text") : "";
        const parsed = parseByteSequence(raw);
        if (!parsed || parsed.length < 4) return;
        event.preventDefault();
        setFrame(raw);
      });
    });

    function render() {
      const bytes = parseByteSequence(control.input.value);
      examples.querySelectorAll<HTMLElement>("[data-frame-bytes]").forEach((button) => {
        const preset = parseByteSequence(button.dataset.frameBytes);
        const active = !!bytes && !!preset && bytes.length === preset.length && bytes.every((byte, index) => byte === preset[index]);
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      if (!bytes || bytes.length < 4) {
        results.hidden = true;
        status.textContent = "Use pairs of hex digits for the payload, such as 48 69. The four boxes above are the length header.";
        return;
      }
      const view = new DataView(Uint8Array.from(bytes.slice(0, 4)).buffer);
      const declared = view.getUint32(0, false);
      const payloadBytes = bytes.slice(4);
      results.hidden = false;
      length.value.textContent = `${declared} bytes`;
      available.value.textContent = `${payloadBytes.length} bytes`;
      payload.value.textContent = payloadBytes
        .slice(0, Math.min(declared, payloadBytes.length))
        .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : "·"))
        .join("") || "(empty)";
      if (declared > 1024) {
        status.textContent = "⚠️ Reject this length before allocating: it exceeds the 1024-byte limit. A length field is a claim to validate.";
      } else if (payloadBytes.length < declared) {
        status.textContent = `⚠️ This frame needs ${declared - payloadBytes.length} more payload byte${declared - payloadBytes.length === 1 ? "" : "s"}. Wait for the rest before decoding the complete message.`;
      } else if (payloadBytes.length > declared) {
        status.textContent = `⚠️ One complete frame is present, followed by ${payloadBytes.length - declared} extra byte${payloadBytes.length - declared === 1 ? "" : "s"} for the next frame.`;
      } else {
        status.textContent = "The bounded length matches the available bytes: decode Hello from this frame. The header measures bytes, not visible characters.";
        if (declared !== 5 || payload.value.textContent !== "Hello") status.textContent = "The bounded length matches the available bytes. The header measures bytes, not visible characters; this preview shows printable ASCII.";
      }
    }
    payloadControl.input.addEventListener("input", sync);
    examples.querySelectorAll<HTMLElement>("[data-frame-bytes]").forEach((button) => {
      button.addEventListener("click", () => {
        setFrame(button.dataset.frameBytes);
      });
    });
    setFrame(control.input.value);
  }


  // Worked examples stay visible. Changing an input updates the result and
  // diagram immediately; guessing is an optional extra.
  const hex = (n: number) => "0x" + n.toString(16).toUpperCase();
  const parseNumber = (raw: string | null | undefined): number => {
    const text = String(raw || "").trim().toLowerCase().replace(/_/g, "");
    if (/^-?0x[0-9a-f]+$/.test(text)) return Number.parseInt(text, 16);
    if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
    return NaN;
  };
  // A predict lab keeps what its controls hold as LabRaw (input key to number, and `text`), and each lab's own
  // value type V is checked out of it by `read` whenever the lab needs it.
  type LabRaw = Record<string, number | string>;
  interface StrideValues { index: number; stride: number; field: number }
  interface GridValues { width: number; x: number; y: number }
  interface VectorValues { ax: number; ay: number; bx: number; by: number }
  interface TextValues { text: string }
  interface RangeInput { key: string; label: string; min: number; max: number; value: number; options?: undefined; format?: undefined }
  interface OptionInput { key: string; label: string; options: number[]; value: number; format?: (value: number) => string }
  type InputSpec = RangeInput | OptionInput;
  interface TextInput { key: string; label: string; value: string; samples: string[] }
  interface PredictLab<V> {
    resultType: string;
    eyebrow: string;
    title: string;
    description: string;
    inputs?: InputSpec[];
    text?: TextInput;
    read(raw: LabRaw): V | null;
    normalize?(values: V): V;
    ask(values: V): string;
    answer(values: V): number;
    accept(guess: number, right: number): boolean;
    hint(values: V): string;
    steps(values: V): string[];
    show(right: number): string;
  }
  type PredictLabMount = (root: HTMLElement, lab: string) => void;

  function hasEveryNumber<K extends string>(found: Partial<Record<K, number>>, keys: readonly K[]): found is Record<K, number> {
    return keys.every((key) => typeof found[key] === "number");
  }
  function readNumbers<K extends string>(raw: LabRaw, keys: readonly K[]): Record<K, number> | null {
    const found: Partial<Record<K, number>> = {};
    for (const key of keys) {
      const value = raw[key];
      if (typeof value !== "number") return null;
      found[key] = value;
    }
    return hasEveryNumber(found, keys) ? found : null;
  }
  function readStride(raw: LabRaw): StrideValues | null { return readNumbers(raw, ["index", "stride", "field"]); }
  function readGrid(raw: LabRaw): GridValues | null { return readNumbers(raw, ["width", "x", "y"]); }
  function readVector(raw: LabRaw): VectorValues | null { return readNumbers(raw, ["ax", "ay", "bx", "by"]); }
  function readText(raw: LabRaw): TextValues | null {
    const text = raw.text;
    return typeof text === "string" ? { text } : null;
  }
  function predictLab<V>(cfg: PredictLab<V>): PredictLabMount {
    return (root, lab) => initializePredictLab(root, lab, cfg);
  }

  const PREDICT_LABS: Record<string, PredictLabMount> = {
    "stride-lab": predictLab<StrideValues>({
      read: readStride,
      resultType: "BYTE OFFSET",
      eyebrow: "Explore it",
      title: "Find a field inside a table of records",
      description: "Records sit one fixed stride apart. Change the player and the field and watch the offset from the table's start get built, one step at a time.",
      inputs: [
        { key: "index", label: "Player index", min: 0, max: 9, value: 2 },
        { key: "stride", label: "Bytes between records", options: [0x20, 0x270], value: 0x20, format: hex },
        { key: "field", label: "Field offset inside a record", options: [0x00, 0x04, 0x08, 0x10], value: 0x04, format: hex },
      ],
      ask: (v) => `Player ${v.index} has its record ${hex(v.stride)} bytes after the previous one, and the field you want is at +${hex(v.field)}. What offset from the table's start reaches it? Answer in hexadecimal.`,
      answer: (v) => v.index * v.stride + v.field,
      accept: (guess, right) => guess === right,
      hint: (v) => `Count whole records first: the first player is record 0, so player ${v.index} starts after ${v.index} strides. Add the field offset last.`,
      steps: (v) => [`Record start = ${v.index} × ${hex(v.stride)} = ${hex(v.index * v.stride)}`, `Field = ${hex(v.index * v.stride)} + ${hex(v.field)} = ${hex(v.index * v.stride + v.field)}`],
      show: (right) => hex(right),
    }),
    "grid-lab": predictLab<GridValues>({
      read: readGrid,
      resultType: "ZERO-BASED INDEX",
      eyebrow: "Explore it",
      title: "Turn a tile's (x, y) into a position in a flat list",
      description: "A map is stored as one long row-major list. Move the tile and the width and see which index it lands on, and why.",
      inputs: [
        { key: "width", label: "Map width (tiles)", min: 3, max: 12, value: 5 },
        { key: "x", label: "Tile x (column)", min: 0, max: 11, value: 2 },
        { key: "y", label: "Tile y (row)", min: 0, max: 5, value: 3 },
      ],
      normalize: (v) => ({ ...v, x: Math.min(v.x, v.width - 1) }),
      ask: (v) => `The map is ${v.width} tiles wide. What is the row-major index of tile (${v.x}, ${v.y}), counting from 0?`,
      answer: (v) => v.y * v.width + v.x,
      accept: (guess, right) => guess === right,
      hint: (v) => `Each full row above holds ${v.width} tiles. Skip ${v.y} full row${v.y === 1 ? "" : "s"}, then move ${v.x} tile${v.x === 1 ? "" : "s"} along the row.`,
      steps: (v) => [`Skipped rows = ${v.y} × ${v.width} = ${v.y * v.width}`, `Index = ${v.y * v.width} + ${v.x} = ${v.y * v.width + v.x}`],
      show: (right) => String(right),
    }),
    "vector-lab": predictLab<VectorValues>({
      read: readVector,
      resultType: "WORLD-UNIT DISTANCE",
      eyebrow: "Explore it",
      title: "How far apart are two points?",
      description: "Subtract to get the direction, then measure its length. Move the points and watch the numbers change.",
      inputs: [
        { key: "ax", label: "Point A x", min: -8, max: 8, value: 2 },
        { key: "ay", label: "Point A y", min: -8, max: 8, value: 3 },
        { key: "bx", label: "Point B x", min: -8, max: 8, value: 5 },
        { key: "by", label: "Point B y", min: -8, max: 8, value: 7 },
      ],
      ask: (v) => `A is at (${v.ax}, ${v.ay}) and B is at (${v.bx}, ${v.by}). What is the distance from A to B, rounded to one decimal place?`,
      answer: (v) => Math.hypot(v.bx - v.ax, v.by - v.ay),
      accept: (guess, right) => Math.abs(guess - right) <= 0.051,
      hint: (v) => `Subtract first: B − A gives (${v.bx - v.ax}, ${v.by - v.ay}). The length is the square root of the sum of the squares of those two numbers.`,
      steps: (v) => {
        const dx = v.bx - v.ax, dy = v.by - v.ay;
        return [`Direction = B − A = (${dx}, ${dy})`, `Squares added = ${dx * dx} + ${dy * dy} = ${dx * dx + dy * dy}`, `Distance = √${dx * dx + dy * dy} ≈ ${Math.hypot(dx, dy).toFixed(1)}`];
      },
      show: (right) => right.toFixed(1),
    }),
    "utf8-lab": predictLab<TextValues>({
      read: readText,
      resultType: "UTF-8 BYTE COUNT",
      eyebrow: "Explore it",
      title: "How many bytes does this text take?",
      description: "One visible character is not always one byte. Type a word and see each character's UTF-8 bytes and the total.",
      text: { key: "text", label: "Text (up to 8 characters)", value: "café", samples: ["gold", "café", "金貨", "🙂"] },
      ask: (v) => `How many bytes does “${v.text}” take in UTF-8? Count bytes, not characters.`,
      answer: (v) => new TextEncoder().encode(v.text).length,
      accept: (guess, right) => guess === right,
      hint: (v) => `Count characters first (${Array.from(v.text).length}). Plain ASCII letters use one byte each; most other characters need two, three, or four.`,
      steps: (v) => Array.from(v.text).map((ch) => {
        const bytes = Array.from(new TextEncoder().encode(ch));
        return `${ch} → U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")} → ${bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ")} (${bytes.length} byte${bytes.length === 1 ? "" : "s"})`;
      }),
      show: (right) => String(right),
    }),
  };

  function predictDiagram(lab: string, values: LabRaw): SVGSVGElement | null {
    if (!["stride-lab", "vector-lab"].includes(lab)) return null;
    const svgNode = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> | undefined, text?: string): SVGElementTagNameMap[K] => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, String(value)));
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const svg = svgNode("svg", { viewBox: lab === "stride-lab" ? "0 0 480 220" : "0 0 480 270", role: "img", class: "predict-figure__drawing" });
    const add = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, text?: string): SVGElementTagNameMap[K] => { const node = svgNode(tag, attrs, text); svg.append(node); return node; };
    if (lab === "stride-lab") {
      const strideValues = readStride(values);
      if (!strideValues) return null;
      const { index, stride, field } = strideValues;
      const start = index * stride, address = start + field;
      add("title", {}, `Player ${index}: record ${hex(start)}, field ${hex(address)}`);
      add("desc", {}, `Ten equal-sized records. Record ${index} is selected. The enlarged record shows the field ${hex(field)} bytes from its start, reaching offset ${hex(address)} from the table start. Record widths are schematic; the enlarged field marker uses the actual field-to-stride ratio.`);
      add("text", { x: 20, y: 22 }, `Each record spans ${hex(stride)} bytes`);
      for (let i = 0; i < 10; i++) {
        add("rect", { x: 20 + i * 44, y: 36, width: 40, height: 34, class: `predict-figure__record${i === index ? " is-selected" : ""}` });
        add("text", { x: 40 + i * 44, y: 59, "text-anchor": "middle" }, String(i));
      }
      add("path", { d: `M${40 + index * 44} 72 L240 100`, class: "predict-figure__guide" });
      add("rect", { x: 30, y: 108, width: 420, height: 40, class: "predict-figure__record is-selected" });
      const marker = 30 + 420 * field / stride;
      add("line", { x1: marker, x2: marker, y1: 102, y2: 154, class: "predict-figure__arrow" });
      add("text", { x: 30, y: 174 }, `start ${hex(start)}`);
      add("text", { x: 450, y: 174, "text-anchor": "end" }, `next ${hex(start + stride)}`);
      add("text", { x: 240, y: 202, "text-anchor": "middle" }, `Field: ${hex(start)} + ${hex(field)} = ${hex(address)}`);
    } else {
      const vectorValues = readVector(values);
      if (!vectorValues) return null;
      const { ax, ay, bx, by } = vectorValues;
      const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
      const x = (n: number) => 240 + n * 13, y = (n: number) => 125 - n * 13;
      add("title", {}, `A (${ax}, ${ay}) to B (${bx}, ${by}): length ${length.toFixed(1)}`);
      add("desc", {}, `The arrow runs from A to B. The right triangle has horizontal difference ${dx} and vertical difference ${dy}. Both axes use the same scale. ${length === 0 ? "The points coincide, so the arrow has zero length." : `Its length is the square root of ${dx * dx + dy * dy}.`}`);
      add("line", { x1: x(-8), y1: y(0), x2: x(8), y2: y(0), class: "predict-figure__guide" });
      add("line", { x1: x(0), y1: y(-8), x2: x(0), y2: y(8), class: "predict-figure__guide" });
      add("text", { x: x(8) + 12, y: y(0) + 5 }, "x");
      add("text", { x: x(0) + 8, y: y(8) }, "y");
      add("text", { x: x(-8), y: y(0) + 18 }, "−8");
      add("text", { x: x(8), y: y(0) + 18, "text-anchor": "end" }, "8");
      add("path", { d: `M${x(ax)} ${y(ay)} H${x(bx)} V${y(by)}`, class: "predict-figure__triangle" });
      add("line", { x1: x(ax), y1: y(ay), x2: x(bx), y2: y(by), class: "predict-figure__arrow" });
      if (length > 0) {
        const ux = dx / length, uy = -dy / length, tipX = x(bx), tipY = y(by);
        add("path", { d: `M${tipX - 9 * ux - 4 * uy} ${tipY - 9 * uy + 4 * ux} L${tipX} ${tipY} L${tipX - 9 * ux + 4 * uy} ${tipY - 9 * uy - 4 * ux}`, class: "predict-figure__arrow" });
      }
      add("circle", { cx: x(ax), cy: y(ay), r: length === 0 ? 7 : 5, class: "predict-figure__point" });
      add("circle", { cx: x(bx), cy: y(by), r: 4, class: "predict-figure__point is-selected" });
      add("text", { x: x(ax) - 10, y: y(ay) + 18, "text-anchor": "end" }, "A");
      add("text", { x: x(bx) + 10, y: y(by) - 8 }, "B");
      add("text", { x: 20, y: 250 }, `A (${ax}, ${ay})`);
      add("text", { x: 460, y: 250, "text-anchor": "end" }, `B (${bx}, ${by})`);
      add("text", { x: 240, y: 266, "text-anchor": "middle" }, length === 0 ? "Same position · distance 0" : `Δx ${dx} · Δy ${dy} · length ${length.toFixed(1)}`);
    }
    return svg;
  }

  function initializePredictLab<V>(root: HTMLElement, lab: string, cfg: PredictLab<V>): void {
    const id = String(root.dataset.conceptId || lab).replace(/[^a-z0-9_-]/gi, "-");
    root.replaceChildren(makeLabHeader(cfg.eyebrow, cfg.title, cfg.description));
    const body = element("div", "concept-lab__body");
    const controls = element("div", "concept-lab__control-row");
    const values: LabRaw = {};
    const readers: Array<{ spec: InputSpec; input: HTMLInputElement | HTMLSelectElement; read: () => void }> = [];
    let textInput: HTMLInputElement | null = null;
    const sync = () => {
      const settled = cfg.normalize ? cfg.read(values) : null;
      if (cfg.normalize && settled) Object.assign(values, cfg.normalize(settled));
      readers.forEach(({ spec, input }) => { if (!spec.options && values[spec.key] !== undefined) { input.value = String(values[spec.key]); if (input.nextSibling) input.nextSibling.textContent = String(values[spec.key]); } });
    };
    (cfg.inputs || []).forEach((spec) => {
      const label = element("label", "concept-lab__field");
      label.htmlFor = `${id}-${spec.key}`;
      const caption = element("span", "concept-lab__field-label", spec.label);
      let input: HTMLInputElement | HTMLSelectElement;
      if (spec.options) {
        input = element("select", "concept-lab__text-input");
        spec.options.forEach((option) => { const o = element("option", "", (spec.format || String)(option)); o.value = String(option); input.append(o); });
      } else {
        input = element("input", "concept-lab__text-input");
        input.type = "range"; input.min = String(spec.min); input.max = String(spec.max); input.step = "1";
      }
      input.id = `${id}-${spec.key}`;
      input.value = String(spec.value);
      const shown = element("span", "concept-lab__result-note", "");
      const read = () => { values[spec.key] = Number(input.value); shown.textContent = spec.options ? "" : String(input.value); };
      input.addEventListener("input", () => { read(); sync(); resetAnswer(); redraw(); });
      readers.push({ spec, input, read });
      read();
      label.append(caption, input, shown);
      controls.append(label);
    });
    if (cfg.text) {
      const control = makeTextControl(`${id}-text`, cfg.text.label, cfg.text.value);
      textInput = control.input;
      control.input.maxLength = 16;
      values.text = cfg.text.value;
      control.input.addEventListener("input", () => { values.text = Array.from(control.input.value).slice(0, 8).join("") || " "; resetAnswer(); redraw(); });
      const samples = element("div", "concept-lab__examples");
      samples.append(element("span", "concept-lab__example-label", "Try:"));
      cfg.text.samples.forEach((sample) => {
        const button = element("button", "concept-lab__example", sample);
        button.type = "button";
        button.addEventListener("click", () => { control.input.value = sample; values.text = sample; resetAnswer(); redraw(); });
        samples.append(button);
      });
      controls.append(control.label, samples);
    }
    sync();

    const steps = element("ol", "concept-lab__steps");
    const figure = element("figure", "predict-figure");
    figure.hidden = !["stride-lab", "vector-lab"].includes(lab);
    const result = element("p", "concept-lab__takeaway");
    result.dataset.kind = "insight";
    result.setAttribute("aria-live", "polite");
    const guessBox = element("details", "concept-lab__guess");
    guessBox.append(element("summary", "", "Want to guess first? (optional)"));
    const question = element("p", "concept-lab__description");
    question.setAttribute("aria-live", "polite");
    const guessLabel = element("label", "concept-lab__field");
    guessLabel.htmlFor = `${id}-guess`;
    const guess = element("input", "concept-lab__text-input");
    guess.id = `${id}-guess`; guess.type = "text"; guess.autocomplete = "off"; guess.spellcheck = false; guess.placeholder = "Your guess";
    guessLabel.append(element("span", "concept-lab__field-label", "Your guess"), guess);
    const actions = element("div", "concept-lab__examples");
    const mk = (text: string, icon: string) => { const b = element("button", "concept-lab__example"); b.type = "button"; const mark = element("span", "", icon); mark.setAttribute("aria-hidden", "true"); b.append(mark, document.createTextNode(text)); actions.append(b); return b; };
    const check = mk("Compare", "✓"), shuffle = mk("New numbers", "⤨"), reset = mk("Reset", "↻");
    const status = element("p", "concept-lab__takeaway");
    status.setAttribute("aria-live", "polite");
    guessBox.append(question, guessLabel, status);
    body.append(controls, figure, result, steps, guessBox, actions);
    root.append(body);

    function resetAnswer() { guess.value = ""; status.textContent = ""; }
    function redraw() {
      const settled = cfg.read(values);
      if (!settled) return;
      question.textContent = cfg.ask(settled);
      steps.replaceChildren(...cfg.steps(settled).map((line) => element("li", "", line)));
      result.textContent = " Result: " + cfg.show(cfg.answer(settled));
      addTypeBadge(result, cfg.resultType, lab === "vector-lab" ? "float" : "int");
      const drawing = predictDiagram(lab, values);
      if (drawing) figure.replaceChildren(drawing);
    }
    check.addEventListener("click", () => {
      guessBox.open = true;
      const settled = cfg.read(values);
      if (!settled) return;
      const right = cfg.answer(settled);
      const given = parseNumber(guess.value);
      const sound = (kind: "correct" | "wrong") => document.dispatchEvent(new CustomEvent("academy:sound", { detail: { kind } }));
      if (!Number.isFinite(given)) { status.textContent = "Type a guess above to compare it with the steps."; return; }
      if (cfg.accept(given, right)) { sound("correct"); status.textContent = "✅ That matches the steps above."; }
      else { sound("wrong"); status.textContent = "⚠️ Different from the steps above. " + cfg.hint(settled); }
    });
    shuffle.addEventListener("click", () => {
      readers.forEach(({ spec, input, read }) => {
        input.value = spec.options ? String(spec.options[Math.floor(Math.random() * spec.options.length)]) : String(spec.min + Math.floor(Math.random() * (spec.max - spec.min + 1)));
        read();
      });
      if (cfg.text && textInput) {
        const pick = cfg.text.samples[Math.floor(Math.random() * cfg.text.samples.length)];
        if (pick !== undefined) {
          values.text = pick;
          textInput.value = pick;
        }
      }
      sync(); resetAnswer(); redraw();
    });
    reset.addEventListener("click", () => {
      readers.forEach(({ spec, input, read }) => { input.value = String(spec.value); read(); });
      if (cfg.text && textInput) { values.text = cfg.text.value; textInput.value = cfg.text.value; }
      sync(); resetAnswer(); guessBox.open = false; redraw();
    });
    guess.addEventListener("keydown", (event) => { if (event.key === "Enter") check.click(); });
    redraw();
  }

  // Explore-first puzzles ("blanks-*" code blanks and "fsm-*" state machines) are
  // plain data in puzzle-labs.js. That file is fetched only on pages that use one.
  let puzzleScriptPromise: Promise<PuzzleApi> | null = null;
  function isPuzzleApi(value: unknown): value is PuzzleApi {
    return typeof value === "object" && value !== null && "mount" in value && typeof value.mount === "function";
  }
  function readPuzzleApi(): PuzzleApi | undefined {
    const published: unknown = Reflect.get(window, "AcademyPuzzles");
    return isPuzzleApi(published) ? published : undefined;
  }
  function loadPuzzleLabs(): Promise<PuzzleApi> {
    const published = readPuzzleApi();
    if (published) return Promise.resolve(published);
    if (!puzzleScriptPromise) {
      Reflect.set(window, "AcademyLearning", { element, makeLabHeader, makeTextControl, makeResult });
      puzzleScriptPromise = new Promise<PuzzleApi>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = puzzleScriptURL;
        script.onload = () => {
          const loaded = readPuzzleApi();
          if (loaded) resolve(loaded);
          else reject(new Error("puzzle-labs.js did not publish the puzzle API"));
        };
        script.onerror = () => reject(new Error("puzzle-labs.js did not load"));
        document.head.append(script);
      });
    }
    return puzzleScriptPromise;
  }

  function initializeConceptLab(root: HTMLElement): void {
    if (root.dataset.learningReady === "true") return;
    const lab = root.dataset.conceptLab || "";
    if (/^(blanks|fsm)-/.test(lab)) {
      root.dataset.learningReady = "true";
      loadPuzzleLabs().then((puzzles) => puzzles.mount(root, lab)).catch(() => { root.dataset.learningReady = "false"; });
      return;
    }
    if (!["byte-lens", "address-builder", "angle-lab", "pointer-walk", "scan-filter", "packet-framer", ...Object.keys(PREDICT_LABS)].includes(lab)) return;
    root.dataset.learningReady = "true";
    if (lab === "byte-lens") initializeByteLens(root);
    if (lab === "address-builder") initializeAddressBuilder(root);
    if (lab === "angle-lab") initializeAngleLab(root);
    if (lab === "pointer-walk") initializePointerWalk(root);
    if (lab === "scan-filter") initializeScanFilter(root);
    if (lab === "packet-framer") initializePacketFramer(root);
    const mountPredictLab = PREDICT_LABS[lab];
    if (mountPredictLab) mountPredictLab(root, lab);
  }

  function initializeLearningWidgets(scope: ParentNode | null | undefined): void {
    const root = scope ? scope : document;
    root.querySelectorAll<HTMLElement>("[data-ownership-example]").forEach(initializeOwnershipScope);
    root.querySelectorAll<HTMLElement>(".academy-quiz").forEach(initializeQuiz);
    root.querySelectorAll<HTMLElement>("[data-concept-lab]").forEach(initializeConceptLab);
  }

  // Feedback tone: a message that starts with a tick, a warning mark, or a
  // plain "Correct"/"Not quite" is marked so the CSS can colour right and
  // wrong differently (green for right, amber for different).
  function feedbackTone(text: string | null | undefined): string {
    var t = String(text || "").trim();
    if (/^(✅|Correct\b|Right\b|That matches|Matches the)/.test(t)) return "good";
    if (/^(❌|Not quite|Not the same)/.test(t)) return "bad";
    if (/^(⚠|Different from|Careful)/.test(t)) return "warn";
    return "";
  }
  var TONE_BOXES = ".concept-lab__takeaway, .sim-lab__explain, .code-trace__say, .code-trace__diff, .fsm__status, .fsm__change, " +
    ".sort-board__explain, .formula-builder__explain, .formula-builder__note, .visual-lab__explain, [aria-live]";
  function toneFor(el: Element): string | null {
    if (el.hasAttribute("data-tone-explicit")) return null;
    var text = (el.textContent || "").trim();
    if (!text) return "";
    var byText = feedbackTone(text);
    if (byText) return byText;
    var c = String(el.className || "");
    if (/code-trace__diff/.test(c) || /formula-builder__note/.test(c)) return "warn";
    if (/code-trace__say|fsm__status|formula-builder__explain|sim-lab__explain|concept-lab__takeaway/.test(c)) return "info";
    if (/fsm__change|sort-board__explain|visual-lab__explain/.test(c)) {
      if (/lesson.s (complete|working|version|choice|machine)|matches the lesson|belongs there|same as the lesson/i.test(text)) return "good";
      if (/differ|different from|no longer|instead|stuck|not where/i.test(text)) return "warn";
      return "info";
    }
    return "";
  }
  function scanTones() {
    document.querySelectorAll(".concept-lab").forEach(function (lab) {
      lab.querySelectorAll(TONE_BOXES).forEach(function (box) {
        var tone = toneFor(box);
        if (tone === null) return;
        if (tone) { if (box.getAttribute("data-tone") !== tone) box.setAttribute("data-tone", tone); }
        else if (box.hasAttribute("data-tone")) box.removeAttribute("data-tone");
      });
    });
  }
  function watchTones() {
    if (!window.MutationObserver) return;
    var queued = false;
    new MutationObserver(function () {
      if (document.documentElement.dataset.typing === "true" || queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; if (document.documentElement.dataset.typing !== "true") scanTones(); });
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
    scanTones();
  }

  function start() {
    initializeLearningWidgets(document);
    watchTones();

    const bookBody = document.querySelector("main") || document.body;
    document.addEventListener("academy:typing-state", function () { if (document.documentElement.dataset.typing !== "true") { initializeLearningWidgets(bookBody); scanTones(); } });
    if (window.MutationObserver && bookBody) {
      new MutationObserver((mutations) => {
        if (document.documentElement.dataset.typing !== "true" && mutations.some((mutation) => mutation.addedNodes.length > 0)) {
          initializeLearningWidgets(bookBody);
        }
      }).observe(bookBody, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
