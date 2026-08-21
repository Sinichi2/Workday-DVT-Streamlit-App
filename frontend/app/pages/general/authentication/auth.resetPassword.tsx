"use client";

import { useEffect, useState } from "react";
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

/** Two screens in one, because they are two halves of the same flow:
 *  `request` sends the email; `update` is where the emailed link lands. */
export default function AuthResetPassword({ onNavigate }: { onNavigate: (v: AuthView) => void }) {
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  // The recovery link lands with tokens in the URL fragment. Adopting them is
  // what lets this screen call /auth/password as that user, and it is the cue
  // to show the "set a new password" half rather than the request half.
  useEffect(() => {
    if (auth.adoptFromUrlFragment()) setMode("update");
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await auth.requestReset(email, typeof window !== "undefined" ? window.location.origin : undefined);
      // Never branch on "user not found" — confirming which addresses have
      // accounts turns this form into an account-enumeration oracle.
      setSent(true);
    } catch (err: unknown) {
      reportError("auth.requestReset", err);
    } finally {
      setBusy(false);
    }
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return;
    setBusy(true);
    try {
      await auth.setPassword(password);
      setDone(true);
    } catch (err: unknown) {
      reportError("auth.setPassword", err);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You're signed in with your new password.">
        <p className="pt-5 text-sm leading-relaxed text-[#6B6157]">You can close this page or continue to Valigo.</p>
      </AuthShell>
    );
  }

  if (mode === "update") {
    return (
      <AuthShell title="Set a new password" subtitle="Choose something you haven't used before.">
        <form onSubmit={setNewPassword} noValidate>
          <Field label="New password">
            {(id) => (
              <PasswordInput
                id={id}
                required
                minLength={MIN_PASSWORD}
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                placeholder={`At least ${MIN_PASSWORD} characters`}
              />
            )}
          </Field>
          <SubmitButton busy={busy}>Update password</SubmitButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={sent ? "Check your inbox." : "We'll email you a link to set a new one."}
      footer={
        <button onClick={() => onNavigate("signIn")} className="font-medium text-[#2F4BA8] underline-offset-4 transition-colors hover:underline">
          Back to sign in
        </button>
      }
    >
      {sent ? (
        <p className="pt-5 text-sm leading-relaxed text-[#6B6157]">
          If an account exists for {email}, a reset link is on its way. The link expires in one hour.
        </p>
      ) : (
        <form onSubmit={sendLink} noValidate>
          <Field label="Email address">
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
          <SubmitButton busy={busy}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
