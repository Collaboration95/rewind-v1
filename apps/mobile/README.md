# Rewind V1 mobile app

This is the local-only Expo/React Native prototype for Rewind. The app has no
sign-in, sync service, remote endpoint, analytics, or cloud media dependency.
Synthetic data and later captured fixtures belong on the device only.

## Scaffold baseline

The workspace follows `create-expo-app@4.0.0` with
`expo-template-default@57.0.20`, reduced to the scope of issue #10. It uses
Expo SDK `57.0.18`,
React Native `0.86.3`, React `19.2.3`, and an npm lockfile. The current template
is configured here with a top-level `app/` route directory, so the initial route
is `app/index.tsx` and the root Router configuration is `app/_layout.tsx`.
The root route keeps a compatibility redirect while the four-tab shell and its
route placeholders live under `app/(tabs)/`.

The template selection is reproducible in an empty directory with
`npx create-expo-app@4.0.0 <directory> --template
expo-template-default@57.0.20 --no-install --no-agents-md`; this ticket then
trims the generated starter to the single local landing route.

The checked local baseline on 2026-08-29 is Node `26.3.1`, npm `11.16.0`, and
Xcode `26.6` with an iOS 17.5 simulator. Expo Go is the scaffold verification
path; a local development build remains the intended path for native camera
capture. CocoaPods and Android tooling are not claimed as verified here.

## Install, hot reload, and build

Run these commands from the repository root. `make start` starts the Expo
development server; Expo's default development mode provides Fast Refresh for
JavaScript and TypeScript edits. Use `make start-clear` when a stale Metro
cache is suspected.

```bash
make install
make start
make start-clear
```

The target shortcuts are:

| Command              | Purpose                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `make ios`           | Open the app through Expo Go on an iOS simulator or device.            |
| `make android`       | Open the app through Expo Go on an Android target.                     |
| `make web`           | Start the Expo web development server.                                 |
| `make build-ios`     | Generate and build a local iOS development app with Xcode.             |
| `make build-android` | Generate and build a local Android development app.                    |
| `make build-web`     | Export a static web bundle to ignored `apps/mobile/dist/`.             |
| `make check`         | Parse the workflow, then run format-check, lint, typecheck, and tests. |
| `make help`          | Print the complete command catalog.                                    |

`make build-ios` requires Xcode and CocoaPods; `make build-android` requires
the Android SDK and ADB. Expo local native builds generate ignored `ios/` and
`android/` directories. After a native build, ordinary TypeScript/JavaScript
edits still use `make start` and Fast Refresh; rebuild only after native
dependencies or app configuration changes. No EAS, cloud build, or remote
service command is included in this local-first tooling layer.

The tested local runtime is pinned in `.nvmrc` at Node `26.3.1`. The checked
workflow uses the same version, installs with the committed npm lockfile, and
runs without an emulator or secret.

## Current route-shell scope

The current shell exposes four original Rewind route surfaces: Home, Camera,
Chat, and Archive. It identifies the V1 local-only boundary and uses synthetic
copy only. Camera now supports local still-photo and capped video capture;
submission/reveal policy, chat, reminders, playback, and the simulation console
remain in their dependency-ordered tickets. Shared
visual decisions are documented in the repository [`DESIGN.md`](../../DESIGN.md)
and owned at runtime by `components/tokens.ts`.

The workspace has two complementary test lanes. The dependency-free Node
contract tests cover Router/config, tooling, route/accessibility boundaries, and
the real SQLite migration/seed/repository path; the Jest + React Native Testing
Library lane renders components under the Expo-compatible `jest-expo` preset.
The framework-free `packages/domain/` package also runs a direct Node fixture
and dependency-boundary test. `npm run test` runs all three lanes once and
never starts watch mode. Use `npm run test:contracts`, `npm run test:database`,
`npm run test:domain`, or `npm run test:unit` to run one lane locally.

## Local SQLite repository

`data/local/` owns the device-local SQLite adapter. `openLocalDatabase()` opens
`rewind-v1.db`, applies versioned migrations, and idempotently inserts the
synthetic domain fixture. The returned repository implements the framework-free
domain ports; `resetToSeed()` clears local records and restores that fixture.
Only domain metadata and local media URIs are stored. The schema has no cloud
credentials, remote media locators, blobs, or network client.

## Local profile session

The Home route exposes five synthetic profiles for development and evidence
flows. The selected profile is stored in the local `local_session` row and is
restored when the app relaunches. This is a simulated actor selector for local
commands and queries, not sign-in, authentication, or a security boundary;
membership is checked by the domain policy before a selection is persisted.

## Camera capability boundary

`platform/camera/permissions.ts` defines the camera and microphone permission
ports plus the device-settings action. The Expo adapter is the only layer that
imports `expo-camera` or native settings APIs; the Camera route consumes the
port through a permission preflight component. Its loading, grant, ready,
denied/retry, blocked/settings, unsupported, and failed-check states are
mockable without a camera. `platform/camera/recording.ts`,
`platform/camera/still.ts`, and `platform/files/storage.ts` keep camera capture
and cache-to-document copying behind ports. Accepted photos and videos are
copied into the app document directory under `rewind-captures/`; the capture
panels do not expose submission or reveal actions.

`app.json` owns the native permission copy and enables
`recordAudioAndroid` so the video path declares `RECORD_AUDIO`. A simulator can
verify layout and mocked states, but it does not prove physical camera or
microphone capture.

## Selector and accessibility contract

Selectors and accessibility labels are part of the testable UI contract, not
implementation details:

- Every interactive control has a stable lowercase kebab-case `testID` in the
  form `<surface>-<purpose>` (for example, `tab-camera`). IDs are unique within
  the screen, remain stable across copy/localization changes, and are used for
  structural assertions or device automation.
- Every interactive control has an `accessibilityRole` where React Native does
  not infer the role and a concise `accessibilityLabel` that describes the
  action or state. Prefer accessible queries by role and label in component
  tests; use `testID` when the element has no user-facing name or when the
  route/structure itself is the subject of the assertion.
- Decorative glyphs and visual wrappers use `accessible={false}`. A composite
  status or information card may expose one parent label, but must not create
  duplicate nested announcements.
- Route roots use `screen-<route>`; the four tab buttons use
  `tab-<route>` and a visible `<Route> tab` accessibility label. New controls
  follow the same naming pattern and are added to a rendered smoke test when
  they become part of an acceptance flow.

Do not use generated IDs, array indexes, visible text as a `testID`, or an
accessibility label that only describes a color, icon, or visual treatment.

Do not turn the repository root into an Expo application. Keep generated native
folders, build output, local environment files, and credentials out of Git.
