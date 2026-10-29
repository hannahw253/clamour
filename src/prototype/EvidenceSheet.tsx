"use client";

/**
 * Sheets for adding to an issue's record: "Add evidence" (every capture channel in the
 * north star's document 4), "Tell your landlord", and the dated landlord visit / fixed forms.
 */

import { useState, type ReactNode } from "react";
import { fromLocalInput, toLocalInput } from "./dates";
import { GroupAddress } from "./GroupAddress";
import { PhotoPicker } from "./PhotoPicker";
import { fileSize, fingerprintFile, parseChatExport, shortHash } from "./photos";
import type { NewEntry } from "./store";
import { METHOD_LABEL, type FileRef, type Group, type Issue, type Photo, type ReportMethod } from "./types";
import { UpdateForm } from "./Updates";
import { Button, ChoiceCard, Field, Icon, Sheet, buttonClass, inputClass, label, type IconName, panel } from "./ui";

export type Save = (entries: NewEntry[]) => void;

type Kind = "photo" | "messages" | "email" | "call" | "post" | "reading" | "receipt" | "chat" | "note";

const KINDS: { kind: Kind; icon: IconName; title: string; short: string }[] = [
  { kind: "photo", icon: "camera", title: "Photo or video", short: "Photo or video" },
  { kind: "messages", icon: "screenshot", title: "Screenshot of messages", short: "Message screenshot" },
  { kind: "email", icon: "email", title: "Email", short: "Email" },
  { kind: "call", icon: "call", title: "Phone call or conversation", short: "Call or chat" },
  { kind: "post", icon: "post", title: "Posted letter", short: "Posted letter" },
  { kind: "reading", icon: "reading", title: "Damp or temperature reading", short: "Reading" },
  { kind: "receipt", icon: "receipt", title: "Receipt", short: "Receipt" },
  { kind: "chat", icon: "chatExport", title: "Whole chat export", short: "Chat export" },
  { kind: "note", icon: "update", title: "Add an update", short: "Update in words" },
];

const textareaClass = `${inputClass} min-h-24 py-3 leading-[1.625rem]`;

