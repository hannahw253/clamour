"use client";

/**
 * Household updates and requests for updates (north star, document 6: What goes into a prepared
 * message; decision D-026). Every member adds their own household's context as dated updates on the
 * record; an owner or admin can ask everyone for updates before a date they'll write to the landlord.
 */

import Link from "next/link";
import { useState } from "react";
import { AFFECTED, household, myAnswers, openRequests, updateQuestions, updatesSince } from "./context";
import { addDays, longDate, shortDate, todayYmd } from "./dates";
import { addEntries, closeRequests, memberName, requestUpdates, setMyAffected } from "./store";
import { ME, type Affected, type AffectedKind, type Group, type Issue, type UpdateRequest } from "./types";
import { Button, Icon, Sheet, buttonClass, inputClass, panel, toggleClass, toastClass } from "./ui";

// ---- On the problem page --------------------------------------------------------------

/** "Aileen is writing to the landlord on Monday 2 November." Shown on the group and on each problem it covers. */
export function RequestBanner({
  group,
  issueIds,
  onAdd,
}: {
  group: Group;
  issueIds: string[];
  /** Opens "Add an update" for this problem; on the group page this is left out. */
  onAdd?: () => void;
}) {
  const requests = openRequests(group, issueIds);
  if (!requests.length) return null;
  return (
    <div className="flex flex-col gap-3">
      {requests.map((r) => (
        <RequestNote key={r.id} group={group} request={r} onAdd={onAdd} />
      ))}
    </div>
  );
}

/** One line, with the detail folded away (calm screens): who is writing, when, and the one thing to do. */
function RequestNote({ group, request, onAdd }: { group: Group; request: UpdateRequest; onAdd?: () => void }) {
  const mine = request.by === ME;
  const due = request.writeOn <= todayYmd();
  const since = updatesSince(group, request.issueIds, request.at);
  const problems = group.issues.filter((i) => request.issueIds.includes(i.id));
  const when = due ? "today" : `on ${shortDate(request.writeOn)}`;
  const linkOne = !mine && !onAdd && problems.length === 1;
  const listInside = !mine && !onAdd && problems.length > 1;
  const hasDetails = !!request.note || listInside || mine;
  return (
    <section aria-label="Request for updates" className="rounded-lg bg-signal-soft">
      <div className="flex items-center gap-3 px-4 py-2">
        <Icon name="ask" />
        <p className="flex-1 py-1.5 text-[0.9375rem] leading-[1.375rem]">
          {mine ? (
            <>
              <span className="font-bold">You&rsquo;re writing to the landlord {when}.</span> {since ? `${since} new ${since === 1 ? "update" : "updates"} since you asked.` : "No new updates yet."}
            </>
          ) : (
            <>
              <span className="font-bold">
                {memberName(group, request.by)} is writing to the landlord {when}.
              </span>{" "}
              Add yours before then.
            </>
          )}
        </p>
        {!mine && onAdd ? (
          <button type="button" onClick={onAdd} className="min-h-11 flex-none font-bold underline underline-offset-3">
            Add update
          </button>
        ) : linkOne ? (
          <Link href={`/prototype/g/${group.id}/i/${problems[0].id}?update=1`} className="inline-flex min-h-11 flex-none items-center font-bold underline underline-offset-3">
            Add update
          </Link>
        ) : null}
      </div>
      {hasDetails ? (
        <details className="group border-t border-ink/15 px-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-[0.9375rem] font-bold [&::-webkit-details-marker]:hidden">
            <Icon name="expand" size={16} className="transition-transform group-open:rotate-180" />
            {listInside ? "Add your update" : mine ? "Details" : "What they asked"}
          </summary>
          <div className="flex flex-col gap-2 pb-3">
            {request.note ? <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">&ldquo;{request.note}&rdquo;</p> : null}
            {listInside
              ? problems.map((p) => (
                  <Link key={p.id} href={`/prototype/g/${group.id}/i/${p.id}?update=1`} className="flex min-h-11 items-center font-bold underline underline-offset-3">
                    {p.title}
                  </Link>
                ))
              : null}
            {mine ? (
              <button type="button" onClick={() => closeRequests(group.id, { id: request.id })} className="min-h-11 self-start font-bold underline underline-offset-3">
                Cancel request
              </button>
            ) : null}
          </div>
        </details>
      ) : null}
    </section>
  );
}

// ---- Add an update ----------------------------------------------------------------------

export function UpdateSheet({ open, onClose, group, issue }: { open: boolean; onClose: () => void; group: Group; issue: Issue }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add an update">
      {open ? <UpdateForm key={issue.id} group={group} issue={issue} onDone={onClose} /> : null}
    </Sheet>
  );
}

