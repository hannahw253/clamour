"use client";

import Link from "next/link";
import { nextAction } from "./actions";
import { issueClock, issueStatus, lastActivity } from "./clocks";
import { stamp } from "./dates";
import { CATEGORY_LABEL, type Group, type Issue } from "./types";
import { Chip, Icon, label, panel, selectedPanel } from "./ui";

export function StatusChips({ group, issue }: { group: Group; issue: Issue }) {
  const status = issueStatus(issue);
  const clock = issueClock(group, issue);
  return (
    <>
      {status === "fixed" ? (
        <Chip tone="done" icon="fix">
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

/**
 * One problem in the list, as the brand kit's IssueCard: where it is, the title, where it stands,
 * and the last dated entry. A bold ink edge and a "Your turn" tag when it needs you (D-029).
 */
export function IssueCard({ group, issue }: { group: Group; issue: Issue }) {
  const clock = issueClock(group, issue);
  const next = nextAction(group, issue);
  const yours = next.kind === "send";
  const last = lastActivity(issue);
  const meta = [issue.room, CATEGORY_LABEL[issue.category]].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/prototype/g/${group.id}/i/${issue.id}`}
      className={`flex items-center gap-3 px-4 py-4 no-underline ${yours ? selectedPanel : panel}`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={`${label} text-ink-muted`}>{meta}</span>
        <span className="line-clamp-2 text-[1.125rem] leading-[1.5rem] font-bold">{issue.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] leading-[1.375rem]">
          {clock.tone === "missed" ? (
            <Chip tone="alarm" icon="warning">
              Deadline missed
            </Chip>
          ) : yours ? (
            <Chip tone="signal">Your turn</Chip>
          ) : null}
          <span className={yours ? "font-bold" : "text-ink-muted"}>{yours ? next.headline : clock.words}</span>
        </span>
        <span className="font-mono text-[0.8125rem] leading-[1.125rem] text-ink-muted uppercase">Last entry {stamp(last)}</span>
      </span>
      <Icon name="forward" className="text-ink-muted" />
    </Link>
  );
}
