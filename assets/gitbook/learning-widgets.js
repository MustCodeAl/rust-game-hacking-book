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

  function initializeLearningWidgets(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-ownership-example]").forEach(initializeOwnershipScope);
    root.querySelectorAll(".academy-quiz").forEach(initializeQuiz);
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
