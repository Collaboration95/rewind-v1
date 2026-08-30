import { seededDomainFixture } from '../../../../packages/domain/src/fixtures.ts';
import type { MemberId } from '../../../../packages/domain/src/models.ts';
import {
  selectLocalMember,
  type SessionPolicyContext,
  type SessionSelectionOutcome,
} from '../../../../packages/domain/src/session/local-session.ts';

import { openLocalDatabase } from '../../data/local/database';
import { DEMO_GROUP_ID, type LocalSessionSnapshot, type LocalSessionStore } from './session';

export async function createSqliteLocalSessionStore(): Promise<LocalSessionStore> {
  const database = await openLocalDatabase();
  const group = await database.repository.groups.get(DEMO_GROUP_ID);
  if (!group) {
    throw new Error('The local demo group could not be restored');
  }

  const members = await database.repository.members.listByGroup(group.id);
  const defaultMemberId = group.memberIds[0];
  if (!defaultMemberId || members.length === 0) {
    throw new Error('The local demo profiles could not be restored');
  }

  const load = async (): Promise<LocalSessionSnapshot> => {
    const persistedMemberId = await database.repository.session.getActiveMemberId(group.id);
    const activeMemberId =
      persistedMemberId && group.memberIds.includes(persistedMemberId)
        ? persistedMemberId
        : defaultMemberId;

    return { activeMemberId, group, members };
  };

  const selectMember = async (
    memberId: MemberId,
    context: SessionPolicyContext,
  ): Promise<SessionSelectionOutcome> => {
    const outcome = selectLocalMember({ context, group, memberId });
    if (outcome.accepted) {
      await database.repository.session.saveActiveMember(group.id, outcome.value.activeMemberId);
      await database.repository.audit.append(outcome.auditEvent);
    }
    return outcome;
  };

  // Keep the fixture import as a runtime guard: the store is for this explicit
  // seeded group, not an arbitrary account/session namespace.
  if (seededDomainFixture.group.id !== group.id) {
    throw new Error('The local demo fixture does not match the session group');
  }

  return { load, selectMember };
}
