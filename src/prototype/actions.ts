/**
 * The escalation ladder (north star, document 6): what an issue needs next, in words a
 * renter would use, and which prepared message does it. Members never need to know the process.
 */

import { daysBetween, londonParts, shortDate, todayYmd } from "./dates";
import { addWorkingDays, firstReport, firstVisit, fixedEntry, issueClock, unconfirmedCall } from "./clocks";
import type { Entry, Group, Issue, LetterKey } from "./types";

export type NextAction =
  | { kind: "send"; letter: LetterKey; headline: string; why: string; button: string }
  | { kind: "visit" | "evidence" | "case" | "update"; headline: string; why: string; button: string }
  | { kind: "done"; headline: string; why: string };

function sentLetters(issue: Issue, key: LetterKey): Entry[] {
  // A group letter about several problems counts as a reminder for each of them.
  const keys: LetterKey[] = key === "reminder" ? ["reminder", "group"] : [key];
  return issue.entries
    .filter((e) => (e.kind === "letter" && keys.includes(e.letter)) || (e.kind === "email" && !!e.letter && keys.includes(e.letter)))
    .sort((a, b) => a.at.localeCompare(b.at));
}

const ago = (iso: string, now: Date) => daysBetween(londonParts(iso).ymd, todayYmd(now));

export function nextAction(group: Group, issue: Issue, now = new Date()): NextAction {
  const fixed = fixedEntry(issue);
  if (fixed) return { kind: "done", headline: "Fixed", why: `Fixed on ${shortDate(londonParts(fixed.at).ymd)}.` };

  const report = firstReport(issue);
  if (!report) {
    return {
      kind: "send",
      letter: "repair_request",
      headline: "Tell your landlord",
      why: "They can’t fix what they haven’t been told. We’ll write the email for you.",
      button: "Email your landlord",
    };
  }

  const call = unconfirmedCall(issue);
  if (call) {
    return {
      kind: "send",
      letter: "confirm",
      headline: "Confirm what was said",
      why: `You spoke to them on ${shortDate(londonParts(call.at).ymd)}. A short email turns that into a written record.`,
      button: "Confirm by email",
    };
  }

  const complaint = sentLetters(issue, "complaint").at(-1);
  if (complaint) {
    return {
      kind: "case",
      headline: "Take it further",
      why: `You complained ${ago(complaint.at, now)} days ago. If it isn’t resolved, the council or an ombudsman can step in. Your case file is ready.`,
      button: "Open the case file",
    };
  }

  const reminder = sentLetters(issue, "reminder").at(-1);
  if (reminder) {
    const since = ago(reminder.at, now);
    if (since >= 14) {
      return {
        kind: "send",
        letter: "complaint",
        headline: "Make a formal complaint",
        why: `You sent a reminder ${since} days ago and it still isn’t fixed. A formal complaint is the next step, and ombudsmen expect one.`,
        button: "Write the complaint",
      };
    }
  }

  const clock = issueClock(group, issue, now);
  if (clock.tone === "missed" && (!reminder || ago(reminder.at, now) >= 7)) {
    return {
      kind: "send",
      letter: "reminder",
      headline: "Chase your landlord",
      why: `They missed the legal deadline (${clock.value}). We’ll write a reminder that says so.`,
      button: "Send a reminder",
    };
  }

  const days = ago(report.at, now);
  if (clock.tone === "informal" && days >= 14 && !reminder) {
    return {
      kind: "send",
      letter: "reminder",
      headline: "Chase your landlord",
      why: `It’s been ${days} days since you first told them.`,
      button: "Send a reminder",
    };
  }

  if (reminder) {
    return {
      kind: "evidence",
      headline: "Give them a little time",
      why: `You sent a reminder ${ago(reminder.at, now)} days ago. If it’s not fixed in 14 days, we’ll help you make a formal complaint.`,
      button: "Add evidence",
    };
  }

  if (group.nation === "scotland" && issue.category === "damp_mould" && !firstVisit(issue)) {
    return {
      kind: "visit",
      headline: "Wait for the inspection",
      why: `Your landlord must investigate by ${shortDate(addWorkingDays(report.at, 10))}. Tell us when they come.`,
      button: "They’ve visited",
    };
  }

  return {
    kind: "evidence",
    headline: "Keep the record going",
    why: "Add photos, readings or messages as things change.",
    button: "Add evidence",
  };
}

/** True when the issue is waiting on the group, not the landlord. */
export function needsYou(group: Group, issue: Issue) {
  return nextAction(group, issue).kind === "send";
}
