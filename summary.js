/* summary.js - the case as a list of editable chunks: one per decision the message depends on.
   Pure: state + settings -> descriptors. No DOM, so it runs in Node for tests and app.js only renders it. */

import {
  OUTCOMES, DAYS, WHO, PERSON_TYPES, ANY_LABEL, MODALITY, URGENCY, REASON_OPTS, PURPOSE_NURSE, PURPOSE_OTHER,
  PHOTO_OPTS, FB_APP, FB_NOAPP, LIST_OPTS, CHECK_OPTS, THEN_OPTS, ADMIN_OPTS, TEXT_FOR, TOGGLES, FB_SHORT,
  SERVICES, SERVICE_GROUPS, SERVICE, DAYFB, PRESETS
} from './data.js';
import {
  names, orList, dayOk, namedName, personName, appAvail, effFb, photosAvail, showFb, showModality, showUrgency,
  restOfWeek, todayStatus, effDayFb, showCapacity
} from './compose.js';

export const labelOf = (opts, v) => (opts.find(o => o.v === v) || {}).l || '';
const onLabels = (st, list) => { const on = list.filter(t => st[t.k]).map(t => t.s || t.l); return on.length ? on.join(' · ') : 'None'; };

/* Everything the renderer needs to know about the current state, in one place */
export function defs(st, S) {
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

/* The chunks, in the order they read as a sentence. Each has:
   id, label (what it is), value (current answer as text), kind (which editor), key (state field),
   and per kind: opts / textKey / ph / hint / roster / anyLabel / groups / togs.
   muted: true marks an optional chunk still at its default, so the line can de-emphasise it. */
export function caseChunks(st, S) {
  const d = defs(st, S); const c = [];
  const o = OUTCOMES.find(x => x.id === st.outcome);
  c.push({ id: 'outcome', label: 'Outcome', value: o.label, kind: 'single', key: 'outcome', opts: OUTCOMES.map(x => ({ v: x.id, l: x.label })), hint: `Contract response: ${o.rtype}` });
  if (st.outcome === 'book') {
    c.push({ id: 'who', label: 'Who', value: labelOf(WHO, st.who), kind: 'single', key: 'who', opts: WHO, hint: d.whoHint });
    if (st.who === 'named') c.push({ id: 'named', label: 'Name', value: namedName(st) || 'Not named yet', kind: 'name', key: 'named', roster: d.gpRoster, anyLabel: '', textKey: 'namedCustom', ph: 'e.g. Dr Patel or Sam (ANP)', textLabel: 'Doctor or ANP', muted: !namedName(st) });
    if (d.hasPerson) c.push({ id: 'person', label: 'Name', value: personName(st) || d.anyLabel, kind: 'name', key: 'person', roster: d.personRoster, anyLabel: d.anyLabel, textKey: 'personCustom', ph: 'e.g. a locum', textLabel: 'A specific person (optional)', muted: !personName(st) });
    if (st.who === 'me' || st.who === 'named') c.push({ id: 'reason', label: 'Why them', value: st.reason === 'custom' ? (st.reasonCustom.trim() || 'Other') : labelOf(REASON_OPTS, st.reason), kind: 'single', key: 'reason', opts: REASON_OPTS, textKey: 'reasonCustom', ph: 'e.g. they saw the patient last week', textLabel: 'Reason, told to the patient', hint: 'Told to the patient', muted: st.reason === 'none' });
    if (d.purposeOpts) c.push({ id: 'purpose', label: 'For', value: st.purpose === 'other' ? (st.purposeCustom.trim() || 'Other') : labelOf(d.purposeOpts, st.purpose), kind: 'single', key: 'purpose', opts: d.purposeOpts, textKey: 'purposeCustom', ph: d.purposePh, textLabel: 'What the appointment is for', muted: st.purpose === 'none' });
    if (d.showModality) c.push({ id: 'modality', label: 'Type', value: labelOf(MODALITY, st.modality), kind: 'single', key: 'modality', opts: MODALITY });
    if (d.showPhotos) c.push({ id: 'photos', label: 'Photos', value: st.photos === 'yes' ? 'Ask for photos' : 'No photos', kind: 'single', key: 'photos', opts: PHOTO_OPTS, hint: 'Requested before the call', muted: st.photos !== 'yes' });
    if (d.showUrgency) c.push({ id: 'urgency', label: 'When', value: labelOf(URGENCY, st.urgency), kind: 'single', key: 'urgency', opts: URGENCY, hint: d.optHint });
    if (d.showUrgency && st.urgency === 'day') c.push({ id: 'day', label: 'Day', value: dayOk(st.day), kind: 'single', key: 'day', opts: DAYS.map(x => ({ v: x, l: x })) });
    if (d.showUrgency && st.urgency === 'day') c.push({ id: 'dayFb', label: 'If not that day', value: labelOf(d.dayFbOpts, effDayFb(st)), kind: 'single', key: 'dayFb', opts: d.dayFbOpts, hint: d.dayFbHint });
    if (d.showFb) c.push({ id: 'fb', label: 'Fallback', value: FB_SHORT[effFb(st)], kind: 'single', key: 'fb', opts: d.fbOpts, hint: d.fbHint });
    c.push({ id: 'opts', label: 'Also', value: onLabels(st, d.bookToggles), kind: 'switches', togs: d.bookToggles, hint: d.optHint, muted: onLabels(st, d.bookToggles) === 'None' });
  } else if (st.outcome === 'mine') {
    c.push({ id: 'list', label: 'List', value: labelOf(LIST_OPTS, st.list), kind: 'single', key: 'list', opts: LIST_OPTS, hint: d.listHint });
    c.push({ id: 'opts', label: 'Also', value: onLabels(st, d.mineToggles), kind: 'switches', togs: d.mineToggles, muted: onLabels(st, d.mineToggles) === 'None' });
  } else if (st.outcome === 'contact') {
    c.push({ id: 'check', label: 'Ask', value: st.check === 'custom' ? (st.checkCustom.trim() || 'A specific question') : labelOf(CHECK_OPTS, st.check), kind: 'single', key: 'check', opts: CHECK_OPTS, textKey: 'checkCustom', ph: 'e.g. which side is the pain on, and any fever?', textLabel: 'The question for the team to ask' });
    c.push({ id: 'then', label: 'If ongoing', value: labelOf(THEN_OPTS, st.then), kind: 'single', key: 'then', opts: THEN_OPTS });
    c.push({ id: 'opts', label: 'Also', value: onLabels(st, d.contactToggles), kind: 'switches', togs: d.contactToggles, muted: onLabels(st, d.contactToggles) === 'None' });
  } else if (st.outcome === 'signpost') {
    const all = d.serviceGroups.flatMap(g => g.opts);
    c.push({ id: 'service', label: 'Service', value: st.service === 'other' ? (st.serviceCustom.trim() || 'Other service') : labelOf(all, st.service), kind: 'groups', key: 'service', groups: d.serviceGroups, textKey: 'serviceCustom', ph: 'e.g. the community mental health team', textLabel: 'Which service' });
    c.push({ id: 'opts', label: 'Also', value: onLabels(st, d.signpostToggles), kind: 'switches', togs: d.signpostToggles, muted: onLabels(st, d.signpostToggles) === 'None' });
  } else if (st.outcome === 'admin') {
    c.push({ id: 'adminType', label: 'Request', value: st.adminType === 'other' ? (st.adminCustom.trim() || 'Other') : labelOf(ADMIN_OPTS, st.adminType), kind: 'single', key: 'adminType', opts: ADMIN_OPTS, textKey: 'adminCustom', ph: 'e.g. Please contact the patient to confirm which pharmacy they use', textLabel: 'What the team should do' });
    c.push({ id: 'opts', label: 'Also', value: onLabels(st, d.adminToggles), kind: 'switches', togs: d.adminToggles, muted: onLabels(st, d.adminToggles) === 'None' });
  } else if (st.outcome === 'done') {
    c.push({ id: 'opts', label: 'Also', value: onLabels(st, d.doneToggles), kind: 'switches', togs: d.doneToggles, muted: onLabels(st, d.doneToggles) === 'None' });
    c.push({ id: 'patientMsg', label: 'Text for patient', value: st.patientMsg.trim() || 'None', kind: 'text', key: 'patientMsg', ph: 'Words for the team to text the patient', textLabel: 'Text for the patient (optional)', muted: !st.patientMsg.trim() });
  }
  c.push({ id: 'notes', label: 'Notes', value: st.notes.trim() || 'None', kind: 'notes', key: 'notes', muted: !st.notes.trim() });
  return c;
}

/* Which value of a chunk needs a free-text follow-up */
export const customFor = key => TEXT_FOR[key];

/* One-line description of a case, for the Recent row and for announcements */
export function caseLabel(st, S) {
  return caseChunks(st, S).filter(x => !x.muted && x.id !== 'notes' && x.id !== 'fb').map(x => x.value).join(' · ');
}

/* Preset grouping for the Start row */
export const PRESET_GROUP = p => (p.o === 'book' ? 'Book' : p.o === 'signpost' ? 'Signpost' : 'Other');
export const presetGroups = (only) => {
  const groups = ['Book', 'Signpost', 'Other'].map(l => ({ l, items: [] }));
  PRESETS.forEach((p, i) => { if (!only || only(p)) groups.find(x => x.l === PRESET_GROUP(p)).items.push({ v: String(i), l: p.l }); });
  return groups.filter(g => g.items.length);
};
