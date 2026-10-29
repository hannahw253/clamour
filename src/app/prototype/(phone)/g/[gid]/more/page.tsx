"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { effectiveRole, findGroup, resetPrototype, updateSettings, useStore } from "@/prototype/store";
import { GroupAddress } from "@/prototype/GroupAddress";
import { ACCESS_LABEL, NATION_LABEL, TYPE_LABEL, type Access } from "@/prototype/types";
import { Button, ButtonLink, Icon, Loading, PageTitle, Sheet, label } from "@/prototype/ui";

export default function More() {
  const { gid } = useParams<{ gid: string }>();
  const router = useRouter();
  const s = useStore();
  const [confirm, setConfirm] = useState(false);
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  if (!group) return null;
  const role = effectiveRole(s, group);
  const isAdmin = role !== "submitter";

  return (
    <main className="flex flex-col gap-7 px-4 pt-5 pb-8">
      <PageTitle>More</PageTitle>

      <Link href="/prototype/settings" className="flex min-h-14 items-center gap-3 rounded-xl bg-concrete px-4 py-3 font-bold no-underline">
        <Icon name="settings" />
        <span className="flex flex-1 flex-col">
          Your settings
          <span className="text-[14px] font-normal text-ink-muted">Notifications, appearance, message defaults, your data</span>
        </span>
        <Icon name="arrow" />
      </Link>

      {isAdmin ? (
        <Link href={`/prototype/g/${group.id}/letter`} className="flex min-h-14 items-center gap-3 rounded-xl bg-concrete px-4 py-3 font-bold no-underline">
          <Icon name="letter" />
          <span className="flex flex-1 flex-col">
            One letter about several problems
            <span className="text-[14px] font-normal text-ink-muted">A group letter to the landlord, and asking everyone for updates first</span>
          </span>
          <Icon name="arrow" />
        </Link>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[20px] leading-7 font-bold">Group settings</h2>
        <dl className="flex flex-col divide-y-2 divide-line-subtle rounded-lg border-2 border-line-subtle">
          {[
            ["Type", TYPE_LABEL[group.type]],
            ["Nation", `${NATION_LABEL[group.nation]}${role === "owner" ? "" : " (only the owner can change this)"}`],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 px-4 py-3">
              <dt className={`${label} text-ink-muted`}>{k}</dt>
              <dd className="text-[17px] leading-6">{v}</dd>
            </div>
          ))}
        </dl>

        <label className={`flex items-start gap-3 rounded-lg bg-concrete px-4 py-3 ${isAdmin ? "cursor-pointer" : "opacity-70"}`}>
          <input
            type="checkbox"
            disabled={!isAdmin}
            checked={group.approval}
            onChange={(e) => updateSettings(group.id, { approval: e.target.checked })}
            className="mt-1 size-5 flex-none accent-[var(--ink)]"
          />
          <span className="flex flex-col">
            <span className="text-[17px] leading-6 font-bold">Approve new members before they join</span>
            <span className="text-[15px] leading-[22px] text-ink-muted">
              {isAdmin ? "Admins see requests at the top of Members." : "Only admins can change this."}
            </span>
          </span>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 flex flex-col">
            <span className="text-[17px] leading-6 font-bold">What can submitters see and add?</span>
            <span className="text-[15px] leading-[22px] text-ink-muted">
              {isAdmin
                ? "Admins always see everything. Nobody can change or delete what someone else added."
                : "Only admins can change this. Nobody can change or delete what someone else added."}
            </span>
          </legend>
          {(Object.keys(ACCESS_LABEL) as Access[]).map((a) => (
            <label
              key={a}
              className={`flex items-start gap-3 rounded-lg px-4 py-3 ${group.access === a ? "bg-signal-soft ring-2 ring-line" : "bg-concrete"} ${isAdmin ? "cursor-pointer" : "opacity-70"}`}
            >
              <input
                type="radio"
                name="access"
                disabled={!isAdmin}
                checked={group.access === a}
                onChange={() => updateSettings(group.id, { access: a })}
                className="mt-1 size-5 flex-none accent-[var(--ink)]"
              />
              <span className="flex flex-col">
                <span className="text-[17px] leading-6 font-bold">{ACCESS_LABEL[a].title}</span>
                <span className="text-[15px] leading-[22px] text-ink-muted">{ACCESS_LABEL[a].desc}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[20px] leading-7 font-bold">Capturing evidence by email</h2>
        <GroupAddress group={group} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[20px] leading-7 font-bold">Coming in the full app</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[17px] leading-[26px]">
          <li>Each problem&rsquo;s case file as a PDF for an ombudsman, council or tribunal, with original emails attached and a fingerprint anyone can check</li>
          <li>Sharing screenshots straight from WhatsApp into Clamour, on Android</li>
          <li>The group&rsquo;s audit log of who did what</li>
          <li>Reminders when a deadline is close or has passed</li>
          <li>Sign in with a code sent to your email, on any device</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-concrete p-4">
        <p className={label}>Prototype</p>
        <p className="text-[17px] leading-[26px]">
          Use &ldquo;Viewing as&rdquo; at the top to see what admins and submitters can do. Everything is stored in this
          browser only.
        </p>
        <ButtonLink href="/prototype" variant="secondary">
          Your groups
        </ButtonLink>
        <Button variant="danger" onClick={() => setConfirm(true)}>
          Clear everything
        </Button>
      </section>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Clear the prototype?">
        <p className="text-[17px] leading-[26px]">
          This deletes every group, problem and photo from this browser, so you can start fresh for the next interview.
        </p>
        <Button
          variant="danger"
          onClick={() => {
            resetPrototype();
            setConfirm(false);
            router.push("/prototype");
          }}
        >
          Clear everything
        </Button>
      </Sheet>
    </main>
  );
}
