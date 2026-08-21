"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, Moon, Settings, Sun, User, type LucideIcon } from "lucide-react";
import { useSession } from "@/app/lib/session";
import { fullName, initials } from "@/app/lib/supabase";

type Props = {
  dark: boolean;
  onToggleTheme: () => void;
  /** Opens the sidebar drawer. Only reachable below `lg`, where the sidebar is
   *  off-canvas — above that the sidebar is always visible. */
  onOpenNav?: () => void;
  // TODO(auth): pass the signed-in user from the session. DEFAULT_USER is a
  // placeholder for local dev only and must not render for a real account.
  user?: { name: string; role: string; initials: string };
};

// TODO(auth): replace with the signed-in user. Exported so the mobile drawer
// shows the same account without a second source of truth.
export const DEFAULT_USER = { name: "Shiva Cruz", role: "Workspace Owner", initials: "SC" };

export function Topbar({ dark, onToggleTheme, onOpenNav, user }: Props) {
  const { profile, signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  // Prop wins if given (stories/tests); otherwise the signed-in profile.
  const account = user ?? (profile
    ? { name: fullName(profile), role: profile.role === "admin" ? "Platform admin" : profile.job_title || "Member", initials: initials(profile) }
    : DEFAULT_USER);

  // Esc closes the account menu (keyboard parity with the click-away backdrop).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="relative flex shrink-0 items-center gap-3 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-5">
      <button
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted lg:hidden"
      >
        <Menu size={20} aria-hidden />
      </button>

      <div className="flex-1" />

      <button
        onClick={onToggleTheme}
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted"
      >
        {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
      </button>

      {/* Below `lg` this lives in the nav drawer instead — one account control
          on screen, reachable from the hamburger. */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="hidden size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground transition-transform hover:scale-105 lg:flex"
      >
        {account.initials}
      </button>

      {menuOpen && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div role="menu" className="absolute right-4 top-14 z-20 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:right-6 lg:right-8 lg:top-16">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                {account.initials}
              </span>
              <div>
                <div className="text-sm font-semibold">{account.name}</div>
                <div className="text-xs text-muted-foreground">{account.role}</div>
              </div>
            </div>
            <div className="border-t border-border py-1">
              <MenuItem icon={User} label="My Profile" />
              <MenuItem icon={Settings} label="Workspace Settings" />
              <MenuItem icon={Bell} label="Notifications" />
            </div>
            <div className="border-t border-border py-1">
              <MenuItem icon={LogOut} label="Sign out" muted onClick={() => void signOut().then(() => { window.location.href = "/"; })} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, muted, onClick }: { icon: LucideIcon; label: string; muted?: boolean; onClick?: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-surface-muted ${
        muted ? "text-muted-foreground" : "text-foreground"
      }`}
    >
      <Icon size={16} className="text-muted-foreground" aria-hidden />
      {label}
    </button>
  );
}
