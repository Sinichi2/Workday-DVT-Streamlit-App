"use client";

import { useId, useState } from "react";
import { Card, EASE, Marker, MarketingShell, Reveal } from "@/app/components/marketing/MarketingChrome";
import { api } from "@/app/lib/api";
import { reportError } from "@/app/lib/errors";

const FIELD =
  "h-11 w-full rounded-lg border border-[#D9D0C2] bg-[#FDFBF8] px-3.5 text-sm text-[#1B1815] placeholder:text-[#A89B8A] outline-none transition-colors duration-300 focus:border-[#2F4BA8]";

const INTERESTS = ["Request a demo", "Pricing and plans", "Partnership", "Support", "Something else"];

export default function GeneralContact() {
  const nameId = useId();
  const emailId = useId();
  const companyId = useId();
  const interestId = useId();
  const messageId = useId();

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    interest: INTERESTS[0],
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // The one endpoint with no auth: it backs the public marketing form.
      // Anonymous callers may insert and may not read, so the form cannot
      // double as a scraper for the lead list.
      await api.postPublic("/contact", form);
      setSent(true);
    } catch (err: unknown) {
      // Console only — and crucially `sent` stays false, so the confirmation
      // screen never appears over a message that was not stored.
      reportError("contact.submit", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingShell>
      <section className="mx-auto max-w-[1180px] px-6 pb-24 pt-24 md:pt-28">
        <div className="grid gap-16 md:grid-cols-[0.9fr_1.1fr]">
          {/* Editorial split: the pitch holds the left, the form the right. */}
          <div>
            <Reveal>
              <Marker n="01">Contact</Marker>
              <h1 className="font-display max-w-[14ch] pt-6 text-[clamp(2.4rem,5.5vw,4rem)] leading-[1] tracking-[-0.02em]">
                Let&rsquo;s look at your data.
              </h1>
            </Reveal>
            <Reveal delay={110}>
              <p className="max-w-[46ch] pt-7 text-[16px] leading-relaxed text-[#5A5147]">
                Bring a real extract. We&rsquo;ll run it through Valigo on a call and show you what it finds — no
                integration work, no rebuild.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="flex flex-col gap-6 pt-14">
                {[
                  ["Response time", "Within 4 business hours"],
                  ["Demo length", "30 minutes, using your own file"],
                  ["Who should join", "Data conversion lead, HRIS or functional consultant"],
                ].map(([k, v]) => (
                  <div key={k} className="border-t border-[#E3DCD1] pt-5">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#8C8177]">{k}</p>
                    <p className="pt-2 text-sm text-[#5A5147]">{v}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={140}>
            <Card>
              {sent ? (
                <div className="flex flex-col items-center px-8 py-24 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full border border-[#7FA98C] bg-[#EAF3EC] text-[#2F6B45]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h2 className="font-display pt-7 text-[28px] leading-tight">Message received</h2>
                  <p className="max-w-[38ch] pt-4 text-sm leading-relaxed text-[#6B6157]">
                    We&rsquo;ll be in touch at {form.email} within 4 business hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-8 md:p-10">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={nameId} className="block pb-2 text-[11px] uppercase tracking-[0.18em] text-[#8C8177]">
                        Name
                      </label>
                      <input id={nameId} required value={form.name} onChange={(e) => set("name", e.target.value)} className={FIELD} placeholder="Jordan Reyes" />
                    </div>
                    <div>
                      <label htmlFor={companyId} className="block pb-2 text-[11px] uppercase tracking-[0.18em] text-[#8C8177]">
                        Company
                      </label>
                      <input id={companyId} value={form.company} onChange={(e) => set("company", e.target.value)} className={FIELD} placeholder="Acme Consulting" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={emailId} className="block pb-2 text-[11px] uppercase tracking-[0.18em] text-[#8C8177]">
                      Work email
                    </label>
                    <input id={emailId} type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={FIELD} placeholder="you@company.com" />
                  </div>

                  <div>
                    <label htmlFor={interestId} className="block pb-2 text-[11px] uppercase tracking-[0.18em] text-[#8C8177]">
                      What brings you here
                    </label>
                    <select id={interestId} value={form.interest} onChange={(e) => set("interest", e.target.value)} className={`${FIELD} appearance-none`}>
                      {INTERESTS.map((i) => (
                        <option key={i} value={i} className="bg-white">
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={messageId} className="block pb-2 text-[11px] uppercase tracking-[0.18em] text-[#8C8177]">
                      Message
                    </label>
                    <textarea
                      id={messageId}
                      rows={5}
                      value={form.message}
                      onChange={(e) => set("message", e.target.value)}
                      placeholder="Which platform are you implementing, and roughly how many records?"
                      className="w-full rounded-lg border border-[#D9D0C2] bg-[#FDFBF8] px-3.5 py-3 text-sm text-[#1B1815] placeholder:text-[#A89B8A] outline-none transition-colors duration-300 focus:border-[#2F4BA8]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    style={{ transitionTimingFunction: EASE }}
                    className="group mt-2 inline-flex items-center justify-center gap-2.5 self-start rounded-full bg-[#1B1815] px-6 py-3 text-[15px] text-[#FBF8F3] transition-colors duration-500 hover:bg-[#2F4BA8] active:scale-[0.985] disabled:opacity-60"
                  >
                    {busy ? "Sending…" : "Send message"}
                    <span className="transition-transform duration-500 group-hover:translate-x-1">&rarr;</span>
                  </button>
                </form>
              )}
            </Card>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}
