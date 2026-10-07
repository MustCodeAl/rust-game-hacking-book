# Preserved revision drafts — 2026-10-07

These historical drafts are outside the site’s content tree. **D is integrated and published in T43; do not reapply its patch.** Other statuses are listed below.
The owner requested finish after the urgent repair; both agents then hit the
account usage limit. Preserve the drafts rather than reporting unverified
features as completed.

Read HANDOFF_PLAN.md and T35–T40 in BOOK_REVISION_PROGRESS.md first. Source is
`codex/book-revision`; publish only through the repository script. No existing
lesson ID has been moved, and restructuring still needs the owner's approval.

## Ready for integration checks

- `gha-assembly-reference.patch`: **integrated and verified in T43; do not reapply.** New stable paths `pages/2/10–12`, reader
  2.11–2.13, 33 adjustable instruction traces. Register `ASSEMBLY_TRACES` in
  `code-trace.js`; extend its assembly language detection and keywords for
  bit/SSE instructions. Split each pool's first question into its seed and
  merge the other fourteen into its bank. Agent semantic checks are recorded
  in `gha-assembly-verification.md`; root’s final Astro/browser/contrast checks pass; see T43 for evidence.
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
- `reader-sync/site/`: historical draft, superseded by active T39. Shared author/reader layout, global styling, DOM-ready comments, stable IDs, deletion tombstones and client account merge are integrated and checked. Preserve the active T36–T39 pointer/restore repairs; **do not copy this old draft over them**. T39 records the mock transport and actual browser checks. A real external provider is still unconfigured, and client merging is not server-atomic.

Still open: broader wording audit beyond the four batches, remaining widget coverage and scene/probability polish,
cross-browser/accessibility checks, and the owner-approved chapter map plus
redirect/key migration. No lab programs should be run during verification.
