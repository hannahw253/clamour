"use client";

/** AI help under a prepared message (north star, document 8: "AI as a helper, not an author"). */

import { useEffect, useState } from "react";
import type { AiFacts, AiMode } from "@/lib/ai/rules";
import { Icon, inputClass, label } from "./ui";

let status: Promise<boolean> | null = null;
function aiEnabled(): Promise<boolean> {
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
}: {
  draft: string;
  facts: AiFacts;
  language: string;
  onApply: (text: string) => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<AiMode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [own, setOwn] = useState("");
  const [showOwn, setShowOwn] = useState(false);
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
        body: JSON.stringify({ mode, draft, facts, ownWords: mode === "own_words" ? own : undefined, language: mode === "translate" ? language : undefined }),
      });
      const json = (await res.json()) as { body?: string; translation?: string; error?: { message: string } };
      if (!res.ok || json.error) {
        setMessage(json.error?.message ?? "AI help couldn't finish just now. Your message hasn't changed.");
      } else if (json.translation) {
        setTranslation(json.translation);
      } else if (json.body) {
        onApply(json.body);
        if (mode === "own_words") {
          setOwn("");
          setShowOwn(false);
        }
      }
    } catch {
      setMessage("AI help couldn't connect. Your message hasn't changed.");
    } finally {
      setBusy(null);
    }
  };

  const off = enabled === false;
  const chip = "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-line-subtle bg-paper px-4 text-[15px] font-bold disabled:opacity-45";

  return (
    <section aria-label="AI help" className="flex flex-col gap-3 rounded-xl border border-line-subtle p-4">
      <div className="flex items-center gap-2">
        <Icon name="spark" size={18} />
        <h2 className={label}>Help me write it</h2>
      </div>
      {off ? (
        <p className="text-[15px] leading-[22px] text-ink-muted">
          AI help isn&rsquo;t switched on in this prototype yet. The buttons show what it will do.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.mode} type="button" disabled={off || !!busy} onClick={() => run(m.mode)} className={chip}>
            {busy === m.mode ? "Working…" : m.text}
          </button>
        ))}
        <button type="button" disabled={off || !!busy} onClick={() => setShowOwn(!showOwn)} className={chip} aria-expanded={showOwn}>
          In my own words
        </button>
      </div>

      {showOwn && !off ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="ai-own" className="text-[15px] font-bold">
            Say what you want to add, however it comes out
          </label>
          <textarea
            id="ai-own"
            className={`${inputClass} min-h-24 py-3 text-[16px] leading-[24px]`}
            value={own}
            onChange={(e) => setOwn(e.target.value)}
            placeholder="the mould is back in the babys room and its making her cough"
          />
          <p className="text-[13px] leading-[18px] text-ink-muted">Tip: use your phone&rsquo;s microphone button to speak instead of typing.</p>
          <button type="button" disabled={!own.trim() || !!busy} onClick={() => run("own_words")} className={`${chip} self-start border-line`}>
            {busy === "own_words" ? "Working…" : "Fit it into the message"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="ai-lang" className="text-[15px] font-bold">
          Show it in
        </label>
        <select
          id="ai-lang"
          className="min-h-11 rounded-md border-2 border-line-subtle bg-paper px-2 text-[15px] font-bold"
          value={language}
          disabled={off}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="">Choose a language</option>
          {LANGUAGES.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <button type="button" disabled={off || !language || !!busy} onClick={() => run("translate")} className={chip}>
          {busy === "translate" ? "Working…" : "Show"}
        </button>
      </div>

      {translation ? (
        <div className="flex flex-col gap-1 rounded-lg bg-concrete p-3">
          <p className="text-[13px] font-bold">In {language}, so you can check it. The English version is what gets sent.</p>
          <p className="text-[15px] leading-[23px] whitespace-pre-wrap">{translation}</p>
        </div>
      ) : null}

      {message ? (
        <p role="status" className="text-[15px] leading-[22px] font-bold">
          {message}
        </p>
      ) : null}
      <p className="text-[13px] leading-[18px] text-ink-muted">
        AI only uses what&rsquo;s already in your record and your own words. Check every fact before you send.
      </p>
    </section>
  );
}
