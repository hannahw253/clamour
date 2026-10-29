"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { SpannerC } from "@/components/brand/SpannerC";
import type { ReactNode } from "react";
import { DeskFrame, useDesktop, useLayoutRedirect } from "./Frame";
import { PrototypeBar } from "./PrototypeBar";
import { useStore } from "./store";
import { Icon } from "./ui";

/**
 * Screens shared by both layouts: the phone column on a narrow screen (or in "Phone view"), the
 * desktop frame on a wide one (north star, document 8; decision D-027).
 */
export function PhoneShell({ children }: { children: ReactNode }) {
  const s = useStore();
  const desktop = useDesktop();
  const { gid } = useParams<{ gid?: string }>();
  const pathname = usePathname();
  useLayoutRedirect(desktop);
  // The welcome and join screens open with the full lockup, so they don't need the bar as well.
  const hero = pathname.startsWith("/prototype/join") || (pathname === "/prototype" && s?.groups.length === 0);

  if (desktop && s) {
    return (
      <DeskFrame s={s} active={gid ?? ""}>
        <PrototypeBar />
        {children}
      </DeskFrame>
    );
  }
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-concrete">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col bg-ground sm:border-x-2 sm:border-line print:max-w-none print:border-0">
        <PrototypeBar />
        {hero ? null : <PhoneBrandBar />}
        {children}
      </div>
    </div>
  );
}

/** The top of the phone frame: the yellow mark and wordmark on brand ink, with settings, as in the desktop header (D-029). */
function PhoneBrandBar() {
  return (
    <div className="on-ink flex h-12 flex-none items-center bg-brand-ink px-4 text-brand-paper print:hidden">
      <Link href="/prototype" className="flex min-h-11 items-center gap-2 no-underline" aria-label="Clamour: your groups">
        <SpannerC size={24} color="var(--signal)" />
        <span aria-hidden="true" className="font-display text-[1.375rem] leading-none tracking-[0.01em] text-signal uppercase">
          Clamour
        </span>
      </Link>
      <span className="flex-1" />
      <Link href="/prototype/settings" className="-mr-2 flex size-11 items-center justify-center" aria-label="Settings">
        <Icon name="settings" size={24} />
      </Link>
    </div>
  );
}
