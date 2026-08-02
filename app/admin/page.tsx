import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { InviteCreator } from "@/app/admin/InviteCreator";
import {
  approveRefund,
  denyRefund,
  expireInvite,
  grantComplimentaryAccess,
  revokeComplimentaryAccess
} from "@/app/admin/actions";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

type InviteRow = { id: string; email: string | null; active: boolean; max_uses: number; uses: number; expires_at: string | null; created_at: string };
type SubscriptionRow = { user_id: string; plan: string; billing_interval: string; status: string; amount: number | null; current_period_end: string | null; cancel_at_period_end: boolean; founding_member: boolean; created_at: string };
type EntitlementRow = { user_id: string; access_level: string; access_source: string; max_connected_leagues: number; valid_until: string | null; founding_member: boolean };
type RefundRow = { id: string; user_id: string; reason: string; eligible: boolean; status: string; amount: number | null; requested_at: string };

type InviteStatus = "Active" | "Used" | "Expired" | "Revoked";
function statusFor(invite: InviteRow): InviteStatus {
  if (invite.uses >= invite.max_uses) return "Used";
  if (!invite.active) return "Revoked";
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) return "Expired";
  return "Active";
}
function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/admin");
  if (!isAdminEmail(data.user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const [inviteResult, subscriptionResult, entitlementResult, refundResult, founderResult, leagueCountResult, eventResult, usersResult] = await Promise.all([
    admin.from("beta_invites").select("id,email,active,max_uses,uses,expires_at,created_at").order("created_at", { ascending: false }).limit(100),
    admin.from("subscriptions").select("user_id,plan,billing_interval,status,amount,current_period_end,cancel_at_period_end,founding_member,created_at").order("created_at", { ascending: false }).limit(250),
    admin.from("entitlements").select("user_id,access_level,access_source,max_connected_leagues,valid_until,founding_member").order("updated_at", { ascending: false }).limit(250),
    admin.from("refund_requests").select("id,user_id,reason,eligible,status,amount,requested_at").order("requested_at", { ascending: false }).limit(100),
    admin.from("founding_members").select("user_id", { count: "exact", head: true }),
    admin.from("leagues").select("id", { count: "exact", head: true }),
    admin.from("product_events").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);

  const invites = (inviteResult.data || []) as InviteRow[];
  const subscriptions = (subscriptionResult.data || []) as SubscriptionRow[];
  const entitlements = (entitlementResult.data || []) as EntitlementRow[];
  const refunds = (refundResult.data || []) as RefundRow[];
  const emails = new Map(usersResult.data.users.map((user) => [user.id, user.email || user.id]));
  const activeSubscriptions = subscriptions.filter((subscription) => ["active", "trialing", "past_due"].includes(subscription.status));
  const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, subscription) => {
    const amount = Number(subscription.amount || 0);
    return sum + (subscription.billing_interval === "year" ? amount / 12 : amount);
  }, 0);
  const activeCount = invites.filter((invite) => statusFor(invite) === "Active").length;
  const usedCount = invites.filter((invite) => statusFor(invite) === "Used").length;
  const inactiveCount = invites.length - activeCount - usedCount;
  const pendingRefunds = refunds.filter((refund) => refund.status === "pending");

  return (
    <AppShell showAdmin>
      <div className="page-heading">
        <div><span className="eyebrow">Private business controls</span><h1>FantasyNextMove Admin</h1><p>Track paid members, recurring revenue, complimentary access, refunds, product activity, and launch invitations.</p></div>
        <span className={styles.adminIdentity}>{data.user.email}</span>
      </div>

      <section className="stats-grid admin-stats-grid">
        <article className="stat-card"><span>Active subscribers</span><strong>{activeSubscriptions.length}</strong><small>{subscriptions.filter((row) => row.plan === "all_access" && ["active", "trialing", "past_due"].includes(row.status)).length} All Access</small></article>
        <article className="stat-card"><span>Monthly recurring revenue</span><strong>{money(Math.round(monthlyRecurringRevenue))}</strong><small>{money(Math.round(monthlyRecurringRevenue * 12))} normalized ARR</small></article>
        <article className="stat-card"><span>Founding members</span><strong>{founderResult.count || 0}</strong><small>Maximum launch offer: 250</small></article>
        <article className="stat-card"><span>Pending refunds</span><strong>{pendingRefunds.length}</strong><small>{pendingRefunds.filter((refund) => refund.eligible).length} guarantee-eligible</small></article>
        <article className="stat-card"><span>Connected leagues</span><strong>{leagueCountResult.count || 0}</strong><small>Across all accounts</small></article>
        <article className="stat-card"><span>7-day product events</span><strong>{eventResult.count || 0}</strong><small>Tracked server-side actions</small></article>
      </section>

      <section className="panel admin-business-panel">
        <div className="section-heading"><div><span className="eyebrow">Customers</span><h2>Subscription and access overview</h2></div><span className="pill">{usersResult.data.users.length} registered users</span></div>
        <div className="admin-customer-list">
          {usersResult.data.users.slice(0, 100).map((user) => {
            const subscription = subscriptions.find((row) => row.user_id === user.id);
            const entitlement = entitlements.find((row) => row.user_id === user.id);
            return (
              <article className="admin-customer-row" key={user.id}>
                <div><strong>{user.email || user.id}</strong><small>{user.id}</small></div>
                <div><span>Subscription</span><strong>{subscription ? `${subscription.plan} · ${subscription.status}` : "None"}</strong><small>{subscription?.current_period_end ? `Through ${formatDate(subscription.current_period_end)}` : "No renewal date"}</small></div>
                <div><span>Entitlement</span><strong>{entitlement?.access_level || "none"}</strong><small>{entitlement?.access_source || "none"}{entitlement?.valid_until ? ` · ${formatDate(entitlement.valid_until)}` : ""}</small></div>
                <div className="admin-access-actions">
                  <form action={grantComplimentaryAccess}>
                    <input type="hidden" name="userId" value={user.id} />
                    <select name="accessLevel" defaultValue="all_access"><option value="trade_lab">Trade Lab</option><option value="all_access">All Access</option></select>
                    <input name="days" type="number" defaultValue="30" min="1" max="3650" aria-label="Complimentary access days" />
                    <input name="reason" defaultValue="Admin complimentary access" aria-label="Access reason" />
                    <button className="button secondary small" type="submit">Grant</button>
                  </form>
                  {entitlement && entitlement.access_source !== "stripe" && <form action={revokeComplimentaryAccess}><input type="hidden" name="userId" value={user.id} /><button className="text-button" type="submit">Revoke</button></form>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel admin-business-panel">
        <div className="section-heading"><div><span className="eyebrow">Money-back guarantee</span><h2>Refund requests</h2></div><span className="pill">{pendingRefunds.length} pending</span></div>
        {!refunds.length ? <div className="empty-state"><strong>No refund requests.</strong></div> : <div className="admin-refund-list">{refunds.map((refund) => <article className="admin-refund-row" key={refund.id}>
          <div><strong>{emails.get(refund.user_id) || refund.user_id}</strong><small>{formatDate(refund.requested_at)} · {refund.amount ? money(refund.amount) : "Amount pending"}</small></div>
          <p>{refund.reason}</p>
          <div><span className={`status-pill ${refund.eligible ? "success" : "warning"}`}>{refund.eligible ? "Eligible" : "Outside guarantee"}</span><span className="status-pill">{refund.status}</span></div>
          {refund.status === "pending" && <div className="admin-refund-actions"><form action={approveRefund}><input type="hidden" name="requestId" value={refund.id} /><input type="hidden" name="note" value="Seven-day guarantee approved." /><button className="button small" type="submit" disabled={!refund.eligible}>Approve refund</button></form><form action={denyRefund}><input type="hidden" name="requestId" value={refund.id} /><input type="hidden" name="note" value="Request denied after review." /><button className="button secondary small" type="submit">Deny</button></form></div>}
        </article>)}</div>}
      </section>

      <div className={styles.adminGrid}>
        <InviteCreator />
        <section className={`panel ${styles.guidance}`}><span className="eyebrow">Complimentary access</span><h2>One tester, one code</h2><p>Use invitations for reviewers and beta testers. Paid users should create an account normally and subscribe through Stripe.</p><div className={styles.guidanceStat}><span>Expired or revoked</span><strong>{inactiveCount}</strong></div><div className={styles.guidanceNote}>Invite codes are stored only as SHA-256 hashes. A full code cannot be recovered after creation.</div></section>
      </div>

      <section className={`panel ${styles.invitePanel}`}>
        <div className={styles.sectionHeading}><div><span className="eyebrow">Invite history</span><h2>Recent complimentary-access invitations</h2></div><span className={styles.countLabel}>{invites.length} records</span></div>
        {inviteResult.error ? <div className={styles.empty}>Unable to load invites: {inviteResult.error.message}</div> : !invites.length ? <div className={styles.empty}>No invitations have been created yet.</div> : <div className={styles.tableWrap}>
          <div className={`${styles.inviteRow} ${styles.tableHead}`}><span>Email</span><span>Status</span><span>Uses</span><span>Expires</span><span>Created</span><span>Action</span></div>
          {invites.map((invite) => {
            const status = statusFor(invite);
            return <div className={styles.inviteRow} key={invite.id}><div className={styles.emailCell}><strong>{invite.email || "Any email"}</strong><small>{invite.id.slice(0, 8)}</small></div><span className={`${styles.status} ${styles[`status${status}` as keyof typeof styles]}`}>{status}</span><span>{invite.uses}/{invite.max_uses}</span><span>{formatDate(invite.expires_at)}</span><span>{formatDate(invite.created_at)}</span><div>{status === "Active" ? <form action={expireInvite}><input name="inviteId" type="hidden" value={invite.id} /><button className="button secondary small" type="submit">Expire</button></form> : <span className={styles.noAction}>—</span>}</div></div>;
          })}
        </div>}
      </section>
    </AppShell>
  );
}
