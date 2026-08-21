import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the marketing site only. A serif against the product's
// grotesk is the whole typographic idea — it reads as editorial rather than
// as another SaaS template.
const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Valigo — Validate enterprise data with confidence", template: "%s · Valigo" },
  description:
    "AI-powered enterprise data validation that finds issues before go-live, explains root causes, and helps implementation teams deliver clean, trusted data faster.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      {/* Neutral: the marketing pages scroll normally, and /app imposes its own
          viewport lock. Putting `overflow-hidden` here would silently break
          every scrolling page in the site. */}
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
