"use client";

/** An issue's dated record, used on the issue page and in the case file. */

import { useState } from "react";

import { stamp } from "./dates";
import { topicLabel } from "./topics";
import { fileSize, shortHash } from "./photos";
import { memberName } from "./store";
import { EMAIL_VIA_LABEL, LETTER_LABEL, METHOD_LABEL, type Entry, type Group, type Issue } from "./types";
import { Chip, Icon, type IconName } from "./ui";

/** Entries that carry an original file, numbered as exhibits in the case file. */
export function hasExhibit(e: Entry): boolean {
  return (
    e.kind === "photo" ||
    e.kind === "video" ||
    e.kind === "messages" ||
    e.kind === "chat_export" ||
    (e.kind === "email" && e.via !== "pasted") ||
    (e.kind === "post" && !!e.photo) ||
    (e.kind === "receipt" && !!e.photo)
  );
}

export function sortedEntries(issue: Issue) {
  return [...issue.entries].sort((a, b) => a.at.localeCompare(b.at));
}

export function exhibitNumbers(issue: Issue): Map<string, number> {
  const map = new Map<string, number>();
  sortedEntries(issue)
    .filter(hasExhibit)
    .forEach((e, i) => map.set(e.id, i + 1));
  return map;
}

const CALL_TEXT = { you_called: "Called", they_called: "Got a call from", in_person: "Spoke in person with" } as const;

export function entrySummary(e: Entry): { icon: IconName; text: string } {
  switch (e.kind) {
    case "logged":
      return { icon: "plus", text: "Logged the problem" };
    case "photo":
      return { icon: "image", text: "Added a photo" };
    case "video":
      return { icon: "video", text: "Added a video" };
    case "note":
      return { icon: "note", text: e.topic && topicLabel(e.topic) ? `Added an update: ${topicLabel(e.topic)!.toLowerCase()}` : "Added an update" };
    case "reported":
      return { icon: "send", text: `Told the landlord: ${METHOD_LABEL[e.method].toLowerCase()}` };
    case "visit":
      return { icon: "door", text: "Landlord visited" };
    case "letter":
      return { icon: "letter", text: `Prepared a letter: ${LETTER_LABEL[e.letter].toLowerCase()}` };
    case "fixed":
      return { icon: "tick", text: "Marked as fixed" };
    case "reopened":
      return { icon: "warning", text: "Reopened" };
    case "email":
      return { icon: "letter", text: e.direction === "to_landlord" ? "Emailed the landlord" : "Landlord emailed" };
    case "messages":
      return { icon: "image", text: `Added a screenshot of messages with ${e.with}` };
    case "chat_export":
      return { icon: "chat", text: "Added a whole chat export" };
    case "call":
      return { icon: "phone", text: `${CALL_TEXT[e.direction]} ${e.with}` };
    case "post":
      return { icon: "send", text: "Posted a letter" };
    case "reading":
      return {
        icon: "gauge",
        text: `${e.measure === "humidity" ? "Humidity" : "Temperature"} ${e.value}${e.measure === "humidity" ? "%" : "°C"}${e.room ? ` in ${e.room.toLowerCase()}` : ""}`,
      };
    case "receipt":
      return { icon: "receipt", text: `Added a receipt${e.amount ? `: ${e.amount}` : ""}` };
  }
}

export function EmailCheck({ e }: { e: Extract<Entry, { kind: "email" }> }) {
  return (
    <span className="flex flex-wrap gap-2">
      <Chip>{EMAIL_VIA_LABEL[e.via]}</Chip>
      {e.auth === "passed" ? (
        <Chip tone="done" icon="shield">
          Sender verified
        </Chip>
      ) : e.auth === "lost" ? (
        <Chip>Original sender can&rsquo;t be checked</Chip>
      ) : (
        <Chip>Not checked</Chip>
      )}
    </span>
  );
}

function Img({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local data URL
    <img src={src} alt={alt} className="mt-1 max-h-72 w-full rounded-md border-2 border-line-subtle object-contain bg-concrete" />
  );
}

const mono = "font-mono text-[0.8125rem] leading-[1.125rem] text-ink-muted";

