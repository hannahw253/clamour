"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Lockup } from "@/components/brand/Lockup";
import { joinFromInvite, readToken, useStore } from "@/prototype/store";
import { NATION_LABEL, TYPE_LABEL } from "@/prototype/types";
import { Button, ButtonLink, Field, Loading, PageTitle, inputClass, label } from "@/prototype/ui";

/** Join from a link: explain the invite, sign in with an emailed code, then land or wait (document 3). */
export default function Join() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const s = useStore();
  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState(s?.myName ?? "");
  const [flat, setFlat] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!s) return <Loading />;
  const invite = readToken(token);

  if (!invite) {
    return (
      <main className="flex flex-col gap-6 px-4 pt-10 pb-12">
        <PageTitle sub="It may have been reset by an admin, or copied only in part. Ask whoever sent it for a new one.">
          This link doesn&rsquo;t work
        </PageTitle>
        <ButtonLink href="/prototype" variant="secondary">
          Go to Clamour
        </ButtonLink>
      </main>
    );
  }

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Add your name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter an email address, like name@example.com";
    setErrors(next);
    if (!Object.keys(next).length) setStep("code");
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setErrors({ code: "Enter the 6 numbers from the email" });
      return;
    }
    const result = joinFromInvite(token, name, flat);
    if (result) router.replace(`/prototype/g/${result.groupId}`);
  };

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 pt-8 pb-12">
      <Lockup size={32} ground="paper" tagline={false} />
      <div className="flex flex-col gap-3">
        <p className={`${label} text-ink-muted`}>
          {TYPE_LABEL[invite.t]} · {NATION_LABEL[invite.n]}
        </p>
        <PageTitle
          sub={
            invite.r === "admin"
              ? "You'll be an admin: you can log problems, invite people and manage members."
              : "You'll be able to log problems and add photos and notes to the group's record."
          }
        >
          Join {invite.g}
        </PageTitle>
      </div>

      {step === "details" ? (
        <form onSubmit={sendCode} noValidate className="flex flex-col gap-6">
          <Field id="join-name" title="Your name" help="What your group will see. A first name is fine." error={errors.name}>
            <input id="join-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
          </Field>
          {invite.t !== "house" ? (
            <Field id="join-flat" title="Your flat (optional)" help="Helps your neighbours know where a problem is.">
              <input id="join-flat" className={inputClass} value={flat} onChange={(e) => setFlat(e.target.value)} placeholder="Flat 4" />
            </Field>
          ) : null}
          <Field id="join-email" title="Your email" help="We'll send you a code to sign in. No password needed." error={errors.email}>
            <input
              id="join-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="primary">
            Send me a code
          </Button>
          <p className="text-[15px] leading-[22px] text-ink-muted">
            {invite.a
              ? "An admin will check your request before you can see the group."
              : "You'll join straight away."}{" "}
            Your landlord can&rsquo;t see your group.
          </p>
        </form>
      ) : (
        <form onSubmit={join} noValidate className="flex flex-col gap-6">
          <p className="text-[17px] leading-[26px]">
            We&rsquo;ve sent a 6-digit code to <span className="font-bold">{email}</span>.
          </p>
          <Field id="join-code" title="Code" error={errors.code} help="Prototype: any 6 numbers will work, and no email is sent.">
            <input
              id="join-code"
              className={`${inputClass} font-mono tracking-[0.3em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Button type="submit" variant="primary">
            Join group
          </Button>
          <Button variant="ghost" className="self-start" onClick={() => setStep("details")}>
            Use a different email
          </Button>
        </form>
      )}
    </main>
  );
}
