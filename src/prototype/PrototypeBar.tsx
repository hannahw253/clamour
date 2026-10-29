"use client";

import { useParams, useRouter } from "next/navigation";
import { useDesktop, useWide } from "./Frame";
import { findGroup, isStorageFull, myMember, setPrefs, setViewAs, useStore } from "./store";
import { ROLE_LABEL, type Role } from "./types";
import { label } from "./ui";

/**
 * A strip on every prototype screen, so nobody mistakes it for the real app.
 * Inside a group it also holds the "view as" switch for showing each role in interviews.
 */
export function PrototypeBar() {
  const s = useStore();
  const { gid } = useParams<{ gid?: string }>();
  const group = s && gid ? findGroup(s, gid) : undefined;
  const realRole = group ? (myMember(group)?.role ?? "submitter") : null;
  const role = s?.viewAs ?? realRole;
  const router = useRouter();
  const wide = useWide();
  const desktop = useDesktop();
  return (
    <div className="flex flex-col gap-1 bg-concrete px-4 py-1.5 print:hidden">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <span className="flex items-center gap-3">
          <p className={`${label} text-[12px]`}>Prototype</p>
          {wide && !desktop ? (
            <button
              type="button"
              className="min-h-9 text-[13px] font-bold underline underline-offset-2"
              onClick={() => {
                setPrefs({ layout: "auto" });
                router.push("/prototype/desk");
              }}
            >
              Desktop view
            </button>
          ) : null}
        </span>
        {group && realRole && role ? (
          <label className="flex items-center gap-1.5 text-[13px] font-semibold">
            <span className="text-ink-muted">View as</span>
            <select
              value={role}
              onChange={(e) => {
                const r = e.target.value as Role;
                setViewAs(r === realRole ? null : r);
              }}
              className="min-h-9 rounded-md border border-line bg-paper px-1.5 text-[13px] font-bold text-ink"
            >
              {(["owner", "admin", "submitter"] as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                  {r === realRole ? " (you)" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-[13px] text-ink-muted">Saved on this device only</p>
        )}
      </div>
      {s && isStorageFull() ? (
        <p className="text-[15px] leading-[22px] font-bold">
          This device&rsquo;s storage is full, so new photos will be lost when you close the page.
        </p>
      ) : null}
    </div>
  );
}
