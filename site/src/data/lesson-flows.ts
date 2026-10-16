// Message-flow scenarios that replace generated pictures in later lessons. Each export is used by one
// <FlowDiagram> in the lesson named in its comment; the engine is src/components/FlowDiagram.astro.
import type { FlowScenario } from '../lib/flow-model';

/** Lesson 3.2 (pages/3/02.mdx): reading four bytes from another process. */
export const processReadFlows: readonly FlowScenario[] = [{
  id: 'read-four-bytes', tab: 'Read four bytes',
  title: 'Reading four bytes from the game',
  summary: 'The game has 64 00 00 00 at its address 0x5000, which encodes u32 100. Windows copies the bytes into the tool; the tool decodes its own copy.',
  lanes: [{ id: 'tool', label: 'Tool' }, { id: 'windows', label: 'Windows' }, { id: 'game', label: 'Game process' }],
  steps: [
    { from: 'tool', to: 'windows', kind: 'request', label: 'Read 4 bytes at game address 0x5000', caption: 'The tool names the game by handle and gives a number that only means something inside the game’s address map.' },
    { from: 'windows', to: 'windows', kind: 'local', label: 'Check the target handle', caption: 'Windows first checks that the handle is valid and allows reading.' },
    { from: 'windows', to: 'game', kind: 'request', label: 'Look up 0x5000 in the game’s map', caption: 'The address is translated with the game’s page tables, not the tool’s.' },
    { from: 'game', to: 'windows', kind: 'data', label: '64 00 00 00', caption: 'These four bytes are what the game has stored there.' },
    { from: 'windows', to: 'tool', kind: 'response', label: 'Copy into the tool’s own buffer', caption: 'The tool now holds a copy. It does not share the game’s memory.' },
    { from: 'tool', to: 'tool', kind: 'local', label: 'Decode the copy: u32 100', caption: 'Little-endian 64 00 00 00 is 0x00000064, which is 100. A local pointer numbered 0x5000 would use the tool’s own address map instead.' },
  ],
}];

/** Lesson 8.2 (pages/8/02.mdx): the copied loader path is temporary workspace. */
export const loaderPathFlows: readonly FlowScenario[] = [{
  id: 'loader-path', tab: 'Load a DLL',
  title: 'The copied path is only needed while the DLL loads',
  summary: 'Waiting for the loader separates the release of the path buffer from the loaded DLL’s lifetime and its explicit start.',
  lanes: [{ id: 'injector', label: 'Injector' }, { id: 'target', label: 'Course target' }],
  steps: [
    { from: 'injector', to: 'target', kind: 'data', label: 'Copy the NUL-terminated UTF-16 path', caption: 'The path has to exist in the target’s memory, because the loader runs there and reads it from there.' },
    { from: 'injector', to: 'target', kind: 'request', label: 'Run LoadLibraryW on that path', caption: 'The loader reads the path and maps the DLL into the target.' },
    { from: 'target', to: 'target', kind: 'local', label: 'Loader maps the DLL', caption: 'This work happens inside the target, on the target’s time.' },
    { from: 'target', to: 'injector', kind: 'response', label: 'Wait finishes: loading is done', caption: 'The injector waits for the loader, so it knows the path is no longer being read.' },
    { from: 'injector', to: 'target', kind: 'control', label: 'Release the path buffer', caption: 'The path was temporary workspace. Freeing it does not unload the DLL.' },
    { from: 'injector', to: 'target', kind: 'request', label: 'Call gha_start', caption: 'Starting the DLL’s work is a separate, explicit step after loading.' },
  ],
}];

const iatLanes = [{ id: 'call', label: 'Call site' }, { id: 'slot', label: 'IAT slot' }, { id: 'real', label: 'MessageBoxW' }] as const;

