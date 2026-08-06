import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../design-system/theme-provider';
import { PermissionsView } from './permissions_view';

// The dumb view is wrapped in ScreenScaffold, which needs expo-router nav +
// SafeAreaProvider contexts. For this smoke test we only care that the view's
// own composition renders, so mock the scaffold to pass children through.
jest.mock('../../../../components/screen-scaffold', () => {
  const { View } = require('react-native');
  return {
    ScreenScaffold: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('PermissionsView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<PermissionsView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
