import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PortalButton } from "@/components/billing/PortalButton";
import { RefundRequest } from "@/components/billing/RefundRequest";
import { deleteAccount, signOut } from "@/app/auth/actions";
import { getUserEntitlement } from "@/lib/billing/entitlements";
import { PLAN_NAMES, type BillingPlan } from "@/lib/billing/config";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AccountRow = { provider: string; provider_username: string | null; created_at: string };
type LeagueRow = { provider: string; name: string; season: number; synced_at: string };
type SubscriptionRow = {
  plan: BillingPlan;
  billing_interval: "month" | "year";
  status: string;
  amount: number | null;
  currency: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  founding_member: boolean;
};

function money(cents: number | null, currency = "usd") {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const [profileResult, accountsResult, leaguesResult, subscriptionResult, foundingResult, customerResult, entitlement] = await Promise.all([
    supabase.from("profiles").select("display_name,beta_access,created_at").eq("id", data.user.id).maybeSingle(),
    supabase.from("connected_accounts").select("provider,provider_username,created_at").order("created_at", { ascending: false }),
    supabase.from("leagues").select("provider,name,season,synced_at").order("synced_at", { ascending: false }),
    supabase.from("subscriptions").select("plan,billing_interval,status,amount,currency,current_period_end,cancel_at_period_end,founding_member").eq("user_id", data.user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("founding_members").select("founding_number").eq("user_id", data.user.id).maybeSingle(),
    supabase.from("billing_customers").select("stripe_customer_id").eq("user_id", data.user.id).maybeSingle(),
    getUserEntitlement(supabase, data.user.id)
  ]);

  const profile = profileResult.data;
  const accountRows = (accountsResult.data || []) as AccountRow[];
  const leagueRows = (leaguesResult.data || []) as LeagueRow[];
  const subscription = subscriptionResult.data as SubscriptionRow | null;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const showAdmin = isAdminEmail(data.user.email);
  const planName = entitlement.accessLevel === "admin" ? "Administrator" : entitlement.accessLevel === "all_access" ? "All Access" : entitlement.accessLevel === "trade_lab" ? "Trade Lab" : "No active plan";

  return (
    <AppShell showAdmin={showAdmin}>
      <div className="page-heading">
        <div><span className="eyebrow">Membership and account</span><h1>Account</h1><p>Manage billing, membership access, connected providers, and saved leagues.</p></div>
        <div className="heading-actions">{showAdmin && <Link className="button secondary small" href="/admin">FantasyNextMove Admin</Link>}<form action={signOut}><button className="button secondary small" type="submit">Sign out</button></form></div>
      </div>

      {error && <div className="connection-message error">{error}</div>}
      {message && <div className="connection-message success">{message}</div>}

      <section className="account-grid billing-account-grid">
        <article className="panel account-panel membership-panel">
          <span className="eyebrow">Current membership</span>
          <h2>{planName}</h2>
          <p>{entitlement.accessSource === "beta" ? "Complimentary beta access" : entitlement.accessSource === "stripe" ? "Paid Stripe subscription" : "Choose a plan to connect real leagues"}</p>
          <div className="account-status"><span>Trade Lab</span><strong>{entitlement.tradeLabAccess || entitlement.allAccess ? "Unlocked" : "Locked"}</strong></div>
          <div className="account-status"><span>All Access</span><strong>{entitlement.allAccess ? "Unlocked" : "Locked"}</strong></div>
          <div className="account-status"><span>Connected leagues</span><strong>{leagueRows.length} of {entitlement.maxConnectedLeagues || 0}</strong></div>
          {foundingResult.data?.founding_number && <div className="founding-badge">Founding Member #{foundingResult.data.founding_number}</div>}
          {entitlement.accessLevel === "none" && <Link className="button small account-panel-link" href="/pricing">Choose a plan</Link>}
          {entitlement.accessLevel === "trade_lab" && <Link className="button small account-panel-link" href="/pricing">Upgrade to All Access</Link>}
        </article>

        <article className="panel account-panel billing-panel">
          <span className="eyebrow">Billing</span>
          {subscription ? <>
            <h2>{PLAN_NAMES[subscription.plan]}</h2>
            <div className="account-status"><span>Billing</span><strong>{subscription.billing_interval === "year" ? "Annual" : "Monthly"} · {money(subscription.amount, subscription.currency)}</strong></div>
            <div className="account-status"><span>Status</span><strong>{subscription.status}</strong></div>
            <div className="account-status"><span>{subscription.cancel_at_period_end ? "Access ends" : "Next renewal"}</span><strong>{date(subscription.current_period_end)}</strong></div>
            {customerResult.data?.stripe_customer_id && <PortalButton />}
            <RefundRequest />
          </> : <><h2>No Stripe subscription</h2><p>Complimentary beta access does not create a billing record.</p><Link className="button small account-panel-link" href="/pricing">View pricing</Link></>}
        </article>

        <article className="panel account-panel">
          <span className="eyebrow">Profile</span>
          <h2>{profile?.display_name || data.user.email}</h2>
          <p>{data.user.email}</p>
          <div className="account-status"><span>Account created</span><strong>{date(profile?.created_at || null)}</strong></div>
          <div className="account-status"><span>Complimentary access</span><strong>{profile?.beta_access ? "Approved" : "No"}</strong></div>
        </article>

        <article className="panel account-panel">
          <span className="eyebrow">Connected providers</span><h2>{accountRows.length} connected</h2>
          {accountRows.length ? <div className="account-list">{accountRows.map((account, index) => <div key={`${account.provider}-${index}`}><strong>{account.provider}</strong><span>{account.provider_username || "Connected account"}</span></div>)}</div> : <p>No provider account has been saved yet.</p>}
        </article>

        <article className="panel account-panel">
          <span className="eyebrow">Saved leagues</span><h2>{leagueRows.length} saved</h2>
          {leagueRows.length ? <><div className="account-list">{leagueRows.slice(0, 6).map((league, index) => <div key={`${league.provider}-${league.name}-${index}`}><strong>{league.name}</strong><span>{league.provider} · {league.season}</span></div>)}</div><Link className="text-button account-panel-link" href="/leagues">Open My Leagues →</Link></> : <p>Connect Sleeper or Yahoo to save a league.</p>}
        </article>
      </section>

      <section className="panel danger-zone">
        <div><span className="eyebrow">Danger zone</span><h2>Delete account and stored data</h2><p>Cancel an active paid subscription in Manage Billing before deleting your account. Deletion permanently removes Supabase account data.</p></div>
        <form action={deleteAccount}><label>Type DELETE<input name="confirmation" autoComplete="off" /></label><button className="button danger-button" type="submit">Delete account</button></form>
      </section>
    </AppShell>
  );
}
