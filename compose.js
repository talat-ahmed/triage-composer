/* compose.js - turns a case state plus practice settings into the message text.
   Pure functions only: no DOM, no storage. Runs in the browser and in Node (see test.mjs). */

import { DAYS, DOCTOR_TYPES, REASONS, PHRASE, MOD_VERB, SERVICE, DEFAULT_SETTINGS } from './data.js';

export const names = csv => String(csv || '').split(',').map(s => s.trim()).filter(Boolean);
const orList = a => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} or ${a[a.length - 1]}`);
export const dayOk = d => (DAYS.includes(d) ? d : 'Thursday');
export const tidy = s => { s = String(s || '').trim(); return !s ? '' : (/[.!?]$/.test(s) ? s : `${s}.`); };

/* A fresh case. Defaults depend on the outcome and on practice settings. */
export function defaultState(outcome, S = DEFAULT_SETTINGS) {
  return {
    outcome,
    who: 'anygp', named: '', namedCustom: '', person: '', personCustom: '', reason: 'none', reasonCustom: '',
    modality: 'f2f', urgency: 'soonest', day: dayOk(S.myDay), hub: false,
    purpose: 'none', purposeCustom: '', appResults: false,
    fb: 'self', fbResubmit: false, smsBook: true, mhpCheck: true, photos: 'no',
    safety: ['book', 'contact', 'signpost'].includes(outcome) ? !!S.safetyDefault : false,
    nosms: outcome === 'mine', record: false,
    list: 'PM', upload: true,
    check: 'still', checkCustom: '', then: 'f2f', settled: true,
    service: 'pharmacyfirst', serviceCustom: '', comeback: true, confirm: true, explain: true, plink: false,
    adminType: 'letter', adminCustom: '', adminList: false,
    addList: true, complete: true, patientMsg: '',
    notes: ''
  };
}

/* Side effects of changing one field, so every entry point (panel, guided, presets) behaves the same. */
export function applyChange(st, key, value, S = DEFAULT_SETTINGS) {
  st[key] = value;
  if (key === 'who') {
    Object.assign(st, { person: '', personCustom: '', named: '', namedCustom: '', reason: 'none', purpose: 'none' });
    if (value === 'phleb') { st.hub = true; st.safety = false; }
    if (value === 'pa') { st.modality = 'any'; st.urgency = 'routine'; }
    else if (value === 'mhp') { st.modality = 'tel'; st.urgency = 'routine'; st.smsBook = true; st.nosms = false; st.mhpCheck = true; }
    else if (st.modality === 'any') st.modality = 'f2f';
    if (value === 'pharm' && st.modality === 'f2f' && st.urgency === 'soonest') { st.modality = 'tel'; st.urgency = 'routine'; }
    if (value === 'fcp') { st.modality = 'either'; st.urgency = 'routine'; }
    if (value === 'nurse') { st.modality = 'f2f'; st.urgency = 'routine'; st.safety = false; }
    if (value === 'me' && st.urgency === 'soonest') { st.urgency = 'day'; st.day = dayOk(S.myDay); }
  }
  if (key === 'named') st.namedCustom = '';
  if (key === 'person') st.personCustom = '';
  if (key === 'modality' && value === 'tel' && st.who === 'anygp') st.who = 'anydr';
  if (key === 'service') {
    const svc = SERVICE(value);
    st.safety = !!S.safetyDefault && (svc ? svc.safety : value !== 'nhsapp');
    st.comeback = svc ? svc.comeback : true;
  }
  if (key === 'smsBook' && value) st.nosms = false;
  if (key === 'nosms' && value) st.smsBook = false;
  return st;
}

/* Derived facts about a case */
export const namedName = st => (st.named || st.namedCustom || '').trim();
export const personName = st => (st.person || st.personCustom || '').trim();
export const isDoctor = st => DOCTOR_TYPES.includes(st.who);
/* NHS App self-booking exists only for a face-to-face with a doctor with no special purpose */
export const appAvail = st => isDoctor(st) && st.modality !== 'tel' && st.purpose === 'none';
export const effFb = st => { let f = st.fb || 'self'; if (!appAvail(st) && (f === 'self' || f === 'both')) f = 'next'; return f; };
export const photosAvail = st => isDoctor(st) && st.modality === 'tel';
export const showFb = st => st.who !== 'phleb' && st.modality !== 'tel' && st.urgency !== 'today';
export const showModality = st => st.who !== 'phleb' && st.who !== 'mhp' && !(st.who === 'nurse' && st.purpose === 'travel');
export const showUrgency = st => st.who !== 'mhp';

export function whoPhrase(st, S) {
  const p = personName(st);
  const withRole = role => (p.includes('(') ? `${p}, ${role}` : `${p} (${role})`);
  switch (st.who) {
    case 'anygp':
      if (st.modality === 'tel') return { l: 'any doctor', s: 'any doctor' };
      if (st.modality === 'either') return { l: 'any doctor, or ANP if face-to-face', s: 'any doctor (ANP if F2F)' };
      return { l: 'any doctor/ANP', s: 'any doctor/ANP' };
    case 'anydr': return { l: 'any doctor', s: 'any doctor' };
    case 'me': return { l: 'me', s: 'me' };
    case 'named': { const n = namedName(st) || 'the named clinician'; return { l: n, s: n }; }
    case 'pa': return p ? { l: withRole('PA'), s: withRole('PA') } : { l: 'the physician associate (PA)', s: 'the PA' };
    case 'mhp': return p ? { l: withRole('mental health practitioner'), s: withRole('MHP') } : { l: 'the mental health practitioner', s: 'the MHP' };
    case 'pharm': { if (p) return { l: withRole('practice pharmacist'), s: p }; const n = orList(names(S.pharms)); return { l: n ? `a practice pharmacist (${n})` : 'a practice pharmacist', s: 'a practice pharmacist' }; }
    case 'fcp': return p ? { l: withRole('first contact physiotherapist'), s: p } : { l: 'the first contact physiotherapist', s: 'the FCP' };
    case 'nurse': { if (p) return { l: withRole('practice nurse'), s: p }; const n = names(S.nurses).join('/'); return { l: n ? `the practice nurse (${n})` : 'the practice nurse', s: 'the practice nurse' }; }
    default: return { l: '', s: '' };
  }
}

function purposePhrase(st) {
  if (st.who === 'phleb') return '';
  switch (st.purpose) {
    case 'smear': return ' for a smear test';
    case 'results': return ' to discuss their test results';
    case 'medreview': return ' for a medication review';
    case 'followup': return ' for a follow-up';
    case 'other': return st.purposeCustom.trim() ? ` for ${st.purposeCustom.trim()}` : '';
    default: return '';
  }
}

function reasonSentence(st) {
  const target = st.who === 'me' ? 'me' : (namedName(st) || 'them');
  if (st.reason === 'custom') return st.reasonCustom.trim() ? `Please explain it is best to see ${target} - ${tidy(st.reasonCustom)}` : '';
  const r = REASONS[st.reason];
  return r ? `Please explain it is best to see ${target} as ${st.who === 'me' ? r.me : r.them}.` : '';
}

/* Sentence fragments in order. Each has a long and a short form and a priority: lower priority is shortened first. */
export function fragments(st, S) {
  const f = [];
  const add = (l, s, p = 5) => { if (l) f.push({ l, s: s || l, p }); };
  const day = dayOk(st.day);

  if (st.outcome === 'book') {
    const who = whoPhrase(st, S), verb = MOD_VERB[st.modality], purpose = purposePhrase(st);
    const tel = st.modality === 'tel';
    if (st.who === 'phleb') {
      const tail = st.urgency === 'today' ? ' today (urgent)' : st.urgency === 'soonest' ? ' as soon as possible' : st.urgency === 'day' ? ` on ${day}` : '';
      add(`Please call the patient to help them book a blood test (phlebotomy) appointment${tail}.`, `Please call the patient to book a blood test (phlebotomy)${tail}.`);
      if (st.hub) add('Please use the hub for this if available.', 'Use the hub if available.', 3);
    } else if (st.who === 'mhp') {
      const mday = (S.mhpDay || '').trim(), area = (S.mhpArea || '').trim();
      add(`Please book a telephone consultation with ${who.l} in the next available ${mday ? `${mday} ` : ''}clinic.`, `Please book a telephone consult with ${who.s} in the next ${mday ? `${mday} ` : ''}clinic.`);
      if (st.mhpCheck && area) add(`Please check first that the patient's registered address is in ${area} - the service is only for ${area} residents; if it is not, please let me know and I will re-triage.`, `Check the registered address is in ${area} (${area} residents only); if not, let me know.`, 4);
      if (st.smsBook) add(PHRASE.smsBook.l, PHRASE.smsBook.s, 3);
    } else if (st.who === 'nurse' && st.purpose === 'travel') {
      const tail = { today: 'today', soonest: 'as soon as possible', routine: 'when next available', day: `on ${day}` }[st.urgency];
      add(`Please book the patient into the travel clinic ${tail}.`);
      if (st.urgency === 'day') add(`If they cannot make this ${day}, please offer the following week.`, `If not this ${day}, the following week.`, 4);
      if (st.hub) add('Hub slots can also be used if available.', 'Hub OK if available.', 1);
    } else {
      switch (st.urgency) {
        case 'today':
          add(`${verb.l}${purpose} with ${who.l} today - clinically urgent, same day please.`, `${verb.s}${purpose} with ${who.s} today - clinically urgent.`);
          add(tel ? 'If no telephone slot is available today, please message me straight away.' : 'If nothing is available today, or they cannot attend today, please message me straight away.',
            tel ? 'No slot today: message me straight away.' : 'No slot today or cannot attend: message me straight away.', 4);
          break;
        case 'soonest':
          add(`${verb.l}${purpose} ASAP with ${who.l} - next soonest slot please, so we do not waste access.`, `${verb.s}${purpose} ASAP with ${who.s} - next soonest slot please.`);
          break;
        case 'routine':
          add(`${verb.l}${purpose} with ${who.l} when next available.`, `${verb.s}${purpose} with ${who.s} when next available.`);
          break;
        case 'day':
          add(`${verb.l}${purpose} with ${who.l} on ${day} (earliest appointment).`, `${verb.s}${purpose} with ${who.s} on ${day}.`);
          add(tel ? `If there is no slot this ${day}, please book the following week.` : `If they cannot make this ${day}, please offer the following week.`, `If not this ${day}, the following week.`, 4);
          break;
        default:
      }
      if ((st.who === 'me' || st.who === 'named') && st.reason !== 'none') add(reasonSentence(st), null, 3);
      if (st.purpose === 'results' && st.appResults) add('Please let the patient know the results can be viewed in the NHS App before the call.', 'Results are viewable in the NHS App before the call.', 2);
      if (photosAvail(st) && st.photos === 'yes') add(PHRASE.photos.l, PHRASE.photos.s, 4);
      if (st.hub) add('Hub slots can also be used if available.', 'Hub OK if available.', 1);
      if (tel) {
        if (st.smsBook) add(PHRASE.smsBook.l, PHRASE.smsBook.s, 3);
      } else if (st.urgency !== 'today') {
        const fb = effFb(st);
        if (fb === 'self' || fb === 'both') add(`If they cannot attend the slot offered, please encourage them to self-book a suitable appointment via the NHS App or online${fb === 'both' ? ', or book the next suitable slot for them' : ''}.`, `If unable to attend, please help them self-book via the NHS App/online${fb === 'both' ? ' or book the next suitable slot' : ''}.`, 3);
        else if (fb === 'next') add('If they cannot attend the slot offered, please book the next suitable slot for them.', 'If unable to attend, book the next suitable slot.', 3);
        if (st.fbResubmit) add('They are also welcome to send a new online request if their needs change.', 'New online request welcome if needs change.', 1);
      }
    }
    if (st.safety) {
      if (st.who === 'mhp') add(`Please ${st.smsBook ? 'include in the text' : 'advise the patient'}: if things get worse before the call, contact us again the same day or call 111 and choose option 2 for mental health (999 in an emergency).`, 'Safety-net: if worse before the call, contact us same day or call 111 option 2 (999 if emergency).', 2);
      else if (tel && st.who !== 'phleb' && st.smsBook) add(PHRASE.safetyTelText.l, PHRASE.safetyTelText.s, 2);
      else if (tel && st.who !== 'phleb') add(PHRASE.safetyTel.l, PHRASE.safetyTel.s, 2);
      else add(PHRASE.safety.l, PHRASE.safety.s, 2);
    }
    if (st.nosms) add(PHRASE.nosms.l, PHRASE.nosms.s, 2);
    if (st.record) add(PHRASE.record.l, PHRASE.record.s, 1);
  }

  else if (st.outcome === 'mine') {
    const slot = (S.slot || '').trim() || 'Tel Triage KLINIK DR TO BOOK ONLY';
    add(`On my ${st.list} list on EMIS, please book this case into one of the blue '${slot}' slots.`, `Please book into one of my blue '${slot}' slots (${st.list} list on EMIS).`);
    if (st.upload) add('Make sure it is also uploaded on the morning list as usual.', 'Also upload to the morning list as usual.', 3);
    if (st.nosms) add(PHRASE.nosms.l, PHRASE.nosms.s, 4);
    if (st.record) add(PHRASE.record.l, PHRASE.record.s, 1);
  }

  else if (st.outcome === 'contact') {
    const custom = st.check === 'custom';
    if (custom) add(`Please contact the patient and ask: ${tidy(st.checkCustom) || '[your question].'}`);
    else add('Please contact the patient and check whether they still have this problem.', 'Please contact the patient: do they still have this problem?');
    const cond = custom ? 'If the problem is ongoing' : 'If they do';
    if (st.then === 'f2f') {
      add(`${cond}, please offer a face-to-face review ASAP with the next available GP/ANP.`, `${cond}, offer F2F ASAP with the next available GP/ANP.`, 4);
      add('If they cannot attend today, please help them self-book the next suitable slot via the NHS App or online.', 'If unable to attend today, help them self-book the next suitable slot.', 3);
    } else if (st.then === 'tel') {
      add(`${cond}, please book a telephone consultation ASAP with the next available doctor and text them the date they will receive the call.`, `${cond}, book a telephone consult ASAP with the next available doctor and text them the date of the call.`, 4);
    } else if (st.then === 'me') {
      add(`${cond}, please book them in with me at the earliest slot.`, null, 4);
    } else {
      add('Please add their answer to the case and send it back to me.', 'Add their answer to the case and send back to me.', 4);
    }
    if (st.then !== 'report' && st.settled) add('If it has settled, please complete the case.', 'If settled, complete the case.', 2);
    if (st.safety) add(PHRASE.safety.l, PHRASE.safety.s, 2);
    if (st.nosms) add(PHRASE.nosms.l, PHRASE.nosms.s, 2);
    if (st.record) add(PHRASE.record.l, PHRASE.record.s, 1);
  }

  else if (st.outcome === 'signpost') {
    const sv = st.service, svc = SERVICE(sv);
    if (svc) {
      add(svc.main.l, svc.main.s);
      if (st.explain) add(svc.covers.l, svc.covers.s, 3);
    } else if (sv === 'nhsapp') {
      add('Please show the patient how to book an appointment via the NHS App, or talk them through it while on the phone - explain it is the easiest way to book.', 'Please talk the patient through booking via the NHS App - the easiest way to book.');
    } else {
      add(`Please signpost the patient to ${st.serviceCustom.trim() || '[service]'}.`);
    }
    if (sv === 'nhsapp') {
      if (st.confirm) add('Please make sure they have secured a suitable slot before ending the call.', 'Check they have a slot booked before ending the call.', 4);
    } else if (st.comeback) {
      add('Please explain that if they do not get help there, they should contact us again.', 'If no help there, they should contact us again.', 4);
    }
    if (st.safety) add(PHRASE.safetySignpost.l, PHRASE.safetySignpost.s, 2);
    if (st.record) add(PHRASE.record.l, PHRASE.record.s, 1);
    if (st.plink && svc && svc.link) add(`Please text the patient this NHS link: ${svc.link}`, null, 1);
  }

  else if (st.outcome === 'admin') {
    if (st.adminType === 'letter') {
      add('This is a private letter request. Please contact the patient and explain the procedure and fees for private letters.', 'Private letter request: please contact the patient and explain the procedure and fees.');
      if (st.adminList) add('Once agreed, please add it to my admin list.', 'Then add to my admin list.', 3);
    } else {
      add(tidy(st.adminCustom) || 'Please [describe the request].');
    }
    if (st.record) add(PHRASE.record.l, PHRASE.record.s, 1);
  }

  else if (st.outcome === 'done') {
    add('I have dealt with this case.');
    if (st.addList && st.complete) add('Please put it on my EMIS list (if not already done) and complete the case.', 'Please add to my EMIS list (if not already) and complete the case.', 4);
    else if (st.addList) add('Please put it on my EMIS list (if not already done).', 'Please add to my EMIS list (if not already).', 4);
    else if (st.complete) add('Please complete the case.', null, 4);
    const pm = st.patientMsg.trim();
    if (pm) add(`Please text the patient: "${pm}"`, null, 3);
    else if (st.nosms) add('No text message to the patient is needed.', 'No text to patient needed.', 2);
  }
  return f;
}

/* Assemble the message; shorten least-important sentences first until it fits the Klinik limit. */
export function compose(st, S = DEFAULT_SETTINGS) {
  const f = fragments(st, S);
  const name = (S.name || '').trim();
  const sep = S.breaks ? '\n' : ' ';
  const greet = 'Hi Team,';
  const sign = name ? `Thanks, ${name}` : 'Thanks';
  const notes = st.notes.trim() ? `${sep}Booking notes: ${tidy(st.notes)}` : '';
  const short = new Set();
  const render = () => `${greet}${sep}${f.map((x, i) => (short.has(i) ? x.s : x.l)).join(' ')}${notes}${sep}${sign}`;
  const limit = +S.limit || 500;
  let text = render(), compacted = false;
  if (text.length > limit) {
    const order = f.map((x, i) => i).sort((a, b) => f[a].p - f[b].p);
    for (const i of order) {
      if (text.length <= limit) break;
      if (f[i].s !== f[i].l) { short.add(i); compacted = true; text = render(); }
    }
  }
  return { text, compacted, over: text.length > limit, limit, length: text.length };
}
