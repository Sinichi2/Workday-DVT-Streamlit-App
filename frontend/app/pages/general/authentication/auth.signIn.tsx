"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export type AuthView = "signIn" | "signUp" | "reset";

/* Auth is the seam between the site and the product, so it wears the paper
   surface. Deliberately NOT a small card floating dead-centre on an empty
   background — that is the default auth screen everywhere. This is a split:
   a standing left panel that says what the product does, and a plain form on
   the right with no box around it. */

export const AUTH_INPUT =
  "h-11 w-full border-0 border-b border-[#D9D0C2] bg-transparent px-0 text-[15px] text-[#1B1815] placeholder:text-[#BCB0A0] outline-none transition-colors duration-300 focus:border-[#1B1815]";

/** The left column. A statement, and a specimen of what the product actually
 *  produces — a finding — rather than an abstract illustration. */
function Aside() {
  return (
    <aside className="relative hidden flex-col justify-between border-r border-[#E3DCD1] bg-[#F4EFE7] p-12 md:flex">
      <Link href="/" className="font-display w-max text-[24px] leading-none text-[#1B1815]">
        Valigo
      </Link>

      <div>
        <p className="font-display max-w-[13ch] text-[clamp(2.2rem,3.4vw,3.1rem)] leading-[1.05] tracking-[-0.02em]">
          Upload your data. <span className="text-[#A89B8A]">Trust the results.</span>
        </p>
        <p className="max-w-[34ch] pt-6 text-[15px] leading-[1.7] text-[#6B6157]">
          Every problem Valigo finds comes with a plain explanation and a suggested fix.
        </p>
      </div>

      {/* Specimen. Mono and hairlines, the way it looks inside the product. */}
      <div className="border-t border-[#E0D8CB] pt-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#A89B8A]">A finding, as Valigo writes it</p>
        <dl className="pt-4 font-mono text-[12px] leading-[2] text-[#5A5147]">
          <div className="flex gap-4">
            <dt className="w-[68px] shrink-0 text-[#A89B8A]">Row</dt>
            <dd>14</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-[68px] shrink-0 text-[#A89B8A]">Field</dt>
            <dd>Manager_ID</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-[68px] shrink-0 text-[#A89B8A]">Problem</dt>
            <dd className="text-[#8A3A32]">Manager is required</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-[68px] shrink-0 text-[#A89B8A]">Fix</dt>
            <dd className="text-[#2F6B45]">Set to 10001</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

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
    <div className="grid min-h-[100dvh] bg-[#FBF8F3] text-[#1B1815] antialiased md:grid-cols-[0.85fr_1.15fr]">
      <Aside />

      <div className="flex items-center justify-center px-6 py-14 sm:px-12">
        <div className="w-full max-w-[380px]">
          {/* The wordmark only appears here when the aside is hidden. */}
          <Link href="/" className="font-display block w-max pb-10 text-[22px] leading-none md:hidden">
            Valigo
          </Link>

          <h1 className="font-display text-[34px] leading-[1.08] tracking-[-0.015em]">{title}</h1>
          <p className="pt-3 text-[15px] leading-relaxed text-[#6B6157]">{subtitle}</p>

          {children}

          {footer && <p className="pt-8 text-[14px] text-[#6B6157]">{footer}</p>}
        </div>
      </div>
    </div>
  );
}

/** Underlined field. No boxes — the rule under the input is the whole control,
 *  which is what keeps the form from reading as a widget grid. */
export function Field({ label, children }: { label: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="pt-7">
      <label htmlFor={id} className="block pb-1.5 text-[12px] text-[#8C8177]">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

/** Password field with a reveal toggle.
 *
 *  The toggle is a real <button type="button"> — inside a form, a bare <button>
 *  defaults to type="submit", so this would otherwise submit the form on click.
 *  Hairline icons drawn inline to match the rest of the surface. */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  required,
  tabIndex,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  tabIndex?: number;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        tabIndex={tabIndex}
        className={`${AUTH_INPUT} pr-9 ${invalid ? "border-[#8A3A32]" : ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        tabIndex={tabIndex}
        className="absolute right-0 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-[#A89B8A] transition-colors duration-300 hover:text-[#1B1815]"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          {show ? (
            <>
              <path
                d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.4 4M6.2 7.9A16.8 16.8 0 0 0 2.5 12S6 18.5 12 18.5c1.2 0 2.3-.2 3.3-.6"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path
                d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.2" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-6 border-l-2 border-[#8A3A32] pl-3 text-[13px] leading-relaxed text-[#8A3A32]">
      {message}
    </p>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group mt-9 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[#1B1815] py-3.5 text-[15px] text-[#FBF8F3] transition-colors duration-500 hover:bg-[#2F4BA8] active:scale-[0.985] disabled:opacity-60"
      style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
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
      subtitle="Continue to your workspace."
      footer={
        <>
          No account?{" "}
          <button
            onClick={() => onNavigate("signUp")}
            className="text-[#2F4BA8] underline underline-offset-4 transition-colors hover:text-[#1B1815]"
          >
            Create one
          </button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
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

        <Field label="Password">
          {(id) => (
            <PasswordInput
              id={id}
              required
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />
          )}
        </Field>

        <FormError message={error} />
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>

      <button
        onClick={() => onNavigate("reset")}
        className="mt-5 text-[13px] text-[#8C8177] transition-colors hover:text-[#1B1815]"
      >
        Forgot your password?
      </button>
    </AuthShell>
  );
}
