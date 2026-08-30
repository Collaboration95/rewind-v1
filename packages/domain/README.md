# Rewind domain package

This package owns framework-independent V1 models, state vocabulary, local-safe
view types, repository ports, deterministic fixtures, and time/transaction
capabilities. It must not import React Native, Expo, SQLite, cloud SDKs, route
modules, or vendor-specific clients.

The package remains implementation-free. The device-local SQLite adapter in
`apps/mobile/data/local/` implements these ports without adding persistence or
vendor dependencies to this package.

Run its checks from the repository root:

```bash
npm --prefix packages/domain run typecheck
npm --prefix packages/domain test
```

The pure test runs with Node's TypeScript type stripping and imports no UI. The
synthetic fixture is the deterministic `The Sunday Room` group with Ava, Ben,
Cleo, Dev, and Finn; the prompt `What deserves a frame this week?`; one
collecting cycle; one locked three-second photo; one locked five-second video;
one chat message; and a demo-cycle clock. It includes both media kinds so the
approved local media contract stays visible at the domain boundary.

## Contribution policy

`src/policy/` contains pure commands for capture validation, processing and
retry transitions, one-delete quota restoration, and lock-safe pre-reveal
summaries. The policy accepts an injected normalized simulated-week key and
audit-event ID; it does not calculate timezone/DST boundaries or perform device
I/O. Rejections always include a user-safe reason and an audit event. Delete
audits carry the normalized week key and can be rehydrated after relaunch. V1
allows five contributions and 30 total seconds per member/cycle, fixed
three-second photos, 1–15 second videos, one retry, and one delete per
simulated week.

## Simulation and capsule assembly

`src/time/` advances an injected instant by deterministic minute, day, or
four-week-equivalent steps without sleeping. `real` mode is intentionally a
no-op for the simulation command because a device clock adapter supplies that
instant. `src/capsule/` and `src/cycle/` document the collecting →
reveal-pending → premiere → archived path and the delayed processing-failure
path. The assembler returns a `local-playlist` containing chronologically
ordered eligible contribution IDs; it never creates a combined media file or
chooses a low-contribution filler policy.
