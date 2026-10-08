# Reader overhaul — owner specification, 8 October 2026

New authorized work, separate from the finished T52–T54 publication. All items below remain pending implementation/verification. Preserve the original design as default and place taste variants in the existing Appearance tiers unless the owner explicitly changes that default. New CSS uses existing semantic tokens and relative units. The requested modern frost/shadow style supersedes the older blanket no-blur advice when that style is chosen; measure scrolling and retain motion/depth preferences.

## Strict TypeScript and static architecture

- Convert authored client logic and build/data/check scripts from JS/MJS to typed modules. Use Astro/Vite bundling for client code; generated browser JavaScript remains an output. No authored TypeScript in is:inline scripts. Preserve legacy check commands with build-generated compatibility entries where needed.
- Explicit component Props; typed palette/brightness, debugger steps, hotkeys and localStorage schemas. Strict typecheck passes; no blanket ts-nocheck migration.
- BASE_URL-aware links/assets/router paths; no dynamic backend requirement. Keep existing notes/progress/quiz/typing keys and migrate only approved changes.
- Complete semantic SSR/print/no-script content and accessible controls. Register concise MDX exports for Callout, CodeWindow/IDECodeWindow, CheatsheetHero, LogicWaveform and DebuggerStepper.

## Semantic tokens and technical color pairing

- Central OKLCH data/flow/success/warn/danger roles across five palettes and both brightness modes. Verify4.5:1text and3:1graphic boundaries.
- Preserve60%canvas,30%4–8%semantic structural washes,10%accents. SemanticColorsOff returns neutral surfaces/highlighting without changing geometry.
- Identical register tokens in code/CPU badges; opcode/mnemonic and immediate/value color pairing with bidirectional hover/focus inspector.
- Source-to-target SVGgradient arrows; boundary/truth-table washes follow logical outcomes.

## Navigation and telemetry

- ≥1440pxsticky70chright TOCrail, persistent fold/expandchevron, collapsed4pxheadingnotches, IOreadingthumb, namedhover/focus tooltips and heading navigation.
- <1440pxright side sheet/backdrop; Alt+O, Escape and outside-clickdismissal. Floatingpill20%down-scrollfade and fullup/hoveropacity.
- Active chapter opens in sidebar; other chapters auto-collapse onnavigation while manualexpansion works. SVGprogressrings/slimbars and left-gutter completion marks with clean titles.

## Steppers, code and learning tools

- ≥1024pxsource/inspection splitpane; pinned registers/variables andPrevious/Next/Reset.
- Discrete execution-step notches; IPglyph/border linked to active line; return-frame amber, saved-register blue andunallocated dashed stackslots.
- Interactive clocked square-wave/rising-edge widget; explicit before/after mutationdiffs.
- Unified language/filenamecodechrome with one-clickCopyandaccessiblefeedback; monospace/tabular registers/addresses; mobile tableedgefades.
- Semantictinted note/tip/caution/danger callouts; unobtrusive#headinganchorscopydeep links while keyboard/no-script navigation works.

## Header, settings and modern finish

- Compact chapter/time/audio/completionactionbar; expandablehero cheatsheet with .mddownload.
- Two-tone paletteswatches and?keyboardHUD; Notes/chat25%opacity wheninteractive content isactive, restoredoninteraction.
- Subtleboundarytoken andmicroshadows; optionalfrost onstickyheaders/pills/search/drawers. Radii0.25remtags,0.5remcontrols,0.75rempanels/code/callouts.
- h1–h3tracking−0.025em; GeistMono/JetBrainsMono/SFMono/Consolas/ui-monospace stack withtabularfigures.
- Refined controlgradients/glows/0.98activecompression, selectablesurfacequiztiles and consistent150mseasing. Respect reducedmotion and avoid animating layout.

## Structure and release

- Revised map targets similar chaptercounts and reading lengths without padding or randomtopic moves. Show exact155placements beforeapproval; old routes/aliases/savedkeymigration required for actual changes.
- One verified source step percommit, pushcodex/book-revision, thenofficial Pagespublisher. Build; links0; quizzes/account/audio/chat/contrast;420/1280screenshots; keyboard/axe; no-script/print/listening; multi-width navigation; CLS/scroll observations. Neverexecute labprograms/tests; neverforce-push Pages.
