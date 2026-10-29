"use client";

import Link from "next/link";
import { nextAction } from "./actions";
import { issueClock, issueStatus } from "./clocks";
import type { Group, Issue } from "./types";
import { Chip, Icon } from "./ui";

export function StatusChips({ group, issue }: { group: Group; issue: Issue }) {
  const status = issueStatus(issue);
  const clock = issueClock(group, issue);
  return (
    <>
      {status === "fixed" ? (
        <Chip tone="done" icon="tick">
          Fixed
        </Chip>
      ) : status === "reported" ? (
        <Chip>Reported</Chip>
      ) : (
        <Chip>Open</Chip>
      )}
      {clock.tone === "missed" ? (
        <Chip tone="alarm" icon="warning">
          Deadline missed
        </Chip>
      ) : null}
    </>
  );
}

export function needsAttention(group: Group, issue: Issue) {
  return nextAction(group, issue).kind === "send";
}

/** One problem in the list: its title, where it stands, and what it needs from you. Nothing more (document 8: calm screens). */
export function IssueCard({ group, issue }: { group: Group; issue: Issue }) {
  const clock = issueClock(group, issue);
  const next = nextAction(group, issue);
  const yours = next.kind === "send";
  return (
    <Link
      href={`/prototype/g/${group.id}/i/${issue.id}`}
      className={`flex items-center gap-3 rounded-xl px-4 py-4 no-underline ${yours ? "bg-signal-soft" : "border border-line-subtle bg-paper"}`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 text-[18px] leading-6 font-bold">{issue.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-[22px] text-ink-muted">
          {clock.tone === "missed" ? (
            <Chip tone="alarm" icon="warning">
              Deadline missed
            </Chip>
          ) : null}
          <span>{clock.tone === "missed" ? clock.words.replace(/^Deadline missed: (.)/, (_, c: string) => c.toUpperCase()) : clock.words}</span>
        </span>
        {yours ? <span className="text-[15px] leading-[22px] font-bold">{next.headline}</span> : null}
      </span>
      <Icon name="arrow" className="text-ink-muted" />
    </Link>
  );
}
