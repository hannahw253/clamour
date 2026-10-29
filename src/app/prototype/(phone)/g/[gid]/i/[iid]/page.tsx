"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { openRequests } from "@/prototype/context";
import { SCOTLAND_PACK, issueClock, issueStatus, ruleLines, type ClockView } from "@/prototype/clocks";
import { longDate } from "@/prototype/dates";
import { AddEvidenceSheet, ReportSheet, WhenSheet, type Save } from "@/prototype/EvidenceSheet";
import { MESSAGE_TITLE } from "@/prototype/messages";
import { RecentActivity } from "@/prototype/Record";
import { RequestBanner, RequestSheet, UpdateSheet, UpdatesCard } from "@/prototype/Updates";
import { addEntries, findGroup, memberName, permissions, useStore } from "@/prototype/store";
import { nextFor } from "@/prototype/nextFor";
import { useDesktop } from "@/prototype/Frame";
import { CATEGORY_LABEL, ME, issueRef, type LetterKey } from "@/prototype/types";
import { Button, Chip, Icon, Loading, SafetyBanner, Sheet, buttonClass, label, safetyKind, type IconName } from "@/prototype/ui";

type SheetKind = "report" | "evidence" | "visit" | "fixed" | "more" | "update" | "request" | null;

export default function IssuePage() {
  return (
    <Suspense fallback={<Loading />}>
      <IssueDetail />
    </Suspense>
  );
}

const CLOCK_TONE = {
  informal: "bg-concrete text-ink",
  statutory: "bg-signal-soft text-ink",
  missed: "bg-alarm text-on-alarm",
  met: "bg-done text-on-done",
} as const;

