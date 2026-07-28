import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LegacyStorageCleanup } from "@/components/LegacyStorageCleanup";
import "./globals.css";
import "./cleanup.css";

export const metadata: Metadata = {
  title: "FantasyNextMove",
  description: "Invite-only fantasy football analysis with league history, locked trade values, and dynasty draft capital."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><LegacyStorageCleanup />{children}</body>
    </html>
  );
}
