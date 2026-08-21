"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { EASE } from "@/app/components/marketing/MarketingChrome";

export type AuthView = "signIn" | "signUp" | "reset";

/* Auth is the seam between the marketing site and the product, so it wears the
   marketing surface: warm paper, a serif title, hairline rules. */

export const AUTH_INPUT =
  "h-11 w-full rounded-lg border border-[#D9D0C2] bg-[#FDFBF8] px-3.5 text-sm text-[#1B1815] placeholder:text-[#A89B8A] outline-none transition-colors duration-300 focus:border-[#2F4BA8]";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#FBF8F3] px-4 py-16 text-[#1B1815] antialiased">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="font-display mx-auto block w-max pb-8 text-[24px] leading-none">
          Valigo
        </Link>

        <div className="rounded-lg border border-[#E3DCD1] bg-white p-8 sm:p-10">
          <h1 className="font-display text-[30px] leading-[1.1] tracking-[-0.01em]">{title}</h1>
          <p className="pt-2 text-sm text-[#6B6157]">{subtitle}</p>
          {children}
        </div>

        {footer && <p className="pt-6 text-center text-sm text-[#6B6157]">{footer}</p>}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="pt-5">
      <label htmlFor={id} className="block pb-2 text-[11px] uppercase tracking-[0.18em] text-[#8C8177]">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-5 rounded-xl border border-[#C4726B] bg-[#F8ECEA] px-4 py-3 text-xs text-[#8A3A32]">
      {message}
    </p>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      style={{ transitionTimingFunction: EASE }}
      className="group mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[#1B1815] py-3 text-[15px] text-[#FBF8F3] transition-colors duration-500 hover:bg-[#2F4BA8] active:scale-[0.985] disabled:opacity-60"
    >
      {busy ? "Working…" : children}
      <span className="transition-transform duration-500 group-hover:translate-x-1">&rarr;</span>
    </button>
  );
}

export default function AuthSignIn({ onNavigate }: { onNavigate: (v: AuthView) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // On success the session listener swaps the tree out; nothing to do here
    // but surface a failure.
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Continue to your Valigo workspace."
      footer={
        <>
          No account?{" "}
          <button onClick={() => onNavigate("signUp")} className="font-medium text-[#2F4BA8] underline-offset-4 transition-colors hover:underline">
            Create one
          </button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <Field label="Email address">
          {(id) => (
            <input id={id} type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} className={AUTH_INPUT} placeholder="you@company.com" />
          )}
        </Field>
        <Field label="Password">
          {(id) => (
            <input id={id} type="password" required autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} className={AUTH_INPUT} placeholder="••••••••" />
          )}
        </Field>
        <FormError message={error} />
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
      <button
        onClick={() => onNavigate("reset")}
        className="mt-4 w-full text-center text-xs text-[#8C8177] transition-colors hover:text-[#1B1815]"
      >
        Forgot your password?
      </button>
    </AuthShell>
  );
}
