"use client";

import { useState } from "react";
import { issueRef, type Group, type Issue } from "./types";
import { Button, Icon, label } from "./ui";

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
    <div className="flex flex-col gap-3 rounded-lg border-2 border-line bg-paper p-4">
      <div className="flex flex-col gap-1">
        <p className={label}>Your group&rsquo;s email address</p>
        <p className="font-mono text-[15px] leading-[22px] break-all">{group.inbox}</p>
      </div>
      <Button icon="copy" onClick={copy}>
        {copied ? "Copied" : "Copy address"}
      </Button>
      <p className="text-[15px] leading-[22px]">
        Copy it in when you email your landlord. The email is saved to the record exactly as it was sent, with a check
        that proves who sent it.
      </p>
      <ul className="flex flex-col gap-2 text-[15px] leading-[22px]">
        <li className="flex gap-2">
          <span className="w-10 flex-none font-bold">CC</span>
          <span>Your landlord can see it. When they reply to all, their reply is saved too.</span>
        </li>
        <li className="flex gap-2">
          <span className="w-10 flex-none font-bold">BCC</span>
          <span>Your landlord can&rsquo;t see it. Only your email is saved; forward their reply when it comes.</span>
        </li>
      </ul>
      {issue ? (
        <p className="flex items-start gap-2 text-[15px] leading-[22px]">
          <Icon name="tick" size={18} className="mt-0.5" />
          <span>
            Put <span className="font-mono font-bold">[{issueRef(issue)}]</span> in the subject so it&rsquo;s filed
            under this problem.
          </span>
        </p>
      ) : null}
      <p className="text-[13px] leading-[18px] text-ink-muted">Prototype: this address can&rsquo;t receive email yet.</p>
    </div>
  );
}
