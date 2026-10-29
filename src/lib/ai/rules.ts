/**
 * AI help with messages (north star, document 6: "AI help with messages", and decision D-024).
 * The templates write a correct message; the AI only reshapes it. These rules go into the prompt
 * and are checked again on the way back, so a suggestion that breaks them is never shown.
 */

export const AI_MODES = ["firmer", "friendlier", "shorter", "simpler", "own_words", "translate"] as const;
export type AiMode = (typeof AI_MODES)[number];

export type AiFacts = {
  letter: string;
  group: string;
  nation: string;
  problems: { ref: string; title: string; room?: string; category: string; firstReported?: string; standing: string }[];
  /** Short dated summaries of the record, newest last. */
  record: string[];
};

export type AiRequest = {
  mode: AiMode;
  draft: string;
  facts: AiFacts;
  ownWords?: string;
  language?: string;
};

export const FOOTER = "This message was prepared with Clamour. It is not legal advice.";

const MODE_INSTRUCTION: Record<Exclude<AiMode, "translate">, string> = {
  firmer: "Make it firmer and more direct while staying polite. Make the request, and any reply-by date already in the draft, stand out.",
  friendlier: "Make it warmer and more cooperative, while keeping the request clear.",
  shorter: "Make it as short as you can while keeping every fact, date and the request.",
  simpler: "Rewrite it in very simple English with short sentences and everyday words.",
  own_words:
    "Fit the member's own words into the message where they belong, correcting spelling and grammar and keeping their meaning. Leave out anything in their words that breaks the rules.",
};

const RULES = `Rules you must follow:
1. Use only facts that appear in the DRAFT, the FACTS or the MEMBER'S OWN WORDS. Never add dates, times, amounts, names, promises or events that are not there.
2. Plain, calm British English that someone with a reading age of 9 to 11 can follow.
3. No threats. Do not mention courts, tribunals, solicitors, lawyers, legal action, compensation, damages, withholding rent or rent strikes. Do not add any law, Act, section or regulation that is not already in the draft.
4. Keep the greeting line, the sign-off and the names under it, and keep this final line exactly: "${FOOTER}"
5. Reply with the message body only: no subject line, no notes, no quotation marks around it.`;

export function buildPrompt(req: AiRequest): { system: string; user: string } {
  const facts = [
    `Letter type: ${req.facts.letter}`,
    `Group: ${req.facts.group} (${req.facts.nation})`,
    ...req.facts.problems.map(
      (p) => `Problem ${p.ref}: ${p.title}${p.room ? ` (${p.room})` : ""}; ${p.category}; ${p.firstReported ? `first reported ${p.firstReported}; ` : ""}${p.standing}`,
    ),
    "Record:",
    ...req.facts.record.map((r) => `- ${r}`),
  ].join("\n");

  if (req.mode === "translate") {
    return {
      system:
        "You translate a UK renter's message to their landlord so the renter can understand what they are about to send. Translate faithfully, without adding or removing anything. Reply with the translation only.",
      user: `Translate this message into ${req.language}.\n\nMESSAGE:\n${req.draft}`,
    };
  }

  return {
    system: `You help a UK renter improve a message to their landlord or letting agent about a repair. The message was drafted from their group's verified record. ${RULES}`,
    user: `${MODE_INSTRUCTION[req.mode]}\n\nFACTS:\n${facts}\n\n${req.ownWords ? `MEMBER'S OWN WORDS:\n${req.ownWords}\n\n` : ""}DRAFT:\n${req.draft}`,
  };
}

// ---- Checks on the way back --------------------------------------------------------

const BANNED = /\b(sue|suing|lawsuit|court|courts|tribunal|solicitors?|lawyers?|legal action|compensation|damages|withhold(?:ing)? (?:the )?rent|rent strike)\b/i;
const LAW = /\b(?:[A-Z][a-z]+ )*(?:Act|Regulations?|Section \d+|s\.\s?\d+)\b/g;
const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
const DATE = new RegExp(`\\b(\\d{1,2}(?:st|nd|rd|th)? (?:${MONTHS})(?: \\d{4})?|\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?|\\d{1,2}(?::\\d{2})? ?(?:am|pm)|\\d{1,2}:\\d{2})\\b`, "gi");
const MONEY = /£\s?\d[\d,.]*/g;
const WEEKDAY = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri)\b/gi;

function normalise(s: string) {
  return s.toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/\s+/g, " ");
}

/**
 * Returns the cleaned suggestion, or a reason it was rejected. Anything new that looks like a
 * date, time, amount, legal reference or threat, and isn't in the draft or the member's words,
 * fails the check.
 */
export function checkSuggestion(req: AiRequest, raw: string): { ok: true; text: string } | { ok: false; reason: string } {
  let text = raw.trim().replace(/^["“]|["”]$/g, "").trim();
  if (!text) return { ok: false, reason: "empty" };
  if (req.mode === "translate") return { ok: true, text };

  // Names like "Greenhill Court" shouldn't trip the word checks, so known names are taken out first.
  const known = [req.facts.group, ...req.facts.problems.map((p) => p.title), ...req.facts.problems.map((p) => p.room ?? "")].filter(Boolean);
  const strip = (s: string) => known.reduce((acc, k) => acc.split(k).join(" "), s);
  const source = normalise(`${req.draft}\n${req.ownWords ?? ""}`);
  if (BANNED.test(strip(text)) && !BANNED.test(strip(`${req.draft}\n${req.ownWords ?? ""}`))) return { ok: false, reason: "banned_phrase" };
  for (const m of text.match(WEEKDAY) ?? []) if (!new RegExp(`\\b${m.slice(0, 3)}`, "i").test(source)) return { ok: false, reason: `new_day:${m}` };
  for (const m of text.match(LAW) ?? []) if (!source.includes(normalise(m))) return { ok: false, reason: `new_law:${m}` };
  for (const m of text.match(DATE) ?? []) if (!source.includes(normalise(m))) return { ok: false, reason: `new_date:${m}` };
  for (const m of text.match(MONEY) ?? []) if (!source.includes(normalise(m))) return { ok: false, reason: `new_amount:${m}` };

  if (!text.includes(FOOTER)) text = `${text.replace(/\s+$/, "")}\n\n${FOOTER}`;
  if (text.length > req.draft.length * 2 + (req.ownWords?.length ?? 0) + 400) return { ok: false, reason: "too_long" };
  return { ok: true, text };
}

export function validateRequest(body: unknown): AiRequest | string {
  if (!body || typeof body !== "object") return "Send a JSON body.";
  const b = body as Record<string, unknown>;
  if (!AI_MODES.includes(b.mode as AiMode)) return "Unknown mode.";
  if (typeof b.draft !== "string" || !b.draft.trim() || b.draft.length > 8000) return "The draft is missing or too long.";
  if (b.ownWords !== undefined && (typeof b.ownWords !== "string" || b.ownWords.length > 2000)) return "Your words are too long.";
  if (b.mode === "own_words" && !(typeof b.ownWords === "string" && b.ownWords.trim())) return "Add your own words first.";
  if (b.mode === "translate" && !(typeof b.language === "string" && /^[\p{L} ()-]{2,40}$/u.test(b.language))) return "Choose a language.";
  const f = b.facts as AiFacts | undefined;
  if (!f || typeof f !== "object" || !Array.isArray(f.problems) || !Array.isArray(f.record)) return "Facts are missing.";
  if (JSON.stringify(f).length > 12000) return "Too much detail to send.";
  return { mode: b.mode as AiMode, draft: b.draft, facts: f, ownWords: b.ownWords as string | undefined, language: b.language as string | undefined };
}
