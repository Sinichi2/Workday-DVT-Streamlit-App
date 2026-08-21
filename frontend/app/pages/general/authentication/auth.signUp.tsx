"use client";

import { useState } from "react";
import { auth } from "@/app/lib/api";
import { reportError } from "@/app/lib/errors";
import {
  AUTH_INPUT,
  AuthShell,
  Field,
  PasswordInput,
  SubmitButton,
  type AuthView,
} from "@/app/pages/general/authentication/auth.signIn";

const MIN_PASSWORD = 12;

export default function AuthSignUp({ onNavigate }: { onNavigate: (v: AuthView) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState(false);

  // Confirm only exists once there's something to confirm — asking someone to
  // repeat a password they haven't chosen is just an extra empty box.
  const showConfirm = password.length > 0;
  const longEnough = password.length >= MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;
  const matched = confirm.length > 0 && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Re-checked here, not just via `minLength`/state: a paste or an autofill
    // can bypass the native constraint entirely.
    // These two are already shown inline as field state (the character
    // countdown and the match indicator), so blocking here is enough.
    if (!longEnough || password !== confirm) return;
    setBusy(true);
    try {
      // The `handle_new_user` trigger reads the names into the profile row, so
      // they survive without a second write the client could fail to make.
      const r = await auth.signUp(email, password, firstName, lastName);
      // No session means the project requires email confirmation.
      if (r.confirm_email) setCheck(true);
    } catch (err: unknown) {
      reportError("auth.signUp", err);
    } finally {
      setBusy(false);
    }
  }

  if (check) {
    return (
      <AuthShell title="Confirm your email" subtitle={`We sent a link to ${email}.`}>
        <p className="pt-8 text-[15px] leading-relaxed text-[#6B6157]">
          Open it to activate your account, then sign in.
        </p>
        <button
          onClick={() => onNavigate("signIn")}
          className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#1B1815] py-3.5 text-[15px] text-[#FBF8F3] transition-colors duration-500 hover:bg-[#2F4BA8]"
        >
          Back to sign in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start checking Workday data in minutes."
      footer={
        <>
          Already have an account?{" "}
          <button
            onClick={() => onNavigate("signIn")}
            className="text-[#2F4BA8] underline underline-offset-4 transition-colors hover:text-[#1B1815]"
          >
            Sign in
          </button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <Field label="First name">
            {(id) => (
              <input id={id} required autoComplete="given-name" value={firstName}
                onChange={(e) => setFirstName(e.target.value)} className={AUTH_INPUT} />
            )}
          </Field>
          <Field label="Last name">
            {(id) => (
              <input id={id} required autoComplete="family-name" value={lastName}
                onChange={(e) => setLastName(e.target.value)} className={AUTH_INPUT} />
            )}
          </Field>
        </div>

        <Field label="Work email">
          {(id) => (
            <input id={id} type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} className={AUTH_INPUT} placeholder="you@company.com" />
          )}
        </Field>

        <Field label="Password">
          {(id) => (
            <>
              <PasswordInput
                id={id}
                required
                minLength={MIN_PASSWORD}
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                placeholder={`At least ${MIN_PASSWORD} characters`}
              />
              {/* Length feedback while typing, so the rule is met before the
                  submit rather than reported after it. */}
              {password.length > 0 && !longEnough && (
                <p className="pt-2 text-[12px] text-[#8C8177]">
                  {MIN_PASSWORD - password.length} more character
                  {MIN_PASSWORD - password.length === 1 ? "" : "s"} to go
                </p>
              )}
            </>
          )}
        </Field>

        {/* Grid-rows trick: animates from 0fr to 1fr so the field slides open
            without hardcoding a pixel height that the label could outgrow. */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-500 ${
            showConfirm ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
          aria-hidden={!showConfirm}
        >
          {/* min-h-0: a grid item defaults to min-height:auto, which refuses
              to shrink below its content and defeats the 0fr collapse. */}
          <div className="min-h-0 overflow-hidden">
            <Field label="Confirm password">
              {(id) => (
                <>
                  <PasswordInput
                    id={id}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={setConfirm}
                    // Untabbable while collapsed, or keyboard focus lands in a
                    // field nobody can see.
                    tabIndex={showConfirm ? undefined : -1}
                    invalid={mismatch}
                    placeholder="Type it again"
                  />
                  {mismatch && <p className="pt-2 text-[12px] text-[#8A3A32]">Doesn&rsquo;t match yet</p>}
                  {matched && <p className="pt-2 text-[12px] text-[#2F6B45]">Passwords match</p>}
                </>
              )}
            </Field>
          </div>
        </div>

        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
