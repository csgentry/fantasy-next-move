"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StatusPayload = {
  signedIn?: boolean;
  checkout?: {status?:string;paymentStatus?:string}|null;
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
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function check() {
      attempts += 1;
      try {
        const response = await fetch(`/api/billing/status${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`, { cache: "no-store" });
        const result = await response.json() as StatusPayload;
        if (canceled) return;
        if (!response.ok) throw new Error("Status unavailable");
        setPayload(result);
        const access = result.entitlement?.accessLevel === "trade_lab" || result.entitlement?.accessLevel === "all_access" || result.entitlement?.accessLevel === "admin";
        const active = sessionId && result.checkout?.status === "complete" && ["paid","no_payment_required"].includes(result.checkout.paymentStatus || "") && ["active","trialing"].includes(result.subscription?.status || "") && access;
        if (active) {
          setState("active");
          return;
        }
      } catch {
        // Keep polling briefly; Stripe webhook delivery is asynchronous.
      }
      if (sessionId && attempts < 12 && !canceled) timer = setTimeout(check, 1500);
      else if (!canceled) setState("waiting");
    }
    void check();
    return () => { canceled = true; if (timer) clearTimeout(timer); };
  }, []);

  return (
    <>
      <div className={`connection-message ${state === "active" ? "success" : ""}`}>
        {state === "active"
          ? <>Membership active{payload?.foundingNumber ? ` · Founding Member #${payload.foundingNumber}` : ""}.</>
          : state === "waiting"
            ? payload?.checkout?.status === "expired" ? "This checkout expired without activating a subscription. Return to pricing to try again." : "Your subscription is not confirmed yet. Check Account or contact support before trying another payment."
            : "Confirming the subscription and activating access…"}
      </div>
      <div className="billing-success-actions">
        <Link className="button" href="/account">Open membership</Link>
        <Link className="button secondary" href={state === "active" ? "/connect" : "/pricing"}>{state === "active" ? "Connect a league" : "Return to pricing"}</Link>
      </div>
    </>
  );
}
