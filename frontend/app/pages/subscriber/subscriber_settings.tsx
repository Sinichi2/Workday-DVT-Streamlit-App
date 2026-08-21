"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { Panel } from "@/app/components/ui/Primitives";
import {
  DATE_FORMATS,
  DUMMY_BILLING,
  DUMMY_NOTIFICATIONS,
  DUMMY_PROFILE,
  DUMMY_TEAM,
  DUMMY_WORKSPACE,
  SETTINGS_TABS,
  TIMEZONES,
  type NotificationPref,
  type ProfileForm,
  type SettingsTab,
  type WorkspaceForm,
} from "@/app/data/subscriber/subscriber.settings_data";

// TODO(backend): every panel below reads and writes seeded state. Point these at
// the account API; the demo banner comes off once they're real.

export default function SubscriberSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<SettingsTab>("Profile");
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // showModal() is what puts the dialog in the browser's top layer, and that is
  // where the backdrop, Escape-to-close, the focus trap and inert background
  // content all come from — none of it is worth hand-rolling.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Esc closes natively and fires `close` — this is what tells React.
      onClose={onClose}
      // Backdrop clicks land on the dialog itself; everything visible is inside
      // the child, so target identity is the whole test.
      onClick={(e) => e.target === ref.current && onClose()}
      // Full-bleed on a phone (the pattern the report drawer already uses), a
      // centred 768px card from `sm` up. `open:flex` rather than a bare `flex`
      // so the utility cannot beat the UA's `dialog:not([open]){display:none}`.
      className="open:flex max-sm:h-dvh max-h-none w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-background p-0 text-foreground backdrop:bg-[rgb(10_11_15/0.6)] sm:m-auto sm:max-h-[calc(100dvh-3rem)] sm:w-[768px] sm:max-w-[calc(100%-3rem)] sm:rounded-2xl sm:border sm:border-border-strong sm:shadow-2xl"
    >
      <button
        onClick={onClose}
        aria-label="Close settings"
        className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      >
        <X size={16} aria-hidden />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-7 sm:pb-7">
        <h1 id={titleId} className="text-lg font-semibold leading-7">Settings</h1>
        <p className="pt-0.5 text-xs text-muted-foreground-2">
          Manage your account, workspace, and notification preferences.
        </p>

        <div role="tablist" aria-label="Settings sections" className="mt-7 grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1 sm:grid-cols-4">
          {SETTINGS_TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg py-2 text-xs font-medium transition-colors ${
                tab === t ? "bg-accent-subtle text-accent-strong" : "text-muted-foreground hover:bg-surface-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div role="tabpanel" aria-label={tab} className="pt-6">
          {tab === "Profile" && <ProfilePanel />}
          {tab === "Workspace" && <WorkspacePanel />}
          {tab === "Notifications" && <NotificationsPanel />}
          {tab === "Billing" && <BillingPanel />}
        </div>
        </div>
    </dialog>
  );
}

// Shared section chrome

/** A settings card: title + optional description above a divider, body below.
 *  Every panel is built out of these. */
function Section({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  tone?: "default" | "danger";
}) {
  const edge = tone === "danger" ? "border-critical-subtle" : "border-border-strong";
  return (
    <Panel className={`mb-4 last:mb-0 ${edge}`}>
      <div className="px-4 py-5 sm:px-6">
        <h2 className={`text-sm font-semibold ${tone === "danger" ? "text-critical-text" : ""}`}>{title}</h2>
        {description && <p className="pt-0.5 text-xs text-muted-foreground-2">{description}</p>}
      </div>
      {children && <div className={`border-t ${edge}`}>{children}</div>}
    </Panel>
  );
}

/** Label + control. `useId` keeps the label tied to its input without the
 *  caller having to invent unique ids. */
