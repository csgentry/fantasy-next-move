"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StatusPayload = {
  entitlement?: { accessLevel?: string } | null;
  subscription?: { status?: string; plan?: string } | null;
  foundingNumber?: number | null;
};

export function ActivationStatus() {
  const [state, setState] = useState<"checking" | "active" | "waiting">("checking");
  const [payload, setPayload] = useState<StatusPayload | null>(null);

  useEffect(() => {
    let canceled = false;
    let attempts = 0;
    async function check() {
      attempts += 1;
      try {
        const response = await fetch("/api/billing/status", { cache: "no-store" });
        const result = await response.json() as StatusPayload;
        if (canceled) return;
        setPayload(result);
        const active = result.entitlement?.accessLevel === "trade_lab" || result.entitlement?.accessLevel === "all_access" || result.entitlement?.accessLevel === "admin";
        if (active) {
          setState("active");
          return;
        }
      } catch {
        // Keep polling briefly; Stripe webhook delivery is asynchronous.
      }
      if (attempts < 12 && !canceled) window.setTimeout(check, 1500);
      else if (!canceled) setState("waiting");
    }
    void check();
    return () => { canceled = true; };
  }, []);

  return (
    <>
      <div className={`connection-message ${state === "active" ? "success" : ""}`}>
        {state === "active"
          ? <>Membership active{payload?.foundingNumber ? ` · Founding Member #${payload.foundingNumber}` : ""}.</>
          : state === "waiting"
            ? "Stripe received the payment, but the membership webhook is still processing. Check Account again in a moment."
            : "Confirming the subscription and activating access…"}
      </div>
      <div className="billing-success-actions">
        <Link className="button" href="/account">Open membership</Link>
        <Link className="button secondary" href={state === "active" ? "/connect" : "/pricing"}>{state === "active" ? "Connect a league" : "Return to pricing"}</Link>
      </div>
    </>
  );
}
