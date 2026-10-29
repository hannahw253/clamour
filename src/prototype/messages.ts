/**
 * Prepared messages (north star, document 6): plain, calm English, no threats, legal points
 * only where the rule pack confirms them, personal details only when the member adds them,
 * and the issue reference in every subject.
 */

import { addWorkingDays, firstReport, issueClock, unconfirmedCall } from "./clocks";
import { addDays, daysBetween, letterDate, londonParts, todayYmd } from "./dates";
import { entrySummary, sortedEntries } from "./Record";
import { issueRef, type Group, type Issue, type LetterKey } from "./types";

export type Answers = { health: boolean; vulnerable: boolean; access: string };

export const NO_ANSWERS: Answers = { health: false, vulnerable: false, access: "" };

export const MESSAGE_TITLE: Record<LetterKey, string> = {
  repair_request: "Report the problem",
  reminder: "Send a reminder",
  confirm: "Confirm what was said",
  complaint: "Make a formal complaint",
  group: "Send a group letter",
};

const time = (iso: string) => {
  const p = londonParts(iso);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
};

export function buildMessage(
  key: LetterKey,
  ctx: { group: Group; issue: Issue; myName: string; landlordName?: string },
  answers: Answers,
): { subject: string; body: string } {
  const { group, issue, myName } = ctx;
  const report = firstReport(issue);
  const today = todayYmd();
  const where = issue.room ? ` (${issue.room})` : "";
  const firstDate = report ? letterDate(londonParts(report.at).ymd) : null;
  const days = report ? daysBetween(londonParts(report.at).ymd, today) : 0;
  const replyBy = letterDate(addDays(today, 7));
  const ref = ` [${issueRef(issue)}]`;
  const greeting = `Dear ${ctx.landlordName?.trim() || "landlord"},`;
  const formal = key === "complaint";
  const sign = `${formal ? "Yours sincerely" : "Thank you"},\n\n${myName}\n${group.name}`;
  const footer = "This message was prepared with Clamour. It is not legal advice.";

  const extras = [
    answers.vulnerable ? "Children or someone vulnerable lives here, so please treat this as urgent." : "",
    answers.health ? "I am worried this is affecting our health." : "",
    answers.access.trim() ? `To arrange access, I am available ${answers.access.trim().replace(/\.$/, "")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const extraPara = extras ? `\n\n${extras}` : "";

  const scotlandDamp =
    group.nation === "scotland" && issue.category === "damp_mould" && report && issueClock(group, issue).tone !== "informal";
  const law = scotlandDamp
    ? `\n\nUnder Awaab's Law in Scotland, landlords must investigate reports of damp or mould within 10 working days. That date was ${letterDate(addWorkingDays(report!.at, 10))}.`
    : "";
  const problem = `${issue.title}${where}.`;

  if (key === "repair_request") {
    return {
      subject: `Repair needed at ${group.name}${ref}`,
      body: `${greeting}

I am writing to report a repair needed at ${group.name}.

${problem}${extraPara}

Please let me know when someone can come to look at it.

${sign}

${footer}`,
    };
  }

  if (key === "confirm") {
    const call = unconfirmedCall(issue);
    const how =
      call?.kind === "call" ? (call.direction === "in_person" ? "conversation" : "phone call") : call?.kind === "reported" && call.method === "in_person" ? "conversation" : "phone call";
    const when = call ? ` on ${letterDate(londonParts(call.at).ymd)} at ${time(call.at)}` : "";
    const said = call?.text ? `\n\nMy note of what was said: ${call.text}` : "";
    return {
      subject: `Confirming our ${how}${ref}`,
      body: `${greeting}

I am writing to confirm our ${how}${when} about a repair at ${group.name}.

${problem}${said}${extraPara}

If I have misunderstood anything, please reply by ${replyBy}.

${sign}

${footer}`,
    };
  }

  if (key === "complaint") {
    const steps = sortedEntries(issue)
      .filter((e) => e.kind === "reported" || e.kind === "letter" || e.kind === "call" || e.kind === "visit" || e.kind === "email")
      .map((e) => `- ${letterDate(londonParts(e.at).ymd)}: ${entrySummary(e).text.replace(/^Prepared a letter/, "Letter")}`)
      .join("\n");
    return {
      subject: `Formal complaint: repairs at ${group.name}${ref}`,
      body: `${greeting}

I am making a formal complaint about how a repair at ${group.name} has been handled.

${problem}

${firstDate ? `I first reported this on ${firstDate}, ${days} days ago, and it has not been fixed.` : "It has not been fixed."}${law}${extraPara}

What has happened so far:
${steps || "- No contact recorded yet"}

Please treat this as a formal complaint under your complaints procedure. Please tell me in writing by ${replyBy} what you will do and when, and how I can take the complaint further if it is not resolved.

${sign}

${footer}`,
    };
  }

  return {
    subject: `Reminder: repair still needed at ${group.name}${ref}`,
    body: `${greeting}

I am writing again about a repair at ${group.name}.

${problem}

${firstDate ? `I first reported this on ${firstDate}, ${days} days ago, and it has not been fixed.` : "It has not been fixed."}${law}${extraPara}

Please let me know by ${replyBy} when the work will be done.

${sign}

${footer}`,
  };
}

/** One letter about several problems in the same group: the "group letter of demands" in document 6. */
export function buildGroupMessage(
  ctx: { group: Group; issues: Issue[]; myName: string; landlordName?: string },
  answers: Answers,
): { subject: string; body: string } {
  const { group, issues, myName } = ctx;
  const today = todayYmd();
  const replyBy = letterDate(addDays(today, 7));
  const households = new Set(issues.map((i) => i.createdBy)).size;
  const lines = issues
    .map((issue) => {
      const report = firstReport(issue);
      const clock = issueClock(group, issue);
      const first = report
        ? `First reported ${letterDate(londonParts(report.at).ymd)}, ${daysBetween(londonParts(report.at).ymd, today)} days ago.`
        : "Not reported before this letter.";
      const missed = clock.tone === "missed" ? ` Legal deadline missed: ${clock.value}.` : "";
      return `- [${issueRef(issue)}] ${issue.title}${issue.room ? ` (${issue.room})` : ""}. ${first}${missed}`;
    })
    .join("\n");
  const extras = [
    answers.vulnerable ? "Children or vulnerable people live in some of these homes, so please treat them as urgent." : "",
    answers.health ? "We are worried these problems are affecting our health." : "",
    answers.access.trim() ? `To arrange access, we are available ${answers.access.trim().replace(/\.$/, "")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    subject: `Repairs needed at ${group.name} [${issues.map(issueRef).join(", ")}]`,
    body: `Dear ${ctx.landlordName?.trim() || "landlord"},

I am writing on behalf of ${households} ${households === 1 ? "household" : "households"} at ${group.name} about ${issues.length} repairs that have not been fixed.

${lines}${extras ? `\n\n${extras}` : ""}

Please reply by ${replyBy} with a date for each repair.

Yours sincerely,

${myName}
On behalf of ${group.name}

This message was prepared with Clamour. It is not legal advice.`,
  };
}
