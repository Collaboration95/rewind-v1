# Issue #19 completion evidence

- Issue: https://github.com/Collaboration95/rewind-v1/issues/19
- Branch: `codex/19-local-group-home`
- Implementation commit: `4fd291e`
- Evidence uses seeded/synthetic data only; no personal media is included.

## Acceptance coverage

- The Home route restores the seeded group name, weekly prompt, cycle status,
  active simulated actor, per-member five-slot/30-second quota, and local-only
  disclosure through a local repository port.
- Lock-safe activity is composed with the domain
  `listPreRevealContributionSummaries` view model. It shows member, media kind,
  duration, vignette metadata, and lifecycle state without mounting a player,
  thumbnail, or local media URI.
- The invite card is an explicit local preview. Its expanded state says that
  it is not delivered and has no network or deep-link path.
- Loading, empty activity, missing-cycle policy, repository failure, and retry
  states have stable test IDs, semantic labels, and actionable controls.
- The real SQLite test persists a synthetic photo metadata record and retrieves
  it after reopening; component tests cover the seeded Home view, safe-media
  boundary, invite preview, loading/empty/policy/error states, quota, and
  member activity.

## Verification

| Check | Result |
| --- | --- |
| `make check` | PASS — formatting, lint, TypeScript, 27 contract/domain checks, and 27 Jest tests |
| `npm run build:web` | PASS — Expo web export completed to `dist` |
| Expo permission introspection | PASS — existing iOS camera/microphone usage descriptions and Android camera/audio permissions remain present |
| strict frontend audit | PASS — zero findings, warnings, or violations |

## Browser and device evidence

- [Home local-restore action-needed state](./home-local-restore-action-needed.png)
  shows the browser's actionable retry state when static web SQLite cannot be
  restored. The seeded ready state is covered by injected component tests and
  real SQLite tests.
- The iOS simulator screenshot from the same host is retained in
  [the device evidence file](./simulator-expo-go-dev-menu-blocked.png). Expo
  Go's first-run developer-menu sheet and the Computer Use timeout (`-10005`)
  prevented an honest manual profile-switch interaction, so no device success
  is claimed.

The available host could not complete the simulator/device profile flow. This
limitation is recorded rather than replaced with a fake success: local
repository, policy-safe view-model, component, and SQLite relaunch checks pass;
manual device navigation remains to be rerun on a supported native target.
