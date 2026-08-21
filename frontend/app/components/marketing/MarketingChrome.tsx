"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* Marketing surface — warm paper, ink, and rules.

   Deliberately not the dark-glass-and-gradient look: that reads as generic SaaS.
   This borrows from print instead — cream stock, a serif display face, hairline
   rules doing the structural work, and a single ink-blue accent used sparingly.
   It also ties to the product, whose canvas is the same warm beige family. */

export const EASE = "cubic-bezier(0.32,0.72,0,1)";

/* Palette, kept literal so it can't drift from the product's token set. */
export const PAPER = "#FBF8F3";
export const INK = "#1B1815";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms`, transitionTimingFunction: EASE }}
      className={`transition-[opacity,transform] duration-[800ms] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Section marker: a rule, a number, a label. Print furniture, not a pill. */
export function Marker({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-t border-[#E3DCD1] pt-4">
      <span className="font-mono text-[11px] tracking-[0.16em] text-[#A89B8A]">{n}</span>
      <span className="text-[11px] uppercase tracking-[0.2em] text-[#6B6157]">{children}</span>
    </div>
  );
}

/** Ink pill. The arrow is a plain glyph that slides — no nested circle, which
 *  is the giveaway detail on every AI-generated hero. */
export function CTA({
  href,
  children,
  variant = "solid",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "quiet";
  className?: string;
}) {
  if (variant === "quiet") {
    return (
      <Link
        href={href}
        style={{ transitionTimingFunction: EASE }}
        className={`group inline-flex items-center gap-2 border-b border-[#C8BCA9] pb-1 text-[15px] text-[#3A332C] transition-colors duration-300 hover:border-[#1B1815] hover:text-[#1B1815] ${className}`}
      >
        {children}
        <span className="transition-transform duration-500 group-hover:translate-x-1" style={{ transitionTimingFunction: EASE }}>
          &rarr;
        </span>
      </Link>
    );
  }
  return (
    <Link
      href={href}
      style={{ transitionTimingFunction: EASE }}
      className={`group inline-flex items-center gap-2.5 rounded-full bg-[#1B1815] px-6 py-3 text-[15px] text-[#FBF8F3] transition-all duration-500 hover:bg-[#2F4BA8] active:scale-[0.985] ${className}`}
    >
      {children}
      <span className="transition-transform duration-500 group-hover:translate-x-1" style={{ transitionTimingFunction: EASE }}>
        &rarr;
      </span>
    </Link>
  );
}

/** Editorial card: a hairline box on paper, small radius. No glass, no glow. */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-[#E3DCD1] bg-white/60 ${className}`}>{children}</div>
  );
}

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Full-width masthead on a rule — a newspaper header, not a floating
          glass capsule. */}
      <header className="sticky top-0 z-40 border-b border-[#E3DCD1] bg-[#FBF8F3]/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1180px] items-center gap-8 px-6 py-4">
          <Link href="/" className="font-display text-[22px] leading-none tracking-[-0.01em] text-[#1B1815]">
            Valigo
          </Link>

          <nav className="ml-auto hidden items-center gap-7 md:flex">
            {LINKS.slice(1).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[14px] text-[#5A5147] transition-colors duration-300 hover:text-[#1B1815]"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/app"
            style={{ transitionTimingFunction: EASE }}
            className="ml-auto hidden rounded-full border border-[#1B1815] px-4 py-1.5 text-[13px] text-[#1B1815] transition-colors duration-500 hover:bg-[#1B1815] hover:text-[#FBF8F3] md:ml-0 md:block"
          >
            Sign in
          </Link>

          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="relative ml-auto flex size-8 items-center justify-center md:hidden"
          >
            <span
              style={{ transitionTimingFunction: EASE }}
              className={`absolute h-px w-5 bg-[#1B1815] transition-all duration-500 ${open ? "rotate-45" : "-translate-y-[4px]"}`}
            />
            <span
              style={{ transitionTimingFunction: EASE }}
              className={`absolute h-px w-5 bg-[#1B1815] transition-all duration-500 ${open ? "-rotate-45" : "translate-y-[4px]"}`}
            />
          </button>
        </div>
      </header>

      <div
        style={{ transitionTimingFunction: EASE }}
        className={`fixed inset-0 z-30 bg-[#FBF8F3] transition-opacity duration-400 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex min-h-[100dvh] flex-col justify-center gap-1 px-8">
          {LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: `${open ? 60 + i * 50 : 0}ms`, transitionTimingFunction: EASE }}
              className={`font-display text-[40px] leading-[1.25] text-[#1B1815] transition-all duration-600 ${
                open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/app"
            onClick={() => setOpen(false)}
            style={{ transitionDelay: `${open ? 60 + LINKS.length * 50 : 0}ms`, transitionTimingFunction: EASE }}
            className={`mt-8 w-max rounded-full bg-[#1B1815] px-6 py-3 text-sm text-[#FBF8F3] transition-all duration-600 ${
              open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            Sign in
          </Link>
        </div>
      </div>
    </>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#E3DCD1]">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-6 py-16 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <span className="font-display text-[22px] leading-none text-[#1B1815]">Valigo</span>
          <p className="max-w-[34ch] pt-4 text-[14px] leading-relaxed text-[#6B6157]">
            Find the problems in your migration data before go-live — and know exactly how to fix them.
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#A89B8A]">Product</p>
          <div className="flex flex-col gap-2.5 pt-4 text-[14px] text-[#5A5147]">
            <Link href="/product" className="w-max transition-colors hover:text-[#1B1815]">Overview</Link>
            <Link href="/pricing" className="w-max transition-colors hover:text-[#1B1815]">Pricing</Link>
            <Link href="/app" className="w-max transition-colors hover:text-[#1B1815]">Sign in</Link>
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#A89B8A]">Company</p>
          <div className="flex flex-col gap-2.5 pt-4 text-[14px] text-[#5A5147]">
            <Link href="/about" className="w-max transition-colors hover:text-[#1B1815]">About</Link>
            <Link href="/contact" className="w-max transition-colors hover:text-[#1B1815]">Contact</Link>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1180px] border-t border-[#E3DCD1] px-6 py-6">
        <p className="text-[12px] text-[#A89B8A]">© {new Date().getFullYear()} Valigo</p>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#FBF8F3] text-[#1B1815] antialiased">
      {/* Paper grain. Fixed and inert so it never repaints with the content. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[45] opacity-[0.28] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
        }}
      />
      <MarketingNav />
      <main className="relative z-10">{children}</main>
      <div className="relative z-10">
        <MarketingFooter />
      </div>
    </div>
  );
}
