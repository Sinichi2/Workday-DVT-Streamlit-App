/** Help Center content.
 *
 *  TODO(admin): this is the shape the admin CMS will write. Everything here is
 *  editorial — no engine data — so it stays a plain module until the admin
 *  pages land, then the same types come back from the API unchanged. */

export type ArticleCategory = "Guides" | "Workflow" | "Reference" | "Developer";

/** One body block. `strong` is the lead-in the design bolds at the start of a
 *  step ("Step 1 — Upload your source file"), not a separate heading. */
export type ArticleBlock = { strong?: string; text: string };

export type Article = {
  slug: string;
  category: ArticleCategory;
  title: string;
  /** Shown on the Help Center tile and the article header. */
  blurb: string;
  minutes: number;
  body: ArticleBlock[];
};

export type HelpTopic = {
  /** Matches an `Article.slug` so a tile opens the article it promises. */
  slug: string;
  title: string;
  blurb: string;
  /** Icon key — the page maps this to a lucide component, so the data stays
   *  serialisable when it comes from an API. */
  icon: "rocket" | "transform" | "validate" | "score" | "team" | "api";
};

export const HELP_TOPICS: HelpTopic[] = [
  { slug: "getting-started", title: "Getting started", blurb: "Your first validation run", icon: "rocket" },
  { slug: "transform-rules", title: "Transform rules", blurb: "Direct, Lookup, Date Convert", icon: "transform" },
  { slug: "validation-errors", title: "Validation errors", blurb: "Fix critical issues first", icon: "validate" },
  { slug: "quality-score", title: "Quality Score guide", blurb: "How the score is calculated", icon: "score" },
  { slug: "team-permissions", title: "Team & permissions", blurb: "Roles and access levels", icon: "team" },
  { slug: "workday-api", title: "Workday API setup", blurb: "Connect to your tenant", icon: "api" },
];

export const ARTICLES: Article[] = [
  {
    slug: "getting-started",
    category: "Guides",
    title: "Getting started with Valigo",
    blurb: "Your first validation run",
    minutes: 5,
    body: [
      {
        text: "Valigo is a purpose-built validation platform for Workday HR implementations. Here's how to complete your first run in under 10 minutes.",
      },
      {
        strong: "Step 1 — Upload your source file",
        text: "Navigate to Workflow → Profile and upload your CSV extract. Valigo accepts files up to 50 MB in UTF-8 encoding.",
      },
      {
        strong: "Step 2 — Map your fields",
        text: 'In the Transform step, Valigo auto-matches your source columns to Workday target fields. Review any mappings flagged "Review" and confirm them before proceeding.',
      },
      {
        strong: "Step 3 — Run Validation",
        text: "The Validate step runs all 28 built-in Workday rules against your mapped data in under 30 seconds. Results are organised by severity: Critical, High, Medium, and Low.",
      },
      {
        strong: "Step 4 — Review and Fix",
        text: "Use the AI Insights suggestions to bulk-fix auto-correctable issues. Critical errors require manual intervention via the Fix Manually workflow.",
      },
      {
        strong: "Step 5 — Compare and Save",
        text: 'The Compare step shows a field-by-field diff of your source vs the validated output. Once satisfied, click "Complete & Save Run" to save to Reports.',
      },
    ],
  },
  {
    slug: "transform-rules",
    category: "Workflow",
    title: "Understanding transform rules",
    blurb: "Direct, Lookup, Date Convert",
    minutes: 7,
    body: [
      { text: "A transform is applied to every value in a mapped column before validation sees it." },
      { strong: "Direct", text: "Copies the source value through unchanged. The default for any exact match." },
      { strong: "Trim", text: "Removes leading and trailing whitespace — the most common fix for postal codes and names." },
      { strong: "Date Convert", text: "Reformats a date to the target format. Workday expects MM/DD/YYYY." },
      { strong: "Lookup", text: "Translates a source code via the Workday reference table. Unmatched codes are flagged, never guessed." },
      { strong: "Strip Currency", text: "Removes currency symbols and thousands separators so the value parses as a number." },
    ],
  },
  {
    slug: "validation-errors",
    category: "Workflow",
    title: "Interpreting validation errors",
    blurb: "Fix critical issues first",
    minutes: 4,
    body: [
      { text: "Every finding carries a severity that maps to how Workday will treat it at load time." },
      { strong: "Critical", text: "A Workday hard stop. The row will not load. These must be resolved before go-live — there is no tolerance setting that makes them safe." },
      { strong: "High", text: "Loads, but with the wrong value — typically a lookup that missed. Silently wrong data is worse than a rejected row." },
      { strong: "Medium", text: "Formatting drift: date formats, stray whitespace, currency symbols. Usually auto-correctable." },
      { strong: "Low", text: "Cosmetic. Email casing and minor trims. Safe to auto-clean in bulk." },
    ],
  },
  {
    slug: "quality-score",
    category: "Reference",
    title: "Quality Score guide",
    blurb: "How the score is calculated",
    minutes: 3,
    body: [
      { text: "The Data Quality Score is the share of rows that passed every blocking rule — rows passing divided by rows evaluated." },
      { strong: "Warnings do not reduce the score", text: "A row carrying only Soft Warnings still counts as passing, because it will load. It is still listed in findings." },
      { strong: "A high score is not a green light", text: "A single unresolved critical error blocks its row regardless of the headline number. Read the severity breakdown, not just the percentage." },
    ],
  },
  {
    slug: "team-permissions",
    category: "Reference",
    title: "Team & permissions",
    blurb: "Roles and access levels",
    minutes: 3,
    body: [
      { text: "Every workspace member holds exactly one role." },
      { strong: "Owner", text: "Full access, including billing, workspace deletion and member management." },
      { strong: "Editor", text: "Can upload files, edit mappings, run validation and apply fixes. No billing access." },
      { strong: "Viewer", text: "Read-only. Can open reports and export them, but cannot change data or start a run." },
    ],
  },
  {
    slug: "workday-api",
    category: "Developer",
    title: "Workday API setup",
    blurb: "Connect to your tenant",
    minutes: 12,
    body: [
      { text: "Connecting a tenant lets Valigo pull extracts directly instead of relying on manual CSV export." },
      { strong: "1. Create an Integration System User", text: "In Workday, create an ISU with the Integration Security Group scoped to the objects you intend to validate. Do not reuse a human account." },
      { strong: "2. Grant report access", text: "Share the custom report as a web service. Valigo reads it via RaaS and never writes back to your tenant." },
      { strong: "3. Store the credentials", text: "Paste the endpoint and ISU credentials into Settings → Workspace. They are encrypted at rest and never rendered back into the UI." },
    ],
  },
];

