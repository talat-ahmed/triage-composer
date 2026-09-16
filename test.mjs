#!/usr/bin/env node
/* test.mjs - checks the message generator without a browser. Run: node test.mjs */
import assert from 'node:assert/strict';
import { PRESETS, DEFAULT_SETTINGS, WHO, MODALITY, URGENCY } from './data.js';
import { compose, defaultState, applyChange, appAvail, effFb, photosAvail } from './compose.js';

const S = { ...DEFAULT_SETTINGS, name: 'Test' };
const make = (o, extra = {}) => Object.assign(defaultState(o, S), extra);
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

test('every who/modality/urgency combination produces a sentence', () => {
  for (const w of WHO) for (const m of MODALITY) for (const u of URGENCY) {
    const st = make('book', { who: w.v, modality: m.v, urgency: u.v });
    const r = compose(st, S);
    assert.ok(r.text.length > 40, `${w.v}/${m.v}/${u.v} produced no body`);
  }
});

console.log(`${n} checks passed`);
