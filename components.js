/* components.js - reusable UI pieces built with a tiny DOM helper. No innerHTML, no inline styles.
   Each factory returns an Element; behaviour is passed in as callbacks. Every control that survives a re-render
   carries a data-fid so app.js can put keyboard focus back where it was. */

/* h(tag, props, ...children): props map to attributes, 'class', 'dataset', on* listeners and 'text'. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const replaceChildren = (el, ...nodes) => { el.replaceChildren(...nodes.flat(Infinity).filter(Boolean)); return el; };
const cx = (...a) => a.filter(Boolean).join(' ');

/* Roving tabindex for a radiogroup: one tab stop, arrow keys move (and select unless selectOnMove is false;
   a group whose selection advances the screen moves focus only and lets Enter or Space pick). */
function rovingRadios(group, selectOnMove = true) {
  group.addEventListener('keydown', e => {
    const items = [...group.querySelectorAll('[role="radio"]')];
    const i = items.indexOf(document.activeElement); if (i < 0) return;
    let j = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = items.length - 1;
    if (j == null) return;
    e.preventDefault(); items[j].focus(); if (selectOnMove) items[j].click();
  });
  const items = [...group.querySelectorAll('[role="radio"]')];
  const on = items.findIndex(b => b.getAttribute('aria-checked') === 'true');
  items.forEach((b, k) => b.tabIndex = k === (on < 0 ? 0 : on) ? 0 : -1);
  return group;
}

/* Button({label, variant, block, quiet, onClick, ...attrs}) */
export function Button({ label, variant = 'primary', block = false, quiet = false, onClick, ...attrs }) {
  return h('button', { type: 'button', class: cx('c-btn', `c-btn--${variant}`, block && 'c-btn--block', quiet && 'c-btn--quiet'), onClick, ...attrs }, label);
}

/* ChipGroup({options:[{v,l,tone?}], value, onChange(v, event), label, fid}) - single choice, one tab stop */
export function ChipGroup({ options, value, onChange, label, size, fid = label }) {
  return rovingRadios(h('div', { class: 'c-chips', role: 'radiogroup', 'aria-label': label },
    options.map(o => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(o.v === value), dataset: { fid: `${fid}:${o.v}` },
      class: cx('c-chip', size && `c-chip--${size}`, o.tone && `t-${o.tone}`, o.v === value && 'is-on'),
      onClick: e => onChange(o.v, e)
    }, o.tone && h('i', { class: 'c-chip__dot', 'aria-hidden': 'true' }), o.l))));
}

/* StartGroup({label, options:[{v,l}], value, onChange, fid}) - a labelled block of preset buttons; all groups share one radiogroup via StartRow */
export function StartRow({ groups, value, onChange, label = 'Start from' }) {
  return rovingRadios(h('div', { class: 'c-start', role: 'radiogroup', 'aria-label': label },
    groups.map(g => h('div', { class: 'c-start__group' },
      h('div', { class: 'c-start__label', text: g.l }),
      h('div', { class: 'c-start__grid' }, g.items.map(o => h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(o.v === value), dataset: { fid: `start:${o.v}` },
        class: cx('c-start__btn', o.v === value && 'is-on'), onClick: () => onChange(o.v)
      }, o.l)))))));
}

/* SwitchList({items:[{k,l}], values, onToggle}) - independent on/off rows */
export function SwitchList({ items, values, onToggle }) {
  return h('div', { class: 'c-switches' },
    items.map(t => h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!values[t.k]), class: 'c-switch', dataset: { fid: `sw:${t.k}` }, onClick: () => onToggle(t.k) },
      h('span', { class: 'c-switch__track', 'aria-hidden': 'true' }), h('span', { text: t.l }))));
}

/* ActionChips({items:[string], value, onPick}) - shortcut phrases; picking again clears */
export function ActionChips({ items, value, onPick, label }) {
  return h('div', { class: 'c-chips', role: 'group', 'aria-label': label },
    items.map((n, i) => h('button', { type: 'button', class: cx('c-chip', value === n && 'is-on'), 'aria-pressed': String(value === n), dataset: { fid: `act:${i}` }, onClick: () => onPick(n) }, n)));
}

