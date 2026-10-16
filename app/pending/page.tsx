import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export default function PendingPage() {
  return (
    <main className="auth-page"><section className="auth-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
      <div><span className="eyebrow">Your account is ready</span><h1>Connect your league</h1><p>Your account is ready. Connect one Sleeper league for free, or explore Pro for full Trade Lab.</p></div>
      <div className="auth-links"><Link href="/pricing">View plans</Link><Link href="/account">Open account</Link></div>
      <form action={signOut}><button className="button secondary" type="submit">Sign out</button></form>
    </section></main>
  );
}
