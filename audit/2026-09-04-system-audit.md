# Rewind V1 system audit — 2026-09-04

## Scope and evidence

This audit reviewed every tracked source/configuration/documentation file in
the workspace, the live Rewind V1 GitHub Project and all 44 GitHub issues, the
merged PR history, current CI configuration/results, local quality commands,
and the locally served Expo web UI. It does not modify app code.

The repository was at `46800ae` on `main`; the pre-existing worktree contained
only six untracked `.DS_Store` files. The audit branch is
`codex/63-v1-ready-queue-audit`.

## System model

Rewind is a local-first Expo/React Native prototype, not a cloud product. The
mobile app lives in `apps/mobile`; the pure TypeScript product model and policy
live in `packages/domain`. Expo adapters isolate camera permissions/capture,
document-directory files, SQLite, haptics, and local notifications. SQLite
holds seeded profiles, a group/cycle, contributions, reminders, and audit
events. There is no application network client, remote auth, cloud SDK, remote
database, object storage, or analytics code.

The normal local flow is:

1. Local session selects one of five synthetic profiles.
2. Capture adapters request camera/microphone access, capture a photo or
   capped vertical video, and copy it into app-managed storage.
3. Domain policy applies group membership, cycle, duration, quota, processing,
   lock, and deletion rules; SQLite persists state and audit events.
4. Local reminders schedule device notifications behind a port.
5. Planned work will add notification response/fallback, chat, simulation,
   reveal, archive playback/sharing, and end-to-end device evidence.

## What is built versus planned

At discovery, the live project contained 44 issues: 18 closed and 26 open. In
Project 7, 17 implementation items were Done, #26 was in Review, 21 were
Backlog, and five were Blocked. No item was Ready. The five audit issues filed
from these findings were subsequently added to Backlog.

Implemented and evidenced slices are the Expo workspace/quality rails, the
four-tab shell, framework-free domain model/policy, SQLite seeding, profile
switching, group home, capture permissions, photo/video local persistence,
review/lock/deletion/retry, original metadata-only treatments/haptics, and
local reminder preferences/scheduling.

The Chat and Archive tabs intentionally remain placeholders. Their required
work is already represented by #29–#31 and #32–#34. Settings deliberately
states that reset and notification history arrive later (#27–#28). These are
roadmap gaps, not duplicate defects. Final policy coverage, Maestro smoke
automation, full accessibility/device audit, and release rehearsal remain
#35–#38.

## Verification performed

| Check | Result |
| --- | --- |
| `make check` | PASS: workflow YAML, Prettier, ESLint, TypeScript, 34 contract/domain tests, 13 Jest suites / 53 tests |
| Current GitHub Actions `Mobile static checks` on `main` | PASS |
| `git diff --check` | PASS |
| `git fsck --no-reflogs --full` | No corruption; local unreachable objects are reported separately below |
| GitHub secret-scanning alerts API | Empty result |
| Static local-first scan | No application remote/network client, cloud SDK, or credential artifact found |
| Local web runtime | Home, Camera permission fallback, and Chat placeholder rendered and navigated successfully |

`make check` is not fully clean: Node emits two
`MODULE_TYPELESS_PACKAGE_JSON` warnings while executing SQLite contract tests;
this is filed as #66.

`npm audit` could not supply usable advisory output in this environment despite
`npm config get audit` returning `true`; no vulnerability claim is made from
that inconclusive result.

## Runtime and UX observations

The local browser run showed a legible, coherent dark camera-first shell with
plain local-only disclosures, tabs with accessible names, profile switching,
quota/locked metadata, and a permission recovery state. The Camera screen
truthfully did not claim browser camera success and offered the permission
action needed. The Chat screen clearly says it is a future local slice.

The actual mobile viewport, native camera/microphone flow, notification banner,
screen-reader traversal, Dynamic Type, reduced motion, Android behaviour, and
capture-to-reveal journey were not fully re-tested here. Existing evidence
contains an iOS 26.5 simulator settings capture for #26; current native camera,
archive, chat, and cross-platform proof remain future-ticket work. A screenshot
can establish visible hierarchy but cannot prove accessibility compliance or
native device behaviour by itself.

## Accepted findings

The five actionable findings are indexed in [README.md](README.md). They were
all filed as dedicated issues, avoiding duplication of existing roadmap items.

The highest-impact defect is #67: review submission accepts an arbitrary
non-empty local URI. `LocalMediaFilePort.exists` is available and used at
capture time, but never used by the review load/submission path. A deleted file
can therefore be reported as stored, then lock and consume quota. The pure
domain policy correctly cannot inspect device files, so the verification belongs
at the application/adapter boundary.

The major planning/process blocker is #63: no issue is in Ready although the
repository contract prohibits starting a Backlog/Blocked/Review ticket. The
remaining V1 work cannot legitimately start until dependencies and the Ready
queue are reconciled.

## Non-findings and deliberate exclusions

- No current evidence supports a credential, secret, cloud-boundary, injection,
  or copied-branding finding.
- Chat, simulation, archive playback/sharing, notification deep links, reset,
  Maestro, and final accessibility/release verification are deliberately
  unfinished and already have scoped backlog issues; they are not restated as
  defects.
- Dangling Git objects found by `git fsck` are local unreachable historical
  objects, not corruption or a remotely visible issue. They were not filed.
- The web runtime is a diagnostic path, not evidence that camera capture,
  SQLite media persistence, haptics, or notification delivery works on a real
  phone.

## Recommended execution order

1. Triage #63 and move only the next dependency-free implementation item to
   Ready after #26 completes review.
2. Fix #67 before further capture/reveal work, because it protects a current
   completed acceptance criterion and future archive reliability.
3. Enable #65 main protection so each follow-up lands through the validated
   quality path.
4. Resolve #66 and #64 as contained delivery-hygiene tasks.
5. Resume the planned V1 dependency chain: #27/#28, #29–#31, #32–#34,
   #35–#38.
