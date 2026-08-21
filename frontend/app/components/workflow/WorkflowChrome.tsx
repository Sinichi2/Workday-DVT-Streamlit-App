import { ChevronRight, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/app/components/button/Button";

export function WorkflowHeader({
  crumb,
  title,
  subtitle,
}: {
  crumb: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header>
      {/* <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground-2">Workflow</span>
        <ChevronRight size={12} className="text-muted-foreground-2" aria-hidden />
        <span className="text-accent-strong">{crumb}</span>
      </nav> */}
      <h1 className="pt-3 text-[22px] font-semibold leading-[33px]">{title}</h1>
      {subtitle && <p className="pt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function FilterChip({
  tone,
  label,
  count,
  pressed,
  onClick,
}: {
  tone: string;
  label: string;
  count?: number;
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-[filter,box-shadow] hover:brightness-95 ${tone} ${
        pressed ? "ring-2 ring-accent-strong ring-offset-1 ring-offset-background" : ""
      }`}
    >
      {label}
      {count !== undefined && <span className="font-bold">{count}</span>}
    </button>
  );
}

/** The teal "AI Summary" / "AI Recommendation" card. Both screens use the same
 *  shell: a label, a body, and the same two actions. */
export function AiCard({
  label,
  body,
  autoFixCount,
  manualCount,
  onAutoFix,
  onManualFix,
}: {
  label: string;
  body: string;
  autoFixCount: number;
  manualCount: number;
  onAutoFix?: () => void;
  onManualFix?: () => void;
}) {
  return (
    <section className="rounded-xl border border-info-border bg-info-subtle p-4">
      <div className="flex gap-3">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-info-text" aria-hidden />
        <p className="text-xs leading-[19.5px] text-muted-foreground">
          <span className="font-semibold text-info-text">{label}: </span>
          {body}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-7">
        <Button variant="ai" onClick={onAutoFix}>
          Apply {autoFixCount} auto-fixes
        </Button>
        <button
          onClick={onManualFix}
          className="inline-flex items-center gap-1.5 rounded-lg border border-info-border px-3 py-1.5 text-xs font-medium text-info-text hover:bg-info-border/30"
        >
          Fix {manualCount} manually
        </button>
      </div>
    </section>
  );
}

/** The primary "Continue to …" action that closes every step. Disabled until
 *  the step's precondition is met, with the reason exposed as a title so it is
 *  not a dead end. */
export function ContinueButton({
  label,
  disabled,
  disabledReason,
  onClick,
  icon: Icon = ChevronRight,
}: {
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick?: () => void;
  icon?: LucideIcon;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground-2"
    >
      {label}
      <Icon size={14} aria-hidden />
    </button>
  );
}
