export type Nation = "england" | "scotland" | "wales" | "northern_ireland";
export type GroupType = "house" | "building" | "branch";
export type Role = "owner" | "admin" | "submitter";
export type Visibility = "all" | "own";

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
export type LetterKey = "repair_request" | "reminder";

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
  | (EntryBase & { kind: "note" })
  | (EntryBase & { kind: "reported"; method: ReportMethod })
  | (EntryBase & { kind: "visit" })
  | (EntryBase & { kind: "letter"; letter: LetterKey })
  | (EntryBase & { kind: "fixed" })
  | (EntryBase & { kind: "reopened" });

export type Issue = {
  id: string;
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
  visibility: Visibility;
  createdAt: string;
  members: Member[];
  invites: { submitter: string; admin: string };
  issues: Issue[];
};

export type State = {
  version: 1;
  myName: string | null;
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
