/* app.js - application state, persistence, the Panel and Guided renderers, and events.
   Rendering is one-way: change state -> render(). Message text comes from compose.js. */

import {
  OUTCOMES, DAYS, WHO, DOCTOR_TYPES, PERSON_TYPES, ANY_LABEL, MODALITY, URGENCY, REASON_OPTS, PURPOSE_NURSE, PURPOSE_OTHER,
  PHOTO_OPTS, FB_APP, FB_NOAPP, LIST_OPTS, CHECK_OPTS, THEN_OPTS, ADMIN_OPTS, TEXT_FOR, TOGGLES, FB_SHORT,
  DEFAULT_SETTINGS, PRESETS, SERVICES, SERVICE_GROUPS, SERVICE, CAPACITY, DAYFB
} from './data.js';
import {
  compose, defaultState, applyChange, names, orList, dayOk, namedName, personName, appAvail, effFb, photosAvail, showFb, showModality, showUrgency,
  restOfWeek, todayKey, todayStatus, effDayFb, showCapacity, capacityPhrase
} from './compose.js';
import { h, replaceChildren, Button, Segmented, ChipGroup, ToggleChips, SwitchList, ActionChips, TextInput, Field, OptionList, Progress, Pill, Group } from './components.js';

/* ---------- Settings (per device) ---------- */
const STORAGE_KEY = 'ktc.settings';
const S = Object.assign({}, DEFAULT_SETTINGS);
try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) Object.assign(S, JSON.parse(raw)); } catch { /* storage unavailable: run with defaults */ }
const saveSettings = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch { /* ignore */ } };
/* Today's capacity note belongs to the date it was set on: a new day starts clear. */
if (!S.today || typeof S.today !== 'object') S.today = Object.assign({}, DEFAULT_SETTINGS.today);
if (S.today.on && S.today.date !== todayKey()) S.today = Object.assign({}, DEFAULT_SETTINGS.today);
const noteShortcuts = () => String(S.noteShortcuts || '').split('|').map(s => s.trim()).filter(Boolean);

/* ---------- Case state ---------- */
let st = defaultState('book', S);
let mode = S.mode === 'guided' ? 'guided' : 'panel';
let answered = new Set();          /* guided: step ids already answered */
let navDir = 'fwd';                /* guided: slide direction for the next screen */
let lastStage = null;              /* guided: last rendered stage id (suppresses re-animation) */
let stageAt = 0;                   /* guided: when the current screen appeared */
const GUARD_MS = 400;              /* taps this soon after a screen change are ignored, so a double-tap cannot answer two questions */
let edited = false;

const $ = s => document.querySelector(s);
const el = {
  modeSwitch: $('#mode-switch'), today: $('#today'), presets: $('#presets'), outcomes: $('#outcomes'), options: $('#options'),
  card: $('#preview-card'), msg: $('#message'), count: $('#count'), countMobile: $('#count-mobile'), meter: $('#meter'), note: $('#note'),
  regen: $('#regen'), copy: $('#copy'), copyMobile: $('#copy-mobile'), signer: $('#signer'), signerName: $('#signer-name'),
  settingsForm: $('#settings-form'), settingsToggles: $('#settings-toggles')
};

