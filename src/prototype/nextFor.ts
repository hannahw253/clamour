/**
 * The next step for this person: the escalation ladder (actions.ts), adjusted for what their role
 * lets them do (north star, document 3). Shared by the phone and the dashboard so both say the same.
 */

import { nextAction, type NextAction } from "./actions";
import type { permissions } from "./store";
import type { Group, Issue } from "./types";

type Can = ReturnType<typeof permissions>;

export function nextFor(can: Can, group: Group, issue: Issue): NextAction {
  const next = nextAction(group, issue);
  const someoneElse = " Ask whoever logged it, or an admin, to send it.";
  if (next.kind === "send" && !can.manage && next.letter !== "repair_request") {
    return can.addEvidence
      ? { kind: "evidence", headline: next.headline, why: `${next.why}${someoneElse}`, button: "Add evidence" }
      : { kind: "update", headline: next.headline, why: `${next.why}${someoneElse} You can add how it affects your household.`, button: "Add your update" };
  }
  if ((next.kind === "evidence" || next.kind === "visit") && !can.addEvidence) {
    return { kind: "update", headline: next.headline, why: `${next.why} Whoever logged it, or an admin, adds evidence here. You can add how it affects your household.`, button: "Add your update" };
  }
  return next;
}
