import Main from "@/app/main";
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
