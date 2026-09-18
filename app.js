/* app.js - application state, per-device settings, the two renderers and events.
   Quick: Start from (presets and recent cases) -> This case (a line of editable chunks) -> Message.
   Guided: one question per screen, then the message. Both are driven by the same chunk descriptors from summary.js.
   Rendering is one-way: change state -> render(). Message text comes from compose.js. */

import { DEFAULT_SETTINGS, PRESETS, CAPACITY, TEXT_FOR } from './data.js';
import { compose, defaultState, applyChange, dayOk, effFb, effDayFb, todayKey, capacityPhrase } from './compose.js';
import { caseChunks, caseLabel, presetGroups, guidedSteps } from './summary.js';
import { h, replaceChildren, Button, ChipGroup, StartRow, SwitchList, ToggleChips, ActionChips, TextInput, Chunk, Editor, Group, Segmented, OptionList, Progress, Pill } from './components.js';

/* ---------- Settings (per device) ---------- */
const STORAGE_KEY = 'ktc.settings';
const S = Object.assign({}, DEFAULT_SETTINGS);
try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) Object.assign(S, JSON.parse(raw)); } catch { /* storage unavailable: run with defaults */ }
const saveSettings = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch { /* ignore */ } };
/* Today's capacity note belongs to the date it was set on: a new day starts clear. */
if (!S.today || typeof S.today !== 'object') S.today = Object.assign({}, DEFAULT_SETTINGS.today);
if (S.today.on && S.today.date !== todayKey()) S.today = Object.assign({}, DEFAULT_SETTINGS.today);
if (!Array.isArray(S.recent)) S.recent = [];
const noteShortcuts = () => String(S.noteShortcuts || '').split('|').map(s => s.trim()).filter(Boolean);

/* ---------- Case state ---------- */
let st = defaultState('book', S);
let preset = '0';          /* index of the Start button that describes the case, or null once it has been changed */
let openChunk = null;      /* id of the chunk whose editor is showing */
let focusNext = null;      /* data-fid to focus after the next render, or 'editor' for the editor's first control */
let edited = false;
let booted = false;        /* announcements start after the first paint */
let mode = S.mode === 'quick' ? 'quick' : 'guided';
let answered = new Set();  /* guided: step ids already answered */
let lastStage = null;      /* guided: the stage last rendered, so a re-render of the same screen does not re-animate */
let navDir = 'fwd';        /* guided: slide direction for the next screen */
let lastPick = null;       /* guided: { t, x, y } of the last option pick, to ignore a double-tap on the same spot */
const DOUBLE_TAP_MS = 350, DOUBLE_TAP_PX = 24;

const $ = s => document.querySelector(s);
const el = {
  modeSwitch: $('#mode-switch'), guided: $('#guided'), build: document.querySelector('.l-build'), preview: document.querySelector('.l-preview'),
  today: $('#today'), presets: $('#presets'), recent: $('#recent'), chunks: $('#chunks'), editor: $('#editor'),
  card: $('#preview-card'), msg: $('#message'), count: $('#count'), countMobile: $('#count-mobile'), meter: $('#meter'), note: $('#note'),
  regen: $('#regen'), copy: $('#copy'), copyMobile: $('#copy-mobile'), next: $('#next'), status: $('#status'),
  signer: $('#signer'), signerName: $('#signer-name'), settingsForm: $('#settings-form'), settingsToggles: $('#settings-toggles')
};

/* ---------- Announcements (screen readers) ---------- */
let statusTimer = null;
function announce(text) { clearTimeout(statusTimer); statusTimer = setTimeout(() => { el.status.textContent = ''; el.status.textContent = text; }, 150); }

