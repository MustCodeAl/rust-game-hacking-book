# Hand-off plan for ChatGPT (written 2026-10-04)

The previous assistant ran out of usage. This file is everything needed to continue. **Read it fully, then
read `CLAUDE.md`, `BOOK_REVISION_PLAN.md`, and `BOOK_REVISION_PROGRESS.md`.** The book is "Game Hacking
Academy": a beginner (about 15 years old) book, Astro 7 + Starlight in `site/`, live at
https://mustcodeal.github.io/rust-game-hacking-book/ (served from branch `gh-pages`).

## Latest user requests — 2026-10-05

These requests supersede conflicting details elsewhere in this handoff. Record
new steering here and verification in `BOOK_REVISION_PROGRESS.md`.

- **Reader appearance:** fix black code blocks and diagrams. Keep diagrams,
  tables, and images visible, at a compact size. Do not replace them with long
  spoken descriptions.
- **Narration:** skip diagrams, images, and tables in the read-aloud queue and
  listening TXT export. Avoid a native reader reciting their labels or rows.
  Spell register identifiers as separate letters: `eax` becomes “e a x,”
  `ecx` becomes “e c x,” and similarly for other registers and initialisms.
- **Browser priority:** Microsoft Edge Reading mode and its Natural/Neural
  voices come first; Chrome comes second. Native Edge voices are selected in
  Edge's Voice options. Do not claim the site's speech API exposes every native
  voice. Keep sentences together and preserve a chosen browser voice.
- **Margin comments:** short authored lesson explanations, rather than personal
  notes. Include TL;DRs, alternative explanations or approaches, and grounded
  narrative asides. The user's kernel-component example demonstrates the tone;
  it does not establish a fact to repeat without a source.
- **Minimal controls:** smaller buttons and less prominent settings. Avoid
  wrapping every section in a square box. In particular, Finished lesson and
  Previous/Next should be plain, compact parts of the article.
- **Compact layout:** reduce empty space in live labs, graphics, tables, and
  individual columns. Keep machine notation together and allow local scrolling
  where genuinely needed. Do not squeeze prose into unreadable columns.
- **Teach with mechanisms:** animations must simulate what changes, not act as
  slide shows or merely move text around. Show actual reads, writes, positions,
  bit movement, path expansion, state changes, and call routes. Derive numbers
  from the lesson and show cause and result.
- **Specific repairs:** “The toy CPU's instructions” must keep byte pairs and
  instruction names intact. “Try a different memory byte” must mark the next
  action, its read source, the copied byte, and written registers. Audit other
  diagrams for comparable layout and visual-indicator problems.
- **Interactive learning:** use appropriate code tracers, movement/physics
  controls, editable state networks, pathfinding/cost visuals, and reset/hint
  controls as simulations. Logic blanks, choices with visible consequences,
  targeted review, or progress displays belong only where they improve an
  existing lesson tool. Do not add an exercise track; new exercises are allowed
  where they replace an existing quiz/live lab or clearly suit the lesson.
- **Artwork:** more CC0/public-domain images and optional short GIFs that
  illustrate concepts. Original GIFs are allowed by this explicit request,
  despite the older SVG-only suggestion in T4. Keep them small, provide still
  alternatives, respect reduced motion, and record provenance.
- **Optional sound:** original relaxing background music/audio and gentle sound
  effects, with clear pause/stop and volume controls. Sound starts off; users
  must choose to enable it. Record rights for every audio asset.
- **Delivery:** finish and publish the important verified reader, layout, and
  simulation fixes first. Work faster with parallel agents where useful; the
  user explicitly authorized spawning agents. Preserve the task order and
  build/link/browser/still/publication checks. Write down every new request.

Additional steering on October 5:

- Tables may have brief useful narration, but never an obnoxious recital of
  cells or raw numeric literals. Keep numeric tables silent by default. Skip
  long addresses/bit patterns in prose while retaining small worked arithmetic.
- Fix narration of hover cards. Their optional body text and dynamic tooltips
  are excluded; the surrounding sentence and link words remain.
- Use **one quiz per page** unless another quiz is necessary. Replace redundant
  quizzes with appropriate simulations rather than adding more exercises.
- Keep quiz questions about that page. A small page may need limited earlier
  prerequisite material. Balance answer lengths so the correct choice is not
  predictably the longest. Randomize answer order.
- Add **New quiz**, which draws a different random batch, and **Retake quiz**,
  which reuses the last batch with shuffled questions and shuffled answers.
- Small pages have five questions; longer pages have six to ten. Author at least
  three times the batch size as distinct questions: five needs at least fifteen,
  ten needs at least thirty. The user's thirty-question example also demands
  distinct questions, rather than repeated wording.
- Add an optional sound when marking a lesson or chapter done. Use the sound
  preference; do not make completion noisy when sound effects are off.
- Move **Mark chapter done** to the table of contents. Completing every lesson
  automatically completes its chapter. Checks for the whole completed chapter
  use a darker colour.

Current task state: T1–T6 are complete, published, and confirmed live. Source
receipts: T1 `74d3016`, T2 `a505cfd`, T3 `b5400fb`, T4 `f0c2c4e`, T5 `8b6444c`,
T6 `05b1729`. T6 Pages receipt is `0be0aa2`; the Macrodox page and new SVG
matched the verified build.

