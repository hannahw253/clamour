"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { approveMember, effectiveRole, findGroup, removeMember, setMemberRole, useStore } from "@/prototype/store";
import { ME, ROLE_LABEL, type Member } from "@/prototype/types";
import { Button, ButtonLink, Chip, Loading, PageTitle, Sheet } from "@/prototype/ui";

export default function Members() {
  const { gid } = useParams<{ gid: string }>();
  const s = useStore();
  const [managing, setManaging] = useState<Member | null>(null);
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  if (!group) return null;

  const role = effectiveRole(s, group);
  const isAdmin = role !== "submitter";
  const pending = group.members.filter((m) => m.status === "pending");
  const active = group.members
    .filter((m) => m.status === "active")
    .sort((a, b) => ["owner", "admin", "submitter"].indexOf(a.role) - ["owner", "admin", "submitter"].indexOf(b.role));

  return (
    <main className="desk-flow flex flex-col gap-6 px-4 pt-5 pb-8">
      <PageTitle>Members</PageTitle>

      {isAdmin && pending.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] leading-7 font-bold">Asking to join</h2>
          {pending.map((m, i) => (
            <div key={m.id} className="flex flex-col gap-3 rounded-lg border-2 border-line bg-signal-soft p-4">
              <div>
                <p className="text-[17px] leading-6 font-bold">
                  {m.name}
                  {m.flat ? `, ${m.flat}` : ""}
                </p>
                <p className="text-[15px] leading-[22px] text-ink-muted">Wants to join as a {m.role}</p>
              </div>
              <div className="flex gap-2">
                <Button variant={i === 0 ? "primary" : "secondary"} onClick={() => approveMember(group.id, m.id)}>
                  Approve
                </Button>
                <Button variant="ghost" onClick={() => removeMember(group.id, m.id)}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[20px] leading-7 font-bold">
          {active.length} {active.length === 1 ? "member" : "members"}
        </h2>
        <ul className="flex flex-col divide-y-2 divide-line-subtle rounded-lg border-2 border-line-subtle">
          {active.map((m) => {
            const canManage = isAdmin && m.role !== "owner" && m.id !== ME;
            return (
              <li key={m.id} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[17px] leading-6 font-bold">
                    {m.id === ME ? `${m.name} (you)` : m.name}
                  </p>
                  {m.flat ? <p className="text-[15px] leading-[22px] text-ink-muted">{m.flat}</p> : null}
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Chip tone={m.role === "owner" ? "done" : "neutral"}>{ROLE_LABEL[m.role]}</Chip>
                  {canManage ? (
                    <Button variant="ghost" className="min-h-11" onClick={() => setManaging(m)} aria-label={`Manage ${m.name}`}>
                      Manage
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {isAdmin ? (
        <ButtonLink href={`/prototype/g/${group.id}/invite`} variant={pending.length ? "secondary" : "primary"} icon="share">
          Invite people
        </ButtonLink>
      ) : (
        <p className="text-[15px] leading-[22px] text-ink-muted">Admins can invite people and manage members.</p>
      )}

      <Sheet open={managing !== null} onClose={() => setManaging(null)} title={managing ? managing.name : ""}>
        {managing ? (
          <div className="flex flex-col gap-3">
            <p className="text-[17px] leading-[26px]">
              {managing.name} is {managing.role === "admin" ? "an admin" : "a submitter"}.
            </p>
            <Button
              onClick={() => {
                setMemberRole(group.id, managing.id, managing.role === "admin" ? "submitter" : "admin");
                setManaging(null);
              }}
            >
              {managing.role === "admin" ? "Make submitter" : "Make admin"}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                removeMember(group.id, managing.id);
                setManaging(null);
              }}
            >
              Remove from group
            </Button>
            <p className="text-[15px] leading-[22px] text-ink-muted">
              If you remove them, they lose access straight away. Everything they added stays on the record.
            </p>
          </div>
        ) : null}
      </Sheet>
    </main>
  );
}
