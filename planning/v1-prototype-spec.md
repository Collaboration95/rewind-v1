# Rewind V1 prototype specification

**Status:** Approved planning baseline for implementation tickets  
**Date:** 2026-08-29  
**Product relationship:** A local learning prototype of the future Rewind
private group time-capsule product; it is not a submission build or cloud MVP.

## 1. Outcome

V1 makes the future product's phone experience tangible before any cloud work:
one person can use a real phone to record a short video, persist it locally,
lock it under a simulated group policy, receive a local reminder, switch among
seeded members, chat, advance a demo clock, reveal a locally assembled capsule,
play it, and invoke the device share sheet.

The primary learning outcome is end-to-end React Native/Expo practice across
permissions, camera recording, files, local storage, notifications, navigation,
accessibility, device testing, CI, Git/GitHub, and agent-led incremental work.
It does **not** prove multi-user networking, OIDC, cloud media processing, or
production privacy/security.

## 2. V1 scope

### In scope — real local phone operations

- iOS/Android camera and microphone permission request, denial/retry state,
  front/back selection, and vertical video recording capped at 15 seconds.
- Capture review with discard/re-record; persist the accepted file from cache to
  the app document directory and persist its metadata in local SQLite.
- Original visual camera shell: a selectable `Flash`, `CCD`, `Home Movie`, or
  `Tape` preset represented by original overlay treatment and stored metadata.
  It does not claim to alter video pixels yet.
- On-device haptic feedback for record, successful lock, and reveal.
- Local profile switcher for five seeded people in one seeded private group;
  profile data is a demo device control, never sign-in.
- Cycle, week, submission-count, duration, and one-delete allowance enforced by
  a pure domain policy and stored local state.
- Locked contribution UI that shows aggregate metadata but hides the media
  player until reveal. A contributor may delete once within its simulated week.
- Local scheduled weekly reminder settings, one-shot demo reminder, deep-link
  handling, and an in-app notification log/fallback.
- Persistent local text chat with a reply and one reaction type; messages are
  authored as the currently selected simulated member.
- A visible developer-only simulation console for advancing/resetting a
  deterministic clock and moving a cycle to reveal.
- A locally generated capsule playlist ordered by capture time; archive video
  playback and the native share sheet after reveal.
- Original camera-first, dark, nostalgic social-feed visual language using
  familiar tab/feed patterns, rather than copied screens or assets.

### Simulated in V1

| Future product behaviour | V1 simulation and label |
| --- | --- |
| OIDC, invite links, 2–10 real users | Seeded profiles and a local invite-preview screen. “Local demo only” is always visible in developer mode. |
| Asynchronous upload/FFmpeg job | A deterministic local processing timer/state sequence with failure/retry test controls. |
| Actual filter/transcode/audio normalization | Preset metadata and visual overlay only; source video is otherwise untouched. |
| Four-week cycle and scheduling service | Configurable local clock; one-minute demo, one-day demo, and four-week-equivalent policy modes. |
| Scheduled server push to many devices | Device-local notification only, plus in-app log. |
| Compiled group film in storage | A local ordered playlist; no media concatenation/re-encode. |
| Secure download URL | Native local share sheet for an already-local revealed file. |

### Explicitly out of scope

- Network connections of any kind for Rewind: no backend, cloud services,
  Cognito, remote database, remote object storage, WebSockets, analytics,
  third-party auth, Expo push service, API routes, Terraform execution, or EAS
  cloud build/deploy.
- Real multi-device synchronization, real invitation delivery, public feeds,
  profiles, followers, gallery import, image posts, attachment chat, read
  receipts, edit/delete messages, live stream, public sharing, or app-store
  publication.
- Actual non-destructive video trimming, true post-processing, custom GPU
  filters, FFmpeg, merged media output, thumbnail extraction, licensed music,
  or a claim that a demo profile provides security.
- Copying Dazz Cam, Instagram, Lapse, 1SE, or another product's brand, source,
  assets, filters, visual design, camera names, or text.

## 3. Reference journey

1. Open Rewind on a physical device. The app restores the selected synthetic
   profile and the one seeded group.
