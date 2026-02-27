import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "zeroshots.app – A cleaner camera roll, one swipe at a time",
  description:
    "Give your memories room to breathe. zeroshots.app uses AI-powered triage to help you declutter your screenshots and reclaim storage with satisfying, swipe-based cleanup sessions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className="dark" lang="en">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link
          href="https://fonts.gstatic.com"
          rel="preconnect"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-dark font-display text-slate-100 overflow-x-hidden antialiased">
        {children}
      </body>
    </html>
  );
}

