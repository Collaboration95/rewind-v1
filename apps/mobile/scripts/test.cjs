const { spawnSync } = require('node:child_process');

// The repository baseline invokes this script with --runInBand. The scaffold
// smoke test is dependency-free; issue #13 will replace this runner with Jest.
const result = spawnSync(
  process.execPath,
  ['--test', 'tests/scaffold.test.mjs'],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
