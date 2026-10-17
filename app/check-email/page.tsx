import {Brand} from "@/components/Brand";
import Link from "next/link";
import { resendConfirmation } from "@/app/auth/actions";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  return (
    <main className="auth-page"><section className="auth-card">
      <Brand href="/"/>
      <div><span className="eyebrow">One more step</span><h1>Check your email</h1><p>{email ? <>We sent a confirmation link to <strong>{email}</strong>. </> : "Already registered? Request a fresh confirmation link below. "}Confirm your email before signing in.</p></div>
      {error && <p className="connection-message error" role="alert">{error}</p>}
      {message && <p className="connection-message success" role="status">{message}</p>}
      <form className="auth-form" action={resendConfirmation}>
        <label>Email<input name="email" type="email" autoComplete="email" defaultValue={email} required /></label>
        <button className="button secondary" type="submit">Resend confirmation email</button>
      </form>
      <Link className="button" href="/login">Go to sign in</Link>
    </section></main>
  );
}
