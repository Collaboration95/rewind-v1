import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import HomeScreen from '../app/(tabs)/index';
import {
  seededContributions,
  seededCycle,
  seededGroup,
  seededMembers,
} from '../../../packages/domain/src/fixtures';
import {
  getContributionBudget,
  listPreRevealContributionSummaries,
} from '../../../packages/domain/src/policy';
import type { LocalHomeSnapshot, LocalHomeStore } from '../features/group/local-home';

function createSnapshot(): LocalHomeSnapshot {
  const activeMember = seededMembers[0] ?? null;
  return {
    activeMember,
    budget: activeMember
      ? getContributionBudget(seededContributions, activeMember.id, seededCycle.id)
      : null,
    contributions: listPreRevealContributionSummaries(seededContributions),
    cycle: seededCycle,
    group: seededGroup,
    members: seededMembers,
  };
}

function createStore(snapshot = createSnapshot()): LocalHomeStore {
  return { load: jest.fn(async () => snapshot) };
}

describe('Home route smoke', () => {
  it('exposes semantic content and the stable screen selector', async () => {
    const { getByLabelText, getByRole, getByTestId } = await render(
      <HomeScreen homeStore={createStore()} />,
    );

    expect(getByRole('header')).toBeTruthy();
    expect(getByLabelText('Local-only prototype')).toBeTruthy();
    expect(getByLabelText('Open local reminder settings')).toBeTruthy();
    expect(getByTestId('screen-home')).toBeTruthy();
    expect(getByTestId('home-title')).toBeTruthy();
  });

  it('renders group context, quota, lock-safe activity, and a local invite preview', async () => {
    const view = await render(<HomeScreen homeStore={createStore()} />);

    await waitFor(() => expect(view.getByTestId('home-group-surface')).toBeTruthy());
    expect(view.getByText('The Sunday Room')).toBeTruthy();
    expect(view.getByText('What deserves a frame this week?')).toBeTruthy();
    expect(view.getByText('COLLECTING')).toBeTruthy();
    expect(view.getByText('1 / 5')).toBeTruthy();
    expect(view.getByText('3 / 30 SEC')).toBeTruthy();
    expect(view.getAllByText('Ava').length).toBeGreaterThan(0);
    expect(view.getByText('Ben')).toBeTruthy();
    expect(view.queryByText('file:///synthetic/rewind-photo-demo.jpg')).toBeNull();
    expect(view.queryByText('file:///synthetic/rewind-video-demo.mov')).toBeNull();

    await fireEvent.press(view.getByTestId('home-invite-preview'));
    expect(view.getByTestId('home-invite-preview-sheet')).toBeTruthy();
    expect(view.getByText('NOT DELIVERED · NO NETWORK · NO DEEP LINK')).toBeTruthy();
  });

  it('keeps loading and empty activity states observable', async () => {
    let resolveLoad!: (snapshot: LocalHomeSnapshot) => void;
    const loadingStore: LocalHomeStore = {
      load: jest.fn(
        () =>
          new Promise<LocalHomeSnapshot>((resolve) => {
            resolveLoad = resolve;
          }),
      ),
    };
    const loadingView = await render(<HomeScreen homeStore={loadingStore} />);
    expect(loadingView.getByTestId('home-loading')).toBeTruthy();

    const emptySnapshot = { ...createSnapshot(), contributions: [] };
    resolveLoad(emptySnapshot);
    await waitFor(() => expect(loadingView.getByTestId('home-empty-activity')).toBeTruthy());
    expect(
      loadingView.getByText('NO LOCKED FRAMES YET · CAPTURE DETAILS STAY HIDDEN UNTIL REVEAL.'),
    ).toBeTruthy();
  });

  it('shows an actionable local policy state when no active cycle is available', async () => {
    const view = await render(
      <HomeScreen homeStore={createStore({ ...createSnapshot(), cycle: null, budget: null })} />,
    );

    await waitFor(() => expect(view.getByTestId('home-policy-rejection')).toBeTruthy());
    expect(
      view.getByText(
        'This local cycle is not accepting captures yet. The home remains metadata-only.',
      ),
    ).toBeTruthy();
  });

  it('shows a retry action when the local home cannot be restored', async () => {
    const store: LocalHomeStore = {
      load: jest.fn(async () => {
        throw new Error('synthetic local home failure');
      }),
    };
    const view = await render(<HomeScreen homeStore={store} />);

    await waitFor(() => expect(view.getByTestId('home-error')).toBeTruthy());
    expect(view.getByTestId('home-retry')).toBeTruthy();
  });
});
