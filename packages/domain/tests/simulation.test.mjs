import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FOUR_WEEK_SECONDS,
  SIMULATION_MODE_STEP_SECONDS,
  advanceSimulationClock,
  assembleLocalPlaylist,
  cycleEndAt,
  seededContributions,
  seededCycle,
  seededDomainFixture,
  seededGroup,
  setSimulationMode,
  transitionCycle,
} from "../src/index.ts";

const context = (id, at = "2026-08-30T10:00:00.000Z") => ({
  at,
  auditEventId: id,
});

function assertRejected(outcome, code) {
  assert.equal(outcome.accepted, false);
  assert.equal(outcome.code, code);
  assert.equal(typeof outcome.reason, "string");
  assert.ok(outcome.reason.length > 0);
  assert.equal(outcome.auditEvent.type, "cycle.rejected");
  assert.equal(outcome.auditEvent.metadata.code, code);
}

test("simulation clock advances minute, day, and four-week modes without sleeping", () => {
  const initial = { now: "2026-08-30T10:00:00.000Z", mode: "demo-minute" };
  assert.equal(SIMULATION_MODE_STEP_SECONDS["demo-minute"], 60);
  assert.equal(advanceSimulationClock(initial).now, "2026-08-30T10:01:00.000Z");
  assert.equal(
    advanceSimulationClock(initial, 3).now,
    "2026-08-30T10:03:00.000Z",
  );

  const dayClock = setSimulationMode(initial, "demo-day");
  assert.equal(
    advanceSimulationClock(dayClock).now,
    "2026-08-31T10:00:00.000Z",
  );

  const cycleClock = setSimulationMode(initial, "demo-cycle");
  assert.equal(SIMULATION_MODE_STEP_SECONDS["demo-cycle"], FOUR_WEEK_SECONDS);
  assert.equal(
    advanceSimulationClock(cycleClock).now,
    "2026-09-27T10:00:00.000Z",
  );

  const realClock = setSimulationMode(initial, "real");
  assert.deepEqual(advanceSimulationClock(realClock), realClock);
  assert.throws(
    () => advanceSimulationClock(initial, -1),
    /non-negative integer/,
  );
});

test("cycle transitions enforce collection end and document the happy path", () => {
  const fourWeekCycle = {
    ...seededCycle,
    durationSeconds: FOUR_WEEK_SECONDS,
  };
  const early = transitionCycle({
    context: context("audit-cycle-early", "2026-08-30T10:00:00.000Z"),
    contributions: seededContributions,
    cycle: fourWeekCycle,
    targetStatus: "reveal_pending",
  });
  assertRejected(early, "cycle-not-ready");

  const pending = transitionCycle({
    context: context("audit-cycle-pending", cycleEndAt(fourWeekCycle)),
    contributions: seededContributions,
    cycle: fourWeekCycle,
    targetStatus: "reveal_pending",
  });
  assert.equal(pending.accepted, true);
  assert.equal(pending.cycle.status, "reveal_pending");
  assert.equal(pending.auditEvent.metadata.from, "collecting");
  assert.equal(pending.auditEvent.metadata.to, "reveal_pending");

  const premiere = transitionCycle({
    context: context("audit-cycle-premiere", cycleEndAt(fourWeekCycle)),
    contributions: seededContributions,
    cycle: pending.cycle,
    targetStatus: "premiere",
  });
  assert.equal(premiere.accepted, true);
  assert.equal(premiere.cycle.status, "premiere");

  const repeatedPremiere = transitionCycle({
    context: context("audit-cycle-premiere-repeat"),
    contributions: seededContributions,
    cycle: premiere.cycle,
    targetStatus: "premiere",
  });
  assert.equal(repeatedPremiere.accepted, true);
  assert.equal(repeatedPremiere.idempotent, true);
  assert.deepEqual(repeatedPremiere.cycle, premiere.cycle);

  const archived = transitionCycle({
    context: context("audit-cycle-archived"),
    contributions: seededContributions,
    cycle: premiere.cycle,
    targetStatus: "archived",
  });
  assert.equal(archived.accepted, true);
  assert.equal(archived.cycle.status, "archived");
  assertRejected(
    transitionCycle({
      context: context("audit-cycle-invalid"),
      contributions: seededContributions,
      cycle: archived.cycle,
      targetStatus: "collecting",
    }),
    "invalid-transition",
  );
});

test("failed processing follows the delayed path until retry recovery", () => {
  const pendingCycle = { ...seededCycle, status: "reveal_pending" };
  const failedContributions = [
    { ...seededContributions[0], state: "failed" },
    seededContributions[1],
  ];

  assertRejected(
    transitionCycle({
      context: context("audit-failure-premiere"),
      contributions: failedContributions,
      cycle: pendingCycle,
      targetStatus: "premiere",
    }),
    "failed-contributions-require-delay",
  );

  const delayed = transitionCycle({
    context: context("audit-cycle-delayed"),
    contributions: failedContributions,
    cycle: pendingCycle,
    targetStatus: "delayed",
  });
  assert.equal(delayed.accepted, true);
  assert.equal(delayed.cycle.status, "delayed");

  assertRejected(
    transitionCycle({
      context: context("audit-delayed-still-failed"),
      contributions: failedContributions,
      cycle: delayed.cycle,
      targetStatus: "premiere",
    }),
    "processing-failure-remains",
  );

  const recovered = transitionCycle({
    context: context("audit-delayed-recovered"),
    contributions: seededContributions,
    cycle: delayed.cycle,
    targetStatus: "premiere",
  });
  assert.equal(recovered.accepted, true);
  assert.equal(recovered.cycle.status, "premiere");

  assertRejected(
    transitionCycle({
      context: context("audit-unlocked"),
      contributions: [
        { ...seededContributions[0], state: "captured" },
        seededContributions[1],
      ],
      cycle: pendingCycle,
      targetStatus: "premiere",
    }),
    "contributions-not-locked",
  );
});

test("local playlist is deterministic, reveal-gated, and contains contribution IDs only", () => {
  const premiereCycle = { ...seededCycle, status: "premiere" };
  const contributions = [
    {
      ...seededContributions[1],
      id: "z-later",
      capturedAt: "2026-08-30T09:00:00.000Z",
      state: "locked",
    },
    {
      ...seededContributions[0],
      id: "b-earlier",
      capturedAt: "2026-08-30T08:00:00.000Z",
      state: "revealed",
    },
    {
      ...seededContributions[0],
      id: "a-earlier",
      capturedAt: "2026-08-30T08:00:00.000Z",
      state: "archived",
    },
    { ...seededContributions[0], id: "failed", state: "failed" },
    { ...seededContributions[0], id: "deleted", state: "deleted" },
    { ...seededContributions[0], id: "other-cycle", cycleId: "other" },
  ];

  const playlist = assembleLocalPlaylist(premiereCycle, contributions);
  assert.equal(playlist.kind, "local-playlist");
  assert.equal(playlist.cycleId, seededCycle.id);
  assert.deepEqual(playlist.contributionIds, [
    "a-earlier",
    "b-earlier",
    "z-later",
  ]);
  assert.equal("localUri" in playlist, false);
  assert.equal("mediaFile" in playlist, false);
  assert.equal("generatedMediaUri" in playlist, false);
  assert.deepEqual(
    assembleLocalPlaylist(premiereCycle, contributions),
    playlist,
  );

  const beforeReveal = assembleLocalPlaylist(
    { ...premiereCycle, status: "collecting" },
    seededDomainFixture.contributions,
  );
  assert.deepEqual(beforeReveal.contributionIds, []);
  assert.deepEqual(seededGroup.memberIds.length, 5);
});
