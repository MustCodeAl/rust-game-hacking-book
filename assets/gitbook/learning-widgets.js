(function () {
  "use strict";

  const STORAGE_PREFIX = "gha-quiz:";

  const OWNERSHIP_EXAMPLES = {
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

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeMemoryItem(item, kind) {
    const card = element("div", `ownership-scope__memory-item is-${item.state || "owns"}`);
    const label = element("span", "ownership-scope__memory-name", kind === "heap" ? `heap ${item.id}` : item.name);
    const value = element("strong", "ownership-scope__memory-value", item.value);
    card.append(label, value);

    if (kind === "heap") {
      card.append(element("small", "ownership-scope__memory-owner", item.owner));
    }
    return card;
  }

  function initializeOwnershipScope(root) {
    if (root.dataset.learningReady === "true") return;

    const example = OWNERSHIP_EXAMPLES[root.dataset.ownershipExample];
    if (!example) return;

    root.dataset.learningReady = "true";
    root.replaceChildren();

    const header = element("header", "ownership-scope__header");
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
      button.setAttribute("aria-label", `Show step ${index + 1}: ${line}`);
      button.append(
        element("span", "ownership-scope__line-number", String(index + 1).padStart(2, "0")),
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
    function render(stepIndex) {
      activeStep = Math.max(0, Math.min(example.steps.length - 1, stepIndex));
      const step = example.steps[activeStep];

      stepPill.textContent = `Step ${activeStep + 1} of ${example.steps.length}`;
      eventName.textContent = step.event;
      message.textContent = step.message;
      loan.textContent = step.loan;
      stackItems.replaceChildren(...step.stack.map((item) => makeMemoryItem(item, "stack")));
      heapItems.replaceChildren(...step.heap.map((item) => makeMemoryItem(item, "heap")));

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

  function normalizeAnswer(value) {
    return String(value || "")
      .trim()
      .replace(/^`|`$/g, "")
      .replace(/\s+/g, " ")
      .toLocaleLowerCase();
  }

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // Private browsing and locked-down browsers may disable local storage.
    }
  }

  function safeStorageRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (_error) {
      // The quiz still works for this page view when storage is unavailable.
    }
  }

  function initializeQuiz(root) {
    if (root.dataset.learningReady === "true") return;
    root.dataset.learningReady = "true";

    const quizId = root.dataset.quizId;
    const quizType = root.dataset.quizType;
    const correctAnswer = normalizeAnswer(root.dataset.answer);
    const acceptedAnswers = [correctAnswer]
      .concat(String(root.dataset.alternatives || "").split("||").map(normalizeAnswer))
      .filter(Boolean);
    const optionButtons = Array.from(root.querySelectorAll("[data-quiz-option]"));
    const input = root.querySelector("[data-quiz-input]");
    const submit = root.querySelector("[data-quiz-submit]");
    const retry = root.querySelector("[data-quiz-retry]");
    const feedback = root.querySelector("[data-quiz-feedback]");
    const result = root.querySelector("[data-quiz-result]");
    const saved = root.querySelector("[data-quiz-saved]");
    const storageKey = `${STORAGE_PREFIX}${quizId}`;
    let selectedAnswer = "";

    function selectOption(button) {
      selectedAnswer = normalizeAnswer(button.dataset.quizOption);
      optionButtons.forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("is-selected", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      root.classList.remove("is-unanswered");
    }

    function currentAnswer() {
      return quizType === "short-answer" ? normalizeAnswer(input && input.value) : selectedAnswer;
    }

    function reveal(answer, wasCorrect, shouldSave) {
      root.classList.remove("is-unanswered", "is-correct", "is-incorrect");
      root.classList.add(wasCorrect ? "is-correct" : "is-incorrect");
      feedback.hidden = false;
      retry.hidden = false;
      submit.hidden = true;
      result.textContent = wasCorrect ? "Correct — nice work." : "Not quite yet.";

      optionButtons.forEach((button) => {
        const value = normalizeAnswer(button.dataset.quizOption);
        button.disabled = true;
        button.classList.toggle("is-correct-answer", value === correctAnswer);
        button.classList.toggle("is-wrong-answer", value === answer && !wasCorrect);
      });
      if (input) input.disabled = true;

      if (shouldSave) {
        safeStorageSet(storageKey, JSON.stringify({ answer, correct: wasCorrect }));
      }
      saved.hidden = false;
      saved.textContent = wasCorrect ? "Completed" : "Attempt saved";
    }

    function checkAnswer() {
      const answer = currentAnswer();
      if (!answer) {
        root.classList.add("is-unanswered");
        feedback.hidden = false;
        result.textContent = "Choose or type an answer first.";
        return;
      }
      reveal(answer, acceptedAnswers.includes(answer), true);
    }

    function reset() {
      selectedAnswer = "";
      root.classList.remove("is-unanswered", "is-correct", "is-incorrect");
      feedback.hidden = true;
      retry.hidden = true;
      submit.hidden = false;
      saved.hidden = true;
      optionButtons.forEach((button) => {
        button.disabled = false;
        button.classList.remove("is-selected", "is-correct-answer", "is-wrong-answer");
        button.setAttribute("aria-pressed", "false");
      });
      if (input) {
        input.disabled = false;
        input.value = "";
        input.focus();
      }
      safeStorageRemove(storageKey);
    }

    optionButtons.forEach((button) => button.addEventListener("click", () => selectOption(button)));
    submit.addEventListener("click", checkAnswer);
    retry.addEventListener("click", reset);
    if (input) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") checkAnswer();
      });
    }

    const savedAttempt = safeStorageGet(storageKey);
    if (savedAttempt) {
      try {
        const attempt = JSON.parse(savedAttempt);
        const answer = normalizeAnswer(attempt.answer);
        if (quizType === "short-answer" && input) input.value = attempt.answer;
        const selected = optionButtons.find(
          (button) => normalizeAnswer(button.dataset.quizOption) === answer
        );
        if (selected) selectOption(selected);
        reveal(answer, acceptedAnswers.includes(answer), false);
      } catch (_error) {
        safeStorageRemove(storageKey);
      }
    }
  }

  function makeLabHeader(eyebrow, title, description) {
    const header = element("header", "concept-lab__header");
    const copy = element("div", "concept-lab__header-copy");
    copy.append(
      element("span", "concept-lab__eyebrow", eyebrow),
      element("h3", "", title),
      element("p", "concept-lab__description", description)
    );
    header.append(copy, element("span", "concept-lab__live-badge", "Live lab"));
    return header;
  }

  function makeTextControl(id, labelText, value) {
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

  function makeResult(labelText, valueText, noteText) {
    const card = element("div", "concept-lab__result-card");
    const value = element("strong", "concept-lab__result-value", valueText);
    card.append(element("span", "concept-lab__result-label", labelText), value);
    if (noteText) card.append(element("small", "concept-lab__result-note", noteText));
    return { card, value };
  }

  function parseFourBytes(raw) {
    const cleaned = String(raw || "").trim().replace(/0x/gi, "");
    let parts = cleaned.split(/[\s,;:-]+/).filter(Boolean);
    if (parts.length === 1 && /^[0-9a-f]{8}$/i.test(parts[0])) {
      parts = parts[0].match(/.{2}/g);
    }
    if (parts.length !== 4 || parts.some((part) => !/^[0-9a-f]{2}$/i.test(part))) {
      return null;
    }
    return parts.map((part) => Number.parseInt(part, 16));
  }

  function readableFloat32(value) {
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "+Infinity";
    if (value === -Infinity) return "-Infinity";
    if (Object.is(value, -0)) return "-0";
    if (value === 0) return "0";
    const magnitude = Math.abs(value);
    if (magnitude >= 10000000 || magnitude < 0.0001) return value.toExponential(5);
    return Number(value.toPrecision(7)).toString();
  }

  function initializeByteLens(root) {
    const labId = String(root.dataset.conceptId || "byte-lens").replace(/[^a-z0-9_-]/gi, "-");
    root.replaceChildren();
    root.append(
      makeLabHeader(
        "Byte lens",
        "Four bytes can tell several stories",
        "Change the bytes, then compare what happens when the computer reads the exact same bits as different data types."
      )
    );

    const body = element("div", "concept-lab__body");
    const controls = element("div", "concept-lab__control-row");
    const byteControl = makeTextControl(`${labId}-bytes`, "Four hexadecimal bytes", "64 00 00 00");
    byteControl.input.setAttribute("aria-describedby", `${labId}-byte-help ${labId}-byte-error`);
    const examples = element("div", "concept-lab__examples");
    examples.append(element("span", "concept-lab__example-label", "Try a known value:"));
    [
      ["100", "64 00 00 00"],
      ["−1", "FF FF FF FF"],
      ["1.0", "00 00 80 3F"],
    ].forEach(([label, bytes]) => {
      const button = element("button", "concept-lab__example", label);
      button.type = "button";
      button.dataset.bytes = bytes;
      examples.append(button);
    });
    controls.append(byteControl.label, examples);

    const help = element(
      "p",
      "concept-lab__help",
      "Write each byte with two hex digits. The first byte is stored at the lowest address."
    );
    help.id = `${labId}-byte-help`;
    const error = element("p", "concept-lab__error");
    error.id = `${labId}-byte-error`;
    error.setAttribute("role", "alert");
    error.hidden = true;

    const byteStrip = element("div", "concept-lab__byte-strip");
    byteStrip.setAttribute("aria-label", "Bytes in increasing address order");
    const results = element("div", "concept-lab__results concept-lab__results--four");
    const unsigned = makeResult("Unsigned 32-bit", "", "Little-endian u32");
    const signed = makeResult("Signed 32-bit", "", "Little-endian i32");
    const floating = makeResult("32-bit decimal", "", "IEEE-754 f32");
    const bigEndian = makeResult("Unsigned, reversed order", "", "Big-endian u32");
    results.append(unsigned.card, signed.card, floating.card, bigEndian.card);

    const takeaway = element(
      "p",
      "concept-lab__takeaway",
      "Memory stores bytes, not labels. A type tells the program how to interpret those bytes."
    );
    body.append(controls, help, error, byteStrip, results, takeaway);
    root.append(body);

    function render() {
      const bytes = parseFourBytes(byteControl.input.value);
      if (!bytes) {
        error.textContent = "Enter exactly four bytes, such as 64 00 00 00.";
        error.hidden = false;
        results.hidden = true;
        byteStrip.replaceChildren();
        return;
      }
      error.hidden = true;
      results.hidden = false;
      byteStrip.replaceChildren(
        ...bytes.map((byte, index) => {
          const cell = element("span", "concept-lab__byte");
          cell.append(
            element("small", "", `+${index}`),
            element("strong", "", byte.toString(16).toUpperCase().padStart(2, "0"))
          );
          return cell;
        })
      );
      const array = Uint8Array.from(bytes);
      const view = new DataView(array.buffer);
      unsigned.value.textContent = view.getUint32(0, true).toLocaleString("en-US");
      signed.value.textContent = view.getInt32(0, true).toLocaleString("en-US");
      floating.value.textContent = readableFloat32(view.getFloat32(0, true));
      bigEndian.value.textContent = view.getUint32(0, false).toLocaleString("en-US");
    }

    byteControl.input.addEventListener("input", render);
    examples.querySelectorAll("[data-bytes]").forEach((button) => {
      button.addEventListener("click", () => {
        byteControl.input.value = button.dataset.bytes;
        render();
        byteControl.input.focus();
      });
    });
    render();
  }

  function parseAddressNumber(raw) {
    const value = String(raw || "").trim().replace(/_/g, "");
    if (!/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value)) return null;
    try {
      return BigInt(value);
    } catch (_error) {
      return null;
    }
  }

  function formatAddress(value) {
    return `0x${value.toString(16).toUpperCase()}`;
  }

  function initializeAddressBuilder(root) {
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
    const controls = element("div", "concept-lab__control-grid");
    const base = makeTextControl(`${labId}-base`, "Module base today", "0x7FF600000000");
    const offset = makeTextControl(`${labId}-offset`, "Relative virtual address (RVA)", "0x1200");
    controls.append(base.label, offset.label);
    const error = element("p", "concept-lab__error");
    error.setAttribute("role", "alert");
    error.hidden = true;

    const equation = element("div", "concept-lab__address-equation");
    const baseBlock = makeResult("Base", "", "changes between runs");
    const plus = element("span", "concept-lab__operator", "+");
    const offsetBlock = makeResult("RVA", "", "stable inside this build");
    const equals = element("span", "concept-lab__operator", "=");
    const liveBlock = makeResult("Live address", "", "use for this run");
    liveBlock.card.classList.add("concept-lab__result-card--accent");
    equation.append(baseBlock.card, plus, offsetBlock.card, equals, liveBlock.card);
    const takeaway = element(
      "p",
      "concept-lab__takeaway",
      "Keep the RVA in your notes. Re-read the module base after every launch, then rebuild the live address."
    );
    body.append(controls, error, equation, takeaway);
    root.append(body);

    function render() {
      const baseValue = parseAddressNumber(base.input.value);
      const offsetValue = parseAddressNumber(offset.input.value);
      if (baseValue === null || offsetValue === null) {
        error.textContent = "Use a decimal number or a hexadecimal number beginning with 0x.";
        error.hidden = false;
        equation.hidden = true;
        return;
      }
      const liveValue = baseValue + offsetValue;
      if (baseValue > maxAddress || offsetValue > maxAddress || liveValue > maxAddress) {
        error.textContent = "That result does not fit in a 64-bit Windows address.";
        error.hidden = false;
        equation.hidden = true;
        return;
      }
      error.hidden = true;
      equation.hidden = false;
      baseBlock.value.textContent = formatAddress(baseValue);
      offsetBlock.value.textContent = formatAddress(offsetValue);
      liveBlock.value.textContent = formatAddress(liveValue);
    }

    base.input.addEventListener("input", render);
    offset.input.addEventListener("input", render);
    render();
  }

  function normalizeAngle(delta) {
    return ((delta + 540) % 360) - 180;
  }

  function makeRangeControl(id, labelText, value) {
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

  function initializeAngleLab(root) {
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
    shortest.card.classList.add("concept-lab__result-card--accent");
    results.append(direct.card, shortest.card);
    visual.append(dial, results);
    const takeaway = element("p", "concept-lab__takeaway concept-lab__angle-takeaway");
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

  function initializeConceptLab(root) {
    if (root.dataset.learningReady === "true") return;
    const lab = root.dataset.conceptLab;
    if (!["byte-lens", "address-builder", "angle-lab"].includes(lab)) return;
    root.dataset.learningReady = "true";
    if (lab === "byte-lens") initializeByteLens(root);
    if (lab === "address-builder") initializeAddressBuilder(root);
    if (lab === "angle-lab") initializeAngleLab(root);
  }

  function initializeLearningWidgets(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-ownership-example]").forEach(initializeOwnershipScope);
    root.querySelectorAll(".academy-quiz").forEach(initializeQuiz);
    root.querySelectorAll("[data-concept-lab]").forEach(initializeConceptLab);
  }

  function start() {
    initializeLearningWidgets(document);

    if (window.gitbook && window.gitbook.events) {
      window.gitbook.events.bind("page.change", () => initializeLearningWidgets(document));
    }

    const bookBody = document.querySelector(".book-body") || document.body;
    if (window.MutationObserver && bookBody) {
      new MutationObserver((mutations) => {
        if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
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
