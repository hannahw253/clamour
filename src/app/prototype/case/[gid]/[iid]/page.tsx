"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { SpannerC } from "@/components/brand/SpannerC";
import { SCOTLAND_PACK, firstReport, issueClock, issueStatus, ruleLines } from "@/prototype/clocks";
import { daysBetween, letterDate, londonParts, longDate, stamp, todayYmd } from "@/prototype/dates";
import { AFFECTED, CATEGORY_QUESTIONS, sentence } from "@/prototype/context";
import { fileSize } from "@/prototype/photos";
import { entrySummary, exhibitNumbers, sortedEntries } from "@/prototype/Record";
import { findGroup, memberName, myMember, useStore } from "@/prototype/store";
import { CATEGORY_LABEL, EMAIL_VIA_LABEL, NATION_LABEL, TYPE_LABEL, issueRef, type Entry, type Group, type Issue } from "@/prototype/types";
import { Button, Icon, Loading, buttonClass } from "@/prototype/ui";

/** A4 at 96 pixels per inch: the width the sheet is drawn at before it's scaled to fit the screen. */
const A4_WIDTH_PX = 794;

export default function CaseFilePage() {
  return (
    <Suspense fallback={<Loading />}>
      <CaseFile />
    </Suspense>
  );
}

/**
 * The case file (north star, document 4): an A4 document, on screen and on paper, whichever
 * device it was opened from. On a phone the page is scaled down to fit; printing or saving as
 * PDF always produces A4.
 */
function CaseFile() {
  const { gid, iid } = useParams<{ gid: string; iid: string }>();
  const fromDesk = useSearchParams().get("from") === "desk";
  const s = useStore();
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, (el.clientWidth - 24) / A4_WIDTH_PX));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [s]);

  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  const issue = group?.issues.find((i) => i.id === iid);
  if (!group || !issue) return <p className="px-6 py-10">This problem isn&rsquo;t here any more.</p>;

  const back = fromDesk ? `/prototype/desk?g=${group.id}` : `/prototype/g/${group.id}/i/${issue.id}`;
  const complaint = issue.entries.some((e) => (e.kind === "letter" || e.kind === "email") && e.letter === "complaint");
  const footer = `Clamour case file ${issueRef(issue)} · ${group.name} · prepared ${letterDate(todayYmd())}`;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-concrete print:bg-paper">
      <style>{`
        @page {
          size: A4;
          margin: 16mm 15mm 18mm;
          @bottom-left { content: ${JSON.stringify(footer)}; font: 8pt "Archivo", sans-serif; color: #4d4d4d; }
          @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt "Archivo", sans-serif; color: #4d4d4d; }
        }
      `}</style>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line-subtle bg-paper px-4 py-2 print:hidden">
        <Link href={back} className="inline-flex min-h-11 items-center gap-1 font-bold">
          <Icon name="back" /> Back
        </Link>
        <span className="flex-1 text-[15px] text-ink-muted"><span className="hidden sm:inline">Case file · </span>A4</span>
        {!complaint ? (
          <Link
            href={fromDesk ? `/prototype/desk/compose?g=${group.id}&ids=${issue.id}&letter=complaint` : `/prototype/g/${group.id}/i/${issue.id}/send?letter=complaint`}
            className={buttonClass("secondary", "min-h-10 max-sm:hidden")}
          >
            Write a formal complaint
          </Link>
        ) : null}
        <Button variant="primary" icon="send" className="min-h-10" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>

      <div ref={frame} className="flex flex-1 justify-center px-3 py-6 print:block print:p-0">
        <div style={{ ["--doc-zoom" as string]: scale }} className="[zoom:var(--doc-zoom)] print:[zoom:1]">
          <article className="doc-light w-[210mm] min-h-[297mm] px-[15mm] py-[16mm] shadow-[0_2px_16px_rgba(0,0,0,0.12)] print:w-auto print:min-h-0 print:p-0 print:shadow-none">
            <Document group={group} issue={issue} preparedBy={myMember(group)?.name ?? s.myName ?? "a member"} />
          </article>
        </div>
      </div>
    </div>
  );
}

// ---- The document ----------------------------------------------------------------