/* TextInput({id, label, value, placeholder, onInput, onEnter}) - always with a visible label */
export function TextInput({ id, label, value = '', placeholder = '', hint, onInput, onEnter }) {
  const input = h('input', {
    type: 'text', id, class: 'c-input', value, placeholder, autocomplete: 'off', dataset: { fid: `in:${id}` },
    'aria-describedby': hint ? `${id}-hint` : null,
    onInput: e => onInput && onInput(e.target.value),
    onKeydown: e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }
  });
  return h('div', { class: 'c-text' }, h('label', { class: 'c-label', for: id, text: label }), input, hint && h('span', { class: 'c-hint', id: `${id}-hint`, text: hint }));
}

/* Chunk({label, value, muted, open, onClick, id}) - one decision in the case line; a disclosure button for its editor */
export function Chunk({ id, label, value, muted, open, onClick }) {
  return h('button', {
    type: 'button', class: cx('c-chunk', muted && 'is-muted', open && 'is-open'), 'aria-expanded': String(!!open), 'aria-controls': 'editor',
    dataset: { fid: `chunk:${id}` }, onClick
  }, h('span', { class: 'c-chunk__k', text: label }), h('b', { class: 'c-chunk__v', text: value }), h('i', { class: 'c-chunk__caret', 'aria-hidden': 'true' }));
}

/* Editor({title, hint, onClose}, ...body) - the inline panel that edits one chunk */
export function Editor({ title, hint, onClose }, ...body) {
  return h('div', { class: 'c-editor', role: 'group', 'aria-labelledby': 'editor-title' },
    h('div', { class: 'c-editor__head' },
      h('div', {}, h('h3', { class: 'c-editor__title', id: 'editor-title', text: title }), hint && h('p', { class: 'c-hint', text: hint })),
      Button({ label: 'Done', variant: 'ghost', onClick: onClose, dataset: { fid: 'editor:done' } })),
    h('div', { class: 'c-editor__body' }, body));
}

/* Group({label}, ...children) - a labelled cluster inside an editor */
export const Group = ({ label }, ...children) => h('div', { class: 'c-group' }, h('div', { class: 'c-group__label', text: label }), children);

/* Segmented({options:[{v,l}], value, onChange, label}) - a compact radiogroup, used for the mode switch */
export function Segmented({ options, value, onChange, label }) {
  return rovingRadios(h('div', { class: 'c-seg', role: 'radiogroup', 'aria-label': label },
    options.map(o => h('button', { type: 'button', class: 'c-seg__btn', role: 'radio', 'aria-checked': String(o.v === value), dataset: { fid: `seg:${o.v}` }, onClick: () => onChange(o.v) }, o.l))));
}

/* OptionList({options:[{v,l,tone?}], value, onSelect(v, event), label}) - the guided screen's big answers, numbered for the keyboard.
   Arrow keys move focus only; Enter, Space, a click or the number key picks (picking advances the screen). */
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
export function OptionList({ options, value, onSelect, label, fid = 'opt' }) {
  return rovingRadios(h('div', { class: cx('c-options', options.length > 6 && 'c-options--cols'), role: 'radiogroup', 'aria-label': label },
    options.map((o, i) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(o.v === value), class: cx('c-option', o.tone && `t-${o.tone}`), dataset: { fid: `${fid}:${o.v}` },
      onClick: e => onSelect(o.v, e)
    }, h('span', { class: 'c-option__key', 'aria-hidden': 'true', text: KEYS[i] || '' }), h('span', { class: 'c-option__label', text: o.l }), o.tone && h('i', { class: 'c-option__dot', 'aria-hidden': 'true' })))), false);
}

/* Progress({value, max, label}) - native progress element */
export const Progress = ({ value, max, label }) => h('progress', { class: 'c-progress', value, max, 'aria-label': label });

/* Pill({label, value, onClick}) - an answered question on the message screen; pressing it reopens that question */
export const Pill = ({ id, label, value, onClick }) => h('button', { type: 'button', class: 'c-pill', dataset: { fid: `pill:${id}` }, 'aria-label': `Change ${label}: ${value}`, onClick }, `${label}: `, h('b', { text: value }));
