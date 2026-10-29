/**
 * Prepared messages (north star, document 6): plain, calm English, no threats, legal points
 * only where the rule pack confirms them, personal details only when the member adds them,
 * and the issue reference in every subject.
 */

import { addWorkingDays, firstReport, issueClock, unconfirmedCall } from "./clocks";
import { addDays, daysBetween, letterDate, londonParts, todayYmd } from "./dates";
import { entrySummary, sortedEntries } from "./Record";
import type { AiFacts } from "@/lib/ai/rules";
import { addressLine, sentence, type Fact } from "./context";
import { CATEGORY_LABEL, LETTER_LABEL, NATION_LABEL, issueRef, type Group, type Issue, type LetterKey } from "./types";

/** What the member chose for this message: the facts ticked, this letter's prompt, and access times. */
export type Answers = { prompt: string; selected: Fact[]; access: string };

export const MESSAGE_TITLE: Record<LetterKey, string> = {
  repair_request: "Report the problem",
  reminder: "Send a reminder",
  confirm: "Confirm what was said",
  complaint: "Make a formal complaint",
  group: "Send a group letter",
};

const FOOTER = "This message was prepared with Clamour. It is not legal advice.";

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
  const address = addressLine(group, issue.createdBy);
  const myAddress = addressLine(group);
  const firstDate = report ? letterDate(londonParts(report.at).ymd) : null;
  const days = report ? daysBetween(londonParts(report.at).ymd, today) : 0;
  const replyBy = letterDate(addDays(today, 7));
  const ref = ` [${issueRef(issue)}]`;
  const short = group.address?.line?.trim() || group.name;
  const scotlandDamp =
    group.nation === "scotland" && issue.category === "damp_mould" && report && issueClock(group, issue).tone !== "informal";
  const law = scotlandDamp
    ? ` Under Awaab's Law in Scotland, landlords must investigate reports of damp or mould within 10 working days. That date was ${letterDate(addWorkingDays(report!.at, 10))}.`
    : "";

  const picked = (source: Fact["source"]) => answers.selected.filter((f) => f.source === source);
  const fix = answers.selected.find((f) => f.id === "fix");
  const wordFacts = picked("words").filter((f) => f.id !== "fix");
  const words = [
    ...wordFacts.filter((f) => f.id === "started").map((f) => f.text),
    key === "confirm" ? "" : sentence(answers.prompt),
    ...wordFacts.filter((f) => f.id !== "started").map((f) => f.text),
  ].filter(Boolean);
  const record = picked("record").filter((f) => !(key === "complaint" && f.id === "contacts"));

  const paras: string[] = [`Dear ${ctx.landlordName?.trim() || "landlord"},`];
  let subject = "";
  let request = "";

  if (key === "repair_request") {
    subject = `Repair needed at ${short}${ref}`;
    paras.push(`I am writing to report a repair needed at ${address}.`, `${issue.title}${issue.room ? ` (${issue.room})` : ""}.`);
    request = "Please let me know when someone can come to look at it.";
  } else if (key === "confirm") {
    const call = unconfirmedCall(issue);
    const how =
      call?.kind === "call" ? (call.direction === "in_person" ? "conversation" : "phone call") : call?.kind === "reported" && call.method === "in_person" ? "conversation" : "phone call";
    subject = `Confirming our ${how}${ref}`;
    paras.push(
      `I am writing to confirm our ${how}${call ? ` on ${letterDate(londonParts(call.at).ymd)} at ${time(call.at)}` : ""} about a repair at ${address}.`,
      `${issue.title}${issue.room ? ` (${issue.room})` : ""}.`,
    );
    const said = [call?.text ? `My note of what was said: ${call.text.trim().replace(/\.?$/, ".")}` : "", answers.prompt.trim() ? `You also said: ${sentence(answers.prompt)}` : ""].filter(Boolean);
    if (said.length) paras.push(said.join(" "));
    request = `If I have misunderstood anything, please reply by ${replyBy}.`;
  } else if (key === "complaint") {
    subject = `Formal complaint: repairs at ${short}${ref}`;
    paras.push(
      `I am making a formal complaint about how a repair at ${address} has been handled.`,
      `${issue.title}${issue.room ? ` (${issue.room})` : ""}.`,
      `${firstDate ? `This was first reported on ${firstDate}, ${days} days ago, and it has not been fixed.` : "It has not been fixed."}${law}`,
    );
    request = `Please treat this as a formal complaint under your complaints procedure. Please tell me in writing by ${replyBy} what you will do and when, and how I can take the complaint further if it is not resolved.`;
  } else {
    subject = `Reminder: repair still needed at ${short}${ref}`;
    paras.push(
      `I am writing again about a repair at ${address}.`,
      `${issue.title}${issue.room ? ` (${issue.room})` : ""}.`,
      `${firstDate ? `This was first reported on ${firstDate}, ${days} days ago, and it has not been fixed.` : "It has not been fixed."}${law}`,
    );
    request = `Please let me know by ${replyBy} when the work will be done.`;
  }

  if (words.length) paras.push(words.join(" "));
  const affected = picked("affected").map((f) => f.text);
  if (affected.length) paras.push(`${affected.join(" ")}${key === "confirm" ? "" : " Please treat this as urgent."}`);
  if (record.length) paras.push(`${key === "repair_request" ? "" : "Since it was first reported:\n"}${record.map((f) => (key === "repair_request" ? f.text : `- ${f.text}`)).join(key === "repair_request" ? " " : "\n")}`);
  if (key === "complaint") {
    const steps = sortedEntries(issue)
      .filter((e) => e.kind === "reported" || e.kind === "letter" || e.kind === "call" || e.kind === "visit" || e.kind === "email")
      .map((e) => `- ${letterDate(londonParts(e.at).ymd)}: ${entrySummary(e).text.replace(/^Prepared a letter/, "Letter")}`)
      .join("\n");
    paras.push(`What has happened so far:\n${steps || "- No contact recorded yet"}`);
  }
  if (fix) paras.push(fix.text);
  paras.push(request);
  if (answers.access) paras.push(answers.access);
  paras.push(`${key === "complaint" ? "Yours sincerely" : "Thank you"},\n\n${myName}\n${myAddress}`, FOOTER);

  return { subject, body: paras.join("\n\n") };
}

