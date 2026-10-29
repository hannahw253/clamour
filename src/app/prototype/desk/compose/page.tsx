"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { nextAction } from "@/prototype/actions";
import { issueClock } from "@/prototype/clocks";
import { Composer } from "@/prototype/Composer";
import { RecentActivity } from "@/prototype/Record";
import { findGroup, useStore } from "@/prototype/store";
import { LETTER_LABEL, issueRef, type LetterKey } from "@/prototype/types";
import { Loading } from "@/prototype/ui";

export default function DeskCompose() {
  return (
    <Suspense fallback={<Loading />}>
      <Compose />
    </Suspense>
  );
}

/** The composer at a keyboard, with the record beside it. Several problems make one group letter. */
function Compose() {
  const params = useSearchParams();
  const s = useStore();
  if (!s) return <Loading />;
  const group = findGroup(s, params.get("g") ?? "");
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);
  const issues = group?.issues.filter((i) => ids.includes(i.id)) ?? [];
  if (!group || !issues.length) return <p className="px-8 py-10">Nothing selected.</p>;

  const asked = params.get("letter");
  const next = nextAction(group, issues[0]);
  const key: LetterKey = asked && asked in LETTER_LABEL ? (asked as LetterKey) : next.kind === "send" ? next.letter : "reminder";
  const back = `/prototype/desk?g=${group.id}`;

  const aside =
    issues.length === 1 ? (
      <>
        <p className="font-mono text-[0.8125rem] text-ink-muted">{issueRef(issues[0])}</p>
        <h2 className="text-[1.125rem] leading-[1.75rem] font-bold">{issues[0].title}</h2>
        <p className="text-[0.9375rem] text-ink-muted">{issueClock(group, issues[0]).words}</p>
        <h3 className="pt-2 text-[1.0625rem] font-bold">Everything on the record</h3>
        <RecentActivity group={group} issue={issues[0]} />
      </>
    ) : (
      <>
        <h2 className="text-[1.125rem] leading-[1.75rem] font-bold">{issues.length} problems in this letter</h2>
        <ul className="flex flex-col divide-y divide-line-subtle">
          {issues.map((i) => (
            <li key={i.id} className="flex flex-col py-3">
              <span className="font-mono text-[0.8125rem] text-ink-muted">{issueRef(i)}</span>
              <span className="font-bold">{i.title}</span>
              <span className="text-[0.9375rem] text-ink-muted">{issueClock(group, i).words}</span>
            </li>
          ))}
        </ul>
        <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">Once it&rsquo;s sent, the letter is added to each problem&rsquo;s record and counts as a reminder for each.</p>
      </>
    );

  return <Composer group={group} issues={issues} letterKey={key} back={back} afterSent={() => `${back}`} aside={aside} />;
}
