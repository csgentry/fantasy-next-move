"use client";

import { useState } from "react";

export function PortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function openPortal() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to open billing management.");
      window.location.href = payload.url;
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Unable to open billing management.");
      setLoading(false);
    }
  }
  return <div className="checkout-button-wrap"><button className="button secondary small" disabled={loading} onClick={openPortal}>{loading ? "Opening…" : "Manage billing"}</button>{error && <small className="inline-error">{error}</small>}</div>;
}
