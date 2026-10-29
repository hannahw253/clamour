"use client";

/**
 * Household updates and requests for updates (north star, document 6: What goes into a prepared
 * message; decision D-026). Every member adds their own household's context as dated updates on the
 * record; an owner or admin can ask everyone for updates before a date they'll write to the landlord.
 */

import Link from "next/link";
import { useState } from "react";
import { AFFECTED, household, myAnswers, openRequests, updateQuestions, updateSummary, updatesSince } from "./context";
import { addDays, longDate, shortDate, todayYmd } from "./dates";
import { addEntries, closeRequests, memberName, requestUpdates, setMyAffected } from "./store";
import { ME, type Affected, type AffectedKind, type Group, type Issue, type UpdateRequest } from "./types";
import { Button, Icon, Sheet, buttonClass, inputClass } from "./ui";

// ---- On the problem page --------------------------------------------------------------

export function UpdatesCard({ group, issue, onOpen }: { group: Group; issue: Issue; onOpen: () => void }) {
  const sum = updateSummary(issue);
  const others = sum.households - (sum.mine ? 1 : 0);
  const line = sum.mine
    ? others
      ? `You and ${others} other ${others === 1 ? "household have" : "households have"} added updates`
      : "You've added yours. Add more as things change."
    : sum.households
      ? `${sum.households} ${sum.households === 1 ? "household has" : "households have"} added updates. Add yours`
      : group.type === "house"
        ? "Say how it affects you. Every letter can use it."
        : "Say how it affects your household. Every letter can use it.";
  return (
    <button type="button" onClick={onOpen} className="flex min-h-16 w-full items-center gap-3 rounded-xl bg-concrete px-4 py-3 text-left">
      <Icon name="note" size={22} />
      <span className="flex flex-1 flex-col">
        <span className="text-[16px] leading-[22px] font-bold">{sum.mine ? "Add an update" : "How is it affecting you?"}</span>
        <span className="text-[14px] leading-[20px] text-ink-muted">{line}</span>
      </span>
      <Icon name="arrow" />
    </button>
  );
}

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

