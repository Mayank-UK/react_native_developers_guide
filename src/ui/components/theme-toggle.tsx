import { Pressable } from 'react-native';
import { Text, useTheme } from '../design-system';

/**
 * ThemeToggle — a single tappable icon for the header that flips light/dark.
 * Ports the sibling web guide's `ThemeToggle`: shows `☾` in light mode (switch
 * to dark) and `☀` in dark mode (switch to light).
 */
export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const isDark = mode === 'dark';
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      <Text variant="body" tone="muted">
        {isDark ? '☀' : '☾'}
      </Text>
    </Pressable>
  );
}
