"use client";

import { CTA, Card, Marker, MarketingShell, Reveal } from "@/app/components/marketing/MarketingChrome";

/* One promise, three steps, one ask. Depth lives on /product. */

const STEPS = [
  { n: "01", title: "Upload your file", body: "A spreadsheet export from your source system. That's it." },
  { n: "02", title: "Valigo checks it", body: "Thousands of rows against every rule, in about thirty seconds." },
  { n: "03", title: "Fix what matters", body: "Each problem comes with a plain explanation and a suggested fix." },
];

const PLATFORMS = ["Oracle Cloud", "SAP SuccessFactors", "PeopleSoft", "UKG", "Dayforce"];

export default function GeneralHome() {
  return (
    <MarketingShell>
      {/* ---------------------------------------------------------- hero */}
      <section className="mx-auto max-w-[1180px] px-6 pb-24 pt-24 md:pt-32">
        <div className="grid gap-14 md:grid-cols-[1.25fr_0.75fr] md:items-end">
          <Reveal>
            {/* Serif display, tight. The roman/italic mix is the identity. */}
            {/* Let it wrap on measure rather than a hard break - a forced
                <br /> stranded "data" on a line of its own. */}
            <h1 className="font-display text-[clamp(2.9rem,6.4vw,5.4rem)] leading-[0.94] tracking-[-0.02em]">
              Validate enterprise data with <em className="italic text-[#2F4BA8]">confidence</em>
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="max-w-[34ch] text-[17px] leading-[1.65] text-[#5A5147]">
              Valigo finds the problems in your migration data before go-live — and tells you how to fix each one.
            </p>
            <div className="flex flex-wrap items-center gap-7 pt-9">
              <CTA href="/contact">Request a demo</CTA>
              <CTA href="/product" variant="quiet">See how it works</CTA>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- steps */}
      <section className="mx-auto max-w-[1180px] px-6 py-20">
        <Reveal>
          <Marker n="01">How it works</Marker>
        </Reveal>
        {/* Rules, not cards — each step is a column on the page. */}
        <div className="grid md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="flex h-full flex-col border-t border-[#E3DCD1] py-9 md:border-t-0 md:pr-10 md:pt-12">
                <span className="font-mono text-[11px] tracking-[0.16em] text-[#A89B8A]">{s.n}</span>
                <h3 className="font-display pt-5 text-[26px] leading-[1.15] tracking-[-0.01em]">{s.title}</h3>
                <p className="max-w-[34ch] pt-3 text-[15px] leading-[1.65] text-[#6B6157]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- outcome */}
      <section className="mx-auto max-w-[1180px] px-6 py-20">
        <div className="grid gap-14 md:grid-cols-[1.25fr_0.75fr] md:items-end">
          <Reveal>
            <h2 className="font-display max-w-[15ch] text-[clamp(2.4rem,5.5vw,4.2rem)] leading-[1.02] tracking-[-0.02em]">
              Teams spend days on this. <span className="text-[#A89B8A]">Valigo takes minutes.</span>
            </h2>
            <p className="max-w-[44ch] pt-7 text-[16px] leading-[1.7] text-[#6B6157]">
              No more comparing spreadsheets line by line, or finding out at go-live that a thousand records were never
              going to load.
            </p>
          </Reveal>

          <Reveal delay={140}>
            <Card className="p-7">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A89B8A]">Built for Workday today</p>
              <p className="font-display pt-4 text-[30px] leading-none">Workday</p>
              <div className="mt-6 flex flex-col gap-2 border-t border-[#E3DCD1] pt-5">
                {PLATFORMS.map((p) => (
                  <span key={p} className="text-[15px] text-[#A89B8A]">
                    {p}
                  </span>
                ))}
              </div>
              <p className="pt-5 text-[13px] text-[#8C8177]">More platforms coming.</p>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- CTA */}
      <section className="mx-auto max-w-[1180px] px-6 pb-28 pt-16">
        <Reveal>
          <div className="border-t border-[#1B1815] pt-14">
            <h2 className="font-display max-w-[13ch] text-[clamp(2.4rem,6vw,4.6rem)] leading-[1] tracking-[-0.02em]">
              See it run on your own file.
            </h2>
            <div className="flex flex-wrap items-end justify-between gap-10 pt-9">
              <p className="max-w-[42ch] text-[16px] leading-[1.7] text-[#6B6157]">
                Bring a real export. We&rsquo;ll show you what Valigo finds in it — thirty minutes, no setup.
              </p>
              <CTA href="/contact">Request a demo</CTA>
            </div>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
