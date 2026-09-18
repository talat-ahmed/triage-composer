#!/usr/bin/env node
/* test.mjs - checks the message generator without a browser. Run: node test.mjs */
import assert from 'node:assert/strict';
import { PRESETS, DEFAULT_SETTINGS, WHO, MODALITY, URGENCY, SERVICES, SERVICE } from './data.js';
import { compose, defaultState, applyChange, appAvail, effFb, photosAvail, showCapacity, restOfWeek, todayKey } from './compose.js';
import { caseChunks, caseLabel, presetGroups, guidedSteps, QUESTIONS, FINAL_IDS } from './summary.js';

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

/* A signpost case set up the way the app sets it up: applyChange carries the service's own safety and come-back defaults */
const signpost = (id, extra = {}) => { const st = defaultState('signpost', S); applyChange(st, 'service', id, S); return Object.assign(st, extra); };

test('every service fits the limit with its description and its link switched on', () => {
  for (const svc of SERVICES) {
    const r = compose(signpost(svc.id, { explain: true, plink: true, notes: 'Prefers mornings' }), S);
    assert.equal(r.over, false, `${svc.label} is over the limit: ${r.length} chars`);
    assert.ok(r.text.includes(svc.main.s) || r.text.includes(svc.main.l), `${svc.label}: the main sentence is missing`);
  }
});

test('the local sexual health services name the clinic, and the national option stays for anyone out of area', () => {
  const ae = compose(signpost('alleast', { explain: true }), S).text;
  assert.match(ae, /All East sexual health \(alleast\.nhs\.uk\)/);
  assert.match(ae, /open access, free and confidential, no referral needed/);
  assert.match(ae, /emergency contraception, PrEP and PEP/);

  const hom = compose(signpost('homerton', { explain: true }), S).text;
  assert.match(hom, /Homerton sexual health \(homerton\.nhs\.uk\/sexual-health\)/);
  assert.match(hom, /Clifden Centre, the Ivy Centre and John Scott Health Centre/);

  /* both are open access, so no safety-net by default, and both have a link the team can text */
  for (const id of ['alleast', 'homerton']) {
    assert.equal(signpost(id).safety, false, `${id} should not default to a safety-net line`);
    assert.match(compose(signpost(id, { plink: true }), S).text, new RegExp(`text the patient this NHS link: ${SERVICE(id).link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }

  assert.ok(SERVICE('sexual'), 'the national find-a-clinic option should still exist');
  assert.equal(SERVICE('sexual').group, 'self');
});

test('every who/modality/urgency combination produces a sentence', () => {
  for (const w of WHO) for (const m of MODALITY) for (const u of URGENCY) {
    const st = make('book', { who: w.v, modality: m.v, urgency: u.v });
    const r = compose(st, S);
    assert.ok(r.text.length > 40, `${w.v}/${m.v}/${u.v} produced no body`);
  }
});

test('every preset and every who/modality/urgency combination summarises into chunks that cover the whole message', () => {
  const cases = PRESETS.map(p => make(p.o, p.s));
  for (const w of WHO) for (const m of MODALITY) for (const u of URGENCY) cases.push(make('book', { who: w.v, modality: m.v, urgency: u.v }));
  for (const st of cases) {
    const c = caseChunks(st, S);
    assert.ok(c.length >= 3, 'too few chunks');
    assert.equal(c[0].id, 'outcome'); assert.equal(c[c.length - 1].id, 'notes');
    for (const x of c) {
      assert.ok(x.label && typeof x.value === 'string' && x.value.length, `${x.id}: missing label or value`);
      assert.ok(['single', 'name', 'groups', 'text', 'switches', 'notes'].includes(x.kind), `${x.id}: unknown kind ${x.kind}`);
      if (x.kind === 'single') assert.ok(x.opts.some(o => o.l === x.value) || x.textKey || x.id === 'fb' || x.id === 'photos', `${x.id}: value "${x.value}" is not one of its options`);
    }
    assert.equal(new Set(c.map(x => x.id)).size, c.length, 'duplicate chunk ids');
  }
});

test('the case line only shows what differs from nothing: optional defaults are muted, and the label reads as a sentence', () => {
  const st = make('book', PRESETS[0].s);
  const c = caseChunks(st, S);
  assert.equal(c.find(x => x.id === 'purpose').muted, true);
  assert.equal(c.find(x => x.id === 'notes').muted, true);
  assert.equal(c.find(x => x.id === 'urgency').muted, undefined);
  assert.equal(caseLabel(st, S), 'Book appointment · Any doctor/ANP · Face-to-face · Next soonest slot · Safety-net');
  const day = make('book', { urgency: 'day', day: 'Tuesday' });
  assert.deepEqual(caseChunks(day, S).map(x => x.id).filter(x => ['day', 'dayFb'].includes(x)), ['day', 'dayFb']);
});

test('the Start row shows the primary starts first, grouped Book / Signpost / Other, and can show them all', () => {
  const primary = presetGroups(p => p.primary), all = presetGroups();
  assert.deepEqual(primary.map(g => g.l), ['Book', 'Signpost', 'Other']);
  assert.equal(primary.flatMap(g => g.items).length, PRESETS.filter(p => p.primary).length);
  assert.equal(all.flatMap(g => g.items).length, PRESETS.length);
  assert.equal(primary[0].items[0].v, '0', 'the everyday case is the first start');
});

test('guided asks every non-final chunk as a question, in order, then one final screen', () => {
  const cases = PRESETS.map(p => make(p.o, p.s));
  for (const w of WHO) for (const m of MODALITY) for (const u of URGENCY) cases.push(make('book', { who: w.v, modality: m.v, urgency: u.v }));
  for (const st of cases) {
    const steps = guidedSteps(st, S), chunks = caseChunks(st, S);
    assert.deepEqual(steps.slice(0, -1).map(x => x.id), chunks.filter(c => !FINAL_IDS.includes(c.id)).map(c => c.id));
    for (const x of steps.slice(0, -1)) assert.ok(QUESTIONS[x.id], `${x.id} has no question wording`);
    const last = steps[steps.length - 1];
    assert.equal(last.kind, 'final'); assert.ok(last.chunks.some(c => c.id === 'opts') && last.chunks.some(c => c.id === 'notes'));
    assert.ok(steps.length >= 3 && steps.length <= 12, `${steps.length} screens`);
  }
  assert.equal(guidedSteps(make('book', PRESETS[0].s), S).length, 6, 'the everyday booking is six screens');
});

console.log(`${n} checks passed`);