const area = `${inputClass} min-h-20 py-3 text-[1.0625rem] leading-[1.625rem] `;

export function UpdateForm({ group, issue, onDone }: { group: Group; issue: Issue; onDone: () => void }) {
  const before = myAnswers(issue);
  const questions = updateQuestions(issue);
  const mineBefore = (issue.affected ?? []).filter((a) => a.by === ME);
  const [general, setGeneral] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>(before);
  const [affected, setAffected] = useState<Affected[]>(mineBefore);
  const [consent, setConsent] = useState(mineBefore.length > 0);
  const [letters, setLetters] = useState(mineBefore.some((a) => a.letters));
  const [caseFile, setCaseFile] = useState(mineBefore.some((a) => a.caseFile));
  const [error, setError] = useState<string | null>(null);
  const request = openRequests(group, [issue.id]).find((r) => r.by !== ME);
  const where = household(group, ME);

  const toggle = (kind: AffectedKind) =>
    setAffected(affected.some((a) => a.kind === kind) ? affected.filter((a) => a.kind !== kind) : [...affected, { kind, how: "", by: ME, consentAt: "", letters: false, caseFile: false }]);

  const save = () => {
    const withWords = affected.filter((a) => a.how.trim());
    if (withWords.length && !consent) {
      setError("Tick the box to say we can keep these health details, or remove them.");
      return;
    }
    const at = new Date().toISOString();
    const notes = [
      ...(general.trim() ? [{ kind: "note" as const, at, text: general.trim() }] : []),
      ...questions
        .filter((q) => (answers[q.key] ?? "").trim() && (answers[q.key] ?? "").trim() !== (before[q.key] ?? "").trim())
        .map((q) => ({ kind: "note" as const, at, topic: q.key, text: answers[q.key].trim() })),
    ];
    if (notes.length) addEntries(group.id, issue.id, notes);
    setMyAffected(
      group.id,
      issue.id,
      withWords.map((a) => ({ ...a, consentAt: a.consentAt || at, letters, caseFile })),
    );
    onDone();
  };

  return (
    <div className="flex flex-col gap-5">
      {request ? (
        <p className="flex items-start gap-2 rounded-lg bg-signal-soft px-3 py-2 text-[0.9375rem] leading-[1.375rem]">
          <Icon name="ask" className="mt-0.5" />
          <span>
            {memberName(group, request.by)} is writing to the landlord on {shortDate(request.writeOn)}. Anything you add now can go in.
          </span>
        </p>
      ) : null}
      <p className="text-[1.0625rem] leading-[1.625rem] text-ink-muted">
        For {group.type === "house" ? "you" : `your household${where !== memberName(group, ME) ? ` (${where})` : ""}`}. Answer what you can. Anyone writing to the landlord can include it.
      </p>

      <Area id="upd-general" label="What's happened?" placeholder="The patch has spread to the window frame" value={general} onChange={setGeneral} />
      {questions.map((q) => (
        <Area key={q.key} id={`upd-${q.key}`} label={q.label} placeholder={q.placeholder} value={answers[q.key] ?? ""} onChange={(v) => setAnswers({ ...answers, [q.key]: v })} />
      ))}

      <fieldset className={`flex flex-col gap-3 p-4 ${panel}`}>
        <legend className="sr-only">Who is affected?</legend>
        <p className="text-[1.0625rem] font-bold">Is anyone in your home affected more because of who they are?</p>
        <p className="text-[0.9375rem] leading-[1.25rem] text-ink-muted">
          Private to you and your group&rsquo;s admins. You decide whether letters can use it.
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AFFECTED) as AffectedKind[]).map((k) => {
            const on = affected.some((a) => a.kind === k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(k)}
                className={toggleClass(on)}
              >
                <Icon name={on ? "done" : "add"} size={16} />
                {AFFECTED[k].tick}
              </button>
            );
          })}
        </div>
        {affected.map((a, i) => (
          <Area
            key={a.kind}
            id={`aff-${a.kind}`}
            label={`${AFFECTED[a.kind].tick}: ${AFFECTED[a.kind].question.toLowerCase()}`}
            placeholder={AFFECTED[a.kind].placeholder}
            value={a.how}
            onChange={(v) => setAffected(affected.map((x, j) => (j === i ? { ...x, how: v } : x)))}
          />
        ))}
        {affected.length ? (
          <>
            <Check checked={consent} onChange={setConsent}>
              <span className="font-bold">I agree Clamour can keep these details.</span> You can delete them at any time.
            </Check>
            <Check checked={letters} onChange={setLetters}>
              Others in my group can include them in letters to the landlord
            </Check>
            <Check checked={caseFile} onChange={setCaseFile}>
              Include them in case files for an ombudsman or council
            </Check>
          </>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" className="text-[0.9375rem] font-bold text-alarm">
          {error}
        </p>
      ) : null}
      <Button variant="primary" onClick={save}>
        Save update
      </Button>
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-5 flex-none accent-[var(--ink)]" />
      <span className="text-[0.9375rem] leading-[1.375rem]">{children}</span>
    </label>
  );
}

