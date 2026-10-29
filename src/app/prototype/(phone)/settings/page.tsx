"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { myEntries, prefsOf, resetPrototype, setMyName, setPrefs, useStore } from "@/prototype/store";
import { LANGUAGES } from "@/prototype/AiHelp";
import { ACCESS_SLOTS, accessText } from "@/prototype/context";
import type { Prefs } from "@/prototype/types";
import { Button, Icon, Loading, PageTitle, Sheet, inputClass, label } from "@/prototype/ui";

/** Your account and settings (north star, document 8: Account). Changes save as you make them. */
export default function Settings() {
  const s = useStore();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!s) return <Loading />;
  const p = prefsOf(s);

  const update = (patch: Partial<Prefs>) => {
    setPrefs(patch);
    setSaved(true);
  };
  const notify = (patch: Partial<Prefs["notify"]>) => update({ notify: { ...p.notify, ...patch } });

  const download = () => {
    const blob = new Blob([JSON.stringify({ name: s.myName, email: p.email, exported: new Date().toISOString(), entries: myEntries(s) }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-clamour-entries.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="desk-flow flex flex-1 flex-col gap-7 px-4 pt-3 pb-12">
      <div className="desk-span flex items-center justify-between">
        <Link href="/prototype" className="-ml-1 inline-flex min-h-11 items-center gap-1 font-bold">
          <Icon name="back" /> Your groups
        </Link>
        <span role="status" className="text-[15px] text-ink-muted">
          {saved ? "Saved" : ""}
        </span>
      </div>
      <PageTitle>Settings</PageTitle>

      <Section title="You">
        <TextRow id="name" title="Your name" value={s.myName ?? ""} onChange={(v) => (setMyName(v), setSaved(true))} help="What your groups see." />
        <TextRow id="email" title="Email" type="email" value={p.email} onChange={(v) => update({ email: v })} help="For signing in and for notifications." />
        <TextRow id="phone" title="Mobile (optional)" type="tel" value={p.phone} onChange={(v) => update({ phone: v })} />
        <Choice
          title="Show my name to groups as"
          value={p.showAs}
          options={[
            ["name", "First name"],
            ["initial", "Initial only"],
          ]}
          onChange={(v) => update({ showAs: v as Prefs["showAs"] })}
        />
      </Section>

      <Section title="Notifications">
        <Choice
          title="How"
          value={p.notify.channel}
          options={[
            ["email", "Email"],
            ["app", "App"],
            ["both", "Both"],
            ["none", "Off"],
          ]}
          onChange={(v) => notify({ channel: v as Prefs["notify"]["channel"] })}
        />
        {p.notify.channel !== "none" ? (
          <>
            <Choice
              title="How often"
              value={p.notify.when}
              options={[
                ["instant", "Straight away"],
                ["daily", "Daily"],
                ["weekly", "Weekly"],
              ]}
              onChange={(v) => notify({ when: v as Prefs["notify"]["when"] })}
            />
            <Toggle title="Replies from landlords" on={p.notify.replies} onChange={(v) => notify({ replies: v })} />
            <Toggle title="Deadlines coming up or missed" on={p.notify.deadlines} onChange={(v) => notify({ deadlines: v })} />
            <Toggle title="New problems in my groups" on={p.notify.problems} onChange={(v) => notify({ problems: v })} />
            <Toggle title="Requests for updates" desc="When someone's about to write to the landlord" on={p.notify.requests} onChange={(v) => notify({ requests: v })} />
            <Toggle title="People asking to join" desc="Admins only" on={p.notify.joins} onChange={(v) => notify({ joins: v })} />
          </>
        ) : null}
        {s.groups.length ? (
          <div className="flex flex-col gap-1 px-4 py-3">
            <p className="text-[15px] font-bold">Groups</p>
            {s.groups.map((g) => {
              const on = !p.muted.includes(g.id);
              return (
                <ToggleInline
                  key={g.id}
                  title={g.name}
                  on={on}
                  onChange={(v) => update({ muted: v ? p.muted.filter((id) => id !== g.id) : [...p.muted, g.id] })}
                />
              );
            })}
          </div>
        ) : null}
        <p className="px-4 pb-3 text-[13px] text-ink-muted">Prototype: nothing is sent. Notifications never include details of the problem, only that something needs you.</p>
      </Section>

      <Section title="Appearance">
        <Choice
          title="Theme"
          value={p.theme}
          options={[
            ["system", "Match my phone"],
            ["light", "Light"],
            ["dark", "Dark"],
          ]}
          onChange={(v) => update({ theme: v as Prefs["theme"] })}
        />
        <Toggle title="Larger text" on={p.largeText} onChange={(v) => update({ largeText: v })} />
        <Toggle title="Reduce motion" on={p.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
      </Section>

      <Section title="Messages to your landlord">
        <Choice
          title="Copy your group in"
          value={p.copyIn}
          options={[
            ["bcc", "Privately (BCC)"],
            ["cc", "Openly (CC)"],
            ["none", "Don't"],
          ]}
          onChange={(v) => update({ copyIn: v as Prefs["copyIn"] })}
        />
        <div className="flex flex-col gap-2 px-4 py-3">
          <p className="text-[15px] font-bold">When you&rsquo;re usually in</p>
          <div className="flex flex-wrap gap-2">
            {ACCESS_SLOTS.map((slot) => {
              const onSlot = p.accessSlots.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={onSlot}
                  onClick={() => update({ accessSlots: onSlot ? p.accessSlots.filter((x) => x !== slot) : [...p.accessSlots, slot] })}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-3.5 text-[14px] font-bold ${onSlot ? "border-line bg-ink text-paper" : "border-line-subtle bg-paper"}`}
                >
                  {slot.charAt(0).toUpperCase() + slot.slice(1)}
                </button>
              );
            })}
          </div>
          <label htmlFor="access" className="sr-only">
            Anything else about access
          </label>
          <input id="access" className={`${inputClass} min-h-11 border bg-paper`} value={p.access} placeholder="Anything else? e.g. spare key with number 12" onChange={(e) => update({ access: e.target.value })} />
          <p className="text-[13px] leading-[18px] text-ink-muted">{accessText(p) || "Added to messages so landlords can arrange access."}</p>
        </div>
        <TextRow id="signoff" title="Sign off as" value={p.signoff} onChange={(v) => update({ signoff: v })} placeholder={s.myName ?? "Your name"} help="Your full name, if you'd rather landlords saw it." />
      </Section>

      <Section title="AI help">
        <Toggle title="Offer AI help with messages" desc="Firmer, friendlier, shorter, simpler, in your own words" on={p.ai} onChange={(v) => update({ ai: v })} />
        <div className="flex flex-col gap-1.5 px-4 py-3">
          <label htmlFor="language" className="text-[15px] font-bold">
            Your language
          </label>
          <select id="language" className={`${inputClass} min-h-11 border bg-paper`} value={p.language} onChange={(e) => update({ language: e.target.value })}>
            <option value="">English only</option>
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <p className="text-[13px] leading-[18px] text-ink-muted">We can show messages in your language so you understand them. What&rsquo;s sent stays in English.</p>
        </div>
        <p className="px-4 pb-3 text-[13px] text-ink-muted">AI runs in London and only sees the message and the basic facts of the problem, never your photos or notes.</p>
      </Section>

      <Section title="Your data">
        <RowButton icon="copy" text="Download my entries" onClick={download} />
        <RowButton icon="shield" text="Sign out everywhere" onClick={() => undefined} note="Prototype: there's no sign-in yet." />
        <RowButton icon="warning" text="Delete my account" danger onClick={() => setConfirmDelete(true)} />
      </Section>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?">
        <p className="text-[17px] leading-[26px]">
          You&rsquo;ll be removed from every group. What you added stays on each group&rsquo;s record, shown as &ldquo;former
          member&rdquo;, because others rely on it. Download your entries first if you want a copy.
        </p>
        <Button
          variant="danger"
          onClick={() => {
            resetPrototype();
            setConfirmDelete(false);
            router.push("/prototype");
          }}
        >
          Delete my account
        </Button>
      </Sheet>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className={`${label} px-1 text-ink-muted`}>{title}</h2>
      <div className="flex flex-col divide-y divide-line-subtle rounded-xl bg-concrete">{children}</div>
    </section>
  );
}

function TextRow({
  id,
  title,
  value,
  onChange,
  help,
  type = "text",
  placeholder,
}: {
  id: string;
  title: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <label htmlFor={id} className="text-[15px] font-bold">
        {title}
      </label>
      <input id={id} type={type} className={`${inputClass} min-h-11 border bg-paper`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {help ? <p className="text-[13px] leading-[18px] text-ink-muted">{help}</p> : null}
    </div>
  );
}

function Choice({ title, value, options, onChange }: { title: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2 px-4 py-3">
      <legend className="mb-2 text-[15px] font-bold">{title}</legend>
      <div className="flex rounded-lg bg-paper p-1">
        {options.map(([v, text]) => (
          <label
            key={v}
            className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-center text-[14px] font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus ${
              value === v ? "bg-ink text-paper" : "text-ink-muted"
            }`}
          >
            <input type="radio" className="sr-only" checked={value === v} onChange={() => onChange(v)} />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({ title, desc, on, onChange }: { title: string; desc?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="px-4 py-1">
      <ToggleInline title={title} desc={desc} on={on} onChange={onChange} />
    </div>
  );
}

function ToggleInline({ title, desc, on, onChange }: { title: string; desc?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3">
      <span className="flex flex-1 flex-col">
        <span className="text-[16px]">{title}</span>
        {desc ? <span className="text-[13px] text-ink-muted">{desc}</span> : null}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 flex-none rounded-full transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus ${on ? "bg-ink" : "bg-line-subtle"}`}
      >
        <span className={`absolute top-1 size-5 rounded-full bg-paper transition-all ${on ? "left-6" : "left-1"}`} />
      </span>
      <span className="w-7 text-right text-[13px] font-bold text-ink-muted">{on ? "On" : "Off"}</span>
    </label>
  );
}

function RowButton({ icon, text, onClick, danger, note }: { icon: "copy" | "shield" | "warning"; text: string; onClick: () => void; danger?: boolean; note?: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left text-[16px] font-bold ${danger ? "text-alarm" : ""}`}>
      <Icon name={icon} />
      <span className="flex flex-1 flex-col">
        {text}
        {note ? <span className="text-[13px] font-normal text-ink-muted">{note}</span> : null}
      </span>
      <Icon name="arrow" />
    </button>
  );
}
