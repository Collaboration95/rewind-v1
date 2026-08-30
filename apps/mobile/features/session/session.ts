import type { Group, Member, MemberId } from '../../../../packages/domain/src/models';
import type {
  LocalSession,
  SessionPolicyContext,
  SessionSelectionOutcome,
} from '../../../../packages/domain/src/session/local-session';

export const DEMO_GROUP_ID = 'group-rewind-demo';

export interface LocalSessionSnapshot {
  readonly group: Group;
  readonly members: readonly Member[];
  readonly activeMemberId: MemberId;
}

export interface LocalSessionStore {
  load(): Promise<LocalSessionSnapshot>;
  selectMember(memberId: MemberId, context: SessionPolicyContext): Promise<SessionSelectionOutcome>;
}

export type { LocalSession };