/* ---------- Option definitions for the current state (shared by both layouts) ---------- */
function defs() {
  const d = {};
  d.common = [{ k: 'safety', ...TOGGLES.safety }, { k: 'nosms', ...TOGGLES.nosms }, { k: 'record', ...TOGGLES.record }];
  d.mhpHint = `Telephone only${(S.mhpDay || '').trim() ? `, ${S.mhpDay.trim()} clinic` : ''}${(S.mhpArea || '').trim() ? `, ${S.mhpArea.trim()} residents` : ''}`;
  d.whoHint = st.who === 'mhp' ? d.mhpHint : st.modality === 'tel' ? 'Telephone consultations are with a doctor' : '';
  d.hasPerson = st.who in PERSON_TYPES;
  d.personRoster = d.hasPerson ? names(S[PERSON_TYPES[st.who]]) : [];
  d.anyLabel = ANY_LABEL[st.who] || '';
  d.gpRoster = names(S.gps);
  d.purposeOpts = st.who === 'nurse' ? PURPOSE_NURSE : (st.who !== 'phleb' && st.who !== 'mhp') ? PURPOSE_OTHER : null;
  d.purposePh = st.who === 'nurse' ? 'e.g. a blood pressure check' : 'e.g. a blood pressure review';
  d.showModality = showModality(st); d.showUrgency = showUrgency(st); d.showPhotos = photosAvail(st); d.showFb = showFb(st); d.appAvail = appAvail(st);
  d.fbOpts = d.appAvail ? FB_APP : FB_NOAPP;
  d.fbHint = d.appAvail ? 'NHS App self-booking is available for this slot type' : 'NHS App self-booking is not available for this slot type';
  const opts = [];
  if (st.who === 'phleb') opts.push({ k: 'hub', ...TOGGLES.hubPhleb });
  else if (st.who === 'mhp') { const area = (S.mhpArea || '').trim() || 'the eligible area'; opts.push({ k: 'mhpCheck', l: `Check registered address is in ${area}`, c: `Check address is in ${area}`, s: TOGGLES.mhpCheck.s }); }
  else opts.push({ k: 'hub', ...TOGGLES.hub });
  if (st.purpose === 'results') opts.push({ k: 'appResults', ...TOGGLES.appResults });
  if (st.who !== 'phleb' && st.modality === 'tel') opts.push({ k: 'smsBook', ...TOGGLES.smsBook });
  else if (d.showFb) opts.push({ k: 'fbResubmit', ...TOGGLES.fbResubmit });
  d.showCapacity = showCapacity(st, S);
  if (d.showCapacity) opts.push({ k: 'capacity', ...TOGGLES.capacity });
  d.bookToggles = opts.concat(d.common);
  d.rest = restOfWeek(st.day);
  d.dayFbOpts = d.rest.length ? DAYFB : [DAYFB[1]];
  d.dayFbHint = d.rest.length ? `Rest of this week: ${orList(d.rest)}` : 'Friday has no rest of the week left';
  const urgentHint = 'Same-day path escalates to you if no slot' + (todayStatus(S).on ? ". Today's capacity note is left off urgent cases" : '');
  d.optHint = st.modality === 'tel' && st.who !== 'phleb' ? 'Phone slots are allocated, not offered' : st.urgency === 'today' ? urgentHint : '';
  d.listHint = `Slot label: '${(S.slot || '').trim() || 'Tel Triage KLINIK DR TO BOOK ONLY'}'`;
  d.mineToggles = [{ k: 'upload', ...TOGGLES.upload }, d.common[1], d.common[2]];
  d.contactToggles = [{ k: 'settled', ...TOGGLES.settled }].concat(d.showCapacity ? [{ k: 'capacity', ...TOGGLES.capacity }] : [], d.common);
  const byGroup = g => SERVICES.filter(s => s.group === g).map(s => ({ v: s.id, l: s.label }));
  d.serviceGroups = SERVICE_GROUPS.map(g => ({ ...g, opts: byGroup(g.id).concat(g.extra || [], (g.tail || []).flatMap(byGroup), g.custom ? [g.custom] : []) }));
  const svc = SERVICE(st.service);
  const t = st.service === 'nhsapp' ? [{ k: 'confirm', ...TOGGLES.confirm }] : [{ k: 'comeback', ...TOGGLES.comeback }];
  if (svc) t.push({ k: 'explain', ...TOGGLES.explain });
  if (svc && svc.link) t.push({ k: 'plink', ...TOGGLES.plink });
  if (d.showCapacity) t.push({ k: 'capacity', ...TOGGLES.capacity });
  d.signpostToggles = t.concat([d.common[0], d.common[2]]);
  d.adminToggles = (st.adminType === 'letter' ? [{ k: 'adminList', ...TOGGLES.adminList }] : []).concat([d.common[2]]);
  d.doneToggles = [{ k: 'addList', ...TOGGLES.addList }, { k: 'complete', ...TOGGLES.complete }, { k: 'nosms', ...TOGGLES.nosmsDone }];
  return d;
}
const labelOf = (opts, v) => (opts.find(o => o.v === v) || {}).l || '';
const onLabels = list => { const on = list.filter(t => st[t.k]).map(t => t.s || t.l); return on.length ? on.join(' · ') : 'None'; };

