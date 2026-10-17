const fs = require('node:fs');
(async () => {
  const response = await fetch('https://fantasynextmove.com/api/release', { cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw new Error('The public release endpoint is unavailable.');
  const release = await response.json();
  const current = release.environment === 'production' && release.commit === process.env.RELEASE_SHA;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `current=${current}\n`);
  console.log(current ? 'The exact release is live. Running production browser acceptance.' : 'Production acceptance NOT TESTED: this candidate is not the public release yet.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
