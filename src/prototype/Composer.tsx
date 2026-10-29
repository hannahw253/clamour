"use client";

/**
 * The prepared email (north star, documents 6 and 8: "Do it for them"). Used full-screen on the
 * phone and beside the record on the desktop dashboard. With several issues it writes one group letter.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AiHelp } from "./AiHelp";
import { CaseContextSheet } from "./CaseContext";
import { LETTER_PROMPT, accessText, affectedFacts, recordFacts, wordsFacts, type Fact } from "./context";
import { MESSAGE_TITLE, aiFacts, buildGroupMessage, buildMessage } from "./messages";
import { addEntries, myMember, prefsOf, setGroupAddress, setLandlord, setMyFlat, updateIssueContext, useStore } from "./store";
import { LETTER_LABEL, type Group, type Issue, type LetterKey } from "./types";
import { Button, Icon, Sheet, buttonClass, inputClass, label } from "./ui";

type CopyIn = "bcc" | "cc" | "none";

const COPY_TEXT: Record<CopyIn, { short: string; long: string }> = {
  bcc: { short: "Your group, privately (BCC)", long: "Your landlord won’t see it. Your email is saved to the record as sent." },
  cc: { short: "Your group, openly (CC)", long: "Your landlord will see it. When they reply to all, their reply is saved too." },
  none: { short: "Not copied", long: "Nothing is saved automatically. You’ll need to forward it to your group." },
};

export function Composer({
  group,
  issues,
  letterKey,
  back,
  afterSent,
  aside,
}: {
  group: Group;
  issues: Issue[];
  letterKey: LetterKey;
  back: string;
  /** Where to go once it's sent; gets "email" or "other". */
  afterSent: (how: "email" | "other") => string;
  /** On the desktop, the record shown beside the composer. */
  aside?: ReactNode;
}) {
  const s = useStore();
  const router = useRouter();
  const single = issues.length === 1 ? issues[0] : null;
  const promptCfg = single ? LETTER_PROMPT[letterKey] : null;
  const [prompt, setPrompt] = useState(() => (single && promptCfg?.saveTo ? (single.context?.[promptCfg.saveTo] ?? "") : ""));
  /** Facts ticked off (record and words start ticked) and private facts ticked on (start unticked). */
  const [off, setOff] = useState<string[]>([]);
  const [on, setOn] = useState<string[]>([]);
  const [useAccess, setUseAccess] = useState(true);
  const [addrDraft, setAddrDraft] = useState<{ line: string; postcode: string; flat: string } | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [copyIn, setCopyIn] = useState<CopyIn>(() => prefsOf(s).copyIn);
  const [edited, setEdited] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [aiPrev, setAiPrev] = useState<string | null>(null);
  const [toDraft, setToDraft] = useState<{ name: string; email: string } | null>(null);
  const [sheet, setSheet] = useState<"copy" | "other" | "sent" | null>(null);
  const [channel, setChannel] = useState<"email" | "whatsapp" | "text" | "copy">("email");
  if (!s) return null;

  const key: LetterKey = issues.length > 1 ? "group" : letterKey;
  const prefs = prefsOf(s);
  const me = myMember(group);
  const needsFlat = group.type !== "house" && !me?.flat;
  const needsAddress = !group.address?.line || needsFlat;
  const addr = addrDraft ?? { line: group.address?.line ?? "", postcode: group.address?.postcode ?? "", flat: me?.flat ?? "" };
  const facts: Fact[] = single ? [...recordFacts(single), ...wordsFacts(single, promptCfg?.saveTo), ...affectedFacts(single)] : [];
  const selected = facts.filter((f) => (f.source === "affected" ? on.includes(f.id) : !off.includes(f.id)));
  const access = useAccess ? accessText(prefs) : "";
  const answers = { prompt, selected, access };
  const landlord = toDraft ?? { name: group.landlord?.name ?? "", email: group.landlord?.email ?? "" };
  const askForLandlord = !group.landlord?.email || toDraft !== null;
  const myName = prefsOf(s).signoff.trim() || myMember(group)?.name || s.myName || "Your name";
  const message =
    key === "group"
      ? buildGroupMessage({ group, issues, myName, landlordName: landlord.name }, answers)
      : buildMessage(key, { group, issue: issues[0], myName, landlordName: landlord.name }, answers);
  const body = edited ?? message.body;

  const params = new URLSearchParams();
  params.set("subject", message.subject);
  params.set("body", body);
  if (copyIn !== "none") params.set(copyIn, group.inbox);
  const mailto = `mailto:${encodeURIComponent(landlord.email.trim())}?${params.toString().replace(/\+/g, "%20")}`;
  const shareText = `${message.subject}\n\n${body}`;

  const saveLandlord = () => {
    if (landlord.email.trim() || landlord.name.trim()) setLandlord(group.id, { name: landlord.name.trim(), email: landlord.email.trim() });
    setToDraft(null);
    if (addrDraft) {
      if (addrDraft.line.trim()) setGroupAddress(group.id, { line: addrDraft.line.trim(), postcode: addrDraft.postcode.trim().toUpperCase() });
      if (addrDraft.flat.trim()) setMyFlat(group.id, addrDraft.flat);
      setAddrDraft(null);
    }
  };

  const confirmSent = () => {
    const at = new Date().toISOString();
    if (single && promptCfg?.saveTo && prompt.trim()) updateIssueContext(group.id, single.id, { [promptCfg.saveTo]: prompt.trim() });
    const viaEmail = channel === "email" && copyIn !== "none";
    for (const issue of issues) {
      if (viaEmail) {
        addEntries(group.id, issue.id, [
          {
            kind: "email",
            direction: "to_landlord",
            at,
            from: `${myName} (you)`,
            to: landlord.email.trim() || "your landlord",
            subject: message.subject,
            text: body,
            via: copyIn as "cc" | "bcc",
            auth: "passed",
            letter: key,
          },
        ]);
      } else {
        addEntries(group.id, issue.id, [
          {
            kind: "reported",
            method: channel === "whatsapp" || channel === "text" ? "text" : "email",
            at,
            text:
              channel === "email"
                ? `${LETTER_LABEL[key]} sent by email without copying the group in.`
                : `${LETTER_LABEL[key]} sent by ${channel === "whatsapp" ? "WhatsApp" : channel === "text" ? "text" : "you"}. Add a screenshot so the record shows it.`,
          },
          { kind: "letter", letter: key, at, text: "Prepared in Clamour." },
        ]);
      }
    }
    router.push(afterSent(viaEmail ? "email" : "other"));
  };

  const composer = (
    <div className="flex flex-col gap-6">
      {askForLandlord ? (
        <section className="flex flex-col gap-3 rounded-xl bg-concrete p-4">
          <p className="text-[17px] leading-6 font-bold">Who do you email about repairs?</p>
          <label className="flex flex-col gap-1">
            <span className="text-[15px] text-ink-muted">Name (landlord, agent or factor)</span>
            <input className={inputClass} value={landlord.name} onChange={(e) => setToDraft({ ...landlord, name: e.target.value })} placeholder="Dan at the letting agent" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[15px] text-ink-muted">Email</span>
            <input
              className={inputClass}
              type="email"
              inputMode="email"
              value={landlord.email}
              onChange={(e) => setToDraft({ ...landlord, email: e.target.value })}
              placeholder="repairs@agent.co.uk"
            />
          </label>
          <p className="text-[15px] leading-[22px] text-ink-muted">Saved for your whole group, so nobody has to look it up again.</p>
        </section>
      ) : null}

      {needsAddress ? (
        <section className="flex flex-col gap-3 rounded-xl bg-concrete p-4">
          <p className="text-[17px] leading-6 font-bold">Your address for letters</p>
          {group.type !== "house" ? (
            <label className="flex flex-col gap-1">
              <span className="text-[15px] text-ink-muted">Your flat</span>
              <input className={inputClass} value={addr.flat} onChange={(e) => setAddrDraft({ ...addr, flat: e.target.value })} placeholder="Flat 3" />
            </label>
          ) : null}
          <label className="flex flex-col gap-1">
            <span className="text-[15px] text-ink-muted">Street address</span>
            <input className={inputClass} value={addr.line} onChange={(e) => setAddrDraft({ ...addr, line: e.target.value })} placeholder={group.name} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[15px] text-ink-muted">Postcode</span>
            <input className={inputClass} value={addr.postcode} onChange={(e) => setAddrDraft({ ...addr, postcode: e.target.value })} placeholder="LS6 1AB" autoComplete="postal-code" />
          </label>
          <p className="text-[15px] leading-[22px] text-ink-muted">Formal letters need the full address. The street and postcode are saved for your group; your flat is saved for you.</p>
        </section>
      ) : null}

      <dl className="flex flex-col divide-y divide-line-subtle rounded-xl bg-concrete">
        {!askForLandlord ? (
          <Row title="To">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{landlord.name || landlord.email}</span>
              {landlord.name ? <span className="block truncate text-[15px] text-ink-muted">{landlord.email}</span> : null}
            </span>
            <button type="button" className="min-h-11 px-2 font-bold underline underline-offset-3" onClick={() => setToDraft(landlord)}>
              Change
            </button>
          </Row>
        ) : null}
        <Row title="Copy">
          <span className="min-w-0 flex-1 font-bold">{COPY_TEXT[copyIn].short}</span>
          <button type="button" className="min-h-11 px-2 font-bold underline underline-offset-3" onClick={() => setSheet("copy")}>
            Change
          </button>
        </Row>
        <Row title="Subject">
          <span className="min-w-0 flex-1 font-bold">{message.subject}</span>
        </Row>
      </dl>

      {promptCfg && !edited ? (
        <section className="flex flex-col gap-2">
          <label htmlFor="letter-prompt" className="text-[17px] leading-6 font-bold">
            {promptCfg.label}
          </label>
          <textarea
            id="letter-prompt"
            className={`${inputClass} min-h-24 py-3 text-[16px] leading-[24px]`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={promptCfg.placeholder}
          />
          <p className="text-[14px] leading-[20px] text-ink-muted">In your own words. Optional, and you can speak instead of typing.</p>
        </section>
      ) : null}

      {single && !edited ? (
        <section className="flex flex-col gap-3">
          <h2 className={label}>What we&rsquo;ll mention</h2>
          <FactGroup title="From your record" facts={facts.filter((f) => f.source === "record")} isOn={(f) => !off.includes(f.id)} onToggle={(f) => setOff(off.includes(f.id) ? off.filter((x) => x !== f.id) : [...off, f.id])} empty="Nothing extra yet. Add evidence and it will appear here." />
          <FactGroup
            title="In your words"
            facts={facts.filter((f) => f.source === "words")}
            isOn={(f) => !off.includes(f.id)}
            onToggle={(f) => setOff(off.includes(f.id) ? off.filter((x) => x !== f.id) : [...off, f.id])}
            empty="Say what it stops you doing and what would fix it."
            action={{ text: facts.some((f) => f.source === "words") ? "Edit" : "Add details", onClick: () => setContextOpen(true) }}
          />
          {facts.some((f) => f.source === "affected") ? (
            <FactGroup
              title="Who is affected (private)"
              note="Only included if you tick it, for this message."
              facts={facts.filter((f) => f.source === "affected")}
              isOn={(f) => on.includes(f.id)}
              onToggle={(f) => setOn(on.includes(f.id) ? on.filter((x) => x !== f.id) : [...on, f.id])}
            />
          ) : (
            <button type="button" onClick={() => setContextOpen(true)} className="min-h-11 self-start text-[15px] font-bold underline underline-offset-3">
              Is anyone affected more because of who they are?
            </button>
          )}
          {accessText(prefs) ? (
            <FactGroup title="Access" facts={[{ id: "access", source: "record", text: accessText(prefs) }]} isOn={() => useAccess} onToggle={() => setUseAccess(!useAccess)} />
          ) : (
            <Link href="/prototype/settings" className="min-h-11 self-start text-[15px] font-bold underline underline-offset-3">
              Add when you&rsquo;re usually in, for access
            </Link>
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className={label}>Message</h2>
          <button type="button" className="min-h-11 px-2 font-bold underline underline-offset-3" onClick={() => setEditing(!editing)}>
            {editing ? "Done" : "Edit"}
          </button>
        </div>
        {aiPrev !== null ? (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-signal-soft px-3 py-2 text-[15px] leading-[22px]">
            <Icon name="spark" size={16} />
            <span className="flex-1 font-bold">AI suggestion. Check every fact before you send.</span>
            <button
              type="button"
              className="min-h-11 px-1 font-bold underline underline-offset-3"
              onClick={() => {
                setEdited(aiPrev === message.body ? null : aiPrev);
                setAiPrev(null);
              }}
            >
              Undo
            </button>
          </p>
        ) : null}
        {editing ? (
          <textarea aria-label="Message" className={`${inputClass} min-h-[380px] py-3 text-[16px] leading-[25px]`} value={body} onChange={(e) => setEdited(e.target.value)} />
        ) : (
          <p className="rounded-xl border border-line-subtle px-4 py-4 text-[16px] leading-[25px] whitespace-pre-wrap">{body}</p>
        )}
      </section>

      {prefsOf(s).ai ? (
        <AiHelp
          draft={body}
          facts={aiFacts(key, group, issues, [...selected.map((f) => f.text), ...(prompt.trim() ? [prompt.trim()] : [])])}
          language={prefsOf(s).language}
          onApply={(text) => {
            setAiPrev(body);
            setEdited(text);
            setEditing(false);
          }}
        />
      ) : null}

      {edited && !aiPrev ? (
        <button type="button" className="min-h-11 self-start font-bold underline underline-offset-3" onClick={() => setEdited(null)}>
          Start again from what we wrote
        </button>
      ) : null}

      <div className={`sticky bottom-0 flex flex-col gap-2 border-t border-line-subtle bg-paper pt-3 pb-[max(12px,env(safe-area-inset-bottom))] ${aside ? "" : "-mx-4 px-4"}`}>
        <a
          className={buttonClass("primary")}
          href={mailto}
          onClick={() => {
            saveLandlord();
            setChannel("email");
            setTimeout(() => setSheet("sent"), 400);
          }}
        >
          <Icon name="letter" />
          Open in email
        </a>
        <button type="button" className="min-h-11 font-bold underline underline-offset-3" onClick={() => setSheet("other")}>
          Send another way
        </button>
      </div>
    </div>
  );

  return (
    <main className={`flex flex-1 flex-col gap-6 ${aside ? "px-8 pt-6 pb-6" : "px-4 pt-4 pb-6"}`}>
      <Link href={back} className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start font-bold">
        <Icon name="back" /> Back
      </Link>
      <h1 className="font-display text-[32px] leading-[1.05] tracking-[0.01em] uppercase">{MESSAGE_TITLE[key]}</h1>
      {aside ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-8">
          {composer}
          <aside className="sticky top-6 flex max-h-[calc(100dvh-48px)] flex-col gap-3 overflow-y-auto rounded-xl border border-line-subtle p-5">{aside}</aside>
        </div>
      ) : (
        composer
      )}

      {single ? <CaseContextSheet open={contextOpen} onClose={() => setContextOpen(false)} group={group} issue={single} /> : null}

      <Sheet open={sheet === "copy"} onClose={() => setSheet(null)} title="Copy your group in?">
        <div className="flex flex-col gap-2">
          {(["bcc", "cc", "none"] as CopyIn[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCopyIn(c);
                setSheet(null);
              }}
              className={`flex flex-col items-start gap-0.5 rounded-xl px-4 py-3 text-left ${copyIn === c ? "bg-signal-soft ring-2 ring-line" : "bg-concrete"}`}
            >
              <span className="text-[17px] font-bold">{COPY_TEXT[c].short}</span>
              <span className="text-[15px] leading-[22px] text-ink-muted">{COPY_TEXT[c].long}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "other"} onClose={() => setSheet(null)} title="Send another way">
        <p className="text-[17px] leading-[26px]">Email leaves the clearest record, but use what your landlord answers.</p>
        <div className="flex flex-col gap-2">
          <a
            className={buttonClass("secondary")}
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              setChannel("whatsapp");
              setTimeout(() => setSheet("sent"), 400);
            }}
          >
            <Icon name="chat" /> WhatsApp
          </a>
          <a
            className={buttonClass("secondary")}
            href={`sms:?&body=${encodeURIComponent(shareText)}`}
            onClick={() => {
              setChannel("text");
              setTimeout(() => setSheet("sent"), 400);
            }}
          >
            <Icon name="phone" /> Text message
          </a>
          <Button
            icon="copy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareText);
              } catch {
                // Copy can fail in some browsers; the sheet still lets them carry on.
              }
              setChannel("copy");
              setSheet("sent");
            }}
          >
            Copy the message
          </Button>
        </div>
        <p className="text-[15px] leading-[22px] text-ink-muted">Sending a letter by post? Copy it, print it, and keep the proof of postage. Add a photo of both afterwards.</p>
      </Sheet>

      <Sheet open={sheet === "sent"} onClose={() => setSheet(null)} title="Did you send it?">
        <p className="text-[17px] leading-[26px]">
          {channel === "email" && copyIn !== "none"
            ? "Once you press send, your group’s copy goes straight onto the record."
            : "Tell us once it’s sent and we’ll add it to the record."}
        </p>
        {channel === "email" && copyIn !== "none" ? (
          <p className="text-[15px] leading-[22px] text-ink-muted">Prototype: the full app does this by itself when your copy arrives, so there&rsquo;s no need to ask.</p>
        ) : null}
        <Button variant="primary" onClick={confirmSent}>
          Yes, I sent it
        </Button>
        <Button variant="ghost" onClick={() => setSheet(null)}>
          Not yet
        </Button>
      </Sheet>
    </main>
  );
}

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <dt className="w-16 flex-none text-[15px] text-ink-muted">{title}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2 text-[16px] leading-[22px]">{children}</dd>
    </div>
  );
}

