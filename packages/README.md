# Reusable packages

Reusable product code belongs here. Planned boundaries are:

- [`domain/`](domain/README.md) — pure policies, state transitions, models, and
  repository ports.
- [`ui/`](ui/README.md) — shared Rewind visual primitives and tokens.

Create or extend a package only when an issue gives it a concrete consumer and
verification path. The active [`domain/`](domain/README.md) package is the
framework-free boundary established by issue #14.
