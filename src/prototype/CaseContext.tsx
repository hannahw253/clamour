"use client";

/**
 * "Make your case stronger" (north star, document 8: Ask once, at the right moment). A few
 * questions for this kind of problem, and who is affected and how, asked once and reused by
 * every message. Health details are private and need consent (document 5).
 */

import { useState } from "react";
import { AFFECTED, COMMON_QUESTIONS, CATEGORY_QUESTIONS, contextProgress } from "./context";
import { updateIssueContext } from "./store";
import { ME, type Affected, type AffectedKind, type Group, type Issue, type IssueContext } from "./types";
import { Button, Icon, Sheet, inputClass } from "./ui";

export function CaseContextCard({ issue, onOpen }: { issue: Issue; onOpen: () => void }) {
  const p = contextProgress(issue);
  const done = p.answered === p.total;
  return (
    <button type="button" onClick={onOpen} className="flex min-h-16 w-full items-center gap-3 rounded-xl bg-concrete px-4 py-3 text-left">
      <Icon name="note" size={22} />
      <span className="flex flex-1 flex-col">
        <span className="text-[16px] leading-[22px] font-bold">{done ? "Your case details" : "Make your case stronger"}</span>
        <span className="text-[14px] leading-[20px] text-ink-muted">
          {done
            ? `All answered${p.affected ? ` · ${p.affected} ${p.affected === 1 ? "person" : "people"} affected` : ""}. Used in every message.`
            : `${p.total - p.answered} quick ${p.total - p.answered === 1 ? "question" : "questions"} so your messages say what's really happening`}
        </span>
      </span>
      <Icon name="arrow" />
    </button>
  );
}

const area = `${inputClass} min-h-20 py-3 text-[16px] leading-[24px]`;

export function CaseContextSheet({ open, onClose, group, issue }: { open: boolean; onClose: () => void; group: Group; issue: Issue }) {
  return (
    <Sheet open={open} onClose={onClose} title="Make your case stronger">
      <ContextForm key={issue.id} group={group} issue={issue} onDone={onClose} />
    </Sheet>
  );
}

function ContextForm({ group, issue, onDone }: { group: Group; issue: Issue; onDone: () => void }) {
  const c = issue.context ?? {};
  const [started, setStarted] = useState(c.started ?? "");
  const [impact, setImpact] = useState(c.impact ?? "");
  const [fix, setFix] = useState(c.fix ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(c.answers ?? {});
  const [affected, setAffected] = useState<Affected[]>(c.affected ?? []);
  const [consent, setConsent] = useState(!!c.affected?.length);
  const [caseFile, setCaseFile] = useState(!!c.caseFileHealth);
  const [error, setError] = useState<string | null>(null);
  const questions = CATEGORY_QUESTIONS[issue.category];
  const common = { started: [started, setStarted], impact: [impact, setImpact], fix: [fix, setFix] } as const;
  const needsConsent = affected.some((a) => a.how.trim()) && !consent;

  const toggle = (kind: AffectedKind) =>
    setAffected(affected.some((a) => a.kind === kind) ? affected.filter((a) => a.kind !== kind) : [...affected, { kind, how: "", by: ME, consentAt: "" }]);

  const save = () => {
    if (needsConsent) {
      setError("Tick the box to say we can keep these health details, or remove them.");
      return;
    }
    const now = new Date().toISOString();
    const patch: Partial<IssueContext> = {
      started: started.trim() || undefined,
      impact: impact.trim() || undefined,
      fix: fix.trim() || undefined,
      answers,
      affected: affected.filter((a) => a.how.trim()).map((a) => ({ ...a, consentAt: a.consentAt || now })),
      caseFileHealth: caseFile,
    };
    updateIssueContext(group.id, issue.id, patch);
    onDone();
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[16px] leading-[24px] text-ink-muted">
        Answer what you can, in your own words. Every message about this problem will use it. You can speak instead of typing.
      </p>

      {COMMON_QUESTIONS.slice(0, 2).map((q) => (
        <Area key={q.key} id={`ctx-${q.key}`} label={q.label} placeholder={q.placeholder} value={common[q.key][0]} onChange={common[q.key][1]} />
      ))}
      {questions.map((q) => (
        <Area key={q.key} id={`ctx-${q.key}`} label={q.label} placeholder={q.placeholder} value={answers[q.key] ?? ""} onChange={(v) => setAnswers({ ...answers, [q.key]: v })} />
      ))}
      <Area id="ctx-fix" label={COMMON_QUESTIONS[2].label} placeholder={COMMON_QUESTIONS[2].placeholder} value={fix} onChange={setFix} />

      <fieldset className="flex flex-col gap-3 rounded-xl bg-concrete p-4">
        <legend className="sr-only">Who is affected?</legend>
        <p className="text-[17px] font-bold">Is anyone affected more because of who they are?</p>
        <p className="text-[14px] leading-[20px] text-ink-muted">
          This is often what makes a landlord act fastest. Private to you and your group&rsquo;s admins, and only included in a message when you tick it.
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
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 flex-none accent-[var(--ink)]" />
              <span className="text-[15px] leading-[22px]">
                <span className="font-bold">I agree Clamour can keep these health details.</span> You can delete them at any time.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={caseFile} onChange={(e) => setCaseFile(e.target.checked)} className="mt-1 size-5 flex-none accent-[var(--ink)]" />
              <span className="text-[15px] leading-[22px]">Include them in case files for an ombudsman or council</span>
            </label>
          </>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" className="text-[15px] font-bold text-alarm">
          {error}
        </p>
      ) : null}
      <Button variant="primary" onClick={save}>
        Save
      </Button>
    </div>
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