T7 housekeeping and the finished runtime/completion batch are verified and ready to publish. Every lesson now has one quiz, consolidating
42 inline questions from 36 pages into their page's pool. Chapter-wide
borrowing is removed. Source 8.9 has 30 distinct questions/ten per batch;
each Chapter 15 page has 15/five. New quiz changes batch membership; Retake
reorders the same batch and choices. Completed attempts survive reload.
Chapter marking remains on Contents, automatic completion uses deeper checks,
and optional completion sounds respect the saved effects preference.

**Remaining content work:** 137 older page pools still need their five-to-ten
question batches and at least three-times distinct question pools. Do not
claim those requests complete or restore off-topic chapter borrowing.
T8 typing-practice polish remains pending. See BOOK_REVISION_PROGRESS.md
for executed checks and publication receipts.

## 0. Paste-ready prompt

> Continue the Game Hacking Academy book. Work in the repo at
> `/Users/notlaggy/Documents/GitFolder/gamehackingacademy.github.io/.claude/worktrees/reader-progress-tools`
> (branch `claude/reader-progress-tools`, same commits as `origin/codex/book-revision`). Read
> `HANDOFF_PLAN.md`, `CLAUDE.md`, and `BOOK_REVISION_PROGRESS.md`, then do the tasks in `HANDOFF_PLAN.md`
> section 4 in order, one at a time. After each task: run `cd site && npm run build` and
> `python3 scripts/check-links.py dist`, check the result in a browser, `git add` only the files you
> changed, commit with a clear message, and `git push origin HEAD:codex/book-revision`. Then publish that
> verified work (section 1, "Publishing") and check the live site. Do not run lab binaries. Follow the house
> rules in section 5. Report what you finished, what you published, and what you could not verify.

## 1. Ground rules

- **Branches.** Source is `codex/book-revision` on `origin` (`MustCodeAl/rust-game-hacking-book`). The live
  site is `gh-pages`, written only by `cd site && node scripts/publish-pages.mjs` (it needs a clean tree and
  builds from the commit). **Publishing is allowed, under the "Publishing" rule below.**
  Never commit to `master`. Do not switch branches in the main checkout
  (`/Users/notlaggy/Documents/GitFolder/gamehackingacademy.github.io`, on `gh-pages` with many untracked files).
- **Publishing.** After a task is built, link-checked, looked at in a browser, committed, and pushed to
  `codex/book-revision`, publish it: `cd site && node scripts/publish-pages.mjs` (from a clean tree; it refuses
  otherwise, so commit first and keep unfinished files out of `site/`). Publish only work that is finished and
  verified; never publish a build that fails, has broken links, or has a half-done scene wired in. Never
  force-push `gh-pages`. GitHub Pages takes a few minutes: afterwards fetch a changed page and a new script or
  image from https://mustcodeal.github.io/rust-game-hacking-book/ and confirm they are there (200, new content).
  Publish after each task or small group of tasks, so the live site never lags far behind. This needs push access
  to `origin`; if a push is refused, stop and say so.
- **Never run lab binaries or tests that execute them** (`cargo run`, `cargo test` in `rust-labs`,
  `windows-labs`, `lua-labs`, `advanced-memory-labs`). Compile-only checks are fine: `cargo fmt --check`,
  `cargo check --all-targets`, `cargo clippy --all-targets -- -D warnings`.
- **Original wording.** Use outside material to check facts; do not copy or cite it. Facts attributed to a
  vendor ("Riot has said…") are fine; quoted text is not. The CowAntiCheat plugin (GPLv3) must not be copied:
  describe its logic in your own words.
- **Defensive framing for anti-cheat.** Explain how defences work and why. No evasion how-tos, no current
  offsets/signatures, no bypass steps. Offline labs only.
- Lesson numbers (reader-facing) come from each file's `chapter:` frontmatter and differ from the path
  (`pages/6/05` is Lesson 8.5). Links use the path (`/pages/6/05/`), prose uses the number.

## 2. Commands (run from `site/`)

```bash
npm run build                                   # about 15 s; must exit 0
python3 scripts/check-links.py dist             # must print "0 broken"
python3 scripts/serve-dist.py 8766              # then open http://127.0.0.1:8766/rust-game-hacking-book/
node scripts/scene-png.mjs <outdir> <scene>...  # a still of every step of a scene (no browser), then open outdir/png/<scene>.png
python3 scripts/swap-flow.py 5/01:vertex-to-screen   # replace a lesson's old AnimatedFlow with <Scene name="...">
node scripts/check-chat-suggest.mjs             # 15 checks for the chat's Tab completion; must pass
```

Measure scroll smoothness on a long lesson before calling site changes done (the site exists to be fast).

## 3. State of the work

Published at `gh-pages` `4c1e836` (check the live site, Pages takes a few minutes): previous/next arrows beside
the text, 15 new animations, typing practice on 14 code blocks. Since then (committed in this hand-off, **not
published**): four draft scenes, three helper scripts, a fix that moves the arrows away from the text, this plan.

