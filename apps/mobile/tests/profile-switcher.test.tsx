import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { seededGroup, seededMembers } from '../../../packages/domain/src/fixtures';
import { selectLocalMember } from '../../../packages/domain/src/session/local-session';

import { LocalProfileSwitcher } from '../features/session/LocalProfileSwitcher';
import { LocalSessionProvider } from '../features/session/LocalSessionProvider';

function createMemoryStore(initialMemberId = 'member-ava') {
  let activeMemberId = initialMemberId;

  return {
    get activeMemberId() {
      return activeMemberId;
    },
    async load() {
      return {
        activeMemberId,
        group: seededGroup,
        members: seededMembers,
      };
    },
    async selectMember(memberId: string, context: { at: string; auditEventId: string }) {
      const outcome = selectLocalMember({ context, group: seededGroup, memberId });
      if (outcome.accepted) {
        activeMemberId = outcome.value.activeMemberId;
      }
      return outcome;
    },
  };
}

describe('Local profile switcher', () => {
  it('loads five profiles, exposes the current actor, and persists a selection', async () => {
    const store = createMemoryStore();
    const view = await render(
      <LocalSessionProvider store={store}>
        <LocalProfileSwitcher />
      </LocalSessionProvider>,
    );

    await waitFor(() => expect(view.getByLabelText('Current local profile: Ava')).toBeTruthy());
    expect(view.getAllByRole('button')).toHaveLength(5);

    await fireEvent.press(view.getByRole('button', { name: 'Switch local profile to Ben' }));

    await waitFor(() => expect(view.getByLabelText('Current local profile: Ben')).toBeTruthy());
    expect(store.activeMemberId).toBe('member-ben');
    expect(
      view.getByRole('button', { name: 'Switch local profile to Ben' }).props.accessibilityState
        .selected,
    ).toBe(true);
    expect(view.getByText('LOCAL DEMO ONLY · NO SIGN-IN')).toBeTruthy();
  });

  it('keeps the current actor when a member selection is rejected', async () => {
    const store = createMemoryStore();
    const rejectingStore = {
      ...store,
      async selectMember(_memberId: string, context: { at: string; auditEventId: string }) {
        return selectLocalMember({
          context,
          group: seededGroup,
          memberId: 'member-outsider',
        });
      },
    };
    const view = await render(
      <LocalSessionProvider store={rejectingStore}>
        <LocalProfileSwitcher />
      </LocalSessionProvider>,
    );

    await waitFor(() => expect(view.getByLabelText('Current local profile: Ava')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Switch local profile to Ben' }));

    await waitFor(() =>
      expect(view.getByText('Choose one of the five local demo profiles.')).toBeTruthy(),
    );
    expect(view.getByLabelText('Current local profile: Ava')).toBeTruthy();
    expect(store.activeMemberId).toBe('member-ava');
  });
});
