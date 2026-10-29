export type Nation = "england" | "scotland" | "wales" | "northern_ireland";
export type GroupType = "house" | "building" | "branch";
export type Role = "owner" | "admin" | "submitter";
/**
 * What submitters can see and add (north star, document 3: Submitter access). Owners and admins
 * always see and add to everything, and nobody edits another member's entries.
 */
export type Access = "add_all" | "add_own" | "own_only";

export type Category =
  | "damp_mould"
  | "leak"
  | "heating"
  | "electrics"
  | "gas"
  | "doors_windows"
  | "pests"
  | "structure"
  | "other";

export type ReportMethod = "email" | "text" | "phone" | "letter" | "in_person" | "portal";
export type LetterKey = "repair_request" | "reminder" | "confirm" | "complaint" | "group";

/** A file kept only as a fingerprint in the prototype (videos and chat exports are too big for browser storage). */
export type FileRef = { name: string; sha256: string; bytes: number };

/** How an email reached the group's address, and what that means for its authenticity check. */
export type EmailVia = "cc" | "bcc" | "forwarded" | "pasted";
export type EmailAuth = "passed" | "lost" | "not_checked";

export type Member = {
  id: string;
  name: string;
  role: Role;
  status: "active" | "pending";
  /** Flat or room, for buildings and branches. */
  flat?: string;
  joinedAt: string;
};

export type Photo = {
  /** Resized display copy (JPEG data URL). The full app keeps the original too. */
  src: string;
  /** SHA-256 of the original file, as hex. */
  sha256: string;
  alt: string;
  bytes: number;
};

type EntryBase = {
  id: string;
  /** When it happened. */
  at: string;
  /** When it was put on the record. */
  recordedAt: string;
  by: string;
  text?: string;
};

export type Entry =
  | (EntryBase & { kind: "logged" })
  | (EntryBase & { kind: "photo"; photo: Photo })
  /** An update in a member's own words. "topic" says which question it answers (north star, document 2: Entry). */
  | (EntryBase & { kind: "note"; topic?: string })
  | (EntryBase & { kind: "reported"; method: ReportMethod })
  | (EntryBase & { kind: "visit" })
  | (EntryBase & { kind: "letter"; letter: LetterKey })
  | (EntryBase & { kind: "fixed" })
  | (EntryBase & { kind: "reopened" })
  | (EntryBase & {
      kind: "email";
      direction: "to_landlord" | "from_landlord";
      from: string;
      to: string;
      subject: string;
      via: EmailVia;
      auth: EmailAuth;
      /** Set when the email was prepared by Clamour from a letter template. */
      letter?: LetterKey;
    })
  | (EntryBase & { kind: "messages"; photo: Photo; with: string })
  | (EntryBase & {
      kind: "chat_export";
      file: FileRef;
      participants: string[];
      count: number;
      first: string;
      last: string;
      preview: string[];
    })
  | (EntryBase & { kind: "call"; direction: "you_called" | "they_called" | "in_person"; with: string })
  | (EntryBase & { kind: "post"; photo?: Photo; proof: boolean })
  | (EntryBase & { kind: "reading"; measure: "humidity" | "temperature"; value: number; room?: string })
  | (EntryBase & { kind: "receipt"; photo?: Photo; amount?: string })
  | (EntryBase & { kind: "video"; file: FileRef });

/** An email that reached the group's address without an issue reference, waiting to be filed. */
export type UnsortedEmail = {
  id: string;
  receivedAt: string;
  from: string;
  /** The member it came from, if the address matches one. */
  memberId?: string;
  subject: string;
  text: string;
  via: EmailVia;
  auth: EmailAuth;
};

/** Kinds of people a problem can affect (north star, document 2: Affected person). */
export type AffectedKind = "child" | "pregnancy" | "older" | "condition" | "mental_health";

/**
 * Who in a household a problem affects and how, in that household's words. Private and consented
 * (document 5). Only the member who added it decides whether it can be used in letters.
 */
export type Affected = { kind: AffectedKind; how: string; by: string; consentAt: string; letters: boolean; caseFile: boolean };

/** An admin's notice that they'll write to the landlord on a date, asking for updates first. */
export type UpdateRequest = { id: string; issueIds: string[]; by: string; writeOn: string; note?: string; at: string; closedAt?: string };

export type Issue = {
  id: string;
  affected?: Affected[];
  /** Short reference for letter subjects, shown as CL-<ref>. */
  ref: number;
  title: string;
  category: Category;
  room?: string;
  createdBy: string;
  createdAt: string;
  entries: Entry[];
};