export function AddEvidenceSheet({
  open,
  onClose,
  onSave,
  group,
  issue,
}: {
  open: boolean;
  onClose: () => void;
  onSave: Save;
  group: Group;
  issue: Issue;
}) {
  const [kind, setKind] = useState<Kind | null>(null);
  const close = () => {
    setKind(null);
    onClose();
  };
  const save: Save = (entries) => {
    setKind(null);
    onSave(entries);
  };
  const current = KINDS.find((k) => k.kind === kind);
  return (
    <Sheet open={open} onClose={close} title={current ? current.title : "Add evidence"}>
      {!kind ? (
        <>
          <p className="text-[1rem] leading-[1.5rem] text-ink-muted">Originals are kept exactly as they are, with the time they reached the record.</p>
          <ul className="grid grid-cols-3 gap-2">
            {KINDS.map((k) => (
              <li key={k.kind}>
                <button
                  type="button"
                  onClick={() => setKind(k.kind)}
                  className={`flex min-h-[92px] w-full flex-col items-center justify-center gap-1.5 px-2 py-3 text-center text-[0.9375rem] leading-[1.125rem] font-bold ${panel}`}
                >
                  <Icon name={k.icon} size={24} />
                  {k.short}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col gap-5">
          <button type="button" onClick={() => setKind(null)} className="inline-flex min-h-11 items-center gap-1 self-start font-bold">
            <Icon name="back" /> Other kinds of evidence
          </button>
          {kind === "photo" ? <PhotoVideoForm onSave={save} /> : null}
          {kind === "messages" ? <MessagesForm onSave={save} /> : null}
          {kind === "email" ? <EmailForm onSave={save} group={group} issue={issue} /> : null}
          {kind === "call" ? <CallForm onSave={save} /> : null}
          {kind === "post" ? <PostForm onSave={save} /> : null}
          {kind === "reading" ? <ReadingForm onSave={save} /> : null}
          {kind === "receipt" ? <ReceiptForm onSave={save} /> : null}
          {kind === "chat" ? <ChatForm onSave={save} /> : null}
          {kind === "note" ? <UpdateForm group={group} issue={issue} onDone={close} /> : null}
        </div>
      )}
    </Sheet>
  );
}

// ---- Shared bits ---------------------------------------------------------------

function Form({ onSubmit, disabled, saveText = "Save", children }: { onSubmit: () => void; disabled?: boolean; saveText?: string; children: ReactNode }) {
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
    >
      {children}
      <Button type="submit" variant="primary" disabled={disabled}>
        {saveText}
      </Button>
    </form>
  );
}

function When({ id, title, value, onChange, help }: { id: string; title: string; value: string; onChange: (v: string) => void; help?: string }) {
  return (
    <Field id={id} title={title} help={help}>
      <input id={id} type="datetime-local" className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Note({ id, title = "Anything to add? (optional)", value, onChange, placeholder }: { id: string; title?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field id={id} title={title}>
      <textarea id={id} className={textareaClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </Field>
  );
}

function FilePick({ accept, text, icon, onFiles }: { accept: string; text: string; icon: IconName; onFiles: (f: File[]) => void }) {
  return (
    <label className={buttonClass("secondary", "cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus")}>
      <Icon name={icon} />
      {text}
      <input
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </label>
  );
}

function FileList({ files }: { files: FileRef[] }) {
  if (!files.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {files.map((f, i) => (
        <li key={f.sha256 + i} className="flex flex-col rounded-lg bg-concrete px-4 py-3">
          <span className="truncate text-[0.9375rem] font-bold">{f.name}</span>
          <span className="font-mono text-[0.8125rem] leading-[1.125rem] text-ink-muted">
            {fileSize(f.bytes)} · SHA-256 {shortHash(f.sha256)}
          </span>
        </li>
      ))}
    </ul>
  );
}

const now = () => new Date().toISOString();

// ---- Forms ---------------------------------------------------------------------

function PhotoVideoForm({ onSave }: { onSave: Save }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [videos, setVideos] = useState<FileRef[]>([]);
  const [text, setText] = useState("");
  const empty = !photos.length && !videos.length;
  return (
    <Form
      disabled={empty}
      onSubmit={() => {
        const at = now();
        onSave([
          ...photos.map((photo) => ({ kind: "photo" as const, at, photo, text: photo.alt || undefined })),
          ...videos.map((file) => ({ kind: "video" as const, at, file })),
          ...(text.trim() ? [{ kind: "note" as const, at, text: text.trim() }] : []),
        ]);
      }}
    >
      <PhotoPicker photos={photos} onChange={setPhotos} />
      <FilePick accept="video/*" text="Add a video" icon="video" onFiles={async (f) => setVideos([...videos, ...(await Promise.all(f.map(fingerprintFile)))])} />
      <FileList files={videos} />
      {videos.length ? (
        <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">Prototype: videos keep their fingerprint only. The full app keeps the video.</p>
      ) : null}
      <Note id="pv-note" value={text} onChange={setText} />
    </Form>
  );
}

function MessagesForm({ onSave }: { onSave: Save }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [who, setWho] = useState("");
  const [when, setWhen] = useState(() => toLocalInput());
  const [text, setText] = useState("");
  return (
    <Form
      disabled={!photos.length}
      onSubmit={() =>
        onSave(photos.map((photo) => ({ kind: "messages" as const, at: fromLocalInput(when), photo, with: who.trim() || "Landlord or agent", text: text.trim() || undefined })))
      }
    >
      <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">
        Take screenshots that show the name or number and the dates. On Android, the full app will let you share them
        straight from WhatsApp.
      </p>
      <PhotoPicker photos={photos} onChange={setPhotos} />
      <Field id="msg-who" title="Who are the messages with?">
        <input id="msg-who" className={inputClass} value={who} onChange={(e) => setWho(e.target.value)} placeholder="Letting agent (WhatsApp)" />
      </Field>
      <When id="msg-when" title="When were they sent?" value={when} onChange={setWhen} help="The date of the latest message in the screenshot." />
      <Note id="msg-note" value={text} onChange={setText} placeholder="What they said, in a line" />
    </Form>
  );
}

function EmailForm({ onSave, group, issue }: { onSave: Save; group: Group; issue: Issue }) {
  const [direction, setDirection] = useState<"to_landlord" | "from_landlord">("to_landlord");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(() => toLocalInput());
  return (
    <div className="flex flex-col gap-5">
      <GroupAddress group={group} issue={issue} />
      <p className="text-[1.0625rem] leading-[1.625rem]">
        <span className="font-bold">Already sent or got it?</span> Forward it to the address above. Use &ldquo;forward as
        attachment&rdquo; if your email app has it: that keeps the original sender&rsquo;s proof.
      </p>
      <details className="rounded-lg bg-concrete px-4 py-3">
        <summary className="min-h-11 cursor-pointer py-2 text-[1.0625rem] font-bold">Prototype: paste an email instead</summary>
        <div className="mt-3">
          <Form
            disabled={!subject.trim() && !body.trim()}
            onSubmit={() =>
              onSave([
                {
                  kind: "email",
                  direction,
                  at: fromLocalInput(when),
                  from: from.trim() || (direction === "to_landlord" ? "you" : "landlord"),
                  to: direction === "to_landlord" ? "landlord" : "you",
                  subject: subject.trim() || "(no subject)",
                  text: body.trim() || undefined,
                  via: "pasted",
                  auth: "not_checked",
                },
              ])
            }
          >
            <fieldset className="flex flex-col gap-2">
              <legend className={`${label} mb-2`}>Who sent it?</legend>
              <ChoiceCard name="dir" value="to_landlord" checked={direction === "to_landlord"} onChange={() => setDirection("to_landlord")} title="I sent it to my landlord" />
              <ChoiceCard name="dir" value="from_landlord" checked={direction === "from_landlord"} onChange={() => setDirection("from_landlord")} title="My landlord or agent sent it" />
            </fieldset>
            <Field id="em-from" title="From">
              <input id="em-from" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="lettings@agent.co.uk" />
            </Field>
            <Field id="em-subject" title="Subject">
              <input id="em-subject" className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field id="em-body" title="Email">
              <textarea id="em-body" className={textareaClass} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <When id="em-when" title="When was it sent?" value={when} onChange={setWhen} />
            <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">Pasted emails can&rsquo;t be checked, so the record says so.</p>
          </Form>
        </div>
      </details>
    </div>
  );
}

function CallForm({ onSave }: { onSave: Save }) {
  const [direction, setDirection] = useState<"you_called" | "they_called" | "in_person">("you_called");
  const [who, setWho] = useState("");
  const [when, setWhen] = useState(() => toLocalInput());
  const [text, setText] = useState("");
  return (
    <Form
      disabled={!text.trim()}
      onSubmit={() => onSave([{ kind: "call", direction, with: who.trim() || "Landlord or agent", at: fromLocalInput(when), text: text.trim() }])}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className={`${label} mb-2`}>What happened?</legend>
        <ChoiceCard name="call" value="you_called" checked={direction === "you_called"} onChange={() => setDirection("you_called")} title="You called them" />
        <ChoiceCard name="call" value="they_called" checked={direction === "they_called"} onChange={() => setDirection("they_called")} title="They called you" />
        <ChoiceCard name="call" value="in_person" checked={direction === "in_person"} onChange={() => setDirection("in_person")} title="You spoke in person" />
      </fieldset>
      <Field id="call-who" title="Who did you speak to?">
        <input id="call-who" className={inputClass} value={who} onChange={(e) => setWho(e.target.value)} placeholder="Dan at the letting agent" />
      </Field>
      <When id="call-when" title="When?" value={when} onChange={setWhen} />
      <Note id="call-note" title="What did they say?" value={text} onChange={setText} placeholder="Engineer booked for Friday morning" />
      <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">
        Next, we&rsquo;ll help you send a short message confirming what was said. A conversation is hard to prove; a written
        record of it isn&rsquo;t.
      </p>
    </Form>
  );
}

function PostForm({ onSave }: { onSave: Save }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [when, setWhen] = useState(() => toLocalInput());
  const [proof, setProof] = useState(false);
  return (
    <Form
      disabled={!photos.length}
      onSubmit={() => {
        const at = fromLocalInput(when);
        const [first, ...rest] = photos;
        onSave([{ kind: "post", at, photo: first, proof, text: first.alt || undefined }, ...rest.map((photo) => ({ kind: "photo" as const, at, photo, text: photo.alt || undefined }))]);
      }}
    >
      <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">
        Photograph the letter before you post it, and the proof of postage from the Post Office.
      </p>
      <PhotoPicker photos={photos} onChange={setPhotos} />
      <When id="post-when" title="When did you post it?" value={when} onChange={setWhen} />
      <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-concrete px-4 py-3">
        <input type="checkbox" checked={proof} onChange={(e) => setProof(e.target.checked)} className="mt-1 size-5 flex-none accent-[var(--ink)]" />
        <span className="text-[1.0625rem] leading-[1.5rem] font-bold">I have proof of postage</span>
      </label>
    </Form>
  );
}

function ReadingForm({ onSave }: { onSave: Save }) {
  const [measure, setMeasure] = useState<"humidity" | "temperature">("humidity");
  const [value, setValue] = useState("");
  const [room, setRoom] = useState("");
  const [when, setWhen] = useState(() => toLocalInput());
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(n) && (measure === "humidity" ? n >= 0 && n <= 100 : n > -30 && n < 60);
  return (
    <Form disabled={!valid} onSubmit={() => onSave([{ kind: "reading", measure, value: n, room: room.trim() || undefined, at: fromLocalInput(when) }])}>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className={`${label} mb-2`}>What did you measure?</legend>
        <ChoiceCard name="measure" value="humidity" checked={measure === "humidity"} onChange={() => setMeasure("humidity")} title="Humidity (%)" />
        <ChoiceCard name="measure" value="temperature" checked={measure === "temperature"} onChange={() => setMeasure("temperature")} title="Temperature (°C)" />
      </fieldset>
      <Field id="reading-value" title={measure === "humidity" ? "Reading (%)" : "Reading (°C)"} help="A cheap hygrometer and thermometer is enough. Take readings at the same time of day.">
        <input id="reading-value" inputMode="decimal" className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} placeholder={measure === "humidity" ? "78" : "14"} />
      </Field>
      <Field id="reading-room" title="Which room? (optional)">
        <input id="reading-room" className={inputClass} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Back bedroom" />
      </Field>
      <When id="reading-when" title="When?" value={when} onChange={setWhen} />
    </Form>
  );
}

function ReceiptForm({ onSave }: { onSave: Save }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [what, setWhat] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <Form
      disabled={!what.trim()}
      onSubmit={() => onSave([{ kind: "receipt", at: now(), photo: photos[0], amount: amount.trim() ? `£${amount.trim().replace(/^£/, "")}` : undefined, text: what.trim() }])}
    >
      <PhotoPicker photos={photos} onChange={setPhotos} />
      <Field id="receipt-what" title="What was it for?">
        <input id="receipt-what" className={inputClass} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Dehumidifier for the back bedroom" />
      </Field>
      <Field id="receipt-amount" title="Amount (optional)">
        <input id="receipt-amount" inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="£" />
      </Field>
    </Form>
  );
}

function ChatForm({ onSave }: { onSave: Save }) {
  const [file, setFile] = useState<FileRef | null>(null);
  const [parsed, setParsed] = useState<ReturnType<typeof parseChatExport>>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  return (
    <Form
      disabled={!file}
      onSubmit={() =>
        file &&
        onSave([
          {
            kind: "chat_export",
            at: now(),
            file,
            participants: parsed?.participants ?? [],
            count: parsed?.count ?? 0,
            first: parsed?.first ?? "",
            last: parsed?.last ?? "",
            preview: parsed?.preview ?? [],
            text: text.trim() || undefined,
          },
        ])
      }
    >
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-[0.9375rem] leading-[1.375rem]">
        <li>In WhatsApp, open the chat with your landlord or agent.</li>
        <li>Tap their name, then &ldquo;Export chat&rdquo;.</li>
        <li>Save the file, then choose it here.</li>
      </ol>
      <FilePick
        accept=".txt,.zip,text/plain,application/zip"
        text="Choose the exported chat"
        icon="chatExport"
        onFiles={async ([f]) => {
          if (!f) return;
          setError(null);
          setFile(await fingerprintFile(f));
          if (f.name.toLowerCase().endsWith(".txt") || f.type === "text/plain") {
            const result = parseChatExport(await f.text());
            setParsed(result);
            if (!result) setError("That file doesn't look like a WhatsApp chat export. It will still be kept as a file.");
          } else {
            setParsed(null);
          }
        }}
      />
      {file ? <FileList files={[file]} /> : null}
      {error ? <p className="text-[0.9375rem] font-bold">{error}</p> : null}
      {parsed ? (
        <div className="flex flex-col gap-1 rounded-lg border-2 border-line-subtle px-4 py-3 text-[0.9375rem] leading-[1.375rem]">
          <p className="font-bold">
            {parsed.count} messages between {parsed.participants.join(", ")}
          </p>
          <p className="font-mono text-[0.8125rem] text-ink-muted">
            {parsed.first} to {parsed.last}
          </p>
        </div>
      ) : file ? (
        <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">Prototype: zip files keep their fingerprint only. The full app reads the messages and photos inside.</p>
      ) : null}
      <Note id="chat-note" value={text} onChange={setText} />
    </Form>
  );
}

// ---- Tell your landlord, visits, fixed ---------------------------------------------

export function ReportSheet({ open, onClose, onSave, group, issue }: { open: boolean; onClose: () => void; onSave: Save; group: Group; issue: Issue }) {
  return (
    <Sheet open={open} onClose={onClose} title="Tell your landlord">
      <ReportForm onSave={onSave} group={group} issue={issue} />
    </Sheet>
  );
}

function ReportForm({ onSave, group, issue }: { onSave: Save; group: Group; issue: Issue }) {
  const [method, setMethod] = useState<ReportMethod>("email");
  const [when, setWhen] = useState(() => toLocalInput());
  const [text, setText] = useState("");
  return (
    <Form onSubmit={() => onSave([{ kind: "reported", method, at: fromLocalInput(when), text: text.trim() || undefined }])}>
      <p className="text-[1.0625rem] leading-[1.625rem]">
        Tell them the way you normally would, then record it here. Writing (email, text or letter) is easiest to prove.
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className={`${label} mb-2`}>How did you tell them?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(METHOD_LABEL) as ReportMethod[]).map((m) => (
            <ChoiceCard key={m} name="method" value={m} checked={method === m} onChange={(v) => setMethod(v as ReportMethod)} title={METHOD_LABEL[m]} />
          ))}
        </div>
      </fieldset>
      {method === "email" ? <GroupAddress group={group} issue={issue} /> : null}
      {method === "phone" || method === "in_person" ? (
        <p className="rounded-lg bg-concrete px-4 py-3 text-[0.9375rem] leading-[1.375rem]">
          After saving, we&rsquo;ll help you confirm what was said in writing, so it isn&rsquo;t just your word against theirs.
        </p>
      ) : null}
      {method === "text" || method === "portal" ? (
        <p className="rounded-lg bg-concrete px-4 py-3 text-[0.9375rem] leading-[1.375rem]">
          Take a screenshot of what you sent and add it with &ldquo;Add evidence&rdquo;, then &ldquo;Screenshot of messages&rdquo;.
        </p>
      ) : null}
      <When id="report-when" title="When?" value={when} onChange={setWhen} />
      <Note id="report-note" value={text} onChange={setText} placeholder="Who you spoke to, or a reference number" />
    </Form>
  );
}

export function WhenSheet(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  whenLabel: string;
  noteLabel: string;
  saveText: string;
  onSave: (at: string, text?: string) => void;
}) {
  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.title}>
      <WhenForm {...props} />
    </Sheet>
  );
}

function WhenForm({ whenLabel, noteLabel, saveText, onSave }: { whenLabel: string; noteLabel: string; saveText: string; onSave: (at: string, text?: string) => void }) {
  const [when, setWhen] = useState(() => toLocalInput());
  const [text, setText] = useState("");
  return (
    <Form saveText={saveText} onSubmit={() => onSave(fromLocalInput(when), text.trim() || undefined)}>
      <When id="when" title={whenLabel} value={when} onChange={setWhen} />
      <Note id="when-note" title={noteLabel} value={text} onChange={setText} />
    </Form>
  );
}
