"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { issueStatus } from "@/prototype/clocks";
import { stamp } from "@/prototype/dates";
import { effectiveRole, fileUnsorted, findGroup, memberName, rejectUnsorted, useStore } from "@/prototype/store";
import { EMAIL_VIA_LABEL, ME, issueRef, type UnsortedEmail } from "@/prototype/types";
import { Button, Chip, Icon, Loading, PageTitle, inputClass } from "@/prototype/ui";

/** Emails that reached the group address without an issue reference (north star, document 8: Unsorted). */
export default function Unsorted() {
  const { gid } = useParams<{ gid: string }>();
  const s = useStore();
  const [choice, setChoice] = useState<Record<string, string>>({});
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  if (!group) return null;
  const isAdmin = effectiveRole(s, group) !== "submitter";
  const list = group.unsorted.filter((u) => isAdmin || u.memberId === ME);
  const issues = [...group.issues].sort((a, b) => Number(issueStatus(a) === "fixed") - Number(issueStatus(b) === "fixed"));

  const fromWho = (u: UnsortedEmail) => (u.memberId ? `${memberName(group, u.memberId)} (${u.from})` : u.from);

  return (
    <main className="flex flex-col gap-6 px-4 pt-5 pb-8">
      <Link href={`/prototype/g/${group.id}`} className="inline-flex min-h-11 items-center gap-1 self-start font-bold">
        <Icon name="back" /> All problems
      </Link>
      <PageTitle sub="These reached your group's email address without a problem reference. File each one under the right problem.">
        Emails to file
      </PageTitle>

      {list.length === 0 ? (
        <p className="text-[1.0625rem] leading-[1.625rem]">Nothing to file. Everything that arrived went straight to the right problem.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((u, i) => {
            const member = !!u.memberId;
            const selected = choice[u.id] ?? "";
            return (
              <li key={u.id} className="flex flex-col gap-3 rounded-lg border-2 border-line p-4">
                {!member ? (
                  <Chip tone="alarm" icon="warning">
                    Not from a member
                  </Chip>
                ) : null}
                <p className="text-[1.125rem] leading-[1.625rem] font-bold">{u.subject}</p>
                <p className="font-mono text-[0.8125rem] leading-[1.125rem] break-all text-ink-muted">
                  From {fromWho(u)} · {stamp(u.receivedAt)}
                </p>
                <p className="text-[1.0625rem] leading-[1.625rem]">{u.text}</p>
                <span className="flex flex-wrap gap-2">
                  <Chip>{EMAIL_VIA_LABEL[u.via]}</Chip>
                  {u.auth === "passed" ? (
                    <Chip tone="done" icon="verified">
                      Sender verified
                    </Chip>
                  ) : (
                    <Chip>Original sender can&rsquo;t be checked</Chip>
                  )}
                </span>
                {member ? (
                  <>
                    <label className="flex flex-col gap-2">
                      <span className="text-[0.9375rem] leading-[1.375rem] font-bold">Which problem is it about?</span>
                      <select
                        className={inputClass}
                        value={selected}
                        onChange={(e) => setChoice({ ...choice, [u.id]: e.target.value })}
                      >
                        <option value="">Choose a problem</option>
                        {issues.map((iss) => (
                          <option key={iss.id} value={iss.id}>
                            {issueRef(iss)} · {iss.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant={i === 0 ? "primary" : "secondary"} disabled={!selected} onClick={() => fileUnsorted(group.id, u.id, selected)}>
                        File it
                      </Button>
                      <Button variant="ghost" onClick={() => rejectUnsorted(group.id, u.id)}>
                        Not evidence
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">
                      Only members&rsquo; emails go on the record. If this is from a member using another address, ask them to
                      forward it from the address they joined with. Otherwise it&rsquo;s deleted after 14 days.
                    </p>
                    <Button variant="ghost" className="self-start" onClick={() => rejectUnsorted(group.id, u.id)}>
                      Delete it now
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
