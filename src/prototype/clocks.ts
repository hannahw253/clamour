/**
 * Legal clocks for the prototype, following the north star's rules engine (document 6).
 * The real app reads versioned rule packs from rules/<nation>/<version>.yaml; this file
 * holds the one statutory pack that exists today (Scotland, 2026-10-06) as plain data.
 */

import { addDays, daysBetween, londonParts, shortDate, todayYmd, weekday, type Ymd } from "./dates";
import type { Entry, Group, Issue } from "./types";

/** Scottish bank holidays, from the GOV.UK bank holidays feed. */
const SCOTLAND_HOLIDAYS = new Set<Ymd>([
  "2026-01-01", "2026-01-02", "2026-04-03", "2026-05-04", "2026-05-25", "2026-08-03", "2026-11-30", "2026-12-25", "2026-12-28",
  "2027-01-01", "2027-01-04", "2027-03-26", "2027-05-03", "2027-05-31", "2027-08-02", "2027-11-30", "2027-12-27", "2027-12-28",
]);

export const SCOTLAND_PACK = {
  version: "2026-10-06",
  effectiveFrom: "2026-10-06" as Ymd,
  source: {
    title: "Awaab's Law: guidance for tenants in Scotland",
    url: "https://www.gov.scot/publications/awaabs-law-guidance-tenants-scotland/",
  },
};

export function isWorkingDay(ymd: Ymd, holidays = SCOTLAND_HOLIDAYS): boolean {
  const wd = weekday(ymd);
  return wd !== 0 && wd !== 6 && !holidays.has(ymd);
}

/** A report after 5pm, or on a non-working day, counts from the next working day. */
export function clockStart(iso: string, holidays = SCOTLAND_HOLIDAYS): Ymd {
  const { ymd, hour } = londonParts(iso);
  let d = ymd;
  if (hour >= 17 || !isWorkingDay(d, holidays)) {
    do d = addDays(d, 1);
    while (!isWorkingDay(d, holidays));
  }
  return d;
}

export function addWorkingDays(iso: string, days: number, holidays = SCOTLAND_HOLIDAYS): Ymd {
  let d = clockStart(iso, holidays);
  let added = 0;
  while (added < days) {
    d = addDays(d, 1);
    if (isWorkingDay(d, holidays)) added++;
  }
  return d;
}

// ---- Issue state -------------------------------------------------------------

export type IssueStatus = "open" | "reported" | "fixed";

function sorted(entries: Entry[]) {
  return [...entries].sort((a, b) => a.at.localeCompare(b.at));
}

/** Telling the landlord: a recorded report, an email to them, or a call. */
function isReport(e: Entry) {
  return e.kind === "reported" || (e.kind === "email" && e.direction === "to_landlord") || e.kind === "call";
}

export function firstReport(issue: Issue) {
  return sorted(issue.entries).find(isReport);
}

/** A spoken conversation with the landlord that nothing written has followed yet. */
export function unconfirmedCall(issue: Issue) {
  const list = sorted(issue.entries);
  const spokenAt = list.findLastIndex(
    (e) => e.kind === "call" || (e.kind === "reported" && (e.method === "phone" || e.method === "in_person")),
  );
  if (spokenAt === -1) return undefined;
  const writtenAfter = list
    .slice(spokenAt + 1)
    .some(
      (e) =>
        e.kind === "letter" ||
        (e.kind === "email" && e.direction === "to_landlord") ||
        (e.kind === "reported" && (e.method === "email" || e.method === "letter" || e.method === "text")),
    );
  return writtenAfter ? undefined : list[spokenAt];
}

export function firstVisit(issue: Issue) {
  return sorted(issue.entries).find((e) => e.kind === "visit");
}

export function fixedEntry(issue: Issue) {
  const last = sorted(issue.entries)
    .filter((e) => e.kind === "fixed" || e.kind === "reopened")
    .at(-1);
  return last?.kind === "fixed" ? last : undefined;
}

export function issueStatus(issue: Issue): IssueStatus {
  if (fixedEntry(issue)) return "fixed";
  return firstReport(issue) ? "reported" : "open";
}

export function lastActivity(issue: Issue): string {
  return issue.entries.reduce((latest, e) => (e.recordedAt > latest ? e.recordedAt : latest), issue.createdAt);
}

// ---- Clocks ------------------------------------------------------------------

export type ClockTone = "informal" | "statutory" | "missed" | "met";

export type ClockView = {
  tone: ClockTone;
  /** Small line above the value, for deadlines. */
  lead?: string;
  value: string;
  unit?: string;
  note: string;
  source?: { title: string; url: string };
  /** One line for the issue list. */
  words: string;
};

export type RuleLine = {
  label: string;
  /** The same rule in the past tense, for missed deadlines. */
  past: string;
  /** When the rule only applies in some cases. */
  condition?: string;
  due: Ymd;
  state: "due" | "met" | "missed" | "info";
  detail: string;
};

