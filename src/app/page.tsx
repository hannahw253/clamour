import { Lockup } from "@/components/brand/Lockup";

/** Holding page until the app's first screens land. */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-brand-ink text-brand-paper">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-16 px-[max(16px,env(safe-area-inset-left))] py-16">
        <div className="pb-6">
          <div className="hidden sm:block">
            <Lockup size={88} />
          </div>
          <div className="sm:hidden">
            <Lockup size={52} />
          </div>
        </div>

        <div className="flex max-w-xl flex-col gap-6">
          <p className="text-[22px] leading-8 font-semibold text-balance">
            A shared repair record for renters. Set up a group for your house, building or union branch, invite people by
            link, and keep one dated record of what needs fixing.
          </p>
          <p className="text-[17px] leading-[26px] text-brand-paper/85">
            Clamour is being built now, with a pilot planned for spring 2027.
          </p>
        </div>

        <span className="self-start rounded-full bg-signal px-3 py-1 text-[13px] leading-[18px] font-bold uppercase tracking-[0.08em] text-on-signal">
          In development
        </span>
      </div>
    </main>
  );
}