function RequestNote({ group, request, onAdd }: { group: Group; request: UpdateRequest; onAdd?: () => void }) {
  const mine = request.by === ME;
  const today = todayYmd();
  const due = request.writeOn <= today;
  const since = updatesSince(group, request.issueIds, request.at);
  const problems = group.issues.filter((i) => request.issueIds.includes(i.id));
  return (
    <section aria-label="Request for updates" className="flex flex-col gap-2 rounded-xl border-2 border-line px-4 py-3">
      <p className="flex items-start gap-2 text-[16px] leading-[23px]">
        <Icon name="bell" className="mt-0.5 flex-none" />
        <span>
          {mine ? (
            <>
              <span className="font-bold">{due ? "Today's the day you said you'd write to the landlord." : `You're writing to the landlord on ${longDate(request.writeOn)}.`}</span>{" "}
              {since ? `${since} ${since === 1 ? "update has" : "updates have"} come in since you asked.` : "No new updates yet."}
            </>
          ) : (
            <>
              <span className="font-bold">
                {memberName(group, request.by)} is writing to the landlord {due ? "today" : `on ${longDate(request.writeOn)}`}.
              </span>{" "}
              Please add your updates before then.
            </>
          )}
        </span>
      </p>
      {request.note ? <p className="pl-7 text-[15px] leading-[22px] text-ink-muted">&ldquo;{request.note}&rdquo;</p> : null}
      {problems.length > 1 && onAdd ? (
        <p className="pl-7 text-[14px] leading-[20px] text-ink-muted">About: {problems.map((p) => p.title).join("; ")}</p>
      ) : null}
      {!onAdd && !mine ? (
        <ul className="flex flex-col pl-7">
          {problems.map((p) => (
            <li key={p.id}>
              <Link href={`/prototype/g/${group.id}/i/${p.id}?update=1`} className="flex min-h-11 items-center gap-1 font-bold underline underline-offset-3">
                Add your update: {p.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 pl-7 empty:hidden">
        {!mine && onAdd ? (
          <button type="button" onClick={onAdd} className="min-h-11 font-bold underline underline-offset-3">
            Add your update
          </button>
        ) : null}
        {mine ? (
          <button type="button" onClick={() => closeRequests(group.id, { id: request.id })} className="min-h-11 font-bold underline underline-offset-3">
            Cancel request
          </button>
        ) : null}
      </div>
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

const area = `${inputClass} min-h-20 py-3 text-[16px] leading-[24px]`;

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
        <p className="flex items-start gap-2 rounded-lg bg-signal-soft px-3 py-2 text-[15px] leading-[22px]">
          <Icon name="bell" size={18} className="mt-0.5 flex-none" />
          <span>
            {memberName(group, request.by)} is writing to the landlord on {shortDate(request.writeOn)}. Anything you add now can go in.
          </span>
        </p>
      ) : null}
      <p className="text-[16px] leading-[24px] text-ink-muted">
        For {group.type === "house" ? "you" : `your household${where !== memberName(group, ME) ? ` (${where})` : ""}`}. Answer what you can, in your own words. It goes on the record with today&rsquo;s date, and anyone writing to the landlord can include it.
      </p>

      <Area id="upd-general" label="What's happened?" placeholder="The patch has spread to the window frame" value={general} onChange={setGeneral} />
      {questions.map((q) => (
        <Area key={q.key} id={`upd-${q.key}`} label={q.label} placeholder={q.placeholder} value={answers[q.key] ?? ""} onChange={(v) => setAnswers({ ...answers, [q.key]: v })} />
      ))}

      <fieldset className="flex flex-col gap-3 rounded-xl bg-concrete p-4">
        <legend className="sr-only">Who is affected?</legend>
        <p className="text-[17px] font-bold">Is anyone in your home affected more because of who they are?</p>
        <p className="text-[14px] leading-[20px] text-ink-muted">
          Often what makes a landlord act fastest. Private to you and your group&rsquo;s admins. You decide whether letters can use it.
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
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-[15px] font-bold ${on ? "border-line bg-ink text-paper" : "border-line-subtle bg-paper"}`}
              >
                <Icon name={on ? "tick" : "plus"} size={16} />
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
        <p role="alert" className="text-[15px] font-bold text-alarm">
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
      <span className="text-[15px] leading-[22px]">{children}</span>
    </label>
  );
}

function Area({ id, label: text, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[16px] leading-[22px] font-bold">
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
        <p role="status" className="flex items-start gap-2 rounded-xl bg-done px-4 py-3 text-[16px] leading-[22px] font-bold text-on-done">
          <Icon name="tick" className="mt-0.5" />
          Asked {others} {others === 1 ? "member" : "members"}. They&rsquo;ll get a notification, and see it on the problem.
        </p>
        <p className="text-[16px] leading-[24px]">Most groups also talk in a chat. Share it there too, so nobody misses it.</p>
        <a className={buttonClass("secondary")} href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
          <Icon name="chat" /> Share in WhatsApp
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
      <p className="text-[16px] leading-[24px]">
        Everyone in your group gets a notification asking them to add their updates before you write. The letter is stronger with every household in it.
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[16px] font-bold">When will you write?</legend>
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
                className={`inline-flex min-h-11 flex-col items-start justify-center rounded-xl border-2 px-4 py-1.5 text-left ${on ? "border-line bg-ink text-paper" : "border-line-subtle bg-paper"}`}
              >
                <span className="text-[15px] font-bold">{o.text}</span>
                <span className="text-[13px]">{shortDate(ymd)}</span>
              </button>
            );
          })}
        </div>
        <label className="mt-1 flex flex-col gap-1">
          <span className="text-[15px] text-ink-muted">Or pick a date</span>
          <input type="date" className={inputClass} min={addDays(today, 1)} value={writeOn} onChange={(e) => e.target.value && setWriteOn(e.target.value)} />
        </label>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="req-note" className="text-[16px] font-bold">
          Anything to ask for? (optional)
        </label>
        <textarea id="req-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Photos of any new damage would really help" />
      </div>
      <div className="flex flex-col gap-1 rounded-xl bg-concrete p-4">
        <p className="text-[13px] font-bold tracking-[0.08em] uppercase">What they&rsquo;ll see</p>
        <p className="text-[16px] leading-[24px]">
          <span className="font-bold">{group.members.find((m) => m.id === ME)?.name ?? "Your name"} is writing to the landlord on {longDate(writeOn)}.</span> Please add your updates before then.
        </p>
      </div>
      <Button
        variant="primary"
        icon="bell"
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
