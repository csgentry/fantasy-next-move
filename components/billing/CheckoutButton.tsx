"use client";

import { useState } from "react";
import type { BillingInterval, BillingPlan } from "@/lib/billing/config";

export function CheckoutButton({ plan, interval, label }: { plan: BillingPlan; interval: BillingInterval; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(`/pricing?plan=${plan}&interval=${interval}`)}`;
        return;
      }
      if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to start checkout.");
      window.location.href = payload.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.");
      setLoading(false);
    }
  }
  return <div className="checkout-button-wrap"><button className="button" disabled={loading} onClick={checkout}>{loading ? "Opening secure checkout…" : label}</button>{error && <small className="inline-error">{error}</small>}</div>;
}
