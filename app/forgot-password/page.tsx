import Link from "next/link";
import { sendPasswordReset } from "@/app/auth/actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  return (
    <main className="auth-page"><section className="auth-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
      <div><span className="eyebrow">Account recovery</span><h1>Reset your password</h1><p>Enter the email used for your beta account.</p></div>
      {error && <div className="connection-message error">{error}</div>}
      {message && <div className="connection-message success">{message}</div>}
      <form className="auth-form" action={sendPasswordReset}>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <button className="button" type="submit">Send reset link</button>
      </form>
      <Link className="text-button auth-back" href="/login">← Back to sign in</Link>
    </section></main>
  );
}