/* ---------- Today's capacity status (set once, rides on every message until cleared) ---------- */
function stampToday() { S.today.date = todayKey(); saveSettings(); }
function setTodayOn(on) {
  S.today.on = on;
  if (!on) S.today.custom = '';
  stampToday();
  st.capacity = on;
  if (on && st.dayFb !== 'week') st.dayFb = 'week';
  focusNext = on ? `Today's capacity:${S.today.reason}` : 'today:add';
  render();
}
function setTodayReason(v) { S.today.reason = v; st.capacity = true; stampToday(); focusNext = `Today's capacity:${v}`; render(); }
function renderToday() {
  const t = S.today;
  if (!t.on) {
    replaceChildren(el.today, h('div', { class: 'c-today' },
      h('div', { class: 'c-today__row' },
        h('span', { class: 'c-today__label', text: 'Today' }),
        h('span', { class: 'c-today__text', text: 'Normal capacity' }),
        Button({ label: 'Add a capacity note', variant: 'link', dataset: { fid: 'today:add' }, onClick: () => setTodayOn(true) }))));
    return;
  }
  const phrase = capacityPhrase(S);
  replaceChildren(el.today, h('div', { class: 'c-today is-on' },
    h('div', { class: 'c-today__row' },
      h('span', { class: 'c-today__label', text: 'Today' }),
      h('span', { class: 'c-today__text', text: phrase ? phrase.l : 'Type what the team can say' }),
      Button({ label: 'Clear', variant: 'ghost', dataset: { fid: 'today:clear' }, onClick: () => setTodayOn(false) })),
    ChipGroup({ options: CAPACITY.map(c => ({ v: c.v, l: c.l })), value: t.reason, onChange: setTodayReason, label: "Today's capacity", size: 'sm' }),
    t.reason === 'custom' && TextInput({
      id: 'today-custom', value: t.custom, placeholder: 'e.g. two of our clinicians are away at training today', label: 'What the team can explain',
      onInput: v => {
        const had = !!capacityPhrase(S);
        t.custom = v; stampToday();
        const ph = capacityPhrase(S);
        const bar = el.today.querySelector('.c-today__text');
        if (bar) bar.textContent = ph ? ph.l : 'Type what the team can say';
        if (!!ph !== had) { if (mode === 'guided') renderGuided(); else renderCase(); }   /* the capacity switch appears or disappears with the text */
        updateMessage();
      }
    })));
}

/* ---------- State changes ---------- */
function applyPreset(i) {
  const p = PRESETS[+i];
  st = Object.assign(defaultState(p.o, S), p.s);
  if (p.o === 'book' && p.s.urgency === 'day') st.day = dayOk(S.myDay);
  preset = String(i); openChunk = null;
  render();
  if (booted) announce(`Start: ${p.l}. ${caseLabel(st, S)}`);
}
function applyRecent(i) {
  const r = S.recent[i]; if (!r) return;
  st = Object.assign(defaultState(r.o, S), r.s);
  preset = null; openChunk = null;
  render();
  announce(`Recent case: ${r.l}`);
}
function setOutcome(id) { st = defaultState(id, S); preset = null; answered = new Set(['outcome']); }
function choose(key, value, e) {
  if (key === 'outcome') setOutcome(value); else { applyChange(st, key, value, S); preset = null; }
  if (mode === 'guided') { if (TEXT_FOR[key] !== value) { answered.add(stepIdFor(key)); navDir = 'fwd'; } render(); return; }
  /* Quick: a mouse pick closes the editor and the case line becomes the confirmation; keyboard picks keep it open so arrows can move on. */
  if (e && e.detail > 0 && TEXT_FOR[key] !== value) closeEditor(); else render();
}
function toggle(key) { applyChange(st, key, !st[key], S); preset = null; render(); }
function setText(key, value) {
  st[key] = value; preset = null;
  if (key === 'namedCustom' && value) st.named = '';
  if (key === 'personCustom' && value) st.person = '';
  if (mode === 'quick') renderChunksOnly();
  updateMessage();
}
/* Which guided step a state key belongs to (keys not listed are their own step) */
const stepIdFor = key => ({ namedCustom: 'named', personCustom: 'person' }[key] || key);
function setMode(m) {
  if (m === mode) return;
  mode = m; S.mode = m; saveSettings();
  if (m === 'guided') { st = defaultState('book', S); preset = null; answered = new Set(); lastStage = null; navDir = 'fwd'; openChunk = null; }
  focusNext = `seg:${m}`;
  render();
  announce(m === 'guided' ? 'Guided: one question at a time.' : 'Quick: start from a preset and adjust the case line.');
}
function openEditor(id) { openChunk = openChunk === id ? null : id; focusNext = openChunk ? 'editor' : `chunk:${id}`; render(); }
function closeEditor() { const id = openChunk; openChunk = null; focusNext = id ? `chunk:${id}` : null; render(); }
function newCase() {
  if (mode === 'guided') { st = defaultState('book', S); preset = null; answered = new Set(); lastStage = null; navDir = 'fwd'; render(); return; }
  focusNext = 'start:0'; applyPreset(0);
}

