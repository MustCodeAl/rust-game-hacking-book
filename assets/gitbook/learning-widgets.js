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

  const REVIEW_BANKS = {
    1: [
      { prompt: "What is an address?", options: ["A numbered location in an address space", "The value stored at that location", "A Rust type", "A CPU instruction"], answer: 0, explanation: "An address tells the computer where bytes begin. It is a location, not the value stored there." },
      { prompt: "Why change one thing at a time during an experiment?", options: ["It makes the game run faster", "It connects one cause to one observed effect", "It removes the need for notes", "It makes every address permanent"], answer: 1, explanation: "One controlled change gives you evidence about cause and effect. Several changes at once make the result ambiguous." },
      { prompt: "Who normally owns the official shared state in a multiplayer game?", options: ["The rendering thread", "The keyboard driver", "The authoritative server", "The newest client"], answer: 2, explanation: "A client draws and predicts, but the authoritative server normally decides the shared result." },
      { prompt: "Why can the same four bytes mean different things?", options: ["Bytes contain hidden field names", "A type supplies the interpretation rule", "Windows changes them while reading", "Every byte is a pointer"], answer: 1, explanation: "Memory stores bits. The selected type decides whether those bits represent an integer, float, pointer, flags, or something else." },
      { prompt: "What is an offset?", options: ["A distance from a starting location", "A second name for a process", "A copied value", "A kind of CPU"], answer: 0, explanation: "An offset is a distance. Add it to a known base to describe another location." }
    ],
    2: [
      { prompt: "What does `cmp` mainly change on x86?", options: ["The compared operands", "CPU flags used by later branches", "The stack size", "The executable file"], answer: 1, explanation: "`cmp` performs subtraction-like flag work without storing the result. A later conditional jump reads those flags." },
      { prompt: "Why must a detour cover whole instructions?", options: ["Rust requires five-byte instructions", "Returning into half an instruction changes the decoded byte stream", "Whole instructions use less memory", "Windows ignores partial instructions"], answer: 1, explanation: "x86 instructions have different lengths. A patch must resume at a real instruction boundary." },
      { prompt: "What should a code cave do with displaced original instructions?", options: ["Forget them", "Replay their required behavior before returning", "Turn them into data", "Run them twice"], answer: 1, explanation: "The detour temporarily owns that code boundary, so it must preserve the original behavior the program still needs." },
      { prompt: "What does `call` place on the stack?", options: ["A return address", "The entire executable", "A page permission", "A process handle"], answer: 0, explanation: "The return address tells `ret` where execution should continue after the called function finishes." },
      { prompt: "What makes a breakpoint observation useful evidence?", options: ["It happened once", "It repeats when the controlled behavior repeats", "The address looks familiar", "The register contains a large number"], answer: 1, explanation: "Repeatable behavior links the paused instruction to the action you are studying." }
    ],
    3: [
      { prompt: "What problem does Rust ownership prevent?", options: ["Two owners freeing the same allocation", "A server sending packets", "A debugger setting breakpoints", "A matrix moving a point"], answer: 0, explanation: "Ownership gives one value responsibility for cleanup and prevents accidental double-free behavior." },
      { prompt: "What does a shared borrow allow?", options: ["Reading without taking ownership", "Writing from every thread", "Keeping a reference forever", "Skipping bounds checks"], answer: 0, explanation: "A shared borrow temporarily allows reading while the owner keeps responsibility for the value." },
      { prompt: "Where should unavoidable raw-pointer work live?", options: ["Throughout the program", "Inside a small documented boundary", "Only in comments", "Inside every loop"], answer: 1, explanation: "A narrow `unsafe` boundary makes the assumptions visible and lets the rest of the program use ordinary safe types." },
      { prompt: "Why wrap a Windows handle in a Rust type with `Drop`?", options: ["To make the handle permanent", "To close it on every normal exit path", "To convert it into a pointer", "To disable errors"], answer: 1, explanation: "RAII cleanup runs when the owning wrapper leaves scope, including early returns." },
      { prompt: "What should happen when expected bytes do not match?", options: ["Patch anyway", "Refuse the operation and explain the mismatch", "Write more bytes", "Restart Windows automatically"], answer: 1, explanation: "A mismatch means your build or location assumption is unproven. Refusal is successful safety behavior." }
    ],
    4: [
      { prompt: "What is a remote snapshot?", options: ["A live Rust reference", "A copied observation from one moment", "A permanent game object", "An executable section"], answer: 1, explanation: "The target can change immediately after a read, so a snapshot is a time-stamped copy, not a live view." },
      { prompt: "How do you reach record number `i` in a fixed-size table?", options: ["base + i × record_size", "base ÷ record_size", "i + field_size", "record_size − base"], answer: 0, explanation: "The index chooses the record stride. A field offset is added only after reaching that record." },
      { prompt: "Why bound a player count before looping?", options: ["To change teams", "To prevent bad metadata from causing huge reads", "To remove inactive players", "To increase FPS"], answer: 1, explanation: "A count read from remote memory is untrusted. A reasonable cap protects the loop and its address math." },
      { prompt: "Why model a bot as explicit states?", options: ["States make timing and stop behavior testable", "States remove all game rules", "States make pointers permanent", "States bypass input"], answer: 0, explanation: "Named states and transitions make the action loop predictable, testable, and easier to stop safely." },
      { prompt: "What sampling rate should an observer use?", options: ["Always the fastest possible", "A rate appropriate for how quickly the value changes", "Exactly once per launch", "The monitor refresh rate"], answer: 1, explanation: "Slow strategy values do not become more truthful when read thousands of times per second." }
    ],
    5: [
      { prompt: "What does subtracting two positions produce?", options: ["A direction from one to the other", "A process handle", "A color", "A file offset"], answer: 0, explanation: "The difference vector describes how far and in which direction the second point lies." },
      { prompt: "Why use `atan2(y, x)` for an angle?", options: ["It preserves quadrant information", "It allocates a matrix", "It removes all wraparound", "It changes screen resolution"], answer: 0, explanation: "The signs of both inputs tell `atan2` which quadrant contains the direction." },
      { prompt: "What should world-to-screen code do with a non-positive clip-space `w`?", options: ["Draw the point", "Reject the point before dividing", "Replace it with 1", "Use its absolute value"], answer: 1, explanation: "For the course projection convention, a non-positive `w` places the point behind the camera." },
      { prompt: "What is the shortest turn from 179° to −179°?", options: ["−358°", "+2°", "+179°", "−180°"], answer: 1, explanation: "Angles wrap at the boundary, so a two-degree forward turn crosses directly to −179°." },
      { prompt: "Why restore graphics state after a diagnostic draw?", options: ["OpenGL state persists into later draws", "The GPU forgets every call", "Rust cannot store colors", "Matrices require cleanup handles"], answer: 0, explanation: "Graphics APIs are state machines. Unrestored settings can accidentally affect unrelated objects." }
    ],
    6: [
      { prompt: "What does TCP provide to an application?", options: ["A stream of ordered bytes", "Preserved message boundaries", "One packet per read", "Only encrypted text"], answer: 0, explanation: "TCP does not know your application message boundaries. Framing must define them." },
      { prompt: "What does UDP preserve?", options: ["A continuous byte stream", "Datagram boundaries", "File offsets", "Function call stacks"], answer: 1, explanation: "Each UDP receive corresponds to a datagram, though delivery and order are not guaranteed." },
      { prompt: "Why is byte order part of a protocol?", options: ["Both sides must agree how multi-byte numbers are arranged", "It chooses the IP address", "It makes packets reliable", "It selects a Rust owner"], answer: 0, explanation: "The same bytes produce different numbers when readers disagree about which byte comes first." },
      { prompt: "What should happen before allocating a length-prefixed payload?", options: ["Trust the advertised length", "Compare it with a strict maximum and available bytes", "Reverse every byte", "Open a process handle"], answer: 1, explanation: "Network lengths are untrusted. Bound them before allocation or slicing." },
      { prompt: "Why test with a captured real fixture?", options: ["An encoder and decoder can share the same mistake", "Fixtures remove all parsing", "TCP requires captures", "It makes the protocol private"], answer: 0, explanation: "A real known frame anchors your implementation to the actual protocol rather than two matching bugs." }
    ],
    7: [
      { prompt: "What should a pattern scanner do with several matches?", options: ["Patch all of them", "Refuse ambiguity and refine the pattern", "Choose the lowest address", "Add more wildcards"], answer: 1, explanation: "Several matches mean the signature is not yet a unique identity." },
      { prompt: "What does a second value scan keep?", options: ["Old candidates that match the new observation", "Every address in the process", "Only executable pages", "Only the first result"], answer: 0, explanation: "Each observation filters the existing candidate set instead of starting over." },
      { prompt: "How do you turn an RVA into a live address?", options: ["module base + RVA", "file offset + pointer size", "RVA − module base", "section count × RVA"], answer: 0, explanation: "An RVA is a distance from the module's live base." },
      { prompt: "What distinguishes PE32 from PE32+ in the optional header?", options: ["The magic value and field layout", "The filename extension", "The section names", "The DOS letters"], answer: 0, explanation: "The optional-header magic selects the 32-bit or 64-bit field layout." },
      { prompt: "Why rewind `EIP` after an `int3` breakpoint?", options: ["The CPU already advanced past the one-byte breakpoint", "To restart the process", "To skip the original instruction", "To enlarge the stack"], answer: 0, explanation: "Rewinding lets the restored original instruction execute from its real start." }
    ],
    8: [
      { prompt: "Why copy a file before parsing or modifying it?", options: ["To preserve a known recovery point", "To change its format", "To remove its header", "To make offsets virtual"], answer: 0, explanation: "An untouched source makes experiments reversible and comparisons trustworthy." },
      { prompt: "What should a parser validate before slicing bytes?", options: ["That offset + length stays inside the file", "Only the filename", "The screen resolution", "The process ID"], answer: 0, explanation: "Checked boundary math prevents truncated or malicious data from becoming an out-of-range access." },
      { prompt: "Why preserve unknown fields when rewriting a format?", options: ["They may carry meaning your tool does not understand", "They are always comments", "They make files smaller", "Rust requires them"], answer: 0, explanation: "Unknown does not mean useless. Dropping it can silently damage compatibility." },
      { prompt: "What makes a mod easy to undo?", options: ["Keeping changes in a separate override folder", "Editing every base file", "Deleting the original", "Changing unrelated assets"], answer: 0, explanation: "A separate mod layer can be disabled or removed without reconstructing the installation." },
      { prompt: "Why parse named fields instead of blind search-and-replace?", options: ["The same text may appear in unrelated contexts", "Search never finds text", "Named fields use no bytes", "It makes every file JSON"], answer: 0, explanation: "Structured parsing changes the intended field and preserves other occurrences." }
    ],
    9: [
      { prompt: "What does `MEM_COMMIT` tell you?", options: ["Storage is committed for the range", "The page is executable", "The page belongs to a DLL", "The address is permanent"], answer: 0, explanation: "State, type, and protection answer different questions. Committed state alone does not grant every access." },
      { prompt: "Why is writable-and-executable memory worth reviewing?", options: ["It combines permissions commonly separated by W^X", "It is always malware", "It cannot contain code", "It is read-only"], answer: 0, explanation: "W+X is not proof of abuse, but it deserves an explanation because writable code is unusually powerful." },
      { prompt: "What does least privilege mean for a process handle?", options: ["Request only the rights the current operation needs", "Always request full access", "Never close the handle", "Use the largest numeric mask"], answer: 0, explanation: "Smaller rights clarify intent and reduce accidental capability." },
      { prompt: "Why can `ReadProcessMemory` fail after `VirtualQueryEx` said a region was readable?", options: ["The target can change between the check and the read", "Addresses are strings", "Pages have no state", "The query writes memory"], answer: 0, explanation: "This is a time-of-check/time-of-use race in a process that keeps running." },
      { prompt: "What should a read-only mapper avoid requesting?", options: ["Write and remote-thread rights", "Query rights", "Read rights", "A process ID"], answer: 0, explanation: "A mapper needs query and read access, not mutation capabilities." }
    ],
    10: [
      { prompt: "What does `ERROR_PIPE_CONNECTED` mean during the named-pipe race?", options: ["A client already connected", "The pipe was deleted", "The message is too large", "The server lost permission"], answer: 0, explanation: "A fast client can connect between pipe creation and the server's connect call." },
      { prompt: "Why prefer a small message enum over a command string?", options: ["It limits input to explicitly supported actions", "It makes every client an administrator", "It runs PowerShell faster", "It shares pointers"], answer: 0, explanation: "Structured messages are data. Arbitrary command strings can accidentally become code execution." },
      { prompt: "What does a shared file mapping share between processes?", options: ["Backing storage, possibly at different virtual addresses", "One Rust reference", "The same thread", "A debugger"], answer: 0, explanation: "Each process maps the same object into its own address space; the virtual addresses may differ." },
      { prompt: "What does a SHA-256 hash help identify?", options: ["The exact bytes of a file", "A process permission", "A window coordinate", "A function argument"], answer: 0, explanation: "A changed byte changes the digest with overwhelming probability, making hashes useful build fingerprints." },
      { prompt: "Why keep ordinary learning tools in user mode?", options: ["A mistake is less likely to crash or corrupt the whole system", "User mode has no memory", "Kernel mode cannot use Rust", "Drivers cannot read files"], answer: 0, explanation: "Kernel code has system-wide privilege. User mode provides a safer failure boundary for these labs." }
    ]
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
    const chapter = Number(root.dataset.quizChapter);
    const reviewBank = REVIEW_BANKS[chapter] || [];
    const seed = String(root.dataset.quizSeed || quizId || chapter);
    const offset = reviewBank.length
      ? Array.from(seed).reduce((total, character) => total + character.charCodeAt(0), 0) % reviewBank.length
      : 0;
    const followUpQuestions = reviewBank.length >= 2
      ? [reviewBank[offset], reviewBank[(offset + 1) % reviewBank.length]]
      : [];
    let selectedAnswer = "";
    let firstQuestionCorrect = false;
    let followUpIndex = 0;
    let followUpSelected = null;
    let followUpCorrect = 0;
    let followUpOptionButtons = [];

    let firstProgress = null;
    let extension = null;
    let extensionProgress = null;
    let extensionPrompt = null;
    let extensionOptions = null;
    let extensionFeedback = null;
    let extensionFeedbackTitle = null;
    let extensionFeedbackText = null;
    let extensionCheck = null;
    let extensionNext = null;
    let extensionBody = null;
    let extensionSummary = null;
    let extensionScore = null;
    let extensionScoreMessage = null;

    if (followUpQuestions.length) {
      firstProgress = element("span", "academy-quiz__question-progress", "Question 1 of 3");
      root.querySelector(".academy-quiz__header").append(firstProgress);

      extension = element("section", "academy-quiz__extension");
      extension.hidden = true;
      const extensionHeader = element("header", "academy-quiz__extension-header");
      const extensionHeaderCopy = element("div", "academy-quiz__extension-title");
      extensionHeaderCopy.append(
        element("span", "academy-quiz__extension-eyebrow", "Keep going"),
        element("h4", "", "Two more questions")
      );
      extensionProgress = element("span", "academy-quiz__question-progress");
      extensionHeader.append(extensionHeaderCopy, extensionProgress);

      extensionBody = element("div", "academy-quiz__extension-body");
      extensionPrompt = element("p", "academy-quiz__extension-prompt");
      extensionOptions = element("div", "academy-quiz__options academy-quiz__extension-options");
      extensionOptions.setAttribute("role", "group");
      extensionOptions.setAttribute("aria-label", "Follow-up answer choices");
      extensionFeedback = element("div", "academy-quiz__extension-feedback");
      extensionFeedback.hidden = true;
      extensionFeedback.setAttribute("aria-live", "polite");
      extensionFeedbackTitle = element("strong", "");
      extensionFeedbackText = element("p", "");
      extensionFeedback.append(extensionFeedbackTitle, extensionFeedbackText);
      const extensionActions = element("div", "academy-quiz__actions");
      extensionCheck = element("button", "academy-quiz__check", "Check answer");
      extensionCheck.type = "button";
      extensionNext = element("button", "academy-quiz__check academy-quiz__check--next", "Next question →");
      extensionNext.type = "button";
      extensionNext.hidden = true;
      extensionActions.append(extensionCheck, extensionNext);
      extensionBody.append(extensionPrompt, extensionOptions, extensionFeedback, extensionActions);

      extensionSummary = element("div", "academy-quiz__extension-summary");
      extensionSummary.hidden = true;
      extensionScore = element("strong", "academy-quiz__extension-score");
      extensionScoreMessage = element("p", "");
      const restart = element("button", "academy-quiz__retry", "Restart this quiz");
      restart.type = "button";
      restart.addEventListener("click", () => reset());
      extensionSummary.append(
        element("span", "academy-quiz__extension-complete", "✅ Quiz complete"),
        extensionScore,
        extensionScoreMessage,
        restart
      );
      extension.append(extensionHeader, extensionBody, extensionSummary);
      root.append(extension);
    }

    function renderFollowUp() {
      if (!extension || !followUpQuestions.length) return;
      const question = followUpQuestions[followUpIndex];
      followUpSelected = null;
      extension.hidden = false;
      extensionBody.hidden = false;
      extensionSummary.hidden = true;
      extensionProgress.textContent = `Question ${followUpIndex + 2} of 3`;
      extensionPrompt.textContent = question.prompt;
      extensionFeedback.hidden = true;
      extensionCheck.hidden = false;
      extensionNext.hidden = true;
      extensionOptions.replaceChildren();
      followUpOptionButtons = question.options.map((optionText, index) => {
        const button = element("button", "academy-quiz__extension-option");
        button.type = "button";
        button.setAttribute("aria-pressed", "false");
        button.append(
          element("span", "academy-quiz__option-letter", String.fromCharCode(65 + index)),
          element("span", "", optionText)
        );
        button.addEventListener("click", () => {
          followUpSelected = index;
          followUpOptionButtons.forEach((candidate, candidateIndex) => {
            const active = candidateIndex === index;
            candidate.classList.toggle("is-selected", active);
            candidate.setAttribute("aria-pressed", String(active));
          });
          extensionFeedback.hidden = true;
        });
        extensionOptions.append(button);
        return button;
      });
    }

    function checkFollowUp() {
      if (followUpSelected === null) {
        extensionFeedback.hidden = false;
        extensionFeedback.className = "academy-quiz__extension-feedback is-unanswered";
        extensionFeedbackTitle.textContent = "Choose an answer first.";
        extensionFeedbackText.textContent = "Make your best prediction, then check it.";
        return;
      }
      const question = followUpQuestions[followUpIndex];
      const wasCorrect = followUpSelected === question.answer;
      if (wasCorrect) followUpCorrect += 1;
      extensionFeedback.hidden = false;
      extensionFeedback.className = `academy-quiz__extension-feedback ${wasCorrect ? "is-correct" : "is-incorrect"}`;
      extensionFeedbackTitle.textContent = wasCorrect ? "✅ Correct" : "❌ Not quite";
      extensionFeedbackText.textContent = question.explanation;
      followUpOptionButtons.forEach((button, index) => {
        button.disabled = true;
        button.classList.toggle("is-correct-answer", index === question.answer);
        button.classList.toggle("is-wrong-answer", index === followUpSelected && !wasCorrect);
      });
      extensionCheck.hidden = true;
      extensionNext.hidden = false;
      extensionNext.textContent = followUpIndex === followUpQuestions.length - 1
        ? "See quiz score →"
        : "Next question →";
    }

    function finishFollowUps() {
      const totalCorrect = (firstQuestionCorrect ? 1 : 0) + followUpCorrect;
      extensionBody.hidden = true;
      extensionSummary.hidden = false;
      extensionProgress.textContent = "Complete";
      extensionScore.textContent = `${totalCorrect} / 3`;
      extensionScoreMessage.textContent = totalCorrect === 3
        ? "Excellent — you understood all three ideas."
        : "Read the explanations, then try again. Understanding matters more than speed.";
    }

    function resetFollowUps() {
      followUpIndex = 0;
      followUpSelected = null;
      followUpCorrect = 0;
      followUpOptionButtons = [];
      if (!extension) return;
      extension.hidden = true;
      extensionBody.hidden = false;
      extensionSummary.hidden = true;
      extensionFeedback.hidden = true;
      extensionOptions.replaceChildren();
      extensionCheck.hidden = false;
      extensionNext.hidden = true;
      extensionProgress.textContent = "Question 2 of 3";
    }

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
      firstQuestionCorrect = wasCorrect;
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
      if (followUpQuestions.length) renderFollowUp();
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
      firstQuestionCorrect = false;
      if (firstProgress) firstProgress.textContent = "Question 1 of 3";
      resetFollowUps();
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
    if (extensionCheck) extensionCheck.addEventListener("click", checkFollowUp);
    if (extensionNext) {
      extensionNext.addEventListener("click", () => {
        if (followUpIndex === followUpQuestions.length - 1) {
          finishFollowUps();
          return;
        }
        followUpIndex += 1;
        renderFollowUp();
      });
    }
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

  function initializePointerWalk(root) {
    root.replaceChildren();
    root.append(
      makeLabHeader(
        "Pointer walk",
        "Follow a chain one operation at a time",
        "Step through a tiny fake address space. Notice when the tool adds an offset and when it reads a pointer stored at the resulting address."
      )
    );

    const steps = [
      { label: "Module base", value: "0x00400000", operation: "Start at a location Windows can resolve each run." },
      { label: "Root slot", value: "0x00400120", operation: "Add 0x120. This calculates an address; it does not read memory yet." },
      { label: "Manager", value: "0x00500000", operation: "Read the pointer stored in the root slot. This is the first dereference." },
      { label: "Player", value: "0x00700000", operation: "Add 0x18, then read the pointer stored there. This is the second dereference." },
      { label: "Gold field", value: "0x00700030", operation: "Add the final field offset 0x30. Read the gold value here; do not follow it as another pointer." }
    ];

    const body = element("div", "concept-lab__body");
    const path = element("div", "concept-lab__pointer-path");
    const cards = steps.map((step, index) => {
      const card = element("button", "concept-lab__pointer-node");
      card.type = "button";
      card.dataset.pointerStep = String(index);
      card.append(
        element("span", "concept-lab__pointer-step", `Step ${index + 1}`),
        element("strong", "", step.label),
        element("code", "", step.value)
      );
      path.append(card);
      return card;
    });
    const explanation = element("div", "concept-lab__pointer-explanation");
    const explanationTitle = element("strong", "");
    const explanationText = element("p", "");
    explanation.append(explanationTitle, explanationText);
    const controls = element("div", "concept-lab__step-controls");
    const previous = element("button", "concept-lab__example", "← Previous");
    previous.type = "button";
    const next = element("button", "concept-lab__example", "Next →");
    next.type = "button";
    controls.append(previous, next);
    body.append(path, explanation, controls);
    root.append(body);

    let activeStep = 0;
    function render(step) {
      activeStep = Math.max(0, Math.min(steps.length - 1, step));
      cards.forEach((card, index) => {
        card.classList.toggle("is-active", index === activeStep);
        card.classList.toggle("is-visited", index < activeStep);
        card.setAttribute("aria-current", index === activeStep ? "step" : "false");
      });
      explanationTitle.textContent = `${steps[activeStep].label} · ${steps[activeStep].value}`;
      explanationText.textContent = steps[activeStep].operation;
      previous.disabled = activeStep === 0;
      next.disabled = activeStep === steps.length - 1;
    }
    cards.forEach((card) => card.addEventListener("click", () => render(Number(card.dataset.pointerStep))));
    previous.addEventListener("click", () => render(activeStep - 1));
    next.addEventListener("click", () => render(activeStep + 1));
    render(0);
  }

  function initializeScanFilter(root) {
    root.replaceChildren();
    root.append(
      makeLabHeader(
        "Scan simulator",
        "Watch candidates disappear",
        "Each new in-game observation filters the addresses that survived the previous scan. Click through three observations."
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

  function initializeConceptLab(root) {
    if (root.dataset.learningReady === "true") return;
    const lab = root.dataset.conceptLab;
    if (!["byte-lens", "address-builder", "angle-lab", "pointer-walk", "scan-filter", "packet-framer"].includes(lab)) return;
    root.dataset.learningReady = "true";
    if (lab === "byte-lens") initializeByteLens(root);
    if (lab === "address-builder") initializeAddressBuilder(root);
    if (lab === "angle-lab") initializeAngleLab(root);
    if (lab === "pointer-walk") initializePointerWalk(root);
    if (lab === "scan-filter") initializeScanFilter(root);
    if (lab === "packet-framer") initializePacketFramer(root);
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
