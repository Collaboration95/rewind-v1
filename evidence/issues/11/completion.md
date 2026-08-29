# Issue #11 completion evidence

- Issue: [#11 — Add mobile quality rails and baseline GitHub Actions checks](https://github.com/Collaboration95/rewind-v1/issues/11)
- Base implementation commit: [3cc5069](https://github.com/Collaboration95/rewind-v1/commit/3cc5069ea6b90d0048e138307e4dd7bd54711642)
- Final verified commit: [da608cd](https://github.com/Collaboration95/rewind-v1/commit/da608cd5d9ca14308b5f904cb082350753e3bee8)
- Pull request: [#43](https://github.com/Collaboration95/rewind-v1/pull/43)

## Scope delivered

The mobile workspace now has exact Prettier tooling, deterministic lint,
format-check, typecheck, and non-watch test scripts, plus one aggregate
`check` command. The root `Makefile` delegates into `apps/mobile` for locked
installation, Expo Metro/Fast Refresh, Expo Go launch, local iOS/Android
development builds, web export, formatting, and quality checks. A Node runtime
pin, synthetic native identifiers, and generated-output ignore rules keep the
local workflow reproducible without changing the repository topology.

The `Mobile quality` workflow runs on push, pull request, and manual dispatch.
It uses immutable action commit references, Node `26.3.1`, the app lockfile for
npm caching, `npm ci`, static checks, and a web export. It has read-only content
permissions and does not use cloud services, EAS, emulators, credentials, or
secrets.

## Verification

- `make install` — PASS; clean install from `apps/mobile/package-lock.json`.
- `make check` — PASS; workflow YAML parse, format-check, lint, typecheck, and
  four non-watch contract tests.
- `npm --prefix apps/mobile run test -- --runInBand` — PASS; four tests.
- `make build-web` — PASS; Expo exported the bundle to ignored
  `apps/mobile/dist/`.
- `make start` — PASS; local Metro/Expo Go development server started and
  stopped cleanly. Fast Refresh remains the default Expo development behavior.
- `npx expo install --check` — PASS; run from `apps/mobile`.
- `npx expo-doctor` — PASS; 21/21 checks.
- Workflow YAML parser and Prettier validation — PASS; see
  [workflow validation](workflow-validation.txt).
- Deliberate formatting failure followed by formatter recovery — PASS; see
  [failure/recovery evidence](format-failure-recovery.txt).
- Remote push workflow — PASS: [run 33262343107](https://github.com/Collaboration95/rewind-v1/actions/runs/33262343107).
- Remote pull-request workflow — PASS: [run 33262344857](https://github.com/Collaboration95/rewind-v1/actions/runs/33262344857).

## Native build matrix and limitations

- `make build-ios` — command wiring and prebuild reached the CocoaPods
  prerequisite. CocoaPods is not installed on this machine, so no iOS native
  build is claimed. The generated `ios/` directory was removed from the
  workspace after the probe and remains ignored by policy.
- `make build-android` — command wiring and prebuild passed, then stopped with
  the real environment error that the Android SDK and `adb` are unavailable.
  The generated `android/` directory was removed from the workspace and
  remains ignored by policy.
- CI deliberately avoids both native toolchains and does not claim device
  capability verification. Jest/React Native Testing Library migration remains
  scoped to issue #13.
- npm reports 11 moderate transitive advisories during install; dependency
  versions were not changed opportunistically in this ticket.
