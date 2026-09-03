# Issue #26 completion evidence

Issue: https://github.com/Collaboration95/rewind-v1/issues/26
Implementation commits: 007d76e8b8e5cbdbf5cc6c2f646ffacd09a2c45d and 3a8aafc

## Delivered

- Active synthetic profiles can enable, disable, and update a weekly local reminder.
- Weekly reminder preferences and weekly/demo notification identifiers persist in SQLite.
- A ten-second local demo reminder can be scheduled and cancelled.
- Existing notification schedules are replaced with best-effort persistence rollback on failure.
- Denied, blocked, and unavailable notification permission states have actionable, accessible copy.
- Concurrent first-run SQLite opens share one migration and seed operation, preventing a partially initialized local database.
- Settings is a secondary route reachable from Home; the four-tab navigation rail is unchanged.
- No push token, remote provider, server, or group-delivery behavior is included.

## Verification

| Command | Result |
| --- | --- |
| `make check` | PASS — formatting, lint, typecheck, 34 contract tests, and 13 Jest suites / 53 tests |
| `make build-web` | PASS — Expo web export completed; not used as mobile evidence |
| `npm run test:unit -- tests/local-database-opening.test.ts --runInBand` | PASS — concurrent database opening regression test |
| `npm --prefix apps/mobile run build:ios -- --device DE1FFC45-5860-409C-B58E-60D265E05A2B --no-install --no-bundler` | PASS — native iOS build installed on the simulator |
| `git diff --check` | PASS |

Native mobile evidence: [settings-native-ios26.5-enabled.png](settings-native-ios26.5-enabled.png).
This is a device-only screenshot from an iPhone 17 Pro / iOS 26.5 simulator.
It shows notification access ready, the Sunday weekly schedule, the enabled
local reminder control, and the local-only disclosure.

Deterministic store,
adapter, database, route, and UI tests cover the granted, denied, blocked,
persistence, replacement, demo, and failure paths.

## Emulator diagnosis

The original exit 70 was caused by a missing iOS 26.5 simulator runtime: Xcode
26.6 and its 26.5 SDK were installed, but the generated scheme had no matching
runtime. The device list also contained stale iOS 26.2 profiles marked
unavailable. A subsequent launch hit a stale CoreSimulatorService connection
(`Connection refused`). Installing the iOS 26.5 runtime and restarting the
user-owned simulator service restored `simctl` and allowed an iPhone 17 Pro to
boot. Metro also needed to run as a host process on `localhost:8081`; the
sandboxed attempt did not bind a listener.

The ignored `apps/mobile/ios` directory had been generated before the
`expo-notifications` dependency was added, so it was regenerated with
`expo prebuild --clean --platform ios` before the successful native build.

The screenshot proves the native Settings flow and local scheduling controls;
it does not claim a real background notification banner. Android verification
remains unavailable because `adb` is not installed. No cloud delivery is
included.
