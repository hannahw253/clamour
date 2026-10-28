"use client";

import Link from "next/link";
import { issueClock, issueStatus, lastActivity, nextStep } from "./clocks";
import { stamp } from "./dates";
import { memberName } from "./store";
import { CATEGORY_LABEL, type Group, type Issue } from "./types";
import { Chip, Icon, label } from "./ui";

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
  const step = nextStep(group, issue);
  return step === "Tell your landlord" || step === "Send a reminder";
}

export function IssueCard({ group, issue }: { group: Group; issue: Issue }) {
  const clock = issueClock(group, issue);
  const step = nextStep(group, issue);
  const attention = needsAttention(group, issue);
  return (
    <Link
      href={`/prototype/g/${group.id}/i/${issue.id}`}
      className={`flex flex-col gap-3 rounded-lg border-2 border-line p-5 no-underline ${attention ? "bg-signal-soft" : "bg-paper"}`}
    >
      <p className={`${label} text-ink-muted`}>
        {issue.room ? `${issue.room} · ` : ""}
        {CATEGORY_LABEL[issue.category]}
      </p>
      <p className="line-clamp-2 text-[20px] leading-7 font-bold">{issue.title}</p>
      <div className="flex flex-wrap items-center gap-2 text-[15px] leading-[22px]">
        <StatusChips group={group} issue={issue} />
        <span className="inline-flex items-center gap-1">
          <Icon name="clock" size={16} />
          {clock.words}
        </span>
      </div>
      {step ? (
        <p className="flex items-center gap-1 text-[15px] leading-[22px] font-bold">
          Next: {step}
          <Icon name="arrow" size={16} />
        </p>
      ) : null}
      <p className="font-mono text-[13px] leading-[18px] text-ink-muted">
        Logged by {memberName(group, issue.createdBy)} · last entry {stamp(lastActivity(issue))}
      </p>
    </Link>
  );
}
