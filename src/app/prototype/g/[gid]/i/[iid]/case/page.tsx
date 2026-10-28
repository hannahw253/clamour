"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { firstReport, issueClock, issueStatus, ruleLines } from "@/prototype/clocks";
import { daysBetween, letterDate, londonParts, longDate, stamp, todayYmd } from "@/prototype/dates";
import { shortHash } from "@/prototype/photos";
import { EmailCheck, Record, entrySummary, exhibitNumbers, sortedEntries } from "@/prototype/Record";
import { findGroup, memberName, myMember, useStore } from "@/prototype/store";
import { CATEGORY_LABEL, NATION_LABEL, issueRef, type Entry } from "@/prototype/types";
import { Button, ButtonLink, Chip, Icon, Loading, label } from "@/prototype/ui";

/** Who acted: the group, or the landlord (or someone for them). */
function side(e: Entry): "group" | "landlord" | null {
  if (e.kind === "reported" || e.kind === "letter" || e.kind === "post") return "group";
  if (e.kind === "email") return e.direction === "to_landlord" ? "group" : "landlord";
  if (e.kind === "call") return e.direction === "they_called" ? "landlord" : "group";
  if (e.kind === "messages") return "landlord";
  if (e.kind === "visit" || e.kind === "fixed") return "landlord";
  return null;
}

function hashOf(e: Entry): string | null {
  if (e.kind === "photo" || e.kind === "messages") return e.photo.sha256;
  if ((e.kind === "post" || e.kind === "receipt") && e.photo) return e.photo.sha256;
  if (e.kind === "video" || e.kind === "chat_export") return e.file.sha256;
  return null;
}

