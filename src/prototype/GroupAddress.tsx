"use client";

import { useState } from "react";
import { issueRef, type Group, type Issue } from "./types";
import { Icon } from "./ui";

/** The group's email address, with plain advice on copying it in (north star, document 4: capture channels). */
export function GroupAddress({ group, issue }: { group: Group; issue?: Issue }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(group.inbox);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-concrete p-4">
      <p className="text-[15px] leading-[22px]">Copy your group&rsquo;s address into your email, and it&rsquo;s saved to the record as sent.</p>
      <div className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[14px]">{group.inbox}</span>
        <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-1 px-2 font-bold">
          <Icon name={copied ? "tick" : "copy"} size={18} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {issue ? (
        <p className="text-[15px] leading-[22px]">
          Keep <span className="font-mono font-bold">[{issueRef(issue)}]</span> in the subject so it lands on this problem.
        </p>
      ) : null}
      <details className="text-[15px] leading-[22px]">
        <summary className="min-h-11 cursor-pointer py-2 font-bold">CC or BCC?</summary>
        <p className="pb-1">
          <span className="font-bold">BCC:</span> your landlord can&rsquo;t see it; forward their reply when it comes.
        </p>
        <p>
          <span className="font-bold">CC:</span> your landlord can see it, and their reply-all is saved too.
        </p>
        <p className="pt-2 text-[13px] text-ink-muted">Prototype: this address can&rsquo;t receive email yet.</p>
      </details>
    </div>
  );
}
