/**
 * What goes into a prepared message (north star, document 6): facts pulled from the record,
 * the problem's context in the member's words, and who is affected and how.
 */

import { firstVisit, fixedEntry } from "./clocks";
import { letterDate, londonParts } from "./dates";
import { sortedEntries } from "./Record";
import { ME, type AffectedKind, type Category, type Entry, type Group, type Issue, type LetterKey, type Prefs } from "./types";

// ---- Questions ---------------------------------------------------------------------

export type Question = { key: string; label: string; placeholder: string; lead: string };

/** One question per kind of problem: the detail a landlord or ombudsman needs. */
export const CATEGORY_QUESTIONS: Record<Category, Question[]> = {
  damp_mould: [{ key: "rooms", lead: "Where it is and what's damaged", label: "Which rooms, and has anything been damaged?", placeholder: "Back bedroom and bathroom. Clothes in the wardrobe have gone mouldy" }],
  leak: [{ key: "where", lead: "Where the water goes", label: "Where is the water going? Is it near any electrics?", placeholder: "Through the kitchen ceiling, next to the light fitting" }],
  heating: [{ key: "coping", lead: "How we're coping", label: "How long have you been without it, and how are you coping?", placeholder: "Three weeks. We boil the kettle to wash and use a plug-in heater" }],
  electrics: [{ key: "what", lead: "What we've noticed", label: "What isn't working? Is anything sparking, hot or smelling of burning?", placeholder: "Half the sockets in the kitchen are dead" }],
  gas: [{ key: "what", lead: "What we've noticed", label: "What have you noticed, and has anyone checked it?", placeholder: "The boiler flame is yellow. The alarm went off once" }],
  doors_windows: [{ key: "risk", lead: "The risk", label: "Who is put at risk, and can you lock up?", placeholder: "The front door won't lock, so anyone can get in at night" }],
  pests: [{ key: "where", lead: "Where they are and what's damaged", label: "Where are they, and what have they damaged?", placeholder: "Mice in the kitchen. They've chewed through food packets" }],
  structure: [{ key: "where", lead: "Where it is", label: "Where is it, and is it getting worse?", placeholder: "The crack above the bedroom window is wider than last month" }],
  other: [],
};

export const COMMON_QUESTIONS: { key: "started" | "impact" | "fix"; label: string; placeholder: string }[] = [
  { key: "started", label: "When did it start?", placeholder: "Early September, after the heavy rain" },
  { key: "impact", label: "What does it stop you doing?", placeholder: "We can't use the back bedroom, so the children share" },
  { key: "fix", label: "What would fix it?", placeholder: "Find and fix the leak, not just paint over it" },
];

export const AFFECTED: Record<AffectedKind, { tick: string; question: string; placeholder: string; lead: string }> = {
  child: {
    tick: "A child",
    question: "How does it affect them?",
    placeholder: "Our 8-month-old sleeps in that room and has had a cough for two weeks",
    lead: "A child lives here.",
  },
  pregnancy: {
    tick: "Someone pregnant",
    question: "How does it affect them?",
    placeholder: "I'm seven months pregnant and the cold is making it hard to sleep",
    lead: "Someone here is pregnant.",
  },
  older: {
    tick: "An older person",
    question: "How does it affect them?",
    placeholder: "My dad is 82 and can't keep warm without the heating",
    lead: "An older person lives here.",
  },
  condition: {
    tick: "A disability or long-term condition",
    question: "How does it affect them?",
    placeholder: "My partner has asthma and it's been worse since the mould came back",
    lead: "Someone here has a disability or long-term health condition.",
  },
  mental_health: {
    tick: "Mental health",
    question: "How does it affect them?",
    placeholder: "Living with the leak is making my anxiety much worse",
    lead: "This is affecting someone's mental health.",
  },
};

