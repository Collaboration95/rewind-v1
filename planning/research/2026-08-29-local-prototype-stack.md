# Local prototype stack research

**Date:** 2026-08-29  
**Decision scope:** V1 only — real device capabilities, no Rewind cloud services

## Recommendation

Build one TypeScript Expo/React Native application in `apps/mobile`, using Expo
Router and development builds as the normal capability target. Use local SQLite
and the device document directory as the only persistence boundary. Build the
visual language with React Native primitives and a small in-repo token layer,
not a large UI kit. This is deliberately a learning-friendly stack with clear
future seams rather than a miniature production backend hidden inside the app.

| Concern | V1 choice | Why it fits |
| --- | --- | --- |
| App/runtime | Expo + React Native + TypeScript | One source tree runs on iOS, Android, and web; the Expo starter includes current configuration conventions. |
| Navigation | Expo Router | File-based routes, typed/deep-link-ready navigation, and native/web support without a separate routing setup. |
| Product rules | Framework-free `packages/domain` | Lets quotas, cycle transitions, and privacy policy be tested without a phone, and allows a future API adapter. |
| Persistence | `expo-sqlite` | Durable local relational state for members, cycles, clips, messages, and an event log. |
| Captured media | `expo-camera` + `expo-file-system` | Record a real short video, then copy it from cache into the app document directory before recording metadata. |
| Playback/export | `expo-video` + `expo-sharing` | Play a locally revealed item and invoke the native share sheet; neither requires a Rewind server. |
| Reminders | `expo-notifications` local scheduling | Exercises permission, scheduling, tapping, settings, and deep links without remote push credentials. |
| Feedback | `expo-haptics` | Gives capture/lock/reveal actions real device feedback with a small, explicit adapter. |
| UI | React Native primitives, `StyleSheet`, tokens, `FlatList` | Fast to inspect and own; five seeded members do not justify a component library or feed virtualization dependency yet. |
| Unit/integration tests | Jest + `jest-expo` + React Native Testing Library | Expo's supported test path; native APIs can be mocked and policy tests run deterministically. |
| Device E2E/evidence | Maestro flows plus manual physical-device checks | Cross-platform accessibility-layer automation has no app dependency and produces repeatable UI proof. |

## Important capability findings

1. Expo currently recommends its latest SDK for new projects; its Router guide
   documents SDK 57 as the current latest while stock Expo Go is intentionally
   behind for learning compatibility. The scaffold ticket must record the
   actual SDK selected. Prefer a local development build for the real-phone
   path; only deliberately use the Expo-Go-compatible SDK when QR onboarding
   is more important than native-module flexibility.
2. `CameraView.recordAsync` returns a temporary local URI. V1 must copy the
   recording immediately into the document directory; a cached URI is not a
   durable contribution.
3. Camera video recording is a native-device capability. A simulator can prove
   layouts and mock adapters but not provide the acceptance evidence for a real
   recorded clip. Android video with audio requires the declared microphone
   permission.
4. Expo notifications supports local scheduled notifications in Expo Go, while
   remote push needs a development build. V1 must use local only and label it
   as a simulation of a reminder, never as multi-user delivery.
5. SQLite persists across app launches. It is appropriate for local seeded
   group data, but not a security claim: V1 has simulated profiles, not OIDC
   identities, encrypted cloud storage, or cross-device synchronization.
6. `expo-video` is the current Expo playback surface; it is more appropriate
   than inventing a player. V1's "compiled film" is a local ordered playlist,
   not an actual concatenated/re-encoded movie.
7. Maestro works against the rendered accessibility layer and recommends stable
   `testID` selectors. Every ticket that adds a key interaction should add
   testable labels/IDs at the same time.

## Deliberate non-choices

- **No remote backend or Expo API routes:** they would make local prototype
  progress depend on auth, credentials, network, and deployment before the
  product flow has been learned.
- **No Cognito, AWS SDK, S3, Terraform resources, EAS cloud service, analytics,
  or remote push:** retained only as future design constraints.
- **No actual video filter pipeline or FFmpeg in V1:** the selected retro mode
  is stored as metadata and presented as an original preview overlay. Real
  post-processing requires a later native-module spike and development build.
- **No third-party UI framework:** V1 needs a small original design system,
  controlled accessibility semantics, and easy agent maintenance more than an
  extensive themed component library.
- **No cloned Instagram/Dazz Cam UI:** use familiar tabs, feed cards, bottom
  sheets, and camera-first rhythm, but create original tokens, copy, layouts,
  icons, and media treatments.

## Sources consulted

- [Expo Router introduction](https://docs.expo.dev/router/introduction/) —
  current project creation guidance, SDK/Expo Go caveat, universal routing.
- [Expo Router API](https://docs.expo.dev/versions/latest/sdk/router/) —
  file-based navigation across native and web.
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/) — video
  recording, temporary URI behaviour, quality, and Android audio permission.
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) —
  current `File`, `Directory`, and `Paths` APIs for persisting a capture.
- [Expo data storage guide](https://docs.expo.dev/develop/user-interface/store-data/)
  and [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) —
  persistent local database options.
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
  and [notification capability guide](https://docs.expo.dev/push-notifications/what-you-need-to-know/)
  — local scheduling versus development-build-only remote push.
- [Expo unit testing](https://docs.expo.dev/develop/unit-testing/) and
  [Expo Router testing](https://docs.expo.dev/router/reference/testing/) —
  Jest, `jest-expo`, and React Native Testing Library path.
- [Maestro React Native support](https://docs.maestro.dev/platform-support/react-native)
  — accessibility-layer E2E, Expo compatibility, and `testID` guidance.

## Revalidation triggers

Revisit this record if Expo's supported SDK changes, a native capability needs
a custom module, the project begins real video processing, an actual second
device joins the workflow, or the cloud-transition milestone starts.
