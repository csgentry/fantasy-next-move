import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="brand"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></div>
        <div className="nav-actions"><span className="pill">Private beta</span><Link className="button small" href="/connect">Connect league</Link></div>
      </header>

      <section className="hero">
        <div className="eyebrow">Sleeper import live · Yahoo integration in review</div>
        <h1>Know your league.<br />Make the next move.</h1>
        <p>Turn standings, rosters, scoring, manager history, and championships into a clearer weekly plan.</p>
        <div className="hero-actions">
          <Link className="button" href="/connect">Connect a league</Link>
          <Link className="button secondary" href="/dashboard">Explore sample league</Link>
        </div>
        <div className="trust-row"><span>Read-only imports</span><span>Sample dashboard</span><span>Record books</span><span>Format-aware trades</span></div>
      </section>

      <section className="preview-grid">
        <div className="preview-card large">
          <div className="preview-header"><span>Weekly Command Center</span><span className="pill">Contender: 91</span></div>
          <h3>Your clearest next move</h3>
          <p>Package bench depth for a dependable starter before the trade market tightens.</p>
          <div className="mini-bars"><i style={{width:"88%"}}/><i style={{width:"72%"}}/><i style={{width:"61%"}}/></div>
        </div>
        <div className="preview-card"><span className="muted">All-time rank</span><strong className="huge">#2</strong><small>Across connected seasons</small></div>
        <div className="preview-card"><span className="muted">Trade verdict</span><strong className="positive">Fair value</strong><small>Locked model plus roster fit</small></div>
      </section>

      <section className="feature-section">
        <div><span className="eyebrow">One app, every decision</span><h2>More than another score dashboard.</h2></div>
        <div className="feature-grid">
          <article><b>01</b><h3>League memory</h3><p>Follow linked seasons, preserve team-name aliases, and calculate manager records and championships.</p></article>
          <article><b>02</b><h3>Next Moves</h3><p>Get prioritized, plain-English actions based on record quality, scoring, league rank, and contention window.</p></article>
          <article><b>03</b><h3>Trade Lab</h3><p>Use locked Redraft or Dynasty values and see whether a deal improves each roster&apos;s positional structure.</p></article>
        </div>
      </section>

      <footer className="landing-footer"><span>FantasyNextMove private beta</span><span>Read-only fantasy football analysis.</span></footer>
    </main>
  );
}
