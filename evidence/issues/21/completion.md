# Issue #21 completion

- Issue: https://github.com/Collaboration95/rewind-v1/issues/21
- Branch: `codex/21-device-capability-permissions`
- Implementation commit: `f5c8872`

## Acceptance coverage

- The Camera route and capture feature depend on `CameraCapabilityPort`; only
  `platform/camera/expo-camera-permissions.ts` imports Expo Camera and native
  settings APIs.
- The preflight renders accessible loading, grant, ready, denied/retry,
  blocked/settings, unsupported/retry, and failed-check states.
- Photo requires camera permission. Video adds microphone permission, and
  `app.json` documents iOS camera/microphone copy plus Android `RECORD_AUDIO`.
- Jest + React Native Testing Library injects capability ports to exercise the
  simulator-safe permission states without requiring physical hardware.
- Recording controls are intentionally absent until the capture ticket.

## Verification

- `make check` — PASS: workflow YAML, format, lint, typecheck, 24 contract
  tests, and 8 component tests.
- `npm run build:web` — PASS: static Expo web export completed.
- `npx expo config --type introspect --json` — PASS: iOS camera and microphone
  usage descriptions and Android `CAMERA`/`RECORD_AUDIO` are present.
- `audit_project.py . --mode strict --no-write` — PASS: zero findings.
- Browser smoke on the static export — PASS: Camera tab rendered the local
  permission preflight, photo/video choices, actionable camera grant state,
  and the no-recording disclosure. Screenshot: [`camera-permission-action-needed.jpg`](camera-permission-action-needed.jpg).

## Limitation

The browser sandbox left its real camera request pending, so no physical
camera or microphone prompt is claimed here. Real-device permission proof is
deferred to the capture ticket as required by the issue contract; the mocked
state tests remain the deterministic verification for this slice.
