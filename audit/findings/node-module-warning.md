# P3 — Contract tests warn about an untyped module package

**Tracking issue:** [#66](https://github.com/Collaboration95/rewind-v1/issues/66)

The required `make check` baseline passes, but Node warns twice that
`apps/mobile/data/local/repository.ts` is being reparsed as an ES module. The
mobile package has ESM TypeScript source and no `type` declaration, whereas
`packages/domain/package.json` does declare `type: module`.

Resolve the module boundary in a way verified against Expo, Jest, TypeScript,
and the Node strip-types contract lane. A change that merely hides stderr is not
sufficient.
