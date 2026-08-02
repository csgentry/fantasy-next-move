import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
        <div><span className="eyebrow">Create an account</span><h1>Start with FantasyNextMove</h1><p>Create your login, then choose Trade Lab or All Access. Existing beta testers can enter a complimentary-access code.</p></div>
        {error && <div className="connection-message error">{error}</div>}
        <form className="auth-form" action={signUp}>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Complimentary-access code <small>(optional)</small><input name="inviteCode" type="text" autoCapitalize="characters" autoComplete="off" /></label>
          <div className="auth-form-grid">
            <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
            <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          </div>
          <button className="button" type="submit">Create account</button>
        </form>
        <p className="form-note">By creating an account, you agree to the <a href="/terms">Terms</a> and acknowledge the <a href="/privacy">Privacy Notice</a>. Fantasy analysis is decision support, not a guaranteed outcome.</p>
        <div className="auth-links"><Link href="/login">Already have an account? Sign in</Link><Link href="/pricing">View pricing</Link></div>
      </section>
    </main>
  );
}
