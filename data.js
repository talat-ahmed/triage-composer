/* data.js - static content: outcomes, clinician types, national services, presets, phrase tables.
   Everything a practice might want to change lives here; no rendering logic. */

export const OUTCOMES = [
  { id: 'book', label: 'Book appointment', rtype: 'Appointment' },
  { id: 'mine', label: 'My triage slots', rtype: 'Appointment (with me)' },
  { id: 'contact', label: 'Contact & check', rtype: 'Request further information' },
  { id: 'signpost', label: 'Signpost', rtype: 'Direct to an appropriate service' },
  { id: 'admin', label: 'Admin request', rtype: 'Care by another method' },
  { id: 'done', label: 'Dealt with', rtype: 'Care by another method' }
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/* Today's capacity note: a fact about the day, not the case. Set once, rides on every message, clears when the date changes.
   No clinician is ever named - a colleague's sickness is their own health information. */
export const CAPACITY = [
  { v: 'sick', l: 'A doctor off sick', p: { l: 'we have had a doctor call in sick, so we are short staffed today', s: 'we are short staffed today (doctor off sick)' } },
  { v: 'short', l: 'Short staffed today', p: { l: 'we are short staffed today', s: 'we are short staffed today' } },
  { v: 'demand', l: 'Unusually high demand', p: { l: 'we are dealing with unusually high demand today', s: 'demand is unusually high today' } },
  { v: 'clinic', l: 'A clinic cancelled', p: { l: 'one of our clinics has had to be cancelled today', s: 'a clinic was cancelled today' } },
  { v: 'custom', l: 'Other' }
];
/* Outcomes where telling the patient about capacity makes sense */
export const CAPACITY_OUTCOMES = ['book', 'contact', 'signpost'];

/* When a specific day is booked, what the team offers if the patient cannot make it */
export const DAYFB = [{ v: 'week', l: 'Rest of this week' }, { v: 'next', l: 'The following week' }];

export const WHO = [
  { v: 'anygp', l: 'Any doctor/ANP' },
  { v: 'anydr', l: 'Any doctor' },
  { v: 'me', l: 'Me' },
  { v: 'named', l: 'Named doctor/ANP' },
  { v: 'pa', l: 'Physician associate (PA)' },
  { v: 'mhp', l: 'Mental health practitioner' },
  { v: 'pharm', l: 'Pharmacist' },
  { v: 'fcp', l: 'Physio (FCP)' },
  { v: 'nurse', l: 'Practice nurse' },
  { v: 'phleb', l: 'Phlebotomy' }
];
/* Clinician types that can be booked on the NHS App (face-to-face), get a photos question (telephone), and whose phone consults are doctor-only */
export const DOCTOR_TYPES = ['anygp', 'anydr', 'me', 'named'];
export const PERSON_TYPES = { pharm: 'pharms', fcp: 'physios', nurse: 'nurses', pa: 'pas', mhp: 'mhps' };
export const ANY_LABEL = { pharm: 'Any pharmacist', fcp: 'Any physio', nurse: 'Any nurse', pa: 'Any PA', mhp: 'The MHP' };

export const MODALITY = [
  { v: 'f2f', l: 'Face-to-face' },
  { v: 'tel', l: 'Telephone' },
  { v: 'either', l: 'Either, first available' },
  { v: 'any', l: 'Not specified' }
];
export const URGENCY = [
  { v: 'today', l: 'Today (clinically urgent)', tone: 'crit' },
  { v: 'soonest', l: 'Next soonest slot', tone: 'warn' },
  { v: 'routine', l: 'When next available', tone: 'ok' },
  { v: 'day', l: 'Specific day' }
];
export const REASON_OPTS = [
  { v: 'none', l: 'No reason given' }, { v: 'skin', l: 'Extra training in skin' }, { v: 'continuity', l: 'Continuity' },
  { v: 'reviewing', l: 'Already reviewing' }, { v: 'custom', l: 'Other' }
];
export const PURPOSE_NURSE = [{ v: 'none', l: 'Not specified' }, { v: 'smear', l: 'Smear test' }, { v: 'travel', l: 'Travel clinic' }, { v: 'other', l: 'Other' }];
export const PURPOSE_OTHER = [{ v: 'none', l: 'Not specified' }, { v: 'results', l: 'Test results' }, { v: 'medreview', l: 'Medication review' }, { v: 'followup', l: 'Follow-up' }, { v: 'other', l: 'Other' }];
export const PHOTO_OPTS = [{ v: 'no', l: 'No photos needed' }, { v: 'yes', l: 'Yes, ask the patient to send photos' }];
export const FB_APP = [{ v: 'self', l: 'Self-book on the NHS App' }, { v: 'next', l: 'Team books the next suitable slot' }, { v: 'both', l: 'Either' }, { v: 'none', l: 'Say nothing' }];
export const FB_NOAPP = [{ v: 'next', l: 'Team books the next suitable slot' }, { v: 'none', l: 'Say nothing' }];
export const LIST_OPTS = [{ v: 'AM', l: 'AM list' }, { v: 'PM', l: 'PM list' }];
export const CHECK_OPTS = [{ v: 'still', l: 'Do they still have the problem?' }, { v: 'custom', l: 'A specific question' }];
export const THEN_OPTS = [{ v: 'f2f', l: 'F2F ASAP, next available GP/ANP' }, { v: 'tel', l: 'Telephone ASAP, next available doctor' }, { v: 'me', l: 'Book with me' }, { v: 'report', l: 'Just send the answer back to me' }];
export const ADMIN_OPTS = [{ v: 'letter', l: 'Private letter or report' }, { v: 'other', l: 'Other' }];
/* Keys whose chosen value needs a free-text follow-up */
export const TEXT_FOR = { reason: 'custom', purpose: 'other', check: 'custom', service: 'other', adminType: 'other' };

export const REASONS = {
  skin: { me: 'I have extra training in skin problems', them: 'they have extra training in skin problems' },
  continuity: { me: 'I know the background, which keeps continuity', them: 'they know the background, which keeps continuity' },
  reviewing: { me: 'I am already reviewing this', them: 'they are already reviewing this' }
};

/* Toggle labels: full (panel switches), chip (guided), short (summary pills) */
export const TOGGLES = {
  hub: { l: 'Hub slots can be used', c: 'Hub slots OK', s: 'Hub' },
  hubPhleb: { k: 'hub', l: 'Use the hub if available', c: 'Use the hub if available', s: 'Hub' },
  mhpCheck: { l: 'Check registered address is in the eligible area', c: 'Check registered address', s: 'Address check' },
  appResults: { l: 'Tell patient results are viewable in the NHS App', c: 'Results viewable in NHS App', s: 'NHS App results' },
  smsBook: { l: 'Book it and text the patient the date of the call (no phone call first)', c: 'Book it and text the date (no call first)', s: 'Book & text date' },
  fbResubmit: { l: 'New online request welcome if needs change', c: 'New online request welcome', s: 'New request OK' },
  safety: { l: 'Safety-net line for patient', c: 'Safety-net line for patient', s: 'Safety-net' },
  nosms: { l: 'No text message to patient', c: 'No text to patient', s: 'No text' },
  record: { l: 'Record outcome on EMIS', c: 'Record on EMIS', s: 'Record on EMIS' },
  upload: { l: 'Also upload to the morning list', c: 'Also upload to morning list', s: 'Morning list' },
  settled: { l: 'Complete the case if it has settled', c: 'Complete the case if settled', s: 'Complete if settled' },
  confirm: { l: 'Confirm a slot is secured before ending the call', c: 'Confirm a slot is secured', s: 'Confirm slot' },
  comeback: { l: 'Contact us again if it does not help', c: 'Come back to us if no help', s: 'Come back if no help' },
  explain: { l: 'Say what the service covers', c: 'Say what the service covers', s: 'Explain service' },
  plink: { l: 'Ask the team to text the NHS link', c: 'Text the patient the NHS link', s: 'Text NHS link' },
  adminList: { l: 'Add to my admin list once agreed', c: 'Add to my admin list', s: 'Admin list' },
  addList: { l: 'Put it on my EMIS list', c: 'Put on my EMIS list', s: 'EMIS list' },
  complete: { l: 'Complete the case', c: 'Complete the case', s: 'Complete case' },
  nosmsDone: { k: 'nosms', l: 'No text to patient needed', c: 'No text to patient needed', s: 'No text' },
  capacity: { l: "Team can explain today's capacity to the patient", c: "Explain today's capacity", s: 'Capacity note' }
};
export const FB_SHORT = { self: 'Self-book fallback', next: 'Next-slot fallback', both: 'Self-book or next slot', none: 'No fallback' };

export const PHRASE = {
  safety: { l: 'Please advise the patient: if things get worse before they are seen, contact us again the same day or call 111 (999 in an emergency).', s: 'Safety-net: if worse before seen, contact us same day or call 111 (999 if emergency).' },
  safetyTelText: { l: 'Please include in the text: if things get worse before the call, contact us again the same day or call 111 (999 in an emergency).', s: 'Text should include: if worse before the call, contact us same day or call 111 (999 if emergency).' },
  safetyTel: { l: 'Please advise the patient: if things get worse before the call, contact us again the same day or call 111 (999 in an emergency).', s: 'Safety-net: if worse before the call, contact us same day or call 111 (999 if emergency).' },
  safetySignpost: { l: 'If symptoms get worse, they should contact us again the same day or call 111 (999 in an emergency).', s: 'If worse: contact us same day or call 111 (999 if emergency).' },
  nosms: { l: 'Please do not send a text message to the patient.', s: 'No text to patient please.' },
  record: { l: 'Please record the outcome on EMIS.', s: 'Record on EMIS.' },
  smsBook: { l: 'Please just book it and text the patient the date they will receive the call - no need to phone them first.', s: 'Book it and text the patient the date of the call - no need to phone first.' },
  photos: { l: 'Please ask the patient to send in photos of the problem before the call.', s: 'Ask the patient to send photos before the call.' }
};
export const MOD_VERB = {
  f2f: { l: 'Please book a face-to-face appointment', s: 'Please book a face-to-face appt' },
  tel: { l: 'Please book a telephone consultation', s: 'Please book a telephone consult' },
  either: { l: 'Please book the next available slot (face-to-face or telephone)', s: 'Please book the next available slot (F2F or phone)' },
  any: { l: 'Please book the patient in', s: 'Please book' }
};

export const DEFAULT_SETTINGS = {
  name: '', limit: 500, safetyDefault: true, breaks: true,
  today: { on: false, reason: 'sick', custom: '', date: '' },
  moreStarts: false,                    /* whether the full Start row is expanded */
  recent: [],                           /* last few customised cases copied on this device: [{ l, o, s }] */
  gps: '', pas: '', pharms: '', physios: '', nurses: '', mhps: '', mhpDay: 'Tuesday', mhpArea: 'Tower Hamlets',
  slot: 'Tel Triage KLINIK DR TO BOOK ONLY', myDay: 'Thursday',
  noteShortcuts: 'Take history and feedback to duty doctor | No need to call the patient - can send SMS after finding out the information'
};

/* primary: shown in the Start row before "More"; the rest appear when it is expanded. Order within a group is the display order. */
export const PRESETS = [
  { l: 'F2F ASAP · any GP/ANP', o: 'book', primary: true, s: { who: 'anygp', modality: 'f2f', urgency: 'soonest' } },
  { l: 'F2F ASAP · hub too', o: 'book', s: { who: 'anygp', modality: 'f2f', urgency: 'soonest', hub: true } },
  { l: 'Same day · urgent', primary: true, o: 'book', s: { who: 'anygp', modality: 'f2f', urgency: 'today' } },
  { l: 'Tel · any doctor · next available', primary: true, o: 'book', s: { who: 'anydr', modality: 'tel', urgency: 'routine' } },
  { l: 'Results · tel any doctor', o: 'book', s: { who: 'anydr', modality: 'tel', urgency: 'routine', purpose: 'results', safety: false } },
  { l: 'Pharmacist · tel', o: 'book', s: { who: 'pharm', modality: 'tel', urgency: 'routine' } },
  { l: 'Physio (FCP) · first available', o: 'book', s: { who: 'fcp', modality: 'either', urgency: 'routine' } },
  { l: 'PA · next available', o: 'book', s: { who: 'pa', modality: 'any', urgency: 'routine' } },
  { l: 'Mental health practitioner · tel', o: 'book', s: { who: 'mhp', modality: 'tel', urgency: 'routine' } },
  { l: 'See me · clinic day · skin', primary: true, o: 'book', s: { who: 'me', modality: 'f2f', urgency: 'day', reason: 'skin' } },
  { l: 'My triage slots (PM)', primary: true, o: 'mine', s: { list: 'PM' } },
  { l: 'Contact & re-check', primary: true, o: 'contact', s: {} },
  { l: 'Pharmacy First', primary: true, o: 'signpost', s: { service: 'pharmacyfirst' } },
  { l: 'Contraception · pharmacy', o: 'signpost', s: { service: 'pcs', safety: false } },
  { l: 'Talking Therapies', o: 'signpost', s: { service: 'talking' } },
  { l: '111 option 2 · mental health', o: 'signpost', s: { service: 'mh111', safety: false, comeback: false } },
  { l: 'MECS (eye)', o: 'signpost', s: { service: 'mecs' } },
  { l: 'NHS App self-book', o: 'signpost', s: { service: 'nhsapp', safety: false } },
  { l: 'Bloods · hub', o: 'book', s: { who: 'phleb', urgency: 'routine', hub: true, safety: false } },
  { l: 'Smear · nurse', o: 'book', s: { who: 'nurse', modality: 'f2f', urgency: 'routine', purpose: 'smear', safety: false } },
  { l: 'Travel clinic', o: 'book', s: { who: 'nurse', modality: 'f2f', urgency: 'routine', purpose: 'travel', safety: false } },
  { l: 'Private letter', o: 'admin', s: { adminType: 'letter' } },
  { l: 'Dealt with · complete', primary: true, o: 'done', s: {} }
];

/* National (England-wide) services a practice can signpost to. group: pharm | self | urgent | screen | life | local */
export const SERVICES = [
  {id:'pharmacyfirst', group:'pharm', label:'Pharmacy First', safety:true, comeback:true,
    main:{l:'Please direct the patient to Pharmacy First at a community pharmacy.', s:'Please direct the patient to Pharmacy First.'},
    covers:{l:'It covers earache (age 1-17), impetigo, infected insect bites, shingles (18+), sinusitis (12+), sore throat (5+) and uncomplicated UTI in women 16-64 - the pharmacist can assess and supply treatment if needed.', s:'Covers earache, impetigo, insect bites, shingles, sinusitis, sore throat and UTI (women 16-64).'},
    link:'https://www.nhs.uk/nhs-services/pharmacies/how-pharmacies-can-help/'},
  {id:'pcs', group:'pharm', label:'Contraception (pharmacy)', safety:false, comeback:true,
    main:{l:'Please direct the patient to the NHS Pharmacy Contraception Service at a community pharmacy.', s:'Please direct the patient to the pharmacy contraception service.'},
    covers:{l:'Pharmacies can start or continue the contraceptive pill and supply free emergency contraception - no appointment with us is needed.', s:'Pharmacies can start/continue the pill and give free emergency contraception.'},
    link:'https://www.nhs.uk/nhs-services/pharmacies/how-pharmacies-can-help/'},
  {id:'bp', group:'pharm', label:'Blood pressure check (pharmacy)', safety:false, comeback:true,
    main:{l:'Please direct the patient to a community pharmacy for a free NHS blood pressure check.', s:'Please direct the patient to a pharmacy for a free BP check.'},
    covers:{l:'For adults aged 40+ without a diagnosis of high blood pressure; the pharmacy can also arrange 24-hour monitoring if the reading is raised.', s:'For adults 40+ not known to have high BP; 24-hour monitoring available.'},
    link:'https://www.nhs.uk/nhs-services/pharmacies/how-pharmacies-can-help/'},
  {id:'nms', group:'pharm', label:'New Medicine Service', safety:false, comeback:false,
    main:{l:'Please tell the patient they can ask their pharmacy for the New Medicine Service.', s:'Please tell the patient to ask the pharmacy for the New Medicine Service.'},
    covers:{l:'Up to 3 free pharmacist appointments to help with a newly started medicine, including antidepressants.', s:'Up to 3 free pharmacist appointments for a new medicine.'},
    link:'https://www.nhs.uk/nhs-services/pharmacies/how-pharmacies-can-help/'},
  {id:'vacc', group:'pharm', label:'Flu / COVID / MenB jab', safety:false, comeback:false,
    main:{l:'Please direct the patient to book their vaccination via the NHS App or nhs.uk, or walk in at a participating community pharmacy.', s:'Please direct the patient to book the jab via the NHS App/nhs.uk or a pharmacy.'},
    covers:{l:'Flu and COVID-19 jabs are bookable nationally in season; the one-off MenB programme for 17-18 year olds and new university students runs at pharmacies until March 2027.', s:'Flu/COVID in season; one-off MenB for 17-18s and new students until March 2027.'},
    link:'https://www.nhs.uk/nhs-services/pharmacies/how-pharmacies-can-help/'},
  {id:'supply', group:'urgent', label:'Urgent medicine supply (111)', safety:false, comeback:true,
    main:{l:'Please ask the patient to contact NHS 111 (online or phone) for an urgent supply of their repeat medicine through a pharmacy.', s:'Please ask the patient to use NHS 111 for an urgent pharmacy supply of their medicine.'},
    covers:{l:'111 can refer to Pharmacy First for an emergency supply when a prescription has run out.', s:'111 refers to Pharmacy First for an emergency supply.'},
    link:'https://111.nhs.uk'},
  {id:'talking', group:'self', label:'NHS Talking Therapies', safety:true, comeback:true,
    main:{l:'Please signpost the patient to NHS Talking Therapies - they can self-refer online without a GP referral.', s:'Please signpost the patient to NHS Talking Therapies (self-referral online).'},
    covers:{l:'Free NHS treatment for anxiety, depression, panic, phobias, OCD and PTSD; for adults 18+ (16+ in some areas).', s:'Free NHS help for anxiety, depression, panic, phobias, OCD, PTSD; 18+.'},
    link:'https://www.nhs.uk/nhs-services/mental-health-services/find-nhs-talking-therapies-for-anxiety-and-depression/'},
  {id:'maternity', group:'self', label:'Maternity self-referral', safety:false, comeback:true,
    main:{l:'Please signpost the patient to self-refer to the local maternity service - no GP appointment is needed to start pregnancy care.', s:'Please signpost the patient to self-refer to the local maternity service.'},
    covers:{l:'The self-referral form is on the maternity unit or hospital trust website; they should do this as early as possible.', s:'Self-referral form is on the maternity unit website.'},
    link:'https://www.nhs.uk/pregnancy/finding-out/finding-out-you-are-pregnant/'},
  {id:'sexual', group:'self', label:'Sexual health clinic (any area)', safety:false, comeback:true,
    main:{l:'Please signpost the patient to a sexual health clinic - open access, free and confidential, no referral needed.', s:'Please signpost the patient to a sexual health clinic (open access, free).'},
    covers:{l:'STI testing and treatment, all contraception including coils and implants, emergency contraception, PrEP and PEP.', s:'STI testing, all contraception incl. coils/implants, emergency contraception.'},
    link:'https://www.nhs.uk/nhs-services/sexual-health-services/find-a-sexual-health-clinic/'},
  {id:'nhs111', group:'urgent', label:'NHS 111 (urgent / dental)', safety:false, comeback:false,
    main:{l:'Please advise the patient to use NHS 111 online or call 111 for this.', s:'Please advise the patient to use NHS 111 (online or phone).'},
    covers:{l:'111 assesses urgent problems, can book urgent treatment centre or out-of-hours slots, and arranges urgent dental care for people without a dentist.', s:'111 can book UTC/out-of-hours slots and urgent dental care.'},
    link:'https://111.nhs.uk'},
  {id:'mh111', group:'urgent', label:'111 option 2 (mental health)', safety:false, comeback:false,
    main:{l:'Please advise the patient to call NHS 111 and select the mental health option (option 2) for urgent mental health support.', s:'Please advise the patient to call 111 and choose option 2 (mental health).'},
    covers:{l:'Available 24/7 across England for people of any age in a mental health crisis, and for family members who are worried about someone.', s:'24/7, any age, also for worried family members.'},
    link:'https://111.nhs.uk'},
  {id:'bowel', group:'screen', label:'Bowel screening kit', safety:false, comeback:false,
    main:{l:'Please tell the patient they can request a bowel screening kit themselves by calling the bowel screening helpline on 0800 707 6060.', s:'Please tell the patient to request a bowel screening kit on 0800 707 6060.'},
    covers:{l:'Screening is automatic from 50 to 74 every 2 years; people aged 75+ can ask for a kit every 2 years.', s:'Automatic 50-74; 75+ can ask every 2 years.'},
    link:'https://www.nhs.uk/conditions/bowel-cancer-screening/'},
  {id:'breast', group:'screen', label:'Breast screening (71+)', safety:false, comeback:false,
    main:{l:'Please tell the patient they can arrange breast screening themselves by contacting the local breast screening service.', s:'Please tell the patient to contact the local breast screening service directly.'},
    covers:{l:'Invitations are automatic from 50 up to the 71st birthday; from 71 screening is still available every 3 years on request.', s:'Automatic 50-70; 71+ every 3 years on request.'},
    link:'https://www.nhs.uk/tests-and-treatments/breast-screening-mammogram/who-breast-screening-is-for/'},
  {id:'aaa', group:'screen', label:'AAA screening (men 65+)', safety:false, comeback:false,
    main:{l:'Please tell the patient to contact the local AAA screening service directly to arrange the scan.', s:'Please tell the patient to contact the local AAA screening service.'},
    covers:{l:'Men are invited the year they turn 65; anyone who missed the invitation can ask the service directly.', s:'Men invited at 65; missed invitations can be requested.'},
    link:'https://www.nhs.uk/conditions/abdominal-aortic-aneurysm-screening/'},
  {id:'betterhealth', group:'life', label:'NHS Better Health', safety:false, comeback:false,
    main:{l:'Please signpost the patient to NHS Better Health for free online support.', s:'Please signpost the patient to NHS Better Health (nhs.uk/better-health).'},
    covers:{l:'Free NHS tools to quit smoking, lose weight, get active (Couch to 5K, Active 10) and drink less.', s:'Free quit-smoking, weight-loss, activity and drink-less tools.'},
    link:'https://www.nhs.uk/better-health/'},
  {id:'mecs', group:'local', label:'MECS (eyes, local)', safety:true, comeback:true,
    main:{l:'Please signpost the patient to the Minor Eye Conditions Service (MECS) at a participating optician.', s:'Please signpost the patient to MECS (minor eye conditions) at an optician.'},
    covers:{l:'Free NHS assessment of red, sore, gritty or watery eyes, flashes and floaters, and sudden minor vision changes.', s:'Free NHS assessment of red/sore eyes, flashes and floaters.'},
    link:''},
  {id:'msk', group:'local', label:'Physio self-referral (local)', safety:true, comeback:true,
    main:{l:'Please signpost the patient to self-refer to the local NHS physiotherapy (MSK) service.', s:'Please signpost the patient to self-refer to local NHS physiotherapy.'},
    covers:{l:'Self-referral is available in most areas via the service website; if not available locally, please book with our first contact physiotherapist instead.', s:'Self-refer via the service website, or book our first contact physio.'},
    link:''},
  /* The two sexual health services covering this area. Named because in north east London these are the clinics;
     the national 'Sexual health clinic (any area)' option above stays for patients registered elsewhere. */
  {id:'alleast', group:'local', label:'Sexual health: All East', safety:false, comeback:true,
    main:{l:'Please signpost the patient to All East sexual health (alleast.nhs.uk) - open access, free and confidential, no referral needed.', s:'Please signpost the patient to All East sexual health (alleast.nhs.uk).'},
    covers:{l:'STI testing and treatment, all contraception including coils and implants, emergency contraception, PrEP and PEP. They can book online, call 020 7123 9711, or walk in.', s:'STI testing, contraception, emergency contraception, PrEP. Book online or call 020 7123 9711.'},
    link:'https://www.alleast.nhs.uk'},
  {id:'homerton', group:'local', label:'Sexual health: Homerton', safety:false, comeback:true,
    main:{l:'Please signpost the patient to Homerton sexual health (homerton.nhs.uk/sexual-health) - open access, free and confidential, no referral needed.', s:'Please signpost the patient to Homerton sexual health (homerton.nhs.uk/sexual-health).'},
    covers:{l:'STI testing and treatment, all contraception including coils and implants, PrEP and smear tests, at the Clifden Centre, the Ivy Centre and John Scott Health Centre. They can book online or walk in.', s:'STI testing, contraception incl. coils and implants, PrEP. Book online or walk in.'},
    link:'https://www.homerton.nhs.uk/sexual-health/'}
];

export const SERVICE_GROUPS = [
  { id: 'pharm', l: 'Pharmacy', hint: 'National, walk in or GP referral' },
  { id: 'self', l: 'Self-refer', hint: 'National, no GP referral needed' },
  { id: 'urgent', l: 'Urgent', hint: 'NHS 111 routes' },
  { id: 'screen', l: 'Screening', hint: 'Patient can contact the service' },
  { id: 'life', l: 'Other', hint: 'Local services vary by area', extra: [{ v: 'nhsapp', l: 'NHS App self-booking' }], tail: ['local'], custom: { v: 'other', l: 'Other service' } }
];
export const SERVICE = id => SERVICES.find(s => s.id === id);
