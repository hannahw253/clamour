/**
 * Two made-up groups for interviews, dated relative to today so the clocks always
 * show something sensible: a shared house in England (no statutory deadline yet)
 * and a building in Scotland (Awaab's Law damp and mould timescales). Between them
 * they show every way evidence can arrive: copied-in and forwarded emails, a
 * screenshot of messages, a phone call waiting to be confirmed in writing, readings,
 * a receipt and emails waiting to be filed.
 */

import { ME, type Entry, type Group, type Issue, type Photo } from "./types";

/** A drawing of a chat, standing in for a real screenshot. No words, so nothing to misread. */
function chatScreenshot(): string {
  const bubble = (y: number, right: boolean, w: number) =>
    `<rect x="${right ? 300 - w - 16 : 16}" y="${y}" width="${w}" height="34" rx="14" fill="${right ? "#cfe9c4" : "#ffffff"}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420">
<rect width="300" height="420" fill="#e9e4dc"/><rect width="300" height="52" fill="#1f5c4a"/>
<circle cx="30" cy="26" r="14" fill="#cfd8d3"/><rect x="54" y="18" width="110" height="14" rx="7" fill="#e3ece8"/>
${bubble(72, false, 190)}${bubble(116, false, 140)}${bubble(170, true, 200)}${bubble(214, false, 210)}${bubble(268, true, 120)}${bubble(312, false, 170)}
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLE_HASH = (seed: string) => (seed.repeat(8) + "0".repeat(64)).slice(0, 64);

export function sampleGroups(now: Date): Group[] {
  const at = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  let n = 0;
  type Draft = {
    [K in Entry["kind"]]: Omit<Extract<Entry, { kind: K }>, "id" | "recordedAt"> & { recordedAt?: string };
  }[Entry["kind"]];
  const e = (fields: Draft): Entry => ({ id: `s${++n}`, recordedAt: fields.recordedAt ?? fields.at, ...fields }) as Entry;
  const issue = (i: Omit<Issue, "entries">, entries: Entry[]): Issue => ({ ...i, entries });
  const screenshot: Photo = { src: chatScreenshot(), sha256: SAMPLE_HASH("5a3e91c2"), alt: "Screenshot of WhatsApp messages with the factor", bytes: 184_220 };

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
    inbox: "",
    unsorted: [],
    landlord: { name: "Dan", email: "lettings@agent.example" },
    issues: [
      issue(
        { id: "boiler", ref: 1, title: "Boiler keeps cutting out, no hot water", category: "heating", room: "Kitchen", createdBy: "priya", createdAt: at(20, 7, 40) },
        [
          e({ kind: "logged", at: at(20, 7, 40), by: "priya" }),
          e({ kind: "note", at: at(20, 7, 42), by: "priya", text: "Pressure drops to zero every morning. Cold showers for all four of us." }),
          e({ kind: "reported", method: "text", at: at(19, 9, 15), by: "priya", text: "Texted the letting agent with photos of the pressure gauge." }),
          e({
            kind: "email",
            direction: "to_landlord",
            at: at(15, 8, 30),
            by: "priya",
            from: "priya@example.com",
            to: "lettings@agent.example",
            subject: "No hot water at 14 Marsh Road [CL-1]",
            text: "Following my text on Monday, the boiler is still cutting out every morning and we have no hot water. Please send an engineer this week.",
            via: "bcc",
            auth: "passed",
          }),
          e({
            kind: "email",
            direction: "from_landlord",
            at: at(14, 16, 2),
            recordedAt: at(14, 19, 40),
            by: "priya",
            from: "lettings@agent.example",
            to: "priya@example.com",
            subject: "RE: No hot water at 14 Marsh Road [CL-1]",
            text: "Thanks Priya, we have booked an engineer for Thursday morning.",
            via: "forwarded",
            auth: "lost",
          }),
          e({ kind: "note", at: at(12, 18, 5), by: "tom", text: "Thursday came and went. Nobody came and nobody called." }),
          e({ kind: "receipt", at: at(10, 13, 0), by: "jess", amount: "£34.99", text: "Electric shower heater for the bathroom while the boiler's broken." }),
          e({ kind: "call", direction: "you_called", with: "Letting agent (Dan)", at: at(2, 11, 20), by: ME, text: "Dan said the engineer is waiting for a part and would come next week. He couldn't give a date." }),
        ],
      ),
      issue(
        { id: "bathroom-mould", ref: 2, title: "Mould on the bathroom ceiling", category: "damp_mould", room: "Bathroom", createdBy: ME, createdAt: at(2, 21, 10) },
        [
          e({ kind: "logged", at: at(2, 21, 10), by: ME }),
          e({ kind: "note", at: at(2, 21, 11), by: ME, text: "Black spots above the shower, spreading towards the light." }),
        ],
      ),
      issue(
        { id: "window", ref: 3, title: "Front room window won't lock", category: "doors_windows", room: "Front room", createdBy: "tom", createdAt: at(41, 17, 30) },
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
    inbox: "",
    landlord: { name: "Greenhill Property Factors", email: "repairs@factor.example" },
    unsorted: [
      {
        id: "u1",
        receivedAt: at(1, 9, 12),
        from: "ruth@example.com",
        memberId: "ruth",
        subject: "Fwd: Communal heating",
        text: "Forwarding the factor's email about the boiler room. Not sure which problem this goes under.",
        via: "forwarded",
        auth: "lost",
      },
      {
        id: "u2",
        receivedAt: at(0, 7, 3),
        from: "offers@newsletter.example",
        subject: "Your weekly savings",
        text: "Not from a member of this group.",
        via: "cc",
        auth: "passed",
      },
    ],
    issues: [
      issue(
        { id: "bedroom-mould", ref: 1, title: "Black mould spreading in the back bedroom", category: "damp_mould", room: "Flat 5, back bedroom", createdBy: "callum", createdAt: at(9, 20, 0) },
        [
          e({ kind: "logged", at: at(9, 20, 0), by: "callum" }),
          e({ kind: "note", at: at(9, 20, 2), by: "callum", text: "Started after the window seal failed. Our baby sleeps in this room." }),
          e({ kind: "reading", measure: "humidity", value: 78, room: "Back bedroom", at: at(9, 20, 5), by: "callum" }),
          e({ kind: "reported", method: "email", at: at(8, 10, 20), by: "callum" }),
          e({ kind: "messages", photo: screenshot, with: "Factor (WhatsApp)", at: at(6, 14, 30), recordedAt: at(6, 18, 2), by: "callum", text: "Factor said they'd 'pass it on' and to wipe it with bleach." }),
          e({ kind: "reading", measure: "humidity", value: 82, room: "Back bedroom", at: at(1, 7, 45), by: "callum" }),
        ],
      ),
      issue(
        { id: "kitchen-damp", ref: 2, title: "Damp patch on the kitchen ceiling, getting bigger", category: "damp_mould", room: "Flat 2, kitchen", createdBy: "aileen", createdAt: at(21, 18, 30) },
        [
          e({ kind: "logged", at: at(21, 18, 30), by: "aileen" }),
          e({ kind: "reported", method: "portal", at: at(20, 9, 5), by: "aileen", text: "Reported through the factor's website. Reference 48213." }),
          e({
            kind: "email",
            direction: "to_landlord",
            at: at(13, 9, 0),
            by: "aileen",
            from: "aileen@example.com",
            to: "repairs@factor.example",
            subject: "Damp in Flat 2 kitchen, reported 8 days ago [CL-2]",
            text: "I reported a damp patch on my kitchen ceiling on your website (reference 48213). It is getting bigger. Please arrange an inspection.",
            via: "cc",
            auth: "passed",
          }),
          e({
            kind: "email",
            direction: "from_landlord",
            at: at(12, 15, 41),
            by: "aileen",
            from: "repairs@factor.example",
            to: "aileen@example.com",
            subject: "RE: Damp in Flat 2 kitchen, reported 8 days ago [CL-2]",
            text: "Thank you for your email. We will arrange an inspection and be in touch.",
            via: "cc",
            auth: "passed",
          }),
          e({ kind: "note", at: at(6, 19, 45), by: "aileen", text: "Patch is now the size of a dinner plate. No inspection, no reply since." }),
        ],
      ),
      issue(
        { id: "flat1-mould", ref: 3, title: "Mould behind the bathroom cabinet", category: "damp_mould", room: "Flat 1, bathroom", createdBy: "ruth", createdAt: at(16, 12, 0) },
        [
          e({ kind: "logged", at: at(16, 12, 0), by: "ruth" }),
          e({ kind: "reported", method: "phone", at: at(15, 11, 30), by: "ruth" }),
          e({ kind: "letter", letter: "confirm", at: at(15, 12, 10), by: "ruth", text: "Copied to send from your own email or messages." }),
          e({ kind: "visit", at: at(6, 11, 0), by: "ruth", text: "Surveyor came, took moisture readings and photos." }),
        ],
      ),
      issue(
        { id: "buzzer", ref: 4, title: "Entry buzzer broken, door won't lock", category: "doors_windows", room: "Main entrance", createdBy: "ruth", createdAt: at(24, 8, 10) },
        [
          e({ kind: "logged", at: at(24, 8, 10), by: "ruth" }),
          e({ kind: "reported", method: "email", at: at(23, 9, 0), by: "ruth" }),
        ],
      ),
    ],
  };

  return [marsh, greenhill];
}
