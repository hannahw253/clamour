/**
 * Two made-up groups for interviews, dated relative to today so the clocks always
 * show something sensible: a shared house in England (no statutory deadline yet)
 * and a building in Scotland (Awaab's Law damp and mould timescales).
 */

import { ME, type Entry, type Group, type Issue } from "./types";

export function sampleGroups(now: Date): Group[] {
  const at = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  let n = 0;
  type Draft = { [K in Entry["kind"]]: Omit<Extract<Entry, { kind: K }>, "id" | "recordedAt"> & { recordedAt?: string } }[Entry["kind"]];
  const e = (fields: Draft): Entry =>
    ({ id: `s${++n}`, recordedAt: fields.recordedAt ?? fields.at, ...fields }) as Entry;
  const issue = (i: Omit<Issue, "entries">, entries: Entry[]): Issue => ({ ...i, entries });

  const marsh: Group = {
    id: "sample-marsh-road",
    name: "14 Marsh Road",
    type: "house",
    nation: "england",
    approval: false,
    visibility: "all",
    createdAt: at(45, 19),
    members: [
      { id: ME, name: "Sam", role: "owner", status: "active", joinedAt: at(45, 19) },
      { id: "priya", name: "Priya", role: "admin", status: "active", joinedAt: at(45, 20) },
      { id: "tom", name: "Tom", role: "submitter", status: "active", joinedAt: at(44, 8) },
      { id: "jess", name: "Jess", role: "submitter", status: "active", joinedAt: at(30, 21) },
    ],
    invites: { submitter: "", admin: "" },
    issues: [
      issue(
        { id: "boiler", title: "Boiler keeps cutting out, no hot water", category: "heating", room: "Kitchen", createdBy: "priya", createdAt: at(20, 7, 40) },
        [
          e({ kind: "logged", at: at(20, 7, 40), by: "priya" }),
          e({ kind: "note", at: at(20, 7, 42), by: "priya", text: "Pressure drops to zero every morning. Cold showers for all four of us." }),
          e({ kind: "reported", method: "text", at: at(19, 9, 15), by: "priya", text: "Texted the letting agent with photos of the pressure gauge." }),
          e({ kind: "note", at: at(12, 18, 5), by: "tom", text: "Agent said an engineer would come this week. Nobody came." }),
        ],
      ),
      issue(
        { id: "bathroom-mould", title: "Mould on the bathroom ceiling", category: "damp_mould", room: "Bathroom", createdBy: ME, createdAt: at(2, 21, 10) },
        [
          e({ kind: "logged", at: at(2, 21, 10), by: ME }),
          e({ kind: "note", at: at(2, 21, 11), by: ME, text: "Black spots above the shower, spreading towards the light." }),
        ],
      ),
      issue(
        { id: "window", title: "Front room window won't lock", category: "doors_windows", room: "Front room", createdBy: "tom", createdAt: at(41, 17, 30) },
        [
          e({ kind: "logged", at: at(41, 17, 30), by: "tom" }),
          e({ kind: "reported", method: "email", at: at(40, 8, 50), by: "tom" }),
          e({ kind: "visit", at: at(33, 10, 0), by: "tom", text: "Agent's handyman came to look." }),
          e({ kind: "fixed", at: at(30, 14, 0), by: "tom", text: "New latch fitted." }),
        ],
      ),
    ],
  };

  const greenhill: Group = {
    id: "sample-greenhill-court",
    name: "Greenhill Court",
    type: "building",
    nation: "scotland",
    approval: true,
    visibility: "all",
    createdAt: at(30, 19),
    members: [
      { id: ME, name: "Sam", role: "owner", status: "active", flat: "Flat 3", joinedAt: at(30, 19) },
      { id: "aileen", name: "Aileen", role: "admin", status: "active", flat: "Flat 2", joinedAt: at(30, 20) },
      { id: "callum", name: "Callum", role: "submitter", status: "active", flat: "Flat 5", joinedAt: at(29, 9) },
      { id: "ruth", name: "Ruth", role: "submitter", status: "active", flat: "Flat 1", joinedAt: at(28, 12) },
      { id: "marek", name: "Marek", role: "submitter", status: "pending", flat: "Flat 4", joinedAt: at(1, 20, 30) },
    ],
    invites: { submitter: "", admin: "" },
    issues: [
      issue(
        { id: "bedroom-mould", title: "Black mould spreading in the back bedroom", category: "damp_mould", room: "Flat 5, back bedroom", createdBy: "callum", createdAt: at(9, 20, 0) },
        [
          e({ kind: "logged", at: at(9, 20, 0), by: "callum" }),
          e({ kind: "note", at: at(9, 20, 2), by: "callum", text: "Started after the window seal failed. Our baby sleeps in this room." }),
          e({ kind: "reported", method: "email", at: at(8, 10, 20), by: "callum" }),
        ],
      ),
      issue(
        { id: "kitchen-damp", title: "Damp patch on the kitchen ceiling, getting bigger", category: "damp_mould", room: "Flat 2, kitchen", createdBy: "aileen", createdAt: at(21, 18, 30) },
        [
          e({ kind: "logged", at: at(21, 18, 30), by: "aileen" }),
          e({ kind: "reported", method: "portal", at: at(20, 9, 5), by: "aileen", text: "Reported through the factor's website. Reference 48213." }),
          e({ kind: "note", at: at(6, 19, 45), by: "aileen", text: "Patch is now the size of a dinner plate. No reply yet." }),
        ],
      ),
      issue(
        { id: "flat1-mould", title: "Mould behind the bathroom cabinet", category: "damp_mould", room: "Flat 1, bathroom", createdBy: "ruth", createdAt: at(16, 12, 0) },
        [
          e({ kind: "logged", at: at(16, 12, 0), by: "ruth" }),
          e({ kind: "reported", method: "phone", at: at(15, 11, 30), by: "ruth" }),
          e({ kind: "visit", at: at(6, 11, 0), by: "ruth", text: "Surveyor came, took moisture readings and photos." }),
        ],
      ),
      issue(
        { id: "buzzer", title: "Entry buzzer broken, door won't lock", category: "doors_windows", room: "Main entrance", createdBy: "ruth", createdAt: at(24, 8, 10) },
        [
          e({ kind: "logged", at: at(24, 8, 10), by: "ruth" }),
          e({ kind: "reported", method: "email", at: at(23, 9, 0), by: "ruth" }),
        ],
      ),
    ],
  };

  return [marsh, greenhill];
}