export type Faq = { question: string; answer: string };

export const FAQS: Faq[] = [
  {
    question: "What file formats does Valigo accept?",
    answer:
      "CSV and Excel (.xlsx, .xls, .xlsm) up to 50 MB. CSV should be UTF-8 encoded. The Profile step enforces CSV specifically, because that is the format Workday extracts arrive in most reliably.",
  },
  {
    question: "How is the Data Quality Score calculated?",
    answer:
      "Rows passing every blocking rule, divided by rows evaluated. Soft warnings do not reduce it, because a row carrying only warnings will still load into Workday.",
  },
  {
    question: "Can I add custom validation rules?",
    answer:
      "Yes. Upload your own rules workbook on the Validate step to replace the bundled Workday HCM set. Without one, Valigo uses the 28 built-in rules so a single upload still produces a full run.",
  },
  {
    question: "What does the Transform step actually do?",
    answer:
      "It maps your source columns onto Workday target fields and applies a per-column transform (Trim, Lookup, Date Convert, and so on) before any rule runs. Validation always sees transformed values, never raw ones.",
  },
  {
    question: "Who can see validation results?",
    answer:
      "Every member of the workspace. Owners and Editors can start runs and apply fixes; Viewers can read and export results but cannot change them.",
  },
  {
    question: "How do I export a validation report?",
    answer:
      "Open the run from Reports and use Export, or use Export All to download every run in the workspace at once. Exports include the full findings list, not just the summary.",
  },
  {
    question: "What happens if I have 0 critical errors but a low quality score?",
    answer:
      "Your data will load, but a lot of it will load wrong. A low score with no criticals usually means widespread High-severity lookup misses — values that are valid in shape but point at the wrong reference record. Fix those before go-live.",
  },
];

/** Sent automatically with a support request so the user doesn't have to
 *  describe their own environment.
 *  TODO(auth/api): read from the session and the latest run. */
export const SUPPORT_CONTEXT = {
  workspace: "Workday HCM Q3",
  plan: "Professional",
  lastRun: "VAL-2847",
  qualityScore: "97.3%",
  replyTo: "shiva@company.com",
};

export const SUPPORT_PRIORITIES = ["Low", "Normal", "High", "Urgent"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];
