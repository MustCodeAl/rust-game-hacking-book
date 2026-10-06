(function () {
  "use strict";

  const initializedQuizRoots = new WeakSet();
  const quizModuleURL = new URL('lesson-quiz.mjs', document.currentScript.src).href;

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

  // Fisher-Yates. Quiz order is deliberately random rather than seeded: a
  // learner who returns to a page, or retakes the quiz, should meet the same
  // ideas in a different arrangement instead of memorizing "the answer is C".
  function shuffleInPlace(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      const held = items[index];
      items[index] = items[swap];
      items[swap] = held;
    }
    return items;
  }

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

  function initializeQuiz(root) {
    if (initializedQuizRoots.has(root)) return;
    initializedQuizRoots.add(root);
    import(quizModuleURL).then(module => module.mountQuiz(root)).catch(() => {
      const feedback = root.querySelector('[data-quiz-feedback]');
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'The quiz could not load. Reload this page to try again.';
      }
    });
  }

  function makeLabHeader(eyebrow, title, description) {
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
        "Byte interpreter",
        "The same four bytes can represent different values",
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
      "The RVA stays the same for this build. Re-read the module base after every launch, then rebuild the live address."
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

  function initializePointerWalk(root) {
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
    const steps = [
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
      item.append(element("code", "", step.code));
      code.append(item);
      return item;
    });
    const ns = "http://www.w3.org/2000/svg";
    const svgNode = (tag, attrs, text) => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const picture = svgNode("svg", { viewBox: "0 0 500 192", class: "pointer-tracer__picture", "aria-hidden": "true" });
    const viewport = element("div", "pointer-tracer__viewport");
    viewport.append(picture);
    picture.append(svgNode("text", { x: 8, y: 16 }, "Captured memory"));
    const sources = [
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
    let animationTimer;
    function render(step) {
      clearTimeout(animationTimer);
      activeStep = Math.max(0, Math.min(steps.length - 1, step));
      const current = steps[activeStep];
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
        copied.textContent = sources[current.read][1];
        chip.style.transition = "none";
        chip.style.transform = `translate(191px, ${sourceY + 6}px)`;
        chip.setAttribute("opacity", "1");
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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

  function initializeScanFilter(root) {
    root.replaceChildren();
    root.append(
      makeLabHeader(
        "Scan simulator",
        "Watch candidates disappear",
        "Each in-game change is followed by a scan that filters the addresses that survived the previous one. Click through three scans."
      )
    );
    const stages = [
      { label: "First scan: 100", wanted: 100, values: [100, 100, 100, 100, 100, 100, 100, 100], keep: [0, 1, 2, 3, 4, 5, 6, 7], note: "The first value is common, so all eight addresses are only possibilities." },
      { label: "Next scan: 75", wanted: 75, values: [100, 75, 75, 100, 75, 100, 100, 100], keep: [1, 2, 4], note: "Only addresses B, C, and E changed to the new observed value." },
      { label: "Next scan: 80", wanted: 80, values: [100, 75, 80, 100, 75, 100, 100, 100], keep: [2], note: "Address C is the only old candidate that followed both controlled changes." }
    ];
    const body = element("div", "concept-lab__body");
    const stageButtons = element("div", "concept-lab__scan-stages");
    const memory = element("div", "concept-lab__scan-memory");
    const status = element("p", "concept-lab__takeaway");
    const count = element("strong", "concept-lab__candidate-count");
    stages.forEach((stage, index) => {
      const button = element("button", "concept-lab__example", stage.label);
      button.type = "button";
      button.dataset.scanStage = String(index);
      stageButtons.append(button);
    });
    body.append(stageButtons, count, memory, status);
    root.append(body);

    function render(stageIndex) {
      const stage = stages[stageIndex];
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

  function parseByteSequence(raw) {
    const cleaned = String(raw || "").trim().replace(/0x/gi, "");
    const parts = cleaned.split(/[\s,;:-]+/).filter(Boolean);
    if (!parts.length || parts.some((part) => !/^[0-9a-f]{2}$/i.test(part))) return null;
    return parts.map((part) => Number.parseInt(part, 16));
  }

  function initializePacketFramer(root) {
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
    const examples = element("div", "concept-lab__examples");
    examples.append(element("span", "concept-lab__example-label", "Try a frame:"));
    [
      ["Valid “Hello”", "00 00 00 05 48 65 6C 6C 6F"],
      ["Truncated", "00 00 00 05 48 69"],
      ["Too large", "00 00 10 00 41"],
    ].forEach(([label, bytes]) => {
      const button = element("button", "concept-lab__example", label);
      button.type = "button";
      button.dataset.frameBytes = bytes;
      examples.append(button);
    });
    const controlRow = element("div", "concept-lab__control-row");
    controlRow.append(control.label, examples);
    const results = element("div", "concept-lab__results");
    const length = makeResult("Advertised length", "", "Maximum allowed: 1024 bytes");
    const available = makeResult("Bytes available", "", "After the four-byte header");
    const payload = makeResult("Decoded payload", "", "Printable ASCII preview");
    results.append(length.card, available.card, payload.card);
    const status = element("p", "concept-lab__takeaway");
    status.setAttribute("aria-live", "polite");
    body.append(controlRow, results, status);
    root.append(body);

    function render() {
      const bytes = parseByteSequence(control.input.value);
      if (!bytes || bytes.length < 4) {
        results.hidden = true;
        status.textContent = "❌ A frame needs at least the four-byte length header.";
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
        status.textContent = "❌ Reject it before allocating: the advertised length exceeds the 1024-byte limit.";
      } else if (payloadBytes.length < declared) {
        status.textContent = `❌ Truncated frame: ${declared - payloadBytes.length} payload byte${declared - payloadBytes.length === 1 ? " is" : "s are"} missing.`;
      } else if (payloadBytes.length > declared) {
        status.textContent = `⚠️ One complete frame is present, followed by ${payloadBytes.length - declared} extra byte${payloadBytes.length - declared === 1 ? "" : "s"} for the next frame.`;
      } else {
        status.textContent = "✅ Valid frame: the bounded payload length exactly matches the available bytes.";
      }
    }
    control.input.addEventListener("input", render);
    examples.querySelectorAll("[data-frame-bytes]").forEach((button) => {
      button.addEventListener("click", () => {
        control.input.value = button.dataset.frameBytes;
        render();
      });
    });
    render();
  }


  // Predict-then-check labs: the reader changes the numbers, commits to an
  // answer, and only then sees the worked steps. Each lab is plain data.
  const hex = (n) => "0x" + n.toString(16).toUpperCase();
  const parseNumber = (raw) => {
    const text = String(raw || "").trim().toLowerCase().replace(/_/g, "");
    if (/^-?0x[0-9a-f]+$/.test(text)) return Number.parseInt(text, 16);
    if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
    return NaN;
  };
  const PREDICT_LABS = {
    "stride-lab": {
      eyebrow: "Predict, then check",
      title: "Find a field inside a table of records",
      description: "Records sit one fixed stride apart. Pick a player and a field, predict the offset from the table's start, then check it.",
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
    },
    "grid-lab": {
      eyebrow: "Predict, then check",
      title: "Turn a tile's (x, y) into a position in a flat list",
      description: "A map is stored as one long row-major list. Pick a tile, predict its index, then check the arithmetic.",
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
    },
    "vector-lab": {
      eyebrow: "Predict, then check",
      title: "How far apart are two points?",
      description: "Subtract to get the direction, then measure its length. Predict the distance to one decimal place.",
      inputs: [
        { key: "ax", label: "Point A x", min: -6, max: 6, value: 0 },
        { key: "ay", label: "Point A y", min: -6, max: 6, value: 0 },
        { key: "bx", label: "Point B x", min: -6, max: 6, value: 3 },
        { key: "by", label: "Point B y", min: -6, max: 6, value: 4 },
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
    },
    "utf8-lab": {
      eyebrow: "Predict, then check",
      title: "How many bytes does this text take?",
      description: "One visible character is not always one byte. Pick a word, predict its UTF-8 byte count, then see each character's bytes.",
      text: { key: "text", label: "Text (up to 8 characters)", value: "café", samples: ["gold", "café", "金貨", "🙂"] },
      ask: (v) => `How many bytes does “${v.text}” take in UTF-8? Count bytes, not characters.`,
      answer: (v) => new TextEncoder().encode(v.text).length,
      accept: (guess, right) => guess === right,
      hint: (v) => `Count characters first (${Array.from(v.text).length}). Plain ASCII letters use one byte each; most other characters need two, three, or four.`,
      steps: (v) => Array.from(v.text).map((ch) => {
        const bytes = Array.from(new TextEncoder().encode(ch));
        return `${ch} → U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")} → ${bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ")} (${bytes.length} byte${bytes.length === 1 ? "" : "s"})`;
      }),
      show: (right) => String(right),
    },
  };

  function initializePredictLab(root, lab) {
    const cfg = PREDICT_LABS[lab];
    const id = String(root.dataset.conceptId || lab).replace(/[^a-z0-9_-]/gi, "-");
    root.replaceChildren(makeLabHeader(cfg.eyebrow, cfg.title, cfg.description));
    const body = element("div", "concept-lab__body");
    const controls = element("div", "concept-lab__control-row");
    const values = {};
    const readers = [];
    const sync = () => {
      Object.assign(values, cfg.normalize ? cfg.normalize({ ...values }) : values);
      readers.forEach(({ spec, input }) => { if (!spec.options && values[spec.key] !== undefined) { input.value = String(values[spec.key]); if (input.nextSibling) input.nextSibling.textContent = String(values[spec.key]); } });
    };
    (cfg.inputs || []).forEach((spec) => {
      const label = element("label", "concept-lab__field");
      label.htmlFor = `${id}-${spec.key}`;
      const caption = element("span", "concept-lab__field-label", spec.label);
      let input;
      if (spec.options) {
        input = element("select", "concept-lab__text-input");
        spec.options.forEach((option) => { const o = element("option", "", (spec.format || String)(option)); o.value = String(option); input.append(o); });
      } else {
        input = element("input", "concept-lab__text-input");
        input.type = "range"; input.min = spec.min; input.max = spec.max; input.step = 1;
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
      control.input.maxLength = 16;
      values.text = cfg.text.value;
      control.input.addEventListener("input", () => { values.text = control.input.value.slice(0, 8) || " "; resetAnswer(); redraw(); });
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

    const question = element("p", "concept-lab__description");
    question.setAttribute("aria-live", "polite");
    const guessLabel = element("label", "concept-lab__field");
    guessLabel.htmlFor = `${id}-guess`;
    const guess = element("input", "concept-lab__text-input");
    guess.id = `${id}-guess`; guess.type = "text"; guess.autocomplete = "off"; guess.spellcheck = false; guess.placeholder = "Your prediction";
    guessLabel.append(element("span", "concept-lab__field-label", "Your prediction"), guess);
    const actions = element("div", "concept-lab__examples");
    const mk = (text) => { const b = element("button", "concept-lab__example", text); b.type = "button"; actions.append(b); return b; };
    const check = mk("Check"), hintButton = mk("Hint"), reveal = mk("Show the steps"), shuffle = mk("New numbers");
    const status = element("p", "concept-lab__takeaway");
    status.setAttribute("aria-live", "polite");
    const steps = element("ol", "concept-lab__steps");
    steps.hidden = true;
    body.append(controls, question, guessLabel, actions, status, steps);
    root.append(body);

    function resetAnswer() { guess.value = ""; status.textContent = ""; steps.hidden = true; }
    function showSteps() { steps.replaceChildren(...cfg.steps(values).map((line) => element("li", "", line))); steps.hidden = false; }
    function redraw() { question.textContent = cfg.ask(values); }
    check.addEventListener("click", () => {
      const right = cfg.answer(values);
      const given = parseNumber(guess.value);
      if (!Number.isFinite(given)) { status.textContent = "Type a number first, then check it."; return; }
      if (cfg.accept(given, right)) { status.textContent = "✅ Right. Here is the working, so you can compare your method."; showSteps(); }
      else { status.textContent = "❌ Not quite. Try the hint, change your answer, or open the steps."; }
    });
    hintButton.addEventListener("click", () => { status.textContent = "💡 " + cfg.hint(values); });
    reveal.addEventListener("click", () => { status.textContent = `The answer is ${cfg.show(cfg.answer(values))}.`; showSteps(); });
    shuffle.addEventListener("click", () => {
      readers.forEach(({ spec, input, read }) => {
        input.value = spec.options ? String(spec.options[Math.floor(Math.random() * spec.options.length)]) : String(spec.min + Math.floor(Math.random() * (spec.max - spec.min + 1)));
        read();
      });
      if (cfg.text) {
        const pick = cfg.text.samples[Math.floor(Math.random() * cfg.text.samples.length)];
        values.text = pick;
        root.querySelector(".concept-lab__field input[type=text]").value = pick;
      }
      sync(); resetAnswer(); redraw();
    });
    guess.addEventListener("keydown", (event) => { if (event.key === "Enter") check.click(); });
    redraw();
  }

  function initializeConceptLab(root) {
    if (root.dataset.learningReady === "true") return;
    const lab = root.dataset.conceptLab;
    if (!["byte-lens", "address-builder", "angle-lab", "pointer-walk", "scan-filter", "packet-framer", ...Object.keys(PREDICT_LABS)].includes(lab)) return;
    root.dataset.learningReady = "true";
    if (lab === "byte-lens") initializeByteLens(root);
    if (lab === "address-builder") initializeAddressBuilder(root);
    if (lab === "angle-lab") initializeAngleLab(root);
    if (lab === "pointer-walk") initializePointerWalk(root);
    if (lab === "scan-filter") initializeScanFilter(root);
    if (lab === "packet-framer") initializePacketFramer(root);
    if (PREDICT_LABS[lab]) initializePredictLab(root, lab);
  }

  function initializeLearningWidgets(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-ownership-example]").forEach(initializeOwnershipScope);
    root.querySelectorAll(".academy-quiz").forEach(initializeQuiz);
    root.querySelectorAll("[data-concept-lab]").forEach(initializeConceptLab);
  }

  function start() {
    initializeLearningWidgets(document);

    const bookBody = document.querySelector("main") || document.body;
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
