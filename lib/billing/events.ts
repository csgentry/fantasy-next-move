import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function recordProductEvent(input: {
  userId?: string | null;
  eventName: string;
  properties?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("product_events").insert({
      user_id: input.userId || null,
      event_name: input.eventName,
      properties: input.properties || {}
    });
  } catch {
    // Analytics must never break a product action.
  }
}

export async function recordBillingAudit(input: {
  userId?: string | null;
  actorUserId?: string | null;
  action: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  stripeEventId?: string | null;
  reason?: string | null;
}) {
  const admin = createAdminClient();
  await admin.from("billing_audit_log").insert({
    user_id: input.userId || null,
    actor_user_id: input.actorUserId || null,
    action: input.action,
    previous_value: input.previousValue || null,
    new_value: input.newValue || null,
    stripe_event_id: input.stripeEventId || null,
    reason: input.reason || null
  });
}
