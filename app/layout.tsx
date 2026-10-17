import {YahooSession} from "@/components/YahooSession";
import {AnalyticsConsent} from "@/components/AnalyticsConsent";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LegacyStorageCleanup } from "@/components/LegacyStorageCleanup";
import "./globals.css";
import "./cleanup.css";
import "./experience.css";

export const metadata: Metadata = {
  title: "FantasyNextMove",
  description: "Understand your fantasy team and the next decision that matters. Team analysis and league-aware trade evaluation."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><YahooSession><LegacyStorageCleanup />{children}<AnalyticsConsent/></YahooSession></body>
    </html>
  );
}
