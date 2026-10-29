"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { nextAction } from "@/prototype/actions";
import { Composer } from "@/prototype/Composer";
import { findGroup, useStore } from "@/prototype/store";
import { LETTER_LABEL, type LetterKey } from "@/prototype/types";
import { Loading } from "@/prototype/ui";

export default function SendPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Send />
    </Suspense>
  );
}

function Send() {
  const { gid, iid } = useParams<{ gid: string; iid: string }>();
  const asked = useSearchParams().get("letter");
  const s = useStore();
  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  const issue = group?.issues.find((i) => i.id === iid);
  if (!group || !issue) return null;
  const next = nextAction(group, issue);
  const key: LetterKey = asked && asked in LETTER_LABEL ? (asked as LetterKey) : next.kind === "send" ? next.letter : "repair_request";
  const back = `/prototype/g/${group.id}/i/${issue.id}`;
  return <Composer group={group} issues={[issue]} letterKey={key} back={back} afterSent={(how) => `${back}?sent=${how}`} />;
}