/* ---------- Today's capacity status (set once, rides on every message until cleared) ---------- */
function stampToday() { S.today.date = todayKey(); saveSettings(); }
function setTodayOn(on) {
  S.today.on = on;
  if (!on) S.today.custom = '';
  stampToday();
  st.capacity = on;
  if (on && st.dayFb !== 'week') st.dayFb = 'week';
  render();
}
function setTodayReason(v) { S.today.reason = v; st.capacity = true; stampToday(); render(); }
function renderToday() {
  const t = S.today;
  if (!t.on) {
    replaceChildren(el.today, h('div', { class: 'c-today' },
      h('div', { class: 'c-today__row' },
        h('span', { class: 'c-today__label', text: 'Today' }),
        h('span', { class: 'c-today__text', text: 'Normal capacity' }),
        Button({ label: 'Add a capacity note', variant: 'link', onClick: () => setTodayOn(true) }))));
    return;
  }
  const phrase = capacityPhrase(S);
  replaceChildren(el.today, h('div', { class: 'c-today is-on' },
    h('div', { class: 'c-today__row' },
      h('span', { class: 'c-today__label', text: 'Today' }),
      h('span', { class: 'c-today__text', text: phrase ? phrase.l : 'Type what the team can say' }),
      Button({ label: 'Clear', variant: 'ghost', onClick: () => setTodayOn(false) })),
    ChipGroup({ options: CAPACITY.map(c => ({ v: c.v, l: c.l })), value: t.reason, onChange: setTodayReason, label: "Today's capacity", size: 'sm' }),
    t.reason === 'custom' && TextInput({
      value: t.custom, placeholder: 'e.g. two of our clinicians are away at training today', label: 'What the team can explain',
      onInput: v => {
        const had = !!capacityPhrase(S);
        t.custom = v; stampToday();
        const ph = capacityPhrase(S);
        const bar = el.today.querySelector('.c-today__text');
        if (bar) bar.textContent = ph ? ph.l : 'Type what the team can say';
        if (!!ph !== had) renderPanelOnly();   /* the capacity switch appears or disappears with the text */
        updateMessage();
      }
    })));
}

