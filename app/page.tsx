import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="brand"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></div>
        <div className="nav-actions"><Link href="/pricing">Pricing</Link><Link href="/login">Login</Link><Link className="button small" href="/signup">Create account</Link></div>
      </header>
      <section className="hero">
        <div className="eyebrow">Sleeper import live · League-specific scoring</div>
        <h1>Know your league.<br />Make the next move.</h1>
        <p>Turn standings, rosters, weekly projections, manager history, dynasty draft capital, and league settings into a clearer plan.</p>
        <div className="hero-actions"><Link className="button" href="/pricing">View plans</Link><Link className="button secondary" href="/demo">Explore sample league</Link></div>
        <div className="trust-row"><span>Account-owned data</span><span>Read-only imports</span><span>Secure Stripe billing</span><span>League-aware values</span></div>
      </section>
      <section className="preview-grid">
        <div className="preview-card large"><div className="preview-header"><span>Weekly Command Center</span><span className="pill">Win Now: 91.4</span></div><h3>Your clearest next move</h3><p>Compare roster needs, long-term player value, current projections, and draft capital before making an offer.</p><div className="mini-bars"><i style={{width:"88%"}}/><i style={{width:"72%"}}/><i style={{width:"61%"}}/></div></div>
        <div className="preview-card"><span className="muted">Overall Power</span><strong className="huge">#2</strong><small>League-wide roster analysis</small></div>
        <div className="preview-card"><span className="muted">Trade verdict</span><strong className="positive">Fair range</strong><small>Players, picks, packages, and roster fit</small></div>
      </section>
      <section className="feature-section">
        <div><span className="eyebrow">One account, every decision</span><h2>More than another score dashboard.</h2></div>
        <div className="feature-grid">
          <article><b>01</b><h3>League memory</h3><p>Save connected seasons, preserve manager history, and build records and championships.</p></article>
          <article><b>02</b><h3>League Analyzer</h3><p>Compare Overall Power, Win Now strength, and Dynasty Future value with visible explanations.</p></article>
          <article><b>03</b><h3>Trade Lab 2.0</h3><p>Use locked 0–10,000 values that adapt to format, scoring, lineup depth, roster fit, and owned picks.</p></article>
        </div>
      </section>
      <footer className="landing-footer"><span>FantasyNextMove</span><span className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/pricing">Pricing</Link></span><span>Public sample. Subscription required for real leagues.</span></footer>
    </main>
  );
}
