import {
  getContributionBudget,
  listPreRevealContributionSummaries,
  type ContributionBudget,
} from '../../../../packages/domain/src/policy';
import { seededCycle } from '../../../../packages/domain/src/fixtures';
import type {
  ContributionRepositoryPort,
  CycleRepositoryPort,
  GroupRepositoryPort,
  MemberRepositoryPort,
  SessionRepositoryPort,
} from '../../../../packages/domain/src/ports';
import type {
  Cycle,
  Group,
  IsoTimestamp,
  Member,
  MemberId,
  SafeContributionSummary,
} from '../../../../packages/domain/src/models';

import { DEMO_GROUP_ID } from '../session/session';

export interface LocalHomeSnapshot {
  readonly activeMember: Member | null;
  readonly budget: ContributionBudget | null;
  readonly contributions: readonly SafeContributionSummary[];
  readonly cycle: Cycle | null;
  readonly group: Group;
  readonly members: readonly Member[];
}

export interface LocalHomeRepository {
  readonly contributions: Pick<ContributionRepositoryPort, 'listByCycle'>;
  readonly cycles: Pick<CycleRepositoryPort, 'get' | 'getCollecting'>;
  readonly groups: Pick<GroupRepositoryPort, 'get'>;
  readonly members: Pick<MemberRepositoryPort, 'listByGroup'>;
  readonly session: Pick<SessionRepositoryPort, 'getActiveMemberId'>;
}

export interface LocalHomeStore {
  load(): Promise<LocalHomeSnapshot>;
}

export interface LocalHomeStoreOptions {
  readonly now?: () => IsoTimestamp;
  readonly repository: LocalHomeRepository;
}

export function createLocalHomeStore({
  now = () => new Date().toISOString(),
  repository,
}: LocalHomeStoreOptions): LocalHomeStore {
  return {
    async load() {
      const group = await repository.groups.get(DEMO_GROUP_ID);
      if (!group) {
        throw new Error('The local demo group could not be restored');
      }

      const [members, activeMemberId, collectingCycle] = await Promise.all([
        repository.members.listByGroup(group.id),
        repository.session.getActiveMemberId(group.id),
        repository.cycles.getCollecting(group.id, now()),
      ]);
      const cycle = collectingCycle ?? (await repository.cycles.get(seededCycle.id));
      const activeMember = findMember(members, activeMemberId);

      if (!cycle) {
        return {
          activeMember,
          budget: null,
          contributions: [],
          cycle: null,
          group,
          members,
        };
      }

      const contributions = await repository.contributions.listByCycle(cycle.id);
      return {
        activeMember,
        budget: activeMemberId
          ? getContributionBudget(contributions, activeMemberId, cycle.id)
          : null,
        contributions: listPreRevealContributionSummaries(contributions),
        cycle,
        group,
        members,
      };
    },
  };
}

function findMember(members: readonly Member[], memberId: MemberId | null): Member | null {
  return members.find((member) => member.id === memberId) ?? null;
}

export function memberNameForSummary(
  members: readonly Member[],
  summary: SafeContributionSummary,
): string {
  return findMember(members, summary.memberId)?.displayName ?? 'Local member';
}
