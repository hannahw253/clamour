"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { nextAction } from "@/prototype/actions";
import { MESSAGE_TITLE, NO_ANSWERS, buildMessage, type Answers } from "@/prototype/messages";
import { addEntries, findGroup, myMember, setLandlord, useStore } from "@/prototype/store";
import { LETTER_LABEL, type LetterKey } from "@/prototype/types";
import { Button, Icon, Loading, Sheet, buttonClass, inputClass, label } from "@/prototype/ui";

type CopyIn = "bcc" | "cc" | "none";

const COPY_TEXT: Record<CopyIn, { short: string; long: string }> = {
  bcc: { short: "Your group, privately (BCC)", long: "Your landlord won’t see it. Your email is saved to the record as sent." },
  cc: { short: "Your group, openly (CC)", long: "Your landlord will see it. When they reply to all, their reply is saved too." },
  none: { short: "Not copied", long: "Nothing is saved automatically. You’ll need to forward it to your group." },
};

export default function SendPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Send />
    </Suspense>
  );
}

/** The prepared email (north star, documents 6 and 8: "Do it for them"). */
function Send() {
  const { gid, iid } = useParams<{ gid: string; iid: string }>();
  const asked = useSearchParams().get("letter");
  const router = useRouter();
  const s = useStore();
  const [answers, setAnswers] = useState<Answers>(NO_ANSWERS);
  const [copyIn, setCopyIn] = useState<CopyIn>("bcc");
  const [edited, setEdited] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [toDraft, setToDraft] = useState<{ name: string; email: string } | null>(null);
  const [sheet, setSheet] = useState<"copy" | "other" | "sent" | null>(null);
  const [channel, setChannel] = useState<"email" | "whatsapp" | "text" | "copy">("email");
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  const issue = group?.issues.find((i) => i.id === iid);
  if (!group || !issue) return null;

  const next = nextAction(group, issue);
  const key: LetterKey =
    asked && asked in LETTER_LABEL ? (asked as LetterKey) : next.kind === "send" ? next.letter : "repair_request";
  const landlord = toDraft ?? { name: group.landlord?.name ?? "", email: group.landlord?.email ?? "" };
  const askForLandlord = !group.landlord?.email || toDraft !== null;
  const myName = myMember(group)?.name ?? s.myName ?? "Your name";
  const message = buildMessage(key, { group, issue, myName, landlordName: landlord.name }, answers);
  const body = edited ?? message.body;
  const back = `/prototype/g/${group.id}/i/${issue.id}`;

  const params = new URLSearchParams();
  params.set("subject", message.subject);
  params.set("body", body);
  if (copyIn !== "none") params.set(copyIn, group.inbox);
  const mailto = `mailto:${encodeURIComponent(landlord.email.trim())}?${params.toString().replace(/\+/g, "%20")}`;

  const saveLandlord = () => {
    if (landlord.email.trim() || landlord.name.trim()) setLandlord(group.id, { name: landlord.name.trim(), email: landlord.email.trim() });
    setToDraft(null);
  };

  const confirmSent = () => {
    const at = new Date().toISOString();
    if (channel === "email" && copyIn !== "none") {
      addEntries(group.id, issue.id, [
        {
          kind: "email",
          direction: "to_landlord",
          at,
          from: `${myName} (you)`,
          to: landlord.email.trim() || "your landlord",
          subject: message.subject,
          text: body,
          via: copyIn,
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
    router.push(`${back}?sent=${channel === "email" && copyIn !== "none" ? "email" : "other"}`);
  };

  const shareText = `${message.subject}\n\n${body}`;

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-6">
      <Link href={back} className="inline-flex min-h-11 items-center gap-1 self-start font-bold">
        <Icon name="back" /> Back
      </Link>
      <h1 className="font-display text-[32px] leading-[1.05] tracking-[0.01em] uppercase">{MESSAGE_TITLE[key]}</h1>

      {askForLandlord ? (
        <section className="flex flex-col gap-3 rounded-xl bg-concrete p-4">
          <p className="text-[17px] leading-6 font-bold">Who do you email about repairs?</p>
          <label className="flex flex-col gap-1">
            <span className="text-[15px] text-ink-muted">Name (landlord, agent or factor)</span>
            <input
              className={inputClass}
              value={landlord.name}
              onChange={(e) => setToDraft({ ...landlord, name: e.target.value })}
              placeholder="Dan at the letting agent"
            />
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

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className={label}>Message</h2>
          <button type="button" className="min-h-11 px-2 font-bold underline underline-offset-3" onClick={() => setEditing(!editing)}>
            {editing ? "Done" : "Edit"}
          </button>
        </div>
        {editing ? (
          <textarea
            aria-label="Message"
            className={`${inputClass} min-h-[380px] py-3 text-[16px] leading-[25px]`}
            value={body}
            onChange={(e) => setEdited(e.target.value)}
          />
        ) : (
          <p className="rounded-xl border border-line-subtle px-4 py-4 text-[16px] leading-[25px] whitespace-pre-wrap">{body}</p>
        )}
      </section>

      {!edited ? (
        <section className="flex flex-col gap-3">
          <h2 className={label}>Add to the message (optional)</h2>
          <div className="flex flex-wrap gap-2">
            <Toggle on={answers.health} onClick={() => setAnswers({ ...answers, health: !answers.health })}>
              It&rsquo;s affecting our health
            </Toggle>
            <Toggle on={answers.vulnerable} onClick={() => setAnswers({ ...answers, vulnerable: !answers.vulnerable })}>
              Children or someone vulnerable lives here
            </Toggle>
          </div>
          <input
            aria-label="When are you in for access?"
            className={inputClass}
            value={answers.access}
            onChange={(e) => setAnswers({ ...answers, access: e.target.value })}
            placeholder="When are you in? e.g. weekdays after 5pm"
          />
        </section>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line-subtle bg-paper px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
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
        <p className="text-[15px] leading-[22px] text-ink-muted">
          Sending a letter by post? Copy it, print it, and keep the proof of postage. Add a photo of both afterwards.
        </p>
      </Sheet>

      <Sheet open={sheet === "sent"} onClose={() => setSheet(null)} title="Did you send it?">
        <p className="text-[17px] leading-[26px]">
          {channel === "email" && copyIn !== "none"
            ? "Once you press send, your group’s copy goes straight onto the record."
            : "Tell us once it’s sent and we’ll add it to the record."}
        </p>
        {channel === "email" && copyIn !== "none" ? (
          <p className="text-[15px] leading-[22px] text-ink-muted">
            Prototype: the full app does this by itself when your copy arrives, so there&rsquo;s no need to ask.
          </p>
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

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <dt className="w-16 flex-none text-[15px] text-ink-muted">{title}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2 text-[16px] leading-[22px]">{children}</dd>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-[15px] font-bold ${
        on ? "border-line bg-ink text-paper" : "border-line-subtle bg-paper text-ink"
      }`}
    >
      {on ? <Icon name="tick" size={16} /> : <Icon name="plus" size={16} />}
      {children}
    </button>
  );
}
