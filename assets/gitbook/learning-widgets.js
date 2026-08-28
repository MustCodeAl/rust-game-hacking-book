(function () {
  "use strict";

  // Version the saved answer format so an older quiz layout cannot revive stale UI state.
  const STORAGE_PREFIX = "gha-quiz:v6:";
  const FOLLOW_UP_COUNT = 4;
  const initializedQuizRoots = new WeakSet();
  const STUDY_STOP_WORDS = new Set([
    "about", "after", "again", "against", "also", "another", "answer", "because",
    "before", "being", "between", "both", "can", "could", "does", "each", "every",
    "from", "have", "into", "just", "more", "most", "not", "only", "other", "our",
    "question", "should", "some", "than", "that", "the", "their", "then", "there",
    "these", "they", "this", "through", "under", "using", "very", "what", "when",
    "where", "which", "while", "why", "will", "with", "without", "would", "your"
  ]);

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
      { prompt: "What makes a study question source-grounded?", options: ["Its answer can be checked against identified material or a repeatable experiment", "It sounds technical", "It has the longest possible wording", "It can be answered without evidence"], answer: 0, explanation: "A dependable question names the evidence that can verify or correct its answer." },
      { prompt: "Why hide the source before answering?", options: ["To test whether you can reconstruct the meaning instead of copying it", "To make the answer less accurate", "To avoid ever checking your work", "To turn every fact into an opinion"], answer: 0, explanation: "A short closed-source answer tests recall and understanding; revealing the source afterward supplies correction." },
      { prompt: "In a game-research note, which statement is an inference?", options: ["This address probably stores gold because it changed with the display in three trials", "The display changed from 100 to 75", "The debugger stopped at 0x401000", "The source file defines a field named gold"], answer: 0, explanation: "The repeated changes are observations. Interpreting the candidate as gold is a supported inference that still deserves further tests." },
      { prompt: "How does deliberate rewording differ from answering in your own words?", options: ["Rewording practices flexible expression; your own words prioritize a natural, accurate explanation", "Rewording permits changing the fact", "Your own words must copy the source", "There is no useful distinction"], answer: 0, explanation: "Both must preserve meaning. The first emphasizes versatility; the second emphasizes understanding expressed naturally." },
      { prompt: "What should you do when an AI supplies an offset absent from the provided source?", options: ["Treat it as unverified and check an authoritative source or controlled experiment", "Use it because offsets cannot be invented", "Patch every matching process", "Remove the target version from your notes"], answer: 0, explanation: "AI can organize evidence but cannot create trustworthy target facts without support." },
      { prompt: "What is an address?", options: ["A numbered location in an address space", "The value stored at that location", "A Rust type", "A CPU instruction"], answer: 0, explanation: "An address tells the computer where bytes begin. It is a location, not the value stored there." },
      { prompt: "Why change one thing at a time during an experiment?", options: ["It makes the game run faster", "It connects one cause to one observed effect", "It removes the need for notes", "It makes every address permanent"], answer: 1, explanation: "One controlled change gives you evidence about cause and effect. Several changes at once make the result ambiguous." },
      { prompt: "Who normally owns the official shared state in a multiplayer game?", options: ["The rendering thread", "The keyboard driver", "The authoritative server", "The newest client"], answer: 2, explanation: "A client draws and predicts, but the authoritative server normally decides the shared result." },
      { prompt: "Why can the same four bytes mean different things?", options: ["Bytes contain hidden field names", "A type supplies the interpretation rule", "Windows changes them while reading", "Every byte is a pointer"], answer: 1, explanation: "Memory stores bits. The selected type decides whether those bits represent an integer, float, pointer, flags, or something else." },
      { prompt: "What is an offset?", options: ["A distance from a starting location", "A second name for a process", "A copied value", "A kind of CPU"], answer: 0, explanation: "An offset is a distance. Add it to a known base to describe another location." },
      { prompt: "Why does each process receive its own virtual address space?", options: ["To isolate its addresses and let Windows map them independently", "To make all pointers permanent", "To remove physical RAM", "To store only executable code"], answer: 0, explanation: "Virtual memory isolates processes and lets the operating system map virtual pages to appropriate backing storage." },
      { prompt: "What does little-endian describe?", options: ["The lowest-addressed byte holds the least-significant part of a multi-byte value", "All integers are negative", "Addresses grow from right to left", "Bits are stored as text"], answer: 0, explanation: "Endianness is the byte order used for multi-byte values. x86 and x86-64 normally use little-endian order." },
      { prompt: "What usually distinguishes a stack allocation from a heap allocation?", options: ["Stack storage follows call-scope structure; heap storage has independently managed lifetime", "Heap values have no addresses", "Stack memory is shared by every process", "Only strings use the heap"], answer: 0, explanation: "Stacks naturally track function calls, while heap allocations can outlive the scope that created them and need explicit ownership rules." },
      { prompt: "Why is a remote memory read called a snapshot?", options: ["The target may change immediately before or after the copied bytes are observed", "Windows always saves it as an image", "The read freezes every thread", "The address becomes read-only"], answer: 0, explanation: "A remote read copies bytes from one moment in a process that usually keeps running." },
      { prompt: "What does a null pointer normally communicate?", options: ["No valid object address is present", "The object starts at address one", "The value is always zero bytes long", "The pointer is executable"], answer: 0, explanation: "A null pointer is a sentinel meaning there is no referenced object. Dereferencing it is invalid." },
      { prompt: "What is the strongest sign that you understand a code example?", options: ["You can predict its behavior and verify that prediction", "Its names resemble English", "It compiles once", "You memorized every line"], answer: 0, explanation: "Readable names help, but understanding includes behavior, boundaries, failure paths, and evidence from a test or debugger." },
      { prompt: "Which operation is also an API even though it does not use the internet?", options: ["A local Windows function called through the windows crate", "Only an HTTP request", "Only a public website", "Only a multiplayer packet"], answer: 0, explanation: "An API is a programming interface. It can belong to a local crate, the operating system, a game scripting layer, or a remote service." },
      { prompt: "Why separate a current-project list from a maybe-later list?", options: ["To explore useful ideas without quietly replacing the work you intend to finish", "To forbid all exploration", "To avoid documenting versions", "To make every idea a dependency"], answer: 0, explanation: "Exploration can be valuable, but separate lists keep curiosity visible and protect the next concrete deliverable." },
      { prompt: "What turns a failed integration into useful evidence?", options: ["Recording the exact action, expected result, actual result, and next testable hypothesis", "Deleting the error", "Changing several libraries at once", "Starting a different project"], answer: 0, explanation: "A specific record narrows the problem and makes the next experiment reproducible." },
      { prompt: "Which knowledge is a good candidate for spaced review?", options: ["A calling-convention rule you repeatedly forget", "Every paragraph in the book", "A function you can already rebuild easily", "An unverified address"], answer: 0, explanation: "Spaced retrieval is most useful for durable facts and distinctions that remain weak. Code-shaped knowledge may be better reviewed by rebuilding and testing it." },
      { prompt: "What should guide the choice between a vector, map, and tree?", options: ["The shape of the data and the operations the tool performs repeatedly", "Which name sounds most advanced", "The current editor theme", "The largest possible allocation"], answer: 0, explanation: "Order, labels, hierarchy, relationships, and repeated operations reveal which representation fits the problem." },
      { prompt: "When is test-first work especially useful in these labs?", options: ["For deterministic logic such as parsing, pattern matching, and address arithmetic", "For guessing an unknown live structure before evidence exists", "For bypassing target permissions", "Only after all code is finished"], answer: 0, explanation: "Known input-output behavior can be captured in repeatable tests. Live discovery remains exploratory until observations can be moved into an offline fixture." }
    ],
    2: [
      { prompt: "What does `cmp` mainly change on x86?", options: ["The compared operands", "CPU flags used by later branches", "The stack size", "The executable file"], answer: 1, explanation: "`cmp` performs subtraction-like flag work without storing the result. A later conditional jump reads those flags." },
      { prompt: "Why must a detour cover whole instructions?", options: ["Rust requires five-byte instructions", "Returning into half an instruction changes the decoded byte stream", "Whole instructions use less memory", "Windows ignores partial instructions"], answer: 1, explanation: "x86 instructions have different lengths. A patch must resume at a real instruction boundary." },
      { prompt: "What should a code cave do with displaced original instructions?", options: ["Forget them", "Replay their required behavior before returning", "Turn them into data", "Run them twice"], answer: 1, explanation: "The detour temporarily owns that code boundary, so it must preserve the original behavior the program still needs." },
      { prompt: "What does `call` place on the stack?", options: ["A return address", "The entire executable", "A page permission", "A process handle"], answer: 0, explanation: "The return address tells `ret` where execution should continue after the called function finishes." },
      { prompt: "What makes a breakpoint observation useful evidence?", options: ["It happened once", "It repeats when the controlled behavior repeats", "The address looks familiar", "The register contains a large number"], answer: 1, explanation: "Repeatable behavior links the paused instruction to the action you are studying." },
      { prompt: "What does the instruction pointer identify?", options: ["The next instruction location for the current thread", "The base of every heap", "The process security level", "The most recent mouse coordinate"], answer: 0, explanation: "RIP on x86-64 identifies the current execution location and advances as instructions are decoded." },
      { prompt: "Why can a conditional jump be understood only with the earlier flag-setting instruction?", options: ["The jump reads CPU flags rather than the original high-level condition", "Jumps contain source variable names", "Flags store the complete call stack", "Every jump changes page permissions"], answer: 0, explanation: "Instructions such as cmp and test set flags; a later jcc interprets those flags to choose a path." },
      { prompt: "What does a calling convention define?", options: ["How arguments, return values, registers, and stack cleanup are shared across a call", "How files are compressed", "Where ASLR places modules", "Which debugger theme to use"], answer: 0, explanation: "Both caller and callee need one ABI contract or they will disagree about machine state." },
      { prompt: "How does a software breakpoint commonly pause x86 code?", options: ["It temporarily replaces one instruction byte with int3", "It deletes the stack", "It sets every debug register", "It encrypts the opcode"], answer: 0, explanation: "The one-byte int3 instruction raises a breakpoint exception that the debugger handles." },
      { prompt: "Why record a module-relative location instead of one absolute address?", options: ["ASLR may move the module while the internal RVA remains stable for that build", "Relative locations ignore instruction boundaries", "Absolute addresses cannot hold code", "Modules load only once per computer"], answer: 0, explanation: "The live base can change on each run, so base plus build-specific RVA is a reproducible description." },
      { prompt: "What does the `this` pointer normally identify inside a C++ member function?", options: ["The object instance receiving the method call", "The executable's first instruction", "The current Windows process handle", "The method's return address"], answer: 0, explanation: "A non-static member function needs an object to work on. The hidden `this` argument supplies that object's base address." },
      { prompt: "What is strong evidence that an object begins with a C++ virtual-function pointer?", options: ["The first field points into a read-only table of executable function addresses", "The first four bytes are zero", "Every field is a floating-point number", "The object lives on the stack"], answer: 0, explanation: "A common C++ layout stores a vptr near the object start. It points to a vtable whose entries lead to executable methods, though this is an implementation pattern rather than a language guarantee." },
      { prompt: "Why should a recovered structure include unknown padding instead of squeezing known fields together?", options: ["Offsets describe real byte distances, including bytes whose purpose is not known yet", "Padding makes pointers permanent", "The compiler ignores declared fields", "Unknown bytes are always encrypted"], answer: 0, explanation: "The next known field must remain at its observed offset. Unknown or alignment bytes still occupy space even before you understand them." },
      { prompt: "Why compare several instances of the same suspected class?", options: ["Stable offsets and plausible per-object differences separate fields from coincidences", "Every instance has the same address", "It removes the need for breakpoints", "It reveals the original source file"], answer: 0, explanation: "If health, position, and name behave consistently at the same offsets across several objects, the proposed layout has much stronger evidence." },
      { prompt: "What does an indirect call through `[vtable + slot]` suggest?", options: ["A virtual method dispatch through a function-table entry", "A direct call to a fixed address", "A string comparison", "A heap allocation size"], answer: 0, explanation: "Virtual dispatch loads a function pointer from the object's table and calls the selected slot. The exact sequence depends on architecture and compiler." },
      { prompt: "Why read remote fields individually in a Rust observer instead of casting a remote address to `&Player`?", options: ["The address belongs to another process and Rust cannot give it a valid local reference lifetime", "Rust structs cannot contain numbers", "Windows forbids all structured reads", "Individual reads disable ASLR"], answer: 0, explanation: "A numeric address in the target is not local borrowed memory. Typed, bounded copies keep that process boundary explicit and make each layout assumption checkable." },
      { prompt: "What should a reverse engineer label before a suspected class name is known?", options: ["Observed offsets and behavior with provisional names", "The first nearby source filename", "Every pointer as Player", "Only values that never change"], answer: 0, explanation: "Neutral labels preserve evidence and let the model change as constructors, destructors, and call sites reveal more." },
      { prompt: "What is strong evidence for a factory pattern?", options: ["A type choice leads to allocation and one of several constructor paths returning a common kind of pointer", "One function returns an integer", "A string contains factory", "The program uses the heap"], answer: 0, explanation: "The allocation-and-construction behavior is the compiled shape that matters; source names may be gone." },
      { prompt: "Why inspect destructors while reconstructing an object model?", options: ["They reveal which children, references, containers, and allocations an object releases", "They rename vtables", "They make pointers permanent", "They disable inheritance"], answer: 0, explanation: "Cleanup paths are powerful evidence about ownership and object lifetime." },
      { prompt: "What invariant supports a vector-like container interpretation?", options: ["begin is at or before end, which is at or before capacity end", "All three pointers are equal forever", "The count is stored as text", "Every element is executable"], answer: 0, explanation: "Ordered pointers, divisibility by element size, readable ranges, and a bounded count support the model." },
      { prompt: "Why can caching a component pointer be unsafe in a dense component pool?", options: ["Removing another component may swap elements and move the component", "Components have no memory", "Pointers cannot refer to arrays", "Entity IDs are virtual addresses"], answer: 0, explanation: "Stable handles or entity IDs can outlive movement that invalidates an element's old address." },
      { prompt: "What separates obfuscation from encryption?", options: ["Obfuscation mainly hides an obvious representation; encryption provides a security property under a key and threat model", "Obfuscation is always irreversible", "Encryption has no algorithm", "Only obfuscation changes bytes"], answer: 0, explanation: "A reversible home-made transform can slow casual inspection but is not a substitute for reviewed cryptography." },
      { prompt: "Why test decode(encode(value, key), key) for many values?", options: ["It checks that the proposed inverse works generally rather than for one coincidence", "It proves the key is secret", "It creates an AEAD tag", "It disables overflow"], answer: 0, explanation: "Property-style round-trip tests validate the relationship over a range of inputs." }
    ],
    3: [
      { prompt: "What problem does Rust ownership prevent?", options: ["Two owners freeing the same allocation", "A server sending packets", "A debugger setting breakpoints", "A matrix moving a point"], answer: 0, explanation: "Ownership gives one value responsibility for cleanup and prevents accidental double-free behavior." },
      { prompt: "What does a shared borrow allow?", options: ["Reading without taking ownership", "Writing from every thread", "Keeping a reference forever", "Skipping bounds checks"], answer: 0, explanation: "A shared borrow temporarily allows reading while the owner keeps responsibility for the value." },
      { prompt: "Where should unavoidable raw-pointer work live?", options: ["Throughout the program", "Inside a small documented boundary", "Only in comments", "Inside every loop"], answer: 1, explanation: "A narrow `unsafe` boundary makes the assumptions visible and lets the rest of the program use ordinary safe types." },
      { prompt: "Why wrap a Windows handle in a Rust type with `Drop`?", options: ["To make the handle permanent", "To close it on every normal exit path", "To convert it into a pointer", "To disable errors"], answer: 1, explanation: "RAII cleanup runs when the owning wrapper leaves scope, including early returns." },
      { prompt: "What should happen when expected bytes do not match?", options: ["Patch anyway", "Refuse the operation and explain the mismatch", "Write more bytes", "Restart Windows automatically"], answer: 1, explanation: "A mismatch means your build or location assumption is unproven. Refusal is successful safety behavior." },
      { prompt: "What must an FFI boundary specify correctly?", options: ["The ABI, data layout, pointer validity, and ownership expectations", "Only the function name", "The monitor refresh rate", "A permanent module base"], answer: 0, explanation: "Foreign code and Rust must agree on the machine-level contract and on who owns each resource." },
      { prompt: "Why wrap raw operating-system resources in small high-level types?", options: ["To centralize validation and guarantee one cleanup policy", "To make resource identifiers permanent", "To bypass access checks", "To convert every error into success"], answer: 0, explanation: "A wrapper can enforce ownership, lifetime, and cleanup while exposing a smaller safe interface." },
      { prompt: "Why is a pointer from another process not a normal reference in your tool?", options: ["It belongs to another address space and may become invalid independently", "Pointers cannot store numbers", "References are always file offsets", "Windows copies the object automatically"], answer: 0, explanation: "The pointer value is only meaningful in the target process and cannot carry Rust's local lifetime guarantees." },
      { prompt: "What security idea does W^X express?", options: ["Memory should normally be writable or executable, not both at once", "Windows and x86 use the same byte order", "Every page is shared", "Executable files cannot contain data"], answer: 0, explanation: "Separating writable and executable permissions reduces the opportunity to turn modified data directly into code." },
      { prompt: "Why should a patch plan include cleanup before installation?", options: ["Restoration is part of the feature's correctness, not an optional afterthought", "Cleanup chooses the game version", "It increases instruction size", "It prevents all crashes"], answer: 0, explanation: "A reversible tool defines how it will undo hooks, protections, threads, and resources before it changes the target." },
      { prompt: "What is Clippy's role in a Rust game tool?", options: ["It reports likely mistakes and clearer idioms that you still evaluate", "It proves every address is correct", "It replaces runtime testing", "It grants process permissions"], answer: 0, explanation: "Clippy provides lint guidance. You must still understand each suggestion, especially at FFI and unsafe boundaries." },
      { prompt: "What should you check before adding a crate?", options: ["API fit, supported versions, license, maintenance, safety boundaries, and a test for your use", "Only its download count", "Whether its name is short", "Whether it avoids Result"], answer: 0, explanation: "A dependency becomes part of the tool's correctness, maintenance, licensing, and safety story." },
      { prompt: "What must you explain before accepting a non-trivial AI completion?", options: ["Its types, ownership, side effects, failure path, and test", "Only its indentation", "Only whether it compiles", "Its token count"], answer: 0, explanation: "Compilation checks syntax and types, not target identity, byte invariants, cleanup, or intended behavior." },
      { prompt: "When is a design-pattern name useful during reversing?", options: ["As a hypothesis that summarizes observed intent and behavior", "As proof of the original source class name", "Whenever one pointer appears", "Only when a string contains the pattern name"], answer: 0, explanation: "Compiled shapes can suggest State, Strategy, Observer, or Factory, but behavior and repeated evidence must support the label." }
    ],
    4: [
      { prompt: "What is a remote snapshot?", options: ["A live Rust reference", "A copied observation from one moment", "A permanent game object", "An executable section"], answer: 1, explanation: "The target can change immediately after a read, so a snapshot is a time-stamped copy, not a live view." },
      { prompt: "How do you reach record number `i` in a fixed-size table?", options: ["base + i × record_size", "base ÷ record_size", "i + field_size", "record_size − base"], answer: 0, explanation: "The index chooses the record stride. A field offset is added only after reaching that record." },
      { prompt: "Why bound a player count before looping?", options: ["To change teams", "To prevent bad metadata from causing huge reads", "To remove inactive players", "To increase FPS"], answer: 1, explanation: "A count read from remote memory is untrusted. A reasonable cap protects the loop and its address math." },
      { prompt: "Why model a bot as explicit states?", options: ["States make timing and stop behavior testable", "States remove all game rules", "States make pointers permanent", "States bypass input"], answer: 0, explanation: "Named states and transitions make the action loop predictable, testable, and easier to stop safely." },
      { prompt: "What sampling rate should an observer use?", options: ["Always the fastest possible", "A rate appropriate for how quickly the value changes", "Exactly once per launch", "The monitor refresh rate"], answer: 1, explanation: "Slow strategy values do not become more truthful when read thousands of times per second." },
      { prompt: "How is tile `(x, y)` located in a row-major grid of width `w`?", options: ["y × w + x", "x × w + y", "w ÷ x + y", "x + y"], answer: 0, explanation: "Each full row contributes w entries; x selects the column within row y." },
      { prompt: "What makes a state-machine transition safe to test?", options: ["Its source state, guard, action, and destination are explicit", "It has no stop state", "It runs as fast as possible", "It reads raw memory inside every condition"], answer: 0, explanation: "Explicit transitions make behavior deterministic and allow invalid moves, timeouts, and cancellation to be tested." },
      { prompt: "Why separate game-state collection from strategy decisions?", options: ["The decision system can consume one validated model instead of scattered changing reads", "It makes coordinates unnecessary", "It disables other threads", "It turns pointers into files"], answer: 0, explanation: "A snapshot boundary makes errors and timing visible while keeping higher-level logic independent of memory APIs." },
      { prompt: "What does the magnitude of a position-difference vector represent?", options: ["The straight-line distance between the two positions", "A process identifier", "The map width", "The number of CPU threads"], answer: 0, explanation: "Subtracting positions creates a displacement vector; its Euclidean length is the distance." },
      { prompt: "Why give an automation loop a cancellation path and timeouts?", options: ["It must be able to stop when observations or expected transitions fail", "It makes every action succeed", "It prevents input latency", "It keeps all pointers valid"], answer: 0, explanation: "Stop-safe automation treats stalled or unexpected state as a normal error path rather than looping forever." }
    ],
    5: [
      { prompt: "What does subtracting two positions produce?", options: ["A direction from one to the other", "A process handle", "A color", "A file offset"], answer: 0, explanation: "The difference vector describes how far and in which direction the second point lies." },
      { prompt: "Why use `atan2(y, x)` for an angle?", options: ["It preserves quadrant information", "It allocates a matrix", "It removes all wraparound", "It changes screen resolution"], answer: 0, explanation: "The signs of both inputs tell `atan2` which quadrant contains the direction." },
      { prompt: "What should world-to-screen code do with a non-positive clip-space `w`?", options: ["Draw the point", "Reject the point before dividing", "Replace it with 1", "Use its absolute value"], answer: 1, explanation: "For the course projection convention, a non-positive `w` places the point behind the camera." },
      { prompt: "What is the shortest turn from 179° to −179°?", options: ["−358°", "+2°", "+179°", "−180°"], answer: 1, explanation: "Angles wrap at the boundary, so a two-degree forward turn crosses directly to −179°." },
      { prompt: "Why restore graphics state after a diagnostic draw?", options: ["OpenGL state persists into later draws", "The GPU forgets every call", "Rust cannot store colors", "Matrices require cleanup handles"], answer: 0, explanation: "Graphics APIs are state machines. Unrestored settings can accidentally affect unrelated objects." },
      { prompt: "What does a world-to-view transform do?", options: ["Expresses a world position relative to the camera", "Allocates a network packet", "Finds a PE section", "Changes page protection"], answer: 0, explanation: "The view transform moves coordinates into the camera's coordinate system before projection." },
      { prompt: "Why does perspective projection divide by clip-space w?", options: ["It produces normalized device coordinates with distance-dependent perspective", "It reverses endianness", "It chooses a texture", "It finds the nearest pointer"], answer: 0, explanation: "The perspective divide makes farther geometry appear smaller and places it into normalized device space." },
      { prompt: "What question does a depth buffer help the renderer answer?", options: ["Which visible fragment is closest at a screen location", "Which DLL exported a function", "Which packet arrived first", "Which thread owns a handle"], answer: 0, explanation: "Depth testing compares fragment depth so nearer surfaces can hide farther surfaces." },
      { prompt: "Why is one changed render state at a time a strong experiment?", options: ["The visible difference can be attributed to that single controlled variable", "It increases the frame rate automatically", "It reveals source-code names", "It disables clipping"], answer: 0, explanation: "Controlled rendering experiments use the same cause-and-effect method as memory scans and protocol captures." },
      { prompt: "What does a normalized direction vector preserve?", options: ["Direction while changing its length to one", "The original distance", "A virtual address", "The object's texture"], answer: 0, explanation: "Normalization divides by magnitude, producing a unit direction useful for angles, rays, and movement." },
      { prompt: "Why should an immediate-mode menu avoid writing memory during every paint pass?", options: ["Painting repeats frequently, so side effects should happen only after an explicit command", "egui cannot call functions", "Windows blocks all UI threads", "A paint pass has no variables"], answer: 0, explanation: "The interface is described again every frame. Keeping rendering side-effect free prevents accidental repeated writes and stalls." },
      { prompt: "Why represent overlay choices with one enum instead of several booleans?", options: ["One enum prevents mutually exclusive modes from being active together", "Enums make GPU memory permanent", "Booleans cannot cross threads", "Rust only draws enum values"], answer: 0, explanation: "A single value can hold Off, TeamOnly, or AllActors, but never contradictory combinations." },
      { prompt: "What should happen to held synthetic input when a tool shuts down?", options: ["Release it before the worker exits", "Leave it down for Windows to guess", "Send more down events", "Convert it to a window message"], answer: 0, explanation: "Reverse-order cleanup includes releasing every key or mouse button the tool pressed." }
    ],
    6: [
      { prompt: "What does TCP provide to an application?", options: ["A stream of ordered bytes", "Preserved message boundaries", "One packet per read", "Only encrypted text"], answer: 0, explanation: "TCP does not know your application message boundaries. Framing must define them." },
      { prompt: "What does UDP preserve?", options: ["A continuous byte stream", "Datagram boundaries", "File offsets", "Function call stacks"], answer: 1, explanation: "Each UDP receive corresponds to a datagram, though delivery and order are not guaranteed." },
      { prompt: "Why is byte order part of a protocol?", options: ["Both sides must agree how multi-byte numbers are arranged", "It chooses the IP address", "It makes packets reliable", "It selects a Rust owner"], answer: 0, explanation: "The same bytes produce different numbers when readers disagree about which byte comes first." },
      { prompt: "What should happen before allocating a length-prefixed payload?", options: ["Trust the advertised length", "Compare it with a strict maximum and available bytes", "Reverse every byte", "Open a process handle"], answer: 1, explanation: "Network lengths are untrusted. Bound them before allocation or slicing." },
      { prompt: "Why test with a captured real fixture?", options: ["An encoder and decoder can share the same mistake", "Fixtures remove all parsing", "TCP requires captures", "It makes the protocol private"], answer: 0, explanation: "A real known frame anchors your implementation to the actual protocol rather than two matching bugs." },
      { prompt: "Why can one TCP receive return half a message or several messages?", options: ["TCP preserves an ordered byte stream, not application message boundaries", "TCP randomly changes payloads", "Every router compresses data", "Sockets cannot buffer bytes"], answer: 0, explanation: "Applications must buffer stream bytes and apply their own framing rules." },
      { prompt: "What does backpressure mean in a proxy?", options: ["A slow receiver eventually limits how quickly the relay can accept more bytes", "The proxy reverses packets", "The server changes byte order", "The socket becomes read-only"], answer: 0, explanation: "Bounded buffers and awaited writes let downstream capacity control upstream production." },
      { prompt: "Why cap decompressed message size separately from compressed size?", options: ["A small compressed payload can expand into a very large output", "Compression removes length fields", "Decompression changes TCP into UDP", "Only text can be compressed"], answer: 0, explanation: "Expansion limits defend memory and CPU even when the wire payload looks small." },
      { prompt: "What makes a parser state machine useful for streaming data?", options: ["It remembers whether it needs a header, payload, or more bytes across partial reads", "It guarantees delivery", "It removes syntax validation", "It assigns permanent addresses"], answer: 0, explanation: "Streaming parsers advance only when enough bytes are buffered for the current state." },
      { prompt: "Why should protocol errors name the phase that failed?", options: ["Framing, decompression, text decoding, and semantic validation require different fixes", "All errors have the same cause", "It makes packets smaller", "It prevents disconnects"], answer: 0, explanation: "Specific error categories turn malformed input into actionable evidence instead of one vague failure." }
    ],
    7: [
      { prompt: "What should a pattern scanner do with several matches?", options: ["Patch all of them", "Refuse ambiguity and refine the pattern", "Choose the lowest address", "Add more wildcards"], answer: 1, explanation: "Several matches mean the signature is not yet a unique identity." },
      { prompt: "What does a second value scan keep?", options: ["Old candidates that match the new observation", "Every address in the process", "Only executable pages", "Only the first result"], answer: 0, explanation: "Each observation filters the existing candidate set instead of starting over." },
      { prompt: "How do you turn an RVA into a live address?", options: ["module base + RVA", "file offset + pointer size", "RVA − module base", "section count × RVA"], answer: 0, explanation: "An RVA is a distance from the module's live base." },
      { prompt: "What distinguishes PE32 from PE32+ in the optional header?", options: ["The magic value and field layout", "The filename extension", "The section names", "The DOS letters"], answer: 0, explanation: "The optional-header magic selects the 32-bit or 64-bit field layout." },
      { prompt: "Why rewind `EIP` after an `int3` breakpoint?", options: ["The CPU already advanced past the one-byte breakpoint", "To restart the process", "To skip the original instruction", "To enlarge the stack"], answer: 0, explanation: "Rewinding lets the restored original instruction execute from its real start." },
      { prompt: "Why use wildcards for relocation-dependent bytes in a pattern?", options: ["Those bytes may change while the surrounding instruction structure remains characteristic", "Wildcards make every match unique", "They decode instructions", "They disable ASLR"], answer: 0, explanation: "A signature should keep stable identity bytes and ignore fields expected to vary across load locations." },
      { prompt: "What should happen when an instruction decoder reports an invalid or truncated instruction?", options: ["Stop or resynchronize according to an explicit error policy", "Assume it is one byte", "Patch the next five bytes", "Treat the data as UTF-8"], answer: 0, explanation: "Inventing a length corrupts all later boundaries. A disassembler must surface decode failure." },
      { prompt: "How do the export and import tables differ?", options: ["Exports advertise symbols a module provides; imports name symbols it needs", "Both store thread stacks", "Imports contain textures", "Exports are always live pointers on disk"], answer: 0, explanation: "The loader uses import requests and provider exports to resolve cross-module calls." },
      { prompt: "Why can two processes load the same DLL at different addresses?", options: ["Each has a separate virtual address space and ASLR placement", "DLLs have no preferred base", "File offsets are random", "Exports change size"], answer: 0, explanation: "Module identity can be shared while live virtual addresses remain process-specific." },
      { prompt: "Why must instrumentation guard against re-entering its own logger?", options: ["Logging may call code that reaches the hooked path again and recurse", "Hooks cannot call functions", "Registers cannot be saved", "Logs are executable"], answer: 0, explanation: "A thread-local reentrancy guard or carefully isolated sink prevents recursive observation from overwhelming the target." },
      { prompt: "What is a sensible reuse decision order for a tool feature?", options: ["Existing abstraction, vetted crate, licensed example, then the smallest owned implementation", "Rewrite every dependency first", "Copy the largest project available", "Add a scripting engine for every function"], answer: 0, explanation: "Reuse saves effort when it fits, while a small owned implementation remains appropriate when existing choices add more complexity than value." },
      { prompt: "What does an open-source license change about copied code?", options: ["It grants stated permissions while its notice and attribution requirements still apply", "It removes authorship", "It guarantees compatibility with every project", "It makes testing unnecessary"], answer: 0, explanation: "Open source is permission under conditions, not a claim that the code has no author or obligations." },
      { prompt: "Why isolate a large dependency behind a small interface?", options: ["The rest of the tool depends on a narrow promise that is easier to test or replace", "It makes the dependency invisible to Cargo", "It disables its unsafe code", "It prevents version changes"], answer: 0, explanation: "A narrow boundary limits coupling and makes assumptions, tests, and future replacement clearer." }
    ],
    8: [
      { prompt: "Why copy a file before parsing or modifying it?", options: ["To preserve a known recovery point", "To change its format", "To remove its header", "To make offsets virtual"], answer: 0, explanation: "An untouched source makes experiments reversible and comparisons trustworthy." },
      { prompt: "What should a parser validate before slicing bytes?", options: ["That offset + length stays inside the file", "Only the filename", "The screen resolution", "The process ID"], answer: 0, explanation: "Checked boundary math prevents truncated or malicious data from becoming an out-of-range access." },
      { prompt: "Why preserve unknown fields when rewriting a format?", options: ["They may carry meaning your tool does not understand", "They are always comments", "They make files smaller", "Rust requires them"], answer: 0, explanation: "Unknown does not mean useless. Dropping it can silently damage compatibility." },
      { prompt: "What makes a mod easy to undo?", options: ["Keeping changes in a separate override folder", "Editing every base file", "Deleting the original", "Changing unrelated assets"], answer: 0, explanation: "A separate mod layer can be disabled or removed without reconstructing the installation." },
      { prompt: "Why parse named fields instead of blind search-and-replace?", options: ["The same text may appear in unrelated contexts", "Search never finds text", "Named fields use no bytes", "It makes every file JSON"], answer: 0, explanation: "Structured parsing changes the intended field and preserves other occurrences." },
      { prompt: "What does a controlled diff between two save files reveal?", options: ["Which byte ranges or fields changed with one known game action", "The live call stack", "The GPU projection matrix", "The process DACL"], answer: 0, explanation: "Changing one in-game fact turns a binary or structured diff into evidence about its representation." },
      { prompt: "Why validate a temporary output before replacing the original file?", options: ["A failed serializer should not destroy the last known-good copy", "Temporary files bypass parsing", "Validation makes writes atomic", "It changes file permissions"], answer: 0, explanation: "The temporary file can be parsed and checked completely before an atomic replacement step." },
      { prompt: "Why must replacement textures preserve mipmap and compression expectations?", options: ["The engine and GPU loader interpret bytes using that metadata", "Pixels contain process handles", "Mipmaps choose network ports", "Compression fixes coordinates"], answer: 0, explanation: "Asset bytes require the same format contract expected by the renderer." },
      { prompt: "What does a checksum inside an archive primarily detect?", options: ["Accidental or unexpected changes to the covered bytes", "Who authored the archive", "Whether code is safe", "The live module base"], answer: 0, explanation: "A checksum is an integrity signal, not proof of identity or security." },
      { prompt: "Why version a mod's data schema?", options: ["Readers can select the correct field rules as the format evolves", "Versions keep pointers stable", "Schemas eliminate backups", "It prevents all invalid values"], answer: 0, explanation: "Explicit versions make compatibility decisions and migrations testable instead of guessed." }
    ],
    9: [
      { prompt: "Why is an effect-based policy stronger than checking a command's name?", options: ["It validates the state change or capability regardless of which label requested it", "It makes every command name secret", "It removes the need for tests", "It permits unknown commands automatically"], answer: 0, explanation: "Names are descriptions, not security boundaries. Validate the requested effect so aliases and new labels follow the same rule." },
      { prompt: "How does a sink-side check reduce a time-of-check/time-of-use bug?", options: ["It verifies the required identity and state immediately before committing the effect", "It makes time stop after validation", "It stores the check in a filename", "It trusts an earlier result forever"], answer: 0, explanation: "Mutable state can change after an early check. Revalidating at the operation boundary closes that stale-decision gap in the toy lab." },
      { prompt: "Why should a denied toy-policy decision produce a structured event?", options: ["The reason, requested effect, and relevant state remain available for testing and repair", "Logging turns denial into approval", "Events prevent every race", "The command becomes encrypted"], answer: 0, explanation: "A visible denial trail lets a defender distinguish expected refusal, missing coverage, and an unexplained gap." },
      { prompt: "What is the purpose of the toy-evasion exercises in this book?", options: ["Break intentionally weak local controls, explain the design mistake, and verify the repaired invariant", "Bypass security products", "Hide a live process", "Disable operating-system defenses"], answer: 0, explanation: "The exercises stay inside purpose-built Rust models so the lesson is defensive design, repeatable testing, and repair." },
      { prompt: "What does `MEM_COMMIT` tell you?", options: ["Storage is committed for the range", "The page is executable", "The page belongs to a DLL", "The address is permanent"], answer: 0, explanation: "State, type, and protection answer different questions. Committed state alone does not grant every access." },
      { prompt: "Why is writable-and-executable memory worth reviewing?", options: ["It combines permissions commonly separated by W^X", "It is always malware", "It cannot contain code", "It is read-only"], answer: 0, explanation: "W+X is not proof of abuse, but it deserves an explanation because writable code is unusually powerful." },
      { prompt: "What does least privilege mean for a process handle?", options: ["Request only the rights the current operation needs", "Always request full access", "Never close the handle", "Use the largest numeric mask"], answer: 0, explanation: "Smaller rights clarify intent and reduce accidental capability." },
      { prompt: "Why can `ReadProcessMemory` fail after `VirtualQueryEx` said a region was readable?", options: ["The target can change between the check and the read", "Addresses are strings", "Pages have no state", "The query writes memory"], answer: 0, explanation: "This is a time-of-check/time-of-use race in a process that keeps running." },
      { prompt: "What should a read-only mapper avoid requesting?", options: ["Write and remote-thread rights", "Query rights", "Read rights", "A process ID"], answer: 0, explanation: "A mapper needs query and read access, not mutation capabilities." },
      { prompt: "How does a thread differ from a process?", options: ["A thread is one execution path sharing its process's address space and resources", "A thread has its own executable file", "A process shares one stack among all threads", "Threads have no registers"], answer: 0, explanation: "Threads have individual contexts and stacks but share the process container." },
      { prompt: "What does an access token describe?", options: ["The security identity and privileges used for access checks", "A module's RVA", "The current instruction bytes", "A texture format"], answer: 0, explanation: "Windows compares token identity and privileges with an object's security rules when granting access." },
      { prompt: "Why is a small crash dump often preferable to dumping all memory?", options: ["It can capture relevant threads, modules, and contexts with less sensitive or irrelevant data", "It keeps the process running forever", "It contains source code", "It disables ASLR"], answer: 0, explanation: "Selectivity reduces size and data exposure while preserving the evidence needed for a scoped crash." },
      { prompt: "What is an ETW provider?", options: ["A component that emits structured events into trace sessions", "A kernel patch", "A file compressor", "A pointer scanner"], answer: 0, explanation: "Controllers select providers and sessions record timestamped events for later correlation." },
      { prompt: "What makes loader lock a deadlock risk?", options: ["DllMain may wait for work that itself needs the loader's locked state", "It makes modules read-only", "It prevents CPU exceptions", "It changes byte order"], answer: 0, explanation: "Circular waiting occurs when code under loader lock invokes or waits on operations that need the same loader progress." },
      { prompt: "What does CR3 provide to an x86-64 capture translator?", options: ["The physical base of the top page-table structure for an address space", "The game's class name", "The DMA device firmware", "The size of every allocation"], answer: 0, explanation: "CR3 anchors the page-table walk that connects a virtual address to physical memory." },
      { prompt: "What does an IOMMU protect?", options: ["It constrains which physical memory regions a device may access", "It encrypts all source code", "It replaces process page tables", "It stores Lua bytecode"], answer: 0, explanation: "An IOMMU gives the operating system control over device DMA mappings instead of granting unrestricted RAM access." },
      { prompt: "Why use a synthetic capture before a real image?", options: ["Every expected table entry and data byte is known, so translator bugs are unambiguous", "Synthetic pages bypass Windows security", "It creates live game pointers", "It removes the need for bounds checks"], answer: 0, explanation: "A deterministic fixture isolates page-walk logic from capture timing, missing pages, and unknown target state." },
      { prompt: "Why translate again when a read crosses 4 KiB?", options: ["The next virtual page may map to a nonadjacent physical frame", "The CPU changes endianness at each page", "Every page has another CR3", "The file becomes executable"], answer: 0, explanation: "Virtual pages can be contiguous while their physical frames are scattered." },
      { prompt: "What should happen when a page-table present bit is clear?", options: ["Return a level-specific error", "Read address zero", "Guess the next table", "Mask away the error bit"], answer: 0, explanation: "A missing mapping is meaningful evidence. Guessing would turn malformed or wrong-address-space data into misleading output." },
      { prompt: "Why record a capture hash?", options: ["It lets later analysis verify that the evidence file's bytes have not changed", "It decrypts the capture", "It reveals every virtual address", "It grants hardware access"], answer: 0, explanation: "A digest supports provenance and detects accidental or unexplained modification of the image." },
      { prompt: "What is the correct response when Kernel DMA Protection blocks a mapping path?", options: ["Keep the protection enabled and use an offline or synthetic workflow", "Disable every firmware defense", "Install stealth firmware", "Write to the running process"], answer: 0, explanation: "A blocked mapping is successful defense. The learning goals do not require weakening the machine." }
    ],
    10: [
      { prompt: "What does `ERROR_PIPE_CONNECTED` mean during the named-pipe race?", options: ["A client already connected", "The pipe was deleted", "The message is too large", "The server lost permission"], answer: 0, explanation: "A fast client can connect between pipe creation and the server's connect call." },
      { prompt: "Why prefer a small message enum over a command string?", options: ["It limits input to explicitly supported actions", "It makes every client an administrator", "It runs PowerShell faster", "It shares pointers"], answer: 0, explanation: "Structured messages are data. Arbitrary command strings can accidentally become code execution." },
      { prompt: "What does a shared file mapping share between processes?", options: ["Backing storage, possibly at different virtual addresses", "One Rust reference", "The same thread", "A debugger"], answer: 0, explanation: "Each process maps the same object into its own address space; the virtual addresses may differ." },
      { prompt: "What does a SHA-256 hash help identify?", options: ["The exact bytes of a file", "A process permission", "A window coordinate", "A function argument"], answer: 0, explanation: "A changed byte changes the digest with overwhelming probability, making hashes useful build fingerprints." },
      { prompt: "Why keep ordinary learning tools in user mode?", options: ["A mistake is less likely to crash or corrupt the whole system", "User mode has no memory", "Kernel mode cannot use Rust", "Drivers cannot read files"], answer: 0, explanation: "Kernel code has system-wide privilege. User mode provides a safer failure boundary for these labs." },
      { prompt: "What does a system call change?", options: ["The CPU privilege level and execution path enter a validated kernel service", "The executable's hash", "The network byte order", "The process architecture"], answer: 0, explanation: "A system call is a controlled transition, with arguments validated by the kernel before privileged work." },
      { prompt: "What is a forwarded export?", options: ["An export entry that names another module and symbol instead of containing code", "A copied stack frame", "A shared-memory message", "A signed hash"], answer: 0, explanation: "The loader follows the forwarder string to resolve the actual provider function." },
      { prompt: "Why can shared memory map at different addresses in two processes?", options: ["Each process chooses a virtual address for the same backing object", "The bytes are different", "Mappings disable virtual memory", "Only one process has pages"], answer: 0, explanation: "The shared object is the identity; each process's view address is local to its own address space." },
      { prompt: "What does a digital signature add beyond a digest?", options: ["A cryptographic claim tied to a signing key and trust policy", "Proof that software has no bugs", "A permanent file path", "A process handle"], answer: 0, explanation: "A signature associates bytes with a key identity, while validation policy decides whether that identity is trusted." },
      { prompt: "Why should a named-pipe protocol use explicit message types and sizes?", options: ["The receiver can validate bounded data instead of interpreting arbitrary commands", "Pipes automatically run text", "It removes synchronization", "It makes handles global"], answer: 0, explanation: "A small framed protocol constrains behavior and makes malformed input fail at a clear boundary." },
      { prompt: "What extra property does authenticated encryption provide beyond hiding plaintext?", options: ["It detects changes to ciphertext and authenticated context", "It stores the key automatically", "It guarantees the application has no bugs", "It makes nonces secret"], answer: 0, explanation: "AEAD combines confidentiality with integrity and authenticity under the key." },
      { prompt: "Why must a nonce follow the algorithm's uniqueness rule?", options: ["Reusing a nonce with one key can break the construction's security", "A nonce is the decryption password", "Nonces make files smaller", "The nonce names the Rust type"], answer: 0, explanation: "Nonce handling is part of the cryptographic contract, even though the nonce itself can be stored openly." },
      { prompt: "Which GetAsyncKeyState bit reliably reports that a key is down now?", options: ["The most-significant/sign bit", "The least-significant compatibility bit", "Every reserved bit", "The carry flag"], answer: 0, explanation: "A negative i16 means the high bit is set and the key is currently down. The low compatibility bit is not a reliable edge event." },
      { prompt: "Why can SendMessageW freeze an external tool?", options: ["It waits for the target window procedure to finish", "It allocates physical memory", "It always starts a debugger", "It closes the target handle"], answer: 0, explanation: "SendMessageW is synchronous. A bounded SendMessageTimeoutW call is safer when the receiver may be hung." },
      { prompt: "Why might a game ignore a posted WM_KEYDOWN message?", options: ["It may read Raw Input or device state instead of treating window messages as gameplay input", "WM_KEYDOWN contains no key number", "Windows messages work only in browsers", "The message changes the executable hash"], answer: 0, explanation: "Window messages and device input are different paths. Sending a message does not update every input API a game might use." },
      { prompt: "Why is an HWND not closed with CloseHandle?", options: ["Window handles follow the window manager's lifetime contract, not the kernel-handle CloseHandle contract", "HWND is a source pointer", "Windows never destroys windows", "CloseHandle works only on files"], answer: 0, explanation: "Windows uses several opaque handle families. Each must follow the API that created, borrowed, or destroys it." }
    ],
    11: [
      { prompt: "Why embed Lua in a compiled game or tool?", options: ["Small rules and content can change without rebuilding the whole engine", "Lua removes the operating system", "Every pointer becomes valid", "Scripts run before the CPU starts"], answer: 0, explanation: "The compiled host supplies stable capabilities while text scripts can express changeable policy, configuration, and gameplay rules." },
      { prompt: "What key does the first element of a conventional Lua sequence use?", options: ["1", "0", "-1", "The sequence has no keys"], answer: 0, explanation: "Lua sequences conventionally begin at one, so a Rust Vec index is shifted forward when converted to a Lua table." },
      { prompt: "What is a Lua table?", options: ["A mapping from keys to values that can model lists, records, and dictionaries", "Only a fixed-size numeric array", "A Windows handle", "Compiled x86 instructions"], answer: 0, explanation: "Tables are Lua's main compound data structure and can use many value types as keys and values." },
      { prompt: "What does the colon in `bot:update(snapshot)` provide?", options: ["It passes `bot` as the hidden first `self` argument", "It starts a comment", "It makes the function global", "It copies the entire table"], answer: 0, explanation: "Colon call syntax is shorthand for a dot call with the receiver supplied as the first argument." },
      { prompt: "Why expose `game.snapshot()` instead of `memory.read(address, size)`?", options: ["The host can validate versioned fields and avoid giving scripts arbitrary pointer capability", "Snapshots make all data permanent", "Lua cannot represent bytes", "Memory reads require a network"], answer: 0, explanation: "A domain snapshot keeps process handles, pointer lifetimes, bounds, and layout profiles inside the Rust boundary." },
      { prompt: "Why should Lua send a structured action request instead of a command string?", options: ["Rust can match a small allowed enum and validate every field", "Strings cannot contain numbers", "Tables execute faster than machine code", "A request bypasses state checks"], answer: 0, explanation: "Structured data constrains behavior; arbitrary command strings can accidentally become a code-execution interface." },
      { prompt: "What does an instruction hook budget help stop?", options: ["A Lua loop that fails to return control", "All allocation in Rust callbacks", "Windows process exit", "Incorrect UTF-16"], answer: 0, explanation: "Periodic VM hooks can abort scripts that execute too many Lua instructions, though separate limits are still needed for time, memory, and host callbacks." },
      { prompt: "Why does the host validate an action again after the script chooses it?", options: ["The game state may have changed since the copied snapshot", "Lua tables cannot be read twice", "Validation disables ownership", "The action becomes a file path"], answer: 0, explanation: "Snapshot and action processing happen at different times, so IDs, state, bounds, and permissions must still be current." },
      { prompt: "What should happen when a script produces an unknown state-machine state?", options: ["Stop with a clear error instead of guessing a transition", "Repeat the last input forever", "Treat it as success", "Write it into game memory"], answer: 0, explanation: "Unknown state indicates a broken invariant. Failing closed makes the control-flow mistake visible." },
      { prompt: "Why queue Lua requests until the script returns successfully?", options: ["A later script error cannot leave half-committed host actions", "Queues make pointers local", "Lua has no return values", "It avoids all locking"], answer: 0, explanation: "Collect-then-validate gives script execution transaction-like behavior and prevents partial effects after failure." },
      { prompt: "What does a Lua closure remember?", options: ["Values from the surrounding lexical environment used by the function", "Every Windows thread", "The executable import table", "Only global variables"], answer: 0, explanation: "A closure keeps access to captured locals even after the outer function has returned." },
      { prompt: "Why load only needed Lua standard libraries?", options: ["The script receives fewer unnecessary capabilities and a smaller documented API", "It makes dynamic typing static", "It guarantees a script has no bugs", "It turns Lua into Rust"], answer: 0, explanation: "Library selection is one layer of capability control, alongside host validation, resource limits, and cancellation." },
      { prompt: "What does a lexer produce from source text?", options: ["A sequence of tokens", "A Windows process", "Physical page tables", "A vtable"], answer: 0, explanation: "The lexer groups characters into meaningful tokens before the parser checks their grammatical structure." },
      { prompt: "Why does a stack VM pop the right operand before the left operand?", options: ["The right operand was pushed last", "Lua reads expressions backward", "Integers have reverse endianness", "The instruction pointer is negative"], answer: 0, explanation: "A stack is last-in, first-out. Operand order matters for subtraction, division, and comparisons." },
      { prompt: "What makes an interpreter value dynamically typed?", options: ["Its runtime representation carries a type tag that operations inspect", "It has no type at all", "It is always a string", "Rust guesses from the address"], answer: 0, explanation: "Dynamic typing moves many checks to runtime; it does not remove types from values or operations." },
      { prompt: "Why can two closures need one shared upvalue cell?", options: ["Both closures captured the same mutable local and must observe the same updates", "Closures cannot store integers", "A cell changes byte order", "Each closure is a Windows thread"], answer: 0, explanation: "Copying the captured value separately would break the source-language meaning when either closure modifies it." },
      { prompt: "What is a garbage collector root?", options: ["A live starting reference such as globals, active frames, or host-held values", "The first source-code token", "A table's longest key", "A native return address"], answer: 0, explanation: "Tracing begins from roots and follows reachable objects; unreachable objects can then be reclaimed." },
      { prompt: "Why should an embedded host limit callback duration separately from Lua bytecode steps?", options: ["A callback can block inside Rust while no Lua instruction is being counted", "Rust callbacks contain no code", "Bytecode budgets allocate files", "Callbacks cannot return errors"], answer: 0, explanation: "A VM hook controls interpreted instructions, not arbitrary time spent inside a native callback." }
    ]
  };

  // The book's lessons were regrouped into twelve balanced chapters. These
  // source lists keep follow-ups inside the current subject area before the
  // relevance scorer ranks them for the exact page.
  const REVIEW_SOURCES_BY_CHAPTER = {
    1: [1],
    2: [2],
    3: [2, 3],
    4: [4],
    5: [5],
    6: [6, 10],
    7: [7, 9, 10],
    8: [3, 5, 7, 10],
    9: [8, 10],
    10: [9, 10],
    11: [7, 9, 10],
    12: [11],
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

  function studyTokens(text) {
    const matches = String(text || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .match(/[a-z0-9_+#.-]{3,}/g) || [];
    const tokens = new Set();
    matches.forEach((rawToken) => {
      const token = rawToken.replace(/^[.+-]+|[.+-]+$/g, "");
      if (!token || STUDY_STOP_WORDS.has(token)) return;
      tokens.add(token);
      if (token.length > 5 && token.endsWith("ies")) tokens.add(`${token.slice(0, -3)}y`);
      if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) {
        tokens.add(token.slice(0, -1));
      }
    });
    return tokens;
  }

  function addWeightedStudyTerms(target, text, weight) {
    studyTokens(text).forEach((token) => {
      target.set(token, Math.min(24, (target.get(token) || 0) + weight));
    });
  }

  function stableQuestionHash(text) {
    return Array.from(String(text || "")).reduce(
      (total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0,
      2166136261
    );
  }

  function lessonStudyTerms(root) {
    const terms = new Map();
    const lesson = root.closest(".markdown-section") || document.body;
    const lessonHeader = lesson.querySelector(".lesson-header");
    addWeightedStudyTerms(terms, lessonHeader && lessonHeader.querySelector("h1")?.textContent, 12);
    addWeightedStudyTerms(terms, lessonHeader && lessonHeader.querySelector("p")?.textContent, 8);
    addWeightedStudyTerms(terms, root.querySelector("h3")?.textContent, 10);
    addWeightedStudyTerms(terms, root.querySelector(".academy-quiz__prompt")?.textContent, 10);
    lesson.querySelectorAll("h2, h3, h4").forEach((heading) => {
      if (!root.contains(heading)) addWeightedStudyTerms(terms, heading.textContent, 5);
    });
    return terms;
  }

  function questionRelevance(question, terms) {
    let score = 0;
    studyTokens(question.prompt).forEach((token) => { score += (terms.get(token) || 0) * 4; });
    studyTokens(question.explanation).forEach((token) => { score += (terms.get(token) || 0) * 2; });
    question.options.forEach((option) => {
      studyTokens(option).forEach((token) => { score += terms.get(token) || 0; });
    });
    return score;
  }

  function selectRelevantFollowUps(root, reviewBank, seed) {
    if (!reviewBank.length) return [];
    const terms = lessonStudyTerms(root);
    return reviewBank
      .map((question) => ({
        question,
        score: questionRelevance(question, terms),
        tieBreak: stableQuestionHash(`${seed}:${question.prompt}`),
      }))
      .sort((left, right) => right.score - left.score || left.tieBreak - right.tieBreak)
      .slice(0, Math.min(FOLLOW_UP_COUNT, reviewBank.length))
      .map((ranked) => ranked.question);
  }

  function initializeQuiz(root) {
    // GitBook may restore a cloned, already-mutated quiz after page navigation.
    // A WeakSet recognizes live nodes that still have their listeners, while a
    // cloned node is rebuilt even if it copied the data-learning-ready flag.
    if (initializedQuizRoots.has(root)) return;
    initializedQuizRoots.add(root);
    root.querySelectorAll("[data-quiz-runtime]").forEach((node) => node.remove());
    root.dataset.learningReady = "true";

    const quizId = root.dataset.quizId;
    const quizType = root.dataset.quizType;
    const seed = String(root.dataset.quizSeed || quizId || "quiz");
    const correctAnswer = normalizeAnswer(root.dataset.answer);
    const acceptedAnswers = [correctAnswer]
      .concat(String(root.dataset.alternatives || "").split("||").map(normalizeAnswer))
      .filter(Boolean);
    const optionContainer = root.querySelector(".academy-quiz__options");
    if (quizType === "multiple-choice" && optionContainer) {
      const originalOptions = Array.from(optionContainer.querySelectorAll("[data-quiz-option]"));
      const rotation = originalOptions.length
        ? Array.from(seed).reduce((total, character) => total + character.charCodeAt(0), 0) % originalOptions.length
        : 0;
      originalOptions
        .slice(rotation)
        .concat(originalOptions.slice(0, rotation))
        .forEach((button, index) => {
          const letter = button.querySelector(".academy-quiz__option-letter");
          if (letter) letter.textContent = String.fromCharCode(65 + index);
          optionContainer.append(button);
        });
    }
    const optionButtons = Array.from(root.querySelectorAll("[data-quiz-option]"));
    const input = root.querySelector("[data-quiz-input]");
    const submit = root.querySelector("[data-quiz-submit]");
    const retry = root.querySelector("[data-quiz-retry]");
    const feedback = root.querySelector("[data-quiz-feedback]");
    const result = root.querySelector("[data-quiz-result]");
    const saved = root.querySelector("[data-quiz-saved]");
    const storageKey = `${STORAGE_PREFIX}${quizId}`;
    const chapter = Number(root.dataset.quizChapter);
    const reviewBank = (REVIEW_SOURCES_BY_CHAPTER[chapter] || [])
      .flatMap((sourceChapter) => REVIEW_BANKS[sourceChapter] || []);
    const followUpQuestions = selectRelevantFollowUps(root, reviewBank, seed);
    const totalQuestions = 1 + followUpQuestions.length;
    let selectedAnswer = "";
    let firstQuestionCorrect = false;
    let followUpIndex = 0;
    let followUpSelected = null;
    let followUpCorrect = 0;
    let followUpOptionButtons = [];

    let firstProgress = null;
    let extension = null;
    let extensionProgress = null;
    let extensionRemaining = null;
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
    let firstNext = null;

    // Normalize markup restored from GitBook's page cache before applying the
    // current saved attempt. This prevents disabled answers from a prior visit.
    root.classList.remove("is-unanswered", "is-correct", "is-incorrect", "is-follow-up-active");
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
    }

    if (followUpQuestions.length) {
      firstProgress = element(
        "span",
        "academy-quiz__question-progress",
        `Question 1 of ${totalQuestions}`
      );
      firstProgress.dataset.quizRuntime = "true";
      root.querySelector(".academy-quiz__header").append(firstProgress);

      firstNext = element(
        "button",
        "academy-quiz__check academy-quiz__check--next",
        "Next question →"
      );
      firstNext.type = "button";
      firstNext.hidden = true;
      firstNext.dataset.quizRuntime = "true";
      retry.parentNode.append(firstNext);

      extension = element("section", "academy-quiz__extension");
      extension.hidden = true;
      extension.dataset.quizRuntime = "true";
      const extensionHeader = element("div", "academy-quiz__extension-header");
      extensionHeader.setAttribute("role", "group");
      extensionHeader.setAttribute("aria-label", "Follow-up quiz heading");
      const extensionHeaderCopy = element("div", "academy-quiz__extension-title");
      extensionRemaining = element("h4", "");
      extensionHeaderCopy.append(
        element("span", "academy-quiz__extension-eyebrow", "Keep going"),
        extensionRemaining
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

    function updateRemainingCount(remaining) {
      if (!extensionRemaining) return;
      if (remaining <= 0) {
        extensionRemaining.textContent = "No questions left";
        return;
      }
      extensionRemaining.textContent = `${remaining} question${remaining === 1 ? "" : "s"} left`;
    }

    function renderFollowUp() {
      if (!extension || !followUpQuestions.length) return;
      const question = followUpQuestions[followUpIndex];
      followUpSelected = null;
      extension.hidden = false;
      extensionBody.hidden = false;
      extensionSummary.hidden = true;
      updateRemainingCount(followUpQuestions.length - followUpIndex);
      extensionProgress.textContent = `Question ${followUpIndex + 2} of ${totalQuestions}`;
      extensionPrompt.textContent = question.prompt;
      extensionFeedback.hidden = true;
      extensionCheck.hidden = false;
      extensionNext.hidden = true;
      extensionOptions.replaceChildren();
      const followUpRotation = question.options.length
        ? (Array.from(seed).reduce((total, character) => total + character.charCodeAt(0), 0) + followUpIndex)
          % question.options.length
        : 0;
      const orderedOptionIndexes = question.options
        .map((_optionText, index) => index)
        .slice(followUpRotation)
        .concat(question.options.map((_optionText, index) => index).slice(0, followUpRotation));
      followUpOptionButtons = orderedOptionIndexes.map((originalIndex, visualIndex) => {
        const optionText = question.options[originalIndex];
        const button = element("button", "academy-quiz__extension-option");
        button.type = "button";
        button.dataset.optionIndex = String(originalIndex);
        button.setAttribute("aria-pressed", "false");
        button.append(
          element("span", "academy-quiz__option-letter", String.fromCharCode(65 + visualIndex)),
          element("span", "", optionText)
        );
        button.addEventListener("click", () => {
          followUpSelected = originalIndex;
          followUpOptionButtons.forEach((candidate) => {
            const active = Number(candidate.dataset.optionIndex) === originalIndex;
            candidate.classList.toggle("is-selected", active);
            candidate.setAttribute("aria-pressed", String(active));
          });
          extensionFeedback.hidden = true;
        });
        extensionOptions.append(button);
        return button;
      });
    }

    function beginFollowUps() {
      if (!extension || !followUpQuestions.length) return;
      root.classList.add("is-follow-up-active");
      renderFollowUp();
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
      followUpOptionButtons.forEach((button) => {
        const originalIndex = Number(button.dataset.optionIndex);
        button.disabled = true;
        button.classList.toggle("is-correct-answer", originalIndex === question.answer);
        button.classList.toggle("is-wrong-answer", originalIndex === followUpSelected && !wasCorrect);
      });
      extensionCheck.hidden = true;
      extensionNext.hidden = false;
      updateRemainingCount(followUpQuestions.length - followUpIndex - 1);
      extensionNext.textContent = followUpIndex === followUpQuestions.length - 1
        ? "See quiz score →"
        : "Next question →";
    }

    function finishFollowUps() {
      const totalCorrect = (firstQuestionCorrect ? 1 : 0) + followUpCorrect;
      root.classList.add("is-follow-up-active");
      extension.hidden = false;
      extensionBody.hidden = true;
      extensionSummary.hidden = false;
      updateRemainingCount(0);
      extensionProgress.textContent = "Complete";
      extensionScore.textContent = `${totalCorrect} / ${totalQuestions}`;
      extensionScoreMessage.textContent = totalCorrect === totalQuestions
        ? `Excellent — you understood all ${totalQuestions} ideas.`
        : "Read the explanations, then try again. Understanding matters more than speed.";
      safeStorageSet(storageKey, JSON.stringify({
        answer: currentAnswer(),
        correct: firstQuestionCorrect,
        completed: true,
        totalCorrect,
      }));
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
      updateRemainingCount(followUpQuestions.length);
      extensionProgress.textContent = `Question 2 of ${totalQuestions}`;
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
      if (firstNext) firstNext.hidden = false;
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
      saved.textContent = "Question 1 saved";
      // Keep the explanation visible after a restored answer too. Automatically
      // jumping into a cached follow-up made the quiz appear stuck after navigation.
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
      root.classList.remove("is-follow-up-active");
      if (firstProgress) firstProgress.textContent = `Question 1 of ${totalQuestions}`;
      if (firstNext) firstNext.hidden = true;
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
    if (firstNext) firstNext.addEventListener("click", beginFollowUps);
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
        if (attempt.completed && Number.isFinite(Number(attempt.totalCorrect))) {
          followUpCorrect = Math.max(
            0,
            Math.min(followUpQuestions.length, Number(attempt.totalCorrect) - (firstQuestionCorrect ? 1 : 0))
          );
          finishFollowUps();
        }
      } catch (_error) {
        safeStorageRemove(storageKey);
      }
    }
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
