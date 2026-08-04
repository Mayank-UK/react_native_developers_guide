import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { UiHubView } from './ui_hub_view';

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
 * Smoke test for the UI hub view. The hub is static (no extracted hooks), so
 * there is no logic suite — only a render smoke test. LinkCard is rendered as
 * children of the mocked scaffold.
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('UiHubView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<UiHubView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