| Area | Status |
|---|---|
| Animation engine (`site/src/lib/scene/`, `components/Scene.astro`, `styles/scene.css`, scenes in `site/src/scenes/`) | Built and working. Documented in `CLAUDE.md` ("Animations (scenes)"). |
| Lessons already using a scene | 1.3, 1.6, 1.8, 2.2, 2.3, 2.4, 3.1, 3.3, 3.7, 4.4, 4.9, 4.10, 5.1, 5.2, 5.4 (15 of 42) |
| Drafted but not wired or reviewed | `stack-vm-eval` (10.8), `page-table-walk` (12.8), `lda-step` (14.8), `encode-roundtrip-memory` (13.5). They build; their stills were rendered but **not looked at**. |
| Previous/next arrows (`public/scripts/pager.js`, `styles/pager.css`) | Done. Side tabs on wide windows, a bottom pair on phones, left/right arrow keys. Just changed to stand at the outer edge of each margin with an 8 px gap. |
| Typing practice (`kit/SpeedType.astro`, `public/scripts/speedtype.js`, `styles/speedtype.css`) | Done on 14 blocks (see `BOOK_REVISION_PROGRESS.md`). |
| Source engine lesson, anti-cheat chapter, CC0 images | **Not started** (specs below). |

## 4. Tasks, in order

### T1. Check what is unverified (small, do first)
1. Wait for / check the live site: `scripts/speedtype.js` and `scripts/pager.js` return 200; a lesson shows the
   typing button and the animations.
2. **Listening edition and print.** `site/src/lib/reader-text.mjs` special-cases `figure[data-animated-flow]`
   (reads its stage text) and `write-reader-editions.mjs` counts only those as "explained visuals". Scenes
   (`figure[data-scene]`) are not handled. Open `/read/<chapter>/<lesson>/` for a lesson with a scene (e.g. 4.9)
   and the print view; make sure the scene's alt text and written steps (`p.scene__alt`, `details.scene__steps li`)
   are read exactly once, the controls are skipped, and the visual count includes scenes.
3. Scene controls at 320 and 375 px (no sideways scroll, buttons usable); scroll smoothness on a lesson with a
   scene; the dark theme and the "plain diagram fill" reader setting.
4. Typing practice with a real phone keyboard if possible (it uses a hidden textarea).

### T2. Wire the four drafted scenes
For each of `stack-vm-eval`, `page-table-walk`, `lda-step`, `encode-roundtrip-memory`:
`node scripts/scene-png.mjs /tmp/out <name>`, open the PNG, fix overlapping or clipped labels and parts that
start off screen, then `python3 scripts/swap-flow.py 12/07:stack-vm-eval 11/07:page-table-walk 14/11:lda-step 13/04:encode-roundtrip-memory`,
rebuild, and check each on the real page. Every number on screen must match the lesson (the old diagram's
numbers are in the MDX you are replacing; keep them).

### T3. Convert the remaining 23 step-through diagrams
The old `AnimatedFlow` only highlights boxes in turn, which the user called "a slide show". Replace each with a
scene in which the real data moves or changes (see section 6). Remaining (27, the four drafted ones are marked):

