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
