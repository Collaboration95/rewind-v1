# Rewind domain package

This package owns framework-independent V1 models, state vocabulary, local-safe
view types, repository ports, deterministic fixtures, and time/transaction
capabilities. It must not import React Native, Expo, SQLite, cloud SDKs, route
modules, or vendor-specific clients.

The package is intentionally implementation-free in this slice. Local SQLite,
device, and policy adapters implement these ports in later issues.

Run its checks from the repository root:

```bash
npm --prefix packages/domain run typecheck
npm --prefix packages/domain test
```

The pure test runs with Node's TypeScript type stripping and imports no UI. The
synthetic fixture includes both a photo and a video so the approved media
contract stays visible at the domain boundary.
