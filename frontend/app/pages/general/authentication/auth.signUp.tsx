"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  AUTH_INPUT,
  AuthShell,
  Field,
  FormError,
  SubmitButton,
  type AuthView,
} from "@/app/pages/general/authentication/auth.signIn";

const MIN_PASSWORD = 12;

export default function AuthSignUp({ onNavigate }: { onNavigate: (v: AuthView) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Checked here as well as by `minLength` so a paste or an autofill that
    // bypasses the native check still can't submit a weak password.
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // The `handle_new_user` trigger reads these into the profile row, so the
      // name survives without a second write the client could fail to make.
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    // No session means the project requires email confirmation.
    if (!data.session) setCheck(true);
  }

  if (check) {
    return (
      <AuthShell title="Confirm your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <p className="pt-5 text-sm leading-relaxed text-[#6B6157]">
          Open it to activate your account, then sign in.
        </p>
        <button
          onClick={() => onNavigate("signIn")}
          className="mt-7 w-full rounded-full bg-[#1B1815] px-4 py-3 text-[15px] text-[#FBF8F3] transition-colors duration-500 hover:bg-[#2F4BA8] active:scale-[0.985]"
        >
          Back to sign in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start validating Workday data in minutes."
      footer={
        <>
          Already have an account?{" "}
          <button onClick={() => onNavigate("signIn")} className="font-medium text-[#2F4BA8] underline-offset-4 transition-colors hover:underline">
            Sign in
          </button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Field label="First name">
            {(id) => (
              <input
                id={id}
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={AUTH_INPUT}
              />
            )}
          </Field>
          <Field label="Last name">
            {(id) => (
              <input
                id={id}
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={AUTH_INPUT}
              />
            )}
          </Field>
        </div>
        <Field label="Work email">
          {(id) => (
            <input
              id={id}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT}
              placeholder="you@company.com"
            />
          )}
        </Field>
        <Field label="Password">
          {(id) => (
            <input
              id={id}
              type="password"
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={AUTH_INPUT}
              placeholder={`Min ${MIN_PASSWORD} characters`}
            />
          )}
        </Field>
        <FormError message={error} />
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