function Area({ id, label: text, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[1rem] leading-[1.375rem] font-bold">
        {text}
      </label>
      <textarea id={id} className={area} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ---- Ask for updates ---------------------------------------------------------------------

export function RequestSheet({ open, onClose, group, issues }: { open: boolean; onClose: () => void; group: Group; issues: Issue[] }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ask for updates first">
      {open ? <RequestForm group={group} issues={issues} onDone={onClose} /> : null}
    </Sheet>
  );
}

function RequestForm({ group, issues, onDone }: { group: Group; issues: Issue[]; onDone: () => void }) {
  const today = todayYmd();
  const options = [
    { days: 2, text: "In 2 days" },
    { days: 3, text: "In 3 days" },
    { days: 7, text: "In a week" },
  ];
  const [writeOn, setWriteOn] = useState(addDays(today, 3));
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const others = group.members.filter((m) => m.id !== ME && m.status === "active").length;
  const about = issues.length === 1 ? issues[0].title.toLowerCase() : `${issues.length} problems`;
  const shareText = `I'm writing to the landlord about ${about} on ${longDate(writeOn)}. Please add your updates in Clamour before then: how it's affecting you, anything that's got worse, and photos.${note.trim() ? ` ${note.trim()}` : ""}`;

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className={toastClass}>
          <Icon name="done" className="mt-0.5" />
          Asked {others} {others === 1 ? "member" : "members"}. They&rsquo;ll get a notification, and see it on the problem.
        </p>
        <p className="text-[1rem] leading-[1.25rem] ">Most groups also talk in a chat. Share it there too, so nobody misses it.</p>
        <a className={buttonClass("secondary")} href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
          <Icon name="whatsapp" /> Share in WhatsApp
        </a>
        <Button
          icon="copy"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareText);
            } catch {
              // Copy can fail in some browsers.
            }
          }}
        >
          Copy the message
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[1rem] leading-[1.25rem] ">
        Everyone in your group gets a notification asking for their updates.
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[1rem] leading-[1.25rem] font-bold">When will you write?</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const ymd = addDays(today, o.days);
            const on = writeOn === ymd;
            return (
              <button
                key={o.days}
                type="button"
                aria-pressed={on}
                onClick={() => setWriteOn(ymd)}
                className={`inline-flex min-h-11 flex-col items-start justify-center rounded-lg border-2 px-4 py-1.5 text-left ${on ? "border-line bg-ink text-paper" : "border-line-subtle bg-paper"}`}
              >
                <span className="text-[0.9375rem] leading-[1.375rem] font-bold">{o.text}</span>
                <span className="text-[0.8125rem] leading-[1.125rem]">{shortDate(ymd)}</span>
              </button>
            );
          })}
        </div>
        <label className="mt-1 flex flex-col gap-1">
          <span className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">Or pick a date</span>
          <input type="date" className={inputClass} min={addDays(today, 1)} value={writeOn} onChange={(e) => e.target.value && setWriteOn(e.target.value)} />
        </label>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="req-note" className="text-[1rem] leading-[1.25rem] font-bold">
          Anything to ask for? (optional)
        </label>
        <textarea id="req-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Photos of any new damage would really help" />
      </div>
      <div className="flex flex-col gap-1 rounded-lg bg-concrete p-4">
        <p className="text-[0.8125rem] leading-[1.125rem] font-bold tracking-[0.08em] uppercase">What they&rsquo;ll see</p>
        <p className="text-[1.0625rem] leading-[1.625rem]">
          <span className="font-bold">{group.members.find((m) => m.id === ME)?.name ?? "Your name"} is writing to the landlord on {longDate(writeOn)}.</span> Please add your updates before then.
        </p>
      </div>
      <Button
        variant="primary"
        icon="ask"
        onClick={() => {
          requestUpdates(group.id, { issueIds: issues.map((i) => i.id), writeOn, note });
          setSent(true);
        }}
      >
        Ask for updates
      </Button>
    </div>
  );
}
