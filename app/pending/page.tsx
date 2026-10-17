import {Brand} from "@/components/Brand";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export default function PendingPage() {
  return (
    <main className="auth-page"><section className="auth-card">
      <Brand href="/"/>
      <div><span className="eyebrow">Your account is ready</span><h1>Connect your league</h1><p>Your account is ready. Connect one Sleeper league for free, or explore Pro for full Trade Lab.</p></div>
      <div className="auth-links"><Link href="/pricing">View plans</Link><Link href="/account">Open account</Link></div>
      <form action={signOut}><button className="button secondary" type="submit">Sign out</button></form>
    </section></main>
  );
}
