"use client";

import { CTA, MarketingShell, Reveal } from "@/app/components/marketing/MarketingChrome";

/* Laid out as a technical document, not a feature grid: a contents list, then
   sections with hanging labels in the margin, specs as definition lists, and
   one real specimen of the output. Alternating text/checklist-card rows are the
   stock SaaS feature section and read as generic. */

type Section = {
  id: string;
  n: string;
  label: string;
  title: string;
  lede: string;
  specs: [string, string][];
};

const SECTIONS: Section[] = [
  {
    id: "checks",
    n: "01",
    label: "Checks",
    title: "Every rule, on every row",
    lede: "Missing values, wrong formats, broken links between files, duplicates, dates that don't line up. The things a person catches on row 40 and misses on row 4,000.",
    specs: [
      ["Built in", "28 checks for Workday, covering the fields a load actually rejects on."],
      ["Your own", "Upload a rule sheet and Valigo uses it instead."],
      ["Severity", "Blocking problems stay separate from warnings, because only one of them stops a go-live."],
      ["Speed", "About thirty seconds for a few thousand rows."],
    ],
  },
  {
    id: "explanations",
    n: "02",
    label: "Explanations",
    title: "Why it broke, not just that it broke",
    lede: "A list of error codes moves the work rather than doing it. Every problem is written out in full, with what caused it and what happens if the data ships as it is.",
    specs: [
      ["Cause", "What in the data produced the problem, named in the row it came from."],
      ["Priority", "Ranked by what blocks the load, not by how many there are."],
      ["Grouping", "The same problem across a thousand rows is one item, not a thousand."],
    ],
  },
  {
    id: "matching",
    n: "03",
    label: "Matching",
    title: "Employee Number is Worker ID is Person Number",
    lede: "Your column names rarely match the ones the target system expects. Valigo works out which is which, so the job shrinks to confirming it.",
    specs: [
      ["Columns", "Matched automatically, with how confident the match is."],
      ["Codes", "Translated to the values the target system expects."],
      ["Unclear", "Flagged for you. Never guessed, never filled in silently."],
    ],
  },
  {
    id: "overview",
    n: "04",
    label: "Overview",
    title: "Know the file before you trust it",
    lede: "Every upload is summarised the moment it lands, so you find out what you are working with before you spend a day on it.",
    specs: [
      ["Shape", "Rows, columns, and what kind of data each column holds."],
      ["Gaps", "Blanks and duplicates counted per column."],
      ["Anomalies", "Anything that looks out of place, surfaced without being asked."],
    ],
  },
];

/** A real finding, in the product's own voice. Concrete beats an abstract
 *  feature bullet, and it is the same shape the app renders. */
const SPECIMEN = [
  ["14", "Manager_ID", "Critical", "(empty)", "Manager is required", "10001"],
  ["27", "Pay_Group", "High", "BW-US", "Not in the reference table", "Bi-Weekly US"],
  ["6", "Postal_Code", "Medium", "94105 ", "Trailing space", "94105"],
  ["11", "Work_Email", "Low", "J.SMITH@co.com", "Should be lowercase", "j.smith@co.com"],
];

const TONE: Record<string, string> = {
  Critical: "text-[#8A3A32]",
  High: "text-[#9A5B22]",
  Medium: "text-[#7A6420]",
  Low: "text-[#6B6157]",
};

