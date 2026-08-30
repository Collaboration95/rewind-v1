import assert from "node:assert/strict";
import { test } from "node:test";

import { seededGroup } from "../src/fixtures.ts";
import { isGroupMember, selectLocalMember } from "../src/index.ts";

const context = (id) => ({
  at: "2026-08-30T10:00:00.000Z",
  auditEventId: id,
});

test("all five seeded profiles can be selected as local demo actors", () => {
  for (const memberId of seededGroup.memberIds) {
    assert.equal(isGroupMember(seededGroup, memberId), true);
    const outcome = selectLocalMember({
      context: context(`audit-session-${memberId}`),
      group: seededGroup,
      memberId,
    });

    assert.equal(outcome.accepted, true);
    assert.deepEqual(outcome.value, {
      activeMemberId: memberId,
      groupId: seededGroup.id,
    });
    assert.equal(outcome.auditEvent.type, "session.profile.selected");
  }
});

test("a non-member selection is safe, rejected, and cannot mutate the group", () => {
  const before = structuredClone(seededGroup);
  const outcome = selectLocalMember({
    context: context("audit-session-outsider"),
    group: seededGroup,
    memberId: "member-outsider",
  });

  assert.equal(outcome.accepted, false);
  assert.equal(outcome.code, "not-a-group-member");
  assert.equal(outcome.reason, "Choose one of the five local demo profiles.");
  assert.equal(outcome.auditEvent.type, "session.profile.rejected");
  assert.equal(outcome.auditEvent.metadata.code, "not-a-group-member");
  assert.deepEqual(seededGroup, before);
});
