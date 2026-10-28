"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { addWorkingDays, firstReport, issueClock, unconfirmedCall } from "@/prototype/clocks";
import { addDays, daysBetween, letterDate, londonParts, todayYmd } from "@/prototype/dates";
import { entrySummary, sortedEntries } from "@/prototype/Record";
import { addEntries, findGroup, myMember, useStore } from "@/prototype/store";
import { LETTER_LABEL, issueRef, type Group, type Issue, type LetterKey, type State } from "@/prototype/types";
import { Button, ChoiceCard, Icon, Loading, PageTitle, buttonClass, inputClass, label } from "@/prototype/ui";

const LETTER_DESC: Record<LetterKey, string> = {
  repair_request: "Puts the problem in writing",
  reminder: "When nothing has happened",
  confirm: "After a phone call or visit, so it's on record",
  complaint: "Starts your landlord's complaints process",
};

/**
 * Letters follow the north star's templates (document 6): plain, calm English, no threats,
 * legal points only where the rule pack confirms them, health only if ticked, the issue
 * reference in the subject, and the app never sends anything itself.
 */
function buildLetter(key: LetterKey, s: State, group: Group, issue: Issue, health: boolean) {
  const report = firstReport(issue);
  const today = todayYmd();
  const where = issue.room ? ` (${issue.room})` : "";
  const firstDate = report ? letterDate(londonParts(report.at).ymd) : null;
  const days = report ? daysBetween(londonParts(report.at).ymd, today) : 0;
  const replyBy = letterDate(addDays(today, 7));
  const sign = `Yours sincerely,\n\n${myMember(group)?.name ?? s.myName ?? "Your name"}\n${group.name}`;
  const footer = "This letter was prepared with Clamour. It is not legal advice.";
  const healthLine = health ? "\nI am worried this is affecting our health.\n" : "";
  const ref = ` [${issueRef(issue)}]`;
  const scotlandDamp =
    group.nation === "scotland" && issue.category === "damp_mould" && report && issueClock(group, issue).tone !== "informal";
  const law = scotlandDamp
    ? `\nUnder Awaab's Law in Scotland, landlords must investigate reports of damp or mould within 10 working days. That date was ${letterDate(addWorkingDays(report!.at, 10))}.\n`
    : "";

  if (key === "repair_request") {
    return {
      subject: `Request for repairs at ${group.name}${ref}`,
      body: `${letterDate(today)}

Dear landlord,

I am writing to ask for repairs at ${group.name}.

${issue.title}${where}.

${firstDate ? `I first reported this on ${firstDate}.` : "I am reporting this to you in writing today."}
${healthLine}
Please contact me to arrange a time for the work.

${sign}

${footer}`,
    };
  }

  if (key === "confirm") {
    const call = unconfirmedCall(issue);
    const when = call ? londonParts(call.at) : null;
    const how =
      call?.kind === "call" ? (call.direction === "in_person" ? "conversation" : "phone call") : call?.kind === "reported" && call.method === "in_person" ? "conversation" : "phone call";
    const who = call?.kind === "call" ? ` with ${call.with}` : "";
    const said = call?.text ? `\n\nMy note of what was said: ${call.text}` : "";
    return {
      subject: `Confirming our ${how} about ${group.name}${ref}`,
      body: `${letterDate(today)}

Dear landlord,

I am writing to confirm our ${how}${who}${when ? ` on ${letterDate(when.ymd)} at ${String(when.hour).padStart(2, "0")}:${String(when.minute).padStart(2, "0")}` : ""} about repairs at ${group.name}.

${issue.title}${where}.${said}

If I have misunderstood anything, please reply in writing by ${replyBy}.
${healthLine}
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
      body: `${letterDate(today)}

Dear landlord,

I am making a formal complaint about how repairs at ${group.name} have been handled.

${issue.title}${where}.

${firstDate ? `I first reported this on ${firstDate}, ${days} days ago, and it has not been fixed.` : "This has not been fixed."}
${law}${healthLine}
What has happened so far:
${steps || "- (no contact recorded yet)"}

Please treat this as a formal complaint under your complaints procedure. Please tell me in writing by ${replyBy} what you will do and when, and how I can take the complaint further if it is not resolved.

${sign}

${footer}`,
    };
  }

  return {
    subject: `Reminder: repairs needed at ${group.name}${ref}`,
    body: `${letterDate(today)}

Dear landlord,

I am writing again about repairs needed at ${group.name}.

${issue.title}${where}.

${firstDate ? `I first reported this on ${firstDate}, ${days} days ago, and it has not been fixed.` : "This has not been fixed."}
${law}${healthLine}
Please let me know by ${replyBy} when the work will be done.

${sign}

${footer}`,
  };
}

export default function LetterPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Letter />
    </Suspense>
  );
}

type CopyIn = "bcc" | "cc" | "none";

function Letter() {
  const { gid, iid } = useParams<{ gid: string; iid: string }>();
  const asked = useSearchParams().get("letter");
  const initial: LetterKey = asked && asked in LETTER_LABEL ? (asked as LetterKey) : "repair_request";
  const s = useStore();
  const [key, setKey] = useState<LetterKey>(initial);
  const [health, setHealth] = useState(false);
  const [copyIn, setCopyIn] = useState<CopyIn>("bcc");
  const [edited, setEdited] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  const issue = group?.issues.find((i) => i.id === iid);
  if (!group || !issue) return null;

  const letter = buildLetter(key, s, group, issue, health);
  const body = edited ?? letter.body;
  const back = `/prototype/g/${group.id}/i/${issue.id}`;
  const keys = (Object.keys(LETTER_LABEL) as LetterKey[]).filter((k) => k !== "confirm" || unconfirmedCall(issue) || key === "confirm");

  const record = (how: string) => {
    addEntries(group.id, issue.id, [{ kind: "letter", letter: key, at: new Date().toISOString(), text: how }]);
    setDone(`${how} It’s been added to the record.`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${letter.subject}\n\n${body}`);
      record("Copied to send from your own email or messages.");
    } catch {
      setDone("Couldn't copy on this device. Select the text and copy it yourself.");
    }
  };

  const mailto =
    `mailto:?subject=${encodeURIComponent(letter.subject)}&body=${encodeURIComponent(body)}` +
    (copyIn === "none" ? "" : `&${copyIn}=${encodeURIComponent(group.inbox)}`);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-10">
      <Link href={back} className="inline-flex min-h-11 items-center gap-1 self-start font-bold">
        <Icon name="back" /> Back to the problem
      </Link>
      <PageTitle sub="Check the details, then send it from your own email. Clamour never sends letters for you.">
        Write a letter
      </PageTitle>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${label} mb-2`}>Which letter?</legend>
        {keys.map((k) => (
          <ChoiceCard
            key={k}
            name="letter"
            value={k}
            checked={key === k}
            onChange={() => {
              setKey(k);
              setEdited(null);
              setDone(null);
            }}
            title={LETTER_LABEL[k]}
            desc={LETTER_DESC[k]}
          />
        ))}
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-concrete px-4 py-3">
        <input
          type="checkbox"
          checked={health}
          onChange={(e) => {
            setHealth(e.target.checked);
            setEdited(null);
          }}
          className="mt-1 size-5 flex-none accent-[var(--ink)]"
        />
        <span className="flex flex-col">
          <span className="text-[17px] leading-6 font-bold">Say it&rsquo;s affecting your health</span>
          <span className="text-[15px] leading-[22px] text-ink-muted">Only included if you tick this.</span>
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <p className={label}>Subject</p>
        <p className="text-[17px] leading-6 font-bold">{letter.subject}</p>
        <p className="text-[15px] leading-[22px] text-ink-muted">
          Keep <span className="font-mono">[{issueRef(issue)}]</span> in the subject. Replies that keep it are filed under
          this problem.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="letter-body" className={label}>
          Letter (you can edit it)
        </label>
        <textarea
          id="letter-body"
          className={`${inputClass} min-h-[420px] py-3 font-sans text-[16px] leading-[25px]`}
          value={body}
          onChange={(e) => setEdited(e.target.value)}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${label} mb-2`}>Copy your group in when you email it?</legend>
        <ChoiceCard name="copy" value="bcc" checked={copyIn === "bcc"} onChange={() => setCopyIn("bcc")} title="Yes, privately (BCC)" desc="Your landlord won't see it. Your email is saved as sent." />
        <ChoiceCard name="copy" value="cc" checked={copyIn === "cc"} onChange={() => setCopyIn("cc")} title="Yes, openly (CC)" desc="Your landlord will see it. Their reply-all is saved too." />
        <ChoiceCard name="copy" value="none" checked={copyIn === "none"} onChange={() => setCopyIn("none")} title="No" desc="Forward it to your group later if you change your mind." />
        <p className="font-mono text-[13px] leading-[18px] break-all text-ink-muted">{group.inbox}</p>
      </fieldset>

      {done ? (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-concrete px-4 py-3 text-[17px] leading-[26px] font-bold">
          <Icon name="tick" className="mt-[3px]" /> {done}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <a className={buttonClass("primary")} href={mailto} onClick={() => record(copyIn === "none" ? "Opened in your email app." : `Opened in your email app, with your group copied in (${copyIn.toUpperCase()}).`)}>
          <Icon name="letter" />
          Open in email
        </a>
        <Button icon="copy" onClick={copy}>
          Copy letter
        </Button>
      </div>
    </main>
  );
}