2. On **Home**, see the current prompt, simulated time left, weekly quota, and
   lock-safe group activity (no playable unrevealed clips).
3. Go to **Camera**, approve camera/microphone permissions, choose a preset,
   record up to 15 seconds, then review it.
4. Accept the clip. Rewind copies it into app storage, records its metadata,
   briefly shows `Processing`, and changes it to `Locked`; haptics confirm the
   result. The clip cannot be replayed from the normal pre-reveal UI.
5. Use the developer console to switch a profile, add a chat message/reply/
   reaction, advance time, or fire a short demo reminder.
6. Move the clock through the reveal boundary. The capsule shows `Premiere`,
   then lists the ordered locally stored items. Play one item and use the native
   share sheet. Archive state remains available after a reset/relaunch.

The demo must also show a denied permission path, an over-budget rejection, a
second-delete rejection, and a processing failure/retry state. These are product
behaviours, not merely mocked screenshots.

## 4. Information architecture and screen contract

| Route/screen | Purpose | Key observable controls |
| --- | --- | --- |
| `/(app)/home` | Group overview, prompt, quota, locked metadata, reveal status | Camera tab, chat tab, quota, developer-console access |
| `/(app)/camera` | Record device video under a selected visual preset | permission retry, preset selector, camera flip, record/stop, timer |
| `/(app)/capture-review` | Accept or discard the new local file | submit/lock, re-record, file/preset summary |
| `/(app)/chat` | Local group text, replies, reactions | composer, reply, reaction, profile label |
| `/(app)/archive` | Revealed capsules and local playback | capsule selector, player, share button |
| `/(app)/settings` | Local reminder preference and app/device status | enable/disable, schedule, demo reminder, reset confirmation |
| `/(dev)/simulation` | Seed profile, clock, failure and scenario controls | profile selector, time advance, reveal, reset, inject failure |

Navigation is a four-tab shell: Home, Camera, Chat, Archive. Settings and the
simulation console are secondary routes. The future product can retain the
information architecture while replacing only its local adapters.

## 5. Domain model and policy

The first domain ticket creates types and repository ports independent of Expo
or React. The local SQLite adapter is the first implementation.

```text
Member(id, displayName, avatarSeed)
Group(id, name, timezone, memberIds, prompt)
Cycle(id, groupId, startAt, duration, status)
Contribution(id, cycleId, memberId, capturedAt, durationSeconds,
             preset, localUri, state, processingAttempt, deletedAt)
Message(id, groupId, memberId, body, replyToId, createdAt)
Reaction(id, messageId, memberId, emoji)
Capsule(id, cycleId, contributionIds, status, revealedAt)
ReminderPreference(memberId, enabled, weekday, hour, minute, notificationId)
SimulationClock(now, mode)
AuditEvent(id, type, at, subjectId, metadata)
```

### Contribution state machine

```text
recording → captured → processing → locked ───────→ revealed → archived
                         │               │
                         ├──→ failed ────┘ (retry once in V1)
                         └──→ deleted (only once per simulated week)
```

- Capture may begin only when the current member belongs to the local group,
  the cycle is collecting, the weekly clip count remains below five, and the
  current used duration plus the new clip is no more than 30 seconds.
- A clip duration is 1–15 seconds. The capture adapter must stop at 15 seconds;
  policy also rejects invalid test data.
- The first permitted deletion in a cycle-week restores its clip count/duration
  budget. A second delete is rejected with a clear reason and audit event.
- Processing may fail by test control. Retry is explicit, bounded, idempotent,
  and cannot create two locked contributions from the same captured file.
- Before reveal, normal UI may show only member-independent aggregate count,
  used seconds, preset name if desired, and status. It must not mount an
  unrevealed media player or a visual thumbnail.

### Cycle state machine

```text
collecting → reveal_pending → premiere → archived
                  │               │
                  └──→ delayed ───┘ (processing failure path)
```

The simulation console is the only V1 route allowed to advance clock/cycle
state directly. Production-style screens request domain commands and react to
the persisted result. A `CapsuleAssembler` produces a chronological list of
revealed contribution IDs; V1 calls this a playlist, never a rendered film.

