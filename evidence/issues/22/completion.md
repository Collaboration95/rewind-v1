# Issue #22 completion evidence

- Issue: https://github.com/Collaboration95/rewind-v1/issues/22
- Branch: `codex/22-video-capture`
- Implementation commit: `8e21d20`
- Evidence uses synthetic UI/content only; no personal media is included.

## Acceptance coverage

- `CameraView` recording is isolated behind `CameraRecordingPort`; the native
  adapter requests a capped `maxDuration` of 15 seconds, records with audio,
  supports back/front camera flipping, and reports mount/recording failures as
  safe actionable UI states.
- The capture panel exposes a vertical 1–15 second timer, early stop, local
  review, discard/re-record, and save actions. Cache captures are not shown in
  the UI.
- `LocalVideoCaptureStore` validates the domain policy before copying, copies
  accepted media into `Paths.document/rewind-captures`, verifies the copied URI
  is addressable, and persists only the durable URI plus approved metadata and
  audit state through the local repository.
- The local SQLite repository already reopens the same database file and
  restores contribution metadata; the video store uses that repository path,
  so the cache URI is never the final persisted URI. Copy and metadata failure
  tests remove partial durable files.
- Camera and microphone permission copy is declared in `app.json` for iOS and
  Android. Routes consume capability ports rather than importing native APIs.

## Verification

| Check | Result |
| --- | --- |
| `make check` | PASS — formatting, lint, TypeScript, 25 contract/domain checks, and 16 Jest tests |
| `npm run build:web` | PASS — Expo web export completed to `dist` |
| Expo permission introspection | PASS — iOS camera/microphone usage descriptions and Android `CAMERA`/`RECORD_AUDIO` permissions present |
| strict frontend audit | PASS — zero findings, warnings, or violations |
| `npm run build:ios` | BLOCKED by host toolchain — xcodebuild exit 70; the selected simulator destination requires an iOS 26.5 platform that is not installed |

## Device and browser evidence

- [Video permission action-needed state](./video-permission-action-needed.jpg)
  shows the production Camera route requesting local camera access without
  exposing recording controls before permission is granted.
- [Simulator/Expo Go device attempt](./simulator-expo-go-dev-menu-blocked.png)
  records the environment-specific first-run developer-menu overlay. Computer
  Use could not inspect the Simulator app state (`-10005`), so this is not
  presented as proof of physical camera or microphone capture.

The available host could not complete a physical-device recording/relaunch/
playback run. This limitation is escalated rather than replaced with a fake
success: mocked capability/camera/file ports and deterministic local SQLite/
policy tests pass, while native audio/video capture and durable media playback
remain unverified until a supported physical device or installed iOS platform
is available.
