"use client";

/** Prototype building blocks, matching the Clamour brand kit's components. */

import Link from "next/link";
import {
  Bell,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock as ClockIcon,
  Copy,
  DoorOpen,
  Ellipsis,
  Folder,
  Gauge,
  Image as ImageIcon,
  List,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
  Plus,
  Receipt,
  Send,
  Settings,
  Share,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import type { ClockView } from "./clocks";

/**
 * A card: white on the warm ground, with a hairline edge (brand kit, D-029). Depth comes from the
 * two surfaces; bold ink edges are kept for controls and for cards where it's your turn.
 */
export const panel = "rounded-lg border border-line-subtle bg-paper";
/** A list inside a card, with hairline dividers. */
export const panelList = "flex flex-col divide-y divide-line-subtle overflow-hidden rounded-lg border border-line-subtle bg-paper";
/** A selected or "your turn" card: the bold ink edge. */
export const selectedPanel = "rounded-lg border-2 border-line bg-paper";
/** Square toggle buttons with an ink edge; filled ink when on. Pills are for status chips only. */
export function toggleClass(on: boolean) {
  return `inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-line px-3.5 text-[0.9375rem] leading-[1.375rem] font-bold ${on ? "bg-ink text-paper" : "bg-paper text-ink"}`;
}
/** Underlined tabs, as on the desktop group header. */
export function tabClass(on: boolean) {
  return `inline-flex min-h-11 items-center justify-center border-b-[3px] px-3 text-[1rem] leading-[1.25rem] font-bold ${on ? "border-line text-ink" : "border-transparent text-ink-muted"}`;
}
/** A confirmation after something worked: calm, black and white, with a tick. Blue is kept for "fixed". */
export const toastClass = "flex items-start gap-2 rounded-lg border border-line-subtle bg-paper px-4 py-3 text-[1rem] leading-[1.375rem] font-bold";

export const label = "text-[0.8125rem] leading-[1.125rem] font-bold tracking-[0.08em] uppercase";

// ---- Icons --------------------------------------------------------------------
// Lucide outline icons at a 2px stroke, as the brand kit specifies until Clamour has its own set.

const ICONS = {
  plus: Plus,
  camera: Camera,
  image: ImageIcon,
  share: Share,
  back: ChevronLeft,
  list: List,
  people: Users,
  more: Ellipsis,
  clock: ClockIcon,
  tick: Check,
  warning: TriangleAlert,
  note: NotebookPen,
  send: Send,
  door: DoorOpen,
  letter: Mail,
  copy: Copy,
  arrow: ChevronRight,
  spark: Sparkles,
  settings: Settings,
  phone: Phone,
  gauge: Gauge,
  receipt: Receipt,
  chat: MessageSquare,
  video: Video,
  shield: ShieldCheck,
  folder: Folder,
  bell: Bell,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  const Glyph = ICONS[name];
  return <Glyph size={size} strokeWidth={2} aria-hidden="true" className={`flex-none ${className ?? ""}`} />;
}

// ---- Button -------------------------------------------------------------------

type Variant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 text-base leading-[1.25rem] font-bold no-underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 text-center";
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
  alarm: "bg-alarm-soft text-alarm-ink",
  done: "bg-done-soft text-done-ink",
};

export function Chip({ tone = "neutral", icon, children }: { tone?: ChipTone; icon?: IconName; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[0.8125rem] leading-[1.125rem] font-bold whitespace-nowrap ${CHIP_TONE[tone]}`}
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
      {clock.lead ? <p className="text-[0.9375rem] leading-[1.375rem] font-semibold">{clock.lead}</p> : null}
      <p className="font-display text-[2.75rem] leading-[1.05] uppercase">{clock.value}</p>
      {clock.unit ? <p className="text-[0.9375rem] leading-[1.375rem] font-semibold">{clock.unit}</p> : null}
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
  "min-h-12 w-full rounded-md border-2 border-line bg-paper px-3.5 text-[1.0625rem] leading-[1.625rem] text-ink placeholder:text-ink-muted";

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
        <p id={`${id}-help`} className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p className="flex items-center gap-1 text-[0.9375rem] leading-[1.375rem] font-bold text-alarm" role="alert">
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
        checked ? "border-[3px] border-line bg-paper" : "border-line bg-paper"
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
        <span className="text-[1.0625rem] leading-[1.625rem] font-bold">{title}</span>
        {desc ? <span className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">{desc}</span> : null}
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
            <p className="text-[1.125rem] leading-[1.625rem] font-bold">If you smell gas or think there&rsquo;s carbon monoxide</p>
            <p className="text-[1.0625rem] leading-[1.625rem]">
              Leave the property and call the National Gas Emergency number,{" "}
              <a className="font-bold underline" href="tel:0800111999">
                0800 111 999
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p className="text-[1.125rem] leading-[1.625rem] font-bold">If the power is off or wiring is damaged</p>
            <p className="text-[1.0625rem] leading-[1.625rem]">
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
  // Only report a close the person made (Esc or Cancel); closing because another sheet opened isn't one.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={() => {
        if (openRef.current) onClose();
      }}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-lg border-2 border-b-0 border-line bg-paper p-0 text-ink backdrop:bg-brand-ink/60 sm:mx-auto sm:max-w-[440px]"
    >
      {open ? (
        <div className="flex flex-col gap-5 px-4 pt-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3">
            <h2 id="sheet-title" className="text-[1.375rem] leading-[1.75rem] font-bold">
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
    <div className="desk-span flex flex-col gap-2">
      <h1 className="font-display text-[1.75rem] leading-[1.05] tracking-[0.01em] uppercase">{children}</h1>
      {sub ? <p className="text-[1.0625rem] leading-[1.625rem] text-ink-muted">{sub}</p> : null}
    </div>
  );
}

export function Loading() {
  return <p className="px-4 py-10 text-[1.0625rem] leading-[1.625rem] text-ink-muted">Opening…</p>;
}
