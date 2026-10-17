const assert = require('node:assert/strict');

(async () => {
  const origin = 'https://fantasy-next-move-git-simplify-next-move-team-gentry1.vercel.app';
  assert.equal(process.env.PLAYWRIGHT_BASE_URL, origin, 'Do not send Preview authorization to another host');
  const expected = process.env.GITHUB_SHA;
  assert.match(expected || '', /^[0-9a-f]{40}$/, 'An exact reviewed commit is required');
  const token = process.env.FNM_PREVIEW_AUTOMATION_SECRET;
  assert.ok(token, 'Preview authorization is required');
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(origin + '/api/release', {
        headers: { 'x-vercel-protection-bypass': token },
        redirect: 'manual', signal: AbortSignal.timeout(10000)
      });
      if (response.ok) {
        const release = await response.json();
        if (release.commit === expected && release.environment === 'preview') {
          console.log('Preview serves the exact commit under test.');
          return;
        }
      }
    } catch { /* Deployment may still be building. No response bodies or secrets are logged. */ }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error('The exact release commit is not deployed. Do not accept browser results from an older Preview.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
