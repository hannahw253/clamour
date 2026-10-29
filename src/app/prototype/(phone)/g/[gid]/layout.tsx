"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useDesktop } from "@/prototype/Frame";
import { approveMember, findGroup, myMember, useStore } from "@/prototype/store";
import { ME, NATION_LABEL, TYPE_LABEL } from "@/prototype/types";
import { Button, ButtonLink, Icon, Loading, PageTitle, label, type IconName } from "@/prototype/ui";

export default function GroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { gid } = useParams<{ gid: string }>();
  const pathname = usePathname();
  const s = useStore();
  const desktop = useDesktop();
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
        <p className="text-[1.0625rem] leading-[1.625rem] ">
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
    { href: base, title: "Problems", icon: "problems", match: (p) => p === base || p.startsWith(`${base}/i/`) },
    { href: `${base}/add`, title: "Add", icon: "add", match: (p) => p === `${base}/add` },
    { href: `${base}/members`, title: "Members", icon: "members", match: (p) => p.startsWith(`${base}/members`) || p.startsWith(`${base}/invite`) },
    { href: `${base}/more`, title: "More", icon: "more", match: (p) => p.startsWith(`${base}/more`) },
  ];

  if (desktop) {
    // On the desktop the group's problems are the dashboard; the other tabs sit along the top.
    const deskTabs = [
      { href: `/prototype/desk?g=${group.id}`, title: "Problems", active: pathname.startsWith(`${base}/i/`) },
      { href: `${base}/add`, title: "Add a problem", active: pathname === `${base}/add` },
      { href: `${base}/members`, title: "Members", active: pathname.startsWith(`${base}/members`) || pathname.startsWith(`${base}/invite`) },
      { href: `${base}/more`, title: "Settings and more", active: pathname.startsWith(`${base}/more`) || pathname.startsWith(`${base}/letter`) },
    ];
    return (
      <div className="flex flex-1 flex-col">
        <section aria-label={group.name} className="flex flex-col gap-2 border-b border-line-subtle px-6 pt-4 print:hidden">
          <div>
            <p className="text-[1.375rem] leading-[1.75rem] font-bold">{group.name}</p>
            <p className="text-[0.9375rem] text-ink-muted">
              {TYPE_LABEL[group.type]} · {NATION_LABEL[group.nation]}
            </p>
          </div>
          <nav aria-label="Group" className="-mb-px flex gap-1">
            {deskTabs.map((t) => (
              <Link
                key={t.title}
                href={t.href}
                aria-current={t.active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-[3px] px-3 text-[0.9375rem] font-bold no-underline ${t.active ? "border-line text-ink" : "border-transparent text-ink-muted"}`}
              >
                {t.title}
              </Link>
            ))}
          </nav>
        </section>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {pathname.startsWith(`${base}/i/`) ? null : (
        <header className="on-ink flex items-center gap-2 bg-brand-ink px-2 pt-1 pb-4 text-brand-paper print:hidden">
          <Link href="/prototype" className="flex size-11 flex-none items-center justify-center self-start" aria-label="Your groups">
            <Icon name="back" />
          </Link>
          <div className="min-w-0 pt-1.5">
            {pathname === base ? (
              <h1 className="truncate font-display text-[1.75rem] leading-[1.1] tracking-[0.01em] uppercase">{group.name}</h1>
            ) : (
              <p className="truncate font-display text-[1.375rem] leading-[1.1] tracking-[0.01em] uppercase">{group.name}</p>
            )}
            <p className="mt-1 text-[0.9375rem] leading-[1.375rem] text-brand-paper/75">
              {TYPE_LABEL[group.type]} · {NATION_LABEL[group.nation]}
            </p>
          </div>
        </header>
      )}

      <div className="flex flex-1 flex-col">{children}</div>

      {/(\/send|\/case|\/letter)$/.test(pathname) ? null : (
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
                  className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.8125rem] font-bold no-underline ${
                    active ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {isAdd ? (
                    <span className="flex size-11 items-center justify-center rounded-md bg-ink text-paper">
                      <Icon name="add" size={24} />
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
