"use client";

/**
 * Prototype store. Everything lives in this browser's storage: nothing is sent anywhere.
 * The real app keeps this in Supabase behind row-level security (north star, documents 2 and 3).
 */

import { useSyncExternalStore } from "react";
import { sampleGroups } from "./sample";
import {
  ME,
  type Category,
  type Entry,
  type Group,
  type GroupType,
  type Issue,
  type Member,
  type Nation,
  type Role,
  type Affected,
  type UpdateRequest,
  type Prefs,
  type State,
  DEFAULT_ACCESS,
  DEFAULT_PREFS,
} from "./types";

const KEY = "clamour-prototype-v5";
const EMPTY: State = { version: 5, myName: null, viewAs: null, groups: [] };

let state: State | null = null;
let storageFull = false;
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version === 5) return parsed;
    }
  } catch {
    // Private windows and blocked storage fall back to memory.
  }
  return EMPTY;
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    storageFull = false;
  } catch {
    storageFull = true;
  }
}

function set(next: State) {
  state = next;
  save();
  listeners.forEach((l) => l());
}

function get(): State {
  if (state === null) state = load();
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The prototype state, or null during the server render (before the browser's storage is readable). */
export function useStore(): State | null {
  return useSyncExternalStore(subscribe, get, () => null);
}

export function isStorageFull() {
  return storageFull;
}

// ---- Helpers -----------------------------------------------------------------

export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Prototype invite token. The real app uses 32 random bytes and stores only their hash
 * (document 3). Here the token also carries the group's basics, so a link opened on
 * someone else's phone can show them the group without a server.
 */
export type InvitePayload = { k: string; r: "admin" | "submitter"; g: string; t: GroupType; n: Nation; a: boolean };

export function makeToken(group: Pick<Group, "name" | "type" | "nation" | "approval">, role: "admin" | "submitter") {
  const payload: InvitePayload = { k: randomToken(), r: role, g: group.name, t: group.type, n: group.nation, a: group.approval };
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode(...json)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function readToken(token: string): InvitePayload | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as InvitePayload;
    return payload.r === "admin" || payload.r === "submitter" ? payload : null;
  } catch {
    return null;
  }
}

/**
 * The group's email address. The ".example" domain is deliberate: the prototype can't
 * receive email, and a made-up real-looking domain could send people's evidence to a stranger.
 */
export function makeInbox(name: string) {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "group";
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const suffix = Array.from(bytes, (b) => (b % 36).toString(36)).join("") + (bytes[0] % 10);
  return `${slug}-${suffix}@in.clamour.example`;
}

export function findGroup(s: State, id: string) {
  return s.groups.find((g) => g.id === id);
}

export function myMember(group: Group): Member | undefined {
  return group.members.find((m) => m.id === ME);
}

/** The role the screens should act on: the prototype's "view as" choice, or your real role. */
export function effectiveRole(s: State, group: Group): Role {
  return s.viewAs ?? myMember(group)?.role ?? "submitter";
}

export function memberName(group: Group, id: string): string {
  if (id === ME) return "You";
  return group.members.find((m) => m.id === id)?.name ?? "Former member";
}

export function visibleIssues(s: State, group: Group): Issue[] {
  const role = effectiveRole(s, group);
  if (role !== "submitter" || group.access !== "own_only") return group.issues;
  return group.issues.filter((i) => i.createdBy === ME);
}

/**
 * What you can do with a group, or with one problem in it (north star, document 3). The real app
 * enforces the same rules with row-level security; the prototype uses them to show or hide actions.
 */
export function permissions(s: State, group: Group, issue?: Issue) {
  const role = effectiveRole(s, group);
  const admin = role !== "submitter";
  const mine = issue ? issue.createdBy === ME : false;
  const others = group.members.some((m) => m.id !== ME && m.status === "active");
  return {
    role,
    admin,
    mine,
    /** Photos, emails, calls, readings and so on. */
    addEvidence: admin || mine || group.access === "add_all",
    /** Your household's own update, on any problem you can see. */
    addUpdate: true,
    /** Letters about this problem, logging contact, marking fixed or reopening. */
    manage: admin || mine,
    /** Anyone can report a problem nobody has reported yet. */
    report: true,
    askUpdates: admin && others,
    groupLetter: admin,
    settings: admin,
  };
}

function updateGroup(groupId: string, fn: (g: Group) => Group) {
  const s = get();
  set({ ...s, groups: s.groups.map((g) => (g.id === groupId ? fn(g) : g)) });
}

function updateIssue(groupId: string, issueId: string, fn: (i: Issue) => Issue) {
  updateGroup(groupId, (g) => ({ ...g, issues: g.issues.map((i) => (i.id === issueId ? fn(i) : i)) }));
}

// ---- Actions -----------------------------------------------------------------

export function setMyName(name: string) {
  const s = get();
  set({ ...s, myName: name.trim() || s.myName });
}

export function setViewAs(role: Role | null) {
  set({ ...get(), viewAs: role });
}

export function resetPrototype() {
  set(EMPTY);
}

export function loadSamples() {
  const s = get();
  const myName = s.myName ?? "Sam";
  const samples = sampleGroups(new Date()).map((g) => ({
    ...g,
    members: g.members.map((m) => (m.id === ME ? { ...m, name: myName } : m)),
    invites: { submitter: makeToken(g, "submitter"), admin: makeToken(g, "admin") },
    inbox: makeInbox(g.name),
  }));
  const existing = new Set(s.groups.map((g) => g.id));
  set({
    ...s,
    myName,
    groups: [...s.groups, ...samples.filter((g) => !existing.has(g.id))],
  });
  return samples[0].id;
}

export function createGroup(input: { name: string; type: GroupType; nation: Nation; approval: boolean }): string {
  const s = get();
  const now = new Date().toISOString();
  const group: Group = {
    id: newId(),
    name: input.name.trim(),
    type: input.type,
    nation: input.nation,
    approval: input.approval,
    access: DEFAULT_ACCESS[input.type],
    createdAt: now,
    members: [{ id: ME, name: s.myName ?? "You", role: "owner", status: "active", joinedAt: now }],
    invites: { submitter: makeToken(input, "submitter"), admin: makeToken(input, "admin") },
    inbox: makeInbox(input.name),
    unsorted: [],
    issues: [],
  };
  set({ ...s, groups: [group, ...s.groups], viewAs: null });
  return group.id;
}

export function updateSettings(groupId: string, patch: Partial<Pick<Group, "approval" | "access">>) {
  updateGroup(groupId, (g) => ({ ...g, ...patch }));
}

export function resetInvite(groupId: string, role: "admin" | "submitter") {
  updateGroup(groupId, (g) => ({ ...g, invites: { ...g.invites, [role]: makeToken(g, role) } }));
}

export function approveMember(groupId: string, memberId: string) {
  updateGroup(groupId, (g) => ({
    ...g,
    members: g.members.map((m) => (m.id === memberId ? { ...m, status: "active", joinedAt: new Date().toISOString() } : m)),
  }));
}

export function removeMember(groupId: string, memberId: string) {
  updateGroup(groupId, (g) => ({ ...g, members: g.members.filter((m) => m.id !== memberId || m.role === "owner") }));
}

export function setMemberRole(groupId: string, memberId: string, role: "admin" | "submitter") {
  updateGroup(groupId, (g) => ({
    ...g,
    members: g.members.map((m) => (m.id === memberId && m.role !== "owner" ? { ...m, role } : m)),
  }));
}

/**
 * Join from an invite link. On the device that made the link, this joins that group;
 * on any other device, it makes a local copy of the group from the link's details.
 * Returns the group id and whether approval is needed.
 */
export function joinFromInvite(token: string, name: string, flat: string): { groupId: string; pending: boolean } | null {
  const payload = readToken(token);
  if (!payload) return null;
  const s = get();
  const now = new Date().toISOString();
  const me: Member = {
    id: ME,
    name: name.trim() || "You",
    role: payload.r,
    status: payload.a ? "pending" : "active",
    flat: flat.trim() || undefined,
    joinedAt: now,
  };
  const myName = s.myName ?? (name.trim() || null);

  const local = s.groups.find((g) => g.invites.admin === token || g.invites.submitter === token);
  if (local) {
    // You made this link yourself: you're already in the group, so just open it.
    set({ ...s, myName, viewAs: payload.r });
    return { groupId: local.id, pending: false };
  }

  const existing = s.groups.find((g) => g.invites[payload.r] === token);
  if (existing) return { groupId: existing.id, pending: myMember(existing)?.status === "pending" };

  const basics = { name: payload.g, type: payload.t, nation: payload.n, approval: payload.a };
  const group: Group = {
    id: newId(),
    name: payload.g,
    type: payload.t,
    nation: payload.n,
    approval: payload.a,
    access: DEFAULT_ACCESS[payload.t],
    createdAt: now,
    members: [{ id: "owner", name: "Group owner", role: "owner", status: "active", joinedAt: now }, me],
    invites: {
      submitter: payload.r === "submitter" ? token : makeToken(basics, "submitter"),
      admin: payload.r === "admin" ? token : makeToken(basics, "admin"),
    },
    inbox: makeInbox(payload.g),
    unsorted: [],
    issues: [],
  };
  set({ ...s, myName, viewAs: null, groups: [group, ...s.groups] });
  return { groupId: group.id, pending: me.status === "pending" };
}

export function addIssue(groupId: string, input: { title: string; category: Category; room?: string; entries: Entry[] }): string {
  const now = new Date().toISOString();
  const group = findGroup(get(), groupId);
  const issue: Issue = {
    id: newId(),
    ref: Math.max(0, ...(group?.issues.map((i) => i.ref) ?? [])) + 1,
    title: input.title.trim(),
    category: input.category,
    room: input.room?.trim() || undefined,
    createdBy: ME,
    createdAt: now,
    entries: [{ id: newId(), kind: "logged", at: now, recordedAt: now, by: ME }, ...input.entries],
  };
  updateGroup(groupId, (g) => ({ ...g, issues: [issue, ...g.issues] }));
  return issue.id;
}

export type NewEntry = Entry extends infer E ? (E extends Entry ? Omit<E, "id" | "recordedAt" | "by"> : never) : never;

export function addEntries(groupId: string, issueId: string, entries: NewEntry[]) {
  const recordedAt = new Date().toISOString();
  updateIssue(groupId, issueId, (i) => ({
    ...i,
    entries: [...i.entries, ...entries.map((e) => ({ ...e, id: newId(), recordedAt, by: ME }) as Entry)],
  }));
}

/** Build an entry for this device's user, ready for addIssue. */
export function entry(e: NewEntry): Entry {
  return { ...e, id: newId(), recordedAt: new Date().toISOString(), by: ME } as Entry;
}

/** File an unsorted email under an issue, as an email entry. */
export function fileUnsorted(groupId: string, unsortedId: string, issueId: string) {
  updateGroup(groupId, (g) => {
    const mail = g.unsorted.find((u) => u.id === unsortedId);
    if (!mail) return g;
    const filed: Entry = {
      id: newId(),
      kind: "email",
      direction: mail.memberId ? "to_landlord" : "from_landlord",
      at: mail.receivedAt,
      recordedAt: mail.receivedAt,
      by: mail.memberId ?? ME,
      from: mail.from,
      to: g.inbox,
      subject: mail.subject,
      text: mail.text,
      via: mail.via,
      auth: mail.auth,
    };
    return {
      ...g,
      unsorted: g.unsorted.filter((u) => u.id !== unsortedId),
      issues: g.issues.map((i) => (i.id === issueId ? { ...i, entries: [...i.entries, filed] } : i)),
    };
  });
}

export function rejectUnsorted(groupId: string, unsortedId: string) {
  updateGroup(groupId, (g) => ({ ...g, unsorted: g.unsorted.filter((u) => u.id !== unsortedId) }));
}

export function setLandlord(groupId: string, landlord: { name?: string; email?: string }) {
  updateGroup(groupId, (g) => ({ ...g, landlord: { ...g.landlord, ...landlord } }));
}

export function prefsOf(s: State | null): Prefs {
  const p = s?.prefs;
  return { ...DEFAULT_PREFS, ...p, notify: { ...DEFAULT_PREFS.notify, ...p?.notify } };
}

export function setPrefs(patch: Partial<Prefs>) {
  const s = get();
  set({ ...s, prefs: { ...prefsOf(s), ...patch } });
}

/** Your own entries across every group, for "Download my entries". */
export function myEntries(s: State) {
  return s.groups.flatMap((g) =>
    g.issues.flatMap((i) =>
      i.entries
        .filter((e) => e.by === ME)
        .map((e) => ({ group: g.name, problem: `${issueRefOf(i)} ${i.title}`, ...e })),
    ),
  );
}

function issueRefOf(i: Issue) {
  return `CL-${i.ref}`;
}

/** Replace your own household's "who is affected" details on a problem. */
export function setMyAffected(groupId: string, issueId: string, mine: Affected[]) {
  updateIssue(groupId, issueId, (i) => ({ ...i, affected: [...(i.affected ?? []).filter((a) => a.by !== ME), ...mine] }));
}

/** Ask the group for updates before writing to the landlord on a date. */
export function requestUpdates(groupId: string, input: { issueIds: string[]; writeOn: string; note?: string }): string {
  const id = newId();
  const request: UpdateRequest = { id, by: ME, at: new Date().toISOString(), issueIds: input.issueIds, writeOn: input.writeOn, note: input.note?.trim() || undefined };
  updateGroup(groupId, (g) => ({ ...g, requests: [...(g.requests ?? []).filter((r) => !(r.by === ME && !r.closedAt && r.issueIds.some((x) => input.issueIds.includes(x)))), request] }));
  return id;
}

/** Close requests for updates: cancelled, or because the letter they were for has been sent. */
export function closeRequests(groupId: string, match: { id?: string; issueIds?: string[] }) {
  const now = new Date().toISOString();
  updateGroup(groupId, (g) => ({
    ...g,
    requests: (g.requests ?? []).map((r) =>
      !r.closedAt && (r.id === match.id || (match.issueIds && r.by === ME && r.issueIds.some((x) => match.issueIds!.includes(x)))) ? { ...r, closedAt: now } : r,
    ),
  }));
}

export function setGroupAddress(groupId: string, address: { line: string; postcode: string }) {
  updateGroup(groupId, (g) => ({ ...g, address }));
}

export function setMyFlat(groupId: string, flat: string) {
  updateGroup(groupId, (g) => ({ ...g, members: g.members.map((m) => (m.id === ME ? { ...m, flat: flat.trim() || undefined } : m)) }));
}
