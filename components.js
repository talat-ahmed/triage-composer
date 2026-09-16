/* components.js - reusable UI pieces built with a tiny DOM helper. No innerHTML, no inline styles.
   Each factory returns an Element; behaviour is passed in as callbacks. */

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

/* Button({label, variant, block, quiet, onClick, ...attrs}) */
export function Button({ label, variant = 'primary', block = false, quiet = false, onClick, ...attrs }) {
  return h('button', { type: 'button', class: cx('c-btn', `c-btn--${variant}`, block && 'c-btn--block', quiet && 'c-btn--quiet'), onClick, ...attrs }, label);
}

/* Segmented({options:[{v,l,tag?}], value, onChange, label, compact}) - a radiogroup */
export function Segmented({ options, value, onChange, label, compact = false }) {
  return h('div', { class: cx('c-seg', compact && 'c-seg--compact'), role: 'radiogroup', 'aria-label': label },
    options.map(o => h('button', { type: 'button', class: 'c-seg__btn', role: 'radio', 'aria-checked': String(o.v === value), onClick: () => onChange(o.v) },
      o.l, o.tag && h('em', { class: 'c-seg__tag', text: o.tag }))));
}

/* ChipGroup({options:[{v,l,tone?}], value, onChange, label, size}) - single choice */
export function ChipGroup({ options, value, onChange, label, size }) {
  return h('div', { class: 'c-chips', role: 'radiogroup', 'aria-label': label },
    options.map(o => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(o.v === value),
      class: cx('c-chip', size && `c-chip--${size}`, o.tone && `t-${o.tone}`, o.v === value && 'is-on'),
      onClick: () => onChange(o.v)
    }, o.tone && h('i', { class: 'c-chip__dot', 'aria-hidden': 'true' }), o.l)));
}

/* ToggleChips({items:[{k,l}], values, onToggle}) - several independent on/off choices as chips with a tick */
export function ToggleChips({ items, values, onToggle }) {
  return h('div', { class: 'c-chips' },
    items.map(t => h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!values[t.k]), class: cx('c-chip', 'c-chip--toggle', values[t.k] && 'is-on'), onClick: () => onToggle(t.k) },
      h('span', { class: 'c-chip__tick', 'aria-hidden': 'true' }), t.l)));
}

/* SwitchList({items:[{k,l}], values, onToggle}) - the panel's switch rows */
export function SwitchList({ items, values, onToggle }) {
  return h('div', { class: 'c-switches' },
    items.map(t => h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!values[t.k]), class: 'c-switch', onClick: () => onToggle(t.k) },
      h('span', { class: 'c-switch__track', 'aria-hidden': 'true' }), h('span', { text: t.l }))));
}

/* ActionChips({items:[string], value, onPick}) - shortcut phrases; picking again clears */
export function ActionChips({ items, value, onPick }) {
  return h('div', { class: 'c-chips' },
    items.map(n => h('button', { type: 'button', class: cx('c-chip', value === n && 'is-on'), 'aria-pressed': String(value === n), onClick: () => onPick(n) }, n)));
}

/* TextInput({value, placeholder, label, size, onInput, onEnter}) */
export function TextInput({ value = '', placeholder = '', label, size, onInput, onEnter, id }) {
  return h('input', {
    type: 'text', id, class: cx('c-input', size && `c-input--${size}`), value, placeholder, 'aria-label': label, autocomplete: 'off',
    onInput: e => onInput && onInput(e.target.value),
    onKeydown: e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }
  });
}

/* Field({label, hint, children}) - a labelled row in the panel */
export function Field({ label, hint }, ...children) {
  return h('div', { class: 'c-field' },
    h('div', { class: 'c-field__label' }, label, hint && h('span', { class: 'c-field__hint', text: hint })),
    h('div', { class: 'c-field__control' }, children));
}

/* OptionList({options:[{v,l,tone?}], value, onSelect, label}) - the guided screen's big answers, numbered for the keyboard */
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
export function OptionList({ options, value, onSelect, label }) {
  return h('div', { class: cx('c-options', options.length > 6 && 'c-options--cols'), role: 'radiogroup', 'aria-label': label },
    options.map((o, i) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(o.v === value), class: cx('c-option', o.tone && `t-${o.tone}`),
      onClick: () => onSelect(o.v)
    }, h('span', { class: 'c-option__key', 'aria-hidden': 'true', text: KEYS[i] || '' }), h('span', { class: 'c-option__label', text: o.l }), o.tone && h('i', { class: 'c-option__dot', 'aria-hidden': 'true' }))));
}

/* Progress({value, max, label}) - native progress element */
export const Progress = ({ value, max, label, className = 'c-progress' }) => h('progress', { class: className, value, max, 'aria-label': label });

/* Pill({label, value, onClick}) */
export const Pill = ({ label, value, onClick, title }) => h('button', { type: 'button', class: 'c-pill', title, onClick }, `${label}: `, h('b', { text: value }));

/* Group({label}, ...children) - a labelled cluster inside a stage */
export const Group = ({ label }, ...children) => h('div', { class: 'c-stage__group' }, h('div', { class: 'c-stage__group-label', text: label }), children);

/* Details({id, summary}, ...body) */
export const Details = ({ id, summary, open }, ...body) => h('details', { id, class: 'c-details', open }, h('summary', { class: 'c-details__summary', text: summary }), body);
