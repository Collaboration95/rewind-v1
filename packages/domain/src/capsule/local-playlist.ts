import type {
  Contribution,
  ContributionId,
  Cycle,
  CycleId,
} from "../models.ts";
import { isRevealEligibleContribution } from "../cycle/cycle-policy.ts";

export interface LocalPlaylist {
  /** Deliberately distinguishes an ordered list from a rendered media file. */
  readonly kind: "local-playlist";
  readonly cycleId: CycleId;
  readonly contributionIds: readonly ContributionId[];
}

/**
 * Assemble an ordered list of local contribution IDs after reveal. No media
 * file is generated and no URI is returned by this domain function.
 */
export function assembleLocalPlaylist(
  cycle: Cycle,
  contributions: readonly Contribution[],
): LocalPlaylist {
  const contributionIds =
    cycle.status === "premiere" || cycle.status === "archived"
      ? contributions
          .filter(
            (contribution) =>
              contribution.cycleId === cycle.id &&
              isRevealEligibleContribution(contribution),
          )
          .sort((left, right) =>
            left.capturedAt === right.capturedAt
              ? left.id.localeCompare(right.id)
              : left.capturedAt.localeCompare(right.capturedAt),
          )
          .map(({ id }) => id)
      : [];

  return {
    contributionIds,
    cycleId: cycle.id,
    kind: "local-playlist",
  };
}
