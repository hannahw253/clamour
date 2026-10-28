"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { approveMember, findGroup, myMember, setViewAs, useStore } from "@/prototype/store";
import { ME, NATION_LABEL, ROLE_LABEL, TYPE_LABEL, type Role } from "@/prototype/types";
import { Button, ButtonLink, Icon, Loading, PageTitle, label, type IconName } from "@/prototype/ui";

export default function GroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { gid } = useParams<{ gid: string }>();
  const pathname = usePathname();
  const s = useStore();
  if (!s) return <Loading />;

  const group = findGroup(s, gid);
  if (!group) {
    return (
      <main className="flex flex-col gap-6 px-4 py-10">
        <PageTitle sub="It may have been reset, or made on another device.">Group not found</PageTitle>
        <ButtonLink href="/prototype" variant="primary">
          Your groups
        </ButtonLink>
      </main>
    );
  }

  const me = myMember(group);
  if (me?.status === "pending") {
    return (
      <main className="flex flex-1 flex-col gap-6 px-4 pt-10 pb-12">
        <PageTitle sub={`An admin of ${group.name} needs to approve you. We'll let you know by email when they do.`}>
          Waiting for approval
        </PageTitle>
        <p className="text-[17px] leading-[26px]">
          Until then you can&rsquo;t see the group&rsquo;s problems or members. That keeps everyone&rsquo;s details safe
          if a link is passed on.
        </p>
        <div className="flex flex-col gap-3 rounded-lg bg-concrete p-4">
          <p className={label}>Prototype only</p>
          <Button onClick={() => approveMember(group.id, ME)}>Pretend an admin approved me</Button>
        </div>
        <ButtonLink href="/prototype" variant="ghost" className="self-start">
          Back to your groups
        </ButtonLink>
      </main>
    );
  }

  const base = `/prototype/g/${group.id}`;
  const realRole = me?.role ?? "submitter";
  const role = s.viewAs ?? realRole;
  const tabs: { href: string; title: string; icon: IconName; match: (p: string) => boolean }[] = [
    { href: base, title: "Problems", icon: "list", match: (p) => p === base || p.startsWith(`${base}/i/`) },
    { href: `${base}/add`, title: "Add", icon: "plus", match: (p) => p === `${base}/add` },
    { href: `${base}/members`, title: "Members", icon: "people", match: (p) => p.startsWith(`${base}/members`) || p.startsWith(`${base}/invite`) },
    { href: `${base}/more`, title: "More", icon: "more", match: (p) => p.startsWith(`${base}/more`) },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-3 border-b-2 border-line-subtle px-4 pt-3 pb-3 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/prototype" className="inline-flex min-h-11 items-center gap-1 font-bold" aria-label="Your groups">
            <Icon name="back" /> Groups
          </Link>
          <label className="flex items-center gap-2 text-[15px] font-semibold">
            <span className="text-ink-muted">Viewing as</span>
            <select
              value={role}
              onChange={(e) => {
                const r = e.target.value as Role;
                setViewAs(r === realRole ? null : r);
              }}
              className="min-h-11 rounded-md border-2 border-line bg-paper px-2 font-bold text-ink"
            >
              {(["owner", "admin", "submitter"] as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                  {r === realRole ? " (you)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <p className={`${label} text-ink-muted`}>
            {TYPE_LABEL[group.type]} · {NATION_LABEL[group.nation]}
          </p>
          <p className="truncate text-[22px] leading-7 font-bold">{group.name}</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      <nav aria-label="Group" className="sticky bottom-0 z-10 border-t-2 border-line bg-paper pb-[env(safe-area-inset-bottom)] print:hidden">
        <ul className="grid grid-cols-4">
          {tabs.map((t) => {
            const active = t.match(pathname);
            const isAdd = t.title === "Add";
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[13px] font-bold no-underline ${
                    active ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {isAdd ? (
                    <span className="flex size-11 items-center justify-center rounded-md bg-ink text-paper">
                      <Icon name="plus" size={26} />
                    </span>
                  ) : (
                    <Icon name={t.icon} size={24} />
                  )}
                  <span className={isAdd ? "sr-only" : active ? "underline underline-offset-4 decoration-2" : ""}>
                    {isAdd ? "Add a problem" : t.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