/* ---------- State changes ---------- */
function setOutcome(id) { st = defaultState(id, S); answered = new Set(['outcome']); clearPresetHighlight(); render(); }
function choose(key, value) {
  applyChange(st, key, value, S);
  if (mode === 'guided' && TEXT_FOR[key] !== value) { answered.add(stepIdFor(key)); navDir = 'fwd'; }
  clearPresetHighlight(); render();
}
function toggle(key) { applyChange(st, key, !st[key], S); renderPanelOnly(); updateMessage(); }
function setText(key, value) { st[key] = value; if (key === 'namedCustom' && value) st.named = ''; if (key === 'personCustom' && value) st.person = ''; updateMessage(); }
function applyPreset(i, btn) {
  const p = PRESETS[i];
  st = Object.assign(defaultState(p.o, S), p.s);
  if (p.o === 'book' && p.s.urgency === 'day') st.day = dayOk(S.myDay);
  answered = new Set(guidedSteps().map(x => x.id));
  render();
  el.presets.querySelectorAll('.c-chip').forEach(c => { const on = c === btn; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
}
function clearPresetHighlight() { el.presets.querySelectorAll('.c-chip').forEach(c => { c.classList.remove('is-on'); c.setAttribute('aria-pressed', 'false'); }); }
function newCase() { st = defaultState('book', S); answered = new Set(); navDir = 'fwd'; clearPresetHighlight(); render(); }
function setMode(m) {
  mode = m; S.mode = m; saveSettings();
  if (m === 'guided') { st = defaultState('book', S); answered = new Set(); navDir = 'fwd'; lastStage = null; clearPresetHighlight(); }
  render();
}
/* Which guided step a state key belongs to (keys not listed are their own step) */
const stepIdFor = key => ({ namedCustom: 'named', personCustom: 'person' }[key] || key);

/* ---------- Message ---------- */
let pulseTimer = null;
function updateMessage() {
  const r = compose(st, S);
  const changed = el.msg.value !== r.text;
  el.msg.value = r.text;
  const g = $('#gmsg'); if (g) g.value = r.text;
  edited = false; el.regen.hidden = true;
  paintCount(r);
  if (changed && mode === 'guided') { el.card.classList.add('is-pulse'); clearTimeout(pulseTimer); pulseTimer = setTimeout(() => el.card.classList.remove('is-pulse'), 450); }
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
  if (gc) { gc.textContent = label + (over ? ` - over the Klinik limit by ${n - limit}, trim the text` : (r && r.compacted) ? ' - shortened to fit' : ''); gc.classList.toggle('is-over', over); }
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
  const banner = $('#copied'); if (banner && ok) banner.hidden = false;
}

/* ---------- Panel layout ---------- */
function renderPanel() {
  const o = OUTCOMES.find(x => x.id === st.outcome);
  const d = defs();
  const chip = (key, opts, extra = {}) => ChipGroup({ options: opts, value: st[key], onChange: v => choose(key, v), ...extra });
  const text = (key, ph) => TextInput({ value: st[key], placeholder: ph, label: ph, onInput: v => setText(key, v) });
  const switches = items => SwitchList({ items: items.map(t => ({ k: t.k, l: t.l })), values: st, onToggle: toggle });
  const rows = [h('div', { class: 'c-panel__head' }, h('h2', { text: o.label }), h('span', { class: 'c-panel__type' }, 'Contract response: ', h('b', { text: o.rtype })))];
  const custom = (key, textKey, ph) => (st[key] === TEXT_FOR[key] ? text(textKey, ph) : null);

  if (st.outcome === 'book') {
    const whoExtra = st.who === 'named'
      ? [d.gpRoster.length && ChipGroup({ options: [{ v: '', l: 'Choose' }].concat(d.gpRoster.map(n => ({ v: n, l: n }))), value: st.named, onChange: v => choose('named', v), label: 'Doctor or ANP' }),
        text('namedCustom', d.gpRoster.length ? 'or type a name, e.g. a locum' : 'Type the name, e.g. Dr Patel or Sam (ANP)')]
      : d.hasPerson
        ? [d.personRoster.length && ChipGroup({ options: [{ v: '', l: d.anyLabel }].concat(d.personRoster.map(n => ({ v: n, l: n }))), value: st.person, onChange: v => choose('person', v), label: 'Which person' }),
          text('personCustom', d.personRoster.length ? 'or type a name, e.g. a locum' : 'Optional: name a specific person, e.g. a locum')]
        : [];
    rows.push(Field({ label: 'Who', hint: d.whoHint }, chip('who', WHO, { label: 'Who' }), whoExtra));
    if (st.who === 'me' || st.who === 'named') rows.push(Field({ label: 'Why them', hint: 'Told to the patient' }, chip('reason', REASON_OPTS, { label: 'Reason' }), custom('reason', 'reasonCustom', 'e.g. they saw the patient last week')));
    if (d.purposeOpts) rows.push(Field({ label: 'For', hint: st.who === 'nurse' ? '' : 'Optional' }, chip('purpose', d.purposeOpts, { label: 'Purpose' }), custom('purpose', 'purposeCustom', d.purposePh)));
    if (d.showModality) rows.push(Field({ label: 'Type' }, chip('modality', MODALITY, { label: 'Type' })));
    if (d.showPhotos) rows.push(Field({ label: 'Photos', hint: 'Requested before the call' }, chip('photos', PHOTO_OPTS, { label: 'Photos' })));
    if (d.showUrgency) rows.push(Field({ label: 'When' }, chip('urgency', URGENCY, { label: 'When' })));
    if (d.showUrgency && st.urgency === 'day') rows.push(Field({ label: 'Day' }, chip('day', DAYS.map(x => ({ v: x, l: x })), { label: 'Day' })));
    if (d.showUrgency && st.urgency === 'day') rows.push(Field({ label: 'If not that day', hint: d.dayFbHint }, ChipGroup({ options: d.dayFbOpts, value: effDayFb(st), onChange: v => choose('dayFb', v), label: 'If not that day' })));
    if (d.showFb) rows.push(Field({ label: 'If unable to attend', hint: d.fbHint }, ChipGroup({ options: d.fbOpts, value: effFb(st), onChange: v => choose('fb', v), label: 'If unable to attend' })));
    rows.push(Field({ label: 'Options', hint: d.optHint }, switches(d.bookToggles)));
  } else if (st.outcome === 'mine') {
    rows.push(Field({ label: 'List', hint: d.listHint }, chip('list', LIST_OPTS, { label: 'List' })));
    rows.push(Field({ label: 'Options' }, switches(d.mineToggles)));
  } else if (st.outcome === 'contact') {
    rows.push(Field({ label: 'Ask' }, chip('check', CHECK_OPTS, { label: 'Ask' }), custom('check', 'checkCustom', 'e.g. which side is the pain on, and any fever?')));
    rows.push(Field({ label: 'If ongoing' }, chip('then', THEN_OPTS, { label: 'If ongoing' })));
    rows.push(Field({ label: 'Options' }, switches(d.contactToggles)));
  } else if (st.outcome === 'signpost') {
    d.serviceGroups.forEach((g, i) => rows.push(Field({ label: g.l, hint: g.hint }, chip('service', g.opts, { label: g.l }), i === d.serviceGroups.length - 1 ? custom('service', 'serviceCustom', 'e.g. the community mental health team') : null)));
    rows.push(Field({ label: 'Options' }, switches(d.signpostToggles)));
  } else if (st.outcome === 'admin') {
    rows.push(Field({ label: 'Request' }, chip('adminType', ADMIN_OPTS, { label: 'Request' }), custom('adminType', 'adminCustom', 'e.g. Please contact the patient to confirm which pharmacy they use')));
    rows.push(Field({ label: 'Options' }, switches(d.adminToggles)));
  } else if (st.outcome === 'done') {
    rows.push(Field({ label: 'Options' }, switches(d.doneToggles)));
    rows.push(Field({ label: 'Text for patient', hint: 'Sent by the team' }, text('patientMsg', 'Optional: words for the team to text the patient')));
  }
  rows.push(Field({ label: 'Booking notes', hint: 'Optional. Goes just above the sign-off' }, notesControls()));
  el.options.className = 'c-panel';
  replaceChildren(el.options, rows);
}
function notesControls() {
  const shortcuts = noteShortcuts();
  return [
    shortcuts.length && ActionChips({ items: shortcuts, value: st.notes.trim(), onPick: n => { st.notes = st.notes.trim() === n ? '' : n; renderPanelOnly(); updateMessage(); } }),
    TextInput({ value: st.notes, placeholder: 'Optional: anything the team needs to know when booking', label: 'Booking notes', onInput: v => { st.notes = v; syncActionChips(v); updateMessage(); } })
  ];
}
function syncActionChips(value) {
  el.options.querySelectorAll('.c-chips [aria-pressed]').forEach(c => { if (noteShortcuts().includes(c.textContent)) { const on = c.textContent === value.trim(); c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); } });
}

/* ---------- Guided layout: one question per screen, then the message ---------- */
function guidedSteps() {
  const d = defs(); const s = [];
  s.push({ id: 'outcome', q: 'What should happen with this case?', short: 'Outcome', kind: 'single', key: 'outcome', opts: OUTCOMES.map(o => ({ v: o.id, l: o.label })), ans: OUTCOMES.find(o => o.id === st.outcome).label });
  if (st.outcome === 'book') {
    s.push({ id: 'who', q: 'Who should the patient see?', short: 'Who', kind: 'single', key: 'who', opts: WHO, ans: labelOf(WHO, st.who), sub: d.whoHint });
    if (st.who === 'named') s.push({ id: 'named', q: 'Which doctor or ANP?', short: 'Name', kind: 'name', key: 'named', roster: d.gpRoster, anyLabel: '', textKey: 'namedCustom', ph: 'Type the name, e.g. Dr Patel or Sam (ANP)', ans: namedName(st) || 'Not named yet' });
    if (d.hasPerson) s.push({ id: 'person', q: 'Anyone in particular?', short: 'Name', kind: 'name', key: 'person', roster: d.personRoster, anyLabel: d.anyLabel, textKey: 'personCustom', ph: 'Optional: a specific person, e.g. a locum', ans: personName(st) || d.anyLabel, optional: true });
    if (st.who === 'me' || st.who === 'named') s.push({ id: 'reason', q: 'Why them? The team tells the patient this.', short: 'Why them', kind: 'single', key: 'reason', opts: REASON_OPTS, textKey: 'reasonCustom', ph: 'e.g. they saw the patient last week', ans: st.reason === 'custom' ? (st.reasonCustom.trim() || 'Other') : labelOf(REASON_OPTS, st.reason) });
    if (d.purposeOpts) s.push({ id: 'purpose', q: 'What is the appointment for?', short: 'For', kind: 'single', key: 'purpose', opts: d.purposeOpts, textKey: 'purposeCustom', ph: d.purposePh, ans: st.purpose === 'other' ? (st.purposeCustom.trim() || 'Other') : labelOf(d.purposeOpts, st.purpose), optional: true });
    if (d.showModality) s.push({ id: 'modality', q: 'Face-to-face or telephone?', short: 'Type', kind: 'single', key: 'modality', opts: MODALITY, ans: labelOf(MODALITY, st.modality) });
    if (d.showPhotos) s.push({ id: 'photos', q: 'Do you need photos from the patient?', short: 'Photos', kind: 'single', key: 'photos', opts: PHOTO_OPTS, sub: 'The team will ask for them before the call', ans: st.photos === 'yes' ? 'Yes' : 'No' });
    if (d.showUrgency) s.push({ id: 'urgency', q: 'How soon?', short: 'When', kind: 'single', key: 'urgency', opts: URGENCY, ans: labelOf(URGENCY, st.urgency) });
    if (d.showUrgency && st.urgency === 'day') s.push({ id: 'day', q: 'Which day?', short: 'Day', kind: 'single', key: 'day', opts: DAYS.map(x => ({ v: x, l: x })), ans: dayOk(st.day) });
    if (d.showUrgency && st.urgency === 'day') s.push({ id: 'dayFb', q: 'If they cannot make that day, what next?', short: 'If not that day', kind: 'single', key: 'dayFb', opts: d.dayFbOpts, sub: d.dayFbHint, ans: labelOf(d.dayFbOpts, effDayFb(st)) });
    s.push(finalStep(d.bookToggles, d.showFb ? d.fbOpts : null, d.optHint));
  } else if (st.outcome === 'mine') {
    s.push({ id: 'list', q: 'Which of your lists?', short: 'List', kind: 'single', key: 'list', opts: LIST_OPTS, sub: d.listHint, ans: labelOf(LIST_OPTS, st.list) });
    s.push(finalStep(d.mineToggles));
  } else if (st.outcome === 'contact') {
    s.push({ id: 'check', q: 'What should the team ask the patient?', short: 'Ask', kind: 'single', key: 'check', opts: CHECK_OPTS, textKey: 'checkCustom', ph: 'e.g. which side is the pain on, and any fever?', ans: st.check === 'custom' ? (st.checkCustom.trim() || 'A specific question') : labelOf(CHECK_OPTS, st.check) });
    s.push({ id: 'then', q: 'If the problem is ongoing, what then?', short: 'If ongoing', kind: 'single', key: 'then', opts: THEN_OPTS, ans: labelOf(THEN_OPTS, st.then) });
    s.push(finalStep(d.contactToggles));
  } else if (st.outcome === 'signpost') {
    const all = d.serviceGroups.flatMap(g => g.opts);
    s.push({ id: 'service', q: 'Which service?', short: 'Service', kind: 'groups', key: 'service', groups: d.serviceGroups, textKey: 'serviceCustom', ph: 'e.g. the community mental health team', ans: st.service === 'other' ? (st.serviceCustom.trim() || 'Other service') : labelOf(all, st.service) });
    s.push(finalStep(d.signpostToggles));
  } else if (st.outcome === 'admin') {
    s.push({ id: 'adminType', q: 'What kind of request?', short: 'Request', kind: 'single', key: 'adminType', opts: ADMIN_OPTS, textKey: 'adminCustom', ph: 'e.g. Please contact the patient to confirm which pharmacy they use', ans: st.adminType === 'other' ? (st.adminCustom.trim() || 'Other') : labelOf(ADMIN_OPTS, st.adminType) });
    s.push(finalStep(d.adminToggles));
  } else if (st.outcome === 'done') {
    s.push({ id: 'patientMsg', q: 'Anything to text the patient?', short: 'Text', kind: 'text', key: 'patientMsg', ph: 'Optional: words for the team to text the patient', ans: st.patientMsg.trim() || 'Nothing', optional: true });
    s.push(finalStep(d.doneToggles));
  }
  return s;
}
function finalStep(togs, fbOpts, hint) {
  const parts = [fbOpts && FB_SHORT[effFb(st)], onLabels(togs)].filter(x => x && x !== 'None');
  return { id: 'opts', q: 'Anything else for the team?', short: 'Options', kind: 'final', togs, fbOpts: fbOpts || null, sub: 'Defaults are already applied. Tap anything to change it.', hint, ans: parts.join(' · ') || 'Defaults' };
}

function stageBody(s) {
  const done = () => { answered.add(s.id); navDir = 'fwd'; render(); };
  const actions = (label, optional) => h('div', { class: 'c-stage__actions' }, Button({ label, onClick: done }), optional && Button({ label: 'Skip', variant: 'link', onClick: done }));
  const text = (key, ph) => TextInput({ value: st[key], placeholder: ph, label: ph, size: 'lg', onInput: v => setText(key, v), onEnter: done });
  const pick = (key, opts) => OptionList({ options: opts, value: st[key], onSelect: v => (key === 'outcome' ? setOutcome(v) : choose(key, v)), label: s.q });
  const custom = () => (s.textKey && st[s.key] === TEXT_FOR[s.key] ? [text(s.textKey, s.ph), actions('Next', s.optional)] : []);
  switch (s.kind) {
    case 'single': return [pick(s.key, s.opts), custom()];
    case 'name': {
      const list = (s.anyLabel ? [{ v: '', l: s.anyLabel }] : []).concat(s.roster.map(n => ({ v: n, l: n })));
      return [list.length && pick(s.key, list), text(s.textKey, s.ph), actions('Next', s.optional)];
    }
    case 'groups': return [s.groups.map(g => Group({ label: g.l }, pick(s.key, g.opts))), custom()];
    case 'text': return [text(s.key, s.ph), actions('Next', s.optional)];
    case 'final': return [
      s.fbOpts && Group({ label: "If they can't attend the slot" }, ChipGroup({ options: s.fbOpts, value: effFb(st), onChange: v => { applyChange(st, 'fb', v, S); renderPanelOnly(); updateMessage(); }, label: 'If they cannot attend' })),
      Group({ label: 'Include' }, ToggleChips({ items: s.togs.map(t => ({ k: t.k, l: t.c || t.l })), values: st, onToggle: toggle })),
      s.hint && h('p', { class: 'c-hint', text: s.hint }),
      Group({ label: 'Booking notes' }, notesControls()),
      h('div', { class: 'c-stage__actions' }, Button({ label: 'Show message →', onClick: done }))
    ];
    default: return [];
  }
}
function renderGuided() {
  const steps = guidedSteps();
  const idx = steps.findIndex(x => !answered.has(x.id));
  const cur = idx >= 0 ? steps[idx] : null;
  const total = steps.length;
  const stageId = cur ? cur.id : '__final';
  const anim = stageId === lastStage ? '' : ` c-stage--in-${navDir}`;
  if (stageId !== lastStage) stageAt = performance.now();
  lastStage = stageId;
  const back = (cur && idx === 0) ? null : Button({ label: 'Back', variant: 'link', onClick: goBack });
  let stage;
  if (cur) {
    stage = h('section', { class: `c-stage${anim}`, 'aria-labelledby': 'stage-q' },
      Progress({ value: idx, max: total, label: `Question ${idx + 1} of ${total}` }),
      h('div', { class: 'c-stage__meta' }, h('span', { text: `Question ${idx + 1} of ${total}` }), back),
      h('h2', { class: 'c-stage__q', id: 'stage-q', text: cur.q }),
      cur.sub && h('p', { class: 'c-stage__sub', text: cur.sub }),
      stageBody(cur));
  } else {
    const pills = steps.map(s => Pill({ label: s.short, value: s.ans, title: 'Change', onClick: () => reopen(s.id) }));
    if (st.notes.trim()) pills.push(Pill({ label: 'Notes', value: st.notes.trim(), title: 'Change', onClick: () => reopen('opts') }));
    stage = h('section', { class: `c-stage${anim}`, 'aria-labelledby': 'stage-q' },
      Progress({ value: total, max: total, label: 'Complete' }),
      h('div', { class: 'c-banner', id: 'copied', hidden: true }, h('span', { text: 'Copied. Paste it into Klinik, then:' }), Button({ label: 'Next case →', onClick: newCase })),
      h('div', { class: 'c-stage__meta' }, h('span', { text: 'Your message' }), back),
      h('h2', { class: 'c-stage__q', id: 'stage-q', text: 'Copy this into Klinik' }),
      h('div', { class: 'c-stage__group' },
        h('textarea', { class: 'c-textarea', id: 'gmsg', spellcheck: 'false', 'aria-label': 'Generated message', onInput: e => { el.msg.value = e.target.value; edited = true; el.regen.hidden = false; paintCount(null); } }),
        h('output', { class: 'c-gcount', id: 'gcount', for: 'gmsg' })),
      h('div', { class: 'c-stage__actions' }, Button({ label: 'Copy message', onClick: copy, 'data-copy': true })),
      h('div', { class: 'c-pills' }, pills),
      h('div', { class: 'c-stage__foot' }, Button({ label: 'Start over without copying', variant: 'link', quiet: true, onClick: newCase })));
  }
  el.options.className = '';
  replaceChildren(el.options, stage);
  if (cur) { if (['text', 'notes', 'name'].includes(cur.kind)) { const inp = el.options.querySelector('input.c-input'); if (inp) inp.focus({ preventScroll: true }); } }
  else { $('#gmsg').value = el.msg.value; paintCount(null); }
  if (window.scrollY > 120) window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
function goBack() {
  const steps = guidedSteps();
  let idx = steps.findIndex(x => !answered.has(x.id)); if (idx < 0) idx = steps.length;
  for (let i = idx - 1; i >= 0; i--) { if (answered.has(steps[i].id)) { answered.delete(steps[i].id); break; } }
  navDir = 'back'; render();
}
function reopen(id) { answered.delete(id); navDir = 'back'; render(); }

/* ---------- Top-level render ---------- */
function renderOutcomes() {
  replaceChildren(el.outcomes, Segmented({ options: OUTCOMES.map(o => ({ v: o.id, l: o.label })), value: st.outcome, onChange: setOutcome, label: 'Outcome' }));
}
function renderPanelOnly() { if (mode === 'guided') renderGuided(); else renderPanel(); }
function render() {
  document.body.classList.toggle('is-guided', mode === 'guided');
  replaceChildren(el.modeSwitch, Segmented({ options: [{ v: 'panel', l: 'Panel' }, { v: 'guided', l: 'Guided', tag: 'beta' }], value: mode, onChange: setMode, label: 'Layout', compact: true }));
  renderToday();
  renderOutcomes();
  renderPanelOnly();
  updateMessage();
}

/* ---------- Events not owned by a component ---------- */
/* Double-tap guard: a tap that lands this soon after a screen change is ignored (keyboard is exempt) */
el.options.addEventListener('click', e => {
  if (mode !== 'guided' || !e.isTrusted) return;
  if (performance.now() - stageAt < GUARD_MS && !e.target.closest('.c-btn--link')) { e.stopPropagation(); e.preventDefault(); }
}, true);
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); copy(); return; }
  if (mode !== 'guided' || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const i = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].indexOf(e.key); if (i < 0) return;
  const opts = el.options.querySelectorAll('.c-option');
  if (opts[i]) { e.preventDefault(); opts[i].click(); }
});
el.msg.addEventListener('input', () => { edited = true; el.regen.hidden = false; paintCount(null); });
el.regen.addEventListener('click', updateMessage);
el.copy.addEventListener('click', copy);
el.copyMobile.addEventListener('click', copy);
el.presets.addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (b) applyPreset(+b.dataset.preset, b); });

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
    renderPanelOnly(); updateMessage();
  });
}
function renderSettingToggles() {
  replaceChildren(el.settingsToggles, SwitchList({
    items: [{ k: 'safetyDefault', l: 'Safety-net line on by default' }, { k: 'breaks', l: 'Line breaks around the greeting and sign-off' }],
    values: S, onToggle: k => { S[k] = !S[k]; saveSettings(); renderSettingToggles(); updateMessage(); }
  }));
}
renderSettingToggles();

/* First paint */
replaceChildren(el.presets, PRESETS.map((p, i) => h('button', { type: 'button', class: 'c-chip c-chip--sm', 'aria-pressed': 'false', dataset: { preset: i }, text: p.l })));
if (mode === 'guided') { render(); }
else { st = Object.assign(defaultState('book', S), PRESETS[0].s); render(); applyPreset(0, el.presets.querySelector('.c-chip')); }
