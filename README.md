# Rewind V1

Rewind is a local-first mobile prototype of a private group time-capsule app.
V1 deliberately exercises real phone capabilities without connecting to a cloud
backend. It is the foundation for a later cloud-enabled product, not the course
submission itself.

## Start here

- [`planning/`](planning/README.md) — source material, V1 scope, research,
  decisions, backlog, and the agent workflow.
- [`apps/`](apps/README.md) — future runnable applications; the Expo mobile app
  belongs here.
- [`packages/`](packages/README.md) — future reusable domain and UI modules.
- [`infra/`](infra/README.md) — future infrastructure and Terraform boundary.
- [`docs/`](docs/README.md) — future engineering documentation and diagrams.
- [`evidence/`](evidence/README.md) — versioned ticket-completion proof.
- [`AGENTS.md`](AGENTS.md) — mandatory operating contract for coding agents.

## Developer commands

Run `make help` from the repository root for the local development, Fast
Refresh, platform, build, and quality commands. The shortest clean-start path
is:

```bash
make install
make start
```

Run `make check` before opening a pull request. The mobile workflow also runs
the same static checks and a local web export without requiring an emulator,
cloud account, or repository secret.