/** One issue's story for an ombudsman, council or tribunal (north star, document 4: the case file). */
export default function CaseFile() {
  const { gid, iid } = useParams<{ gid: string; iid: string }>();
  const s = useStore();
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  const issue = group?.issues.find((i) => i.id === iid);
  if (!group || !issue) return null;

  const report = firstReport(issue);
  const today = todayYmd();
  const days = report ? daysBetween(londonParts(report.at).ymd, today) : null;
  const clock = issueClock(group, issue);
  const rules = ruleLines(group, issue);
  const entries = sortedEntries(issue);
  const contact = entries.filter((e) => side(e));
  const exhibits = exhibitNumbers(issue);
  const complaint = entries.find((e) => e.kind === "letter" && e.letter === "complaint");
  const fromLandlord = contact.filter((e) => side(e) === "landlord").length;
  const fromGroup = contact.filter((e) => side(e) === "group").length;
  const back = `/prototype/g/${group.id}/i/${issue.id}`;

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 pt-4 pb-10 print:px-0">
      <Link href={back} className="inline-flex min-h-11 items-center gap-1 self-start font-bold print:hidden">
        <Icon name="back" /> Back to the problem
      </Link>

      <header className="flex flex-col gap-3 border-b-2 border-line pb-5">
        <p className={`${label} text-ink-muted`}>
          Case file · {issueRef(issue)} · {group.name} · {NATION_LABEL[group.nation]}
        </p>
        <h1 className="font-display text-[34px] leading-[1.05] tracking-[0.01em] uppercase">{issue.title}</h1>
        <p className="text-[15px] leading-[22px]">
          {issue.room ? `${issue.room} · ` : ""}
          {CATEGORY_LABEL[issue.category]}. Prepared by {myMember(group)?.name ?? "a member"} on {letterDate(today)}.
        </p>
        <p className="rounded-lg bg-concrete px-4 py-3 text-[15px] leading-[22px] print:hidden">
          Prototype preview. The full app makes this a PDF with the original photos and emails attached, its own
          fingerprint, and a page where anyone can check it.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] leading-7 font-bold">Summary</h2>
        <dl className="grid grid-cols-1 divide-y-2 divide-line-subtle rounded-lg border-2 border-line-subtle">
          {[
            ["Status", issueStatus(issue) === "fixed" ? "Fixed" : issueStatus(issue) === "reported" ? "Reported, not fixed" : "Not reported yet"],
            ["First reported", report ? `${longDate(londonParts(report.at).ymd)}${days !== null ? `, ${days} days ago` : ""}` : "Not yet"],
            ["Where it stands", clock.words],
            ["Contact", `${fromGroup} from the group, ${fromLandlord} from the landlord or someone for them`],
            ["Evidence", `${entries.length} entries, ${exhibits.size} exhibits with original files`],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 px-4 py-3">
              <dt className={`${label} text-ink-muted`}>{k}</dt>
              <dd className="text-[17px] leading-6">{v}</dd>
            </div>
          ))}
          <div className="flex flex-col gap-2 px-4 py-3">
            <dt className={`${label} text-ink-muted`}>Formal complaint</dt>
            <dd className="flex flex-col gap-2 text-[17px] leading-6">
              {complaint ? (
                <span>Made on {longDate(londonParts(complaint.at).ymd)}</span>
              ) : (
                <>
                  <span>Not made yet. Ombudsmen usually expect you to use the landlord&rsquo;s complaints process first.</span>
                  <ButtonLink href={`${back}/letter?letter=complaint`} className="self-start print:hidden">
                    Write a formal complaint
                  </ButtonLink>
                </>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {rules.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] leading-7 font-bold">Legal deadlines</h2>
          <ul className="flex flex-col gap-2">
            {rules.map((r) => (
              <li key={r.label} className="flex flex-wrap items-center gap-2 text-[17px] leading-6">
                {r.state === "met" ? (
                  <Chip tone="done" icon="tick">
                    In time
                  </Chip>
                ) : r.state === "missed" ? (
                  <Chip tone="alarm" icon="warning">
                    Missed
                  </Chip>
                ) : (
                  <Chip icon="clock">Due</Chip>
                )}
                <span>
                  {r.label} by {longDate(r.due)}
                  {r.condition ? `, ${r.condition}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[15px] leading-[22px] text-ink-muted">Awaab&rsquo;s Law, Scotland, rule pack 2026-10-06.</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] leading-7 font-bold">Contact with the landlord</h2>
        {contact.length ? (
          <ol className="flex flex-col divide-y-2 divide-line-subtle rounded-lg border-2 border-line-subtle">
            {contact.map((e) => {
              const ex = exhibits.get(e.id);
              return (
                <li key={e.id} className="flex flex-col gap-1 px-4 py-3 break-inside-avoid">
                  <span className="flex flex-wrap items-center gap-2">
                    <Chip>{side(e) === "landlord" ? "Landlord" : "Group"}</Chip>
                    <span className="font-mono text-[13px] text-ink-muted">{stamp(e.at)}</span>
                    {ex ? <span className="text-[13px] font-bold tracking-[0.08em] uppercase">Exhibit {ex}</span> : null}
                  </span>
                  <span className="text-[17px] leading-6">
                    <span className="font-bold">{memberName(group, e.by)}:</span> {entrySummary(e).text}
                    {e.kind === "email" ? ` “${e.subject}”` : ""}
                  </span>
                  {e.kind === "email" ? <EmailCheck e={e} /> : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-[17px]">No contact recorded yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] leading-7 font-bold">Full record</h2>
        <Record group={group} issue={issue} exhibits={exhibits} />
      </section>

      {exhibits.size ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] leading-7 font-bold">Exhibits</h2>
          <ol className="flex flex-col gap-2">
            {entries
              .filter((e) => exhibits.has(e.id))
              .map((e) => {
                const hash = hashOf(e);
                return (
                  <li key={e.id} className="flex flex-col gap-0.5 break-inside-avoid">
                    <span className="text-[17px] leading-6">
                      <span className="font-bold">Exhibit {exhibits.get(e.id)}.</span> {entrySummary(e).text}
                    </span>
                    <span className="font-mono text-[13px] leading-[18px] text-ink-muted">
                      {e.kind === "email" ? "Original email (.eml) attached" : hash ? `SHA-256 ${shortHash(hash)}` : ""} · recorded {stamp(e.recordedAt)}
                    </span>
                  </li>
                );
              })}
          </ol>
        </section>
      ) : null}

      <section className="flex flex-col gap-2 rounded-lg border-2 border-line p-4">
        <h2 className="text-[18px] leading-6 font-bold">What this record shows, and what it doesn&rsquo;t</h2>
        <p className="text-[15px] leading-[22px]">
          It shows what members added, who added it, and when it reached Clamour, and that files haven&rsquo;t changed
          since. Emails marked &ldquo;Sender verified&rdquo; passed their sender&rsquo;s own authenticity checks when they
          arrived. It doesn&rsquo;t prove where a photo was taken, that a screenshot or chat export wasn&rsquo;t edited
          before it was added, or that a member&rsquo;s description is accurate.
        </p>
      </section>

      <Button variant="primary" icon="send" onClick={() => window.print()} className="print:hidden">
        Print or save as PDF
      </Button>
    </main>
  );
}
