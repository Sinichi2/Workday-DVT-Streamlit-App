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
  Menu,
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

export function Sidebar({ collapsed, onToggle, active = "Dashboard" }: Props) {
  const [workflowOpen, setWorkflowOpen] = useState(true);

  if (collapsed) {
    return (
      <aside className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface-muted py-4">
        <RailButton icon={Menu} label="Expand" onClick={onToggle} />
        <div className="mt-1 mb-2 flex size-9 items-center justify-center rounded-lg border border-border text-sm font-semibold">
          P
        </div>
        <RailButton icon={LayoutGrid} label="Dashboard" active />
        <RailButton icon={Workflow} label="Workflow" />
        <RailButton icon={FileBarChart2} label="Reports" />
        <div className="flex-1" />
        <RailButton icon={Settings} label="Settings" />
        <RailButton icon={HelpCircle} label="Help Center" />
      </aside>
    );
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-muted px-3 py-4">
      {/* Brand + collapse */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Check size={16} strokeWidth={3} />
        </div>
        <span className="flex-1 text-base font-bold">Valigo</span>
        <button
          onClick={onToggle}
          aria-label="Collapse sidebar"
          className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-surface"
        >
          <PanelLeft size={15} />
        </button>
      </div>

      {/* Workspace switcher */}
      <button className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-muted">
        <span className="size-2 rounded-full bg-success" />
        <span className="flex-1 text-left font-medium">Workday HCM Q3</span>
        <ChevronDown size={15} className="text-muted-foreground" />
      </button>

      {/* Nav */}
      <nav className="mt-4 flex flex-col gap-0.5">
        <NavItem icon={LayoutGrid} label="Dashboard" active={active === "Dashboard"} />

        <button
          onClick={() => setWorkflowOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground hover:bg-surface"
        >
          <Workflow size={17} className="text-muted-foreground" />
          <span className="flex-1 text-left">Workflow</span>
          <ChevronDown
            size={15}
            className={`text-muted-foreground transition-transform ${workflowOpen ? "" : "-rotate-90"}`}
          />
        </button>

        {workflowOpen && (
          <div className="ml-4 border-l border-border pl-3">
            {WORKFLOW_STEPS.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                <Icon size={15} />
                <span>{label}</span>
              </div>
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
    <div
      className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium ${
        active ? "bg-accent-subtle text-accent" : "text-foreground hover:bg-surface"
      }`}
    >
      <Icon size={17} className={active ? "text-accent" : "text-muted-foreground"} />
      <span>{label}</span>
      {active && <span className="absolute right-1 h-4 w-0.5 rounded-full bg-accent" />}
    </div>
  );
}

function RailButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-9 items-center justify-center rounded-lg ${
        active ? "bg-accent-subtle text-accent" : "text-muted-foreground hover:bg-surface"
      }`}
    >
      <Icon size={18} />
    </button>
  );
}
