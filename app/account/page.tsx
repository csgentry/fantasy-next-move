import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { deleteAccount, signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AccountRow = { provider: string; provider_username: string | null; created_at: string };
type LeagueRow = { provider: string; name: string; season: number; synced_at: string };

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const [{ data: profile }, { data: accounts }, { data: leagues }] = await Promise.all([
    supabase.from("profiles").select("display_name,beta_access,plan,created_at").eq("id", data.user.id).maybeSingle(),
    supabase.from("connected_accounts").select("provider,provider_username,created_at").order("created_at", { ascending: false }),
    supabase.from("leagues").select("provider,name,season,synced_at").order("synced_at", { ascending: false })
  ]);
  const accountRows = (accounts || []) as AccountRow[];
  const leagueRows = (leagues || []) as LeagueRow[];
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Beta account</span><h1>Account</h1><p>Manage access and review the fantasy data saved to your account.</p></div><form action={signOut}><button className="button secondary small" type="submit">Sign out</button></form></div>
      {error && <div className="connection-message error">{error}</div>}
      {message && <div className="connection-message success">{message}</div>}
      <section className="account-grid">
        <article className="panel account-panel"><span className="eyebrow">Profile</span><h2>{profile?.display_name || data.user.email}</h2><p>{data.user.email}</p><div className="account-status"><span>Beta access</span><strong>{profile?.beta_access ? "Approved" : "Pending"}</strong></div><div className="account-status"><span>Plan</span><strong>{profile?.plan || "free"}</strong></div></article>
        <article className="panel account-panel"><span className="eyebrow">Connected providers</span><h2>{accountRows.length} connected</h2>{accountRows.length ? <div className="account-list">{accountRows.map((account, index) => <div key={`${account.provider}-${index}`}><strong>{account.provider}</strong><span>{account.provider_username || "Connected account"}</span></div>)}</div> : <p>No provider account has been saved yet.</p>}</article>
        <article className="panel account-panel"><span className="eyebrow">Saved leagues</span><h2>{leagueRows.length} saved</h2>{leagueRows.length ? <><div className="account-list">{leagueRows.slice(0, 6).map((league, index) => <div key={`${league.provider}-${league.name}-${index}`}><strong>{league.name}</strong><span>{league.provider} · {league.season}</span></div>)}</div><Link className="text-button account-panel-link" href="/leagues">Open My Leagues →</Link></> : <p>Connect Sleeper or Yahoo to save a league.</p>}</article>
      </section>
      <section className="panel danger-zone"><div><span className="eyebrow">Danger zone</span><h2>Delete account and stored data</h2><p>This permanently removes the Supabase user and account-owned league records.</p></div><form action={deleteAccount}><label>Type DELETE<input name="confirmation" autoComplete="off" /></label><button className="button danger-button" type="submit">Delete account</button></form></section>
    </AppShell>
  );
}