/** One letter about several problems in the same group: the "group letter of demands" in document 6. */
export function buildGroupMessage(
  ctx: { group: Group; issues: Issue[]; myName: string; landlordName?: string },
  answers: Pick<Answers, "access">,
): { subject: string; body: string } {
  const { group, issues, myName } = ctx;
  const today = todayYmd();
  const replyBy = letterDate(addDays(today, 7));
  const households = new Set(issues.map((i) => i.createdBy)).size;
  const place = group.address?.line?.trim() || group.name;
  const lines = issues
    .map((issue) => {
      const report = firstReport(issue);
      const clock = issueClock(group, issue);
      const first = report
        ? `First reported ${letterDate(londonParts(report.at).ymd)}, ${daysBetween(londonParts(report.at).ymd, today)} days ago.`
        : "Not reported before this letter.";
      const missed = clock.tone === "missed" ? ` Legal deadline missed: ${clock.value}.` : "";
      const impact = issue.context?.impact ? ` ${sentence(issue.context.impact)}` : "";
      return `- [${issueRef(issue)}] ${issue.title}${issue.room ? ` (${issue.room})` : ""}. ${first}${missed}${impact}`;
    })
    .join("\n");
  return {
    subject: `Repairs needed at ${place} [${issues.map(issueRef).join(", ")}]`,
    body: [
      `Dear ${ctx.landlordName?.trim() || "landlord"},`,
      `I am writing on behalf of ${households} ${households === 1 ? "household" : "households"} at ${place}${group.address?.postcode ? `, ${group.address.postcode}` : ""} about ${issues.length} repairs that have not been fixed.`,
      lines,
      `Please reply by ${replyBy} with a date for each repair.`,
      answers.access,
      `Yours sincerely,\n\n${myName}\nOn behalf of ${group.name}`,
      FOOTER,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

/**
 * The facts sent with an AI request: only what the message needs (north star, document 5: AI, least data).
 * Members' free-text notes aren't sent; anything personal reaches the AI only if it's already in the draft.
 */
export function aiFacts(key: LetterKey, group: Group, issues: Issue[], included: string[] = []): AiFacts {
  return {
    included,
    letter: LETTER_LABEL[key],
    group: group.name,
    nation: NATION_LABEL[group.nation],
    problems: issues.map((i) => {
      const r = firstReport(i);
      return {
        ref: issueRef(i),
        title: i.title,
        room: i.room,
        category: CATEGORY_LABEL[i.category],
        firstReported: r ? letterDate(londonParts(r.at).ymd) : undefined,
        standing: issueClock(group, i).words,
      };
    }),
    record: issues
      .flatMap((i) => sortedEntries(i).map((e) => ({ at: e.at, line: `${letterDate(londonParts(e.at).ymd)}: ${entrySummary(e).text}` })))
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(-14)
      .map((x) => x.line),
  };
}
