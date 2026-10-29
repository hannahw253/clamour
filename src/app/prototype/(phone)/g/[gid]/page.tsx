"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { issueStatus, lastActivity } from "@/prototype/clocks";
import { IssueCard, needsAttention } from "@/prototype/IssueCard";
import { effectiveRole, findGroup, useStore, visibleIssues } from "@/prototype/store";
import { ME } from "@/prototype/types";
import { ButtonLink, Icon, Loading, panel, tabClass } from "@/prototype/ui";
import { RequestBanner } from "@/prototype/Updates";

export default function Issues() {
  const { gid } = useParams<{ gid: string }>();
  const s = useStore();
  const [tab, setTab] = useState<"open" | "fixed">("open");
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  if (!group) return null;

  const all = visibleIssues(s, group);
  const open = all.filter((i) => issueStatus(i) !== "fixed");
  const fixed = all.filter((i) => issueStatus(i) === "fixed");
  const list = (tab === "open" ? open : fixed).sort((a, b) => {
    const att = Number(needsAttention(group, b)) - Number(needsAttention(group, a));
    return att || lastActivity(b).localeCompare(lastActivity(a));
  });
  const ownOnly = effectiveRole(s, group) === "submitter" && group.access === "own_only";
  const toFile = group.unsorted.filter((u) => effectiveRole(s, group) !== "submitter" || u.memberId === ME).length;

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 pt-5 pb-8">
      <RequestBanner group={group} issueIds={all.map((i) => i.id)} />
      <div role="tablist" aria-label="Show" className="grid grid-cols-2 border-b-2 border-line-subtle">
        {(
          [
            ["open", `Open (${open.length})`],
            ["fixed", `Fixed (${fixed.length})`],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-0.5 ${tabClass(tab === key)}`}
          >
            {text}
          </button>
        ))}
      </div>

      {toFile ? (
        <Link
          href={`/prototype/g/${group.id}/unsorted`}
          className={`flex min-h-14 items-center gap-3 px-4 py-3 font-bold no-underline ${panel}`}
        >
          <Icon name="letter" />
          <span className="flex-1">
            {toFile} {toFile === 1 ? "email" : "emails"} to file
          </span>
          <Icon name="forward" />
        </Link>
      ) : null}

      {ownOnly ? (
        <p className="rounded-lg bg-concrete px-4 py-3 text-[0.9375rem] leading-[1.375rem]">
          Your group shows you only the problems you logged. Admins can see everyone&rsquo;s.
        </p>
      ) : null}

      {list.length === 0 ? (
        <div className="flex flex-col gap-4 py-6">
          <p className="text-[1.125rem] leading-[1.75rem] font-bold">
            {tab === "open" ? "No problems logged yet" : "Nothing marked as fixed yet"}
          </p>
          {tab === "open" ? (
            <>
              <p className="text-[1.0625rem] leading-[1.625rem] text-ink-muted">
                Take a photo of what&rsquo;s wrong and write one line. It takes about 30 seconds.
              </p>
              <ButtonLink href={`/prototype/g/${group.id}/add`} variant="primary" icon="camera">
                Log a problem
              </ButtonLink>
            </>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((issue) => (
            <li key={issue.id}>
              <IssueCard group={group} issue={issue} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