function IssueDetail() {
  const { gid, iid } = useParams<{ gid: string; iid: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const sent = search.get("sent");
  const isNew = search.get("new") === "1";
  const s = useStore();
  const [sheet, setSheet] = useState<SheetKind>(() => (search.get("update") === "1" ? "update" : null));
  const [allDeadlines, setAllDeadlines] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const desktop = useDesktop();
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

  const can = permissions(s, group, issue);
  const canManage = can.manage;
  const canAsk = can.askUpdates;
  const status = issueStatus(issue);
  const clock = issueClock(group, issue);
  const rules = ruleLines(group, issue);
  const safety = safetyKind(issue.category, issue.title);
  const base = `/prototype/g/${group.id}/i/${issue.id}`;
  const next = nextFor(can, group, issue);

  const save: Save = (entries) => {
    addEntries(group.id, issue.id, entries);
    setSheet(null);
  };

  const primary =
    next.kind === "send" ? (
      <Link href={`${base}/send?letter=${next.letter}`} className={buttonClass("primary")}>
        <Icon name="letter" />
        {next.button}
      </Link>
    ) : next.kind === "case" ? (
      <Link href={`/prototype/case/${group.id}/${issue.id}`} className={buttonClass("primary")}>
        <Icon name="folder" />
        {next.button}
      </Link>
    ) : next.kind === "visit" ? (
      <Button variant="primary" icon="door" onClick={() => setSheet("visit")}>
        {next.button}
      </Button>
    ) : next.kind === "evidence" ? (
      <Button variant="primary" icon="plus" onClick={() => setSheet("evidence")}>
        {next.button}
      </Button>
    ) : next.kind === "update" ? (
      <Button variant="primary" icon="note" onClick={() => setSheet("update")}>
        {next.button}
      </Button>
    ) : null;

  const quick: { text: string; icon: IconName; onClick?: () => void; href?: string }[] = [
    !can.addEvidence
      ? { text: "Your update", icon: "note", onClick: () => setSheet("update") }
      : next.kind === "evidence"
        ? { text: "Log contact", icon: "send", onClick: () => setSheet("report") }
        : { text: "Add evidence", icon: "plus", onClick: () => setSheet("evidence") },
    { text: "Case file", icon: "folder", href: `/prototype/case/${group.id}/${issue.id}` },
    { text: "More", icon: "more", onClick: () => setSheet("more") },
  ];

  return (
    <main className="desk-issue flex flex-1 flex-col gap-6 px-4 pt-3 pb-10">
      <Link href={`/prototype/g/${group.id}`} className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start font-bold">
        <Icon name="back" /> Problems
      </Link>

      {sent ? (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-done px-4 py-3 text-[16px] leading-[22px] font-bold text-on-done">
          <Icon name="tick" className="mt-0.5" />
          {sent === "email" ? "Sent. Your group’s copy is on the record, and the sender is verified." : "Added to the record. A screenshot of what you sent will make it stronger."}
        </p>
      ) : isNew ? (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-concrete px-4 py-3 text-[16px] font-bold">
          <Icon name="tick" /> Saved to your group&rsquo;s record
        </p>
      ) : null}
      {safety && status !== "fixed" ? <SafetyBanner kind={safety} /> : null}
      <RequestBanner group={group} issueIds={[issue.id]} onAdd={() => setSheet("update")} />

      <header className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-8 font-bold">{issue.title}</h1>
        <p className="text-[15px] leading-[22px] text-ink-muted">
          {issue.room ? `${issue.room} · ` : ""}
          {CATEGORY_LABEL[issue.category]} · <span className="font-mono text-[13px]">{issueRef(issue)}</span>
        </p>
      </header>

      <StatusCard clock={clock} hasRules={rules.length > 0} open={allDeadlines} onToggle={() => setAllDeadlines(!allDeadlines)} />
      {allDeadlines && rules.length ? (
        <section className="-mt-3 flex flex-col gap-3 rounded-xl border border-line-subtle p-4">
          <ul className="flex flex-col gap-3">
            {rules.map((r) => (
              <li key={r.label} className="flex flex-col gap-1">
                <span className="text-[16px] leading-[22px] font-bold">
                  {r.label}
                  {r.condition ? <span className="font-normal">, {r.condition}</span> : null}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-[15px] leading-[22px] text-ink-muted">
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
          <p className="text-[13px] leading-[18px] text-ink-muted">
            <a href={SCOTLAND_PACK.source.url} target="_blank" rel="noreferrer" className="underline">
              {SCOTLAND_PACK.source.title}
            </a>
            . Not legal advice.
          </p>
        </section>
      ) : null}

      <section aria-label="Next step" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className={`${label} text-ink-muted`}>Next step</p>
          <h2 className="text-[22px] leading-7 font-bold">{next.headline}</h2>
          <p className="text-[16px] leading-[24px]">{next.why}</p>
        </div>
        {primary}
        {status === "open" ? (
          <button type="button" className="min-h-11 self-start font-bold underline underline-offset-3" onClick={() => setSheet("report")}>
            Already told them another way?
          </button>
        ) : null}
        {next.kind === "send" && canAsk && !openRequests(group, [issue.id]).some((r) => r.by === ME) ? (
          <button type="button" className="-mt-2 min-h-11 self-start font-bold underline underline-offset-3" onClick={() => setSheet("request")}>
            Ask your group for updates first
          </button>
        ) : null}
      </section>

      {status !== "fixed" ? <UpdatesCard group={group} issue={issue} onOpen={() => setSheet("update")} /> : null}

      <nav aria-label="Actions" className="grid grid-cols-3 gap-2">
        {quick.map((q) =>
          q.href ? (
            <Link key={q.text} href={q.href} className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl bg-concrete text-[14px] font-bold no-underline">
              <Icon name={q.icon} size={22} />
              {q.text}
            </Link>
          ) : (
            <button key={q.text} type="button" onClick={q.onClick} className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl bg-concrete text-[14px] font-bold">
              <Icon name={q.icon} size={22} />
              {q.text}
            </button>
          ),
        )}
      </nav>

      <section className="desk-side flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] leading-7 font-bold">{showAll || desktop ? "Everything on the record" : "Latest"}</h2>
          {issue.entries.length > 3 && !desktop ? (
            <button type="button" className="min-h-11 px-1 font-bold underline underline-offset-3" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show less" : `See all ${issue.entries.length}`}
            </button>
          ) : null}
        </div>
        <RecentActivity group={group} issue={issue} limit={showAll || desktop ? undefined : 3} />
      </section>

      <UpdateSheet open={sheet === "update"} onClose={() => setSheet(null)} group={group} issue={issue} />
      <RequestSheet open={sheet === "request"} onClose={() => setSheet(null)} group={group} issues={[issue]} />
      <ReportSheet open={sheet === "report"} onClose={() => setSheet(null)} onSave={save} group={group} issue={issue} />
      <AddEvidenceSheet open={sheet === "evidence"} onClose={() => setSheet(null)} onSave={save} group={group} issue={issue} />
      <WhenSheet
        open={sheet === "visit"}
        onClose={() => setSheet(null)}
        title="Record a landlord visit"
        whenLabel="When did they (or someone for them) come?"
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
      <Sheet open={sheet === "more"} onClose={() => setSheet(null)} title="More">
        <ul className="flex flex-col divide-y divide-line-subtle rounded-xl bg-concrete">
          {can.addEvidence ? <MoreRow icon="send" text="Log contact you've already made" onClick={() => setSheet("report")} /> : null}
          {canAsk && status !== "fixed" ? <MoreRow icon="bell" text="Ask your group for updates" onClick={() => setSheet("request")} /> : null}
          {status !== "open" && can.addEvidence ? <MoreRow icon="door" text="Record a landlord visit" onClick={() => setSheet("visit")} /> : null}
          {canManage
            ? (["repair_request", "reminder", "complaint"] as LetterKey[]).map((k) => (
                <MoreRow key={k} icon="letter" text={MESSAGE_TITLE[k]} onClick={() => router.push(`${base}/send?letter=${k}`)} />
              ))
            : null}
          {canManage && status !== "fixed" ? <MoreRow icon="tick" text="Mark as fixed" onClick={() => setSheet("fixed")} /> : null}
          {canManage && status === "fixed" ? (
            <MoreRow icon="warning" text="It's gone wrong again: reopen" onClick={() => save([{ kind: "reopened", at: new Date().toISOString() }])} />
          ) : null}
        </ul>
        {!canManage ? (
          <p className="text-[15px] leading-[22px] text-ink-muted">
            Only {memberName(group, issue.createdBy) === "You" ? "you" : memberName(group, issue.createdBy)}, who logged this, or an admin can send messages about it or mark it fixed
            {can.addEvidence ? "." : ", or add evidence. You can add your household's update."}
          </p>
        ) : null}
      </Sheet>
    </main>
  );
}

function StatusCard({ clock, hasRules, open, onToggle }: { clock: ClockView; hasRules: boolean; open: boolean; onToggle: () => void }) {
  const muted = clock.tone === "informal" || clock.tone === "statutory" ? "text-ink-muted" : "";
  return (
    <div className={`flex flex-col gap-1 rounded-xl px-5 py-4 ${CLOCK_TONE[clock.tone]}`}>
      {clock.lead ? <p className="text-[15px] leading-[22px] font-semibold">{clock.lead}</p> : null}
      <p className="font-display text-[40px] leading-[1.05] uppercase">{clock.value}</p>
      {clock.unit ? <p className="text-[15px] leading-[22px]">{clock.unit}</p> : null}
      <p className={`${label} ${muted} mt-1`}>{clock.note}</p>
      {hasRules ? (
        <button type="button" aria-expanded={open} onClick={onToggle} className="-mb-2 min-h-11 self-start text-[15px] font-bold underline underline-offset-3">
          {open ? "Hide deadlines" : "See all deadlines"}
        </button>
      ) : null}
    </div>
  );
}

function MoreRow({ icon, text, onClick }: { icon: IconName; text: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-[17px] font-bold">
        <Icon name={icon} />
        <span className="flex-1">{text}</span>
        <Icon name="arrow" />
      </button>
    </li>
  );
}
