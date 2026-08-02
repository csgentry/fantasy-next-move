"use client";

import { useState } from "react";

export function RefundRequest() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/billing/refund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to submit the request.");
      setMessage(payload.eligible ? "Refund request submitted for review." : "Request submitted, but it appears to be outside the seven-day guarantee window.");
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit the request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="refund-request">
      <button className="text-button" onClick={() => setOpen((value) => !value)}>Request a refund</button>
      {open && <div className="refund-request-form"><label>Why are you requesting a refund?<textarea value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} /></label><button className="button secondary small" disabled={loading || !reason.trim()} onClick={submit}>{loading ? "Submitting…" : "Submit request"}</button></div>}
      {message && <small>{message}</small>}
    </div>
  );
}