function side(e: Entry): "Group" | "Landlord" | null {
  if (e.kind === "reported" || e.kind === "letter" || e.kind === "post") return "Group";
  if (e.kind === "email") return e.direction === "to_landlord" ? "Group" : "Landlord";
  if (e.kind === "call") return e.direction === "they_called" ? "Landlord" : "Group";
  if (e.kind === "visit" || e.kind === "fixed") return "Landlord";
  return null;
}

function hashOf(e: Entry): string | null {
  if (e.kind === "photo" || e.kind === "messages") return e.photo.sha256;
  if ((e.kind === "post" || e.kind === "receipt") && e.photo) return e.photo.sha256;
  if (e.kind === "video" || e.kind === "chat_export") return e.file.sha256;
  return null;
}

const mono = "font-mono text-[8.5pt] leading-[12pt] text-ink-muted";

function H2({ children, n }: { children: ReactNode; n: number }) {
  return (
    <h2 className="mt-[8mm] mb-[3mm] flex items-baseline gap-2 border-b-2 border-line pb-[1.5mm] text-[13pt] leading-[17pt] font-bold break-after-avoid">
      <span className="font-mono text-[10pt] text-ink-muted">{n}.</span>
      {children}
    </h2>
  );
}

function Document({ group, issue, preparedBy }: { group: Group; issue: Issue; preparedBy: string }) {
  const report = firstReport(issue);
  const today = todayYmd();
  const days = report ? daysBetween(londonParts(report.at).ymd, today) : null;
  const clock = issueClock(group, issue);
  const rules = ruleLines(group, issue);
  const entries = sortedEntries(issue);
  const exhibits = exhibitNumbers(issue);
  const contact = entries.filter((e) => side(e));
  const complaint = entries.find((e) => (e.kind === "letter" || e.kind === "email") && e.letter === "complaint");
  const status = issueStatus(issue);

  const summary: [string, string][] = [
    ["Problem", `${issue.title}${issue.room ? ` (${issue.room})` : ""}`],
    ["Type", CATEGORY_LABEL[issue.category]],
    ["Home", `${group.name} · ${TYPE_LABEL[group.type]} · ${NATION_LABEL[group.nation]}`],
    ["Landlord", group.landlord?.name ? `${group.landlord.name}${group.landlord.email ? ` (${group.landlord.email})` : ""}` : "Not recorded"],
    ["First reported", report ? `${longDate(londonParts(report.at).ymd)}${days !== null ? `, ${days} days before this file` : ""}` : "Not yet reported"],
    ["Status", status === "fixed" ? "Fixed" : status === "reported" ? "Reported, not fixed" : "Not reported"],
    ["Where it stands", clock.words],
    ["Contact", `${contact.filter((e) => side(e) === "Group").length} from the group, ${contact.filter((e) => side(e) === "Landlord").length} from the landlord or someone for them`],
    ["Formal complaint", complaint ? `Made on ${longDate(londonParts(complaint.at).ymd)}` : "Not made yet"],
    ["Evidence", `${entries.length} entries, ${exhibits.size} exhibits`],
  ];
  const ctx = issue.context ?? {};
  const words: [string, string][] = [
    ...(ctx.started ? [["When it started", ctx.started] as [string, string]] : []),
    ...(ctx.impact ? [["What it stops us doing", ctx.impact] as [string, string]] : []),
    ...CATEGORY_QUESTIONS[issue.category].filter((q) => ctx.answers?.[q.key]?.trim()).map((q) => [q.label.replace(/\?$/, ""), ctx.answers![q.key]] as [string, string]),
    ...(ctx.worse ? [["What has got worse", ctx.worse] as [string, string]] : []),
    ...(ctx.fix ? [["What would fix it", ctx.fix] as [string, string]] : []),
    ...(ctx.caseFileHealth ? (ctx.affected ?? []).map((a) => [AFFECTED[a.kind].tick, a.how] as [string, string]) : []),
  ].map(([k, v]) => [k, sentence(v)] as [string, string]);

  return (
    <div className="font-sans text-[10pt] leading-[14pt] text-ink">
      <header className="flex items-start justify-between gap-6 border-b-2 border-line pb-[4mm]">
        <div className="flex items-center gap-2">
          <SpannerC size={30} color="var(--ink)" />
          <div>
            <p className="font-display text-[18pt] leading-none tracking-[0.01em] uppercase">Clamour</p>
            <p className="text-[8pt] font-semibold">for habitable homes</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-[16pt] leading-none uppercase">Case file</p>
          <p className={mono}>
            {issueRef(issue)} · prepared {letterDate(today)} by {preparedBy}
          </p>
        </div>
      </header>

      <h1 className="mt-[7mm] text-[20pt] leading-[25pt] font-bold">{issue.title}</h1>
      <p className="mt-[1mm] text-[11pt] text-ink-muted">
        {group.name}
        {issue.room ? ` · ${issue.room}` : ""}
      </p>

      <H2 n={1}>Summary</H2>
      <table className="w-full border-collapse">
        <tbody>
          {summary.map(([k, v]) => (
            <tr key={k} className="border-b border-line-subtle break-inside-avoid">
              <th className="w-[42mm] py-[1.6mm] pr-[4mm] text-left align-top font-semibold text-ink-muted">{k}</th>
              <td className="py-[1.6mm] align-top">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {words.length ? (
        <>
          <h3 className="mt-[5mm] mb-[2mm] text-[11pt] font-bold">In the household&rsquo;s own words</h3>
          <table className="w-full border-collapse">
            <tbody>
              {words.map(([k, v]) => (
                <tr key={k} className="border-b border-line-subtle break-inside-avoid">
                  <th className="w-[42mm] py-[1.6mm] pr-[4mm] text-left align-top font-semibold text-ink-muted">{k}</th>
                  <td className="py-[1.6mm] align-top">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {rules.length ? (
        <>
          <H2 n={2}>Legal deadlines</H2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line text-left text-[8.5pt] text-ink-muted uppercase">
                <th className="py-[1.5mm] font-bold">Duty</th>
                <th className="py-[1.5mm] font-bold">Due by</th>
                <th className="py-[1.5mm] font-bold">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.label} className="border-b border-line-subtle align-top break-inside-avoid">
                  <td className="py-[1.6mm] pr-[3mm]">
                    {r.label}
                    {r.condition ? `, ${r.condition}` : ""}
                    <span className="block text-[8.5pt] text-ink-muted">{r.detail}</span>
                  </td>
                  <td className="py-[1.6mm] pr-[3mm] whitespace-nowrap">{longDate(r.due)}</td>
                  <td className="py-[1.6mm] font-bold">{r.state === "met" ? "Met" : r.state === "missed" ? "Missed" : "Not yet due"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-[2mm] text-[8.5pt] text-ink-muted">
            Source: {SCOTLAND_PACK.source.title} ({SCOTLAND_PACK.source.url}), rule pack {SCOTLAND_PACK.version}. Working days exclude weekends and
            Scottish bank holidays.
          </p>
        </>
      ) : null}

      <H2 n={rules.length ? 3 : 2}>Chronology</H2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line text-left text-[8.5pt] text-ink-muted uppercase">
            <th className="w-[34mm] py-[1.5mm] font-bold">When</th>
            <th className="w-[22mm] py-[1.5mm] font-bold">Who</th>
            <th className="py-[1.5mm] font-bold">What happened</th>
            <th className="w-[16mm] py-[1.5mm] text-right font-bold">Exhibit</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const text = e.kind === "email" ? `“${e.subject}”` : e.text ? e.text : "";
            return (
              <tr key={e.id} className="border-b border-line-subtle align-top break-inside-avoid">
                <td className="py-[1.6mm] pr-[2mm] font-mono text-[8.5pt] leading-[12pt]">{stamp(e.at)}</td>
                <td className="py-[1.6mm] pr-[2mm]">{memberName(group, e.by)}</td>
                <td className="py-[1.6mm] pr-[2mm]">
                  <span className="font-semibold">{entrySummary(e).text}</span>
                  {side(e) ? <span className="text-ink-muted"> · {side(e)}</span> : null}
                  {text ? <span className="block">{text.length > 220 ? `${text.slice(0, 217)}…` : text}</span> : null}
                </td>
                <td className="py-[1.6mm] text-right font-bold">{exhibits.get(e.id) ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {exhibits.size ? (
        <section className="break-before-page">
          <H2 n={rules.length ? 4 : 3}>Exhibits</H2>
          <div className="flex flex-col gap-[6mm]">
            {entries
              .filter((e) => exhibits.has(e.id))
              .map((e) => (
                <Exhibit key={e.id} n={exhibits.get(e.id)!} e={e} group={group} issue={issue} />
              ))}
          </div>
        </section>
      ) : null}

      <section className="mt-[8mm] border-2 border-line p-[4mm] break-inside-avoid">
        <h2 className="text-[11pt] font-bold">What this record shows, and what it doesn&rsquo;t</h2>
        <p className="mt-[1.5mm]">
          It shows what members added, who added it, and when it reached Clamour, and that each file is unchanged since (its
          SHA-256 fingerprint is printed beside it). Emails marked &ldquo;sender verified&rdquo; passed their sender&rsquo;s own
          authenticity checks (SPF, DKIM and DMARC) when they arrived. It does not prove where a photo was taken, that a
          screenshot or chat export wasn&rsquo;t edited before it was added, or that a member&rsquo;s description is accurate.
        </p>
        <p className="mt-[1.5mm] text-[8.5pt] text-ink-muted">
          Prepared with Clamour. Not legal advice. In the full app this PDF carries its own fingerprint and an export ID that
          anyone can check on Clamour&rsquo;s verify page, and original emails are attached inside it.
        </p>
      </section>
    </div>
  );
}

function Exhibit({ n, e, group, issue }: { n: number; e: Entry; group: Group; issue: Issue }) {
  const hash = hashOf(e);
  const img =
    e.kind === "photo" || e.kind === "messages" ? e.photo : (e.kind === "post" || e.kind === "receipt") && e.photo ? e.photo : null;
  return (
    <article className="break-inside-avoid border-t border-line-subtle pt-[3mm]">
      <p className="text-[11pt] font-bold">
        Exhibit {n}. {entrySummary(e).text}
      </p>
      <p className={mono}>
        Added by {memberName(group, e.by)} · {stamp(e.at)}
        {Math.abs(new Date(e.recordedAt).getTime() - new Date(e.at).getTime()) > 10 * 60_000 ? ` · recorded ${stamp(e.recordedAt)}` : ""}
      </p>

      {e.kind === "email" ? (
        <div className="mt-[2mm] border border-line-subtle p-[3mm]">
          <table className="text-[9pt]">
            <tbody>
              {[
                ["From", e.from],
                ["To", e.to],
                ["Date", stamp(e.at)],
                ["Subject", e.subject],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th className="pr-[3mm] text-left align-top font-semibold text-ink-muted">{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {e.text ? <p className="mt-[2mm] whitespace-pre-wrap">{e.text}</p> : null}
          <p className="mt-[2mm] text-[9pt] font-semibold">
            {EMAIL_VIA_LABEL[e.via]} ·{" "}
            {e.auth === "passed"
              ? "Sender verified (SPF, DKIM and DMARC passed on arrival)"
              : e.auth === "lost"
                ? "Forwarded, so the original sender can’t be checked"
                : "Pasted in, not checked"}
          </p>
        </div>
      ) : null}

      {img ? (
        <figure className="mt-[2mm]">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
          <img
            src={img.src}
            alt={img.alt || `Exhibit ${n}: ${issue.title}`}
            className="max-h-[95mm] max-w-full border border-line-subtle object-contain"
          />
          {e.text ? <figcaption className="mt-[1mm]">{e.text}</figcaption> : null}
        </figure>
      ) : e.kind !== "email" && e.text ? (
        <p className="mt-[1.5mm]">{e.text}</p>
      ) : null}

      {e.kind === "chat_export" ? (
        <div className="mt-[2mm] border border-line-subtle p-[3mm] text-[9pt]">
          <p className="font-semibold">
            {e.count ? `${e.count} messages between ${e.participants.join(", ")}, ${e.first} to ${e.last}` : "Zip file with messages and media"}
          </p>
          {e.preview.length ? (
            <ul className="mt-[1.5mm]">
              {e.preview.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : null}
          <p className={mono}>
            {e.file.name} · {fileSize(e.file.bytes)}
          </p>
        </div>
      ) : null}
      {e.kind === "video" ? (
        <p className="mt-[1.5mm]">
          Video file {e.file.name}, {fileSize(e.file.bytes)}. Provided alongside this file.
        </p>
      ) : null}

      {hash ? <p className={`${mono} mt-[1.5mm]`}>SHA-256 {hash}</p> : null}
      {e.kind === "email" && e.via !== "pasted" ? <p className={`${mono} mt-[1.5mm]`}>Original email (.eml) attached in the full app</p> : null}
    </article>
  );
}

