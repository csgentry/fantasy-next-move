"use client";

import { useEffect, useState } from "react";
import type { ImportedLeague, LeagueProvider, PlayerIntelligencePayload } from "@/lib/types";

export function usePlayerIntelligence(league: ImportedLeague, source: LeagueProvider) {
  const [data, setData] = useState<PlayerIntelligencePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    if (source !== "sleeper") {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    fetch("/api/sleeper/intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId: league.leagueId }),
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load player intelligence.");
        return payload as PlayerIntelligencePayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((caught) => {
        if (cancelled || (caught instanceof DOMException && caught.name === "AbortError")) return;
        setError(caught instanceof Error ? caught.message : "Unable to load player intelligence.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [league.leagueId, source]);

  return { data, loading, error };
}
