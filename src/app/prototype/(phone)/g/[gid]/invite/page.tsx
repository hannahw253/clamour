"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { effectiveRole, findGroup, resetInvite, useStore } from "@/prototype/store";
import { Button, ButtonLink, Icon, Loading, PageTitle, Sheet } from "@/prototype/ui";

type LinkRole = "submitter" | "admin";

const ROLES: { role: LinkRole; title: string; desc: string }[] = [
  { role: "submitter", title: "Submitter link", desc: "Can log problems and add photos and notes" },
  { role: "admin", title: "Admin link", desc: "Can also invite, approve and manage members. Share with people you trust." },
];

export default function InvitePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Invites />
    </Suspense>
  );
}

function Invites() {
  const { gid } = useParams<{ gid: string }>();
  const isNew = useSearchParams().get("new") === "1";
  const s = useStore();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<LinkRole | null>(null);
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  if (!group) return null;
  const role = effectiveRole(s, group);
  const base = `/prototype/g/${group.id}`;

  if (role === "submitter") {
    return (
      <main className="flex flex-col gap-6 px-4 pt-5 pb-8">
        <PageTitle sub="Only admins can invite people, so links don't end up in the wrong chat.">Invite people</PageTitle>
        <p className="text-[17px] leading-[26px]">Ask an admin in your group to send you a link to pass on.</p>
        <ButtonLink href={`${base}/members`} variant="secondary">
          See who the admins are
        </ButtonLink>
      </main>
    );
  }

  const url = (r: LinkRole) => `${window.location.origin}/prototype/join/${group.invites[r]}`;

  const share = async (r: LinkRole) => {
    const link = url(r);
    const text = "You've been invited to a repair group on Clamour.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Clamour", text, url: link });
        setMessage(null);
        return;
      }
      await navigator.clipboard.writeText(link);
      setMessage(`${r === "admin" ? "Admin" : "Submitter"} link copied. Paste it into your group chat.`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setMessage("Couldn't share on this device. Try the WhatsApp button instead.");
    }
  };

  return (
    <main className="desk-flow flex flex-col gap-6 px-4 pt-5 pb-8">
      {isNew ? (
        <p role="status" className="desk-span flex items-center gap-2 rounded-lg bg-concrete px-4 py-3 text-[17px] font-bold">
          <Icon name="tick" /> {group.name} is set up
        </p>
      ) : null}
      <PageTitle sub="Share a link in your group chat. Anyone who opens it can ask to join with that role.">
        {isNew ? "Invite your group" : "Invite links"}
      </PageTitle>

      <ul className="flex flex-col gap-4">
        {ROLES.map(({ role: r, title, desc }) => (
          <li key={r} className="flex flex-col gap-3 rounded-lg bg-concrete p-4">
            <div>
              <p className="text-[17px] leading-6 font-bold">{title}</p>
              <p className="text-[15px] leading-[22px] text-ink-muted">{desc}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={r === "submitter" ? "primary" : "secondary"} icon="share" onClick={() => share(r)}>
                Share
              </Button>
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-line px-4 font-bold text-ink no-underline"
                href={`https://wa.me/?text=${encodeURIComponent(`You've been invited to a repair group on Clamour: ${url(r)}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
              <Button variant="ghost" onClick={() => setConfirmReset(r)}>
                Reset
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {message ? (
        <p role="status" className="rounded-lg border-2 border-line px-4 py-3 text-[17px] font-bold">
          {message}
        </p>
      ) : null}

      <p className="text-[15px] leading-[22px] text-ink-muted">
        {group.approval
          ? "New members wait for an admin to approve them before they can see anything."
          : "Anyone with a link joins straight away. You can turn on approval in More."}{" "}
        Link previews in chat apps never show your address or group name.
      </p>

      {isNew ? (
        <ButtonLink href={base} variant="secondary">
          Go to your group
        </ButtonLink>
      ) : (
        <Link href={`${base}/members`} className="desk-span inline-flex min-h-11 items-center gap-1 self-start font-bold">
          <Icon name="back" /> Members
        </Link>
      )}

      <Sheet open={confirmReset !== null} onClose={() => setConfirmReset(null)} title="Reset this link?">
        <p className="text-[17px] leading-[26px]">
          The old link will stop working. People who already joined stay in the group. Do this if a link was shared
          somewhere it shouldn&rsquo;t have been.
        </p>
        <Button
          variant="primary"
          onClick={() => {
            if (confirmReset) resetInvite(group.id, confirmReset);
            setMessage(`New ${confirmReset} link made. The old one no longer works.`);
            setConfirmReset(null);
          }}
        >
          Reset link
        </Button>
      </Sheet>
    </main>
  );
}
