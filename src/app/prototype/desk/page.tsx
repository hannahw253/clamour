"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { nextAction } from "@/prototype/actions";
import { issueClock, issueStatus, lastActivity } from "@/prototype/clocks";
import { agoWords, daysBetween, londonParts, todayYmd } from "@/prototype/dates";
import { AddEvidenceSheet, WhenSheet, type Save } from "@/prototype/EvidenceSheet";
import { RecentActivity } from "@/prototype/Record";
import { addEntries, effectiveRole, loadSamples, memberName, myMember, setViewAs, useStore, visibleIssues } from "@/prototype/store";
import { CATEGORY_LABEL, ME, NATION_LABEL, ROLE_LABEL, TYPE_LABEL, issueRef, type Group, type Issue, type Role, type State } from "@/prototype/types";
import { Button, Chip, Icon, Loading, buttonClass, inputClass, label } from "@/prototype/ui";

type Filter = "action" | "open" | "missed" | "fixed";
type Row = { group: Group; issue: Issue };

const FILTERS: { key: Filter; text: string }[] = [
  { key: "action", text: "Needs action" },
  { key: "open", text: "All open" },
  { key: "missed", text: "Deadline missed" },
  { key: "fixed", text: "Fixed" },
];

export default function DeskPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Desk />
    </Suspense>
  );
}

