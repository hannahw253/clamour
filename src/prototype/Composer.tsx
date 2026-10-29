"use client";

/**
 * The email screen (north star, document 6: What goes into a prepared message; decision D-026).
 * Choose what to say and the style first; nothing is written until "Write it". With AI on, the
 * model writes from the ticked items only; with AI off, the standard letter is built from them.
 * Used full-screen on the phone and beside the record on the desktop dashboard.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AiHelp, aiEnabled } from "./AiHelp";
import { DEFAULT_STYLE, NEW_PROMPT, accessText, affectedFacts, openRequests, recordFacts, updateText, updatesSince, wordsFacts, type Fact, type Style } from "./context";
import { londonParts, shortDate } from "./dates";
import { MESSAGE_TITLE, aiFacts, buildGroupMessage, buildMessage, type Answers } from "./messages";
import { addEntries, closeRequests, myMember, prefsOf, setGroupAddress, setLandlord, setMyFlat, useStore } from "./store";
import { InkHeader } from "./Frame";
import { UpdateSheet } from "./Updates";
import { LETTER_LABEL, ME, issueRef, type Group, type Issue, type LetterKey } from "./types";
import { Button, Icon, Sheet, buttonClass, inputClass, label, panel, panelList, selectedPanel, toggleClass } from "./ui";

type CopyIn = "bcc" | "cc" | "none";

const COPY_TEXT: Record<CopyIn, { short: string; long: string }> = {
  bcc: { short: "Your group, privately (BCC)", long: "Your landlord won’t see it. Your email is saved to the record as sent." },
  cc: { short: "Your group, openly (CC)", long: "Your landlord will see it. When they reply to all, their reply is saved too." },
  none: { short: "Not copied", long: "Nothing is saved automatically. You’ll need to forward it to your group." },
};

type Written = { body: string; source: "ai" | "standard"; why?: "off" | "failed" };

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
  const key: LetterKey = issues.length > 1 ? "group" : letterKey;
  const single = issues.length === 1 ? issues[0] : null;
  /** Facts ticked off (record and words start ticked) and private facts ticked on (start unticked). */
  const [off, setOff] = useState<string[]>([]);
  const [on, setOn] = useState<string[]>([]);
  const [useAccess, setUseAccess] = useState(true);
  const [extra, setExtra] = useState("");
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE[key]);
  const [written, setWritten] = useState<Written | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [addrDraft, setAddrDraft] = useState<{ line: string; postcode: string; flat: string } | null>(null);
  const [updateFor, setUpdateFor] = useState<Issue | null>(null);
  const [copyIn, setCopyIn] = useState<CopyIn>(() => prefsOf(s).copyIn);
  const [editing, setEditing] = useState(false);
  const [aiPrev, setAiPrev] = useState<string | null>(null);
  const [toDraft, setToDraft] = useState<{ name: string; email: string } | null>(null);
  const [sheet, setSheet] = useState<"copy" | "other" | "sent" | null>(null);
  const [channel, setChannel] = useState<"email" | "whatsapp" | "text" | "copy">("email");

  useEffect(() => {
    let live = true;
    aiEnabled().then((v) => live && setAiOn(v));
    return () => {
      live = false;
    };
  }, []);

  if (!s) return null;

  const prefs = prefsOf(s);
  const useAi = prefs.ai && aiOn === true;
  const me = myMember(group);
  const needsFlat = group.type !== "house" && !me?.flat;
  const needsAddress = !group.address?.line || needsFlat;
  const addr = addrDraft ?? { line: group.address?.line ?? "", postcode: group.address?.postcode ?? "", flat: me?.flat ?? "" };
  const prompt = NEW_PROMPT[key];
  const ids = issues.map((i) => i.id);

  const perIssue = issues.map((issue) => {
    const aff = affectedFacts(group, issue);
    return { issue, record: key === "group" ? [] : recordFacts(issue), words: wordsFacts(group, issue), affected: aff.facts, hidden: aff.hidden };
  });
  const facts: Fact[] = perIssue.flatMap((p) => [...p.record, ...p.words, ...p.affected]);
  const isOn = (f: Fact) => (f.source === "affected" ? on.includes(f.id) : !off.includes(f.id));
  const flip = (f: Fact) =>
    f.source === "affected" ? setOn(on.includes(f.id) ? on.filter((x) => x !== f.id) : [...on, f.id]) : setOff(off.includes(f.id) ? off.filter((x) => x !== f.id) : [...off, f.id]);
  const selected = facts.filter(isOn);
  const access = useAccess ? accessText(prefs) : "";
  const landlord = toDraft ?? { name: group.landlord?.name ?? "", email: group.landlord?.email ?? "" };
  const askForLandlord = !group.landlord?.email || toDraft !== null;
  const myName = prefs.signoff.trim() || me?.name || s.myName || "Your name";

  const standard = (answers: Answers) =>
    key === "group"
      ? buildGroupMessage({ group, issues, myName, landlordName: landlord.name }, answers)
      : buildMessage(key, { group, issue: issues[0], myName, landlordName: landlord.name }, answers);
  const subject = standard({ selected, access, style }).subject;
  const body = written?.body ?? "";
  const myRequest = openRequests(group, ids).find((r) => r.by === ME);

  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);
  if (copyIn !== "none") params.set(copyIn, group.inbox);
  const mailto = `mailto:${encodeURIComponent(landlord.email.trim())}?${params.toString().replace(/\+/g, "%20")}`;
  const shareText = `${subject}\n\n${body}`;

  const saveDetails = () => {
    if (toDraft && (landlord.email.trim() || landlord.name.trim())) setLandlord(group.id, { name: landlord.name.trim(), email: landlord.email.trim() });
    setToDraft(null);
    if (addrDraft) {
      if (addrDraft.line.trim()) setGroupAddress(group.id, { line: addrDraft.line.trim(), postcode: addrDraft.postcode.trim().toUpperCase() });
      if (addrDraft.flat.trim()) setMyFlat(group.id, addrDraft.flat);
      setAddrDraft(null);
    }
  };

  /** Write the message from what's ticked: AI when it's on, the standard letter otherwise. */
  const write = async () => {
    saveDetails();
    let chosen = selected;
    let onlyHere: string | undefined;
    if (extra.trim()) {
      if (single && prompt.save) {
        // "Anything new?" is an update like any other: it goes on the record, then into this letter.
        addEntries(group.id, single.id, [{ kind: "note", at: new Date().toISOString(), text: extra.trim(), topic: prompt.topic }]);
        chosen = [...selected, { id: "new", source: "words", topic: prompt.topic, issueId: single.id, text: updateText(group, single, { by: ME, topic: prompt.topic, text: extra }) }];
        setExtra("");
      } else {
        onlyHere = extra.trim();
      }
    }
    const std = standard({ selected: chosen, access, style, extra: onlyHere });
    setAiPrev(null);
    setEditing(false);
    if (!useAi) {
      setWritten({ body: std.body, source: "standard", why: "off" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "write", draft: std.body, style, facts: aiFacts(key, group, issues, chosen.map((f) => f.text)) }),
      });
      const json = (await res.json()) as { body?: string };
      setWritten(res.ok && json.body ? { body: json.body, source: "ai" } : { body: std.body, source: "standard", why: "failed" });
    } catch {
      setWritten({ body: std.body, source: "standard", why: "failed" });
    } finally {
      setBusy(false);
    }
  };

  const confirmSent = () => {
    const at = new Date().toISOString();
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
            subject,
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
    closeRequests(group.id, { issueIds: ids });
    router.push(afterSent(viaEmail ? "email" : "other"));
  };

  const header = (
    <>
      {askForLandlord ? (
        <section className={`flex flex-col gap-3 p-4 ${panel}`}>
          <p className="text-[1.0625rem] leading-[1.5rem] font-bold">Who do you email about repairs?</p>
          <label className="flex flex-col gap-1">
            <span className="text-[0.9375rem] text-ink-muted">Name (landlord, agent or factor)</span>
            <input className={inputClass} value={landlord.name} onChange={(e) => setToDraft({ ...landlord, name: e.target.value })} placeholder="Dan at the letting agent" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[0.9375rem] text-ink-muted">Email</span>
            <input
              className={inputClass}
              type="email"
              inputMode="email"
              value={landlord.email}
              onChange={(e) => setToDraft({ ...landlord, email: e.target.value })}
              placeholder="repairs@agent.co.uk"
            />
          </label>
          <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">Saved for your whole group, so nobody has to look it up again.</p>
        </section>
      ) : null}

      {needsAddress && !written ? (
        <section className={`flex flex-col gap-3 p-4 ${panel}`}>
          <p className="text-[1.0625rem] leading-[1.5rem] font-bold">Your address for letters</p>
          {group.type !== "house" ? (
            <label className="flex flex-col gap-1">
              <span className="text-[0.9375rem] text-ink-muted">Your flat</span>
              <input className={inputClass} value={addr.flat} onChange={(e) => setAddrDraft({ ...addr, flat: e.target.value })} placeholder="Flat 3" />
            </label>
          ) : null}
          <label className="flex flex-col gap-1">
            <span className="text-[0.9375rem] text-ink-muted">Street address</span>
            <input className={inputClass} value={addr.line} onChange={(e) => setAddrDraft({ ...addr, line: e.target.value })} placeholder={group.name} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[0.9375rem] text-ink-muted">Postcode</span>
            <input className={inputClass} value={addr.postcode} onChange={(e) => setAddrDraft({ ...addr, postcode: e.target.value })} placeholder="LS6 1AB" autoComplete="postal-code" />
          </label>
          <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">Formal letters need the full address. The street and postcode are saved for your group; your flat is saved for you.</p>
        </section>
      ) : null}

      <dl className={panelList}>
        {!askForLandlord ? (
          <Row title="To">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{landlord.name || landlord.email}</span>
              {landlord.name ? <span className="block truncate text-[0.9375rem] text-ink-muted">{landlord.email}</span> : null}
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
          <span className="min-w-0 flex-1 font-bold">{subject}</span>
        </Row>
      </dl>
    </>
  );

  const choose = (
    <>
      {myRequest ? (
        <p className="flex items-start gap-2 rounded-lg border-2 border-line px-4 py-3 text-[0.9375rem] leading-[1.375rem]">
          <Icon name="ask" className="mt-0.5" />
          <span>
            You asked for updates on {shortDate(londonParts(myRequest.at).ymd)}.{" "}
            {(() => {
              const n = updatesSince(group, ids, myRequest.at);
              return n ? `${n} new ${n === 1 ? "update" : "updates"} since, included below.` : "Nothing new yet.";
            })()}
          </span>
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[1.125rem] leading-[1.75rem] font-bold">What should we say?</h2>
          <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">Everything useful is ticked. Open a list to leave something out.</p>
        </div>
        {perIssue.map((p) => (
          <div key={p.issue.id} className="flex flex-col gap-3">
            {key === "group" ? <p className={`${label} mt-1 text-ink-muted`}>{`${issueRef(p.issue)} · ${p.issue.title}`}</p> : null}
            {key !== "group" ? (
              <FactGroup title="From the record" facts={p.record} isOn={isOn} onToggle={flip} empty="Nothing extra yet. Add evidence and it will appear here." />
            ) : null}
            <FactGroup
              title={group.type === "house" ? "From your housemates and you" : "From households"}
              facts={p.words}
              isOn={isOn}
              onToggle={flip}
              empty="No updates yet. Add how it affects you, or ask your group."
              action={{ text: "Add yours", onClick: () => setUpdateFor(p.issue) }}
            />
            {p.affected.length || p.hidden ? (
              <FactGroup
                title="Who is affected (private)"
                note="Only details each household agreed to share for letters. Unticked until you tick them."
                facts={p.affected}
                isOn={isOn}
                onToggle={flip}
                empty=""
                footer={p.hidden ? `${p.hidden} more ${p.hidden === 1 ? "detail isn't" : "details aren't"} shared for letters by the household that gave ${p.hidden === 1 ? "it" : "them"}.` : undefined}
              />
            ) : null}
          </div>
        ))}
        {accessText(prefs) ? (
          <FactGroup title="Access" facts={[{ id: "access", source: "record", text: accessText(prefs) }]} isOn={() => useAccess} onToggle={() => setUseAccess(!useAccess)} />
        ) : (
          <Link href="/prototype/settings" className="min-h-11 self-start text-[0.9375rem] font-bold underline underline-offset-3">
            Add when you&rsquo;re usually in, for access
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="letter-extra" className="text-[1.0625rem] leading-[1.5rem] font-bold">
          {prompt.label}
        </label>
        <textarea
          id="letter-extra"
          className={`${inputClass} min-h-24 py-3 text-[1rem] leading-[1.5rem]`}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={prompt.placeholder}
        />
        <p className="text-[0.9375rem] leading-[1.25rem] text-ink-muted">
          Optional{single && prompt.save ? ". Saved as your update" : ""}.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[1.125rem] leading-[1.75rem] font-bold">How should it sound?</h2>
        <Segmented
          legend="Tone"
          value={style.tone}
          options={[
            { value: "polite", text: "Polite" },
            { value: "firm", text: "Firm" },
          ]}
          onChange={(tone) => setStyle({ ...style, tone })}
        />
        <Segmented
          legend="Length"
          value={style.length}
          options={[
            { value: "short", text: "Short" },
            { value: "detailed", text: "Detailed" },
          ]}
          onChange={(length) => setStyle({ ...style, length })}
        />
      </section>
    </>
  );

  const review = (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className={label}>Your message</h2>
          <button type="button" className="min-h-11 px-2 font-bold underline underline-offset-3" onClick={() => setEditing(!editing)}>
            {editing ? "Done" : "Edit"}
          </button>
        </div>
        {written?.source === "ai" ? (
          <p role="status" className={`flex items-center gap-2 px-3 py-2 text-[0.9375rem] leading-[1.375rem] ${panel}`}>
            <Icon name="ai" size={16} />
            <span className="flex-1 font-bold">Written by AI from what you ticked. Check every fact before you send.</span>
            {aiPrev !== null ? (
              <button
                type="button"
                className="min-h-11 px-1 font-bold underline underline-offset-3"
                onClick={() => {
                  setWritten({ ...written, body: aiPrev });
                  setAiPrev(null);
                }}
              >
                Undo
              </button>
            ) : null}
          </p>
        ) : (
          <p role="status" className="rounded-lg bg-concrete px-3 py-2 text-[0.9375rem] leading-[1.375rem]">
            <span className="font-bold">The standard letter, from what you ticked.</span>{" "}
            {written?.why === "failed" ? "AI couldn't write it just now, so nothing is lost." : !prefs.ai ? "AI help is off in your settings." : "AI writing isn't switched on in this prototype yet."}
          </p>
        )}
        {editing ? (
          <textarea aria-label="Message" className={`${inputClass} min-h-[380px] py-3 text-[1rem] leading-[1.5625rem]`} value={body} onChange={(e) => setWritten({ ...(written as Written), body: e.target.value })} />
        ) : (
          <p className="rounded-lg border border-line-subtle px-4 py-4 text-[1rem] leading-[1.25rem] whitespace-pre-wrap">{body}</p>
        )}
      </section>

      {prefs.ai ? (
        <AiHelp
          draft={body}
          facts={aiFacts(key, group, issues, selected.map((f) => f.text))}
          language={prefs.language}
          onApply={(text) => {
            setAiPrev(body);
            setWritten({ body: text, source: "ai" });
            setEditing(false);
          }}
          onAgain={write}
          againBusy={busy}
        />
      ) : null}

      <button type="button" className="min-h-11 self-start font-bold underline underline-offset-3" onClick={() => setWritten(null)}>
        Change what&rsquo;s included
      </button>
    </>
  );

  const footer = (
    <div className={`sticky bottom-0 flex flex-col gap-2 border-t border-line-subtle bg-paper pt-3 pb-[max(12px,env(safe-area-inset-bottom))] ${aside ? "" : "-mx-4 px-4"}`}>
      {written ? (
        <>
          <a
            className={buttonClass("primary")}
            href={mailto}
            onClick={() => {
              saveDetails();
              setChannel("email");
              setTimeout(() => setSheet("sent"), 400);
            }}
          >
            <Icon name="email" />
            Open in email
          </a>
          <button type="button" className="min-h-11 font-bold underline underline-offset-3" onClick={() => setSheet("other")}>
            Send another way
          </button>
        </>
      ) : (
        <>
          <Button variant="primary" icon="ai" onClick={write} disabled={busy}>
            {busy ? "Writing…" : "Write it"}
          </Button>
          <p className="text-center text-[0.8125rem] leading-[1.125rem] text-ink-muted">You check it before anything is sent.</p>
        </>
      )}
    </div>
  );

  const composer = (
    <div className="flex flex-col gap-6">
      {header}
      {written ? review : choose}
      {footer}
    </div>
  );

  return (
    <main className={`flex flex-1 flex-col gap-6 ${aside ? "px-8 pt-6 pb-6" : "px-4 pb-6"}`}>
      <InkHeader back={written ? { onClick: () => setWritten(null), text: "What to include" } : { href: back, text: "Back" }} title={MESSAGE_TITLE[key]} display />
      {aside ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-8">
          {composer}
          <aside className="sticky top-6 flex max-h-[calc(100dvh-48px)] flex-col gap-3 overflow-y-auto rounded-lg border border-line-subtle bg-paper p-5">{aside}</aside>
        </div>
      ) : (
        composer
      )}

      {updateFor ? <UpdateSheet open onClose={() => setUpdateFor(null)} group={group} issue={group.issues.find((i) => i.id === updateFor.id) ?? updateFor} /> : null}

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
              className={`flex flex-col items-start gap-0.5 px-4 py-3 text-left ${copyIn === c ? selectedPanel : panel}`}
            >
              <span className="text-[1.0625rem] font-bold">{COPY_TEXT[c].short}</span>
              <span className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">{COPY_TEXT[c].long}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "other"} onClose={() => setSheet(null)} title="Send another way">
        <p className="text-[1.0625rem] leading-[1.625rem]">Email leaves the clearest record, but use what your landlord answers.</p>
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
            <Icon name="whatsapp" /> WhatsApp
          </a>
          <a
            className={buttonClass("secondary")}
            href={`sms:?&body=${encodeURIComponent(shareText)}`}
            onClick={() => {
              setChannel("text");
              setTimeout(() => setSheet("sent"), 400);
            }}
          >
            <Icon name="text" /> Text message
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
        <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">Sending a letter by post? Copy it, print it, and keep the proof of postage. Add a photo of both afterwards.</p>
      </Sheet>

      <Sheet open={sheet === "sent"} onClose={() => setSheet(null)} title="Did you send it?">
        <p className="text-[1.0625rem] leading-[1.625rem]">
          {channel === "email" && copyIn !== "none"
            ? "Once you press send, your group’s copy goes straight onto the record."
            : "Tell us once it’s sent and we’ll add it to the record."}
        </p>
        {channel === "email" && copyIn !== "none" ? (
          <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">Prototype: the full app does this by itself when your copy arrives, so there&rsquo;s no need to ask.</p>
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
      <dt className="w-16 flex-none text-[0.9375rem] text-ink-muted">{title}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2 text-[1.0625rem] leading-[1.375rem]">{children}</dd>
    </div>
  );
}

function Segmented<T extends string>({ legend, value, options, onChange }: { legend: string; value: T; options: { value: T; text: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex items-center gap-3">
      <legend className="sr-only">{legend}</legend>
      <span aria-hidden className="w-16 flex-none text-[0.9375rem] text-ink-muted">
        {legend}
      </span>
      <div className="grid flex-1 grid-cols-2 gap-2">
        {options.map((o) => (
          <label key={o.value} className={`cursor-pointer justify-center ${toggleClass(value === o.value)}`}>
            <input type="radio" name={legend} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A tick list folded to one line ("From the record · 4 of 4 ticked"), so the screen stays short. */
function FactGroup({
  title,
  facts,
  isOn,
  onToggle,
  empty,
  note,
  footer,
  action,
}: {
  title: string;
  facts: Fact[];
  isOn: (f: Fact) => boolean;
  onToggle: (f: Fact) => void;
  empty?: string;
  note?: string;
  footer?: string;
  action?: { text: string; onClick: () => void };
}) {
  const [open, setOpen] = useState(false);
  const ticked = facts.filter(isOn).length;
  const summary = !facts.length ? "" : ticked === 0 ? "None ticked" : ticked === facts.length ? `All ${facts.length} ticked` : `${ticked} of ${facts.length} ticked`;
  return (
    <div className={`flex flex-col ${panel}`}>
      <div className="flex min-h-12 items-center gap-2 px-4">
        {facts.length ? (
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-12 flex-1 items-center gap-2 text-left">
            <Icon name="expand" className={`transition-transform ${open ? "rotate-180" : ""}`} />
            <span className="flex flex-col py-2">
              <span className="text-[1rem] leading-[1.375rem] font-bold">{title}</span>
              <span className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">{summary}</span>
            </span>
          </button>
        ) : (
          <p className="flex-1 py-3 text-[1rem] leading-[1.375rem] font-bold">{title}</p>
        )}
        {action ? (
          <button type="button" onClick={action.onClick} className="min-h-11 px-1 text-[0.9375rem] font-bold underline underline-offset-3">
            {action.text}
          </button>
        ) : null}
      </div>
      {open && note ? <p className="px-4 pb-1 text-[0.8125rem] leading-[1.125rem] text-ink-muted">{note}</p> : null}
      {open && facts.length ? (
        <ul className="flex flex-col divide-y divide-line-subtle border-t border-line-subtle">
          {facts.map((f) => (
            <li key={f.id}>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
                <input type="checkbox" checked={isOn(f)} onChange={() => onToggle(f)} className="mt-0.5 size-5 flex-none accent-[var(--ink)]" />
                <span className="flex flex-col gap-0.5">
                  <span className={`text-[0.9375rem] leading-[1.375rem] ${isOn(f) ? "" : f.source === "affected" ? "text-ink-muted" : "text-ink-muted line-through"}`}>{f.text}</span>
                  {f.meta ? <span className="text-[0.8125rem] leading-[1.125rem] text-ink-muted">{f.meta}</span> : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      {!facts.length && empty ? <p className="px-4 pb-3 text-[0.9375rem] leading-[1.375rem] text-ink-muted">{empty}</p> : null}
      {open && footer ? <p className="px-4 pt-1 pb-3 text-[0.8125rem] leading-[1.125rem] text-ink-muted">{footer}</p> : null}
    </div>
  );
}
