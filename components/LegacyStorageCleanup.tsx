"use client";

import { useEffect } from "react";
import { clearLegacyBrowserData } from "@/lib/storage";

export function LegacyStorageCleanup() {
  useEffect(() => clearLegacyBrowserData(), []);
  return null;
}
