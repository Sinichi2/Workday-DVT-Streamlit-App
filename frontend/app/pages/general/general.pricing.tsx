"use client";

import { Card, CTA, Marker, MarketingShell, Reveal } from "@/app/components/marketing/MarketingChrome";

const PLANS = [
  {
    name: "Starter",
    price: "$99",
    cadence: "/ month",
    blurb: "For one consultant checking a file.",
    features: ["1 workspace", "Up to 25k records per run", "The 28 built-in Workday checks", "File summaries", "Email support"],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Professional",
    price: "$299",
    cadence: "/ month",
    blurb: "For teams running real projects.",
    features: [
      "Unlimited workspaces",
      "Up to 500k records per run",
      "Your own rule sheets",
      "Explanations and column matching",
      "Before and after comparison",
      "4-hour support response",
    ],
    cta: "Request demo",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    blurb: "For partners working across many clients.",
    features: [
      "Everything in Professional",
      "Unlimited records",
      "Single sign-on",
      "Connect straight to your system",
      "Dedicated environment",
      "A named contact on our side",
    ],
    cta: "Talk to us",
    featured: false,
  },
];

const FAQS = [
  ["How is a record counted?", "One row of your file, per run. Re-running the same file to check a fix does not count twice."],
  ["Can I use my own rules?", "Yes, from Professional up. Upload your own rule sheet and Valigo uses it instead of the built-in Workday ones."],
  ["Where does my data live?", "Your files are encrypted and only reachable from your own workspace. Nothing is shared between customers, and the part that runs the checks keeps no copy."],
  ["Do you train AI on our data?", "No. Your files are never used to train anything."],
];

export default function GeneralPricing() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-[1180px] px-6 pb-20 pt-40 md:pt-52">
        <Reveal>
          <Marker n="01">Pricing</Marker>
          <h1 className="font-display max-w-[15ch] pt-6 text-[clamp(2.4rem,6vw,4.4rem)] leading-[1] tracking-[-0.02em]">
            Priced against the hours it gives back.
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="max-w-[54ch] pt-8 text-[17px] leading-relaxed text-[#5A5147]">
            Every plan includes the full list of problems found, not just a summary. No per-seat charge.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 110}>
              {/* The featured plan gets a lit rim rather than a size change, so
                  the row keeps its baseline. */}
              <div
                className={`h-full rounded-[2rem] p-1.5 ${
                  p.featured
                    ? "border border-[#2F4BA8]/35 bg-gradient-to-b from-[#2F4BA8]/8 to-transparent"
                    : "border border-[#E3DCD1] bg-white/60"
                }`}
              >
                <div className="flex h-full flex-col rounded-[calc(2rem-0.375rem)] border border-[#E3DCD1] bg-white/60 p-8 ">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-medium">{p.name}</p>
                    {p.featured && (
                      <span className="rounded-full border border-[#2F4BA8]/35 bg-[#2F4BA8]/8 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#2F4BA8]">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="min-h-[3.5rem] pt-2 text-sm leading-relaxed text-[#6B6157]">{p.blurb}</p>

                  <div className="flex items-baseline gap-1.5 pt-8">
                    <span className="text-[clamp(2.2rem,5vw,3rem)] font-medium leading-none tracking-tight">{p.price}</span>
                    {p.cadence && <span className="text-sm text-[#8C8177]">{p.cadence}</span>}
                  </div>

                  <div className="flex flex-col gap-3 pt-8">
                    {p.features.map((f) => (
                      <div key={f} className="flex items-start gap-3">
                        <span className="mt-[3px] flex size-4 shrink-0 items-center justify-center rounded-full border border-[#2F4BA8]/35 text-[#2F4BA8]">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="text-sm leading-relaxed text-[#5A5147]">{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-10 mt-auto">
                    <CTA href="/contact" variant={p.featured ? "solid" : "quiet"}>
                      {p.cta}
                    </CTA>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[780px] px-6 py-24">
        <Reveal>
          <Marker n="02">Questions</Marker>
        </Reveal>
        <div className="pt-10">
          {FAQS.map(([q, a], i) => (
            <Reveal key={q} delay={i * 80}>
              {/* Native <details> — keyboard operable and correctly announced
                  without a line of state. */}
              <details className="group border-t border-[#E3DCD1]">
                <summary className="flex cursor-pointer list-none items-center gap-6 py-6 text-[16px] text-[#1B1815]/80">
                  <span className="flex-1">{q}</span>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#E3DCD1] transition-transform duration-500 group-open:rotate-45">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="max-w-[62ch] pb-7 text-sm leading-relaxed text-[#6B6157]">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