export default function GeneralProduct() {
  return (
    <MarketingShell>
      {/* --------------------------------------------------------- masthead */}
      <section className="mx-auto max-w-[1180px] px-6 pt-24 md:pt-28">
        <Reveal>
          <div className="border-t border-[#1B1815] pt-6">
            <div className="flex items-baseline justify-between gap-6">
              <span className="font-mono text-[11px] tracking-[0.16em] text-[#A89B8A]">PRODUCT</span>
              <span className="font-mono text-[11px] tracking-[0.16em] text-[#A89B8A]">FOUR PARTS</span>
            </div>
            <h1 className="font-display max-w-[17ch] pt-8 text-[clamp(2.6rem,5.6vw,4.6rem)] leading-[0.98] tracking-[-0.02em]">
              Everything between your export and go&#8209;live.
            </h1>
            <p className="max-w-[52ch] pt-8 text-[17px] leading-[1.7] text-[#5A5147]">
              Every screen answers the same three questions: what happened, what matters, and what to do next.
            </p>
          </div>
        </Reveal>

        {/* Contents. A manual opens with one; a landing page rarely does, which
            is exactly why it reads as a document instead of a pitch. */}
        <Reveal delay={120}>
          <nav aria-label="Contents" className="pt-16">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="group flex items-baseline gap-6 border-t border-[#E3DCD1] py-4 transition-colors duration-300 hover:bg-[#F4EFE7]"
              >
                <span className="font-mono text-[11px] tracking-[0.16em] text-[#A89B8A]">{s.n}</span>
                <span className="font-display text-[20px] leading-none">{s.label}</span>
                <span className="hidden flex-1 truncate text-[14px] text-[#8C8177] sm:block">{s.title}</span>
                <span className="text-[#A89B8A] transition-transform duration-500 group-hover:translate-x-1">&rarr;</span>
              </a>
            ))}
            <div className="border-t border-[#E3DCD1]" />
          </nav>
        </Reveal>
      </section>

      {/* --------------------------------------------------------- sections */}
      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} className="mx-auto max-w-[1180px] scroll-mt-24 px-6 py-20">
          <Reveal>
            {/* Hanging label in the margin, body in the wide column. */}
            <div className="grid gap-8 md:grid-cols-[140px_1fr]">
              <div className="md:sticky md:top-24 md:self-start">
                <p className="font-mono text-[11px] tracking-[0.16em] text-[#A89B8A]">{s.n}</p>
                <p className="pt-1.5 text-[12px] uppercase tracking-[0.18em] text-[#6B6157]">{s.label}</p>
              </div>

              <div className="border-t border-[#1B1815] pt-8">
                <h2 className="font-display max-w-[20ch] text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08] tracking-[-0.02em]">
                  {s.title}
                </h2>
                <p className="max-w-[58ch] pt-6 text-[17px] leading-[1.75] text-[#5A5147]">{s.lede}</p>

                {/* Definition list on rules — the shape a spec sheet uses. */}
                <dl className="pt-10">
                  {s.specs.map(([term, def]) => (
                    <div key={term} className="grid gap-2 border-t border-[#E3DCD1] py-4 sm:grid-cols-[150px_1fr] sm:gap-8">
                      <dt className="text-[13px] uppercase tracking-[0.14em] text-[#8C8177]">{term}</dt>
                      <dd className="max-w-[52ch] text-[15px] leading-[1.7] text-[#3A332C]">{def}</dd>
                    </div>
                  ))}
                  <div className="border-t border-[#E3DCD1]" />
                </dl>
              </div>
            </div>
          </Reveal>

          {/* The specimen sits inside section 02, where the claim is about how
              findings read — so it can be checked against the claim. */}
          {s.id === "explanations" && (
            <Reveal delay={100}>
              <div className="pt-14 md:pl-[172px]">
                <p className="pb-4 text-[11px] uppercase tracking-[0.2em] text-[#A89B8A]">
                  Specimen — four findings, as written
                </p>
                <div className="overflow-x-auto border border-[#E3DCD1] bg-white/60">
                  <table className="w-full min-w-[720px] border-collapse text-left font-mono text-[12px]">
                    <thead>
                      <tr className="border-b border-[#E3DCD1] text-[10px] uppercase tracking-[0.14em] text-[#A89B8A]">
                        <th className="px-4 py-3 font-normal">Row</th>
                        <th className="py-3 pr-4 font-normal">Field</th>
                        <th className="py-3 pr-4 font-normal">Severity</th>
                        <th className="py-3 pr-4 font-normal">Value</th>
                        <th className="py-3 pr-4 font-normal">Problem</th>
                        <th className="px-4 py-3 font-normal">Suggested fix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SPECIMEN.map(([row, field, sev, value, problem, fix]) => (
                        <tr key={row} className="border-b border-[#EFE9DF] last:border-0">
                          <td className="px-4 py-3 text-[#A89B8A]">{row}</td>
                          <td className="py-3 pr-4 text-[#1B1815]">{field}</td>
                          <td className={`py-3 pr-4 ${TONE[sev]}`}>{sev}</td>
                          <td className="py-3 pr-4 text-[#6B6157]">{value.trim() === "" ? "(empty)" : value}</td>
                          <td className="py-3 pr-4 text-[#3A332C]">{problem}</td>
                          <td className="px-4 py-3 text-[#2F6B45]">{fix}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>
          )}
        </section>
      ))}

      {/* -------------------------------------------------------- colophon */}
      <section className="mx-auto max-w-[1180px] px-6 pb-28 pt-10">
        <Reveal>
          <div className="grid gap-8 border-t border-[#1B1815] pt-10 md:grid-cols-[140px_1fr]">
            <p className="font-mono text-[11px] tracking-[0.16em] text-[#A89B8A]">END</p>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <h2 className="font-display max-w-[16ch] text-[clamp(2rem,4.4vw,3.2rem)] leading-[1.04] tracking-[-0.02em]">
                Bring a file. We&rsquo;ll show you what&rsquo;s in it.
              </h2>
              <CTA href="/contact">Request a demo</CTA>
            </div>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
