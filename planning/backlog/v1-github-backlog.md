# V1 GitHub backlog

**Project:** `Rewind V1 — local prototype`  
**Milestone:** `V1 — local phone prototype`  
**Execution model:** one bounded GitHub issue → one branch → one reviewable PR →
committed synthetic proof → issue status `Review`.

**Live project:** [Rewind V1 — local prototype](https://github.com/users/Collaboration95/projects/7)  
**Initial selectable work:** [#10 — Scaffold the Expo mobile workspace](https://github.com/Collaboration95/rewind-v1/issues/10)

Every GitHub issue carries an `agent-orchestration:issue-key=<key>` marker.
That marker, rather than a mutable title, is the idempotency key for remote
creation and the bridge between this file, the Project, Git history, evidence,
and agent handoffs.

## Epic hierarchy

| Key | Epic outcome | Initial status |
| --- | --- | --- |
| [`v1-epic-foundation`](https://github.com/Collaboration95/rewind-v1/issues/1) | A repeatable Expo workspace and agent delivery rails. | Backlog |
| [`v1-epic-domain`](https://github.com/Collaboration95/rewind-v1/issues/2) | Local data, policies, clock, and simulation behaviour are deterministic. | Backlog |
| [`v1-epic-group`](https://github.com/Collaboration95/rewind-v1/issues/3) | Seeded profiles can safely act within one local private group. | Backlog |
| [`v1-epic-capture`](https://github.com/Collaboration95/rewind-v1/issues/4) | A real device can capture, persist, lock, and manage a contribution. | Backlog |
| [`v1-epic-reminders`](https://github.com/Collaboration95/rewind-v1/issues/5) | Local reminder preference, delivery, and fallback are observable. | Backlog |
| [`v1-epic-chat`](https://github.com/Collaboration95/rewind-v1/issues/6) | Seeded group members can send/reply/react to persistent local chat. | Backlog |
| [`v1-epic-archive`](https://github.com/Collaboration95/rewind-v1/issues/7) | A simulation can reveal, play, archive, and share a local capsule playlist. | Backlog |
| [`v1-epic-quality`](https://github.com/Collaboration95/rewind-v1/issues/8) | Automated checks and device evidence prove the V1 definition of done. | Backlog |
| [`m2-epic-cloud-transition`](https://github.com/Collaboration95/rewind-v1/issues/9) | Future cloud/adapter/Terraform work is visible but not prematurely started. | Blocked |

## Dependency-ordered child issues

Only the first ticket is initially **Ready**. A maintainer promotes the next
dependency-free ticket after reviewing its prerequisite evidence. This prevents
the solo local agent from implementing speculative work against an unstable
foundation.

| Order | Key | Child issue | Area | Size | Risk | Depends on | Initial status |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `v1-foundation-001` | Scaffold the Expo mobile workspace under `apps/mobile` | Mobile | S | Medium | — | **Ready** |
| 2 | `v1-foundation-002` | Add mobile quality rails and baseline GitHub Actions checks | DevEx | S | Low | 001 | Backlog |
| 3 | `v1-foundation-003` | Add original visual tokens and four-tab route shell | Mobile | M | Low | 001, 002 | Backlog |
| 4 | `v1-foundation-004` | Establish testing, accessibility, and evidence selector contract | Quality | S | Low | 001, 002 | Backlog |
| 5 | `v1-domain-001` | Define framework-free local domain models and repository ports | Domain | M | Medium | 002 | Backlog |
| 6 | `v1-domain-002` | Implement SQLite migrations, seed fixtures, and resettable local repository | Domain | M | Medium | 001, 001-domain | Backlog |
| 7 | `v1-domain-003` | Implement contribution budget and lifecycle policy state machine | Domain | M | High | 001-domain | Backlog |
| 8 | `v1-domain-004` | Add deterministic simulation clock and local capsule assembler | Domain | M | High | 001-domain, 003-domain | Backlog |
| 9 | `v1-group-001` | Add local profile session switching and membership guard | Group | M | Medium | 002-domain, 003-foundation | Backlog |
| 10 | `v1-group-002` | Build local group home, prompt, quota, and invite-preview states | Experience | M | Low | 001-group, 003-foundation, 003-domain | Backlog |
| 11 | `v1-group-003` | Prove local group authorization boundaries with negative policy tests | Domain | S | Medium | 001-group, 003-domain | Backlog |
| 12 | `v1-capture-001` | Add device capability ports and permission-state UI | Mobile | M | High | 003-foundation, 001-group | Backlog |
| 13 | `v1-capture-002` | Record a capped vertical video and persist its local file | Mobile | L | High | 001-capture, 002-domain | Backlog |
| 14 | `v1-capture-003` | Review, submit, process-simulate, and lock a contribution | Capture | L | High | 002-capture, 003-domain, 002-group | Backlog |
| 15 | `v1-capture-004` | Implement original preset overlays and capture haptic feedback | Experience | M | Medium | 002-capture, 003-foundation | Backlog |
| 16 | `v1-capture-005` | Handle deletion, failure, retry, and lock-safe UI paths | Capture | M | High | 003-capture, 004-domain | Backlog |
| 17 | `v1-reminders-001` | Persist local reminder preferences and schedule a device notification | Mobile | M | Medium | 001-group, 002-domain | Backlog |
| 18 | `v1-reminders-002` | Handle reminder tap/deep link and in-app notification fallback | Mobile | M | Medium | 001-reminders, 003-foundation | Backlog |
| 19 | `v1-reminders-003` | Build local settings, permission recovery, and safe demo reset controls | Experience | M | Medium | 001-reminders, 002-reminders | Backlog |
| 20 | `v1-chat-001` | Persist profile-aware local group text messages | Chat | M | Medium | 001-group, 002-domain, 003-foundation | Backlog |
| 21 | `v1-chat-002` | Add reply threads and one reaction type to local chat | Chat | M | Low | 001-chat | Backlog |
| 22 | `v1-chat-003` | Add chat access guards, empty/error states, and interaction evidence | Chat | S | Medium | 002-chat, 003-group, 004-foundation | Backlog |
| 23 | `v1-archive-001` | Build developer simulation controls for cycle advance and reveal | Archive | M | High | 004-domain, 005-capture | Backlog |
| 24 | `v1-archive-002` | Render revealed archive playlist and play local captured media | Mobile | L | High | 001-archive, 002-capture, 003-foundation | Backlog |
| 25 | `v1-archive-003` | Share a revealed local item and protect unrevealed export | Mobile | M | High | 002-archive, 003-group | Backlog |
| 26 | `v1-quality-001` | Complete deterministic domain-policy coverage and failure fixtures | Quality | M | High | 005-capture, 003-group, 004-domain | Backlog |
| 27 | `v1-quality-002` | Automate the V1 smoke journey with Maestro and synthetic screenshots | Quality | L | High | 002-archive, 002-reminders, 002-chat, 004-foundation | Backlog |
| 28 | `v1-quality-003` | Audit accessibility, reduced motion, and device-specific failure states | Quality | M | Medium | 005-capture, 003-reminders, 003-chat, 002-archive | Backlog |
| 29 | `v1-quality-004` | Run V1 release rehearsal and publish evidence-oriented handoff | Quality | M | Medium | 001-quality, 002-quality, 003-quality | Backlog |
| 30 | `m2-cloud-001` | Define local-to-cloud adapter and data-contract transition plan | Cloud | M | High | 004-quality | Blocked |
| 31 | `m2-cloud-002` | Spike a modular-monolith backend and local integration boundary | Cloud | L | High | 001-cloud | Blocked |
| 32 | `m2-cloud-003` | Design reviewed Terraform modules and safe state boundary | Infrastructure | L | High | 001-cloud, 002-cloud | Blocked |

`001-domain` in the table is shorthand for `v1-domain-001`; the remote issue
bodies spell out full stable keys and issue numbers so an agent does not need to
infer this shorthand.

## Ticket body standard

Every child issue is created with the following executable structure:

```text
Objective and user/system value
In scope / explicitly out of scope
Observable acceptance criteria
Likely folders and interface boundaries
Dependencies and risk
Verification commands and device/manual checks
Stop conditions / escalation triggers
agent-orchestration:issue-key=<stable key>
```

Parent epics contain outcome, non-goals, and child links. They are planning
containers, not agent-selectable implementation work.

## Project design

The Project uses:

- **Status:** Backlog, Ready, In progress, Review, Blocked, Done;
- **Priority:** P0–P3;
- **Size:** XS, S, M, L;
- **Risk:** Low, Medium, High;
- **Area:** Foundation, Domain, Group, Mobile, Experience, Capture, Chat,
  Archive, Quality, Cloud, Infrastructure; and
- **Iteration:** V1 Setup, V1 Core, V1 Device, V1 Validate, M2 Deferred.

The intended views are Roadmap / epics, Current iteration, Ready queue, Review
queue, and Blocked work. Only `v1-foundation-001` is Ready at initialization;
all `m2-*` work remains Blocked until `v1-quality-004` is Done.

## Recommended next issue

**`v1-foundation-001` — Scaffold the Expo mobile workspace under
`apps/mobile`.** It gives every later ticket a runnable app, determines the
actual Expo SDK/device workflow, and establishes the correct multi-layer folder
boundary without choosing cloud services or product behaviour prematurely.
