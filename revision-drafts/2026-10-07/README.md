# Preserved revision drafts — 2026-10-07

These files are outside the site's content tree. They are **not deployed**.
The owner requested finish after the urgent repair; both agents then hit the
account usage limit. Preserve the drafts rather than reporting unverified
features as completed.

Read HANDOFF_PLAN.md and T35–T38 in BOOK_REVISION_PROGRESS.md first. Source is
`codex/book-revision`; publish only through the repository script. No existing
lesson ID has been moved, and restructuring still needs the owner's approval.

## Ready for integration checks

- `gha-assembly-reference.patch`: new stable paths `pages/2/10–12`, reader
  2.11–2.13, 33 adjustable instruction traces. Register `ASSEMBLY_TRACES` in
  `code-trace.js`; extend its assembly language detection and keywords for
  bit/SSE instructions. Split each pool's first question into its seed and
  merge the other fourteen into its bank. Agent semantic checks are recorded
  in `gha-assembly-verification.md`; the full Astro/browser/contrast checks
  were **not run by root** on these lessons.
- `gha-clarity-batch1–4.patch`: 58 existing lessons replace unspecified
  “rules” with concrete checks, transitions, calculations, and responsibilities.
  Old heading anchors are retained. Recheck patch application against T37;
  synchronize engine/radar cross-link titles. No full integrated build or
  screenshot verification is claimed for these patches.
- `gha-original-concepts-parity-audit.md`: records the original B/F audit.
  Its peer-topology gap is now addressed in T37. The concepts patch itself
  is integrated; do not reapply it.

## Incomplete drafts

- `rust-idioms/site/`: four proposed lessons, stable paths `pages/1/13–16`,
  reader 1.11–1.14, with a standalone trace module. They cover Option/Result
  combinators, enums/patterns, iterator queries, bounds/byte conversion,
  checked arithmetic/layout, lifetime relationships, typed interfaces,
  conversions/Display/traits/builders, Drop and structured errors. They
  still need quiz pools, code compilation, trace-model verification,
  registration, first-use links and the full integration checks. Do not
  copy them into active content and publish without those steps.
- `reader-sync/site/`: unfinished extraction of margin-note layout shared
  by Notes and authored notes; global comment styling for pages without
  authored notes; DOM-ready bubble rendering; legacy-compatible IDs and
  deletion tombstones for account merge. **T38 now implements shared styling
  and DOM-ready bubble rendering in active source; preserve those fixes.**
  Shared layout extraction and account sync remain draft-only. Review all files as a unit, preserve
  T36's pointer-events/restore stacking repair, inspect any package change,
  and run actual Notes add/delete/hide/reload tests on an author-note-free
  lesson with stalled external requests. The agent did not deliver a final
  patch or verification receipt before its usage limit. **No tests are
  claimed passed for this draft.**

Still open: broader wording audit beyond the four batches, remaining theme
and widget polish, margin-note/artwork coverage, reader account sync,
cross-browser/accessibility checks, and the owner-approved chapter map plus
redirect/key migration. No lab programs should be run during verification.
