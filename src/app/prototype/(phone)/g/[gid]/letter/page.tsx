"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { issueClock, issueStatus } from "@/prototype/clocks";
import { Composer } from "@/prototype/Composer";
import { findGroup, permissions, useStore, visibleIssues } from "@/prototype/store";
import { issueRef } from "@/prototype/types";
import { RequestBanner, RequestSheet } from "@/prototype/Updates";
import { Button, Icon, Loading, PageTitle } from "@/prototype/ui";

export default function GroupLetterPage() {
  return (
    <Suspense fallback={<Loading />}>
      <GroupLetter />
    </Suspense>
  );
}

/**
 * One letter about several problems, on the phone (north star, document 8: Same journeys on both).
 * Pick the problems, optionally ask everyone for updates first, then write the group letter.
 */
function GroupLetter() {
  const { gid } = useParams<{ gid: string }>();
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean);
  const router = useRouter();
  const s = useStore();
  const [picked, setPicked] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  if (!group) return null;
  const base = `/prototype/g/${group.id}`;
  const can = permissions(s, group);

  if (!can.groupLetter) {
    return (
      <main className="flex flex-col gap-4 px-4 pt-5 pb-8">
        <PageTitle>One letter about several problems</PageTitle>
        <p className="text-[17px] leading-[26px]">Only admins can send letters in the group&rsquo;s name. You can still email about the problems you logged.</p>
      </main>
    );
  }

  const chosen = group.issues.filter((i) => ids.includes(i.id));
  if (chosen.length) {
    return <Composer group={group} issues={chosen} letterKey="group" back={`${base}/letter`} afterSent={() => base} />;
  }

  const open = visibleIssues(s, group).filter((i) => issueStatus(i) !== "fixed");
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const pickedIssues = open.filter((i) => picked.includes(i.id));

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 pt-4 pb-6">
      <Link href={`${base}/more`} className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start font-bold">
        <Icon name="back" /> More
      </Link>
      <PageTitle sub="Choose the problems to put in one letter to the landlord.">One letter about several problems</PageTitle>
      <RequestBanner group={group} issueIds={open.map((i) => i.id)} />
      <ul className="flex flex-col divide-y divide-line-subtle rounded-xl bg-concrete">
        {open.map((i) => (
          <li key={i.id}>
            <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
              <input type="checkbox" checked={picked.includes(i.id)} onChange={() => toggle(i.id)} className="mt-1 size-5 flex-none accent-[var(--ink)]" aria-label={`Select ${i.title}`} />
              <span className="flex flex-col">
                <span className="text-[16px] leading-[22px] font-bold">{i.title}</span>
                <span className="text-[14px] leading-[20px] text-ink-muted">
                  <span className="font-mono text-[13px]">{issueRef(i)}</span> · {issueClock(group, i).words}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 border-t border-line-subtle bg-paper px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <Button variant="primary" icon="letter" disabled={!picked.length} onClick={() => router.push(`${base}/letter?ids=${picked.join(",")}`)}>
          {picked.length ? `Write one letter about ${picked.length} ${picked.length === 1 ? "problem" : "problems"}` : "Choose problems first"}
        </Button>
        {can.askUpdates ? (
          <Button variant="ghost" icon="bell" disabled={!picked.length} onClick={() => setAsking(true)}>
            Ask for updates first
          </Button>
        ) : null}
      </div>
      <RequestSheet open={asking} onClose={() => setAsking(false)} group={group} issues={pickedIssues} />
    </main>
  );
}
