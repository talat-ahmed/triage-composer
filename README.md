# Klinik Triage Composer

Builds the message a triaging clinician sends to the admin team for a Klinik case in a few clicks: what should happen, with whom, and by when — within the Klinik character limit and in line with the 2026/27 GP contract access requirements and GMC guidance on delegation.

Live: https://talat-ahmed.github.io/triage-composer/

## Structure

| File | Role |
|---|---|
| `index.html` | Semantic page skeleton: header (mode switch, signer), main (builder + message preview), footer (reference and settings). No inline styles, no inline scripts. |
| `tokens.css` | The design system: colour (light and dark), type scale, spacing scale, radii, shadows, motion. Every value in `app.css` comes from here. |
| `app.css` | Base, layout (`l-*`), components (`c-*`), utilities (`u-*`). State is expressed with `is-*` classes and ARIA attributes, never inline styles. |
| `data.js` | Content: outcomes, clinician types, option lists, toggle labels, phrase tables, national services, quick-start presets, default settings. This is where a practice changes wording. |
| `compose.js` | The message generator. Pure functions: `defaultState`, `applyChange`, `fragments`, `compose`. No DOM, so it runs in Node for tests. |
| `components.js` | Small DOM component factories built on an `h()` helper: `Button`, `Segmented`, `ChipGroup`, `ToggleChips`, `SwitchList`, `TextInput`, `Field`, `OptionList`, `Progress`, `Pill`, `Group`. |
| `app.js` | Application state, per-device settings, the Panel and Guided renderers, and events. Rendering is one-way: change state → `render()`. |
| `build.mjs` | Bundles everything into `dist/index.html` (standalone single file) and `dist/artifact.html` (fragment for hosts that add their own skeleton). |
| `test.mjs` | Generator checks that run without a browser: `node test.mjs`. |

The modular files are what GitHub Pages serves (`index.html` loads `app.js` as an ES module). The build is only for single-file targets.

## Conventions

- **Tokens only.** Add a token before you add a value. Dark mode is a token swap under `prefers-color-scheme` and `[data-theme]`; components never reference a literal colour.
- **Components own their markup.** Anything rendered twice is a factory in `components.js`. Behaviour is passed in as callbacks; components do not read application state.
- **State drives the DOM.** `st` (the case) and `S` (settings) are the only sources of truth. Handlers change state and call `render()`; nothing mutates the DOM ad hoc except the message text and counters.
- **Semantics first.** Choices are `role="radiogroup"`/`radio`, switches are `role="switch"` with `aria-checked`, progress is `<progress>`, counts are `<output>`, the note is `aria-live`.
- **Wording lives in `data.js` / `compose.js`.** Each sentence has a long and a short form and a priority; `compose()` shortens least-important sentences first until the message fits the limit.

## Extending

- New clinician type: add to `WHO` in `data.js`, a phrase in `whoPhrase()` in `compose.js`, and (if it has a roster) an entry in `PERSON_TYPES`/`ANY_LABEL` plus a settings field.
- New signposting service: add an object to `SERVICES` with `main`, `covers`, `link`, `group`, and defaults for `safety`/`comeback`.
- New quick start: add to `PRESETS`.
- New question in guided mode: add a step in `guidedSteps()` (it appears in the panel via `renderPanel()` too).

## Running locally

Any static server works, e.g. `python3 -m http.server` in this folder, then open `http://localhost:8000/`. Modules need HTTP; opening `index.html` from disk will not load them, but `dist/index.html` will.
