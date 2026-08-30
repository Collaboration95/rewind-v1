const { spawnSync } = require('node:child_process');

// The repository baseline invokes this script with --runInBand. These
// dependency-free contract tests are intentionally non-watch; issue #13 will
// replace this runner with the planned Jest/React Native Testing Library setup.
const result = spawnSync(
  process.execPath,
  ['--test', 'tests/scaffold.test.mjs', 'tests/tooling.test.mjs', 'tests/routes.test.mjs'],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
