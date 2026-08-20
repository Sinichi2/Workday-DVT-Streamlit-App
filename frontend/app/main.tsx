"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/app/components/navigation/Sidebar";
import { Topbar } from "@/app/components/navigation/Topbar";
import SubscriberDashboard from "@/app/pages/subscriber/subscriber_dashboard";
import SubscriberWorkflowProfile from "@/app/pages/subscriber/subscriber_workflow.profile";
import SubscriberWorkflowTransform from "@/app/pages/subscriber/subscriber_workflow.transform";
import SubscriberWorkflowValidate from "@/app/pages/subscriber/subscriber_workflow.validate";
import SubscriberWorkflowCompare from "@/app/pages/subscriber/subscriber_workflow.compare";
import SubscriberReports from "@/app/pages/subscriber/subscriber_reports";
import SubscriberSettings from "@/app/pages/subscriber/subscriber_settings";
import { STEP_LABEL, WORKFLOW_ORDER, type Step } from "@/app/data/subscriber/subscriber.workflow_data";

type Route = "Dashboard" | "Profile" | "Transform" | "Validate" | "Compare" | "Reports" | "Settings";

/** App shell: owns theme, sidebar-collapse, the current route, and the workflow
 *  progress the four steps share. Swap the route state for the router when
 *  these become real URLs. */
export default function Main() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [route, setRoute] = useState<Route>("Dashboard");
  /** Sidebar drawer, below `lg` only. */
  const [navOpen, setNavOpen] = useState(false);

  // Workflow progress lives here because the sidebar and every step read it.
  const [file, setFile] = useState<File | null>(null);
  const [completed, setCompleted] = useState<Step[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

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

  return (
    <div className="flex min-h-0 flex-1 bg-background text-foreground">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        active={route}
        onNavigate={(label) => {
          setRoute(label as Route);
          setNavOpen(false); // navigating from the drawer should dismiss it
        }}
        completed={completed.map((s) => STEP_LABEL[s])}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      {/* `min-w-0` lets wide tables shrink instead of stretching the shell;
          `min-h-0` is what lets <main> actually scroll rather than grow. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar dark={dark} onToggleTheme={() => setDark((d) => !d)} onOpenNav={() => setNavOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-2 sm:px-6 lg:px-8">
          {route === "Dashboard" && <SubscriberDashboard />}
          {route === "Profile" && (
            <SubscriberWorkflowProfile file={file} onFile={chooseFile} onContinue={() => advance("profile")} />
          )}
          {route === "Transform" && <SubscriberWorkflowTransform onContinue={() => advance("transform")} />}
          {route === "Validate" && (
            <SubscriberWorkflowValidate
              onContinue={() => advance("validate")}
              onComplete={() => complete("validate")}
            />
          )}
          {route === "Compare" && <SubscriberWorkflowCompare onComplete={() => complete("compare")} />}
          {route === "Reports" && <SubscriberReports />}
          {route === "Settings" && <SubscriberSettings />}
        </main>
      </div>
    </div>
  );
}