/** Lesson 8.4 (pages/8/04.mdx): the same call instruction through three IAT slot states. */
export const iatFlows: readonly FlowScenario[] = [
  {
    id: 'before', tab: 'Before installing',
    title: 'The call reaches the real function',
    summary: 'The call instruction stays in place. Before the hook, its IAT slot holds MessageBoxW.',
    lanes: iatLanes,
    steps: [
      { from: 'call', to: 'slot', kind: 'request', label: 'call through the MessageBoxW slot', caption: 'The code does not hold the function’s address; it reads it from the import address table slot.' },
      { from: 'slot', to: 'real', kind: 'data', label: 'Slot value: MessageBoxW', caption: 'The slot holds the real destination, so the call lands in MessageBoxW.' },
    ],
  },
  {
    id: 'installed', tab: 'Installed',
    title: 'The same call reaches the replacement',
    summary: 'Installation changes the verified slot value. The call instruction itself is untouched.',
    lanes: [{ id: 'call', label: 'Call site' }, { id: 'slot', label: 'IAT slot' }, { id: 'hook', label: 'hooked_message_box' }, { id: 'real', label: 'MessageBoxW' }],
    steps: [
      { from: 'call', to: 'slot', kind: 'request', label: 'call through the same slot', caption: 'Identical instruction, identical slot address.' },
      { from: 'slot', to: 'hook', kind: 'data', label: 'Slot value: hooked_message_box', caption: 'Installation replaced the slot’s contents after checking it still held the expected original.' },
      { from: 'hook', to: 'real', kind: 'request', label: 'Call the saved original', caption: 'The replacement can still reach the real function through the address it saved before installing.' },
    ],
  },
  {
    id: 'removed', tab: 'After removal',
    title: 'Removal restores the saved slot',
    summary: 'Writing the saved original back returns the route to the first picture.',
    lanes: iatLanes,
    steps: [
      { from: 'slot', to: 'slot', kind: 'local', label: 'Restore the saved slot value', caption: 'Removal puts back exactly the value that installation saved.' },
      { from: 'call', to: 'slot', kind: 'request', label: 'call through the same slot', caption: 'Still the same unchanged instruction.' },
      { from: 'slot', to: 'real', kind: 'data', label: 'Slot value: MessageBoxW', caption: 'The call reaches MessageBoxW again.' },
    ],
  },
];

/** Lesson 8.7 (pages/8/07.mdx): a setting becomes a command with its own copy. */
export const menuCommandFlows: readonly FlowScenario[] = [{
  id: 'menu-command', tab: 'Menu to worker',
  title: 'A checkbox edits settings; a command carries a copy',
  summary: 'The checkbox edits ordinary settings. The worker receives a deliberate command and owns the resources that carry it out.',
  lanes: [{ id: 'menu', label: 'Menu' }, { id: 'settings', label: 'Settings' }, { id: 'channel', label: 'Channel' }, { id: 'worker', label: 'Worker' }],
  steps: [
    { from: 'menu', to: 'settings', kind: 'data', label: 'Checkbox changes a Settings value', caption: 'The menu owns this Settings value, so changing it is an ordinary edit.' },
    { from: 'menu', to: 'channel', kind: 'data', label: 'Send a command carrying a Settings copy', caption: 'The command holds its own copy, so the worker never reads the menu’s live value.' },
    { from: 'channel', to: 'worker', kind: 'data', label: 'Command arrives', caption: 'The worker receives it on its own thread, when it is ready.' },
    { from: 'worker', to: 'worker', kind: 'local', label: 'Apply process effects and own cleanup', caption: 'Opening handles, touching the process and releasing them again all stay with the worker.' },
  ],
}];

/** Lesson 10.6 (pages/10/06.mdx): both threads start from the same stale 1,000. */
export const lostGoldFlows: readonly FlowScenario[] = [{
  id: 'lost-update', tab: 'Lost update',
  title: 'Two threads update one gold value',
  summary: 'Both threads start from 1,000. Writing 1,500 and then 700 loses the reward; the intended combined result is 1,200.',
  lanes: [{ id: 'reward', label: 'Reward thread' }, { id: 'gold', label: 'Gold in memory' }, { id: 'purchase', label: 'Purchase thread' }],
  steps: [
    { from: 'reward', to: 'gold', kind: 'request', label: 'Read gold', caption: 'The reward thread loads the value it will add 500 to.' },
    { from: 'gold', to: 'reward', kind: 'response', label: '1,000', caption: 'The reward thread now holds a copy of 1,000.' },
    { from: 'purchase', to: 'gold', kind: 'request', label: 'Read gold', caption: 'The purchase thread reads before the reward has written anything.' },
    { from: 'gold', to: 'purchase', kind: 'response', label: '1,000', caption: 'Both threads hold the same copy of 1,000. Neither can see the other’s plan.' },
    { from: 'reward', to: 'gold', kind: 'data', label: 'Write 1,500', caption: '1,000 + 500 is stored.' },
    { from: 'purchase', to: 'gold', kind: 'data', label: 'Write 700', caption: 'The purchase computed 1,000 − 300 from its old copy and overwrites the 1,500.' },
    { from: 'gold', to: 'gold', kind: 'local', label: 'Final gold: 700 (should be 1,200)', caption: 'Each thread was correct on its own. The result is wrong because the read and the write were not one step.' },
  ],
}];