function Desk() {
  const s = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const scope = params.get("g") ?? "all";
  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [focus, setFocus] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    if (!s) return [];
    const groups = scope === "all" ? s.groups : s.groups.filter((g) => g.id === scope);
    return groups
      .filter((g) => myMember(g)?.status !== "pending")
      .flatMap((g) => visibleIssues(s, g).map((issue) => ({ group: g, issue })));
  }, [s, scope]);

  if (!s) return <Loading />;

  if (!s.groups.length) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-16">
        <h1 className="font-display text-[44px] leading-[1.02] uppercase">Your dashboard</h1>
        <p className="text-[17px] leading-[26px]">
          Every problem across your groups in one place, for organisers, union reps and anyone handling a lot at once.
        </p>
        <Button
          variant="primary"
          className="self-start"
          onClick={() => {
            loadSamples();
            router.refresh();
          }}
        >
          Load the sample groups
        </Button>
      </main>
    );
  }

  const group = scope === "all" ? null : s.groups.find((g) => g.id === scope) ?? null;
  const q = query.trim().toLowerCase();
  const match = (r: Row) =>
    !q ||
    [r.issue.title, r.issue.room ?? "", issueRef(r.issue), r.group.name, CATEGORY_LABEL[r.issue.category]].some((t) => t.toLowerCase().includes(q));
  const open = rows.filter((r) => issueStatus(r.issue) !== "fixed");
  const counts = {
    open: open.length,
    action: open.filter((r) => nextAction(r.group, r.issue).kind === "send").length,
    missed: open.filter((r) => issueClock(r.group, r.issue).tone === "missed").length,
    fixed: rows.length - open.length,
  };
  const toFile = (scope === "all" ? s.groups : group ? [group] : []).reduce(
    (n, g) => n + g.unsorted.filter((u) => effectiveRole(s, g) !== "submitter" || u.memberId === ME).length,
    0,
  );
  const shown = rows
    .filter((r) =>
      filter === "fixed"
        ? issueStatus(r.issue) === "fixed"
        : issueStatus(r.issue) !== "fixed" &&
          (filter === "open" ||
            (filter === "action" && nextAction(r.group, r.issue).kind === "send") ||
            (filter === "missed" && issueClock(r.group, r.issue).tone === "missed")),
    )
    .filter(match)
    .sort((a, b) => {
      const rank = (r: Row) => (nextAction(r.group, r.issue).kind === "send" ? 0 : 1) + (issueClock(r.group, r.issue).tone === "missed" ? -0.5 : 0);
      return rank(a) - rank(b) || lastActivity(b.issue).localeCompare(lastActivity(a.issue));
    });

  const selRows = rows.filter((r) => selected.includes(r.issue.id));
  const selGroups = new Set(selRows.map((r) => r.group.id));
  const canBulk = selRows.length > 0 && selGroups.size === 1 && effectiveRole(s, selRows[0].group) !== "submitter";
  const focused = rows.find((r) => r.issue.id === focus) ?? null;
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="flex min-h-0 flex-1">
      <Sidebar s={s} scope={scope} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 px-8 py-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-9 font-bold">{group ? group.name : "All groups"}</h1>
            <p className="text-[15px] text-ink-muted">
              {group
                ? `${TYPE_LABEL[group.type]} · ${NATION_LABEL[group.nation]} · ${group.members.filter((m) => m.status === "active").length} members${group.landlord?.name ? ` · Landlord: ${group.landlord.name}` : ""}`
                : `${s.groups.length} groups · the branch view unions would pay for`}
            </p>
          </div>
          {group ? <ViewAs s={s} group={group} /> : null}
        </div>

        <section aria-label="Summary" className="grid grid-cols-4 gap-3">
          <Tile value={counts.open} text="Open problems" onClick={() => setFilter("open")} active={filter === "open"} />
          <Tile value={counts.action} text="Need action from you" onClick={() => setFilter("action")} active={filter === "action"} />
          <Tile value={counts.missed} text="Deadlines missed" tone={counts.missed ? "alarm" : undefined} onClick={() => setFilter("missed")} active={filter === "missed"} />
          {group ? (
            <Link href={`/prototype/g/${group.id}/unsorted`} className="flex flex-col gap-1 rounded-xl bg-concrete px-5 py-4 no-underline">
              <span className="font-display text-[36px] leading-none">{toFile}</span>
              <span className="text-[15px] font-semibold">Emails to file</span>
            </Link>
          ) : (
            <Tile value={toFile} text="Emails to file" />
          )}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Show" className="flex rounded-xl bg-concrete p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`min-h-10 rounded-lg px-4 text-[15px] font-bold ${filter === f.key ? "bg-paper shadow-sm" : "text-ink-muted"}`}
              >
                {f.text} ({counts[f.key]})
              </button>
            ))}
          </div>
          <label className="ml-auto flex w-72 items-center gap-2">
            <span className="sr-only">Search</span>
            <input className={`${inputClass} min-h-11 text-[15px]`} placeholder="Search problems, flats or CL numbers" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {selRows.length ? (
          <div className="flex items-center gap-3 rounded-xl bg-ink px-4 py-3 text-paper">
            <span className="font-bold">{selRows.length} selected</span>
            <span className="flex-1 text-[15px] opacity-80">
              {selGroups.size > 1
                ? "Choose problems from one group to write one letter about them."
                : canBulk
                  ? "Write one letter to the landlord about all of them."
                  : "Only admins can send letters for the group."}
            </span>
            {canBulk ? (
              <Link
                href={`/prototype/desk/compose?g=${selRows[0].group.id}&ids=${selRows.map((r) => r.issue.id).join(",")}`}
                className={buttonClass("primary", "min-h-10")}
              >
                <Icon name="letter" /> Send one group letter
              </Link>
            ) : null}
            <button type="button" className="min-h-10 px-2 font-bold underline" onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-line-subtle">
          <table className="w-full border-collapse text-left text-[15px] leading-[22px]">
            <thead className="bg-concrete text-[13px] tracking-[0.04em] text-ink-muted uppercase">
              <tr>
                <th className="w-10 px-3 py-2">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-3 py-2 font-bold">Problem</th>
                {scope === "all" ? <th className="px-3 py-2 font-bold">Group</th> : null}
                <th className="px-3 py-2 font-bold">Where it stands</th>
                <th className="px-3 py-2 font-bold">Next step</th>
                <th className="px-3 py-2 font-bold">Logged by</th>
                <th className="px-3 py-2 text-right font-bold">Last entry</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const clock = issueClock(r.group, r.issue);
                const next = nextAction(r.group, r.issue);
                const isFocus = focus === r.issue.id;
                const last = daysBetween(londonParts(lastActivity(r.issue)).ymd, todayYmd());
                return (
                  <tr
                    key={r.issue.id}
                    onClick={() => setFocus(isFocus ? null : r.issue.id)}
                    className={`cursor-pointer border-t border-line-subtle align-top ${isFocus ? "bg-signal-soft" : "hover:bg-concrete/50"}`}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.issue.title}`}
                        checked={selected.includes(r.issue.id)}
                        onChange={() => toggle(r.issue.id)}
                        className="size-5 accent-[var(--ink)]"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" className="text-left font-bold" onClick={(e) => (e.stopPropagation(), setFocus(isFocus ? null : r.issue.id))}>
                        {r.issue.title}
                      </button>
                      <span className="block text-[13px] text-ink-muted">
                        <span className="font-mono">{issueRef(r.issue)}</span>
                        {r.issue.room ? ` · ${r.issue.room}` : ""} · {CATEGORY_LABEL[r.issue.category]}
                      </span>
                    </td>
                    {scope === "all" ? <td className="px-3 py-3">{r.group.name}</td> : null}
                    <td className="px-3 py-3">
                      {clock.tone === "missed" ? (
                        <Chip tone="alarm" icon="warning">
                          Missed
                        </Chip>
                      ) : clock.tone === "met" ? (
                        <Chip tone="done" icon="tick">
                          Fixed
                        </Chip>
                      ) : null}
                      <span className="block">{clock.words.replace(/^Deadline missed: (.)/, (_, c: string) => c.toUpperCase())}</span>
                    </td>
                    <td className={`px-3 py-3 ${next.kind === "send" ? "font-bold" : "text-ink-muted"}`}>{next.headline}</td>
                    <td className="px-3 py-3">{memberName(r.group, r.issue.createdBy)}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap text-ink-muted">{agoWords(last)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!shown.length ? <p className="px-4 py-8 text-center text-ink-muted">Nothing here.</p> : null}
        </div>
      </main>

      {focused && !selRows.length ? <Detail key={focused.issue.id} s={s} row={focused} onClose={() => setFocus(null)} /> : null}
    </div>
  );
}

function Sidebar({ s, scope }: { s: State; scope: string }) {
  const needs = (g: Group) =>
    myMember(g)?.status === "pending" ? 0 : visibleIssues(s, g).filter((i) => nextAction(g, i).kind === "send").length;
  const item = (active: boolean) =>
    `flex min-h-12 items-center gap-2 rounded-lg px-3 py-2 no-underline ${active ? "bg-paper font-bold shadow-sm" : "hover:bg-paper/60"}`;
  return (
    <nav aria-label="Groups" className="flex w-64 flex-none flex-col gap-1 border-r border-line-subtle bg-concrete p-3">
      <p className={`${label} px-3 pt-2 pb-1 text-ink-muted`}>Groups</p>
      <Link href="/prototype/desk" className={item(scope === "all")}>
        <span className="flex-1">All groups</span>
        <Count n={s.groups.reduce((n, g) => n + needs(g), 0)} />
      </Link>
      {s.groups.map((g) => (
        <Link key={g.id} href={`/prototype/desk?g=${g.id}`} className={item(scope === g.id)}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{g.name}</span>
            <span className="text-[13px] font-normal text-ink-muted">
              {TYPE_LABEL[g.type]} · {NATION_LABEL[g.nation]}
            </span>
          </span>
          <Count n={needs(g)} />
        </Link>
      ))}
      <Link href="/prototype/new" className="mt-2 flex min-h-11 items-center gap-2 px-3 font-bold">
        <Icon name="plus" size={18} /> Start a group
      </Link>
    </nav>
  );
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="min-w-6 rounded-full bg-ink px-2 text-center text-[13px] leading-6 font-bold text-paper" aria-label={`${n} need action`}>
      {n}
    </span>
  );
}

function Tile({ value, text, tone, onClick, active }: { value: number; text: string; tone?: "alarm"; onClick?: () => void; active?: boolean }) {
  const cls = `flex flex-col gap-1 rounded-xl px-5 py-4 text-left ${tone === "alarm" ? "bg-alarm text-on-alarm" : "bg-concrete"} ${active ? "ring-2 ring-line" : ""}`;
  const inner = (
    <>
      <span className="font-display text-[36px] leading-none">{value}</span>
      <span className="text-[15px] font-semibold">{text}</span>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function ViewAs({ s, group }: { s: State; group: Group }) {
  const realRole = myMember(group)?.role ?? "submitter";
  return (
    <label className="flex items-center gap-2 text-[14px] font-semibold">
      <span className="text-ink-muted">Prototype: view as</span>
      <select
        value={s.viewAs ?? realRole}
        onChange={(e) => {
          const r = e.target.value as Role;
          setViewAs(r === realRole ? null : r);
        }}
        className="min-h-10 rounded-md border border-line bg-paper px-2 font-bold"
      >
        {(["owner", "admin", "submitter"] as Role[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
            {r === realRole ? " (you)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function Detail({ s, row, onClose }: { s: State; row: Row; onClose: () => void }) {
  const { group, issue } = row;
  const [sheet, setSheet] = useState<"evidence" | "visit" | null>(null);
  const role = effectiveRole(s, group);
  const canManage = role !== "submitter" || issue.createdBy === ME;
  const clock = issueClock(group, issue);
  const next = nextAction(group, issue);
  const phone = `/prototype/g/${group.id}/i/${issue.id}`;
  const save: Save = (entries) => {
    addEntries(group.id, issue.id, entries);
    setSheet(null);
  };
  const tone = { informal: "bg-concrete", statutory: "bg-signal-soft", missed: "bg-alarm text-on-alarm", met: "bg-done text-on-done" }[clock.tone];

  return (
    <aside aria-label="Selected problem" className="flex w-[420px] flex-none flex-col gap-5 overflow-y-auto border-l border-line-subtle px-6 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[13px] text-ink-muted">
            {issueRef(issue)} · {group.name}
          </p>
          <h2 className="text-[22px] leading-7 font-bold">{issue.title}</h2>
          <p className="text-[15px] text-ink-muted">
            {issue.room ? `${issue.room} · ` : ""}
            {CATEGORY_LABEL[issue.category]}
          </p>
        </div>
        <button type="button" onClick={onClose} className="flex size-11 flex-none items-center justify-center" aria-label="Close">
          <Icon name="back" className="rotate-180" />
        </button>
      </div>

      <div className={`flex flex-col gap-1 rounded-xl px-4 py-3 ${tone}`}>
        {clock.lead ? <p className="text-[14px] font-semibold">{clock.lead}</p> : null}
        <p className="font-display text-[30px] leading-none uppercase">{clock.value}</p>
        {clock.unit ? <p className="text-[14px]">{clock.unit}</p> : null}
        <p className="mt-1 text-[12px] font-bold tracking-[0.08em] uppercase opacity-80">{clock.note}</p>
      </div>

      <section className="flex flex-col gap-2">
        <p className={`${label} text-ink-muted`}>Next step</p>
        <p className="text-[18px] leading-6 font-bold">{next.headline}</p>
        <p className="text-[15px] leading-[22px]">{next.why}</p>
        {next.kind === "send" && (canManage || next.letter === "repair_request") ? (
          <Link href={`/prototype/desk/compose?g=${group.id}&ids=${issue.id}&letter=${next.letter}`} className={buttonClass("primary")}>
            <Icon name="letter" /> {next.button}
          </Link>
        ) : next.kind === "visit" ? (
          <Button variant="primary" icon="door" onClick={() => setSheet("visit")}>
            {next.button}
          </Button>
        ) : next.kind === "case" ? (
          <Link href={`/prototype/case/${group.id}/${issue.id}?from=desk`} className={buttonClass("primary")}>
            <Icon name="folder" /> {next.button}
          </Link>
        ) : next.kind === "evidence" ? (
          <Button variant="primary" icon="plus" onClick={() => setSheet("evidence")}>
            {next.button}
          </Button>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button icon="plus" onClick={() => setSheet("evidence")}>
            Add evidence
          </Button>
          <Link href={`/prototype/case/${group.id}/${issue.id}?from=desk`} className={buttonClass("secondary")}>
            <Icon name="folder" /> Case file
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-bold">Latest</h3>
          <Link href={phone} className="min-h-11 content-center text-[15px] font-bold underline">
            Full page
          </Link>
        </div>
        <RecentActivity group={group} issue={issue} limit={5} />
      </section>

      <AddEvidenceSheet open={sheet === "evidence"} onClose={() => setSheet(null)} onSave={save} group={group} issue={issue} />
      <WhenSheet
        open={sheet === "visit"}
        onClose={() => setSheet(null)}
        title="Record a landlord visit"
        whenLabel="When did they (or someone for them) come?"
        noteLabel="What did they say or do? (optional)"
        saveText="Save visit"
        onSave={(at, text) => save([{ kind: "visit", at, text }])}
      />
    </aside>
  );
}
