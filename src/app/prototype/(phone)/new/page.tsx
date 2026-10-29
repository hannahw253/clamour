"use client";

import { InkHeader } from "@/prototype/Frame";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createGroup, setMyName, useStore } from "@/prototype/store";
import { NATION_LABEL, type GroupType, type Nation } from "@/prototype/types";
import { Button, ChoiceCard, Field, Loading, inputClass, label, panel } from "@/prototype/ui";

const TYPES: { value: GroupType; title: string; desc: string }[] = [
  { value: "house", title: "Shared house or flat", desc: "You and the people you live with" },
  { value: "building", title: "Building or estate", desc: "Neighbours with the same landlord" },
  { value: "branch", title: "Union branch", desc: "Members across many homes" },
];

export default function NewGroup() {
  const s = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [you, setYou] = useState("");
  const [type, setType] = useState<GroupType>("house");
  const [nation, setNation] = useState<Nation>("england");
  const [approval, setApproval] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ name?: string; you?: string }>({});

  if (!s) return <Loading />;
  const needsName = !s.myName;
  const approvalOn = approval ?? type === "branch";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      name: name.trim() ? undefined : "Give your group a name",
      you: needsName && !you.trim() ? "Add your name" : undefined,
    };
    setErrors(next);
    if (next.name || next.you) return;
    if (needsName) setMyName(you);
    const id = createGroup({ name, type, nation, approval: approvalOn });
    router.push(`/prototype/g/${id}/invite?new=1`);
  };

  return (
    <main className="desk-narrow flex flex-1 flex-col gap-6 px-4 pb-12">
      <InkHeader back={{ href: "/prototype", text: "Your groups" }} title="Start a group" display sub="It takes under a minute. You can change the name later." />

      <form onSubmit={submit} noValidate className="flex flex-col gap-7">
        {needsName ? (
          <Field id="you" title="Your name" help="What your group will see. A first name is fine." error={errors.you}>
            <input
              id="you"
              className={inputClass}
              value={you}
              onChange={(e) => setYou(e.target.value)}
              autoComplete="given-name"
              aria-invalid={!!errors.you}
            />
          </Field>
        ) : null}

        <Field id="name" title="Group name" help="Most groups use the address or the building's name." error={errors.name}>
          <input
            id="name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="14 Marsh Road"
            aria-invalid={!!errors.name}
            aria-describedby="name-help"
          />
        </Field>

        <fieldset className="flex flex-col gap-3">
          <legend className={`${label} mb-2`}>Who is it for?</legend>
          {TYPES.map((t) => (
            <ChoiceCard
              key={t.value}
              name="type"
              value={t.value}
              checked={type === t.value}
              onChange={(v) => setType(v as GroupType)}
              title={t.title}
              desc={t.desc}
            />
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className={`${label} mb-2`}>Where are the homes?</legend>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(NATION_LABEL) as Nation[]).map((n) => (
              <ChoiceCard
                key={n}
                name="nation"
                value={n}
                checked={nation === n}
                onChange={(v) => setNation(v as Nation)}
                title={NATION_LABEL[n]}
              />
            ))}
          </div>
          <p className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">
            This sets which legal deadlines Clamour shows. Only the owner can change it later.
          </p>
        </fieldset>

        <label className={`flex cursor-pointer items-start gap-3 px-4 py-3 ${panel}`}>
          <input
            type="checkbox"
            checked={approvalOn}
            onChange={(e) => setApproval(e.target.checked)}
            className="mt-1 size-5 flex-none accent-[var(--ink)]"
          />
          <span className="flex flex-col">
            <span className="text-[1.0625rem] leading-[1.625rem] font-bold">Approve new members before they join</span>
            <span className="text-[0.9375rem] leading-[1.375rem] text-ink-muted">
              Recommended for union branches and big buildings, where a link could be passed on.
            </span>
          </span>
        </label>

        <Button type="submit" variant="primary">
          Create group
        </Button>
      </form>
    </main>
  );
}