/** Lesson 11.2 (pages/11/02.mdx): a lock cycle between a game thread and DllMain. */
export const loaderLockFlows: readonly FlowScenario[] = [{
  id: 'lock-cycle', tab: 'Deadlock',
  title: 'A game thread and DllMain wait for each other',
  summary: 'Each needed lock is already held by the opposite thread. The arrows are waits, not completed work.',
  lanes: [{ id: 'a', label: 'Thread A' }, { id: 'game', label: 'game_lock' }, { id: 'loader', label: 'loader_lock' }, { id: 'b', label: 'Thread B (in DllMain)' }],
  steps: [
    { from: 'a', to: 'game', kind: 'control', label: 'A takes game_lock', caption: 'Thread A holds the game’s own lock while it works.' },
    { from: 'b', to: 'loader', kind: 'control', label: 'B holds loader_lock', caption: 'DllMain runs while the loader lock is held, so Thread B holds it.' },
    { from: 'a', to: 'loader', kind: 'request', label: 'A waits for loader_lock', caption: 'Thread A needs the loader lock and Thread B has it, so A stops here.' },
    { from: 'b', to: 'game', kind: 'request', label: 'B waits for game_lock', caption: 'Thread B needs the game lock and Thread A has it, so B stops here too. The wait cycle is closed and neither thread can continue.' },
  ],
}];

/** Lesson 12.1 (pages/12/01.mdx): the script calls back into the host. */
export const luaLogFlows: readonly FlowScenario[] = [{
  id: 'log-callback', tab: 'Script calls host',
  title: 'The host runs the script and the script calls back',
  summary: 'The script’s game.log("observer started") call sends its argument back through the callback the host supplied.',
  lanes: [{ id: 'host', label: 'Native host' }, { id: 'lua', label: 'Lua script' }],
  steps: [
    { from: 'host', to: 'lua', kind: 'control', label: 'Run the script', caption: 'The host asks its Lua runtime to execute the script.' },
    { from: 'lua', to: 'host', kind: 'request', label: 'game.log("observer started")', caption: 'game.log was registered by the host, so this call crosses back into native code with the message.' },
    { from: 'host', to: 'lua', kind: 'response', label: 'Callback logs it, then returns', caption: 'The host decides what logging means (a file, a console or a buffer); then the script continues after the call.' },
  ],
}];

const typedLanes = [{ id: 'lua', label: 'Lua script' }, { id: 'callback', label: 'Registered log callback' }] as const;

/** Lesson 12.3 (pages/12/03.mdx): a typed callback converts or refuses its argument. */
export const luaTypedFlows: readonly FlowScenario[] = [
  {
    id: 'string', tab: 'log("sample")',
    title: 'A string converts to the callback’s String',
    summary: 'The registered callback requires a Rust String. A Lua string converts and reaches the host.',
    lanes: typedLanes,
    steps: [
      { from: 'lua', to: 'callback', kind: 'data', label: 'log("sample")', caption: 'The script passes a Lua string.' },
      { from: 'callback', to: 'callback', kind: 'local', label: 'Convert to String: succeeds', caption: 'The registered signature asks for a String, and a Lua string can become one.' },
      { from: 'callback', to: 'lua', kind: 'response', label: 'Host receives "sample"', caption: 'The host’s Rust code sees an ordinary String.' },
    ],
  },
  {
    id: 'table', tab: 'log({})',
    title: 'A table fails the callback’s type conversion',
    summary: 'The same callback refuses a table with a Lua type error instead of an unchecked cast.',
    lanes: typedLanes,
    steps: [
      { from: 'lua', to: 'callback', kind: 'data', label: 'log({})', caption: 'The script passes a table instead.' },
      { from: 'callback', to: 'callback', kind: 'local', label: 'Convert to String: fails', caption: 'A table has no conversion to String, and the host never guesses.' },
      { from: 'callback', to: 'lua', kind: 'control', label: 'Lua type error', caption: 'The script gets an error it can see. The host’s Rust code never runs on a wrong value.' },
    ],
  },
];

/** Lesson 12.4 (pages/12/04.mdx): slot plus generation identifies one entity. */
export const luaSlotFlows: readonly FlowScenario[] = [{
  id: 'stale-handle', tab: 'Stale handle',
  title: 'The slot number stays 3, the generation moves from 6 to 7',
  summary: 'Checking both parts prevents an old handle from naming the new entity that reused its slot.',
  lanes: [{ id: 'lua', label: 'Lua script' }, { id: 'host', label: 'Host entity table' }],
  steps: [
    { from: 'host', to: 'lua', kind: 'response', label: 'Handle: slot 3, generation 6', caption: 'Lua remembers both numbers.' },
    { from: 'host', to: 'host', kind: 'local', label: 'Slot 3 reused as generation 7', caption: 'The host reuses the cheap slot, and bumps the generation to mark it as a new life.' },
    { from: 'lua', to: 'host', kind: 'request', label: 'Use handle: slot 3, generation 6', caption: 'The script, unaware, still holds the old handle.' },
    { from: 'host', to: 'lua', kind: 'control', label: 'Rejected: slot 3 is generation 7, not 6', caption: 'The slot matches but the generation does not, so the handle names a dead entity. The host refuses instead of acting on whoever lives in slot 3 now.' },
  ],
}];

