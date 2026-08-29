# Rewind planning

Planning is versioned alongside the application so an agent can understand what
to build, why it exists, and what is next without treating the repository as a
single `src/` folder.

## Start in this order

1. [`source-material/`](source-material/README.md) — immutable copies of the
   Rewind and SWE5006 materials that informed the work.
2. [`v1-prototype-spec.md`](v1-prototype-spec.md) — the authoritative local,
   cloud-free V1 boundary and acceptance behaviour.
3. [`research/`](research/README.md) — current technical findings behind the
   stack choices.
4. [`decisions/`](decisions/README.md) — durable architecture decisions and
   their consequences.
5. [`backlog/`](backlog/README.md) — GitHub epic/ticket map and dependency
   order.
6. [`agent-operating-protocol.md`](agent-operating-protocol.md) — the
   incremental ticket procedure in fuller detail.

The GitHub Project is the live execution queue. This directory is its
version-controlled companion, not a second competing backlog.
