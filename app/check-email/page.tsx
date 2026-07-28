import Link from "next/link";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "your email";
  return (
    <main className="auth-page"><section className="auth-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></Link>
      <div><span className="eyebrow">One more step</span><h1>Check your email</h1><p>We sent a confirmation link to <strong>{email}</strong>. Confirm it before signing in.</p></div>
      <Link className="button" href="/login">Go to sign in</Link>
    </section></main>
  );
}
