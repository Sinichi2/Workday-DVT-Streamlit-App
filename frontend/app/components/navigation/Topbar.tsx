"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, Moon, Settings, Sun, User, type LucideIcon } from "lucide-react";

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

// Change to 
const DEFAULT_USER = { name: "Shiva Cruz", role: "Workspace Owner", initials: "SC" };

export function Topbar({ dark, onToggleTheme, onOpenNav, user = DEFAULT_USER }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

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

      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
      >
        {user.initials}
      </button>

      {menuOpen && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div role="menu" className="absolute right-4 top-14 z-20 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:right-6 lg:right-8 lg:top-16">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                {user.initials}
              </span>
              <div>
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.role}</div>
              </div>
            </div>
            <div className="border-t border-border py-1">
              <MenuItem icon={User} label="My Profile" />
              <MenuItem icon={Settings} label="Workspace Settings" />
              <MenuItem icon={Bell} label="Notifications" />
            </div>
            <div className="border-t border-border py-1">
              <MenuItem icon={LogOut} label="Sign out" muted />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, muted }: { icon: LucideIcon; label: string; muted?: boolean }) {
  return (
    <button
      role="menuitem"
      className={`flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-surface-muted ${
        muted ? "text-muted-foreground" : "text-foreground"
      }`}
    >
      <Icon size={16} className="text-muted-foreground" aria-hidden />
      {label}
    </button>
  );
}
