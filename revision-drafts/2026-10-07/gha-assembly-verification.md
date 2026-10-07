# Assembly reference batch — 2026-10-07

- Draft patch: `/private/tmp/gha-assembly-reference.patch`.
- New stable paths: `pages/2/10.mdx`, `pages/2/11.mdx`, `pages/2/12.mdx` (reader numbers 2.11–2.13). No existing lesson IDs were moved.
- New isolated data module: `site/src/scripts/assembly-traces.js`, exporting `ASSEMBLY_TRACES`. Parent must import/spread this into the existing `TRACES` registry.
- 33 instruction examples, each 3–5 lines, each with its own adjustable worked CodeTrace: 10 integer/value instructions, 17 control/stack/bit instructions (including a conditional-jump family trace with 18 conditions), and 6 legacy SSE scalar instructions.
- Every lesson contains an explainer, lookup links to each worked instruction, operand forms, register/flag/memory effects, three margin notes, and a cheatsheet. The examples are fictional owned/resettable targets; no machine code or lab program was executed.
- Quiz file `/private/tmp/gha-assembly-quiz.json`: three pools of 15 concept questions, batch size 5. Parent must split the first question into the seed map and the other 14 into its bank. Every question passed the existing `balanceProblem` rule.

Verified:

- Read current HANDOFF checkpoint, CONTENT_PLAN D/B, CodeTrace authoring guide, and original `d65b5883:_pages/7/04.md`.
- Consulted Intel's official manual index (revision 093, current index updated 2026-09-21), downloaded the primary Volume 2 PDF, and inspected operand/flag/operation details. Particular checks included increment/decrement preserving CF, multiplication/division undefined flags, zero-count shift preservation, signed division versus shift rounding, legacy MOVSS upper-bit behavior, conversion rounding/invalid handling, and COMISS unordered/exception rules.
- `rtk proxy node /private/tmp/gha-assembly-check.mjs`: exit 0; 276 input combinations, every line in bounds, every explanation present, every input represented initially, and 59 independent expected-value/behavior assertions.
- Structural authoring check: 10/17/6 short examples match 10/17/6 individual trace mounts; three notes and one cheatsheet per lesson.
- `rtk git apply --check /private/tmp/gha-assembly-reference.patch`: exit 0 against the source checkout.

Not yet verified by this agent: integrated Astro build, generated quiz/cheatsheet pages, link/contrast/account/audio/chat checks, actual browser behavior/screenshots, screen readers, physical touch, Windows execution, or native CPU behavior. Parent runs the integrated required checks before committing/publishing.

Integration note: extend the existing syntax-language detector and mnemonic list for the added bit and SSE mnemonics. The current detector recognizes only a few assembly words and would classify a MOVSS-only listing as Rust.

The teaching models intentionally omit full CPU state, the operating-system exception handler, and a complete MXCSR environment. SSE arithmetic assumes round-to-nearest, ties-to-even. Invalid conversion and NaN COMISS examples explicitly assume masked invalid-operation exceptions; text explains the unmasked exception path. Stack examples show a symbolic return label in a four-byte slot and explain that popped bytes can remain physically present.