| Lesson | File (`site/src/content/docs/pages/…`) | Title of the old diagram | Stages | Draft scene already written |
|---|---|---|---|---|
| 6.2 | `8/01.mdx` | Follow an in-process tool's lifetime | 7: Load the library › Keep DllMain small › Start explicitly › Verify the build › Own worker state › Request shutdown › Restore and unload | — |
| 6.5 | `8/04.mdx` | Follow one imported call before, during, and after the hook | 6: Identify the import › Find the matching slot › Keep the original route › Install the replacement › Follow the redirected call › Restore the normal route | — |
| 6.10 | `13/05.mdx` | Follow a hook through installation and removal | 6: Verified target › Prepared trampoline › Publish the detour › Installed › Draining › Original path restored | — |
| 7.1 | `5/01.mdx` | Follow a vertex from model to screen | 6: Model space › World space › Camera space › Clip space › Normalized space › Screen pixels | — |
| 7.8 | `5/08.mdx` | Follow one teammate from world coordinates to a radar marker | 6: Copy the observation › Apply the radar rule › Center on the local player › Undo the local heading › Scale and bound the offset › Draw the marker | — |
| 7.9 | `5/09.mdx` | Follow one label anchor from the world to the screen | 6: World point › View transform › Projection transform › Visibility check › Perspective divide › Viewport pixels | — |
| 8.1 | `6/01.mdx` | From received bytes to a game event | 4: Collect one frame › Decompress the payload › Parse its fields › Apply the session rules | — |
| 8.4 | `6/04.mdx` | Replay the five captured messages through the session states | 6: Start the replay › Accept Greeting version 1 › Accept LobbyJoined › Accept Chat in the lobby › Accept MatchStarted › Accept Goodbye | — |
| 8.5 | `6/05.mdx` | Trace one chat message through the client | 7: Receive bytes › Recover a frame › Parse WML › Update the session › Create a domain event › Handle the command › Send a frame | — |
| 9.2 | `9/02.mdx` | Follow the Flare save through a recoverable edit | 6: Read the closed-game save › Validate the target field › Construct the replacement › Flush the temporary sibling › Replace and keep the backup › Verify through the game | — |
| 9.3 | `9/09.mdx` | Follow the 19-byte GSAV save through its loader checks | 6: Read the complete file › Check magic and version › Bound the variable-length name › Compute the checksum › Compare the stored total › Decode the accepted record | — |
| 9.7 | `9/06.mdx` | Make a mod install reversible | 7: Plan the change › Verify the original › Preserve the old state › Install the mod › Record the result › Check before removal › Undo safely | — |
| 10.1 | `12/01.mdx` | See what the Lua script can reach | 5: Platform › Engine › Lua runtime › Host API › Script | — |
| 10.4 | `12/04.mdx` | Follow a valid snapshot into a stale request | 6: Capture entity 7 › Give Lua an owned snapshot › Let the world advance › Submit a structured request › Revalidate at action time › Return the refusal | — |
| 10.8 | `12/07.mdx` | Watch the value stack evaluate (5 + 2) > 6 | 6: Execute Constant(0) › Execute Constant(1) › Execute Add › Execute Constant(2) › Execute GreaterThan › Follow the then branch | `stack-vm-eval` |
| 11.1 | `10/01.mdx` | Find one loaded module by snapshot | 5: Take the snapshot › Own the handle › Read an entry › Compare its name › Return its range | — |
| 11.8 | `10/06.mdx` | Two correct calculations, one lost reward | 5: Reward thread reads gold › Purchase thread reads gold › Calculate in separate registers › Publish the reward result › Overwrite with the stale result | — |
| 11.11 | `14/07.mdx` | A four-byte read crosses the privilege boundary | 6: Submit the user-mode request › Follow the application wrappers › Enter the prepared kernel path › Validate ranges and authority › Copy in the correct address spaces › Return and check the result | — |
| 12.2 | `11/02.mdx` | Finish loading before starting the worker | 6: Request the DLL load › Prepare the module › Complete the loader notification › Finish the loading operation › Publish startup once › Run outside the loader callback | — |
| 12.4 | `14/02.mdx` | Follow one key press into a game | 6: Keyboard and controller › USB and HID drivers › Translate the key › Queue key-down › Make a virtual key › Deliver to the game | — |
| 12.8 | `11/07.mdx` | Follow virtual 0x0123 through the synthetic capture | 6: Choose the address space › Read PML4 entry 0 › Read PDPT entry 0 › Read page-directory entry 0 › Select the data page › Produce the physical address | `page-table-walk` |
| 13.1 | `13/01.mdx` | One entity, three observations over two ticks | 5: Begin with the prior entity state › Record the health write › Record the mode transition › Observe the display copy › Compare the recorded sequence | — |
| 13.5 | `13/04.mdx` | Follow the same 32 bits through encoding and decoding | 6: Start with the plain value › XOR with the key › Rotate left by seven › Store in little-endian order › Undo the rotation first › Undo XOR and recover the value | `encode-roundtrip-memory` |
| 13.8 | `13/09.mdx` | See a bound check fooled by overflow | 4: Start near the limit › Add the length › Compare the wrong end › Allow a bad read | — |
| 14.3 | `14/12.mdx` | From reset to the lamp controller | 5: Read the vectors › Prepare working memory › Enter Rust › Process button samples › Report the trace | — |
| 14.4 | `14/05.mdx` | Follow a successful console boot | 6: Power on › Boot ROM › Bootloader › Privileged software › System software › Start the game | — |
| 14.8 | `14/11.mdx` | One LDA instruction: bytes become CPU state | 6: Start at step 2 of the trace › Fetch the opcode › Decode the operation › Fetch the address operand › Update A and the zero flag › Finish the instruction | `lda-step` |

Per scene: read the lesson text around the old diagram and keep its numbers; write
`site/src/scenes/<name>.mjs`; look at the stills; wire it with `swap-flow.py`; build; check the real page.
Aim for 5 to 8 steps and 14 to 28 seconds. When all are done, delete `AnimatedFlow.astro`,
`styles/animated-flow.css`, `lib/animated-flow.js`, and the special cases in `reader-text.mjs`, and update
`CLAUDE.md` and `src/components/kit/README.md`.

### T4. More images and animated pictures that are not copyrighted
The user asked for "more images and gifs that are noncopyrighted". Use **CC0 or public domain only** (no
attribution-required licences): Kenney.nl asset packs (CC0), OpenGameArt items marked CC0, Wikimedia Commons
public-domain files. Ideas: sprites (hero, chest, wall, floor) in the pathfinding scene (4.9) and as `Frame`
pictures in 4.5, 4.12, 4.13; tiles for map lessons. The scene engine has an `image(id, x, y, w, h, src)` actor
(files in `site/public/assets/images/…`; keep each under about 30 KB, pixel art scaled with
`image-rendering: pixelated`). Add `site/public/assets/images/CREDITS.md` and a short "Image credits" mention in
`src/content/docs/updates.mdx`. Animated pictures should be scenes (SVG), not large GIFs.

