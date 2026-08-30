import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CONTRIBUTION_STATES,
  MEDIA_KINDS,
  VIGNETTE_TREATMENTS,
  seededDomainFixture,
} from "../src/index.ts";
import { toSafeContributionSummary } from "../src/models.ts";

test("domain fixtures run outside the UI and cover the approved local media model", () => {
  assert.equal(seededDomainFixture.members.length, 5);
  assert.deepEqual(seededDomainFixture.group.memberIds, [
    "member-ava",
    "member-ben",
    "member-cleo",
    "member-dev",
    "member-finn",
  ]);
  assert.deepEqual(MEDIA_KINDS, ["photo", "video"]);
  assert.deepEqual(VIGNETTE_TREATMENTS, ["flash", "ccd", "home-movie", "tape"]);
  assert.ok(CONTRIBUTION_STATES.includes("locked"));
  assert.ok(CONTRIBUTION_STATES.includes("revealed"));

  const photo = seededDomainFixture.contributions.find(
    (contribution) => contribution.mediaKind === "photo",
  );
  const video = seededDomainFixture.contributions.find(
    (contribution) => contribution.mediaKind === "video",
  );

  assert.equal(photo?.durationSeconds, 3);
  assert.equal(video?.durationSeconds, 5);
});

test("pre-reveal contribution summary omits local media locators", () => {
  const contribution = seededDomainFixture.contributions[0];
  const summary = toSafeContributionSummary(contribution);

  assert.equal(summary.mediaKind, "photo");
  assert.equal(summary.durationSeconds, 3);
  assert.equal("localUri" in summary, false);
  assert.equal("thumbnailUri" in summary, false);
});
