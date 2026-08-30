import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import HomeScreen from '../app/(tabs)/index';

describe('Home route smoke', () => {
  it('exposes semantic content and the stable screen selector', async () => {
    const { getByLabelText, getByRole, getByTestId } = await render(<HomeScreen />);

    expect(getByRole('header')).toBeTruthy();
    expect(getByLabelText('Local-only prototype')).toBeTruthy();
    expect(getByTestId('screen-home')).toBeTruthy();
    expect(getByTestId('home-title')).toBeTruthy();
  });
});
