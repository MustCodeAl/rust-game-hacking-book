# Lesson components

Everything a lesson can use beyond prose, code, tables, and diagrams. Import what
you need from one place:

```mdx
import { Steps, Tabs, Tab, Accordion } from '../../../../components/kit';
```

`/components/` (source: `src/content/docs/components.mdx`) shows each one in use.
This file says when to reach for it. A component is for a reader's benefit, never
decoration; if the page reads as well without it, leave it out.

| Use | When | Do not use it when |
|---|---|---|
| `:::note` `:::tip` `:::caution` `:::danger` | One thing a reader must not miss. Note adds context, tip saves effort, caution warns of a likely mistake, danger warns of harm. | The sentence is ordinary explanation. A page of callouts has none. |
| `Steps` | Actions in a fixed order, a reader's or a program's. | A list of questions, facts, or parts. |
| `Tabs` / `CodeGroup` | Alternatives to one job (two systems, languages, or tools). Give tabs that should switch together the same `sync`. | The panels are not alternatives: a reader needs both. |
| `Accordion` / `Expandable` | Material a reader may skip on a first pass. | Anything a later section depends on. Never hide a derivation. |
| `Columns` | Two or three things compared side by side. | Long prose; narrow columns are hard to read. |
| `Card`, `LinkCard`, `Tiles` | A few next places to go, each with a sentence. | Inside the teaching flow; the lesson order already says what is next. |
| `LinkButton` | The one next action a page offers: start the first lesson, open a reference. `primary` for the main action, `secondary` for an alternative, `minimal` for a quiet extra. | A link inside a sentence, or a page of buttons: with several main actions there is no main action. |
| `Tooltip` | A sentence or two on a word a reader may not know and the lesson does not depend on, with the real numbers if it has any. It is a `HoverCard` of kind `explanation`. | A word used in many places (that is a glossary entry), or anything a later step needs. |
| `Scene` | A mechanism that is easier to see move than to read: bytes, pointers, a stack, a queue, messages between two parties. Parts really move and change over time; the steps are written under it. Never a list of boxes that light up in turn. | A fixed picture (use a diagram), or anything that is only a sequence of names. See `CLAUDE.md`, "Animations (scenes)". |
| `SpeedType` | A short block of code (5 to 15 lines, plain ASCII) the lesson has just explained, which a reader can type out for practice: words per minute, accuracy, a personal best. | Long listings, code full of comments or symbols a keyboard cannot type, or code the lesson has not explained yet. |
| `Frame` | A screenshot or figure with a caption. Describe the picture in alt text and explain necessary concepts in nearby prose. Reader editions keep the picture silent. | Decorative images. |
| `MotionPicture` | A small original GIF that illustrates a repeating mechanism. Start with its still, offer Play/Pause, and retain the still in listening and print. | A long animation, an autoplaying decoration, or a concept better shown with a controllable Scene. |
| `Badge` | A short fact about what follows: "Optional", "Windows only". | Labelling a heading that already says it. |
| `HoverCard` | An extra a reader can do without, opened over a word: an `example`, `reference`, `tip`, `alternative`, `recommendation`, closer `explanation`, `definition`, or `caution`. A glossary word needs none: the build marks those. | Anything a later step, value, or definition depends on: a reader can turn cards off, and a phone needs a tap. Never more than a few in a lesson; a card is not a footnote. |
| `Fields` / `ParamField` / `ResponseField` | A function, request, or structure documented name by name, with long descriptions. | Short descriptions: a table is clearer. |
| `Example` | One worked case set apart from the explanation. | Every example; only the worked one a reader should follow. |
| `Panel` | A reference a reader may return to: a cheat sheet or small table. | Content that belongs in the flow of the lesson. |
| `FileTree` | How a folder is laid out. | A list that is not files. |
| `Color` | A colour given as numbers. | Anything else. |
| `Prompt` | Text a reader pastes into an AI assistant. | Instructions to the reader. |
| `GitHub` | A lab or source file in this repository. It shows the line count and links to the exact version the book was built from. The listening edition skips the card, since a file path is not worth hearing. | Files outside the repository. |
| `$$ ... $$` and `Math` | A formula. Add `% speak: ...` inside a display block when the automatic reading is awkward. | Code, which belongs in a code block. |
| `Updates` / `Update` | A dated list of changes. | |

## Rules every component follows

- **Content stays in the HTML.** Printing and search can use closed accordions
  and inactive tabs. Reader editions select explanatory prose and retain silent
  diagram, image, and table pictures. Controls and optional hover bodies are skipped.
- **Colour has a job.** A chapter's colour marks structure that belongs to the
  lesson. The reading roles keep their meanings: information for terms and prompts,
  process for types and code, result for what comes back. See `kit.css`.
- **Write for the listening edition.** Explain necessary results in real prose.
  Scene steps and diagram labels remain available visually and in print, without
  an automatic spoken recital. A final scene frame must still show a useful result.
- **Maths needs no dollar-sign care.** Only `$$ ... $$` is maths, so a price or a
  shell variable is safe.

## Hover cards

`<HoverCard kind="example" body="...">words</HoverCard>`: the words stay in the text, `body` is
the card (a sentence or two; `code`, **bold**, *emphasis*, and [links](/pages/1/01/) work).
Add `title` for a heading and `href` to make the words a link the card previews. Kinds, and
the reading role each takes its colour from (`src/data/card-kinds.mjs`):

| Kind | For | Role |
|---|---|---|
| `definition` | A word the glossary does not cover | information |
| `explanation` | A closer second account of an idea | information |
| `reference` | Where to read more (give an `href`) | information |
| `example` | One concrete case, with real values | process |
| `alternative` | Another tool or method for the same job | process |
| `tip` | Something that saves effort | result |
| `recommendation` | What the book would choose, and why | result |
| `caution` | A likely mistake | caution |

The card body remains in source HTML for print and search. Narration skips that
optional body and the floating tooltip; the surrounding sentence and link words
remain. `hover-cards.js` shows the body on request. `Tooltip` is a `HoverCard` of
kind `explanation`.

## Where things live

- `src/components/kit/*.astro`: the components, and `index.ts` that exports them.
- `src/styles/kit.css`: their styles, loaded on lesson pages and listening pages.
- `public/scripts/kit.js`: tabs, accordions in print, Prompt buttons. Lesson pages only.
- `public/scripts/speedtype.js`: the typing practice button and test for `SpeedType`.
- `src/lib/math.mjs`, `src/lib/math-speech.mjs`: KaTeX at build time, and the
  formula read aloud.
- `src/lib/github.mjs`: line count and the exact-version link for `GitHub`.

`source-command-tick` compares local prediction and server authority. Its queue
retains unacknowledged commands while a returning snapshot corrects the base
state. Position units are an explained toy model; the clock uses the inspected
SDK default.

Chapter 15 adds nine synthetic defensive scenes. They show authority, visibility,
input edges, driver loading policy, counted false flags, event deduplication,
information disclosure, protection lifetimes, and an idempotent pickup. Their
shared builder is `src/lib/scene/defence.mjs`. No scene is a production detector.
