import { View } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  type RenderAPI,
} from '@testing-library/react-native';
import { ThemeProvider } from '../theme-provider';
import { Button } from './button';
import { Card } from './card';
import { Text } from './text';

/**
 * Component tests for the design-system primitives using React Native Testing
 * Library. These exercise BEHAVIOUR (what the user sees + can do), not
 * implementation details — they're the live example the Testing screen cites
 * for "how a UI component test looks in this app".
 *
 * RNTL needs a ThemeProvider wrapper because the primitives read the theme via
 * `useTheme()`. The helper below keeps that boilerplate out of each test.
 */
function WithTheme(ui: React.ReactNode): RenderAPI {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Button', () => {
  it('renders its title as readable text', () => {
    WithTheme(<Button title="Save" />);
    expect(screen.getByText('Save')).toBeTruthy();
    // getByRole works because Pressable's default `role` is 'button'.
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('fires onPress when pressed', () => {
    const onPress = jest.fn();
    WithTheme(<Button title="Tap" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Tap' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    WithTheme(<Button title="Noop" disabled onPress={onPress} />);
    // A disabled button exposes its disabled state in the accessibility tree.
    const el = screen.getByRole('button', { name: 'Noop', disabled: true });
    fireEvent.press(el);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('reflects the pressed variant by styling, not by changing the label', () => {
    // Behaviour, not implementation: the label is stable across variants —
    // only styling differs. This guards against accidental title mutations.
    const { rerender } = WithTheme(<Button title="Go" variant="filled" />);
    expect(screen.getByText('Go')).toBeTruthy();
    rerender(
      <ThemeProvider>
        <Button title="Go" variant="outline" />
      </ThemeProvider>,
    );
    expect(screen.getByText('Go')).toBeTruthy();
    expect(screen.queryByText('outline')).toBeNull();
  });
});

describe('Card + Text composition', () => {
  it('renders nested design-system primitives together', () => {
    WithTheme(
      <Card>
        <View>
          <Text variant="h3">Title</Text>
          <Text variant="small" tone="muted">
            caption
          </Text>
        </View>
      </Card>,
    );
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('caption')).toBeTruthy();
  });
});