function Field({ label, children }: { label: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block pb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

const INPUT =
  "h-[38px] w-full rounded-lg border border-border-strong bg-background px-3 text-sm placeholder:text-muted-foreground-2";

/** Right-hand unit affix on a number input ("%", "errors"). */
function NumberField({
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  return (
    <Field label={label}>
      {(id) => (
        <div className="flex h-[38px] items-stretch overflow-hidden rounded-lg border border-border-strong">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={value}
            // An empty field parses as NaN — clamp to the floor rather than
            // writing NaN into the threshold a run is judged against.
            onChange={(e) => onChange(Number.isNaN(e.target.valueAsNumber) ? min : e.target.valueAsNumber)}
            className="min-w-0 flex-1 bg-background px-3 text-sm"
          />
          <span className="flex items-center border-l border-border-strong bg-surface-muted px-3 text-sm text-muted-foreground-2">
            {unit}
          </span>
        </div>
      )}
    </Field>
  );
}

/** Footer actions. Save stays disabled until something actually changed, so the
 *  button never claims to have saved a no-op. */
function FormActions({
  saveLabel,
  dirty,
  onSave,
  onDiscard,
}: {
  saveLabel: string;
  dirty: boolean;
  onSave: () => void;
  onDiscard?: () => void;
}) {
  return (
    <div className="flex justify-end gap-3 pt-4">
      {onDiscard && (
        <button
          onClick={onDiscard}
          disabled={!dirty}
          className="rounded-lg border border-border-strong px-4 py-2 text-sm text-muted-foreground hover:bg-surface-muted disabled:opacity-50"
        >
          Discard
        </button>
      )}
      <button
        onClick={onSave}
        disabled={!dirty}
        title={dirty ? undefined : "No changes to save"}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground-2"
      >
        {saveLabel}
      </button>
    </div>
  );
}

// Profile

function ProfilePanel() {
  const [form, setForm] = useState<ProfileForm>(DUMMY_PROFILE);
  const dirty = JSON.stringify(form) !== JSON.stringify(DUMMY_PROFILE);
  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <Section title="Personal Information" description="Your name and contact details.">
        <div className="grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6">
          <Field label="First name">
            {(id) => <input id={id} className={INPUT} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />}
          </Field>
          <Field label="Last name">
            {(id) => <input id={id} className={INPUT} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />}
          </Field>
          <Field label="Email address">
            {(id) => (
              <input id={id} type="email" className={INPUT} value={form.email} onChange={(e) => set("email", e.target.value)} />
            )}
          </Field>
          <Field label="Job title">
            {(id) => <input id={id} className={INPUT} value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />}
          </Field>
        </div>
      </Section>

      <Section title="Preferences">
        <div className="grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6">
          <Field label="Timezone">
            {(id) => (
              <select id={id} className={INPUT} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {TIMEZONES.map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Date format">
            {(id) => (
              <select id={id} className={INPUT} value={form.dateFormat} onChange={(e) => set("dateFormat", e.target.value)}>
                {DATE_FORMATS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </Section>

      <Section title="Password">
        <div className="grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6">
          {/* Password fields stay out of `form` — a new password is submitted on
              its own, never carried around in the profile draft. */}
          <Field label="Current password">
            {(id) => <input id={id} type="password" autoComplete="current-password" placeholder="••••••••" className={INPUT} />}
          </Field>
          <Field label="New password">
            {(id) => (
              <input
                id={id}
                type="password"
                autoComplete="new-password"
                minLength={12}
                placeholder="Min 12 characters"
                className={INPUT}
              />
            )}
          </Field>
        </div>
      </Section>

      <FormActions saveLabel="Save changes" dirty={dirty} onSave={() => {}} onDiscard={() => setForm(DUMMY_PROFILE)} />
    </>
  );
}

// Workspace

function WorkspacePanel() {
  const [form, setForm] = useState<WorkspaceForm>(DUMMY_WORKSPACE);
  const dirty = JSON.stringify(form) !== JSON.stringify(DUMMY_WORKSPACE);
  const set = <K extends keyof WorkspaceForm>(k: K, v: WorkspaceForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <Section title="Workspace Details" description="Settings for your Workday HCM project workspace.">
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
          <Field label="Workspace name">
            {(id) => <input id={id} className={INPUT} value={form.name} onChange={(e) => set("name", e.target.value)} />}
          </Field>
          <Field label="Go-live target date">
            {/* Native date input — no picker library for something the platform
                already ships, keyboard-accessible and localized. */}
            {(id) => (
              <input
                id={id}
                type="date"
                className={INPUT}
                value={form.goLiveDate}
                onChange={(e) => set("goLiveDate", e.target.value)}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Quality Thresholds" description="Define the minimum score required to mark a run as passing.">
        <div className="grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6">
          <NumberField
            label="Minimum quality score"
            unit="%"
            value={form.minimumScore}
            min={0}
            max={100}
            onChange={(n) => set("minimumScore", n)}
          />
          <NumberField
            label="Critical error tolerance"
            unit="errors"
            value={form.criticalTolerance}
            min={0}
            onChange={(n) => set("criticalTolerance", n)}
          />
        </div>
        {form.criticalTolerance > 0 && (
          <p role="alert" className="px-4 pb-5 text-xs text-high-text sm:px-6">
            Critical errors are Workday hard stops. Allowing {form.criticalTolerance} means a run can pass while rows
            still fail to load.
          </p>
        )}
      </Section>

      <Section title="Team Members">
        <div className="px-4 py-2 sm:px-6">
          {DUMMY_TEAM.map((m) => (
            <div key={m.email} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-accent-foreground ${m.avatar}`}
                aria-hidden
              >
                {m.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground-2">{m.email}</p>
              </div>
              <span className="shrink-0 rounded bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">{m.role}</span>
            </div>
          ))}
          <button className="py-3 text-xs font-medium text-accent-strong hover:underline">+ Invite team member</button>
        </div>
      </Section>

      <FormActions saveLabel="Save workspace settings" dirty={dirty} onSave={() => {}} />
    </>
  );
}

// Notifications

function NotificationsPanel() {
  const [prefs, setPrefs] = useState<NotificationPref[]>(DUMMY_NOTIFICATIONS);

  return (
    <>
      <Section title="Email Alerts" description="Choose when Valigo sends you an email notification.">
        <div className="px-4 py-2 sm:px-6">
          {prefs.map((p) => (
            <div key={p.id} className="flex items-start gap-4 border-b border-border py-4 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.label}</p>
                <p className="pt-0.5 text-xs text-muted-foreground-2">{p.description}</p>
              </div>
              <Toggle
                checked={p.enabled}
                label={p.label}
                onChange={(enabled) =>
                  setPrefs((ps) => ps.map((x) => (x.id === p.id ? { ...x, enabled } : x)))
                }
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="In-App Alerts"
        description="Control which events appear in your notification feed inside Valigo."
      >
        <p className="px-4 py-5 text-sm text-muted-foreground sm:px-6">
          All critical and high-severity issues always appear in-app. Other alert types follow your email
          preferences.
        </p>
      </Section>
    </>
  );
}

/** `role="switch"` rather than a styled checkbox: it announces on/off, takes
 *  Space/Enter for free as a button, and needs no hidden input. */
function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-border-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
        aria-hidden
      />
    </button>
  );
}

// Billing

function BillingPanel() {
  const billing = DUMMY_BILLING;

  return (
    <>
      <Panel className="mb-4 flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div>
          <p className="text-2xl font-semibold leading-8">{billing.plan}</p>
          <p className="pt-0.5 text-xs text-muted-foreground-2">Next billing date: {billing.nextBillingDate}</p>
        </div>
        <button className="rounded-lg border border-border-strong px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-muted">
          Change plan
        </button>
      </Panel>

      <Section title="Payment Method" description="Card on file for automatic billing.">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-10 items-center justify-center rounded bg-accent-subtle text-[10px] font-bold text-accent-strong">
              {billing.card.brand}
            </span>
            <div>
              {/* The masked digits are decoration; screen readers get the plain
                  "ending in 4242" instead of sixteen bullet characters. */}
              <p className="text-sm font-medium">
                <span aria-hidden>•••• •••• •••• {billing.card.last4}</span>
                <span className="sr-only">Card ending in {billing.card.last4}</span>
              </p>
              <p className="text-xs text-muted-foreground-2">Expires {billing.card.expires}</p>
            </div>
          </div>
          <button className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-muted">
            Update card
          </button>
        </div>
      </Section>

      <Section title="Invoice History" description="Download past invoices for your records">
        <div>
          {billing.invoices.map((inv) => (
            <div
              key={inv.number}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-border-strong px-4 py-3.5 last:border-0 sm:px-6"
            >
              <div>
                <p className="text-sm">{inv.period}</p>
                <p className="text-xs text-muted-foreground-2">{inv.number}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-semibold ${inv.status === "Paid" ? "text-success-text" : "text-high-text"}`}>
                  {inv.status}
                </span>
                <span className="text-sm font-medium">{inv.amount}</span>
                <button className="inline-flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline">
                  PDF <Download size={12} aria-hidden />
                  <span className="sr-only">Download invoice {inv.number}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Cancel Subscription"
        description="Your workspace and data will remain accessible until the end of the billing period."
        tone="danger"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground">Cancellation takes effect on {billing.nextBillingDate}</p>
          <button className="rounded-lg border border-critical-subtle px-3.5 py-1.5 text-xs font-medium text-critical-text hover:bg-critical-subtle">
            Cancel plan
          </button>
        </div>
      </Section>
    </>
  );
}
