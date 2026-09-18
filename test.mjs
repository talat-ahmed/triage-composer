#!/usr/bin/env node
/* test.mjs - checks the message generator without a browser. Run: node test.mjs */
import assert from 'node:assert/strict';
import { PRESETS, DEFAULT_SETTINGS, WHO, MODALITY, URGENCY } from './data.js';
import { compose, defaultState, applyChange, appAvail, effFb, photosAvail, showCapacity, restOfWeek, todayKey } from './compose.js';

const S = { ...DEFAULT_SETTINGS, name: 'Test' };
const make = (o, extra = {}, settings = S) => Object.assign(defaultState(o, settings), extra);
let n = 0;
const test = (name, fn) => { fn(); n++; };

test('every preset fits the limit, with all switches on and a note', () => {
  for (const p of PRESETS) {
    const st = make(p.o, p.s);
    for (const k of ['hub', 'fbResubmit', 'safety', 'nosms', 'record', 'appResults', 'upload', 'settled', 'explain', 'plink', 'adminList', 'addList', 'complete']) if (k in st) st[k] = true;
    if (st.smsBook) st.nosms = false;
    st.notes = 'Prefers mornings';
    const r = compose(st, S);
    assert.ok(r.length <= 560, `${p.l}: ${r.length} chars is far over`);
    assert.ok(r.text.startsWith('Hi Team,\n') && r.text.endsWith('\nThanks, Test'), `${p.l}: greeting or sign-off missing`);
  }
});

test('default presets fit without warning', () => {
  for (const p of PRESETS) { const r = compose(make(p.o, p.s), S); assert.equal(r.over, false, `${p.l} is over the limit by default`); }
});

test('telephone consultations are doctor-only and allocate-and-text', () => {
  const st = make('book', { who: 'anygp' }); applyChange(st, 'modality', 'tel', S);
  assert.equal(st.who, 'anydr');
  const t = compose(st, S).text;
  assert.match(t, /telephone consultation ASAP with any doctor -/); assert.match(t, /text the patient the date they will receive the call/); assert.doesNotMatch(t, /cannot attend/);
});

test('NHS App self-booking only for a doctor face-to-face with no special purpose', () => {
  assert.equal(appAvail(make('book', { who: 'anygp', modality: 'f2f' })), true);
  assert.equal(appAvail(make('book', { who: 'pharm', modality: 'f2f' })), false);
  assert.equal(appAvail(make('book', { who: 'anydr', modality: 'f2f', purpose: 'results' })), false);
  assert.equal(effFb(make('book', { who: 'pharm', modality: 'f2f' })), 'next');
  assert.match(compose(make('book', { who: 'pharm', modality: 'f2f', urgency: 'routine' }), S).text, /please book the next suitable slot for them/);
});

test('photos are only asked for on a doctor phone call and only appear when requested', () => {
  assert.equal(photosAvail(make('book', { who: 'anydr', modality: 'tel' })), true);
  assert.equal(photosAvail(make('book', { who: 'anydr', modality: 'f2f' })), false);
  assert.equal(photosAvail(make('book', { who: 'pharm', modality: 'tel' })), false);
  assert.match(compose(make('book', { who: 'anydr', modality: 'tel', photos: 'yes' }), S).text, /send in photos of the problem before the call/);
  assert.doesNotMatch(compose(make('book', { who: 'anydr', modality: 'tel' }), S).text, /photos/);
});

test('mental health practitioner: weekly clinic, eligibility check, 111 option 2', () => {
  const t = compose(make('book', { who: 'mhp', modality: 'tel', urgency: 'routine' }), S).text;
  assert.match(t, /next available Tuesday clinic/); assert.match(t, /Tower Hamlets residents/); assert.match(t, /option 2/);
});

test('booking notes sit on their own line above the sign-off', () => {
  const t = compose(make('book', { notes: 'Take history' }), S).text;
  assert.match(t, /\nBooking notes: Take history\.\nThanks, Test$/);
});

test('shortening kicks in and reports it', () => {
  const st = make('book', { who: 'me', urgency: 'day', reason: 'skin', hub: true, fbResubmit: true, record: true, nosms: true });
  const r = compose(st, { ...S, limit: 380 });
  assert.equal(r.compacted, true);
});

test('the rest-of-week fallback lists the remaining weekdays, and Friday falls back to the following week', () => {
  const tue = make('book', { urgency: 'day', day: 'Tuesday', dayFb: 'week' });
  assert.match(compose(tue, S).text, /If they cannot make this Tuesday, please offer Wednesday, Thursday or Friday\./);
  assert.deepEqual(restOfWeek('Friday'), []);
  const fri = make('book', { urgency: 'day', day: 'Friday', dayFb: 'week' });
  assert.match(compose(fri, S).text, /If they cannot make this Friday, please offer the following week\./);
  const next = make('book', { urgency: 'day', day: 'Tuesday', dayFb: 'next' });
  assert.match(compose(next, S).text, /please offer the following week\./);
});

test("today's capacity note: on where a patient is told something, never on a same-day urgent booking", () => {
  const T = { ...S, today: { on: true, reason: 'sick', custom: '', date: todayKey() } };
  const day = make('book', { urgency: 'day', day: 'Tuesday' }, T);
  assert.equal(showCapacity(day, T), true);
  assert.match(compose(day, T).text, /You can explain that we have had a doctor call in sick, so we are short staffed today\./);

  for (const st of [
    make('book', { urgency: 'today' }, T),
    make('book', { who: 'phleb', urgency: 'routine' }, T),
    make('admin', {}, T),
    make('done', {}, T),
    make('mine', {}, T)
  ]) {
    assert.equal(showCapacity(st, T), false);
    assert.doesNotMatch(compose(st, T).text, /You can explain/);
  }

  /* off by default when nothing is set for the day, and never when the free text is empty */
  assert.equal(showCapacity(make('book', {}), S), false);
  const blank = { ...S, today: { on: true, reason: 'custom', custom: '   ', date: todayKey() } };
  assert.equal(showCapacity(make('book', {}, blank), blank), false);
});

test('every preset still fits the limit with the capacity note on', () => {
  const T = { ...S, today: { on: true, reason: 'sick', custom: '', date: todayKey() } };
  for (const p of PRESETS) {
    const r = compose(make(p.o, p.s, T), T);
    assert.equal(r.over, false, `${p.l} is over the limit with the capacity note on`);
  }
});

test('every who/modality/urgency combination produces a sentence', () => {
  for (const w of WHO) for (const m of MODALITY) for (const u of URGENCY) {
    const st = make('book', { who: w.v, modality: m.v, urgency: u.v });
    const r = compose(st, S);
    assert.ok(r.text.length > 40, `${w.v}/${m.v}/${u.v} produced no body`);
  }
});

console.log(`${n} checks passed`);
