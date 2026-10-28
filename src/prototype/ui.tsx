"use client";

/** Prototype building blocks, matching the Clamour brand kit's components. */

import Link from "next/link";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import type { ClockView } from "./clocks";

export const label = "text-[13px] leading-[18px] font-bold tracking-[0.08em] uppercase";

// ---- Icons (20px, stroke) -----------------------------------------------------

const ICONS = {
  plus: "M12 5v14M5 12h14",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1.5 1.5 0 1 0 0-.01",
  share: "M12 3v12M7 8l5-5 5 5M5 13v7h14v-7",
  back: "M15 5l-7 7 7 7",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6.5 6.5 0 0 1 3.5 6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  tick: "M5 12.5l4.5 4.5L19 7",
  warning: "M12 3l10 18H2zM12 10v5M12 18h.01",
  note: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h3",
  send: "M4 12l16-8-6 16-3-7z",
  door: "M6 3h12v18H6zM14 12h.01",
  letter: "M4 6h16v12H4zM4 7l8 6 8-6",
  copy: "M8 8h12v12H8zM4 16V4h12",
  arrow: "M9 5l7 7-7 7",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`flex-none ${className ?? ""}`}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

// ---- Button -------------------------------------------------------------------

type Variant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 text-base leading-5 font-bold no-underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 text-center";
const BUTTON_VARIANT: Record<Variant, string> = {
  primary: "bg-signal text-on-signal border-line px-5",
  secondary: "bg-transparent text-ink border-line px-5",
  danger: "bg-alarm text-on-alarm border-alarm px-5",
  ghost: "bg-transparent text-ink border-transparent underline underline-offset-3 px-2",
};

export function buttonClass(variant: Variant = "secondary", extra = "") {
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${extra}`;
}

export function Button({
  variant = "secondary",
  icon,
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; icon?: IconName }) {
  return (
    <button type="button" className={buttonClass(variant, className)} {...props}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  icon,
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; icon?: IconName }) {
  return (
    <Link className={buttonClass(variant, className)} {...props}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </Link>
  );
}

// ---- Status chip --------------------------------------------------------------

export type ChipTone = "neutral" | "signal" | "alarm" | "done";

const CHIP_TONE: Record<ChipTone, string> = {
  neutral: "bg-concrete text-ink",
  signal: "bg-signal text-on-signal",
  alarm: "bg-alarm text-on-alarm",
  done: "bg-done text-on-done",
};

export function Chip({ tone = "neutral", icon, children }: { tone?: ChipTone; icon?: IconName; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] leading-[18px] font-bold tracking-[0.04em] whitespace-nowrap ${CHIP_TONE[tone]}`}
    >
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}

// ---- Clock --------------------------------------------------------------------

const CLOCK_TONE = {
  informal: "bg-concrete text-ink",
  statutory: "bg-signal-soft text-ink",
  missed: "bg-alarm text-on-alarm",
  met: "bg-done text-on-done",
} as const;

export function Clock({ clock }: { clock: ClockView }) {
  const muted = clock.tone === "informal" || clock.tone === "statutory" ? "text-ink-muted" : "";
  return (
    <div className={`flex flex-col gap-1 rounded-lg px-5 py-4 ${CLOCK_TONE[clock.tone]}`}>
      {clock.lead ? <p className="text-[15px] leading-[22px] font-semibold">{clock.lead}</p> : null}
      <p className="font-display text-[44px] leading-[1.05] uppercase">{clock.value}</p>
      {clock.unit ? <p className="text-[15px] leading-[22px] font-semibold">{clock.unit}</p> : null}
      <p className={`${label} ${muted} mt-1`}>
        {clock.note}
        {clock.source ? (
          <>
            {" · "}
            <a href={clock.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Source
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}

// ---- Fields -------------------------------------------------------------------

export const inputClass =
  "min-h-12 w-full rounded-md border-2 border-line bg-paper px-3.5 text-[17px] text-ink placeholder:text-ink-muted";

export function Field({
  id,
  title,
  help,
  error,
  children,
}: {
  id: string;
  title: string;
  help?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={label}>
        {title}
      </label>
      {children}
      {help ? (
        <p id={`${id}-help`} className="text-[15px] leading-[22px] text-ink-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p className="flex items-center gap-1 text-[15px] leading-[22px] font-bold text-alarm" role="alert">
          <Icon name="warning" size={18} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A big tappable radio card, for choices with a short explanation. */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  desc,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  title: string;
  desc?: string;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
        checked ? "border-line bg-signal-soft" : "border-line-subtle bg-paper"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-1 size-5 flex-none accent-[var(--ink)] focus-visible:outline-none"
      />
      <span className="flex flex-col">
        <span className="text-[17px] leading-6 font-bold">{title}</span>
        {desc ? <span className="text-[15px] leading-[22px] text-ink-muted">{desc}</span> : null}
      </span>
    </label>
  );
}

// ---- Safety banner ------------------------------------------------------------

export function SafetyBanner({ kind }: { kind: "gas" | "electrics" }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg bg-alarm px-5 py-4 text-on-alarm">
      <Icon name="warning" size={24} className="mt-0.5" />
      <div>
        {kind === "gas" ? (
          <>
            <p className="text-[18px] leading-[26px] font-bold">If you smell gas or think there&rsquo;s carbon monoxide</p>
            <p className="text-[17px] leading-[26px]">
              Leave the property and call the National Gas Emergency number,{" "}
              <a className="font-bold underline" href="tel:0800111999">
                0800 111 999
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p className="text-[18px] leading-[26px] font-bold">If the power is off or wiring is damaged</p>
            <p className="text-[17px] leading-[26px]">
              Call{" "}
              <a className="font-bold underline" href="tel:105">
                105
              </a>
              , the power cut line. Don&rsquo;t touch exposed wiring. In immediate danger, call{" "}
              <a className="font-bold underline" href="tel:999">
                999
              </a>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const GAS_WORDS = /\b(gas|carbon monoxide|co alarm|fumes)\b/i;
const ELECTRIC_WORDS = /\b(spark|sparking|burning smell|exposed wir|electric shock|fuse ?box smok)/i;

export function safetyKind(category: string, text: string): "gas" | "electrics" | null {
  if (category === "gas" || GAS_WORDS.test(text)) return "gas";
  if (category === "electrics" || ELECTRIC_WORDS.test(text)) return "electrics";
  return null;
}

// ---- Sheet (modal dialog) -----------------------------------------------------

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-xl border-2 border-b-0 border-line bg-paper p-0 text-ink backdrop:bg-brand-ink/60 sm:mx-auto sm:max-w-[440px]"
    >
      {open ? (
        <div className="flex flex-col gap-5 px-4 pt-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3">
            <h2 id="sheet-title" className="text-[22px] leading-7 font-bold">
              {title}
            </h2>
            <button type="button" onClick={onClose} className={buttonClass("ghost", "-mt-2 -mr-2")}>
              Cancel
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-[34px] leading-[1.05] tracking-[0.01em] uppercase">{children}</h1>
      {sub ? <p className="text-[17px] leading-[26px] text-ink-muted">{sub}</p> : null}
    </div>
  );
}

export function Loading() {
  return <p className="px-4 py-10 text-[17px] text-ink-muted">Opening…</p>;
}
