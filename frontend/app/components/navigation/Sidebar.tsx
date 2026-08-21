"use client";

import { useState, type ComponentType } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  LifeBuoy,
  LogOut,
  Menu,
  PanelLeft,
  Settings,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { useSession } from "@/app/lib/session";
import { fullName, initials } from "@/app/lib/supabase";
import {
  CompareIcon,
  DashboardIcon,
  HelpIcon,
  ProfileIcon,
  ReportsIcon,
  TransformIcon,
  ValidateIcon,
  WorkflowIcon,
} from "@/app/assets/icons/subscriber";

/** Anything that renders at a given pixel size and inherits color — both the
 *  lucide icons and our own subscriber set qualify. */
type IconType = ComponentType<{ size?: number; className?: string }>;

// App navigation is fixed structure, not data — kept inline on purpose.
const WORKFLOW_STEPS: { label: string; icon: IconType }[] = [
  { label: "Profile", icon: ProfileIcon },
  { label: "Transform", icon: TransformIcon },
  { label: "Validate", icon: ValidateIcon },
  { label: "Compare", icon: CompareIcon },
];

const WORKSPACE = "Workday HCM Q3";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  /** Swaps the whole nav for the platform-admin one. Same shell, same login. */
  admin?: boolean;
  active?: string;
  onNavigate?: (label: string) => void;
  /** Workflow steps finished so far — drives the check badges, the n/4 counter
   *  and the progress rule. */
  completed?: readonly string[];
  /** Drawer state below `lg`, where the sidebar sits off-canvas over the page.
   *  At `lg` and up the sidebar is always a static column and this is ignored. */
  open?: boolean;
  onClose?: () => void;
};

/** Off-canvas below `lg`, static column from `lg` up. One element either way —
 *  the breakpoint is expressed in CSS, so there's no viewport measuring in JS
 *  and no second copy of the nav in the DOM. */
function shellClass(open: boolean) {
  return `fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-muted transition-transform duration-200 lg:static lg:translate-x-0 ${
    // `invisible` (not just translated off-screen) so a closed drawer is out of
    // the tab order — otherwise keyboard focus walks into nav you cannot see.
    open ? "translate-x-0" : "invisible -translate-x-full lg:visible"
  }`;
}

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

const ADMIN_NAV: { label: string; icon: IconType }[] = [
  { label: "Admin", icon: ShieldCheck },
  { label: "Users", icon: Users },
  { label: "All Reports", icon: ReportsIcon },
  { label: "Support", icon: LifeBuoy },
];

