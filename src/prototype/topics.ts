/**
 * The questions a household answers about a problem (north star, document 6: What goes into a
 * prepared message). Each answer is saved as an update on the record, with the question as its topic.
 */

import type { AffectedKind, Category } from "./types";

export type Question = { key: string; label: string; placeholder: string; lead: string };

/** One question per kind of problem: the detail a landlord or ombudsman needs. */
export const CATEGORY_QUESTIONS: Record<Category, Question[]> = {
  damp_mould: [{ key: "rooms", lead: "Where it is and what's damaged", label: "Which rooms, and has anything been damaged?", placeholder: "Back bedroom and bathroom. Clothes in the wardrobe have gone mouldy" }],
  leak: [{ key: "where", lead: "Where the water goes", label: "Where is the water going? Is it near any electrics?", placeholder: "Through the kitchen ceiling, next to the light fitting" }],
  heating: [{ key: "coping", lead: "How we're coping", label: "How are you coping without it?", placeholder: "We boil the kettle to wash and use a plug-in heater" }],
  electrics: [{ key: "what", lead: "What we've noticed", label: "What isn't working? Is anything sparking, hot or smelling of burning?", placeholder: "Half the sockets in the kitchen are dead" }],
  gas: [{ key: "what", lead: "What we've noticed", label: "What have you noticed, and has anyone checked it?", placeholder: "The boiler flame is yellow. The alarm went off once" }],
  doors_windows: [{ key: "risk", lead: "The risk", label: "Who is put at risk, and can you lock up?", placeholder: "The front door won't lock, so anyone can get in at night" }],
  pests: [{ key: "where", lead: "Where they are and what's damaged", label: "Where are they, and what have they damaged?", placeholder: "Mice in the kitchen. They've chewed through food packets" }],
  structure: [{ key: "where", lead: "Where it is", label: "Where is it, and is it getting worse?", placeholder: "The crack above the bedroom window is wider than last month" }],
  other: [],
};

export const STARTED: Question = { key: "started", lead: "When it started", label: "When did it start?", placeholder: "Early September, after the heavy rain" };
export const IMPACT: Question = { key: "impact", lead: "How it affects us", label: "How is it affecting your household?", placeholder: "We can't use the back bedroom, so the children share" };
export const WORSE: Question = { key: "worse", lead: "What has got worse", label: "Has anything got worse since it was reported?", placeholder: "It's spread to the window frame and smells worse" };
export const FIX: Question = { key: "fix", lead: "What would fix it", label: "What would fix it?", placeholder: "Find and fix the leak, not just paint over it" };

const LEADS: Record<string, string> = {
  started: STARTED.lead,
  impact: IMPACT.lead,
  worse: WORSE.lead,
  fix: FIX.lead,
  rooms: "Where it is and what's damaged",
  where: "Where it is",
  coping: "How we're coping",
  what: "What we've noticed",
  risk: "The risk",
};

/** A short label for an update's topic, for the record and the case file. */
export function topicLabel(topic?: string, category?: Category): string | undefined {
  if (!topic) return undefined;
  const q = category ? CATEGORY_QUESTIONS[category].find((x) => x.key === topic) : undefined;
  return q?.lead ?? LEADS[topic];
}

/** How each kind of affected person is described in a letter, for "here" or "in Flat 5". */
export const AFFECTED: Record<AffectedKind, { tick: string; question: string; placeholder: string; lead: (where: string) => string }> = {
  child: {
    tick: "A child",
    question: "How does it affect them?",
    placeholder: "Our 8-month-old sleeps in that room and has had a cough for two weeks",
    lead: (w) => `A child lives ${w}.`,
  },
  pregnancy: {
    tick: "Someone pregnant",
    question: "How does it affect them?",
    placeholder: "I'm seven months pregnant and the cold is making it hard to sleep",
    lead: (w) => `Someone ${w} is pregnant.`,
  },
  older: {
    tick: "An older person",
    question: "How does it affect them?",
    placeholder: "My dad is 82 and can't keep warm without the heating",
    lead: (w) => `An older person lives ${w}.`,
  },
  condition: {
    tick: "A disability or long-term condition",
    question: "How does it affect them?",
    placeholder: "My partner has asthma and it's been worse since the mould came back",
    lead: (w) => `Someone ${w} has a disability or long-term health condition.`,
  },
  mental_health: {
    tick: "Mental health",
    question: "How does it affect them?",
    placeholder: "Living with the leak is making my anxiety much worse",
    lead: (w) => `This is affecting the mental health of someone ${w}.`,
  },
};