/** Lesson 13.5 (pages/13/05.mdx): remove a hook only after its callbacks drain. */
export const hookDrainFlows: readonly FlowScenario[] = [{
  id: 'drain', tab: 'Drain then remove',
  title: 'Resources stay alive until the active callbacks reach zero',
  summary: 'A separate drain example counts 2, 1, 0 active callbacks. Removal then restores the exact original bytes.',
  lanes: [{ id: 'remover', label: 'Remover' }, { id: 'hook', label: 'Hook callbacks' }],
  steps: [
    { from: 'remover', to: 'hook', kind: 'control', label: 'Request removal: block new callbacks', caption: 'New callback work is refused from this moment, so the count can only go down.' },
    { from: 'hook', to: 'hook', kind: 'local', label: 'Active callbacks: 2, then 1, then 0', caption: 'While two calls are still running inside the hook, its code and data must stay alive. Each caller that returns lowers the count by one.' },
    { from: 'remover', to: 'hook', kind: 'data', label: 'Restore the exact original site bytes', caption: 'At 0, nothing is running inside the hook, so it is now safe to put the original bytes back.' },
    { from: 'remover', to: 'remover', kind: 'local', label: 'Release the hook’s resources', caption: 'The hook’s memory is freed last, after nothing can reach it.' },
  ],
}];

/** Lesson 14.2 (pages/14/02.mdx): a pending read completes after an interrupt. */
export const pendingReadFlows: readonly FlowScenario[] = [{
  id: 'pending-read', tab: 'Pending read',
  title: 'A read with no data yet completes after a key interrupt',
  summary: 'The toy read owns eight bytes of capacity. Only two event bytes are returned after the interrupt.',
  lanes: [{ id: 'caller', label: 'Caller' }, { id: 'driver', label: 'Driver' }, { id: 'keypad', label: 'Keypad' }],
  steps: [
    { from: 'caller', to: 'driver', kind: 'request', label: 'Read with an 8-byte buffer', caption: 'The request carries room for eight bytes.' },
    { from: 'driver', to: 'driver', kind: 'local', label: 'No key event yet: park the IRP', caption: 'There is nothing to return, so the driver keeps the request instead of blocking.' },
    { from: 'driver', to: 'caller', kind: 'control', label: 'STATUS_PENDING', caption: 'The caller is told the request is not finished.' },
    { from: 'keypad', to: 'driver', kind: 'data', label: 'Key interrupt: 2 event bytes', caption: 'Later, a key press arrives as an interrupt carrying two bytes.' },
    { from: 'driver', to: 'caller', kind: 'response', label: 'Copy 2 bytes, complete: count 2', caption: 'The driver fills the first two of the eight bytes and completes the IRP. The count says how many bytes are meaningful, not how large the buffer was.' },
  ],
}];

/** Lesson 15.9 (pages/15/09.mdx): a retry returns the stored result. */
export const pickupRetryFlows: readonly FlowScenario[] = [{
  id: 'pickup-retry', tab: 'Retried pickup',
  title: 'A repeated pickup returns the stored result',
  summary: 'The first pickup commits consumption and score 1 together. A retry carrying the same identity gets that result back, so the score stays 1.',
  lanes: [{ id: 'client', label: 'Client' }, { id: 'server', label: 'Server (score 0, coin C)' }],
  steps: [
    { from: 'client', to: 'server', kind: 'request', label: 'Pick up coin C', caption: 'The request carries an identity for this pickup.' },
    { from: 'server', to: 'client', kind: 'response', label: 'Commit C and score 1; reply is lost', caption: 'Consuming the coin and raising the score are committed together. The reply is lost or delayed, so the client cannot tell whether it worked.' },
    { from: 'client', to: 'server', kind: 'request', label: 'Same pickup again (retry)', caption: 'The client sends the same request with the same identity.' },
    { from: 'server', to: 'client', kind: 'response', label: 'Stored result: score 1, no second reward', caption: 'The server recognises the identity and returns the committed result instead of paying again. The score stays 1.' },
  ],
}];
