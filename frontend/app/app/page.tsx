import type { Metadata } from "next";
import Main from "@/app/main";

// robots.txt is advisory; this header is not. Anything behind auth should say
// so in its own metadata rather than relying on a crawler to have read a file.
export const metadata: Metadata = {
  title: "Valigo",
  robots: { index: false, follow: false, nocache: true },
};
import { SessionProvider } from "@/app/lib/session";

export default function AppPage() {
  return (
    <SessionProvider>
      {/* The product owns the viewport: the document never scrolls, <main>
          does. Scoped here rather than in the root layout, which also serves
          the marketing pages — those need normal document scroll. */}
      <div className="flex h-dvh flex-col overflow-hidden">
        <Main />
      </div>
    </SessionProvider>
  );
}
