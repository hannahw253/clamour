"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lockup } from "@/components/brand/Lockup";
import { issueStatus } from "@/prototype/clocks";
import { loadSamples, myMember, useStore } from "@/prototype/store";
import { NATION_LABEL, ROLE_LABEL, TYPE_LABEL } from "@/prototype/types";
import { Button, ButtonLink, Chip, Icon, Loading, PageTitle, label } from "@/prototype/ui";

export default function PrototypeHome() {
  const s = useStore();
  const router = useRouter();
  if (!s) return <Loading />;

  const trySample = () => {
    const id = loadSamples();
    router.push(`/prototype/g/${id}`);
  };

  if (s.groups.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-10 px-4 pt-10 pb-12">
        <div className="pb-6">
          <Lockup size={44} ground="paper" />
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-[44px] leading-[1.02] tracking-[0.01em] uppercase">Fix it together</h1>
          <p className="text-[17px] leading-[26px]">
            Clamour keeps one dated record of what needs fixing in your home, shared with the people you live with, your
            neighbours or your union branch.
          </p>
          <ul className="flex flex-col gap-2 text-[17px] leading-[26px]">
            {[
              "Log a problem with a photo in seconds",
              "Invite your group with a link, like a group chat",
              "See the legal deadline, or how long it has been",
              "Write to your landlord with the facts filled in",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Icon name="tick" className="mt-[3px]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <ButtonLink href="/prototype/new" variant="primary">
            Start a group
          </ButtonLink>
          <Button onClick={trySample}>Try a sample group</Button>
        </div>
        <p className="text-[15px] leading-[22px] text-ink-muted">
          This is a prototype for testing with renters. Nothing you enter leaves this device.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-6 pb-12">
      <Lockup size={28} ground="paper" tagline={false} />
      <PageTitle>Your groups</PageTitle>
      <ul className="flex flex-col gap-3">
        {s.groups.map((g) => {
          const me = myMember(g);
          const open = g.issues.filter((i) => issueStatus(i) !== "fixed").length;
          const pending = me?.status === "pending";
          return (
            <li key={g.id}>
              <Link
                href={`/prototype/g/${g.id}`}
                className="flex items-center gap-3 rounded-lg border-2 border-line bg-paper p-4 no-underline"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={`${label} text-ink-muted`}>
                    {TYPE_LABEL[g.type]} · {NATION_LABEL[g.nation]}
                  </span>
                  <span className="truncate text-[20px] leading-7 font-bold">{g.name}</span>
                  <span className="flex flex-wrap items-center gap-2 text-[15px] leading-[22px]">
                    {pending ? (
                      <Chip tone="signal">Waiting for approval</Chip>
                    ) : (
                      <>
                        <span>
                          {open} open {open === 1 ? "problem" : "problems"}
                        </span>
                        <Chip>{me ? ROLE_LABEL[me.role] : "Member"}</Chip>
                      </>
                    )}
                  </span>
                </span>
                <Icon name="arrow" />
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3">
        <ButtonLink href="/prototype/new" variant="primary" icon="plus">
          Start a group
        </ButtonLink>
        {!s.groups.some((g) => g.id.startsWith("sample-")) ? (
          <Button onClick={trySample}>Add the sample groups</Button>
        ) : null}
      </div>
      <Link href="/prototype/desk" className="flex items-center gap-3 rounded-xl bg-concrete px-4 py-3 no-underline">
        <Icon name="list" />
        <span className="flex flex-1 flex-col">
          <span className="font-bold">Open the dashboard</span>
          <span className="text-[15px] text-ink-muted">Every problem at once, for a computer</span>
        </span>
        <Icon name="arrow" />
      </Link>
    </main>
  );
}
