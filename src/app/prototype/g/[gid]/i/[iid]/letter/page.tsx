"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { addWorkingDays, firstReport, issueClock } from "@/prototype/clocks";
import { addDays, daysBetween, letterDate, londonParts, todayYmd } from "@/prototype/dates";
import { addEntries, findGroup, myMember, useStore } from "@/prototype/store";
import type { Group, Issue, LetterKey, State } from "@/prototype/types";
import { Button, ChoiceCard, Icon, Loading, PageTitle, buttonClass, inputClass, label } from "@/prototype/ui";

/**
 * Letters follow the north star's templates (document 6): plain, calm English, no threats,
 * legal points only where the rule pack confirms them, health only if ticked, and the
 * app never sends anything itself.
 */
function buildLetter(key: LetterKey, s: State, group: Group, issue: Issue, health: boolean) {
  const report = firstReport(issue);
  const today = todayYmd();
  const where = issue.room ? ` (${issue.room})` : "";
  const firstDate = report ? letterDate(londonParts(report.at).ymd) : null;
  const sign = `Yours sincerely,\n\n${myMember(group)?.name ?? s.myName ?? "Your name"}\n${group.name}`;
  const footer = "This letter was prepared with Clamour. It is not legal advice.";
  const healthLine = health ? "\nI am worried this is affecting our health.\n" : "";
  const scotlandDamp =
    group.nation === "scotland" && issue.category === "damp_mould" && report && issueClock(group, issue).tone !== "informal";

  if (key === "repair_request") {
    return {
      subject: `Request for repairs at ${group.name}`,
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

  const days = report ? daysBetween(londonParts(report.at).ymd, today) : 0;
  const replyBy = letterDate(addDays(today, 7));
  const law = scotlandDamp
    ? `\nUnder Awaab's Law in Scotland, landlords must investigate reports of damp or mould within 10 working days. That date was ${letterDate(addWorkingDays(report!.at, 10))}.\n`
    : "";
  return {
    subject: `Reminder: repairs needed at ${group.name}`,
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

function Letter() {
  const { gid, iid } = useParams<{ gid: string; iid: string }>();
  const initial = useSearchParams().get("letter") === "reminder" ? "reminder" : "repair_request";
  const s = useStore();
  const [key, setKey] = useState<LetterKey>(initial);
  const [health, setHealth] = useState(false);
  const [edited, setEdited] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  const issue = group?.issues.find((i) => i.id === iid);
  if (!group || !issue) return null;

  const letter = buildLetter(key, s, group, issue, health);
  const body = edited ?? letter.body;
  const back = `/prototype/g/${group.id}/i/${issue.id}`;

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
        <ChoiceCard
          name="letter"
          value="repair_request"
          checked={key === "repair_request"}
          onChange={() => {
            setKey("repair_request");
            setEdited(null);
          }}
          title="Repair request"
          desc="Puts the problem in writing"
        />
        <ChoiceCard
          name="letter"
          value="reminder"
          checked={key === "reminder"}
          onChange={() => {
            setKey("reminder");
            setEdited(null);
          }}
          title="Reminder"
          desc="When nothing has happened"
        />
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

      {done ? (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-concrete px-4 py-3 text-[17px] leading-[26px] font-bold">
          <Icon name="tick" className="mt-[3px]" /> {done}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button variant="primary" icon="copy" onClick={copy}>
          Copy letter
        </Button>
        <a
          className={buttonClass("secondary")}
          href={`mailto:?subject=${encodeURIComponent(letter.subject)}&body=${encodeURIComponent(body)}`}
          onClick={() => record("Opened in your email app.")}
        >
          <Icon name="letter" />
          Open in email
        </a>
      </div>
    </main>
  );
}
