"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SCOTLAND_PACK, issueClock, issueStatus, nextStep, ruleLines } from "@/prototype/clocks";
import { fromLocalInput, longDate, stamp, toLocalInput } from "@/prototype/dates";
import { StatusChips } from "@/prototype/IssueCard";
import { PhotoPicker } from "@/prototype/PhotoPicker";
import { shortHash } from "@/prototype/photos";
import { addEntries, effectiveRole, findGroup, memberName, useStore } from "@/prototype/store";
import {
  CATEGORY_LABEL,
  ME,
  METHOD_LABEL,
  type Entry,
  type Group,
  type Issue,
  type Photo,
  type ReportMethod,
} from "@/prototype/types";
import {
  Button,
  ButtonLink,
  ChoiceCard,
  Chip,
  Clock,
  Field,
  Icon,
  Loading,
  SafetyBanner,
  Sheet,
  inputClass,
  label,
  safetyKind,
  type IconName,
} from "@/prototype/ui";

type SheetKind = "report" | "update" | "visit" | "fixed" | null;

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
  const letterHref = `/prototype/g/${group.id}/i/${issue.id}/letter`;

  // The one yellow action on the screen, chosen from the next sensible step.
  type Action = { key: string; text: string; icon: IconName; onClick?: () => void; href?: string };
  const actions: Record<string, Action> = {
    report: { key: "report", text: status === "open" ? "Tell your landlord" : "Log contact with your landlord", icon: "send", onClick: () => setSheet("report") },
    reminder: { key: "reminder", text: "Send a reminder", icon: "letter", href: `${letterHref}?letter=reminder` },
    visit: { key: "visit", text: "Record a landlord visit", icon: "door", onClick: () => setSheet("visit") },
    update: { key: "update", text: "Add photo or note", icon: "camera", onClick: () => setSheet("update") },
    letter: { key: "letter", text: "Write a letter", icon: "letter", href: letterHref },
    fixed: { key: "fixed", text: "Mark as fixed", icon: "tick", onClick: () => setSheet("fixed") },
  };
  let primaryKey =
    step === "Tell your landlord"
      ? "report"
      : step === "Send a reminder"
        ? "reminder"
        : step === "Record when your landlord visits"
          ? "visit"
          : "update";
  if (!canManage && primaryKey === "reminder") primaryKey = "update";
  if (status === "fixed") primaryKey = "update";

  const secondary = (
    status === "fixed"
      ? ["update"]
      : ["update", "report", ...(status === "reported" ? ["visit"] : []), ...(canManage ? ["letter", "fixed"] : [])]
  ).filter((k) => k !== primaryKey);

  const save = (entries: Parameters<typeof addEntries>[2]) => {
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
        <div className="flex flex-wrap gap-2">
          <StatusChips group={group} issue={issue} />
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
            photos and notes.
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

      <Record group={group} issue={issue} />

      <ReportSheet open={sheet === "report"} onClose={() => setSheet(null)} onSave={save} />
      <UpdateSheet open={sheet === "update"} onClose={() => setSheet(null)} onSave={save} />
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

// ---- The record ----------------------------------------------------------------

const ENTRY_TEXT: Record<Entry["kind"], { icon: IconName; text: (e: Entry) => string }> = {
  logged: { icon: "plus", text: () => "Logged the problem" },
  photo: { icon: "image", text: () => "Added a photo" },
  note: { icon: "note", text: () => "Added a note" },
  reported: { icon: "send", text: (e) => `Told the landlord: ${e.kind === "reported" ? METHOD_LABEL[e.method].toLowerCase() : ""}` },
  visit: { icon: "door", text: () => "Landlord visited" },
  letter: { icon: "letter", text: (e) => `Prepared a letter: ${e.kind === "letter" && e.letter === "reminder" ? "reminder" : "repair request"}` },
  fixed: { icon: "tick", text: () => "Marked as fixed" },
  reopened: { icon: "warning", text: () => "Reopened" },
};

function Record({ group, issue }: { group: Group; issue: Issue }) {
  const entries = [...issue.entries].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[20px] leading-7 font-bold">Record</h2>
      <ol className="flex flex-col">
        {entries.map((e, i) => {
          const meta = ENTRY_TEXT[e.kind];
          const late = Math.abs(new Date(e.recordedAt).getTime() - new Date(e.at).getTime()) > 10 * 60_000;
          return (
            <li key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex size-9 flex-none items-center justify-center rounded-full bg-concrete">
                  <Icon name={meta.icon} size={18} />
                </span>
                {i < entries.length - 1 ? <span className="w-0.5 flex-1 bg-line-subtle" /> : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 pb-5">
                <p className="text-[17px] leading-6">
                  <span className="font-bold">{memberName(group, e.by)}</span> · {meta.text(e)}
                </p>
                {e.text ? <p className="text-[17px] leading-[26px]">{e.text}</p> : null}
                {e.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local data URL
                  <img
                    src={e.photo.src}
                    alt={e.photo.alt || `Photo of ${issue.title.toLowerCase()}`}
                    className="mt-1 max-h-72 w-full rounded-md border-2 border-line-subtle object-cover"
                  />
                ) : null}
                <p className="font-mono text-[13px] leading-[18px] text-ink-muted">{stamp(e.at)}</p>
                {late ? (
                  <p className="font-mono text-[13px] leading-[18px] text-ink-muted">Put on the record {stamp(e.recordedAt)}</p>
                ) : null}
                {e.kind === "photo" ? (
                  <p className="font-mono text-[13px] leading-[18px] text-ink-muted">SHA-256 {shortHash(e.photo.sha256)}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-[15px] leading-[22px] text-ink-muted">
        Entries can&rsquo;t be changed once saved. Corrections are added as new entries, so the record stays trustworthy.
      </p>
    </section>
  );
}

// ---- Sheets --------------------------------------------------------------------

type Save = (entries: Parameters<typeof addEntries>[2]) => void;

function ReportSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: Save }) {
  return (
    <Sheet open={open} onClose={onClose} title="Tell your landlord">
      <ReportForm onSave={onSave} />
    </Sheet>
  );
}

function ReportForm({ onSave }: { onSave: Save }) {
  const [method, setMethod] = useState<ReportMethod>("email");
  const [when, setWhen] = useState(() => toLocalInput());
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave([{ kind: "reported", method, at: fromLocalInput(when), text: text.trim() || undefined }]);
      }}
    >
      <p className="text-[17px] leading-[26px]">
        Tell them the way you normally would, then record it here. Writing (email, text or letter) is easiest to prove.
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className={`${label} mb-2`}>How did you tell them?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(METHOD_LABEL) as ReportMethod[]).map((m) => (
            <ChoiceCard key={m} name="method" value={m} checked={method === m} onChange={(v) => setMethod(v as ReportMethod)} title={METHOD_LABEL[m]} />
          ))}
        </div>
      </fieldset>
      <Field id="report-when" title="When?">
        <input id="report-when" type="datetime-local" className={inputClass} value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <Field id="report-note" title="Anything to add? (optional)">
        <textarea
          id="report-note"
          className={`${inputClass} min-h-24 py-3 leading-[26px]`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Who you spoke to, or a reference number"
        />
      </Field>
      <Button type="submit" variant="primary">
        Save
      </Button>
    </form>
  );
}

function UpdateSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: Save }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add photo or note">
      <UpdateForm onSave={onSave} />
    </Sheet>
  );
}

function UpdateForm({ onSave }: { onSave: Save }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [text, setText] = useState("");
  const empty = !photos.length && !text.trim();
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (empty) return;
        const at = new Date().toISOString();
        onSave([
          ...photos.map((photo) => ({ kind: "photo" as const, at, photo, text: photo.alt || undefined })),
          ...(text.trim() ? [{ kind: "note" as const, at, text: text.trim() }] : []),
        ]);
      }}
    >
      <PhotoPicker photos={photos} onChange={setPhotos} />
      <Field id="update-note" title="Note">
        <textarea
          id="update-note"
          className={`${inputClass} min-h-24 py-3 leading-[26px]`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="It's spread to the window frame"
        />
      </Field>
      <Button type="submit" variant="primary" disabled={empty}>
        Save
      </Button>
    </form>
  );
}

function WhenSheet(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  whenLabel: string;
  noteLabel: string;
  saveText: string;
  onSave: (at: string, text?: string) => void;
}) {
  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.title}>
      <WhenForm {...props} />
    </Sheet>
  );
}

function WhenForm({ whenLabel, noteLabel, saveText, onSave }: { whenLabel: string; noteLabel: string; saveText: string; onSave: (at: string, text?: string) => void }) {
  const [when, setWhen] = useState(() => toLocalInput());
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(fromLocalInput(when), text.trim() || undefined);
      }}
    >
      <Field id="when" title={whenLabel}>
        <input id="when" type="datetime-local" className={inputClass} value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <Field id="when-note" title={noteLabel}>
        <textarea id="when-note" className={`${inputClass} min-h-24 py-3 leading-[26px]`} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary">
        {saveText}
      </Button>
    </form>
  );
}