## 6. Technical architecture and folder topology

```text
rewind-v1/
├── apps/
│   └── mobile/              Expo application, routes, platform adapters, assets, tests
├── packages/
│   ├── domain/              Pure models, policies, state machines, ports, fixtures
│   └── ui/                  Original tokens and reusable visual primitives
├── planning/                Source material, spec, ADRs, research, issue map
├── docs/                    Later implementation/operations documentation
├── evidence/issues/         Committed per-ticket screenshots and verification notes
├── infra/terraform/         Reserved future IaC boundary; empty of resources in V1
└── .github/                 Issue forms and later workflows
```

Within `apps/mobile`, use feature ownership rather than one global `src/`:

```text
app/                         Expo Router route files only
features/{capture,group,chat,archive,reminders,simulation}/
platform/{camera,files,notifications,haptics,sharing}/
data/local/                  SQLite migrations, local repository, seed/reset
components/                  app-only composition components
tests/                       router/component tests outside app/
```

The permitted dependency direction is:

```text
routes/components → feature commands → domain ports/policies
platform + data/local ────────────────┘
```

No domain policy imports React, Expo, SQLite, or device modules. A later cloud
app can implement the same repository and capability ports while the V1 local
adapter remains a usable development/demo mode.

## 7. UX and visual direction

The UI should feel camera-first and intimate: charcoal/navy surfaces, warm
off-white type, restrained acid-lime or flash-orange accents, grain/noise as an
original decorative texture, oversized cycle countdown, compact serif-like
display face only if appropriately licensed, and a crisp system sans body face.
Use a clean, familiar bottom tab layout and stacked message/feed cards so the
journey is immediately learnable, but do not recreate another app's screen.

Accessibility is a non-negotiable V1 acceptance condition: semantic labels,
44pt minimum hit targets where practical, visible focus/pressed states,
contrast-safe text, Dynamic Type-aware layouts, no colour-only state signal,
reduced-motion respect, and a text equivalent for the timer/preset/locked
state. Every testable action needs a stable `testID`.

## 8. Definition of ready and done

### A ticket is Ready only when

- its parent epic and stable key exist in GitHub;
- dependencies are Done;
- scope, non-goals, observable acceptance criteria, and evidence method are
  explicit;
- likely files/ownership boundary and verification command are named; and
- no unresolved product/privacy/device decision changes the design.

### V1 is Done only when

1. A clean install or reset seeds the documented five-member group and opens
   the local demo without network configuration.
2. A physical iOS or Android device records/persists a vertical, audio-enabled
   15-second-or-less synthetic clip using app permissions.
3. Policy tests and UI evidence prove quota rejection, one-delete allowance,
   locked non-playback, processing failure/retry, and reveal transition.
4. A local scheduled reminder and in-app fallback work, and the app handles a
   notification navigation event.
5. Profile switching changes the synthetic actor for chat and contribution
   policy without pretending to authenticate anyone.
6. Reveal assembles a deterministic chronological playlist; a revealed item
   plays from local storage and invokes the native share sheet.
7. Lint, typecheck, domain/component tests, and the defined Maestro smoke flow
   pass. Each visual/capability ticket has committed synthetic evidence and a
   GitHub issue completion comment.
8. The README, ADRs, GitHub Project, Git history, and evidence folder allow a
   new local agent to choose the next Ready ticket without oral context.

## 9. Deferred cloud transition

The imported proposal remains the source for the future modular-monolith and
Terraform direction. Start its milestone only after V1 passes the definition of
done. The first transition work is interface and data-contract validation, then
a minimal backend/identity spike, then separately reviewed Terraform modules.
Do not provision an AWS resource merely to make the repository look complete.

See [`backlog/v1-github-backlog.md`](backlog/v1-github-backlog.md) for the
dependency-ordered implementation programme and
[`research/2026-08-29-local-prototype-stack.md`](research/2026-08-29-local-prototype-stack.md)
for current source-backed stack choices.
