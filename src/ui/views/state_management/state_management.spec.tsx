import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { StateManagementHubView } from './state_management_view';

// The dumb view is wrapped in ScreenScaffold, which needs expo-router nav +
// SafeAreaProvider contexts. For this smoke test we only care that the view's
// own composition renders, so mock the scaffold to pass children through.
jest.mock('../../components/screen-scaffold', () => {
  const { View } = require('react-native');
  return {
    ScreenScaffold: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

/**
 * Smoke test for the state-management hub view. The hub is static (no extracted
 * hooks), so there is no logic suite — only a render smoke test. LinkCard is
 * rendered as a child of the mocked scaffold (the four sub-route cards).
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('StateManagementHubView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<StateManagementHubView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