export function Sidebar({ collapsed, onToggle, admin = false, active = "Dashboard", onNavigate, completed = [], open = false, onClose }: Props) {
  const { workspace } = useSession();
  const workspaceName = workspace?.name ?? WORKSPACE;
  const [workflowOpen, setWorkflowOpen] = useState(true);
  const doneCount = WORKFLOW_STEPS.filter((s) => completed.includes(s.label)).length;
  const progress = `${doneCount}/${WORKFLOW_STEPS.length}`;
  const inWorkflow = WORKFLOW_STEPS.some((s) => s.label === active);

  if (collapsed) {
    return (
      <>
        <Backdrop open={open} onClose={onClose} />
        <aside aria-label="Primary" className={`${shellClass(open)} w-14 items-center px-2.5`}>
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="mb-3 mt-5 flex h-9 w-[35px] items-center justify-center rounded-lg text-muted-foreground hover:bg-surface"
          >
            <Menu size={16} aria-hidden />
          </button>
          {/* Workspace mark. Static in the rail — switching workspaces needs the
              expanded sidebar, where the name is readable. */}
          <span
            aria-hidden
            className="mb-3 flex size-7 items-center justify-center rounded-[9px] border border-border text-sm text-muted-foreground"
          >
            {WORKSPACE[0]}
          </span>
          {/* Scrolls inside the rail so the footer never leaves the viewport. */}
          <div className="flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto">
            {admin ? (
              ADMIN_NAV.map(({ label, icon }) => (
                <RailButton key={label} icon={icon} label={label} active={active === label} onClick={() => onNavigate?.(label)} />
              ))
            ) : (
              <>
                <RailButton icon={DashboardIcon} label="Dashboard" active={active === "Dashboard"} onClick={() => onNavigate?.("Dashboard")} />
                <RailButton icon={WorkflowIcon} label="Workflow" active={inWorkflow} onClick={onToggle} />
                <RailButton icon={ReportsIcon} label="Reports" active={active === "Reports"} onClick={() => onNavigate?.("Reports")} />
              </>
            )}
          </div>
          <div className="flex flex-col items-center gap-0.5 pb-3">
            <RailButton icon={Settings} label="Settings" active={active === "Settings"} onClick={() => onNavigate?.("Settings")} />
            <RailButton icon={HelpIcon} label="Help Center" active={active === "Help Center"} onClick={() => onNavigate?.("Help Center")} />
          </div>
        </aside>
      </>
    );
  }

  return (
    <>
      <Backdrop open={open} onClose={onClose} />
      <aside aria-label="Primary" className={`${shellClass(open)} w-64 px-3 py-4 sm:w-56`}>
      {/* Brand + collapse. Two buttons, one per breakpoint: collapsing to a rail
          only makes sense where the rail stays on screen, and inside the mobile
          drawer the same slot has to dismiss it. */}
      <div className="flex items-center gap-2 px-1">
        <BrandMark size={28} />
        <span className="flex-1 text-base font-bold">Valigo</span>
        <button
          onClick={onToggle}
          aria-label="Collapse sidebar"
          className="hidden size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-surface lg:flex"
        >
          <PanelLeft size={15} aria-hidden />
        </button>
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-surface lg:hidden"
        >
          <X size={15} aria-hidden />
        </button>
      </div>

      {/* Workspace switcher — an admin isn't acting inside one workspace. */}
      {!admin && (
        <button className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-muted">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          <span className="flex-1 truncate text-left font-medium">{workspaceName}</span>
          <ChevronDown size={15} className="shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}

      {/* Nav */}
      {/* The nav takes the leftover height and scrolls within itself, so the
          footer below stays pinned to the bottom of the VIEWPORT — on a short
          screen you never scroll the page to reach Settings. */}
      <nav className="mt-4 flex flex-col gap-0.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {admin ? (
          ADMIN_NAV.map(({ label, icon }) => (
            <NavItem key={label} icon={icon} label={label} active={active === label} onClick={() => onNavigate?.(label)} />
          ))
        ) : (
          <>
        <NavItem icon={DashboardIcon} label="Dashboard" active={active === "Dashboard"} onClick={() => onNavigate?.("Dashboard")} />

        <button
          onClick={() => setWorkflowOpen((o) => !o)}
          aria-expanded={workflowOpen}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground hover:bg-surface"
        >
          <WorkflowIcon size={17} className={inWorkflow ? "text-accent-strong" : "text-muted-foreground"} aria-hidden />
          <span className="flex-1 text-left">Workflow</span>
          <span className="text-[10px] font-semibold text-muted-foreground">{progress}</span>
          <ChevronDown
            size={15}
            className={`text-muted-foreground transition-transform ${workflowOpen ? "" : "-rotate-90"}`}
            aria-hidden
          />
        </button>

        {workflowOpen && (
          <div className="ml-4 border-l border-border pl-3">
            {WORKFLOW_STEPS.map(({ label, icon: Icon }) => {
              const isActive = active === label;
              const isDone = completed.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => onNavigate?.(label)}
                  aria-current={isActive ? "step" : undefined}
                  className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm ${
                    isActive ? "bg-accent-subtle text-accent-strong" : "text-muted-foreground hover:bg-surface hover:text-foreground"
                  }`}
                >
                  <Icon size={15} aria-hidden />
                  <span className="flex-1 text-left">{label}</span>
                  {isDone && <CheckCircle2 size={14} className="text-success-text" aria-label="completed" />}
                  {isActive && <span className="h-3.5 w-1 rounded-full bg-accent" aria-hidden />}
                </button>
              );
            })}
            <div className="flex items-center gap-2 px-2.5 pt-2.5">
              <div className="h-px flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-px bg-accent transition-[width]"
                  style={{ width: `${(doneCount / WORKFLOW_STEPS.length) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{progress}</span>
            </div>
          </div>
        )}

        <NavItem icon={ReportsIcon} label="Reports" active={active === "Reports"} onClick={() => onNavigate?.("Reports")} />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-0.5 pb-2 pt-2">
        <NavItem icon={Settings} label="Settings" active={active === "Settings"} onClick={() => onNavigate?.("Settings")} />
        <NavItem icon={HelpIcon} label="Help Center" active={active === "Help Center"} onClick={() => onNavigate?.("Help Center")} />
        <AccountBlock onNavigate={onNavigate} />
      </div>
      </aside>
    </>
  );
}

/** The account controls the topbar shows on desktop. Below `lg` the avatar is
 *  hidden up there and lives here instead, so the hamburger is the single entry
 *  point to everything navigational on a phone. */
function AccountBlock({ onNavigate }: { onNavigate?: (label: string) => void }) {
  const { profile, signOut } = useSession();
  if (!profile) return null;
  return (
    <div className="mt-2 border-t border-border pt-3 lg:hidden">
      <div className="flex items-center gap-2.5 px-2.5 pb-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {initials(profile)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{fullName(profile)}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {profile.role === "admin" ? "Platform admin" : profile.job_title || profile.email}
          </span>
        </span>
      </div>
      <NavItem icon={User} label="My Profile" onClick={() => onNavigate?.("Settings")} />
      <NavItem icon={Bell} label="Notifications" onClick={() => onNavigate?.("Settings")} />
      <NavItem icon={LogOut} label="Sign out" onClick={() => void signOut().then(() => { window.location.href = "/"; })} />
    </div>
  );
}

/** Dims and closes the drawer. Only below `lg`, where the sidebar overlays the
 *  page — at `lg` and up there is nothing to dismiss. */
function Backdrop({ open, onClose }: { open: boolean; onClose?: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-30 bg-black/40 motion-safe:animate-[backdrop-in_180ms_ease-out] lg:hidden"
      onClick={onClose}
      aria-hidden
    />
  );
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: IconType; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors ${
        active ? "bg-accent-subtle text-accent-strong" : "text-foreground hover:bg-surface"
      }`}
    >
      <Icon size={17} className={active ? "text-accent-strong" : "text-muted-foreground"} aria-hidden />
      <span>{label}</span>
      {active && <span className="absolute right-1 h-4 w-0.5 rounded-full bg-accent" aria-hidden />}
    </button>
  );
}

function RailButton({ icon: Icon, label, active, onClick }: { icon: IconType; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
        active ? "bg-accent-subtle text-accent-strong" : "text-muted-foreground hover:bg-surface"
      }`}
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}