### T5. New lesson 8.9 "How the Source Engine Works"
File `site/src/content/docs/pages/6/09.mdx` (copy the frontmatter of `pages/6/08.mdx`; `chapter: "8.9"`,
`sidebar.order: 9`, `label: "8.9 How the Source Engine Works"`). Prerequisites already taught: 3.4 and 7.10 (C++
objects and vtables), 6.1 and 6.2 (DLLs), 8.1 to 8.6 (messages and protocols). Sections: why Source (Half-Life 2,
Counter-Strike: Source, Team Fortress 2, Left 4 Dead, CS:GO; CS2 moved to Source 2); the launcher/engine, client
and server DLLs, listen versus dedicated server; how modules find each other (`CreateInterface`, version-named
interfaces); entities and networked data tables (SendTable/RecvTable, quantised floats); the player command
stream (`CUserCmd`, button bits); the tick, snapshots, interpolation, prediction, lag compensation; console
variables and flags (`sv_cheats`, replicated, server queries of client cvars); files (VPK/BSP: verify these two
yourself); what it means for tools and for defenders (link to chapter 15). Offline-lab framing only. Verified
facts, from the published Source SDK 2013 (`github.com/ValveSoftware/source-sdk-2013`, folder `src/`; the Valve
Developer Wiki blocks automated fetching, so open it in a browser if you need it):

- `game/shared/usercmd.h`, class `CUserCmd`: `command_number` (matches server and client commands),
  `tick_count` (the tick the client created the command), `viewangles`, `forwardmove`/`sidemove`/`upmove`
  (floats), `buttons` (int), `impulse` (byte), `weaponselect`, `weaponsubtype`, `random_seed`,
  `server_random_seed` (server only), `mousedx`/`mousedy` (shorts), `hasbeenpredicted` (prediction bookkeeping; its declaration is not client-only).
- `game/shared/in_buttons.h`: `IN_ATTACK` bit 0, `IN_JUMP` 1, `IN_DUCK` 2, `IN_FORWARD` 3, `IN_BACK` 4, `IN_USE` 5,
  `IN_LEFT` 7, `IN_RIGHT` 8, `IN_MOVELEFT` 9, `IN_MOVERIGHT` 10, `IN_ATTACK2` 11, `IN_RELOAD` 13, `IN_SPEED` 17,
  `IN_WALK` 18. One integer, one bit per key (a good worked example of flags).
- `public/const.h`: `FL_ONGROUND` bit 0, `FL_DUCKING` 1, `FL_CLIENT` 8, `FL_FAKECLIENT` 9, `FL_INWATER` 10;
  `DEFAULT_TICK_INTERVAL` 0.015 s ("15 msec is the default", 66.67 ticks per second); `ABSOLUTE_PLAYER_LIMIT` 255.
- `public/tier1/interface.h`: every interface derives `IBaseInterface`; classes are registered in a linked list
  (`InterfaceReg`) by `EXPOSE_INTERFACE`/`EXPOSE_SINGLE_INTERFACE`; `typedef void* (*CreateInterfaceFn)(const char *pName, int *pReturnCode)`;
  the exported `CreateInterface` returns an object pointer or null; the optional status output receives `IFACE_OK` or `IFACE_FAILED`. Names include a version suffix.
- `public/cdll_int.h`: `CLIENT_DLL_INTERFACE_VERSION "VClient017"`, `VENGINE_CLIENT_INTERFACE_VERSION "VEngineClient014"`,
  `IBaseClientDLL::CreateMove(int sequence_number, float input_sample_frametime, bool active)`.
  `public/eiface.h`: `"VEngineServer023"`, `"ServerGameDLL012"`, `"ServerGameClients005"`; `IServerGameDLL::GameFrame`,
  `GetTickInterval`, `OnQueryCvarValueFinished`; `IVEngineServer::StartQueryCvarValue` is asynchronous (a cookie
  matches the later callback). Other branches use other numbers.
