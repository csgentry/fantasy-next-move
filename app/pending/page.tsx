import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export default function PendingPage() {
  return (
    <main className="auth-page"><section className="auth-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
      <div><span className="eyebrow">Membership required</span><h1>Choose your access</h1><p>Your account is ready. Select Trade Lab or All Access to connect a real league, or enter a complimentary code during signup.</p></div>
      <div className="auth-links"><Link href="/pricing">View plans</Link><Link href="/account">Open account</Link></div>
      <form action={signOut}><button className="button secondary" type="submit">Sign out</button></form>
    </section></main>
  );
}
