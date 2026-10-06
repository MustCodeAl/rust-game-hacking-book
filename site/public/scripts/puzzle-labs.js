/* Explore-first puzzles for the lessons: code blanks and a state machine builder.
 *
 * Both open already working, so a reader who never clicks still learns the idea.
 * Nothing is graded and nothing is required. Each puzzle is plain data:
 *   - add an entry to CODE_BLANKS ("blanks-...") or STATE_MACHINES ("fsm-..."),
 *   - then put <ConceptLab lab="that-name" /> in a lesson.
 * learning-widgets.js loads this file only on pages that contain one of them.
 */
(function () {
  "use strict";

  // Small syntax highlighter for lab code (Rust, Lua, Python-like, assembly).
  function academyGuessLang(text) {
    if (/\b(mov|lea|push|pop|jmp)\b\s/.test(text)) return "asm";
    if (/\b(local|function|then|elseif)\b/.test(text) && !/\bfn\b|\blet\b/.test(text)) return "lua";
    if (/^\s*(def |for .* in .*:|#)/m.test(text) && !/[{};]/.test(text)) return "py";
    return "rust";
  }
  function academyHighlight(text, lang) {
    var KW = " fn let mut if else match return use struct enum impl for while in loop const pub as break continue local function end then elseif do not and or def import from mov lea push pop jmp call ret cmp add sub xor test nop ";
    var LIT = " true false nil None Some Ok Err self null True False ";
    var comment = lang === "lua" ? "--" : lang === "py" ? "#" : lang === "asm" ? ";" : "//";
    var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
    var span = function (k, s) { return '<span class="hl-' + k + '">' + esc(s) + "</span>"; };
    var out = "", i = 0, m;
    while (i < text.length) {
      var rest = text.slice(i);
      if (rest.indexOf(comment) === 0) { out += span("c", rest); break; }
      if ((m = /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/.exec(rest))) { out += span("s", m[0]); i += m[0].length; continue; }
      if (!/\w/.test(text.charAt(i - 1)) && (m = /^0x[0-9a-fA-F_]+|^\d[\d_.]*/.exec(rest))) { out += span("n", m[0]); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_]\w*/.exec(rest))) {
        var w = m[0], after = rest.charAt(w.length);
        var kind = KW.indexOf(" " + w + " ") >= 0 ? "k" : LIT.indexOf(" " + w + " ") >= 0 ? "l" : after === "(" ? "f" : /^[A-Z]/.test(w) ? "t" : "";
        out += kind ? span(kind, w) : esc(w); i += w.length; continue;
      }
      out += esc(text.charAt(i)); i++;
    }
    return out;
  }


  const { element, makeLabHeader } = window.AcademyLearning;
  const SVG_NS = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------------------
  // Data: code blanks. `code` lines hold {1}, {2}... markers, one per blank.
  // Every blank has the answer from the lesson and `effects`: a plain-English
  // line for each piece that is worth trying there. Other pieces get a generic line.
  // ---------------------------------------------------------------------------
  const CODE_BLANKS = {
    "blanks-dead-zone": {
      title: "Try changing the dead zone function",
      description: "This is the lesson's dead_zone function, already filled in. Try swapping a piece and read what that version would do to the stick.",
      code: [
        "fn dead_zone(v: f32, d: f32) -> f32 {",
        "    if {1} < d {",
        "        0.0",
        "    } else {",
        "        {2} * (v.abs() - d) / {3}",
        "    }",
        "}",
      ],
      bank: ["v.abs()", "v", "v.signum()", "(1.0 - d)", "1.0"],
      blanks: [
        { answer: "v.abs()", effects: {
          "v.abs()": "the size of the push is compared with d, so a small push left (-0.1) is ignored just like a small push right (0.1).",
          "v": "a push left such as -0.5 is always smaller than d, so every left push would be thrown away as 'inside the dead zone' while right pushes still work. The stick would feel dead on one side.",
        } },
        { answer: "v.signum()", effects: {
          "v.signum()": "the sign (+1 or -1) is put back after the size was reduced, so a push left stays a push left.",
          "v.abs()": "the result would always be positive, so pushing the stick left would move the character right.",
          "v": "multiplying by v shrinks the output a second time instead of only restoring the sign: 0.5 would come out near 0.21 instead of 0.41.",
        } },
        { answer: "(1.0 - d)", effects: {
          "(1.0 - d)": "dividing by the width of the live range stretches it back to a full 0 to 1, so a full push of 1.0 comes out as exactly 1.0.",
          "1.0": "without dividing by (1 - d) the top of the range is lost: a full push would only come out as 0.85.",
        } },
      ],
      why: "Compare the size of the push, subtract the dead zone, divide by what is left of the range, then put the sign back: the output is 0 inside the dead zone and still reaches exactly 1.0 at a full push.",
    },

    "blanks-checked-pointer": {
      title: "Try changing the pointer resolver",
      description: "This is the end of the lesson's resolver, already filled in. Try swapping a piece and read what that version would do when the game gives it a bad pointer.",
      code: [
        "let side = read_u32(game_slot)? as usize;",
        "if side == {1} {",
        "    return Err(ResolveError::NullPointer { step: 1 });",
        "}",
        "side.{2}(GOLD_OFFSET)",
        "    .ok_or(ResolveError::{3})",
      ],
      bank: ["0", "GOLD_OFFSET", "checked_add", "wrapping_add", "AddressOverflow"],
      blanks: [
        { answer: "0", effects: {
          "0": "a null pointer is address 0, so this catches 'the game has not created this object yet' and returns a clear error instead of reading near address zero.",
          "GOLD_OFFSET": "this only fires when the pointer happens to equal 4. A real null pointer (0) would slip through and be treated as an address.",
        } },
        { answer: "checked_add", effects: {
          "checked_add": "it answers None if the sum would not fit in a usize, and .ok_or turns that None into an AddressOverflow error.",
          "wrapping_add": "it returns a plain number and quietly wraps past the top of memory, so an overflow would go unnoticed (and .ok_or would not even compile on a plain number).",
        } },
        { answer: "AddressOverflow", effects: {
          "AddressOverflow": "the error says what really went wrong: the offset pushed the address past the end of the address space.",
        } },
      ],
      why: "A null pointer and an overflowing offset are different failures, so each gets its own check and its own error: the resolver reports what happened instead of reading a bad address.",
    },

    "blanks-work-queue": {
      title: "Try changing the work queue",
      description: "This is the lesson's atomic work queue, already filled in. Try swapping a piece and read what the workers would do.",
      code: [
        "loop {",
        "    let index = next_region.{1}(1, Ordering::AcqRel);",
        "    let Some(region) = snapshots.get(index) else {",
        "        {2};",
        "    };",
        "    // scan `region` here",
        "}",
      ],
      bank: ["fetch_add", "load", "break", "continue"],
      blanks: [
        { answer: "fetch_add", effects: {
          "fetch_add": "one atomic step adds 1 and hands back the old number, so no two workers can ever receive the same region number.",
          "load": "load only reads the counter and never moves it forward, so workers would keep getting the same region number and rescan it.",
        } },
        { answer: "break", effects: {
          "break": "once get answers None the list has run out, so the worker leaves its loop and finishes.",
          "continue": "the worker would jump back and ask for the next number, which is past the end again, so it would spin forever and never finish.",
        } },
      ],
      why: "The shared counter hands out each region number exactly once, and running off the end of the list is the signal for a worker to finish.",
    },

    "blanks-magic-bytes": {
      title: "Try changing the file-type check",
      description: "This checks whether a file looks like gzip, already filled in. Try swapping a piece and read what that check would do.",
      code: [
        "let head = first_bytes(path, 16)?;",
        "let looks_like_gzip = head.{1}(&[{2}, {3}]);",
      ],
      bank: ["starts_with", "contains", "0x1F", "0x8B", "0x89"],
      blanks: [
        { answer: "starts_with", effects: {
          "starts_with": "it checks only the first bytes, exactly where a format puts its signature, and it is safe even if a short read returned fewer than 16 bytes.",
          "contains": "contains asks about one byte anywhere in the list, not a two-byte signature at the front, so it would not compile here (and a signature in the middle of a file is not a magic number anyway).",
        } },
        { answer: "0x1F", effects: {
          "0x1F": "gzip files begin with 1F, so this is the first byte of the signature.",
          "0x8B": "the signature is 1F then 8B. Starting with 8B would reject real gzip files.",
          "0x89": "89 begins the PNG signature (89 50 4E 47 ...), so this would look for 89 8B, which no common format starts with.",
        } },
        { answer: "0x8B", effects: {
          "0x8B": "gzip files continue with 8B, so 1F 8B together identify gzip without trusting the extension.",
          "0x1F": "that would test for 1F 1F, which is not gzip, so real gzip files would be missed.",
          "0x89": "1F 89 is not gzip's signature (1F 8B), so real gzip files would be missed.",
        } },
      ],
      why: "A format's signature sits at the very start of the file, so checking the first bytes (1F 8B for gzip) identifies the kind without trusting the extension.",
    },

    "blanks-recheck-write": {
      title: "Try changing the check-then-write",
      description: "This is the lesson's repaired version, already filled in: both checks sit right beside the write. Try swapping a piece and read what that version would do.",
      code: [
        "if target.build_id {1} expected_build {",
        "    return Err(\"wrong build\");",
        "}",
        "if target.byte != {2} {",
        "    return Err(\"state changed\");",
        "}",
        "target.byte = {3};",
      ],
      bank: ["!=", "==", "expected_byte", "replacement"],
      blanks: [
        { answer: "!=", effects: {
          "!=": "it refuses when the build is not the one we tested against, so a different game version is never touched.",
          "==": "that flips the rule: the code would refuse the build we expect and happily write to any other build.",
        } },
        { answer: "expected_byte", effects: {
          "expected_byte": "it compares the byte that is there now with the byte we saw when we planned the patch; if something changed it in between, we refuse.",
          "replacement": "this compares with the new value, so the check would fail on every normal run and the patch would never be written.",
        } },
        { answer: "replacement", effects: {
          "replacement": "it writes the new byte, and only after both checks just above have passed.",
          "expected_byte": "that writes the old byte back over itself, so nothing would change.",
        } },
      ],
      why: "The checks sit right next to the write, so the decision is as fresh as it can be: a wrong build or a changed byte ends in a calm refusal, not a blind write.",
    },
  };

  // ---------------------------------------------------------------------------
  // Data: state machines. The `edges` are the lesson's complete machine; the
  // reader may remove or add arrows. Replaying `inputs` from `start` shows the
  // result. `ifMissing` says in one line what removing that arrow would cost.
  // No arrow for an input means "stay where you are". `terminal` states are not
  // reported as dead ends.
  // ---------------------------------------------------------------------------
  const STATE_MACHINES = {
    "fsm-lua-bot": {
      title: "What happens if an arrow goes missing?",
      description: "This is the Lua bot from the lesson, already complete. Press Replay to watch six scripted inputs run through it, then try removing or adding an arrow to see what changes.",
      actor: "the bot",
      viewBox: [700, 290],
      start: "observe",
      terminal: ["stop"],
      states: [
        { id: "observe", label: "Observe", x: 58, y: 150 },
        { id: "choose", label: "Choose", x: 230, y: 80 },
        { id: "request", label: "Request", x: 450, y: 80 },
        { id: "wait", label: "Wait", x: 450, y: 230 },
        { id: "stop", label: "Stop", x: 638, y: 80 },
      ],
      triggers: ["snapshot stored", "candidate found", "no candidate", "request sent", "not yet confirmed", "selection confirmed", "ticks reach 0"],
      edges: [
        { from: "observe", on: "snapshot stored", to: "choose", ifMissing: "Without this arrow the bot would sit in Observe forever and never choose anything." },
        { from: "choose", on: "candidate found", to: "request", ifMissing: "Without this arrow the bot finds a unit but never asks the host to select it." },
        { from: "choose", on: "no candidate", to: "stop", ifMissing: "Without this arrow an empty battlefield leaves the bot stuck in Choose with nothing to do." },
        { from: "request", on: "request sent", to: "wait", ifMissing: "Without this arrow the bot would never move on to waiting for the answer." },
        { from: "wait", on: "selection confirmed", to: "observe", ifMissing: "Without this arrow the bot never notices that its request worked, so it can never start the next round." },
        { from: "wait", on: "ticks reach 0", to: "stop", ifMissing: "Without this arrow a request that never gets confirmed would make the bot wait forever." },
      ],
      inputs: ["snapshot stored", "candidate found", "request sent", "not yet confirmed", "selection confirmed", "snapshot stored"],
    },

    "fsm-macro-loop": {
      title: "What happens if an arrow goes missing?",
      description: "This is the recruitment macro from the lesson, already complete. Press Replay to watch six scripted inputs run through it, then try removing or adding an arrow to see what changes. (The lesson's Stopped state is left out to keep the picture readable; there, a stop request overrides every state.)",
      actor: "the macro",
      viewBox: [680, 290],
      start: "waiting",
      states: [
        { id: "waiting", label: "Waiting", x: 58, y: 145 },
        { id: "ready", label: "Ready", x: 270, y: 145 },
        { id: "acting", label: "Acting", x: 510, y: 145 },
        { id: "cooldown", label: "Cooldown", x: 390, y: 45 },
        { id: "recovering", label: "Recovering", x: 390, y: 245 },
      ],
      triggers: ["player available", "enough resources", "action confirmed", "action failed", "timer elapsed", "state valid again"],
      edges: [
        { from: "waiting", on: "player available", to: "ready", ifMissing: "Without this arrow the macro never leaves Waiting, even when a match is running." },
        { from: "ready", on: "enough resources", to: "acting", ifMissing: "Without this arrow the macro never spends resources, so it never acts." },
        { from: "acting", on: "action confirmed", to: "cooldown", ifMissing: "Without this arrow a confirmed action leaves the macro stuck in Acting." },
        { from: "acting", on: "action failed", to: "recovering", ifMissing: "Without this arrow a refused action leaves the macro in Acting, and it never recovers." },
        { from: "cooldown", on: "timer elapsed", to: "ready", ifMissing: "Without this arrow the macro acts once and then never again." },
        { from: "recovering", on: "state valid again", to: "ready", ifMissing: "Without this arrow one failed action leaves the macro stuck in Recovering for good." },
      ],
      inputs: ["player available", "enough resources", "action confirmed", "timer elapsed", "enough resources", "action failed"],
    },
  };

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------
  const sound = (kind) => document.dispatchEvent(new CustomEvent("academy:sound", { detail: { kind } }));
  const reducedMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const cleanId = (root, fallback) => String(root.dataset.conceptId || fallback).replace(/[^a-z0-9_-]/gi, "-");
  function actionButton(text) {
    const b = element("button", "concept-lab__example", text);
    b.type = "button";
    return b;
  }
  function svgEl(tag, attrs, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const listWords = (items) => items.length < 3 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

  // ---------------------------------------------------------------------------
  // Code blanks
  // ---------------------------------------------------------------------------
  function mountCodeBlanks(root, cfg) {
    const id = cleanId(root, "blanks");
    root.replaceChildren(makeLabHeader("Explore the code", cfg.title, cfg.description));
    const body = element("div", "concept-lab__body code-blanks");
    const answers = cfg.blanks.map((b) => b.answer);
    const current = answers.slice();
    let marks = [];
    let pickedToken = null;
    let pickedBlank = null;

    const code = element("div", "code-blanks__code");
    code.setAttribute("role", "group");
    code.setAttribute("aria-label", `Code with ${answers.length} changeable pieces`);
    const blankButtons = [];
    const codeLang = academyGuessLang(cfg.code.join("\n").replace(/\{\d+\}/g, "x"));
    cfg.code.forEach((line) => {
      const row = element("div", "code-blanks__line");
      line.split(/\{(\d+)\}/).forEach((part, i) => {
        if (i % 2 === 0) {
          if (part) { const piece = document.createElement("span"); piece.innerHTML = academyHighlight(part, codeLang); row.append(piece); }
          return;
        }
        const index = Number(part) - 1;
        const blank = element("button", "code-blanks__blank");
        blank.type = "button";
        blank.id = `${id}-blank-${index + 1}`;
        blank.addEventListener("click", () => onBlank(index));
        blank.addEventListener("keydown", (event) => {
          if (event.key === "Escape" || event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            clearBlank(index);
          }
        });
        blank.addEventListener("dragover", (event) => { event.preventDefault(); blank.classList.add("is-over"); });
        blank.addEventListener("dragleave", () => blank.classList.remove("is-over"));
        blank.addEventListener("drop", (event) => {
          event.preventDefault();
          blank.classList.remove("is-over");
          const token = event.dataTransfer.getData("text/plain");
          if (cfg.bank.includes(token)) place(index, token);
        });
        blankButtons[index] = blank;
        row.append(blank);
      });
      code.append(row);
    });

    const effect = element("p", "concept-lab__takeaway code-blanks__effect",
      "Try other pieces: pick one below, then a blank (or drag it there). A line here will say what that version would do.");
    effect.setAttribute("role", "status");
    const summary = element("p", "code-blanks__summary");

    const bank = element("div", "code-blanks__bank");
    bank.setAttribute("role", "group");
    bank.setAttribute("aria-label", "Pieces to try");
    bank.append(element("span", "concept-lab__example-label", "Try other pieces"));
    const tokenButtons = new Map();
    cfg.bank.forEach((token) => {
      const b = element("button", "concept-lab__example code-blanks__token", token);
      b.type = "button";
      b.draggable = true;
      b.addEventListener("click", () => onToken(token));
      b.addEventListener("dragstart", (event) => { event.dataTransfer.setData("text/plain", token); event.dataTransfer.effectAllowed = "copy"; });
      tokenButtons.set(token, b);
      bank.append(b);
    });
    const emptyToken = element("button", "concept-lab__example code-blanks__token code-blanks__token--empty", "empty the blank");
    emptyToken.type = "button";
    emptyToken.addEventListener("click", () => onToken(""));
    tokenButtons.set("", emptyToken);
    bank.append(emptyToken);
    bank.append(element("small", "code-blanks__tip", "Tap a piece, then a blank. On a keyboard, press Enter on a piece, then on a blank. Escape or Delete empties the blank you are on."));

    const actions = element("div", "concept-lab__examples code-blanks__actions");
    const showAnswer = actionButton("Show the answer");
    const check = actionButton("Check my pieces");
    const hint = actionButton("Give me a hint");
    const clearAll = actionButton("Empty the blanks");
    actions.append(showAnswer, check, hint, clearAll);

    const why = element("p", "code-blanks__why");
    why.append(element("strong", "", "Why the lesson's version works. "), document.createTextNode(cfg.why));

    body.append(code, effect, bank, summary, actions, why);
    root.append(body);

    // One message box, three looks: info (a selection prompt), good (the lesson's
    // choice), warn (a different choice and what it would do).
    function say(text, tone) {
      effect.textContent = text;
      effect.setAttribute("data-tone", tone);
      effect.setAttribute("data-tone-explicit", "1");
    }

    effect.setAttribute("data-tone", "info");
    effect.setAttribute("data-tone-explicit", "1");

    function effectLine(index, token) {
      if (!token) return `Blank ${index + 1} is empty, so this line is unfinished. Pick a piece to see what it would do.`;
      const note = (cfg.blanks[index].effects || {})[token];
      const lead = `With ${token} in blank ${index + 1}${token === answers[index] ? " (the lesson's choice)" : ""}: `;
      return lead + (note || "that piece does not belong in this spot, so the code would not compile or would not do its job.");
    }

    function render() {
      blankButtons.forEach((button, i) => {
        const token = current[i];
        button.textContent = token || "    ";
        button.className = "code-blanks__blank" + (token ? " is-filled" : "") + (marks[i] ? ` is-${marks[i]}` : "") + (pickedBlank === i ? " is-picked" : "") + (token && token !== answers[i] ? " is-differs" : "");
        const markNote = { match: ", matches the lesson", other: ", differs from the lesson", hint: ", filled in by the hint" }[marks[i]] || "";
        button.setAttribute("aria-pressed", pickedBlank === i ? "true" : "false");
        button.setAttribute("aria-label", `Blank ${i + 1} of ${answers.length}: ${token || "empty"}${markNote}. Press Enter to pick it, Delete to empty it.`);
      });
      tokenButtons.forEach((button, token) => {
        const picked = pickedToken === token;
        button.classList.toggle("is-picked", picked);
        button.setAttribute("aria-pressed", picked ? "true" : "false");
      });
      const differs = current.map((token, i) => (token === answers[i] ? 0 : i + 1)).filter(Boolean);
      summary.textContent = differs.length === 0
        ? "This is the lesson's working version."
        : `This version differs from the lesson's in blank ${listWords(differs.map(String))}. Show the answer puts the lesson's version back.`;
      summary.classList.toggle("is-working", differs.length === 0);
    }

    function place(index, token) {
      current[index] = token;
      marks = [];
      pickedToken = null;
      pickedBlank = null;
      say(effectLine(index, token), !token ? "info" : token === answers[index] ? "good" : "warn");
      render();
      blankButtons[index].focus();
    }
    function clearBlank(index) {
      if (current[index]) place(index, "");
      else { pickedBlank = null; pickedToken = null; render(); }
    }
    function onToken(token) {
      if (pickedBlank !== null) { place(pickedBlank, token); return; }
      pickedToken = pickedToken === token ? null : token;
      say(pickedToken === null ? "Pick a piece, then a blank." : `${token || "Empty"} selected. Choose a blank.`, "info");
      render();
    }
    function onBlank(index) {
      if (pickedToken !== null) { place(index, pickedToken); return; }
      pickedBlank = pickedBlank === index ? null : index;
      say(pickedBlank === null ? "Pick a piece, then a blank." : `Blank ${index + 1} selected${current[index] ? ` (holds ${current[index]})` : " (empty)"}. Choose a piece.`, "info");
      render();
    }

    showAnswer.addEventListener("click", () => {
      answers.forEach((a, i) => { current[i] = a; });
      marks = []; pickedToken = null; pickedBlank = null;
      say(`Here is the lesson's version. ${cfg.why}`, "good");
      render();
    });
    clearAll.addEventListener("click", () => {
      current.fill("");
      marks = []; pickedToken = null; pickedBlank = null;
      say("All the blanks are empty. Pick a piece, then a blank, to build a version of your own.", "info");
      render();
    });
    check.addEventListener("click", () => {
      marks = current.map((token, i) => (token === answers[i] ? "match" : "other"));
      const differs = marks.map((m, i) => (m === "other" ? String(i + 1) : "")).filter(Boolean);
      if (differs.length === 0) {
        sound("correct");
        say(`Every blank matches the lesson's version. ${cfg.why}`, "good");
      } else {
        say(`Blank ${listWords(differs)} ${differs.length === 1 ? "works" : "work"} differently from the lesson's version. Click a blank to read what its piece would do, or ask for a hint.`, "warn");
      }
      render();
    });
    hint.addEventListener("click", () => {
      const index = current.findIndex((token, i) => token !== answers[i]);
      if (index === -1) { say("Nothing to hint: every blank already matches the lesson's version.", "good"); return; }
      current[index] = answers[index];
      marks = [];
      marks[index] = "hint";
      pickedToken = null; pickedBlank = null;
      say("Hint. " + effectLine(index, answers[index]), "info");
      render();
    });
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && (pickedToken !== null || pickedBlank !== null)) {
        pickedToken = null; pickedBlank = null;
        say("Nothing is picked. Pick a piece, then a blank.", "info");
        render();
      }
    });
    render();
  }

  // ---------------------------------------------------------------------------
  // State machine builder
  // ---------------------------------------------------------------------------
  function mountStateMachine(root, cfg) {
    const id = cleanId(root, "fsm");
    const NODE_W = 92;
    const NODE_H = 34;
    const [W, H] = cfg.viewBox;
    root.replaceChildren(makeLabHeader("Explore the machine", cfg.title, cfg.description));
    const body = element("div", "concept-lab__body fsm");

    const nodeMap = new Map(cfg.states.map((s) => [s.id, s]));
    const name = (sid) => nodeMap.get(sid).label;
    const baseline = cfg.edges.map((e) => ({ ...e }));
    let edges = baseline.map((e) => ({ ...e }));
    const edgeKey = (e) => `${e.from}|${e.on}`;
    const sameArrow = (a, b) => a.from === b.from && a.on === b.on && a.to === b.to;

    // Feeding one input into a state: the arrow for (state, input), else stay put.
    function run(list) {
      let state = cfg.start;
      return cfg.inputs.map((input) => {
        const arrow = list.find((e) => e.from === state && e.on === input);
        const row = { input, from: state, to: arrow ? arrow.to : state, moved: !!arrow, arrow };
        state = row.to;
        return row;
      });
    }
    const baseTrace = run(baseline);
    const endOf = (trace) => (trace.length ? trace[trace.length - 1].to : cfg.start);

    let fromState = null;
    let pending = null;
    let selectedEdge = null;
    let walk = null;
    let timer = null;
    let lastAction = null;

    // --- layout -------------------------------------------------------------
    function clip(center, target) {
      const vx = target.x - center.x;
      const vy = target.y - center.y;
      if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) return { x: center.x, y: center.y };
      const t = Math.min(vx ? (NODE_W / 2 + 5) / Math.abs(vx) : Infinity, vy ? (NODE_H / 2 + 5) / Math.abs(vy) : Infinity);
      return { x: center.x + vx * t, y: center.y + vy * t };
    }
    function detour(A, B, px, py) {
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const len2 = dx * dx + dy * dy || 1;
      let hit = null;
      nodeMap.forEach((C) => {
        if (C === A || C === B) return;
        const t = ((C.x - A.x) * dx + (C.y - A.y) * dy) / len2;
        if (t < 0 || t > 1) return;
        if (Math.hypot(C.x - (A.x + t * dx), C.y - (A.y + t * dy)) < 36) hit = C;
      });
      if (!hit) return 0;
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2;
      const d1 = Math.hypot(mx + px * 62 - hit.x, my + py * 62 - hit.y);
      const d2 = Math.hypot(mx - px * 62 - hit.x, my - py * 62 - hit.y);
      if (Math.abs(d1 - d2) < 1) return py < 0 ? 62 : -62;
      return d1 > d2 ? 62 : -62;
    }
    function layout(list) {
      const groups = new Map();
      list.forEach((e) => {
        const k = [e.from, e.to].sort().join("|");
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(e);
      });
      const out = new Map();
      groups.forEach((group) => {
        const [lo, hi] = [group[0].from, group[0].to].sort();
        const A = nodeMap.get(lo);
        const B = nodeMap.get(hi);
        const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        const px = -(B.y - A.y) / len;
        const py = (B.x - A.x) / len;
        group.sort((a, b) => edgeKey(a).localeCompare(edgeKey(b)));
        group.forEach((e, k) => {
          const off = group.length === 1 ? detour(A, B, px, py) : (k - (group.length - 1) / 2) * 40;
          const mx = (A.x + B.x) / 2 + px * off;
          const my = (A.y + B.y) / 2 + py * off;
          const ctrl = { x: (A.x + B.x) / 2 + px * off * 2, y: (A.y + B.y) / 2 + py * off * 2 };
          const start = clip(nodeMap.get(e.from), ctrl);
          const end = clip(nodeMap.get(e.to), ctrl);
          out.set(edgeKey(e), { d: `M${start.x.toFixed(1)} ${start.y.toFixed(1)} Q${ctrl.x.toFixed(1)} ${ctrl.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`, lx: mx, ly: my });
        });
      });
      return out;
    }

    // --- static structure ---------------------------------------------------
    const howto = element("p", "fsm__howto");
    howto.append(
      element("strong", "", "How to read it. "),
      document.createTextNode("An arrow says: in this state, when this input arrives, move to that state. If no arrow matches an input, the machine stays where it is.")
    );

    const viewport = element("div", "fsm__viewport");
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "fsm__svg", role: "group", "aria-label": `State machine with ${cfg.states.length} states. Click a state, then another state, to draw an arrow. The list of arrows below does the same job.` });
    const defs = svgEl("defs");
    [["", "fsm__arrow"], ["-hot", "fsm__arrow fsm__arrow--hot"]].forEach(([suffix, cls]) => {
      const marker = svgEl("marker", { id: `${id}-arrow${suffix}`, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: "userSpaceOnUse", orient: "auto" });
      marker.append(svgEl("path", { d: "M0 0 L10 5 L0 10 z", class: cls }));
      defs.append(marker);
    });
    const edgeLayer = svgEl("g", { class: "fsm__edges" });
    const nodeLayer = svgEl("g", { class: "fsm__nodes" });
    svg.append(defs, edgeLayer, nodeLayer);
    viewport.append(svg);

    const nodeEls = new Map();
    cfg.states.forEach((s) => {
      const g = svgEl("g", { class: "fsm__node", role: "button", tabindex: "0", transform: `translate(${s.x} ${s.y})` });
      g.append(
        svgEl("rect", { x: -NODE_W / 2, y: -NODE_H / 2, width: NODE_W, height: NODE_H, rx: 9 }),
        svgEl("text", { x: 0, y: 5, "text-anchor": "middle" }, s.label)
      );
      if (s.id === cfg.start) g.append(svgEl("text", { x: 0, y: -NODE_H / 2 - 6, "text-anchor": "middle", class: "fsm__start" }, "start"));
      g.addEventListener("click", () => onNode(s.id));
      g.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onNode(s.id); }
      });
      nodeEls.set(s.id, g);
      nodeLayer.append(g);
    });

    const scrollTip = element("p", "fsm__scroll-tip", "The picture is wider than a phone: swipe it sideways. The list of arrows at the bottom does the same job.");
    const status = element("p", "fsm__status");
    status.setAttribute("role", "status");
    const adder = element("div", "fsm__adder");
    adder.hidden = true;
    const adderTitle = element("strong", "fsm__adder-title");
    const selectLabel = element("label", "fsm__select-label", "When this input arrives: ");
    const select = element("select", "concept-lab__text-input fsm__select");
    select.id = `${id}-trigger`;
    selectLabel.htmlFor = select.id;
    const addButton = actionButton("Add the arrow");
    const cancelButton = actionButton("Cancel");
    adder.append(adderTitle, selectLabel, select, addButton, cancelButton);

    const edgeBar = element("div", "fsm__edge-bar");
    edgeBar.hidden = true;
    const edgeBarText = element("span", "fsm__edge-bar-text");
    const removeSelected = actionButton("Remove this arrow");
    edgeBar.append(edgeBarText, removeSelected);

    const actions = element("div", "concept-lab__examples fsm__actions");
    const replayButton = actionButton("Replay the inputs");
    const hintButton = actionButton("Hint: put one arrow back");
    const emptyButton = actionButton("Start from empty");
    const resetButton = actionButton("Reset");
    actions.append(replayButton, hintButton, emptyButton, resetButton);

    const change = element("p", "concept-lab__takeaway fsm__change");
    change.setAttribute("role", "status");

    const traceHeading = element("p", "concept-lab__example-label fsm__trace-heading", "Replay of the scripted inputs");
    const traceList = element("ol", "fsm__trace");
    const traceEnd = element("p", "fsm__end");

    const listHeading = element("p", "concept-lab__example-label fsm__trace-heading", "The arrows, as a list");
    const arrowList = element("ul", "fsm__list");
    arrowList.tabIndex = -1;

    body.append(howto, viewport, scrollTip, status, adder, edgeBar, actions, change, traceHeading, traceList, traceEnd, listHeading, arrowList);
    root.append(body);

    // --- drawing ------------------------------------------------------------
    function walkedKeys() {
      if (!walk) return new Set();
      const trace = run(edges);
      const keys = new Set();
      for (let i = 0; i <= walk.step && i < trace.length; i += 1) if (trace[i].arrow) keys.add(edgeKey(trace[i].arrow));
      return keys;
    }
    function activeState() {
      if (!walk) return null;
      const trace = run(edges);
      return walk.step < 0 ? cfg.start : trace[Math.min(walk.step, trace.length - 1)].to;
    }
    function drawEdges() {
      const geo = layout(edges);
      const walked = walkedKeys();
      edgeLayer.replaceChildren();
      edges.forEach((e) => {
        const g = geo.get(edgeKey(e));
        const hot = walked.has(edgeKey(e)) || selectedEdge === edgeKey(e);
        const group = svgEl("g", { class: "fsm__edge" + (selectedEdge === edgeKey(e) ? " is-selected" : "") + (walked.has(edgeKey(e)) ? " is-walked" : "") });
        const labelWidth = e.on.length * 6.4 + 14;
        group.append(
          svgEl("path", { d: g.d, class: "fsm__hit" }),
          svgEl("path", { d: g.d, class: "fsm__line", "marker-end": `url(#${id}-arrow${hot ? "-hot" : ""})` }),
          svgEl("rect", { x: (g.lx - labelWidth / 2).toFixed(1), y: (g.ly - 10).toFixed(1), width: labelWidth.toFixed(1), height: 20, rx: 5, class: "fsm__label-box" }),
          svgEl("text", { x: g.lx.toFixed(1), y: (g.ly + 4).toFixed(1), "text-anchor": "middle", class: "fsm__label" }, e.on)
        );
        group.addEventListener("click", () => selectArrow(edgeKey(e)));
        edgeLayer.append(group);
      });
    }
    function drawNodes() {
      const active = activeState();
      nodeEls.forEach((g, sid) => {
        g.classList.toggle("is-from", fromState === sid || (pending && pending.from === sid));
        g.classList.toggle("is-to", !!pending && pending.to === sid);
        g.classList.toggle("is-active", active === sid);
        let hintText = `Press Enter to start an arrow from ${name(sid)}.`;
        if (fromState === sid) hintText = `Picked as the start of a new arrow. Press Enter to cancel.`;
        else if (fromState) hintText = `Press Enter to draw an arrow from ${name(fromState)} to ${name(sid)}.`;
        g.setAttribute("aria-label", `${name(sid)}${sid === cfg.start ? ", the start state" : ""}. ${hintText}`);
      });
    }
    function drawTrace() {
      const trace = run(edges);
      traceList.replaceChildren();
      trace.forEach((row, i) => {
        const same = row.to === baseTrace[i].to;
        const li = element("li", "fsm__step" + (same ? "" : " is-different") + (walk && i === walk.step ? " is-current" : "") + (walk && i > walk.step ? " is-waiting" : ""));
        li.append(
          element("span", "fsm__input", `"${row.input}": `),
          element("span", "fsm__move", row.moved ? ` ${name(row.from)} → ${name(row.to)}` : ` no arrow, stays in ${name(row.to)}`)
        );
        if (!same) li.append(element("small", "fsm__lesson", ` (the lesson: ${name(baseTrace[i].to)})`));
        traceList.append(li);
      });
      const end = endOf(trace);
      const baseEnd = endOf(baseTrace);
      traceEnd.textContent = end === baseEnd
        ? `After the last input ${cfg.actor} is in ${name(end)}.`
        : `After the last input ${cfg.actor} is in ${name(end)}. The lesson's machine ends in ${name(baseEnd)}.`;
    }
    function drawList(focusIndex) {
      arrowList.replaceChildren();
      edges.forEach((e) => {
        const li = element("li", "fsm__list-item" + (selectedEdge === edgeKey(e) ? " is-selected" : ""));
        li.append(element("span", "", `${name(e.from)} → ${name(e.to)} when "${e.on}"`));
        const remove = element("button", "concept-lab__example fsm__remove", "Remove");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove the arrow from ${name(e.from)} to ${name(e.to)} when ${e.on}`);
        remove.addEventListener("click", () => removeArrow(edgeKey(e), true));
        li.append(remove);
        arrowList.append(li);
      });
      if (!edges.length) arrowList.append(element("li", "fsm__list-item", "No arrows yet. Click a state, then another state, to draw one."));
      if (focusIndex !== undefined) {
        const buttons = arrowList.querySelectorAll("button");
        (buttons[Math.min(focusIndex, buttons.length - 1)] || arrowList).focus();
      }
    }
    function drawControls() {
      adder.hidden = !pending;
      if (pending) {
        adderTitle.textContent = `${name(pending.from)} → ${name(pending.to)}`;
        const previous = select.value;
        select.replaceChildren();
        cfg.triggers.forEach((t) => {
          const used = edges.find((e) => e.from === pending.from && e.on === t);
          const option = element("option", "", used ? `${t} (replaces the arrow to ${name(used.to)})` : t);
          option.value = t;
          select.append(option);
        });
        const firstFree = cfg.triggers.find((t) => !edges.some((e) => e.from === pending.from && e.on === t));
        select.value = cfg.triggers.includes(previous) && previous ? previous : (firstFree || cfg.triggers[0]);
      }
      const edge = edges.find((e) => edgeKey(e) === selectedEdge);
      edgeBar.hidden = !edge;
      if (edge) edgeBarText.textContent = `Selected arrow: ${name(edge.from)} → ${name(edge.to)} when "${edge.on}". `;
    }
    function draw() {
      drawEdges(); drawNodes(); drawTrace(); drawList(); drawControls();
    }

    // --- narration of what changed ----------------------------------------
    function describe() {
      const cur = run(edges);
      const parts = [];
      if (lastAction) parts.push(lastAction.text);
      if (lastAction && lastAction.removed && lastAction.removed.ifMissing && baseline.some((b) => sameArrow(b, lastAction.removed))) parts.push(lastAction.removed.ifMissing);
      const d = cur.findIndex((row, i) => row.to !== baseTrace[i].to);
      const identical = edges.length === baseline.length && baseline.every((b) => edges.some((e) => sameArrow(e, b)));
      if (d === -1) {
        parts.push(identical ? "That is the lesson's complete machine again." : "The replay still follows the lesson's path, because none of these inputs uses the arrow you changed.");
      } else {
        const row = cur[d];
        const base = baseTrace[d];
        parts.push(`At step ${d + 1} ("${row.input}") ${cfg.actor} ${row.moved ? "goes to" : "stays in"} ${name(row.to)} instead of ${base.moved ? "going to" : "staying in"} ${name(base.to)}.`);
        parts.push(endOf(cur) === endOf(baseTrace) ? `It still ends in ${name(endOf(cur))}.` : `The replay now ends in ${name(endOf(cur))} instead of ${name(endOf(baseTrace))}.`);
      }
      if (!edges.length) {
        parts.push("With no arrows at all, every input leaves the machine where it is.");
      } else {
        const outgoing = new Set(edges.map((e) => e.from));
        const stuck = cfg.states.filter((s) => !outgoing.has(s.id) && !(cfg.terminal || []).includes(s.id)).map((s) => s.label);
        if (stuck.length) parts.push(`No arrow leaves ${listWords(stuck)}, so once ${cfg.actor} gets there it can never leave.`);
        const seen = new Set([cfg.start]);
        let grew = true;
        while (grew) {
          grew = false;
          edges.forEach((e) => { if (seen.has(e.from) && !seen.has(e.to)) { seen.add(e.to); grew = true; } });
        }
        const lost = cfg.states.filter((s) => !seen.has(s.id)).map((s) => s.label);
        if (lost.length) parts.push(`No path from the start reaches ${listWords(lost)}.`);
      }
      return parts.join(" ");
    }
    function announce(action) {
      lastAction = action || null;
      change.textContent = describe();
    }

    // --- actions ------------------------------------------------------------
    function stopReplay() {
      if (timer) clearTimeout(timer);
      timer = null;
      walk = null;
    }
    function resetPicks() {
      fromState = null; pending = null; selectedEdge = null;
      status.textContent = "Try it: click a state, then a second state, to draw an arrow between them. Click an arrow to select it.";
    }
    function onNode(sid) {
      stopReplay();
      selectedEdge = null;
      if (pending) {
        if (sid === pending.from) { resetPicks(); } else { pending.to = sid; status.textContent = `Choose which input sends ${name(pending.from)} to ${name(sid)}, then press Add the arrow.`; }
      } else if (fromState === null) {
        fromState = sid;
        status.textContent = `${name(sid)} is picked. Now click the state it should lead to (Escape cancels).`;
      } else if (fromState === sid) {
        resetPicks();
      } else {
        pending = { from: fromState, to: sid };
        status.textContent = `Choose which input sends ${name(fromState)} to ${name(sid)}, then press Add the arrow.`;
      }
      draw();
      if (pending) select.focus();
    }
    function selectArrow(key) {
      stopReplay();
      fromState = null; pending = null;
      selectedEdge = selectedEdge === key ? null : key;
      status.textContent = selectedEdge ? "Arrow selected. Remove it, or click it again to let go." : "Try it: click a state, then a second state, to draw an arrow between them. Click an arrow to select it.";
      draw();
    }
    function addArrow() {
      if (!pending) return;
      stopReplay();
      const on = select.value;
      const old = edges.find((e) => e.from === pending.from && e.on === on);
      const arrow = { from: pending.from, on, to: pending.to };
      const origin = baseline.find((b) => sameArrow(b, arrow));
      if (origin && origin.ifMissing) arrow.ifMissing = origin.ifMissing;
      edges = edges.filter((e) => e !== old).concat(arrow);
      const text = old
        ? `Changed: in ${name(arrow.from)}, "${on}" used to lead to ${name(old.to)}; now it leads to ${name(arrow.to)}.`
        : `Added: ${name(arrow.from)} → ${name(arrow.to)} when "${on}".`;
      const from = arrow.from;
      resetPicks();
      announce({ text });
      draw();
      nodeEls.get(from).focus();
    }
    function removeArrow(key, fromList) {
      const index = edges.findIndex((e) => edgeKey(e) === key);
      if (index === -1) return;
      stopReplay();
      const removed = edges[index];
      edges = edges.filter((e) => e !== removed);
      selectedEdge = null; fromState = null; pending = null;
      status.textContent = "Try it: click a state, then a second state, to draw an arrow between them. Click an arrow to select it.";
      announce({ text: `Removed: ${name(removed.from)} → ${name(removed.to)} when "${removed.on}".`, removed });
      draw();
      if (fromList) drawList(index);
      else nodeEls.get(removed.from).focus();
    }
    function replay() {
      stopReplay();
      const trace = run(edges);
      if (reducedMotion()) {
        walk = { step: trace.length - 1 };
        change.textContent = `Replayed ${trace.length} inputs. The machine ends in ${name(endOf(trace))}.`;
        draw();
        return;
      }
      let i = -1;
      const tick = () => {
        walk = { step: i };
        draw();
        if (i < trace.length - 1) { i += 1; timer = setTimeout(tick, 650); }
        else {
          change.textContent = `Replayed ${trace.length} inputs. The machine ends in ${name(endOf(trace))}.`;
          timer = setTimeout(() => { walk = null; timer = null; draw(); }, 1800);
        }
      };
      tick();
    }

    addButton.addEventListener("click", addArrow);
    cancelButton.addEventListener("click", () => { resetPicks(); draw(); });
    removeSelected.addEventListener("click", () => { if (selectedEdge) removeArrow(selectedEdge, false); });
    replayButton.addEventListener("click", replay);
    hintButton.addEventListener("click", () => {
      stopReplay();
      const missing = baseline.find((b) => !edges.some((e) => sameArrow(e, b)));
      if (!missing) { announce(null); change.textContent = "Every arrow from the lesson is already here. Try removing one and replaying."; draw(); return; }
      const old = edges.find((e) => e.from === missing.from && e.on === missing.on);
      edges = edges.filter((e) => e !== old).concat({ ...missing });
      resetPicks();
      announce({ text: `Hint: put back ${name(missing.from)} → ${name(missing.to)} when "${missing.on}".` });
      draw();
    });
    emptyButton.addEventListener("click", () => {
      stopReplay();
      edges = [];
      resetPicks();
      announce({ text: "All arrows removed. Draw your own: click a state, then another." });
      draw();
    });
    resetButton.addEventListener("click", () => {
      stopReplay();
      edges = baseline.map((e) => ({ ...e }));
      resetPicks();
      announce(null);
      draw();
    });
    select.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addArrow(); } });
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && (fromState || pending || selectedEdge)) {
        resetPicks(); draw();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedEdge && !/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) {
        event.preventDefault();
        removeArrow(selectedEdge, false);
      }
    });

    resetPicks();
    change.textContent = "This is the lesson's complete machine. The replay below shows where each input leads. Try removing an arrow (click it, or use the list) and watch the replay change.";
    draw();
  }

  window.AcademyPuzzles = {
    labs: { blanks: CODE_BLANKS, machines: STATE_MACHINES },
    mount(root, lab) {
      if (CODE_BLANKS[lab]) mountCodeBlanks(root, CODE_BLANKS[lab]);
      else if (STATE_MACHINES[lab]) mountStateMachine(root, STATE_MACHINES[lab]);
    },
  };
})();