export type Group = {
  id: string;
  name: string;
  type: GroupType;
  nation: Nation;
  approval: boolean;
  access: Access;
  createdAt: string;
  members: Member[];
  invites: { submitter: string; admin: string };
  /** The group's email address for copying in or forwarding evidence. */
  inbox: string;
  unsorted: UnsortedEmail[];
  /** Who the group writes to about repairs. Asked for the first time someone sends a prepared email. */
  landlord?: { name?: string; email?: string };
  /** The address used in letters; each member's flat is added for buildings. */
  address?: { line: string; postcode: string };
  requests?: UpdateRequest[];
  issues: Issue[];
};

/** Your own settings (north star, document 8: Account). Kept per person, not per group. */
export type Prefs = {
  email: string;
  phone: string;
  notify: {
    channel: "email" | "app" | "both" | "none";
    when: "instant" | "daily" | "weekly";
    replies: boolean;
    deadlines: boolean;
    problems: boolean;
    joins: boolean;
    requests: boolean;
  };
  theme: "system" | "light" | "dark";
  largeText: boolean;
  reduceMotion: boolean;
  copyIn: "bcc" | "cc" | "none";
  access: string;
  /** When you're usually in, as tick boxes; "access" holds any extra note. */
  accessSlots: string[];
  signoff: string;
  showAs: "name" | "initial";
  /** Groups you've muted notifications for. */
  muted: string[];
  /** Offer AI help with messages (north star, decision D-024). */
  ai: boolean;
  /** Language to show messages in, for understanding; what's sent stays in English. */
  language: string;
  /** Prototype: "phone" keeps the phone layout on a big screen; "auto" follows the screen width. */
  layout: "auto" | "phone";
};

export const DEFAULT_PREFS: Prefs = {
  email: "",
  phone: "",
  notify: { channel: "email", when: "instant", replies: true, deadlines: true, problems: true, joins: true, requests: true },
  theme: "system",
  largeText: false,
  reduceMotion: false,
  copyIn: "bcc",
  access: "",
  accessSlots: [],
  signoff: "",
  showAs: "name",
  muted: [],
  ai: true,
  language: "",
  layout: "auto",
};

export type State = {
  version: 5;
  myName: string | null;
  prefs?: Prefs;
  /** Prototype only: see the app as another role. */
  viewAs: Role | null;
  groups: Group[];
};

export const ME = "me";

export const CATEGORY_LABEL: Record<Category, string> = {
  damp_mould: "Damp or mould",
  leak: "Leak or water coming in",
  heating: "Heating or hot water",
  electrics: "Electrics",
  gas: "Gas or carbon monoxide",
  doors_windows: "Doors, windows or locks",
  pests: "Pests",
  structure: "Roof, walls or floors",
  other: "Something else",
};

export const NATION_LABEL: Record<Nation, string> = {
  england: "England",
  scotland: "Scotland",
  wales: "Wales",
  northern_ireland: "Northern Ireland",
};

export const TYPE_LABEL: Record<GroupType, string> = {
  house: "Shared house",
  building: "Building",
  branch: "Union branch",
};

export const ACCESS_LABEL: Record<Access, { title: string; desc: string }> = {
  add_all: { title: "Add to everyone's", desc: "Submitters see every problem and can add evidence to any of them." },
  add_own: { title: "See everyone's, add to their own", desc: "Submitters see every problem, add evidence only to the ones they logged, and add their household's update to any." },
  own_only: { title: "Only their own", desc: "Submitters see and add to only the problems they logged. Best for union branches." },
};

export const DEFAULT_ACCESS: Record<GroupType, Access> = { house: "add_all", building: "add_own", branch: "own_only" };

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  submitter: "Submitter",
};

export const METHOD_LABEL: Record<ReportMethod, string> = {
  email: "Email",
  text: "Text or WhatsApp",
  phone: "Phone call",
  letter: "Letter",
  in_person: "In person",
  portal: "Landlord's website or app",
};

export const EMAIL_VIA_LABEL: Record<EmailVia, string> = {
  cc: "Copied in (CC)",
  bcc: "Copied in privately (BCC)",
  forwarded: "Forwarded",
  pasted: "Pasted in",
};

export function issueRef(issue: Pick<Issue, "ref">) {
  return `CL-${issue.ref}`;
}

export const LETTER_LABEL: Record<LetterKey, string> = {
  repair_request: "Repair request",
  reminder: "Reminder",
  confirm: "Confirming a conversation",
  complaint: "Formal complaint",
  group: "Group letter",
};
