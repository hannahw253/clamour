"use client";

/**
 * One app, two layouts (north star, document 8: Desktop dashboard; decision D-027). From 1024 pixels
 * wide every screen uses the desktop frame; below that, the phone column. "Phone view" keeps the
 * phone column on a big screen for demos.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { SpannerC } from "@/components/brand/SpannerC";
import { nextAction } from "./actions";
import { myMember, prefsOf, setPrefs, useStore, visibleIssues } from "./store";
import { NATION_LABEL, TYPE_LABEL, type Group, type State } from "./types";
import { Icon, label } from "./ui";

const WIDE = "(min-width: 1024px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True on a wide screen, false on a narrow one, null before the browser has said (server render). */
export function useWide(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => null,
  );
}

/** Whether to draw the desktop frame: a wide screen, unless "Phone view" was chosen. Null until known. */
export function useDesktop(): boolean | null {
  const wide = useWide();
  const s = useStore();
  if (wide === null || !s) return null;
  return wide && prefsOf(s).layout !== "phone";
}

/** Where the same screen lives in the other layout, if it has its own address there. */
function counterpart(pathname: string, search: URLSearchParams, desktop: boolean): string | null {
  if (desktop) {
    if (pathname === "/prototype") return "/prototype/desk";
    let m = pathname.match(/^\/prototype\/g\/([^/]+)$/);
    if (m) return `/prototype/desk?g=${m[1]}`;
    m = pathname.match(/^\/prototype\/g\/([^/]+)\/i\/([^/]+)\/send$/);
    if (m) return `/prototype/desk/compose?g=${m[1]}&ids=${m[2]}${search.get("letter") ? `&letter=${search.get("letter")}` : ""}`;
    m = pathname.match(/^\/prototype\/g\/([^/]+)\/letter$/);
    if (m && search.get("ids")) return `/prototype/desk/compose?g=${m[1]}&ids=${search.get("ids")}`;
    return null;
  }
  if (pathname === "/prototype/desk") return search.get("g") ? `/prototype/g/${search.get("g")}` : "/prototype";
  if (pathname === "/prototype/desk/compose") {
    const g = search.get("g");
    const ids = (search.get("ids") ?? "").split(",").filter(Boolean);
    if (!g || !ids.length) return "/prototype";
    if (ids.length > 1) return `/prototype/g/${g}/letter?ids=${ids.join(",")}`;
    return `/prototype/g/${g}/i/${ids[0]}/send${search.get("letter") ? `?letter=${search.get("letter")}` : ""}`;
  }
  return null;
}

/** Sends a screen to its counterpart when the layout doesn't match it. */
export function useLayoutRedirect(desktop: boolean | null) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (desktop === null) return;
    const to = counterpart(pathname, new URLSearchParams(window.location.search), desktop);
    if (to) router.replace(to);
  }, [desktop, pathname, router]);
}

export function DeskHeader() {
  const router = useRouter();
  return (
    <header className="flex h-14 flex-none items-center gap-4 border-b border-line-subtle px-6 print:hidden">
      <Link href="/prototype/desk" className="flex items-center gap-2 no-underline">
        <SpannerC size={26} color="var(--ink)" />
        <span className="font-display text-[22px] leading-none tracking-[0.01em] uppercase">Clamour</span>
      </Link>
      <Link href="/prototype/desk" className="text-[15px] font-semibold text-ink-muted no-underline">
        Dashboard
      </Link>
      <span className="rounded-full bg-concrete px-2.5 py-0.5 text-[12px] font-bold tracking-[0.08em] uppercase">Prototype</span>
      <span className="flex-1" />
      <Link href="/prototype/settings" className="inline-flex min-h-11 items-center gap-2 font-bold">
        <Icon name="settings" size={18} /> Settings
      </Link>
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 font-bold"
        onClick={() => {
          setPrefs({ layout: "phone" });
          router.push("/prototype");
        }}
      >
        Phone view
      </button>
    </header>
  );
}

export function GroupsSidebar({ s, active }: { s: State; active: string }) {
  const needs = (g: Group) => (myMember(g)?.status === "pending" ? 0 : visibleIssues(s, g).filter((i) => nextAction(g, i).kind === "send").length);
  const item = (on: boolean) => `flex min-h-12 items-center gap-2 rounded-lg px-3 py-2 no-underline ${on ? "bg-paper font-bold shadow-sm" : "hover:bg-paper/60"}`;
  return (
    <nav aria-label="Groups" className="flex w-64 flex-none flex-col gap-1 border-r border-line-subtle bg-concrete p-3 print:hidden">
      <p className={`${label} px-3 pt-2 pb-1 text-ink-muted`}>Groups</p>
      <Link href="/prototype/desk" className={item(active === "all")}>
        <span className="flex-1">All groups</span>
        <Count n={s.groups.reduce((n, g) => n + needs(g), 0)} />
      </Link>
      {s.groups.map((g) => (
        <Link key={g.id} href={`/prototype/desk?g=${g.id}`} className={item(active === g.id)}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{g.name}</span>
            <span className="text-[13px] font-normal text-ink-muted">
              {TYPE_LABEL[g.type]} · {NATION_LABEL[g.nation]}
            </span>
          </span>
          <Count n={needs(g)} />
        </Link>
      ))}
      <Link href="/prototype/new" className="mt-2 flex min-h-11 items-center gap-2 px-3 font-bold">
        <Icon name="plus" size={18} /> Start a group
      </Link>
    </nav>
  );
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="min-w-6 rounded-full bg-ink px-2 text-center text-[13px] leading-6 font-bold text-paper" aria-label={`${n} need action`}>
      {n}
    </span>
  );
}

/** The desktop frame around a screen that also exists on the phone: header, groups, and the full width for the screen (globals.css lays it out). */
export function DeskFrame({ s, active, children }: { s: State; active: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper">
      <DeskHeader />
      <div className="flex min-h-0 flex-1">
        <GroupsSidebar s={s} active={active} />
        <div data-layout="desk" className="flex min-w-0 flex-1 flex-col bg-paper">
          {children}
        </div>
      </div>
    </div>
  );
}
