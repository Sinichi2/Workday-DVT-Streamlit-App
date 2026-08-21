"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/app/components/navigation/Sidebar";
import { AccountControls, Topbar } from "@/app/components/navigation/Topbar";
import SubscriberDashboard from "@/app/pages/subscriber/subscriber_dashboard";
import SubscriberWorkflowProfile from "@/app/pages/subscriber/subscriber_workflow.profile";
import SubscriberWorkflowTransform from "@/app/pages/subscriber/subscriber_workflow.transform";
import SubscriberWorkflowValidate from "@/app/pages/subscriber/subscriber_workflow.validate";
import SubscriberWorkflowCompare from "@/app/pages/subscriber/subscriber_workflow.compare";
import SubscriberReports from "@/app/pages/subscriber/subscriber_reports";
import SubscriberSettings from "@/app/pages/subscriber/subscriber_settings";
import SubscriberHelpCenter from "@/app/pages/subscriber/subscriber_helpCenter";
import AdminDashboard from "@/app/pages/admin/admin.dashboard";
import AdminReports from "@/app/pages/admin/admin.reports";
import AdminSupport from "@/app/pages/admin/admin.support";
import AdminUsers from "@/app/pages/admin/admin.users";
import AuthSignIn, { type AuthView } from "@/app/pages/general/authentication/auth.signIn";
import AuthSignUp from "@/app/pages/general/authentication/auth.signUp";
import AuthResetPassword from "@/app/pages/general/authentication/auth.resetPassword";
import { useSession } from "@/app/lib/session";
import { STEP_LABEL, WORKFLOW_ORDER, type Step } from "@/app/data/subscriber/subscriber.workflow_data";

type Route =
  | "Dashboard"
  | "Profile"
  | "Transform"
  | "Validate"
  | "Compare"
  | "Reports"
  | "Help Center"
  | "Admin"
  | "Users"
  | "All Reports"
  | "Support";

/** App shell: owns theme, sidebar-collapse, the current route, and the workflow
 *  progress the four steps share. Swap the route state for the router when
 *  these become real URLs. */
export default function Main() {
  const { status, isAdmin } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [route, setRoute] = useState<Route>("Dashboard");
  const [authView, setAuthView] = useState<AuthView>("signIn");
  /** Sidebar drawer, below `lg` only. */
  const [navOpen, setNavOpen] = useState(false);
  /** Settings floats over whatever page you were on — it isn't a route. */
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Ticket to open when Support mounts, set by a deep link from Users. */
  const [focusTicketId, setFocusTicketId] = useState<string | null>(null);

  // Workflow progress lives here because the sidebar and every step read it.
  const [file, setFile] = useState<File | null>(null);
  const [completed, setCompleted] = useState<Step[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // "Dashboard" is the subscriber landing page and isn't in the admin nav, so
  // an admin would otherwise open on a screen their sidebar can't navigate back to.
  useEffect(() => {
    if (isAdmin) setRoute((r) => (r === "Dashboard" ? "Admin" : r));
  }, [isAdmin]);

  // Esc closes the drawer — parity with the backdrop, which the keyboard can't
  // click.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const complete = useCallback((step: Step) => {
    setCompleted((c) => (c.includes(step) ? c : [...c, step]));
  }, []);

  /** Mark the current step done and move to the next one. */
  const advance = useCallback(
    (from: Step) => {
      complete(from);
      const next = WORKFLOW_ORDER[WORKFLOW_ORDER.indexOf(from) + 1];
      if (next) setRoute(STEP_LABEL[next]);
    },
    [complete],
  );

  // Clearing the source file invalidates everything derived from it — leaving
  // the later steps ticked would claim a run that no longer has an input.
  const chooseFile = useCallback((next: File | null) => {
    setFile(next);
    if (!next) setCompleted([]);
  }, []);

  // Theme is applied before this branch so the auth screens are themed too.
  if (status === "loading") {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center bg-background text-sm text-muted-foreground-2">
        Loading…
      </div>
    );
  }

  if (status === "signed-out") {
    if (authView === "signUp") return <AuthSignUp onNavigate={setAuthView} />;
    if (authView === "reset") return <AuthResetPassword onNavigate={setAuthView} />;
    return <AuthSignIn onNavigate={setAuthView} />;
  }

  // Admins get the same shell with a different nav. One layout, one login.
  const adminRoute = route === "Admin" || route === "Users" || route === "All Reports" || route === "Support";

  return (
    <div className="flex min-h-0 flex-1 bg-background text-foreground">
      <Sidebar
        admin={isAdmin}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        active={settingsOpen ? "Settings" : route}
        onNavigate={(label) => {
          if (label === "Settings") setSettingsOpen(true);
          else setRoute(label as Route);
          setNavOpen(false); // navigating from the drawer should dismiss it
        }}
        completed={completed.map((s) => STEP_LABEL[s])}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      {/* `min-w-0` lets wide tables shrink instead of stretching the shell;
          `min-h-0` is what lets <main> actually scroll rather than grow. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Admin renders its own toolbar and carries the account there, so a
            second near-empty header strip would just push the console down. */}
        {!adminRoute && (
          <Topbar dark={dark} onToggleTheme={() => setDark((d) => !d)} onOpenNav={() => setNavOpen(true)} />
        )}
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-2 sm:px-6 lg:px-8">
          {route === "Dashboard" && <SubscriberDashboard />}
          {route === "Profile" && (
            <SubscriberWorkflowProfile file={file} onFile={chooseFile} onContinue={() => advance("profile")} />
          )}
          {route === "Transform" && <SubscriberWorkflowTransform file={file} onContinue={() => advance("transform")} />}
          {route === "Validate" && (
            <SubscriberWorkflowValidate
              file={file}
              onContinue={() => advance("validate")}
              onComplete={() => complete("validate")}
            />
          )}
          {route === "Compare" && <SubscriberWorkflowCompare file={file} onComplete={() => complete("compare")} />}
          {route === "Reports" && <SubscriberReports />}
          {route === "Help Center" && <SubscriberHelpCenter />}

          {isAdmin && route === "Admin" && (
            <AdminDashboard account={<AccountControls dark={dark} onToggleTheme={() => setDark((d) => !d)} size="sm" />} onOpenNav={() => setNavOpen(true)} />
          )}
          {isAdmin && route === "Users" && (
            <AdminUsers
              account={<AccountControls dark={dark} onToggleTheme={() => setDark((d) => !d)} size="sm" />}
              onOpenNav={() => setNavOpen(true)}
              onOpenTicket={(id) => {
                setFocusTicketId(id);
                setRoute("Support");
              }}
            />
          )}
          {isAdmin && route === "All Reports" && (
            <AdminReports account={<AccountControls dark={dark} onToggleTheme={() => setDark((d) => !d)} size="sm" />} onOpenNav={() => setNavOpen(true)} />
          )}
          {isAdmin && route === "Support" && (
            <AdminSupport
              account={<AccountControls dark={dark} onToggleTheme={() => setDark((d) => !d)} size="sm" />}
              onOpenNav={() => setNavOpen(true)}
              focusTicketId={focusTicketId}
              onFocusHandled={() => setFocusTicketId(null)}
            />
          )}
          {/* An admin route reached by a non-admin renders nothing rather than
              leaking the page shell; RLS would refuse the data anyway. */}
          {!isAdmin && adminRoute && (
            <p className="pt-10 text-center text-sm text-muted-foreground-2">Not available for this account.</p>
          )}
        </main>
      </div>
      <SubscriberSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
