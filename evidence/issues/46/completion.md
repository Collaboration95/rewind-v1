# Issue #46 completion evidence

- Issue: https://github.com/Collaboration95/rewind-v1/issues/46
- Branch: `codex/46-still-image-capture`
- Implementation commit: `93a053b`
- Evidence uses synthetic UI/content only; no personal media is included.

## Acceptance coverage

- The Camera route now offers a photo mode beside video. Photo capture uses a
  `CameraPhotoCapturePort`; the route and panel do not import Expo camera APIs
  directly. The native adapter uses `CameraView.takePictureAsync()` and keeps
  the live preview behind the capability boundary.
- The photo panel exposes camera-ready, front/back flip, capture, fixed
  `DISPLAY / 00:03` metadata, review, local save, discard/take-again, and
  retry-safe error states. It never renders the captured image, thumbnail,
  local URI, player, or share action before reveal.
- Photo persistence reuses the shared local-media store. Domain validation
  requires `mediaKind: photo` and exactly three seconds, applies membership,
  cycle, count, and duration policy, copies accepted cache media to
  `Paths.document/rewind-captures`, verifies the durable URI, and stores only
  metadata plus the local URI and audit event.
- The real SQLite relaunch test now saves a synthetic photo metadata record,
  closes/reopens the database, and confirms the durable document URI remains
  addressable. Failed copy/metadata paths remove partial files.
- Photo mode checks camera permission only; switching to video rechecks camera
  and microphone. Denied, unsupported, failed-write, and discard paths remain
  covered by mocks and component tests. No gallery, editing, pixel filter,
  cloud upload, or video-scope change was added.

## Verification

| Check | Result |
| --- | --- |
| `make check` | PASS — formatting, lint, TypeScript, 26 contract/domain checks, and 21 Jest tests |
| `npm run test:database` | PASS — 2 real SQLite tests, including synthetic photo relaunch persistence |
| `npm run build:web` | PASS — Expo web export completed to `dist` with photo adapter/store bundles |
| Expo permission introspection | PASS — iOS camera/microphone usage descriptions and Android `CAMERA`/`RECORD_AUDIO` permissions present |
| strict frontend audit | PASS — zero findings, warnings, or violations |
| `npm run build:ios` | BLOCKED by host toolchain — xcodebuild exit 70; the selected simulator destination requires an iOS 26.5 platform that is not installed |

## Device and browser evidence

- [Photo permission action-needed state](./photo-permission-action-needed.png)
  shows the Camera route in photo mode with a clear camera-only permission
  request and no capture control before access is granted.
- [Simulator/Expo Go device attempt](./simulator-expo-go-dev-menu-blocked.png)
  records the environment-specific first-run developer-menu overlay. Computer
  Use could not inspect the Simulator app state (`-10005`), so this is not
  presented as proof of physical camera capture.

The available host could not complete a supported physical-device photo
capture/relaunch run. This limitation is escalated rather than replaced with a
fake success: mocked camera/file ports, domain policy, and real local SQLite
relaunch verification pass, while native camera capture and durable media
playback remain unverified until a supported physical device or installed iOS
platform is available.
