/**
 * What goes into a prepared message (north star, document 6, decision D-026): facts from the record,
 * every household's updates in their own words, and who is affected and how. The sender ticks what
 * to include on the email screen; nothing is written until they press "Write it".
 */

import { firstReport, firstVisit, fixedEntry } from "./clocks";
import { letterDate, londonParts, shortDate } from "./dates";
import { sortedEntries } from "./Record";
import { AFFECTED, CATEGORY_QUESTIONS, FIX, IMPACT, STARTED, WORSE, topicLabel, type Question } from "./topics";
import { ME, type Entry, type Group, type Issue, type LetterKey, type Prefs } from "./types";

export { AFFECTED, CATEGORY_QUESTIONS } from "./topics";

export const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Words as a sentence: capital letter, full stop. */
export function sentence(text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

// ---- Households ----------------------------------------------------------------------

/** How a member's household is named: their flat in a building or branch, their name in a shared house. */
export function household(group: Group, memberId: string): string {
  const m = group.members.find((x) => x.id === memberId);
  if (!m) return "A former member";
  return group.type !== "house" && m.flat ? m.flat : m.name;
}

/** The questions for one household's update about a problem. */
export function updateQuestions(issue: Issue): Question[] {
  return [STARTED, IMPACT, ...CATEGORY_QUESTIONS[issue.category], ...(firstReport(issue) ? [WORSE] : []), FIX];
}

type Note = Extract<Entry, { kind: "note" }>;

/** Updates with words in them, latest answer per household and question, oldest first. */
export function latestUpdates(issue: Issue): Note[] {
  const notes = sortedEntries(issue).filter((e): e is Note => e.kind === "note" && !!e.text?.trim());
  const latest = new Map<string, Note>();
  for (const n of notes) latest.set(n.topic ? `${n.by}|${n.topic}` : n.id, n);
  return [...latest.values()].sort((a, b) => a.at.localeCompare(b.at));
}

/** My latest answer to each question on this problem, to start the form from. */
export function myAnswers(issue: Issue): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of latestUpdates(issue)) if (n.by === ME && n.topic) out[n.topic] = n.text ?? "";
  return out;
}

// ---- Facts for "What should we say?" ---------------------------------------------------

export type Fact = {
  id: string;
  text: string;
  /** "record" from the evidence; "words" from households' updates; "affected" is private and starts unticked. */
  source: "record" | "words" | "affected";
  /** Who said it and when, shown under the tick box. */
  meta?: string;
  topic?: string;
  issueId?: string;
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

  return facts.map((f) => ({ ...f, issueId: issue.id }));
}

/** How one update reads in a letter: plain when it's yours, quoted and named when it's another household's. */
export function updateText(group: Group, issue: Issue, n: Pick<Note, "by" | "topic" | "text">): string {
  const words = (n.text ?? "").trim().replace(/\s+/g, " ");
  if (n.by !== ME) {
    const who = household(group, n.by);
    const lead = n.topic === "impact" || n.topic === "worse" ? undefined : topicLabel(n.topic, issue.category);
    return lead ? `${lead} (${who}): ${quote(sentence(words))}` : `From ${who}: ${quote(sentence(words))}`;
  }
  if (n.topic === "started") return `It started ${lowerFirst(words.replace(/\.$/, "").replace(/^(it )?started /i, ""))}.`;
  if (n.topic === "fix") return `What would fix it: ${words.replace(/\.$/, "")}.`;
  const q = CATEGORY_QUESTIONS[issue.category].find((x) => x.key === n.topic);
  if (q) return `${q.lead}: ${lowerFirst(sentence(words))}`;
  return sentence(words);
}

const ORDER = (topic?: string) => (topic === "started" ? 0 : topic === "fix" ? 2 : 1);

