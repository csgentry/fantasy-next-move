import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
        <div><span className="eyebrow">Private beta</span><h1>Create your beta account</h1><p>An invite code is required while imports and dynasty tools are being validated.</p></div>
        {error && <div className="connection-message error">{error}</div>}
        <form className="auth-form" action={signUp}>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Beta invite code<input name="inviteCode" type="text" autoCapitalize="characters" autoComplete="off" required /></label>
          <div className="auth-form-grid">
            <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
            <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          </div>
          <button className="button" type="submit">Create beta account</button>
        </form>
        <p className="form-note">By creating an account, you agree to the <a href="/terms">Private Beta Terms</a> and acknowledge the <a href="/privacy">Privacy Notice</a>. Beta calculations are decision support, not guaranteed valuations.</p>
        <div className="auth-links"><Link href="/login">Already have an account? Sign in</Link></div>
      </section>
    </main>
  );
}
