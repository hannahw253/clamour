import type { Metadata } from "next";
import { PrototypeBar } from "@/prototype/PrototypeBar";

export const metadata: Metadata = {
  title: "Clamour prototype",
  description: "You've been invited to try a repair group prototype.",
  robots: { index: false, follow: false },
};

/** A phone-width column on every screen size, so interviews look the same on a laptop. */
export default function PrototypeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-concrete">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col bg-paper sm:border-x-2 sm:border-line print:max-w-none print:border-0">
        <PrototypeBar />
        {children}
      </div>
    </div>
  );
}
