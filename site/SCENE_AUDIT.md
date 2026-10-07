# Scene audit — 2026-10-07

All 52 fixed recordings change finite model state at eleven sampled times. Chromium checked each at 420 and 1280: playback, pause, keyboard scrub, restart and next-step controls; visible SVG text stays inside the drawing at five sampled times. This is a toy-state/browser audit, not real Windows or device execution.

The original worked recordings remain available for printing and listening pictures. Each lesson also has an adjustable teaching explorer; the 32 new companions isolate the calculation or acceptance decision and explain their limits.

| Recording | Lesson path | Adjustable companion |
|---|---|---|
| `bfs-around-wall` | `pages/4/06` | New CodeTrace |
| `breakpoint-restore` | `pages/2/03` | New CodeTrace |
| `call-and-return` | `pages/2/02` | Existing teaching explorer |
| `chat-client` | `pages/6/05` | New CodeTrace |
| `checked-range-overflow` | `pages/13/09` | Existing teaching explorer |
| `console-boot` | `pages/14/05` | New CodeTrace |
| `controlled-experiment` | `pages/1/06` | New CodeTrace |
| `detector-base-rate` | `pages/15/05` | Existing teaching explorer |
| `detector-input-window` | `pages/15/03` | Existing teaching explorer |
| `dll-lifetime` | `pages/8/01` | New CodeTrace |
| `driver-trust-gate` | `pages/15/04` | New CodeTrace |
| `edge-events` | `pages/4/07` | Existing teaching explorer |
| `encode-roundtrip-memory` | `pages/13/04` | New CodeTrace |
| `entity-observations` | `pages/13/01` | New CodeTrace |
| `evidence-correlation` | `pages/15/06` | Existing teaching explorer |
| `gsav-loader` | `pages/9/09` | New CodeTrace |
| `guarded-write` | `pages/4/02` | New CodeTrace |
| `hook-lifetime` | `pages/13/05` | Existing teaching explorer |
| `iat-call-route` | `pages/8/04` | New CodeTrace |
| `information-boundary` | `pages/15/07` | New CodeTrace |
| `key-to-game` | `pages/14/02` | New CodeTrace |
| `lda-step` | `pages/14/11` | Existing teaching explorer |
| `loader-startup` | `pages/11/02` | New CodeTrace |
| `lost-reward` | `pages/10/06` | Existing teaching explorer |
| `lua-capabilities` | `pages/12/01` | New CodeTrace |
| `meaning-to-bytes` | `pages/1/03` | Existing teaching explorer |
| `module-snapshot` | `pages/10/01` | New CodeTrace |
| `page-table-walk` | `pages/11/07` | Existing teaching explorer |
| `pattern-scan-window` | `pages/7/04` | New CodeTrace |
| `pe-header-walk` | `pages/7/01` | Existing teaching explorer |
| `pointer-to-health` | `pages/1/08` | Existing teaching explorer |
| `privilege-copy` | `pages/14/07` | New CodeTrace |
| `protection-session` | `pages/15/08` | New CodeTrace |
| `radar-marker` | `pages/5/08` | New CodeTrace |
| `receive-to-event` | `pages/6/01` | Existing teaching explorer |
| `recoverable-save` | `pages/9/02` | Existing teaching explorer |
| `remote-read` | `pages/3/01` | Existing teaching explorer |
| `reset-lamp` | `pages/14/12` | New CodeTrace |
| `reversible-mod` | `pages/9/06` | New CodeTrace |
| `rva-to-file-offset` | `pages/7/02` | Existing teaching explorer |
| `server-authority` | `pages/15/01` | Existing teaching explorer |
| `server-visibility-filter` | `pages/15/02` | New CodeTrace |
| `session-replay` | `pages/6/04` | New CodeTrace |
| `source-command-tick` | `pages/6/09` | New CodeTrace |
| `source-to-process` | `pages/1/10` | New CodeTrace |
| `stack-vm-eval` | `pages/12/07` | New CodeTrace |
| `stale-entity-request` | `pages/12/04` | New CodeTrace |
| `torn-read-pair` | `pages/3/02` | Existing teaching explorer |
| `validated-pickup` | `pages/15/09` | New CodeTrace |
| `vertex-to-screen` | `pages/5/01` | New CodeTrace |
| `world-to-screen` | `pages/5/09` | Existing teaching explorer |
| `xor-rotate-roundtrip` | `pages/3/06` | New CodeTrace |

Repeat: serve the built site, then run `node scripts/check-scene-browser.mjs` with `PLAYWRIGHT_PATH`, `CHROME_PATH` and `BOOK_BASE_URL` for your machine. Model/region checks: `node scripts/check-scene-explorers.mjs`. Native Safari, physical touch and screen-reader speech are not covered.
