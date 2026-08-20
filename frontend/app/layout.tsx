import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Valigo",
  description: "Workday data validation & transformation dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* The body IS the viewport: `h-dvh` (dynamic, so mobile browser chrome
          doesn't cut it off) plus `overflow-hidden` means the document never
          scrolls. Scrolling belongs to the main region, which keeps the sidebar
          and topbar fixed on screen at every size. */}
      <body className="flex h-dvh flex-col overflow-hidden">{children}</body>
    </html>
  );
}
