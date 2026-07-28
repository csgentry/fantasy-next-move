import Link from "next/link";
import { signIn } from "@/app/auth/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const next = typeof params.next === "string" ? params.next : "/dashboard";
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
        <div><span className="eyebrow">Invite-only beta</span><h1>Welcome back</h1><p>Sign in to connect leagues and keep your data attached to your account.</p></div>
        {error && <div className="connection-message error">{error}</div>}
        {message && <div className="connection-message success">{message}</div>}
        <form className="auth-form" action={signIn}>
          <input type="hidden" name="next" value={next} />
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="button" type="submit">Sign in</button>
        </form>
        <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><Link href="/signup">Have an invite? Create account</Link></div>
        <Link className="text-button auth-back" href="/">← Back to the public preview</Link>
      </section>
    </main>
  );
}