/* ---------- Message ---------- */
function updateMessage() {
  const r = compose(st, S);
  el.msg.value = r.text;
  const g = $('#gmsg'); if (g) g.value = r.text;
  edited = false; el.regen.hidden = true;
  paintCount(r);
}
function paintCount(r) {
  const n = el.msg.value.length, limit = r ? r.limit : (+S.limit || 500);
  const over = n > limit, warn = !over && n > limit * 0.85;
  const label = `${n} / ${limit}`;
  for (const c of [el.count, el.countMobile]) { c.textContent = label; c.classList.toggle('is-over', over); c.classList.toggle('is-warn', warn); }
  el.meter.max = limit; el.meter.value = Math.min(n, limit);
  el.meter.classList.toggle('is-over', over); el.meter.classList.toggle('is-warn', warn);
  el.note.classList.toggle('is-over', over);
  el.note.textContent = over ? `Over the Klinik limit by ${n - limit} characters. Switch off an option or trim the text.` : (r && r.compacted) ? 'Shortened automatically to fit the Klinik limit.' : '';
  const gc = $('#gcount');
  if (gc) { gc.textContent = label + (over ? ` — over the Klinik limit by ${n - limit}, trim the text` : (r && r.compacted) ? ' — shortened to fit' : ''); gc.classList.toggle('is-over', over); }
}
function rememberRecent() {
  if (preset !== null) return;                       /* a plain start is already in the Start row */
  const l = caseLabel(st, S);
  const s = { ...st }; for (const k of ['notes', 'patientMsg', 'checkCustom', 'adminCustom']) s[k] = '';
  S.recent = [{ l, o: st.outcome, s }].concat(S.recent.filter(r => r.l !== l)).slice(0, 3);
  saveSettings(); renderRecent();
}
async function copy() {
  const t = el.msg.value;
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch { /* fall through */ }
  if (!ok) { try { el.msg.focus(); el.msg.select(); ok = document.execCommand('copy'); el.msg.setSelectionRange(0, 0); } catch { /* ignore */ } }
  for (const b of [el.copy, el.copyMobile, ...document.querySelectorAll('[data-copy]')]) {
    b.textContent = ok ? 'Copied' : 'Select and copy manually'; b.classList.toggle('is-done', ok);
    setTimeout(() => { b.textContent = 'Copy message'; b.classList.remove('is-done'); }, 1600);
  }
  announce(ok ? 'Message copied to the clipboard. Paste it into Klinik.' : 'Copy failed. Select the message text and copy it manually.');
  if (ok) rememberRecent();
  const banner = $('#copied'); if (banner && ok) { banner.hidden = false; const b = banner.querySelector('button'); if (b) b.focus({ preventScroll: true }); }
}