/** How much of the problem's context has been given, for the "Make your case stronger" card. */
export function contextProgress(issue: Issue) {
  const c = issue.context ?? {};
  const qs = [...COMMON_QUESTIONS.map((q) => c[q.key]), ...CATEGORY_QUESTIONS[issue.category].map((q) => c.answers?.[q.key])];
  return { answered: qs.filter((v) => v && v.trim()).length, total: qs.length, affected: c.affected?.length ?? 0 };
}

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Member's words as a sentence: capital letter, full stop. */
export function sentence(text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

// ---- Facts for "What we'll mention" -------------------------------------------------

export type Fact = {
  id: string;
  text: string;
  /** "record" facts come from the record; "words" from the member; "affected" is private and starts unticked. */
  source: "record" | "words" | "affected";
};

const d = (iso: string) => letterDate(londonParts(iso).ymd);
const quote = (t: string) => `“${t.length > 160 ? `${t.slice(0, 157)}…` : t}”`;

function isContact(e: Entry) {
  return e.kind === "reported" || (e.kind === "email" && e.direction === "to_landlord") || (e.kind === "call" && e.direction !== "they_called") || e.kind === "post";
}

function fromLandlord(e: Entry) {
  return (e.kind === "email" && e.direction === "from_landlord") || (e.kind === "call" && e.direction === "they_called") || e.kind === "messages";
}

/** Facts the record already holds. Each costs the member nothing to include. */
export function recordFacts(issue: Issue): Fact[] {
  const list = sortedEntries(issue);
  const facts: Fact[] = [];

  const contacts = list.filter(isContact);
  if (contacts.length >= 2) {
    facts.push({ id: "contacts", source: "record", text: `We have contacted you ${contacts.length === 2 ? "twice" : `${contacts.length} times`} about this: ${contacts.map((e) => d(e.at)).join(", ")}.` });
  }

  for (const reply of list.filter(fromLandlord).slice(-2)) {
    const what = reply.kind === "email" ? (reply.text ? `you replied: ${quote(reply.text)}` : "you replied by email") : reply.kind === "call" ? `you called${reply.text ? ` and said: ${quote(reply.text)}` : ""}` : `you sent a message${reply.text ? ` (${reply.text.trim().replace(/\.$/, "")})` : ""}, which we have a screenshot of`;
    const after = list.filter((e) => e.at > reply.at);
    const happened = after.some((e) => e.kind === "visit" || e.kind === "fixed");
    facts.push({ id: `reply-${reply.id}`, source: "record", text: `On ${d(reply.at)} ${what}${happened ? "" : " Nothing has happened since."}` });
  }

  const visit = firstVisit(issue);
  if (visit) facts.push({ id: "visit", source: "record", text: `Someone came to look on ${d(visit.at)}${fixedEntry(issue) ? "" : ", but it has not been fixed"}.` });

  for (const measure of ["humidity", "temperature"] as const) {
    const readings = list.filter((e): e is Extract<Entry, { kind: "reading" }> => e.kind === "reading" && e.measure === measure);
    if (!readings.length) continue;
    const unit = measure === "humidity" ? "%" : "°C";
    const room = readings.find((r) => r.room)?.room;
    facts.push({
      id: `readings-${measure}`,
      source: "record",
      text: `${measure === "humidity" ? "Humidity" : "Temperature"} readings${room ? ` in the ${room.toLowerCase()}` : ""}: ${readings
        .slice(-4)
        .map((r) => `${r.value}${unit} on ${d(r.at)}`)
        .join(", ")}.`,
    });
  }

  const receipts = list.filter((e): e is Extract<Entry, { kind: "receipt" }> => e.kind === "receipt");
  if (receipts.length) {
    const total = receipts.reduce((n, r) => n + (Number((r.amount ?? "").replace(/[^\d.]/g, "")) || 0), 0);
    const what = receipts.map((r) => r.text).filter(Boolean).join("; ");
    facts.push({
      id: "receipts",
      source: "record",
      text: `${total ? `We have spent £${total.toFixed(2)} because of this` : "We have had costs because of this"}${what ? ` (${what.replace(/\.$/, "")})` : ""}. We have the receipts.`,
    });
  }

  const media = list.filter((e) => e.kind === "photo" || e.kind === "video" || e.kind === "messages").length;
  if (media) facts.push({ id: "photos", source: "record", text: `We have ${media} dated ${media === 1 ? "photo or screenshot" : "photos and screenshots"}, which I can send.` });

  return facts;
}

/** The member's words about the problem, minus whichever one this letter's prompt asks for. */
export function wordsFacts(issue: Issue, promptKey?: string): Fact[] {
  const c = issue.context ?? {};
  const facts: Fact[] = [];
  if (c.started && promptKey !== "started") facts.push({ id: "started", source: "words", text: `It started ${lowerFirst(c.started.trim().replace(/\.$/, "").replace(/^(it )?started /i, ""))}.` });
  for (const q of CATEGORY_QUESTIONS[issue.category]) {
    const a = c.answers?.[q.key];
    if (a?.trim()) facts.push({ id: `answer-${q.key}`, source: "words", text: `${q.lead}: ${lowerFirst(sentence(a))}` });
  }
  if (c.impact && promptKey !== "impact") facts.push({ id: "impact", source: "words", text: sentence(c.impact) });
  if (c.worse && promptKey !== "worse") facts.push({ id: "worse", source: "words", text: sentence(c.worse) });
  if (c.fix) facts.push({ id: "fix", source: "words", text: `What would fix it: ${c.fix.trim().replace(/\.$/, "")}.` });
  return facts;
}

export function affectedFacts(issue: Issue): Fact[] {
  return (issue.context?.affected ?? []).map((a, i) => ({ id: `affected-${i}`, source: "affected", text: `${AFFECTED[a.kind].lead} ${sentence(a.how)}`.trim() }));
}

// ---- This letter's one prompt ---------------------------------------------------------

export const LETTER_PROMPT: Record<LetterKey, { label: string; placeholder: string; saveTo?: "impact" | "worse" } | null> = {
  repair_request: { label: "When did it start, and how is it affecting you?", placeholder: "Since early September. We can't use the back bedroom", saveTo: "impact" },
  reminder: { label: "Has anything got worse since you told them?", placeholder: "It's spread to the window frame and smells worse", saveTo: "worse" },
  confirm: { label: "Anything else they said that you want on record?", placeholder: "They said the engineer would phone first" },
  complaint: { label: "How has this affected you, and what would put it right?", placeholder: "Three weeks of cold showers. We need a working boiler", saveTo: "impact" },
  group: null,
};

// ---- Address and access ---------------------------------------------------------------

/** The address for a letter: a member's flat (yours by default), then the group's address and postcode. */
export function addressLine(group: Group, memberId: string = ME) {
  const flat = group.members.find((m) => m.id === memberId)?.flat;
  const line = group.address?.line?.trim() || group.name;
  const postcode = group.address?.postcode?.trim();
  return [flat && !line.toLowerCase().includes(flat.toLowerCase()) ? flat : "", line, postcode].filter(Boolean).join(", ");
}

export const ACCESS_SLOTS = ["weekday mornings", "weekday afternoons", "weekday evenings", "weekends"];

export function accessText(p: Pick<Prefs, "accessSlots" | "access">) {
  const slots = p.accessSlots.filter((s) => ACCESS_SLOTS.includes(s));
  const joined = slots.length > 1 ? `${slots.slice(0, -1).join(", ")} and ${slots.at(-1)}` : slots[0] ?? "";
  const note = p.access.trim().replace(/\.$/, "");
  if (joined && note) return `To arrange access, I am usually in on ${joined} (${note}).`;
  if (joined) return `To arrange access, I am usually in on ${joined}.`;
  if (note) return `To arrange access: ${note}.`;
  return "";
}