- `public/tier1/iconvar.h` flags: `FCVAR_GAMEDLL` 1<<2, `FCVAR_CLIENTDLL` 1<<3, `FCVAR_PROTECTED` 1<<5,
  `FCVAR_SPONLY` 1<<6, `FCVAR_ARCHIVE` 1<<7, `FCVAR_NOTIFY` 1<<8, `FCVAR_USERINFO` 1<<9, `FCVAR_REPLICATED` 1<<13
  ("server setting enforced on clients"), `FCVAR_CHEAT` 1<<14 ("only useable in singleplayer / debug / multiplayer &
  sv_cheats"), `FCVAR_DEMO` 1<<16, `FCVAR_NOT_CONNECTED` 1<<22, `FCVAR_SERVER_CAN_EXECUTE` 1<<28,
  `FCVAR_SERVER_CANNOT_QUERY` 1<<29 ("the server is not allowed to query this cvar's value"), `FCVAR_CLIENTCMD_CAN_EXECUTE` 1<<30.
- `public/dt_send.h`: `SendTable`/`SendProp`; `BEGIN_SEND_TABLE`, `SendPropInt/Float/Vector/String/DataTable/Array`,
  `SENDINFO`; a float can be quantised into a low/high range and a bit count.
- `game/server/player_lagcompensation.cpp`: `sv_unlag` 1, `sv_maxunlag` 1.0 s (clamped 0 to 1),
  `sv_lagcompensation_teleport_dist` 64, `sv_lagflushbonecache` 1. The target tick is
  `cmd->tick_count - lerpTicks`; if the command's time and the player's latency disagree by more than 0.2 s the
  server uses a latency-based target instead; history older than `sv_maxunlag` is dropped; afterwards origin,
  angles, collision size, animation and pose are restored. `game/server/player.cpp`: `sv_maxusrcmdprocessticks`
  24 ("maximum number of client-issued usrcmd ticks that can be replayed in packet loss conditions").
  Re-read these files yourself before quoting numbers; the facts above came from summaries of them.

### T6. New chapter 15 "Anti-Cheat: How Games Defend Themselves"
Add `{ number: 15, area: 'systems', title: …, emoji: …, summary: … }` to `site/src/data/chapters.mjs`
(area "systems" is "Systems and trust"), files `site/src/content/docs/pages/15/01.mdx` … with
`chapter: "15.N"`, `sidebar.order: N`, `label: "15.N Title"`. Every lesson needs a quiz in
`site/src/data/lesson-quizzes.json` (key = displayed number; copy an existing entry's shape), glossary terms
in `site/src/content/docs/glossary.mdx` (HTML `<dt id="term-…"><dfn>…</dfn></dt><dd>…</dd>`; ordinary single
words go in `EVERYDAY_WORDS` in `site/src/plugins/satteri-academy.mjs`), a visual per lesson (a Scene where
something moves), and links to earlier lessons: 5.4 and 9.8 (signatures and hashes), 7.8 (visibility rules),
8.1 (multiplayer messages), 12.6 and 12.7 (kernel trust boundary, DMA), 13.3 and 13.4 (integrity checks,
anti-debug), 8.9 (Source). Outline (adjust after drafting):

1. **Why games need anti-cheat**: the client is in the player's hands; categories of cheating (information, input,
   movement/state, network, account/economy); detect, deter, mitigate; the cost of a false accusation.
2. **Server-side anti-cheat: what the server can see**: the per-tick command stream, authority, validation, rate
   limits, impossible-value checks, fog of war, replays and machine learning.
3. **Case study: server plugins**: Source servers running SourceMod plugins. The user supplied CowAntiCheat
   (source pasted in chat; see appendix A) and the AlliedModders thread "Macrodox - Bhop cheat detection"
   (`forums.alliedmods.net/showthread.php?p=1678026`; the forum returns HTTP 403 to automated fetchers, ask the
   user to paste it). Also SMAC and Little Anti-Cheat (appendix B). Teach thresholds, counters, history windows,
   false positives, permanent bans on heuristics, why client-reported cvars must never switch a check off.
4. **Client-side anti-cheat: what the client can see**: user-mode scanning, integrity checks, handle and module
   checks, kernel drivers, boot-time loading, attestation (Secure Boot/TPM), vulnerable-driver blocking; the
   asymmetry (it runs on the cheater's machine); costs (privacy, crashes; Genshin Impact's `mhyprot2.sys` driver
   was abused by ransomware to disable antivirus).
5. **How detections work**: signature-based, heuristic, behavioural/statistical, machine learning, integrity,
   hardware/account signals. Worked base-rate example (derive every number): a detector that catches 99% of
   cheaters and wrongly flags 1% of honest players, in a population where 1 in 1,000 cheats: of 100,000 players,
   100 cheat, 0.99 × 100 = 99 are caught; 99,900 are honest, 0.01 × 99,900 = 999 are wrongly flagged; only
   99 / (99 + 999) = 9.0% of flagged players cheat. Why delayed bans and human review exist.
6. **Layers**: several systems on one game (game's own + platform + league + server plugins), what each sees,
   how verdicts combine, ban waves, trust scores, review.
7. **Modern cheats and cheat tools, from the defender's side**: Cheat Engine (a memory scanner, debugger and
   scripting tool; its own FAQ says online games validate on the server, so it rarely works there, and it will not
   bypass anti-cheat); categories (external, internal, kernel-assisted, hardware/DMA, vision or AI with input
   emulation, network, asset replacement), what each leaves visible and the defensive answers. No evasion detail.
8. **Anti-cheat in modern games** (date-stamp everything, "as of 2026"): VALORANT, Counter-Strike (VAC, VAC Live,
   Trust Factor, Overwatch), Call of Duty (RICOCHET), Epic's Easy Anti-Cheat, BattlEye. Facts in appendix B.
9. **Designing a game that is hard to cheat in** and the law/ethics (appendix B has the cases).

Optional offline lab in `rust-labs` (a detector over hand-written input traces); compile-checks only.

### T7. Housekeeping whenever lessons are added
- `site/scripts/write-reader-editions.mjs` expects exactly 147 lessons after T5 and T6; update this guard whenever more are added.
- Search for "137" in `CLAUDE.md`, `BOOK_REVISION_PROGRESS.md`, `site/src/content/docs/*.mdx`; regenerate
  `docs.json` with `node scripts/write-docs-json.mjs`; `lesson-index.mjs` throws on any mismatch between
  `chapter`, `sidebar.order`, and `sidebar.label`, or on a gap.
- Plain "Lesson N.M" mentions become links automatically; check each label equals the target's `chapter`.
- Update `CLAUDE.md`, `BOOK_REVISION_PROGRESS.md`, the kit README, and `updates.mdx`.
- Final checks: build, `check-links.py`, `check-chat-suggest.mjs`, a phone-width scan (no horizontal scroll at 320
  and 375 px), and a look at one scene and one typing practice in light and dark themes.

### T8. Optional polish
More typing-practice snippets in other chapters (5 to 15 lines, plain ASCII, already explained; wrap with
`<SpeedType id="…" title="…">`); syntax-coloured untyped text is already inherited from the code block.

## 5. House rules (from the user's feedback, keep them)

- **Mechanism over cliché analogy.** Explain how the thing works, with real numbers; use an analogy only if it
  predicts failure modes too. Short sentences; define every term at first use.
- **Derive every number** a beginner sees; no unexplained constants. Early lessons stay short primers.
- **Do not impose a thinking framework** on readers (no "evidence/observation/relationship" scaffolding, no
  "write this in your notes", no pointing every lesson back to Lesson 1).
- **Text-heavy lessons need visuals**; a picture must show the real mechanism.
- **Improve the prose itself**; do not add checkpoint or recap sections.
- **Animations must show the mechanism** (bytes, pointers, stacks, queues really moving), never boxes lighting up.
- **Colour has a job** (chapter colour, reading roles input/state/process/output/caution); the site must stay
  fast to scroll: no blur, no scroll-time animation, lazy client code.
- Shell commands and file reads are normal for you; the earlier assistant's token tools do not apply.

## 6. Scene engine quick reference

A scene file `site/src/scenes/<name>.mjs` default-exports `scene({ id, title, alt, caption, w, h, cues, actors, tracks })`.
Build with `src/lib/scene/kit.mjs`: `rect(id,x,y,w,h,{role,look,r})`, `cell(id,x,y,w,h,text,{role,mono,size,weight})`,
`text(id,x,y,text|[lines],{anchor,mono,size,role})`, `note(...)` (small muted text), `line(id,x1,y1,x2,y2,{arrow,role,width,dash,draw})`,
`path`, `dot(id,x,y,r)`, `poly(id,x,y,pts)`, `image(id,x,y,w,h,src)`, `group(id,x,y,kids,{o})`, `strip(id,x,y,values,{w,h,gap,o,...cell opts})`,
`grid(...)`, and `timeline(actors)`: `tl.at(t).move(id,x,y,dur).show(id).hide(id).fade(id,o).role(id,'state').text(id,'new words')
.num(id,value,dur).draw(id,1,dur).scale(id,s).rotate(id,deg).resize(id,w,h).pulse(id).wait(dt)`, `tl.cue(t, 'step words')`,
`tl.cues`, `tl.tracks`. Roles: `plain input state process output caution muted`. Extra helpers: `lib/scene/seq.mjs`
(`lifelines`, `message` for two parties exchanging messages) and `lib/scene/bits.mjs` (`bitRow`: a 32-bit row with
`flip`, `rotl`, `rotr`, `idAt`). Gotchas: ids must be unique; later actors draw on top; give a hidden part `o: 0`
then `show()` it; the opacity of a `strip` belongs to the whole row; nothing may start off the picture (the SVG shows
overflow); use `w`/`h` that fit the text (`size` is in SVG units, about 12 to 16); each `cue` is one written step
shown under the picture and in the page's "Read the steps" list; a scene name may appear once per page; always view
`scene-png.mjs` stills before wiring, then check the real page.

## Appendix A. The CowAntiCheat plugin (user-pasted source), in plain words

SourceMod plugin for CS:GO, version 1.16, GPLv3, by "CodingCow". It hooks `OnPlayerRunCmd`, called for every
player command (buttons, impulse, move velocities, view angles, weapon, tick count, seed, mouse dx/dy), and traces
a ray from the eye along the commanded angles (999999 units). Every `0.1 s` it asks each client for the cvars
`sensitivity`, `m_yaw`, and `sv_autobunnyhopping` (client answers are not trustworthy; the plugin only uses them to
avoid false positives). Defaults: each check enabled except hour/profile checks.

- **Aimbot** (ban at 5, permanent): skipped if |sensitivity × m_yaw| > 0.6. A command counts when the ray hits a living
  enemy and the yaw changed by more than 15 degrees since the last command; if attack is pressed and the hit group
  equals the last one the counter rises, otherwise it resets.
- **Bhop** (ban at 10, 7 days): counts ticks on the ground; a jump press on the first ground tick, or with the same
  ground-tick count as the last jump, is "perfect"; keeps 30 recent values; off when auto-bhop is enabled.
- **Silent strafe** (ban at 10): consecutive commands whose sideways move flips sign; checked every 50 commands.
- **Triggerbot** (log at 3, ban at 5): attack pressed after the same number of ticks on target as the previous
  encounter.
- **Macro/hyperscroll** (log at 20 jump presses in one airtime; kick after 10 detections), **auto-shoot** (log at 20
  attack presses within 10 commands of each other), **perfect strafe** (log 10, ban 15; mouse direction changes
  matching strafe-key presses exactly), **AHK strafe** (log; identical mouse dx values repeated 25 times while
  airborne, 10 times over).
- **Instant defuse** (ban): bomb defused less than 3.5 s after the defuse began (a defuse with a kit takes 5 s).
- **Hour check** and **profile check** (off by default): ask the author's web service, with the player's SteamID64,
  for playtime or profile visibility; kick under 50 hours or a private profile.
- Actions: chat announcement, a log file, a message to admins, ban through SourceBans or the built-in ban.
Teaching points: all evidence is the command stream plus server state; thresholds are fixed numbers; public
shaming and permanent bans on heuristics are risky; high-sensitivity players, scroll-wheel bhop, and different
tick rates produce false positives.

## Appendix B. Verified facts for chapter 15 (sources; re-check before relying)

- **Macrodox** (AlliedModders, "[CS:S] Macrodox - Bhop cheat detection", by Inami, v1.9): written 2009 for a bhop
  server to catch cheaters seeking speedrun records; goal: automatic bans with no false positives; slays players using
  +left/+right strafe binds; detects hacks, macros, hyper/auto-scroll; bans are delayed so cheaters cannot tell
  whether they were caught; the inspected version 1.9 source uses a weighted perfect-jump metric, updating `(old × 9 + sample) ÷ 10`; it is not a fixed last-15 ratio;
  admin command `mdx_stats <#userid|name|@all>`; do not combine with auto-jump plugins. A community guide says
  scripted jumps show "1 1 1 1" scroll patterns, hyperscrollers show 17 to 25+ scrolls, and 300 FPS on 100 tick rarely
  exceeds 70% perfect legitimately.
- **SMAC** (SourceMod Anti-Cheat, github.com/Silenci0/SMAC): modules for aimbot, auto-trigger, client protection,
  command monitor, convar checker, rcon locker, speedhack, wallhack, spinhack, and eye-angle test.
  **Little Anti-Cheat** (github.com/J-Tanzanite/Little-Anti-Cheat, archived September 2024): angle cheats, invalid
  cvar use (`sv_cheats`), bunnyhopping, basic aimbots, anti-duck-delay, name abuse, macros; autoshoot is "1-tick
  perfect shots that lead to a kill twice in a row" (scroll-wheel binds can trip it).
- **VAC** (Valve): started 2002 with Counter-Strike; VAC2 (2005) made bans permanent; scans memory and processes for
  known cheat signatures; detections are checked against a database; bans arrive "days or even weeks" later on
  purpose; a ban covers a game family. Past mistakes: about 12,000 accounts wrongly banned in 2010 after a Steam DLL
  update; 2014 DNS-cache controversy (570 bans); 2023 bans caused by AMD Anti-Lag+ and some mouse settings, reversed.
  VACnet (announced February 2017, shown at GDC March 2018) is a machine-learning system that flags players for human
  Overwatch review. VAC Live, Trust Factor details come from secondary sources only; check Valve's own posts.
- **VALORANT** (Riot, primary articles on riotgames.com): Vanguard is a user-mode client plus a kernel driver; Riot's
  support page says it is "usually an on-boot application" and offers an optional Vanguard Pre-Check to start and stop
  it on demand on systems that meet its security requirements (secondary sites date this to 24 June 2026; verify).
  Fog of War: the server does not send an enemy's position until the enemy is relevant; every update tick it checks
  visibility per actor; three designs (one ray, ten rays with look-ahead of velocity × ping, then precomputed
  potentially-visible sets in voxels); under 2% of server frame time (from 50% in the first prototype); 128-tick
  servers; the netcode article says servers never trust a client's view of the world, and quotes peeker's advantage of
  about 141 ms at 60 FPS, 35 ms ping, 128 tick, reduced to about 101 ms, and 71 ms at 144 FPS.
- **RICOCHET** (Activision): PC kernel driver that runs only while a protected title runs, plus server-side tools and
  machine learning; named mitigations include Damage Shield, Disarm, Splat, Hallucination, Cloaking. The official page
  timed out; confirm on callofduty.com/ricochet.
- **Epic Easy Anti-Cheat / EOS Anti-Cheat**: client-server mode (the client module produces opaque messages the game
  sends to its server, which hands them to the server module) and peer-to-peer mode. **BattlEye** describes itself as a
  "fully proactive kernel-based protection system" with detection routines controlled from a backend and a global
  ban system. Kernel-level risk: `mhyprot2.sys` (above).
- **Cheat Engine** (cheatengine.org FAQ): a tool to figure out how a game works and modify it; has a debugger,
  disassembler, Lua scripting, and a speedhack; source viewable but not open-source licensed; works "most of the time,
  no" on online games because servers validate; will not bypass anti-cheat.
- **Law** (Wikipedia "Cheating in online games"): Nexon v. GameAnarchy (2013, $1.4M), Riot v. LeagueSharp (2017,
  $10M), Blizzard v. Bossland (2017, $8.5M), Bungie v. AimJunkies (2024, over $4.3M); South Korea and China criminalise
  selling or using cheats.
