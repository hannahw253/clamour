"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { issueStatus, lastActivity } from "@/prototype/clocks";
import { IssueCard, needsAttention } from "@/prototype/IssueCard";
import { effectiveRole, findGroup, useStore, visibleIssues } from "@/prototype/store";
import { ButtonLink, Loading } from "@/prototype/ui";

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
  const ownOnly = effectiveRole(s, group) === "submitter" && group.visibility === "own";

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 pt-5 pb-8">
      <div role="tablist" aria-label="Show" className="grid grid-cols-2 rounded-md border-2 border-line p-1">
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
            className={`min-h-11 rounded-sm text-[16px] font-bold ${tab === key ? "bg-ink text-paper" : "text-ink"}`}
          >
            {text}
          </button>
        ))}
      </div>

      {ownOnly ? (
        <p className="rounded-lg bg-concrete px-4 py-3 text-[15px] leading-[22px]">
          Your group shows you only the problems you logged. Admins can see everyone&rsquo;s.
        </p>
      ) : null}

      {list.length === 0 ? (
        <div className="flex flex-col gap-4 py-6">
          <p className="text-[20px] leading-7 font-bold">
            {tab === "open" ? "No problems logged yet" : "Nothing marked as fixed yet"}
          </p>
          {tab === "open" ? (
            <>
              <p className="text-[17px] leading-[26px] text-ink-muted">
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
