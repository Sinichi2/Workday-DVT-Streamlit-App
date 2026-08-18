"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  FileBarChart2,
  GitCompare,
  HelpCircle,
  LayoutGrid,
  PanelLeft,
  SearchCheck,
  Settings,
  User,
  Workflow,
  type LucideIcon,
} from "lucide-react";

// App navigation is fixed structure, not data — kept inline on purpose.
const WORKFLOW_STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "Profile", icon: User },
  { label: "Transform", icon: ArrowLeftRight },
  { label: "Validate", icon: SearchCheck },
  { label: "Compare", icon: GitCompare },
];

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  active?: string;
};

/** One brand mark everywhere: the Valigo check tile. */
function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-md bg-accent text-accent-foreground"
      style={{ width: size, height: size }}
    >
      <Check size={size * 0.58} strokeWidth={3} />
    </span>
  );
}

export function Sidebar({ collapsed, onToggle, active = "Dashboard" }: Props) {
  const [workflowOpen, setWorkflowOpen] = useState(true);

  if (collapsed) {
    return (
      <aside aria-label="Primary" className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface-muted py-4">
        <button onClick={onToggle} aria-label="Expand sidebar" title="Expand sidebar" className="mb-2 rounded-md">
          <BrandMark size={36} />
        </button>
        <RailButton icon={LayoutGrid} label="Dashboard" active={active === "Dashboard"} />
        <RailButton icon={Workflow} label="Workflow" />
        <RailButton icon={FileBarChart2} label="Reports" active={active === "Reports"} />
        <div className="flex-1" />
        <RailButton icon={Settings} label="Settings" />
        <RailButton icon={HelpCircle} label="Help Center" />
      </aside>
    );
  }

  return (
    <aside aria-label="Primary" className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-muted px-3 py-4">
      {/* Brand + collapse */}
      <div className="flex items-center gap-2 px-1">
        <BrandMark size={28} />
        <span className="flex-1 text-base font-bold">Valigo</span>
        <button
          onClick={onToggle}
          aria-label="Collapse sidebar"
          className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-surface"
        >
          <PanelLeft size={15} aria-hidden />
        </button>
      </div>

      {/* Workspace switcher */}
      <button className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-muted">
        <span className="size-2 rounded-full bg-success" aria-hidden />
        <span className="flex-1 text-left font-medium">Workday HCM Q3</span>
        <ChevronDown size={15} className="text-muted-foreground" aria-hidden />
      </button>

      {/* Nav */}
      <nav className="mt-4 flex flex-col gap-0.5">
        <NavItem icon={LayoutGrid} label="Dashboard" active={active === "Dashboard"} />

        <button
          onClick={() => setWorkflowOpen((o) => !o)}
          aria-expanded={workflowOpen}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground hover:bg-surface"
        >
          <Workflow size={17} className="text-muted-foreground" aria-hidden />
          <span className="flex-1 text-left">Workflow</span>
          <ChevronDown
            size={15}
            className={`text-muted-foreground transition-transform ${workflowOpen ? "" : "-rotate-90"}`}
            aria-hidden
          />
        </button>

        {workflowOpen && (
          <div className="ml-4 border-l border-border pl-3">
            {WORKFLOW_STEPS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                <Icon size={15} aria-hidden />
                <span>{label}</span>
              </button>
            ))}
            <div className="px-2.5 pt-1 text-right text-xs text-muted-foreground">0/4</div>
          </div>
        )}

        <NavItem icon={FileBarChart2} label="Reports" active={active === "Reports"} />
      </nav>

      <div className="flex-1" />

      {/* Footer */}
      <div className="flex flex-col gap-0.5">
        <NavItem icon={Settings} label="Settings" />
        <NavItem icon={HelpCircle} label="Help Center" />
      </div>
    </aside>
  );
}

function NavItem({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium ${
        active ? "bg-accent-subtle text-accent-strong" : "text-foreground hover:bg-surface"
      }`}
    >
      <Icon size={17} className={active ? "text-accent-strong" : "text-muted-foreground"} aria-hidden />
      <span>{label}</span>
      {active && <span className="absolute right-1 h-4 w-0.5 rounded-full bg-accent" aria-hidden />}
    </button>
  );
}

function RailButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`flex size-9 items-center justify-center rounded-lg ${
        active ? "bg-accent-subtle text-accent-strong" : "text-muted-foreground hover:bg-surface"
      }`}
    >
      <Icon size={18} aria-hidden />
    </button>
  );
}