function FactGroup({
  title,
  facts,
  isOn,
  onToggle,
  empty,
  note,
  action,
}: {
  title: string;
  facts: Fact[];
  isOn: (f: Fact) => boolean;
  onToggle: (f: Fact) => void;
  empty?: string;
  note?: string;
  action?: { text: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col rounded-xl bg-concrete">
      <div className="flex min-h-11 items-center justify-between px-4 pt-2">
        <p className="text-[15px] font-bold">{title}</p>
        {action ? (
          <button type="button" onClick={action.onClick} className="min-h-11 px-1 text-[15px] font-bold underline underline-offset-3">
            {action.text}
          </button>
        ) : null}
      </div>
      {note ? <p className="px-4 text-[13px] leading-[18px] text-ink-muted">{note}</p> : null}
      {facts.length ? (
        <ul className="flex flex-col divide-y divide-line-subtle">
          {facts.map((f) => (
            <li key={f.id}>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
                <input type="checkbox" checked={isOn(f)} onChange={() => onToggle(f)} className="mt-0.5 size-5 flex-none accent-[var(--ink)]" />
                <span className={`text-[15px] leading-[22px] ${isOn(f) ? "" : "text-ink-muted line-through"}`}>{f.text}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 pt-1 pb-3 text-[14px] leading-[20px] text-ink-muted">{empty}</p>
      )}
    </div>
  );
}