/* ---------- Start row ---------- */
function renderPresets() {
  const groups = presetGroups(S.moreStarts ? null : p => p.primary);
  const hidden = PRESETS.filter(p => !p.primary).length;
  replaceChildren(el.presets,
    StartRow({ groups, value: preset, onChange: applyPreset }),
    Button({
      label: S.moreStarts ? 'Fewer starts' : `More starts (${hidden})`, variant: 'link', 'aria-expanded': String(!!S.moreStarts), dataset: { fid: 'start:more' },
      onClick: () => { S.moreStarts = !S.moreStarts; saveSettings(); focusNext = 'start:more'; renderPresets(); restoreFocus(); }
    }));
}
function renderRecent() {
  if (!S.recent.length) { replaceChildren(el.recent); return; }
  replaceChildren(el.recent, h('div', { class: 'c-recent' },
    h('div', { class: 'c-start__label', text: 'Recent' }),
    h('div', { class: 'c-chips', role: 'group', 'aria-label': 'Recent cases' },
      S.recent.map((r, i) => h('button', { type: 'button', class: 'c-chip c-chip--sm', title: r.l, dataset: { fid: `recent:${i}` }, onClick: () => applyRecent(i) }, r.l.length > 64 ? `${r.l.slice(0, 62)}…` : r.l)))));
}

