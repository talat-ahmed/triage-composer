# Klinik Triage Composer

Builds the message a triaging clinician sends to the admin team for a Klinik case in a click or two: what should happen, with whom, and by when — within the Klinik character limit and in line with the 2026/27 GP contract access requirements and GMC guidance on delegation.

Two layouts over the same case model, switched in the header and remembered per device:

- **Guided** (the default for a new device): one question per screen, answers advance automatically, the message appears at the end with every answer as a pill you can press to change it. Built for people learning to triage: every decision is asked, with the recommended default already highlighted.
- **Quick**: three zones — **Start from** (the everyday cases as buttons, plus your recent customised ones), **This case** (the current case as a line of chunks — each is a button that opens just that choice), and the **message**. The common case is one click (Copy); a tweak is two or three more.

Live: https://talat-ahmed.github.io/triage-composer/

## Structure

| File | Role |
|---|---|
| `index.html` | Semantic page skeleton: skip link, header (signer, today's capacity bar), main (Start from + This case, and the message preview), a visually hidden status region, footer (reference and settings). No inline styles, no inline scripts. |
| `tokens.css` | The design system: colour (light and dark), type scale, spacing scale, radii, shadows, motion. Every value in `app.css` comes from here. |
| `app.css` | Base, layout (`l-*`), components (`c-*`), utilities (`u-*`). State is expressed with `is-*` classes and ARIA attributes, never inline styles. |
| `data.js` | Content: outcomes, clinician types, option lists, toggle labels, phrase tables, national services, quick-start presets, default settings. This is where a practice changes wording. |
| `compose.js` | The message generator. Pure functions: `defaultState`, `applyChange`, `fragments`, `compose`. No DOM, so it runs in Node for tests. |
| `summary.js` | The case as chunks: `caseChunks(st, S)` returns one descriptor per decision (label, current value, which editor, its options). `guidedSteps` turns the same chunks into the Guided questions (`QUESTIONS` holds the wording). Also `caseLabel` for the Recent row and `presetGroups` for the Start row. Pure, tested. |
| `components.js` | Small DOM component factories built on an `h()` helper: `Button`, `ChipGroup`, `StartRow`, `SwitchList`, `ActionChips`, `TextInput`, `Chunk`, `Editor`, `Group`, `Segmented`, `OptionList`, `Progress`, `Pill`. Radio groups use a roving tabindex (one tab stop; arrow keys move and select, except in `OptionList` where arrows only move because picking advances the screen). Every control carries a `data-fid` so focus survives a re-render. |
| `app.js` | Application state, per-device settings, the Quick and Guided renderers, and events. Rendering is one-way: change state → `render()`, which then puts keyboard focus back where it belongs (in Guided, on the new question's heading). |
| `build.mjs` | Bundles everything into `dist/index.html` (standalone single file) and `dist/artifact.html` (fragment for hosts that add their own skeleton). |
| `test.mjs` | Generator checks that run without a browser: `node test.mjs`. |

The modular files are what GitHub Pages serves (`index.html` loads `app.js` as an ES module). The build is only for single-file targets.

## Conventions

- **Tokens only.** Add a token before you add a value. Dark mode is a token swap under `prefers-color-scheme` and `[data-theme]`; components never reference a literal colour.
- **Components own their markup.** Anything rendered twice is a factory in `components.js`. Behaviour is passed in as callbacks; components do not read application state.
- **State drives the DOM.** `st` (the case) and `S` (settings) are the only sources of truth. Handlers change state and call `render()`; nothing mutates the DOM ad hoc except the message text and counters.
- **Semantics first.** Choices are `role="radiogroup"`/`radio` with arrow-key navigation, switches are `role="switch"` with `aria-checked`, chunks are disclosure buttons with `aria-expanded`, counts are `<output>`, the meter is `<progress>`, and copy / start / recent actions are announced through a `role="status"` region. Every text field has a visible `<label>`. Nothing removes the focus outline. Colour tones meet 4.5:1 on their soft backgrounds in both themes (Lighthouse accessibility 100, axe clean).
- **Wording lives in `data.js` / `compose.js`.** Each sentence has a long and a short form and a priority; `compose()` shortens least-important sentences first until the message fits the limit.

## Extending

- New clinician type: add to `WHO` in `data.js`, a phrase in `whoPhrase()` in `compose.js`, and (if it has a roster) an entry in `PERSON_TYPES`/`ANY_LABEL` plus a settings field.
- New signposting service: add an object to `SERVICES` with `main`, `covers`, `link`, `group`, and defaults for `safety`/`comeback`.
- New start: add to `PRESETS`; `primary: true` puts it in the row before "More starts".
- New decision in a case: add a chunk in `caseChunks()` in `summary.js` and its question wording in `QUESTIONS`; if it needs a new kind of editor, add a case in `renderCase()` and `stageBody()` in `app.js`.
- Guided input rules: no tap guard. A second click within 350 ms at the same spot is treated as the same tap landing on the next screen and ignored; keyboard input is never ignored. Number keys 1–0 pick an option only while focus is inside the question.

## Running locally

Any static server works, e.g. `python3 -m http.server` in this folder, then open `http://localhost:8000/`. Modules need HTTP; opening `index.html` from disk will not load them, but `dist/index.html` will.
