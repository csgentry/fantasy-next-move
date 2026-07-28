import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export default function PendingPage() {
  return (
    <main className="auth-page"><section className="auth-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
      <div><span className="eyebrow">Beta access</span><h1>Your account is not approved</h1><p>This account exists, but it does not currently have access to the private beta. Contact the person who invited you.</p></div>
      <div className="auth-links"><Link href="/account">Open account or delete data</Link></div>
      <form action={signOut}><button className="button secondary" type="submit">Sign out</button></form>
    </section></main>
  );
}