/* ---------- This case: the chunk line and the editor for the open chunk ---------- */
function renderChunksOnly() {
  const chunks = caseChunks(st, S);
  if (openChunk && !chunks.some(c => c.id === openChunk)) openChunk = null;   /* the chunk being edited no longer applies */
  replaceChildren(el.chunks, chunks.map(c => Chunk({ id: c.id, label: c.label, value: c.value, muted: c.muted, open: c.id === openChunk, onClick: () => openEditor(c.id) })));
  return chunks;
}
function renderCase() {
  const chunks = renderChunksOnly();
  const c = chunks.find(x => x.id === openChunk);
  el.chunks.classList.toggle('has-open', !!c);
  if (!c) { replaceChildren(el.editor); return; }
  const chip = (key, opts, label) => ChipGroup({ options: opts, value: key === 'fb' ? effFb(st) : key === 'dayFb' ? effDayFb(st) : st[key], onChange: (v, e) => choose(key, v, e), label, fid: key });
  const text = (key, label, ph) => TextInput({ id: `f-${key}`, value: st[key], placeholder: ph, label, onInput: v => setText(key, v), onEnter: closeEditor });
  const custom = () => (c.textKey && st[c.key] === TEXT_FOR[c.key] ? text(c.textKey, c.textLabel || c.label, c.ph) : null);
  let body;
  switch (c.kind) {
    case 'single': body = [chip(c.key, c.opts, c.label), custom()]; break;
    case 'name': {
      const list = (c.anyLabel ? [{ v: '', l: c.anyLabel }] : []).concat(c.roster.map(n => ({ v: n, l: n })));
      body = [list.length > 0 && chip(c.key, list, c.label), text(c.textKey, c.roster.length ? `${c.textLabel}, or type a name` : c.textLabel, c.ph)];
      break;
    }
    case 'groups': body = [c.groups.map(g => Group({ label: g.hint ? `${g.l} — ${g.hint}` : g.l }, chip(c.key, g.opts, g.l))), custom()]; break;
    case 'text': body = [text(c.key, c.textLabel || c.label, c.ph)]; break;
    case 'switches': body = [SwitchList({ items: c.togs.map(t => ({ k: t.k, l: t.l })), values: st, onToggle: toggle })]; break;
    case 'notes': body = notesControls('f-notes'); break;
    default: body = [];
  }
  replaceChildren(el.editor, Editor({ title: c.label, hint: c.hint, onClose: closeEditor }, body));
}
function syncActionChips(value) {
  document.querySelectorAll('#editor .c-chips [aria-pressed], #guided .c-chips [aria-pressed]').forEach(b => { const on = b.textContent === value.trim(); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
}

/* ---------- Guided: one question per screen, then the message ---------- */
/* A second click within DOUBLE_TAP_MS at the same spot is the same tap landing on the next screen; anything else is a real pick. */
function isDoubleTap(e) {
  if (!e || !e.isTrusted || e.detail === 0) return false;         /* keyboard and synthetic clicks are never a double-tap */
  const now = performance.now(), hit = lastPick && now - lastPick.t < DOUBLE_TAP_MS && Math.abs(e.clientX - lastPick.x) < DOUBLE_TAP_PX && Math.abs(e.clientY - lastPick.y) < DOUBLE_TAP_PX;
  lastPick = { t: now, x: e.clientX, y: e.clientY };
  return !!hit;
}
function pickOption(key, v, e) { if (isDoubleTap(e)) return; choose(key, v, e); }
function stageBody(s) {
  const c = s.chunk;
  const done = () => { answered.add(s.id); navDir = 'fwd'; render(); };
  const actions = (label, optional) => h('div', { class: 'c-stage__actions' }, Button({ label, onClick: done, dataset: { fid: 'stage:next' } }), optional && Button({ label: 'Skip', variant: 'link', onClick: done }));
  const text = (key, label, ph) => TextInput({ id: `g-${key}`, value: st[key], placeholder: ph, label, onInput: v => setText(key, v), onEnter: done });
  const pick = (key, opts) => OptionList({ options: opts, value: st[key], onSelect: (v, e) => pickOption(key, v, e), label: s.q, fid: key });
  const custom = () => (c.textKey && st[c.key] === TEXT_FOR[c.key] ? [text(c.textKey, c.textLabel || c.label, c.ph), actions('Next', s.optional)] : []);
  if (s.kind === 'final') {
    const fb = s.chunks.find(x => x.id === 'fb'), opts = s.chunks.find(x => x.id === 'opts');
    return [
      fb && Group({ label: "If they can't attend the slot" }, ChipGroup({ options: fb.opts, value: effFb(st), onChange: v => { applyChange(st, 'fb', v, S); preset = null; render(); }, label: 'If they cannot attend', fid: 'fb' })),
      opts && Group({ label: 'Include' }, ToggleChips({ items: opts.togs.map(t => ({ k: t.k, l: t.c || t.l })), values: st, onToggle: toggle })),
      opts && opts.hint && h('p', { class: 'c-hint', text: opts.hint }),
      Group({ label: 'Booking notes' }, notesControls('g-notes', true)),
      h('div', { class: 'c-stage__actions' }, Button({ label: 'Show message →', onClick: done, dataset: { fid: 'stage:next' } }))
    ];
  }
  switch (c.kind) {
    case 'single': return [pick(c.key, c.opts), custom()];
    case 'name': {
      const list = (c.anyLabel ? [{ v: '', l: c.anyLabel }] : []).concat(c.roster.map(n => ({ v: n, l: n })));
      return [list.length > 0 && pick(c.key, list), text(c.textKey, c.roster.length ? `${c.textLabel}, or type a name` : c.textLabel, c.ph), actions('Next', s.optional)];
    }
    case 'groups': return [c.groups.map(g => Group({ label: g.hint ? `${g.l} — ${g.hint}` : g.l }, pick(c.key, g.opts))), custom()];
    case 'text': return [text(c.key, c.textLabel || c.label, c.ph), actions('Next', s.optional)];
    default: return [];
  }
}
function notesControls(id, labelHidden = false) {
  const shortcuts = noteShortcuts();
  return [
    shortcuts.length > 0 && ActionChips({ items: shortcuts, value: st.notes.trim(), label: 'Note shortcuts', onPick: n => { st.notes = st.notes.trim() === n ? '' : n; preset = null; render(); } }),
    TextInput({ id, labelHidden, value: st.notes, placeholder: 'Optional: anything the team needs to know when booking', label: 'Booking notes (optional, go just above the sign-off)', onInput: v => { st.notes = v; preset = null; if (mode === 'quick') renderChunksOnly(); syncActionChips(v); updateMessage(); } })
  ];
}
function renderGuided() {
  const steps = guidedSteps(st, S);
  const idx = steps.findIndex(x => !answered.has(x.id));
  const cur = idx >= 0 ? steps[idx] : null;
  const total = steps.length;
  const stageId = cur ? cur.id : '__message';
  const fresh = stageId !== lastStage; lastStage = stageId;
  const anim = fresh ? ` c-stage--in-${navDir}` : '';
  const back = (cur && idx === 0) ? null : Button({ label: 'Back', variant: 'link', dataset: { fid: 'stage:back' }, onClick: goBack });
  let stage;
  if (cur) {
    stage = h('div', { class: `c-stage${anim}` },
      Progress({ value: idx, max: total, label: `Question ${idx + 1} of ${total}` }),
      h('div', { class: 'c-stage__meta' }, h('span', { text: `Question ${idx + 1} of ${total}` }), back),
      h('h2', { class: 'c-stage__q', id: 'stage-q', tabindex: '-1', dataset: { fid: 'stage:q' }, text: cur.q }),
      cur.sub && h('p', { class: 'c-stage__sub', text: cur.sub }),
      stageBody(cur));
  } else {
    /* One pill per question answered, one for the options screen, and notes only when there are any */
    const pills = steps.map(x => Pill({ id: x.id, label: x.kind === 'final' ? 'Options' : x.chunk.label, value: x.kind === 'final' ? x.ans : x.chunk.value, onClick: () => reopen(x.id) }));
    if (st.notes.trim()) pills.push(Pill({ id: 'notes', label: 'Notes', value: st.notes.trim(), onClick: () => reopen('opts') }));
    stage = h('div', { class: `c-stage${anim}` },
      Progress({ value: total, max: total, label: 'All questions answered' }),
      h('div', { class: 'c-banner', id: 'copied', hidden: true }, h('span', { text: 'Copied. Paste it into Klinik, then:' }), Button({ label: 'Next case →', onClick: newCase })),
      h('div', { class: 'c-stage__meta' }, h('span', { text: 'Your message' }), back),
      h('h2', { class: 'c-stage__q', id: 'stage-q', tabindex: '-1', dataset: { fid: 'stage:q' }, text: 'Copy this into Klinik' }),
      h('div', { class: 'c-group' },
        h('textarea', { class: 'c-textarea', id: 'gmsg', spellcheck: 'false', 'aria-label': 'Generated message', onInput: e => { el.msg.value = e.target.value; edited = true; paintCount(null); } }),
        h('output', { class: 'c-gcount', id: 'gcount', for: 'gmsg' })),
      h('div', { class: 'c-stage__actions' }, Button({ label: 'Copy message', onClick: copy, 'data-copy': true, dataset: { fid: 'stage:copy' } })),
      h('div', { class: 'c-pills', role: 'group', 'aria-label': 'Your answers; press one to change it' }, pills),
      h('div', { class: 'c-stage__foot' }, Button({ label: 'Start over without copying', variant: 'link', quiet: true, onClick: newCase })));
  }
  replaceChildren(el.guided, stage);
  if (!cur) { $('#gmsg').value = el.msg.value; paintCount(null); }
  /* A new screen: focus its heading so it is read out, or the text field when that is the question */
  if (fresh) {
    const inp = (cur && ['text', 'name'].includes(cur.chunk && cur.chunk.kind)) ? el.guided.querySelector('input.c-input') : null;
    focusNext = inp ? inp.dataset.fid : 'stage:q';
    if (window.scrollY > 120) window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}
function goBack() {
  const steps = guidedSteps(st, S);
  let idx = steps.findIndex(x => !answered.has(x.id)); if (idx < 0) idx = steps.length;
  for (let i = idx - 1; i >= 0; i--) { if (answered.has(steps[i].id)) { answered.delete(steps[i].id); break; } }
  navDir = 'back'; render();
}
function reopen(id) { answered.delete(id); navDir = 'back'; render(); }

/* ---------- Focus: put the keyboard back where it was after a re-render ---------- */
function restoreFocus() {
  const want = focusNext; focusNext = null;
  let target = null;
  if (want === 'editor') for (const sel of ['[role="radio"][tabindex="0"]', 'input', '[role="switch"]', 'button']) { target = el.editor.querySelector(sel); if (target) break; }
  else if (want) target = document.querySelector(`[data-fid="${CSS.escape(want)}"]`);
  if (target) target.focus({ preventScroll: false });
}

/* ---------- Top-level render ---------- */
function renderModeSwitch() {
  replaceChildren(el.modeSwitch, Segmented({ options: [{ v: 'guided', l: 'Guided' }, { v: 'quick', l: 'Quick' }], value: mode, onChange: setMode, label: 'Layout' }));
}
function render() {
  const active = document.activeElement;
  if (!focusNext && active && active.dataset && active.dataset.fid) focusNext = active.dataset.fid;
  document.body.classList.toggle('is-guided', mode === 'guided');
  el.guided.hidden = mode !== 'guided'; el.build.hidden = mode === 'guided'; el.preview.hidden = mode === 'guided';
  renderModeSwitch();
  const lede = document.querySelector('.c-lede'); if (lede) lede.textContent = mode === 'guided' ? 'Answer one question at a time; the message writes itself.' : 'Pick a start, change anything that differs, copy.';
  renderToday();
  if (mode === 'guided') { renderGuided(); }
  else { renderPresets(); renderRecent(); renderCase(); }
  updateMessage();
  restoreFocus();
}

/* ---------- Events not owned by a component ---------- */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); copy(); return; }
  if (e.key === 'Escape' && openChunk && el.editor.contains(document.activeElement)) { e.preventDefault(); closeEditor(); return; }
  /* Guided number keys: only while focus is inside the question (never page-wide, never in a text field) */
  if (mode !== 'guided' || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = document.activeElement;
  if (!el.guided.contains(t) || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
  const i = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].indexOf(e.key); if (i < 0) return;
  const opts = el.guided.querySelectorAll('.c-option');
  if (opts[i]) { e.preventDefault(); opts[i].click(); }
});
el.msg.addEventListener('input', () => { edited = true; el.regen.hidden = false; paintCount(null); });
el.regen.addEventListener('click', updateMessage);
el.copy.addEventListener('click', copy);
el.copyMobile.addEventListener('click', copy);
el.next.addEventListener('click', newCase);

