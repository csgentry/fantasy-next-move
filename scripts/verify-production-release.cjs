const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');

// Exercise the built application with the actual production shutdown policy.
// This test does not create users, send emails, or contact Stripe.
(async () => {
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3013'], {
    env: { ...process.env, VERCEL_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  server.stdout.on('data', data => output += data);
  server.stderr.on('data', data => output += data);
  const origin = 'http://127.0.0.1:3013';
  const results = [];
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { await fetch(origin); ready = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(ready, output);
    for (const path of ['/', '/pricing', '/login', '/signup', '/forgot-password', '/privacy', '/terms']) {
      const response = await fetch(origin + path, { redirect: 'manual' });
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert.doesNotMatch(html, /Continue with ChatGPT|Log in to Vercel/);
      if (path === '/') assert.doesNotMatch(html, /9th of 12|91\.4|Upgrade RB2/);
      if (path === '/pricing') {
        assert.match(html, /\$7\.99/);
        assert.match(html, /\$39\.99/);
        assert.doesNotMatch(html, /\$29\.99|\$59\.99|Test Pro checkout|Choose All Access|Choose Trade Lab/);
        assert.equal((html.match(/disabled=""/g) || []).length, 2);
      }
      results.push({ path, status: response.status });
    }
    for (const path of ['/account', '/admin', '/dashboard', '/team', '/leagues', '/trade-lab']) {
      const response = await fetch(origin + path, { redirect: 'manual' });
      assert.equal(response.status, 307, path);
      assert.ok(new URL(response.headers.get('location'), origin).pathname === '/login', path);
      results.push({ path, status: response.status });
    }
    for (const path of ['/api/account/leagues', '/api/account/history', '/api/account/player-snapshots']) {
      const response = await fetch(origin + path, { redirect: 'manual' });
      assert.ok([401, 503].includes(response.status), path);
      results.push({ path, status: response.status });
    }
    for (const path of ['/api/billing/checkout', '/api/billing/portal', '/api/billing/status', '/api/billing/refund-request', '/api/stripe/webhook', '/api/cron/billing-reconcile']) {
      for (const method of ['GET', 'POST']) {
        const response = await fetch(origin + path, { method, redirect: 'manual' });
        assert.equal(response.status, 503, `${method} ${path}`);
        assert.match((await response.json()).error, /Subscriptions are not available yet/);
        results.push({ path, method, status: response.status });
      }
    }
    const invalidConfirmation = await fetch(origin + '/auth/confirm', { redirect: 'manual' });
    assert.equal(invalidConfirmation.status, 307);
    const invalidCallback = await fetch(origin + '/auth/callback', { redirect: 'manual' });
    assert.equal(invalidCallback.status, 307);
    const demo = await fetch(origin + '/demo');
    assert.match(await demo.text(), /Fictional product demo/);
    const chunks = [];
    function walk(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = directory + '/' + entry.name;
        if (entry.isDirectory()) walk(file);
        else if (file.endsWith('.js')) chunks.push(file);
      }
    }
    walk('.next/static');
    for (const file of chunks) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{12,}|whsec_[A-Za-z0-9]{12,}|sb_secret_[A-Za-z0-9_-]{12,}/, file);
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync('test-results/production-release.json', JSON.stringify({ commit: process.env.GITHUB_SHA || null, results, publicChunksScanned: chunks.length, emailAccountLifecycle: 'BLOCKED: authorized disposable inbox required' }, null, 2));
    console.log(JSON.stringify({ result: 'PASS', checks: results.length, publicChunksScanned: chunks.length, emailAccountLifecycle: 'NOT TESTED' }));
  } finally { server.kill('SIGTERM'); }
})().catch(error => { console.error(error); process.exitCode = 1; });
