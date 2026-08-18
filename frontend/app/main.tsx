"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/app/components/navigation/Sidebar";
import { Topbar } from "@/app/components/navigation/Topbar";
import SubscriberDashboard from "@/app/pages/subscriber/subscriber_dashboard";

/** App shell: owns theme + sidebar-collapse state and mounts the current page.
 *  Add routing here when more pages land; for now it renders the dashboard. */
export default function Main() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="flex flex-1 bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar dark={dark} onToggleTheme={() => setDark((d) => !d)} />
        <main className="flex-1 overflow-y-auto px-8 pb-12 pt-2">
          <SubscriberDashboard />
        </main>
      </div>
    </div>
  );
}
