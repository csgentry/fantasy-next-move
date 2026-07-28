import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="brand"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></div>
        <div className="nav-actions"><Link href="/pricing">Pricing</Link><Link className="button small" href="/dashboard">Open demo</Link></div>
      </header>

      <section className="hero">
        <div className="eyebrow">Sleeper and Yahoo fantasy football, unified</div>
        <h1>Know your league.<br />Make the next move.</h1>
        <p>Connect your fantasy league and turn standings, rosters, scoring, manager history, and championships into clear weekly decisions.</p>
        <div className="hero-actions">
          <Link className="button" href="/connect">Connect a league</Link>
          <Link className="button secondary" href="/dashboard">Explore demo</Link>
        </div>
        <div className="trust-row"><span>Sleeper import</span><span>Yahoo OAuth</span><span>Record books</span><span>Roster-aware trades</span></div>
      </section>

      <section className="preview-grid">
        <div className="preview-card large">
          <div className="preview-header"><span>Weekly Command Center</span><span className="pill">Contender: 91</span></div>
          <h3>Your clearest next move</h3>
          <p>Package bench depth for a dependable starter before the trade market tightens.</p>
          <div className="mini-bars"><i style={{width:"88%"}}/><i style={{width:"72%"}}/><i style={{width:"61%"}}/></div>
        </div>
        <div className="preview-card"><span className="muted">All-time rank</span><strong className="huge">#2</strong><small>Across connected seasons</small></div>
        <div className="preview-card"><span className="muted">Trade verdict</span><strong className="positive">Accept</strong><small>Value plus roster fit</small></div>
      </section>

      <section className="feature-section">
        <div><span className="eyebrow">One app, every decision</span><h2>More than another score dashboard.</h2></div>
        <div className="feature-grid">
          <article><b>01</b><h3>League memory</h3><p>Follow linked seasons, preserve team-name aliases, and calculate manager records and championships.</p></article>
          <article><b>02</b><h3>Next Moves</h3><p>Get prioritized, plain-English actions based on record quality, scoring, luck, league rank, and contention window.</p></article>
          <article><b>03</b><h3>Trade Lab</h3><p>Compare custom values and see whether a deal actually improves each connected roster&apos;s positional structure.</p></article>
        </div>
      </section>

      <footer className="landing-footer"><span>FantasyNextMove v1</span><span>Built for serious league managers and commissioners.</span></footer>
    </main>
  );
}
