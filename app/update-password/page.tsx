import Link from "next/link";
import { updatePassword } from "@/app/auth/actions";

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  return (
    <main className="auth-page"><section className="auth-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
      <div><span className="eyebrow">Account security</span><h1>Choose a new password</h1><p>Use at least eight characters.</p></div>
      {error && <div className="connection-message error">{error}</div>}
      <form className="auth-form" action={updatePassword}>
        <label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
        <button className="button" type="submit">Update password</button>
      </form>
    </section></main>
  );
}
