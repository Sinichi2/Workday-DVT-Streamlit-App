export const SETTINGS_TABS = ["Profile", "Workspace", "Notifications", "Billing"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

// Profile
export type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  timezone: string;
  dateFormat: string;
};

/** TODO(auth): load from the signed-in session. Placeholder for local dev only —
 *  it must never render for a real account. Mirrors Topbar's DEFAULT_USER. */
export const DUMMY_PROFILE: ProfileForm = {
  firstName: "Shiva",
  lastName: "Cruz",
  email: "shiva.cruz@company.com",
  jobTitle: "HR Systems Lead",
  timezone: "America/New_York (EST)",
  dateFormat: "MM/DD/YYYY",
};

export const TIMEZONES = [
  "America/New_York (EST)",
  "America/Chicago (CST)",
  "America/Denver (MST)",
  "America/Los_Angeles (PST)",
  "Europe/London (GMT)",
  "Asia/Manila (PHT)",
];

/** Workday accepts MM/DD/YYYY; the others are for reading the source extract. */
export const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];
// Workspace
export type WorkspaceForm = {
  name: string;
  goLiveDate: string;
  /** Minimum quality score (%) for a run to count as passing. */
  minimumScore: number;
  /** How many critical errors a passing run may still carry. Default 0 —
   *  criticals are Workday hard stops, so anything above 0 is a deliberate
   *  decision to ship a load that will fail rows. */
  criticalTolerance: number;
};

export const DUMMY_WORKSPACE: WorkspaceForm = {
  name: "Workday HCM Q3 Implementation",
  goLiveDate: "",
  minimumScore: 95,
  criticalTolerance: 0,
};

export type TeamMember = {
  initials: string;
  name: string;
  email: string;
  role: "Owner" | "Editor" | "Viewer";
  /** Avatar fill, as a token class — never a raw hex. */
  avatar: string;
};

export const DUMMY_TEAM: TeamMember[] = [
  { initials: "SC", name: "Shiva Cruz", email: "shiva.cruz@company.com", role: "Owner", avatar: "bg-accent" },
  { initials: "JR", name: "Jordan Reyes", email: "j.reyes@company.com", role: "Editor", avatar: "bg-success" },
  { initials: "MT", name: "Morgan Tran", email: "m.tran@company.com", role: "Viewer", avatar: "bg-medium" },
];
// Notifications
export type NotificationPref = { id: string; label: string; description: string; enabled: boolean };

export const DUMMY_NOTIFICATIONS: NotificationPref[] = [
  {
    id: "critical-errors",
    label: "Critical errors detected",
    description: "Get notified when a validation run finds critical-severity issues.",
    enabled: true,
  },
  {
    id: "run-complete",
    label: "Validation run complete",
    description: "Receive a summary email when any validation finishes.",
    enabled: true,
  },
  {
    id: "threshold-exceeded",
    label: "Error threshold exceeded",
    description: "Alert when the quality score drops below your configured minimum.",
    enabled: true,
  },
  {
    id: "weekly-digest",
    label: "Weekly project digest",
    description: "A summary of all runs, scores, and trends over the past 7 days.",
    enabled: false,
  },
  {
    id: "team-activity",
    label: "Team member activity",
    description: "Notify when a teammate uploads a file, edits mappings, or runs validation.",
    enabled: false,
  },
];
// Billing
export type Invoice = { period: string; number: string; amount: string; status: "Paid" | "Due" };

export type Billing = {
  plan: string;
  nextBillingDate: string;
  card: { brand: string; last4: string; expires: string };
  invoices: Invoice[];
};

export const DUMMY_BILLING: Billing = {
  plan: "Pro plan",
  nextBillingDate: "Sep 1, 2026",
  card: { brand: "VISA", last4: "4242", expires: "08/2028" },
  invoices: [
    { period: "August 2026", number: "INV-2026-08", amount: "$299.00", status: "Paid" },
    { period: "July 2026", number: "INV-2026-07", amount: "$299.00", status: "Paid" },
    { period: "June 2026", number: "INV-2026-06", amount: "$299.00", status: "Paid" },
    { period: "May 2026", number: "INV-2026-05", amount: "$299.00", status: "Paid" },
    { period: "April 2026", number: "INV-2026-04", amount: "$199.00", status: "Paid" },
  ],
};
