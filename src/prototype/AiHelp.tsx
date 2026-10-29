"use client";

/** Adjusting a written message with AI, and showing it in another language (north star, document 6: AI help). */

import { useEffect, useState } from "react";
import type { AiFacts, AiMode } from "@/lib/ai/rules";
import { Icon, label } from "./ui";

let status: Promise<boolean> | null = null;
export function aiEnabled(): Promise<boolean> {
  status ??= fetch("/api/ai/draft")
    .then((r) => r.json())
    .then((j: { enabled?: boolean }) => !!j.enabled)
    .catch(() => false);
  return status;
}

export const LANGUAGES = [
  "Arabic",
  "Bengali",
  "Chinese (Simplified)",
  "French",
  "Gujarati",
  "Italian",
  "Lithuanian",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Romanian",
  "Somali",
  "Spanish",
  "Tamil",
  "Turkish",
  "Ukrainian",
  "Urdu",
  "Welsh",
];

const MODES: { mode: AiMode; text: string }[] = [
  { mode: "firmer", text: "Firmer" },
  { mode: "friendlier", text: "Friendlier" },
  { mode: "shorter", text: "Shorter" },
  { mode: "simpler", text: "Simpler English" },
];

export function AiHelp({
  draft,
  facts,
  language: defaultLanguage,
  onApply,
  onAgain,
  againBusy,
}: {
  draft: string;
  facts: AiFacts;
  language: string;
  onApply: (text: string) => void;
  /** Write the message again from the same choices. */
  onAgain?: () => void;
  againBusy?: boolean;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<AiMode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState(defaultLanguage);
  const [translation, setTranslation] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    aiEnabled().then((v) => live && setEnabled(v));
    return () => {
      live = false;
    };
  }, []);

  const run = async (mode: AiMode) => {
    setBusy(mode);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, draft, facts, language: mode === "translate" ? language : undefined }),
      });
      const json = (await res.json()) as { body?: string; translation?: string; error?: { message: string } };
      if (!res.ok || json.error) {
        setMessage(json.error?.message ?? "AI help couldn't finish just now. Your message hasn't changed.");
      } else if (json.translation) {
        setTranslation(json.translation);
      } else if (json.body) {
        onApply(json.body);
      }
    } catch {
      setMessage("AI help couldn't connect. Your message hasn't changed.");
    } finally {
      setBusy(null);
    }
  };

  const off = enabled === false;
  const chip = "inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-line bg-paper px-3.5 text-[0.9375rem] leading-[1.375rem] font-bold disabled:opacity-45";
  const working = !!busy || !!againBusy;

  return (
    <section aria-label="Adjust it" className="flex flex-col gap-3 rounded-lg border border-line-subtle p-4">
      <div className="flex items-center gap-2">
        <Icon name="ai" />
        <h2 className={label}>Adjust it</h2>
      </div>
      {off ? (
        <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">
          AI help isn&rsquo;t switched on in this prototype yet. These buttons show what it will do.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.mode} type="button" disabled={off || working} onClick={() => run(m.mode)} className={chip}>
            {busy === m.mode ? "Working…" : m.text}
          </button>
        ))}
        {onAgain ? (
          <button type="button" disabled={off || working} onClick={onAgain} className={chip}>
            {againBusy ? "Writing…" : "Write it again"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="ai-lang" className="text-[0.9375rem] leading-[1.375rem] font-bold">
          Show it in
        </label>
        <select
          id="ai-lang"
          className="min-h-11 rounded-md border-2 border-line-subtle bg-paper px-2 text-[0.9375rem] leading-[1.375rem] font-bold"
          value={language}
          disabled={off}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="">Choose a language</option>
          {LANGUAGES.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <button type="button" disabled={off || !language || working} onClick={() => run("translate")} className={chip}>
          {busy === "translate" ? "Working…" : "Show"}
        </button>
      </div>

      {translation ? (
        <div className="flex flex-col gap-1 rounded-lg bg-concrete p-3">
          <p className="text-[0.8125rem] leading-[1.125rem] font-bold">In {language}, so you can check it. The English version is what gets sent.</p>
          <p className="text-[0.9375rem] leading-[1.375rem] whitespace-pre-wrap">{translation}</p>
        </div>
      ) : null}

      {message ? (
        <p role="status" className="text-[0.9375rem] leading-[1.375rem] font-bold">
          {message}
        </p>
      ) : null}
    </section>
  );
}
