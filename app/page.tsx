import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="brand"><span className="brand-mark">FNM</span><span>FantasyNextMove</span></div>
        <div className="nav-actions"><span className="pill">Invite-only beta</span><Link href="/login">Login</Link><Link className="button small" href="/signup">Use invite code</Link></div>
      </header>
      <section className="hero">
        <div className="eyebrow">Sleeper import live · Yahoo integration in review</div>
        <h1>Know your league.<br />Make the next move.</h1>
        <p>Turn standings, rosters, manager history, dynasty draft capital, and league settings into a clearer plan.</p>
        <div className="hero-actions"><Link className="button" href="/signup">Join with an invite</Link><Link className="button secondary" href="/dashboard">Explore sample league</Link></div>
        <div className="trust-row"><span>Account-owned data</span><span>Read-only imports</span><span>Dynasty draft picks</span><span>Locked trade values</span></div>
      </section>
      <section className="preview-grid">
        <div className="preview-card large"><div className="preview-header"><span>Weekly Command Center</span><span className="pill">Contender: 91</span></div><h3>Your clearest next move</h3><p>Compare roster needs, long-term player value, and draft capital before making an offer.</p><div className="mini-bars"><i style={{width:"88%"}}/><i style={{width:"72%"}}/><i style={{width:"61%"}}/></div></div>
        <div className="preview-card"><span className="muted">All-time rank</span><strong className="huge">#2</strong><small>Across connected seasons</small></div>
        <div className="preview-card"><span className="muted">Trade verdict</span><strong className="positive">Balanced</strong><small>Players, picks, and roster fit</small></div>
      </section>
      <section className="feature-section">
        <div><span className="eyebrow">One account, every decision</span><h2>More than another score dashboard.</h2></div>
        <div className="feature-grid">
          <article><b>01</b><h3>League memory</h3><p>Save connected seasons, preserve team-name aliases, and build manager records and championships.</p></article>
          <article><b>02</b><h3>Dynasty capital</h3><p>Import current future-pick ownership from Sleeper and include those locked assets in Trade Lab.</p></article>
          <article><b>03</b><h3>Trade Lab</h3><p>Compare locked Redraft or Dynasty values without letting either manager manipulate the result.</p></article>
        </div>
      </section>
      <footer className="landing-footer"><span>FantasyNextMove invite-only beta</span><span className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></span><span>Public sample. Login required for real leagues.</span></footer>
    </main>
  );
}