/* Signer */
el.signerName.value = S.name || '';
const paintSigner = () => el.signer.classList.toggle('is-empty', !(S.name || '').trim());
el.signerName.addEventListener('input', () => { S.name = el.signerName.value; saveSettings(); paintSigner(); updateMessage(); });
paintSigner();

/* Settings form */
for (const input of el.settingsForm.querySelectorAll('input[name]')) {
  input.value = S[input.name] ?? '';
  input.addEventListener('input', () => {
    S[input.name] = input.type === 'number' ? (+input.value || DEFAULT_SETTINGS.limit) : input.value;
    saveSettings();
    if (input.name === 'myDay' && st.urgency === 'day') st.day = dayOk(S.myDay);
    if (mode === 'guided') renderGuided(); else renderCase();
    updateMessage();
  });
}
function renderSettingToggles() {
  replaceChildren(el.settingsToggles, SwitchList({
    items: [{ k: 'safetyDefault', l: 'Safety-net line on by default' }, { k: 'breaks', l: 'Line breaks around the greeting and sign-off' }],
    values: S, onToggle: k => { S[k] = !S[k]; saveSettings(); renderSettingToggles(); updateMessage(); const b = el.settingsToggles.querySelector(`[data-fid="sw:${k}"]`); if (b) b.focus({ preventScroll: true }); }
  }));
}
renderSettingToggles();

/* First paint: Guided starts at the first question; Quick starts from the everyday case */
if (mode === 'guided') render(); else applyPreset(0);
booted = true;
