"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { approveMember, findGroup, myMember, useStore } from "@/prototype/store";
import { ME, NATION_LABEL, TYPE_LABEL } from "@/prototype/types";
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
  const tabs: { href: string; title: string; icon: IconName; match: (p: string) => boolean }[] = [
    { href: base, title: "Problems", icon: "list", match: (p) => p === base || p.startsWith(`${base}/i/`) },
    { href: `${base}/add`, title: "Add", icon: "plus", match: (p) => p === `${base}/add` },
    { href: `${base}/members`, title: "Members", icon: "people", match: (p) => p.startsWith(`${base}/members`) || p.startsWith(`${base}/invite`) },
    { href: `${base}/more`, title: "More", icon: "more", match: (p) => p.startsWith(`${base}/more`) },
  ];

  return (
    <div className="flex flex-1 flex-col">
      {pathname.startsWith(`${base}/i/`) ? null : (
        <header className="flex items-center gap-2 border-b border-line-subtle px-2 py-2 print:hidden">
          <Link href="/prototype" className="flex size-11 flex-none items-center justify-center" aria-label="Your groups">
            <Icon name="back" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[18px] leading-6 font-bold">{group.name}</p>
            <p className="text-[13px] leading-[18px] text-ink-muted">
              {TYPE_LABEL[group.type]} · {NATION_LABEL[group.nation]}
            </p>
          </div>
        </header>
      )}

      <div className="flex flex-1 flex-col">{children}</div>

      {/(\/send|\/case)$/.test(pathname) ? null : (
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
      )}
    </div>
  );
}
