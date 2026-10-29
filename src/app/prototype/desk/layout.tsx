import Link from "next/link";
import { SpannerC } from "@/components/brand/SpannerC";

/** The desktop dashboard's frame: full width, for people managing many problems (north star, document 8). */
export default function DeskLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper">
      <header className="flex h-14 flex-none items-center gap-4 border-b border-line-subtle px-6 print:hidden">
        <Link href="/prototype/desk" className="flex items-center gap-2 no-underline">
          <SpannerC size={26} color="var(--ink)" />
          <span className="font-display text-[22px] leading-none tracking-[0.01em] uppercase">Clamour</span>
        </Link>
        <span className="text-[15px] font-semibold text-ink-muted">Dashboard</span>
        <span className="rounded-full bg-concrete px-2.5 py-0.5 text-[12px] font-bold tracking-[0.08em] uppercase">Prototype</span>
        <span className="flex-1" />
        <Link href="/prototype/settings" className="inline-flex min-h-11 items-center gap-2 font-bold">
          Settings
        </Link>
        <Link href="/prototype" className="inline-flex min-h-11 items-center gap-2 font-bold">
          Phone view
        </Link>
      </header>
      {children}
    </div>
  );
}
