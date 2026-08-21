"use client";

import { Card, CTA, Marker, MarketingShell, Reveal } from "@/app/components/marketing/MarketingChrome";

const PILLARS = [
  {
    tag: "01 — Checks",
    title: "Every rule, on every row",
    body: "Missing values, wrong formats, broken links between files, duplicates, dates that don't line up. The things a person catches on row 40 and misses on row 4,000.",
    points: ["28 checks built in for Workday", "Or bring your own rule sheet", "Blocking problems kept separate from warnings"],
  },
  {
    tag: "02 — Explanations",
    title: "Why it broke, not just that it broke",
    body: "Every problem is written in plain language, with what caused it and what happens if the data ships as it is.",
    points: ["A reason for each problem", "Ranked by what actually blocks go-live", "Repeat problems grouped together"],
  },
  {
    tag: "03 — Matching",
    title: "Employee Number is Worker ID is Person Number",
    body: "Your column names rarely match the ones the target system expects. Valigo works out which is which, so you only have to confirm it.",
    points: ["Columns matched automatically", "Codes translated to the target's values", "Anything unclear is flagged, never guessed"],
  },
  {
    tag: "04 — Overview",
    title: "Know the file before you trust it",
    body: "Every upload gets summarised the moment it lands: how many rows, what is blank, what is duplicated, and anything that looks out of place.",
    points: ["Blanks and duplicates counted", "What kind of data each column holds", "Odd patterns surfaced for you"],
  },
];

export default function GeneralProduct() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-[1180px] px-6 pb-24 pt-40 md:pt-52">
        <Reveal>
          <Marker n="01">Product</Marker>
          <h1 className="font-display max-w-[16ch] pt-6 text-[clamp(2.4rem,6vw,4.4rem)] leading-[1] tracking-[-0.02em]">
            Everything between your export and go-live.
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="max-w-[58ch] pt-8 text-[17px] leading-relaxed text-[#5A5147]">
            Every screen answers the same three questions: what happened, what matters, and what to do next.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <div className="flex flex-wrap gap-3 pt-10">
            <CTA href="/contact">Request demo</CTA>
            <CTA href="/pricing" variant="quiet">See pricing</CTA>
          </div>
        </Reveal>
      </section>

      {/* Alternating editorial split — the side flips each pillar so the eye
          never settles into a column. */}
      <section className="mx-auto max-w-[1180px] px-6">
        {PILLARS.map((p, i) => (
          <Reveal key={p.tag} className="py-16">
            <div className={`grid items-center gap-12 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#A89B8A]">{p.tag}</span>
                <h2 className="font-display max-w-[18ch] pt-6 text-[clamp(1.7rem,3.6vw,2.6rem)] leading-[1.08] tracking-[-0.02em]">
                  {p.title}
                </h2>
                <p className="max-w-[52ch] pt-6 text-[15px] leading-relaxed text-[#6B6157]">{p.body}</p>
              </div>
              <Card>
                <div className="flex flex-col gap-4 p-8">
                  {p.points.map((pt) => (
                    <div key={pt} className="flex items-start gap-3 border-b border-[#E3DCD1] pb-4 last:border-0 last:pb-0">
                      <span className="mt-[3px] flex size-4 shrink-0 items-center justify-center rounded-full border border-[#2F4BA8]/35 text-[#2F4BA8]">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="text-sm leading-relaxed text-[#5A5147]">{pt}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pb-32 pt-16">
        <Reveal>
          <Card>
            <div className="flex flex-col items-center px-8 py-20 text-center">
              <h2 className="font-display max-w-[20ch] text-[clamp(1.8rem,4.5vw,3rem)] leading-[1.05] tracking-[-0.02em]">
                Bring a CSV. We&rsquo;ll do the rest.
              </h2>
              <div className="pt-9">
                <CTA href="/contact">Request demo</CTA>
              </div>
            </div>
          </Card>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
