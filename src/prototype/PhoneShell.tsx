"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { DeskFrame, useDesktop, useLayoutRedirect } from "./Frame";
import { PrototypeBar } from "./PrototypeBar";
import { useStore } from "./store";

/**
 * Screens shared by both layouts: the phone column on a narrow screen (or in "Phone view"), the
 * desktop frame on a wide one (north star, document 8; decision D-027).
 */
export function PhoneShell({ children }: { children: ReactNode }) {
  const s = useStore();
  const desktop = useDesktop();
  const { gid } = useParams<{ gid?: string }>();
  useLayoutRedirect(desktop);

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
        {children}
      </div>
    </div>
  );
}
