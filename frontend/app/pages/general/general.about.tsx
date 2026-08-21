"use client";

import { Card, CTA, Marker, MarketingShell, Reveal } from "@/app/components/marketing/MarketingChrome";

const VALUES = [
  ["Accuracy", "A number we can't stand behind is worse than no number. Every figure Valigo shows is measured."],
  ["Trust", "Teams put their reputation on what we tell them. That shapes every default we pick."],
  ["Clarity", "If you need a specialist to understand a result, we have not finished building it."],
  ["Automation", "Work a computer does reliably should not take up someone's afternoon."],
];

const ROADMAP = [
  ["Today", "Workday. Checks, file summaries, column matching, and an explanation for every problem found."],
  ["Next", "Oracle Cloud, SAP SuccessFactors, PeopleSoft, UKG and Dayforce."],
  ["Then", "Any system a company moves data into."],
];

export default function GeneralAbout() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-[1180px] px-6 pb-24 pt-40 md:pt-52">
        <Reveal>
          <Marker n="01">About</Marker>
          <h1 className="font-display max-w-[17ch] pt-6 text-[clamp(2.4rem,6vw,4.4rem)] leading-[1] tracking-[-0.02em]">
            We think migration data should be boring.
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="max-w-[62ch] pt-8 text-[17px] leading-relaxed text-[#5A5147]">
            Valigo exists to give back the hours teams lose to checking spreadsheets by hand. We want to be the tool
            implementation teams trust to tell them their data is ready.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-24">
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal>
            <Card className="h-full">
              <div className="flex h-full flex-col p-9">
                <Marker n="—">Mission</Marker>
                <p className="pt-6 text-[19px] leading-relaxed text-[#3A332C]">
                  Make migration data trustworthy before it reaches a live system — automatically, instead of by
                  hand.
                </p>
              </div>
            </Card>
          </Reveal>
          <Reveal delay={120}>
            <Card className="h-full">
              <div className="flex h-full flex-col p-9">
                <Marker n="—">Vision</Marker>
                <p className="pt-6 text-[19px] leading-relaxed text-[#3A332C]">
                  Be the standard way teams check migration data. Workday today, every other platform after
                  that.
                </p>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-24">
        <Reveal>
          <Marker n="02">What we believe</Marker>
          <h2 className="font-display max-w-[20ch] pt-6 text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.02em]">
            We&rsquo;re not building a chatbot.
          </h2>
          <p className="max-w-[54ch] pt-6 text-[15px] leading-relaxed text-[#6B6157]">
            AI is one part of it. The job is getting your data right, and we only build things that move that
            forward.
          </p>
        </Reveal>

        <div className="grid gap-4 pt-14 md:grid-cols-4">
          {VALUES.map(([title, body], i) => (
            <Reveal key={title} delay={i * 90}>
              <Card className="h-full">
                <div className="flex h-full flex-col p-7">
                  <p className="text-[15px] font-medium text-[#1B1815]">{title}</p>
                  <p className="pt-3 text-sm leading-relaxed text-[#6B6157]">{body}</p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-24">
        <Reveal>
          <Marker n="03">Where we&rsquo;re going</Marker>
        </Reveal>
        <div className="pt-12">
          {ROADMAP.map(([when, body], i) => (
            <Reveal key={when} delay={i * 110}>
              {/* Rail-and-node timeline: the hairline is the through-line, not a border. */}
              <div className="grid gap-6 border-t border-[#E3DCD1] py-9 md:grid-cols-[160px_1fr]">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#A89B8A]">{when}</span>
                <p className="max-w-[60ch] text-[17px] leading-relaxed text-[#5A5147]">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pb-32 pt-10">
        <Reveal>
          <Card>
            <div className="flex flex-col items-center px-8 py-20 text-center">
              <h2 className="font-display max-w-[20ch] text-[clamp(1.8rem,4.5vw,3rem)] leading-[1.05] tracking-[-0.02em]">
                Come see it run against your data.
              </h2>
              <div className="flex flex-wrap justify-center gap-3 pt-9">
                <CTA href="/contact">Request demo</CTA>
                <CTA href="/product" variant="quiet">Explore the product</CTA>
              </div>
            </div>
          </Card>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
