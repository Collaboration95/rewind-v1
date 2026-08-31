# Rewind V1 handoff — 31 August 2026

## Resume point

The repository is clean on `main` at `d3693bb7140b6ef5e24068901566e1fadd844d3a`.
That merge contains PR [#60](https://github.com/Collaboration95/rewind-v1/pull/60), which closed issue [#25](https://github.com/Collaboration95/rewind-v1/issues/25). Its V1 Project item is **Done**.

The completed slice adds the local contribution deletion/failure/retry lifecycle:

- one accepted pre-reveal deletion per simulated week;
- removal of the app-managed local file before saving `deleted` with `localUri: null`;
- quota restoration after that deletion;
- policy rejection of a second same-week delete without file, metadata, or quota mutation;
- an injected test-only processing-failure seam and one bounded retry of the same record;
- an inline delete confirmation and stable accessibility/test contracts; and
- no pre-reveal URI, player, thumbnail, image, or video surface.

The principal implementation files are:

- `apps/mobile/features/capture/local-contribution-review-store.ts`
- `apps/mobile/features/capture/ContributionReviewPanel.tsx`
- `apps/mobile/tests/local-contribution-review-store.test.ts`
- `apps/mobile/tests/contribution-review.test.tsx`
- `apps/mobile/tests/contribution-review-contract.test.mjs`
- `evidence/issues/25/completion.md`

## What was verified

All checks passed on the merged change:

| Command | Outcome |
| --- | --- |
| `make typecheck` | Mobile and domain TypeScript checks passed. |
| `npm --prefix apps/mobile test -- --runInBand tests/local-contribution-review-store.test.ts tests/contribution-review.test.tsx` | First delete/quota restore, second-delete refusal, storage error safety, failure/retry/lock, confirmation, and media-locator absence passed. |
| `make check` | Workflow parse, Prettier, ESLint, TypeScript, contract/domain tests, and Jest all passed. |
| `make build-web` | Expo web export passed. |
| strict frontend audit | Zero findings, warnings, and violations. |
| GitHub PR checks | Both Mobile static-check runs and GitGuardian passed before merge. |

Issue #25’s evidence is committed at `evidence/issues/25/`:

- `completion.md` explains the policy-to-UI contract and verification;
- `browser-review-restore-action-needed.jpg` is a synthetic browser screenshot of the recovery state.

## Known limitations (do not overstate success)

1. The exported browser build renders the Camera route, permission preflight, and accessible review-recovery state. Its local SQLite-backed review does **not** restore in that browser environment. Do not describe browser evidence as a successful delete/retry journey; deterministic component/store tests prove those transitions instead.
2. Native iOS remains unavailable on this host: simulator destination `5F659D47-CF47-4296-A1AC-B41CFF0830C5` requires the absent iOS 26.5 platform, so `xcodebuild` exits 70. Do not claim physical capture, file copy, notification, or haptic success until a supported simulator/device is available.
3. V1 remains deliberately local-first. Do not add cloud SDKs, servers, remote auth, remote storage/database, analytics, production push, Terraform, or M2 adapter work while executing V1 tickets.

## Project state and next ticket

There is no non-epic V1 issue currently marked **Ready**. The intended next local ticket is [#26 — Persist local reminder preferences and schedule a device notification](https://github.com/Collaboration95/rewind-v1/issues/26), currently **Backlog**. Its dependencies (#18 and #15) are already done.

At the start of the next work session:

1. Read `AGENTS.md`, `README.md`, `planning/README.md`, the active issue, its dependency state, and relevant reminder/planning documents.
2. Run `git status --short`, `git log --oneline -12`, and inspect the V1 Project. Confirm that there is still no other Ready non-epic item.
3. If #26 remains the appropriate dependency-satisfied next slice, move it **Backlog → Ready**, create `codex/26-local-reminder-preferences`, post the mandated start comment, and move it to **In progress**.
4. Keep the change bounded to local reminder preferences, local notification permission/recovery, weekly schedule representation, one-shot demo schedule/cancel/update behavior, and synthetic evidence. Device notification capability must remain behind a port; prefer a local adapter and persistence through the existing SQLite repository.
5. Stop and add an issue comment if native configuration, remote delivery, background guarantees, or permission behavior requires an unapproved decision.

## Remaining V1 execution order

The next local roadmap is still:

1. S3: #26 reminder persistence/scheduling, then #27 deep-link/fallback, #28 settings/reset, #29 local messages, #30 reply/reaction, #31 chat guards/evidence.
2. S4: #32 simulation/reveal controls, #33 archive playback, #34 guarded sharing, #35 deterministic policy fixtures, #36 Maestro smoke evidence, #37 accessibility audit, #38 release rehearsal.

Keep #39–#41 (M2/cloud/Terraform) blocked. They are outside the current V1 local-feature authority.

## Operating details worth preserving

- Use one issue, one focused branch, and one PR. The required branch convention is `codex/<issue>-<slug>`.
- The repository’s root `Makefile` owns normal checks: `make check`, `make build-web`, and the specific platform commands. Run commands from repository root.
- Store issue proof beneath `evidence/issues/<issue-number>/` with `completion.md`, synthetic screenshots, and an explicit limitations section.
- Use `npx expo install` for any intentional Expo-native dependency addition. Do not change versions opportunistically.
- The visual system’s runtime tokens are owned by `apps/mobile/components/tokens.ts`; preserve the existing original darkroom/contact-sheet direction. Do not introduce copied reference assets, previews before reveal, gradients, arbitrary tokens, or native dialog/alert behavior where an app-owned accessible surface is needed.
- For any UI work, retain stable `testID` values and descriptive accessibility labels. Product state transitions belong in domain policy/store boundaries; screens coordinate them but do not reimplement quotas or permission rules.
