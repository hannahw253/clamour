"use client";

import type { ReactNode } from "react";
import { DeskHeader, useDesktop, useLayoutRedirect } from "./Frame";
import { Loading } from "./ui";

/** The dashboard's frame. On a narrow screen, or in "Phone view", it hands over to the phone screens. */
export function DeskShell({ children }: { children: ReactNode }) {
  const desktop = useDesktop();
  useLayoutRedirect(desktop);
  if (desktop === false) return <Loading />;
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper">
      <DeskHeader />
      {children}
    </div>
  );
}
