"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SCOTLAND_PACK, issueClock, issueStatus, nextStep, ruleLines } from "@/prototype/clocks";
import { longDate } from "@/prototype/dates";
import { AddEvidenceSheet, ReportSheet, WhenSheet, type Save } from "@/prototype/EvidenceSheet";
import { StatusChips } from "@/prototype/IssueCard";
import { Record } from "@/prototype/Record";
import { addEntries, effectiveRole, findGroup, useStore } from "@/prototype/store";
import { CATEGORY_LABEL, ME, issueRef } from "@/prototype/types";
import { Button, ButtonLink, Chip, Clock, Icon, Loading, SafetyBanner, label, safetyKind, type IconName } from "@/prototype/ui";

type SheetKind = "report" | "evidence" | "visit" | "fixed" | null;

export default function IssuePage() {
  return (
    <Suspense fallback={<Loading />}>
      <IssueDetail />
    </Suspense>
  );
}

function IssueDetail() {
  const { gid, iid } = useParams<{ gid: string; iid: string }>();
  const isNew = useSearchParams().get("new") === "1";
  const s = useStore();
  const [sheet, setSheet] = useState<SheetKind>(null);
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  const issue = group?.issues.find((i) => i.id === iid);
  if (!group || !issue) {
    return (
      <main className="px-4 py-8">
        <p className="text-[20px] font-bold">This problem isn&rsquo;t here any more.</p>
      </main>
    );
  }

  const role = effectiveRole(s, group);
  const canManage = role !== "submitter" || issue.createdBy === ME;
  const status = issueStatus(issue);
  const clock = issueClock(group, issue);
  const step = nextStep(group, issue);
  const rules = ruleLines(group, issue);
  const safety = safetyKind(issue.category, issue.title);
  const base = `/prototype/g/${group.id}/i/${issue.id}`;
  const letterHref = `${base}/letter`;

  // The one yellow action on the screen, chosen from the next sensible step.
  type Action = { key: string; text: string; icon: IconName; onClick?: () => void; href?: string };
  const actions: Record<string, Action> = {
    report: { key: "report", text: status === "open" ? "Tell your landlord" : "Log telling your landlord", icon: "send", onClick: () => setSheet("report") },
    confirm: { key: "confirm", text: "Confirm it in writing", icon: "letter", href: `${letterHref}?letter=confirm` },
    reminder: { key: "reminder", text: "Send a reminder", icon: "letter", href: `${letterHref}?letter=reminder` },
    visit: { key: "visit", text: "Record a landlord visit", icon: "door", onClick: () => setSheet("visit") },
    evidence: { key: "evidence", text: "Add evidence", icon: "plus", onClick: () => setSheet("evidence") },
    letter: { key: "letter", text: "Write a letter", icon: "letter", href: letterHref },
    fixed: { key: "fixed", text: "Mark as fixed", icon: "tick", onClick: () => setSheet("fixed") },
    case: { key: "case", text: "See the case file", icon: "folder", href: `${base}/case` },
  };
  let primaryKey =
    step === "Tell your landlord"
      ? "report"
      : step === "Confirm the conversation in writing"
        ? "confirm"
        : step === "Send a reminder"
          ? "reminder"
          : step === "Record when your landlord visits"
            ? "visit"
            : "evidence";
  if (!canManage && (primaryKey === "reminder" || primaryKey === "confirm")) primaryKey = "evidence";
  if (status === "fixed") primaryKey = "evidence";

  const secondary = (
    status === "fixed"
      ? ["evidence", "case"]
      : ["evidence", "report", ...(status === "reported" ? ["visit"] : []), ...(canManage ? ["letter", "fixed"] : []), "case"]
  ).filter((k) => k !== primaryKey);

  const save: Save = (entries) => {
    addEntries(group.id, issue.id, entries);
    setSheet(null);
  };

  const renderAction = (a: Action, variant: "primary" | "secondary") =>
    a.href ? (
      <ButtonLink key={a.key} href={a.href} variant={variant} icon={a.icon}>
        {a.text}
      </ButtonLink>
    ) : (
      <Button key={a.key} variant={variant} icon={a.icon} onClick={a.onClick}>
        {a.text}
      </Button>
    );

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-10">
      <Link href={`/prototype/g/${group.id}`} className="inline-flex min-h-11 items-center gap-1 self-start font-bold">
        <Icon name="back" /> All problems
      </Link>

      {isNew ? (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-concrete px-4 py-3 text-[17px] font-bold">
          <Icon name="tick" /> Saved to your group&rsquo;s record
        </p>
      ) : null}
      {safety && status !== "fixed" ? <SafetyBanner kind={safety} /> : null}

      <div className="flex flex-col gap-3">
        <p className={`${label} text-ink-muted`}>
          {issue.room ? `${issue.room} · ` : ""}
          {CATEGORY_LABEL[issue.category]}
        </p>
        <h1 className="text-[26px] leading-8 font-bold">{issue.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChips group={group} issue={issue} />
          <span className="font-mono text-[13px] text-ink-muted">{issueRef(issue)}</span>
        </div>
      </div>

      <Clock clock={clock} />

      <section aria-label="What to do next" className="flex flex-col gap-3">
        {step ? <p className="text-[17px] leading-[26px] font-bold">Next: {step}</p> : null}
        {status === "open" ? (
          <p className="text-[15px] leading-[22px] text-ink-muted">
            Record when and how you told them. Your group&rsquo;s clock starts from your first report.
          </p>
        ) : null}
        {primaryKey === "confirm" ? (
          <p className="text-[15px] leading-[22px] text-ink-muted">
            A conversation is hard to prove. A short message confirming what was said, sent today, turns it into a written
            record.
          </p>
        ) : null}
        {renderAction(actions[primaryKey], "primary")}
        <div className="grid grid-cols-1 gap-3">{secondary.map((k) => renderAction(actions[k], "secondary"))}</div>
        {status === "fixed" && canManage ? (
          <Button variant="ghost" className="self-start" onClick={() => save([{ kind: "reopened", at: new Date().toISOString() }])}>
            It&rsquo;s gone wrong again: reopen
          </Button>
        ) : null}
        {!canManage ? (
          <p className="text-[15px] leading-[22px] text-ink-muted">
            Only the person who logged this, or an admin, can mark it fixed or write letters about it. You can still add
            evidence.
          </p>
        ) : null}
      </section>

      {rules.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] leading-7 font-bold">Legal timescales</h2>
          <ul className="flex flex-col divide-y-2 divide-line-subtle rounded-lg border-2 border-line-subtle">
            {rules.map((r) => (
              <li key={r.label} className="flex flex-col gap-1 px-4 py-3">
                <span className="text-[17px] leading-6 font-bold">
                  {r.label}
                  {r.condition ? <span className="font-normal">, {r.condition}</span> : null}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-[15px] leading-[22px]">
                  {r.state === "met" ? (
                    <Chip tone="done" icon="tick">
                      In time
                    </Chip>
                  ) : r.state === "missed" ? (
                    <Chip tone="alarm" icon="warning">
                      Missed
                    </Chip>
                  ) : (
                    <Chip icon="clock">{longDate(r.due)}</Chip>
                  )}
                  {r.detail}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[15px] leading-[22px] text-ink-muted">
            From the Scottish Government&rsquo;s{" "}
            <a href={SCOTLAND_PACK.source.url} target="_blank" rel="noreferrer" className="font-bold text-ink underline">
              {SCOTLAND_PACK.source.title}
            </a>
            . Working days skip weekends and Scottish bank holidays. This isn&rsquo;t legal advice: for help, contact Shelter
            Scotland, Citizens Advice or your union.
          </p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[20px] leading-7 font-bold">Record</h2>
        <Record group={group} issue={issue} />
        <p className="text-[15px] leading-[22px] text-ink-muted">
          Entries can&rsquo;t be changed once saved. Corrections are added as new entries, so the record stays trustworthy.
        </p>
      </section>

      <ReportSheet open={sheet === "report"} onClose={() => setSheet(null)} onSave={save} group={group} issue={issue} />
      <AddEvidenceSheet open={sheet === "evidence"} onClose={() => setSheet(null)} onSave={save} group={group} issue={issue} />
      <WhenSheet
        open={sheet === "visit"}
        onClose={() => setSheet(null)}
        title="Record a landlord visit"
        whenLabel="When did they (or someone for them) come to look?"
        noteLabel="What did they say or do? (optional)"
        saveText="Save visit"
        onSave={(at, text) => save([{ kind: "visit", at, text }])}
      />
      <WhenSheet
        open={sheet === "fixed"}
        onClose={() => setSheet(null)}
        title="Mark as fixed"
        whenLabel="When was it fixed?"
        noteLabel="What was done? (optional)"
        saveText="Mark as fixed"
        onSave={(at, text) => save([{ kind: "fixed", at, text }])}
      />
    </main>
  );
}