/** Every household's latest words about this problem, ticked by default. */
export function wordsFacts(group: Group, issue: Issue): Fact[] {
  return latestUpdates(issue)
    .sort((a, b) => ORDER(a.topic) - ORDER(b.topic) || a.at.localeCompare(b.at))
    .map((n) => {
      const who = n.by === ME ? "You" : `${group.members.find((m) => m.id === n.by)?.name ?? "Former member"}${group.type !== "house" ? `, ${household(group, n.by)}` : ""}`;
      const label = topicLabel(n.topic, issue.category);
      return {
        id: n.id,
        source: "words" as const,
        topic: n.topic,
        issueId: issue.id,
        text: updateText(group, issue, n),
        meta: `${who} · ${shortDate(londonParts(n.at).ymd)}${label ? ` · ${label}` : ""}`,
      };
    });
}

/**
 * Who is affected, offered only where the household that gave the details agreed to their use in
 * letters (your own are always offered to you). Unticked every time.
 */
export function affectedFacts(group: Group, issue: Issue): { facts: Fact[]; hidden: number } {
  const all = issue.affected ?? [];
  const usable = all.filter((a) => a.by === ME || a.letters);
  return {
    hidden: all.length - usable.length,
    facts: usable.map((a, i) => {
      const house = group.type === "house";
      const where = a.by === ME || house ? "here" : `in ${household(group, a.by)}`;
      const how = sentence(a.how);
      const said = a.by === ME ? how : `${house ? `${household(group, a.by)} says: ` : ""}${quote(how)}`;
      return {
        id: `affected-${a.by}-${a.kind}-${i}`,
        source: "affected" as const,
        issueId: issue.id,
        text: `${AFFECTED[a.kind].lead(where)} ${said}`.trim(),
        meta: a.by === ME ? `Your household${a.letters ? "" : " · only you can include this"}` : `Shared for letters by ${group.members.find((m) => m.id === a.by)?.name ?? "a member"}`,
      };
    }),
  };
}

// ---- The email screen's one box, and its style ----------------------------------------

/** "Anything new?" on the email screen. Saved as the sender's update unless it's only for this letter. */
export const NEW_PROMPT: Record<LetterKey, { label: string; placeholder: string; topic?: string; save: boolean }> = {
  repair_request: { label: "Anything to add?", placeholder: "It's spread to the window frame since I logged it", save: true },
  reminder: { label: "Has anything got worse since you told them?", placeholder: "It's now dripping onto the cooker when it rains", topic: "worse", save: true },
  confirm: { label: "Anything else they said that you want on record?", placeholder: "They said the engineer would phone first", save: false },
  complaint: { label: "Anything new since your last message?", placeholder: "Three more weeks of cold showers", save: true },
  group: { label: "Anything to add for the whole group?", placeholder: "Several of us have had to throw away mouldy clothes", save: false },
};

export type Style = { tone: "polite" | "firm"; length: "short" | "detailed" };

export const DEFAULT_STYLE: Record<LetterKey, Style> = {
  repair_request: { tone: "polite", length: "short" },
  confirm: { tone: "polite", length: "short" },
  reminder: { tone: "firm", length: "short" },
  complaint: { tone: "firm", length: "detailed" },
  group: { tone: "firm", length: "detailed" },
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

// ---- Requests for updates ---------------------------------------------------------------

/** Open requests for updates that cover this problem (or any of these problems). */
export function openRequests(group: Group, issueIds: string[]) {
  return (group.requests ?? []).filter((r) => !r.closedAt && r.issueIds.some((x) => issueIds.includes(x)));
}

/** Updates added by other members since a request was made. */
export function updatesSince(group: Group, issueIds: string[], sinceIso: string) {
  return group.issues
    .filter((i) => issueIds.includes(i.id))
    .flatMap((i) => i.entries)
    .filter((e) => e.by !== ME && e.recordedAt > sinceIso && (e.kind === "note" || e.kind === "photo" || e.kind === "reading" || e.kind === "messages")).length;
}