function statutoryApplies(group: Group, issue: Issue, reportedAt: string) {
  return (
    group.nation === "scotland" &&
    issue.category === "damp_mould" &&
    londonParts(reportedAt).ymd >= SCOTLAND_PACK.effectiveFrom
  );
}

/** Every statutory rule for the issue, in order, for the issue page. */
export function ruleLines(group: Group, issue: Issue, now = new Date()): RuleLine[] {
  const report = firstReport(issue);
  if (!report || !statutoryApplies(group, issue, report.at)) return [];
  const today = todayYmd(now);
  const visit = firstVisit(issue);
  const investigateBy = addWorkingDays(report.at, 10);
  const lines: RuleLine[] = [];

  if (visit) {
    const visited = londonParts(visit.at).ymd;
    const inTime = visited <= investigateBy;
    lines.push({
      label: "Landlord must investigate",
      past: "Landlord had to investigate",
      due: investigateBy,
      state: inTime ? "met" : "missed",
      detail: inTime ? `Done ${shortDate(visited)}, in time` : `Done ${shortDate(visited)}, after the deadline`,
    });
    const summaryBy = addWorkingDays(visit.at, 3);
    const repairsBy = addWorkingDays(visit.at, 5);
    lines.push({
      label: "Landlord must send a written summary of what they found",
      past: "Landlord had to send a written summary",
      due: summaryBy,
      state: "info",
      detail: "3 working days after the visit",
    });
    lines.push({
      label: "Repairs must start",
      past: "Repairs had to start",
      condition: "if they found significant damp or mould",
      due: repairsBy,
      state: fixedEntry(issue) ? "met" : today > repairsBy ? "missed" : "due",
      detail: "5 working days after the visit",
    });
  } else {
    lines.push({
      label: "Landlord must investigate",
      past: "Landlord had to investigate",
      due: investigateBy,
      state: today > investigateBy ? "missed" : "due",
      detail: "10 working days after your report",
    });
  }
  return lines;
}

/** The one clock shown on the issue card and at the top of the issue page. */
export function issueClock(group: Group, issue: Issue, now = new Date()): ClockView {
  const today = todayYmd(now);
  const fixed = fixedEntry(issue);
  const report = firstReport(issue);

  if (fixed) {
    const fixedOn = londonParts(fixed.at).ymd;
    const from = londonParts(report?.at ?? issue.createdAt).ymd;
    const took = daysBetween(from, fixedOn);
    return {
      tone: "met",
      lead: "Fixed on",
      value: shortDate(fixedOn),
      unit: `${took} ${took === 1 ? "day" : "days"} after it was ${report ? "first reported" : "logged"}`,
      note: "Fixed",
      words: `Fixed ${shortDate(fixedOn)}`,
    };
  }

  if (!report) {
    const days = daysBetween(londonParts(issue.createdAt).ymd, today);
    return {
      tone: "informal",
      value: days === 0 ? "Today" : String(days),
      unit: days === 0 ? "Logged today" : `${days === 1 ? "day" : "days"} since it was logged`,
      note: "Not reported to your landlord yet",
      words: "Not reported to your landlord yet",
    };
  }

  const lines = ruleLines(group, issue, now);
  const current = lines.find((l) => l.state === "missed") ?? lines.find((l) => l.state === "due");
  if (current) {
    const missed = current.state === "missed";
    return {
      tone: missed ? "missed" : "statutory",
      lead: missed ? `${current.past} by` : `${current.label} by`,
      value: shortDate(current.due),
      unit: current.condition ? `${current.detail}, ${current.condition}` : current.detail,
      note: missed ? "Deadline missed · Awaab's Law" : "Legal deadline · Awaab's Law",
      source: SCOTLAND_PACK.source,
      words: missed
        ? `Deadline missed: ${current.past.toLowerCase()} by ${shortDate(current.due)}`
        : `${current.label} by ${shortDate(current.due)}`,
    };
  }

  const days = daysBetween(londonParts(report.at).ymd, today);
  return {
    tone: "informal",
    value: days === 0 ? "Today" : String(days),
    unit: days === 0 ? "First reported today" : `${days === 1 ? "day" : "days"} since you first reported it`,
    note: "Not a legal deadline",
    words: `Reported ${days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`} · not a legal deadline`,
  };
}

/** The next sensible step for an issue, in words (document 8: "Say what happens next"). */
export function nextStep(group: Group, issue: Issue, now = new Date()): string | null {
  const status = issueStatus(issue);
  if (status === "fixed") return null;
  if (status === "open") return "Tell your landlord";
  if (unconfirmedCall(issue)) return "Confirm the conversation in writing";
  const clock = issueClock(group, issue, now);
  if (clock.tone === "missed") return "Send a reminder";
  const report = firstReport(issue)!;
  const days = daysBetween(londonParts(report.at).ymd, todayYmd(now));
  if (clock.tone === "informal" && days >= 14) return "Send a reminder";
  if (group.nation === "scotland" && issue.category === "damp_mould" && !firstVisit(issue)) {
    return "Record when your landlord visits";
  }
  return "Add an update when something changes";
}