export function EntryBody({ e, issue }: { e: Entry; issue: Issue }) {
  const altFor = (alt: string) => alt || `Photo for ${issue.title.toLowerCase()}`;
  return (
    <>
      {e.kind === "email" ? (
        <div className="mt-1 flex flex-col gap-2 rounded-md border-2 border-line-subtle p-3">
          <p className="text-[1.0625rem] leading-[1.5rem] font-bold">{e.subject}</p>
          <p className={mono}>
            {e.from} → {e.to}
          </p>
          {e.text ? <p className="text-[1rem] leading-[1.5625rem]">{e.text}</p> : null}
          <EmailCheck e={e} />
        </div>
      ) : e.text ? (
        <p className="text-[1.0625rem] leading-[1.625rem]">{e.text}</p>
      ) : null}
      {e.kind === "photo" ? <Img src={e.photo.src} alt={altFor(e.photo.alt)} /> : null}
      {e.kind === "messages" ? <Img src={e.photo.src} alt={altFor(e.photo.alt)} /> : null}
      {(e.kind === "post" || e.kind === "receipt") && e.photo ? <Img src={e.photo.src} alt={altFor(e.photo.alt)} /> : null}
      {e.kind === "post" && e.proof ? (
        <span>
          <Chip icon="tick">Proof of postage</Chip>
        </span>
      ) : null}
      {e.kind === "chat_export" ? (
        <div className="mt-1 flex flex-col gap-2 rounded-md border-2 border-line-subtle p-3">
          {e.count ? (
            <>
              <p className="text-[1rem] leading-[1.5rem] font-bold">
                {e.count} messages · {e.participants.join(", ")}
              </p>
              <p className={mono}>
                {e.first} to {e.last}
              </p>
              <ul className="flex flex-col gap-1 text-[0.9375rem] leading-[1.375rem]">
                {e.preview.map((p, i) => (
                  <li key={i} className="truncate">
                    {p}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[0.9375rem]">Zip file with messages and media</p>
          )}
          <p className={mono}>{e.file.name}</p>
        </div>
      ) : null}
      {e.kind === "video" ? (
        <div className="mt-1 flex items-center gap-2 rounded-md bg-concrete p-3 text-[0.9375rem]">
          <Icon name="video" /> {e.file.name} · {fileSize(e.file.bytes)}
        </div>
      ) : null}
    </>
  );
}

function fingerprint(e: Entry): string | null {
  if (e.kind === "photo" || e.kind === "messages") return e.photo.sha256;
  if ((e.kind === "post" || e.kind === "receipt") && e.photo) return e.photo.sha256;
  if (e.kind === "video" || e.kind === "chat_export") return e.file.sha256;
  return null;
}

export function Record({ group, issue, exhibits }: { group: Group; issue: Issue; exhibits?: Map<string, number> }) {
  const entries = sortedEntries(issue);
  return (
    <ol className="flex flex-col">
      {entries.map((e, i) => {
        const meta = entrySummary(e);
        const late = Math.abs(new Date(e.recordedAt).getTime() - new Date(e.at).getTime()) > 10 * 60_000;
        const hash = fingerprint(e);
        const exhibit = exhibits?.get(e.id);
        return (
          <li key={e.id} className="flex gap-3 break-inside-avoid">
            <div className="flex flex-col items-center">
              <span className="flex size-9 flex-none items-center justify-center rounded-full bg-concrete">
                <Icon name={meta.icon} size={18} />
              </span>
              {i < entries.length - 1 ? <span className="w-0.5 flex-1 bg-line-subtle" /> : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pb-5">
              {exhibit ? <p className="text-[0.8125rem] leading-[1.125rem] font-bold tracking-[0.08em] uppercase">Exhibit {exhibit}</p> : null}
              <p className="text-[1.0625rem] leading-[1.5rem]">
                <span className="font-bold">{memberName(group, e.by)}</span> · {meta.text}
              </p>
              <EntryBody e={e} issue={issue} />
              <p className={mono}>
                {late ? "Member says " : ""}
                {stamp(e.at)}
              </p>
              {late ? <p className={mono}>Recorded {stamp(e.recordedAt)}</p> : null}
              {hash ? <p className={mono}>SHA-256 {shortHash(hash)}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function thumb(e: Entry): string | null {
  if (e.kind === "photo" || e.kind === "messages") return e.photo.src;
  if ((e.kind === "post" || e.kind === "receipt") && e.photo) return e.photo.src;
  return null;
}

/** The latest entries as quiet one-line rows; tap one to see everything about it. */
export function RecentActivity({ group, issue, limit }: { group: Group; issue: Issue; limit?: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const entries = sortedEntries(issue).reverse();
  const shown = limit ? entries.slice(0, limit) : entries;
  return (
    <ul className="flex flex-col divide-y divide-line-subtle">
      {shown.map((e) => {
        const meta = entrySummary(e);
        const img = thumb(e);
        const expanded = open === e.id;
        const verified = e.kind === "email" && e.auth === "passed";
        return (
          <li key={e.id}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : e.id)}
              className="flex min-h-16 w-full items-center gap-3 py-3 text-left"
            >
              <span className="flex size-9 flex-none items-center justify-center rounded-full bg-concrete">
                <Icon name={meta.icon} size={18} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`text-[1rem] leading-[1.375rem] ${expanded ? "" : "line-clamp-2"}`}>
                  <span className="font-bold">{memberName(group, e.by)}</span> {meta.text.charAt(0).toLowerCase() + meta.text.slice(1)}
                </span>
                <span className="flex items-center gap-1.5 text-[0.8125rem] leading-[1.125rem] text-ink-muted">
                  {verified ? (
                    <>
                      <Icon name="shield" size={14} /> Sender verified ·
                    </>
                  ) : null}
                  <span className="font-mono">{stamp(e.at)}</span>
                </span>
              </span>
              {img && !expanded ? (
                // eslint-disable-next-line @next/next/no-img-element -- local data URL
                <img src={img} alt="" className="size-12 flex-none rounded-md object-cover" />
              ) : null}
            </button>
            {expanded ? (
              <div className="flex flex-col gap-2 pb-4 pl-12">
                <EntryBody e={e} issue={issue} />
                {fingerprint(e) ? <p className={mono}>SHA-256 {shortHash(fingerprint(e)!)}</p> : null}
                {Math.abs(new Date(e.recordedAt).getTime() - new Date(e.at).getTime()) > 10 * 60_000 ? (
                  <p className={mono}>Recorded {stamp(e.recordedAt)}</p>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
