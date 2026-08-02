import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LegacyStorageCleanup } from "@/components/LegacyStorageCleanup";
import "./globals.css";
import "./cleanup.css";

export const metadata: Metadata = {
  title: "FantasyNextMove",
  description: "League-aware fantasy football trade analysis, power rankings, lineup intelligence, and record books."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><LegacyStorageCleanup />{children}</body>
    </html>
  );
}
