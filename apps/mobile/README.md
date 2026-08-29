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

The template selection is reproducible in an empty directory with
`npx create-expo-app@4.0.0 <directory> --template
expo-template-default@57.0.20 --no-install --no-agents-md`; this ticket then
trims the generated starter to the single local landing route.

The checked local baseline on 2026-08-29 is Node `26.3.1`, npm `11.16.0`, and
Xcode `26.6` with an iOS 17.5 simulator. Expo Go is the scaffold verification
path; a local development build remains the intended path once native device
capabilities are added. CocoaPods and Android tooling are not required by this
initial screen and are not claimed as verified here.

## Install and run

From this directory:

```bash
npm ci
npm run lint
npm run typecheck
npm run start
```

For the verified simulator path, boot an available iPhone simulator and run:

```bash
npm run ios
```

The Expo CLI menu can also open the project in Expo Go. Later native-capability
tickets must document a development-build command separately when Expo Go no
longer provides the required module surface.

## Scope of this ticket

The first route is an original, static Rewind landing state: it identifies the
V1 local-only boundary and uses synthetic copy only. Camera capture, persistence,
tabs, chat, reminders, playback, and the simulation console are intentionally
left for their dependency-ordered tickets.

Do not turn the repository root into an Expo application. Keep generated native
folders, build output, local environment files, and credentials out of Git.
