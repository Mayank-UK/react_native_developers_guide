import {
  Pressable,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../design-system/theme';
import { Text } from './text';
import type { RadiusKey } from '../design-system/tokens';

/**
 * Button — primary interactive primitive. Themed via the design system, with
 * a pressed state driven by `Pressable`. Variants cover the common affordances
 * (filled / outline / ghost).
 */
export type ButtonVariant = 'filled' | 'outline' | 'ghost';

export interface ButtonProps extends PressableProps {
  title: string;
  variant?: ButtonVariant;
  radius?: RadiusKey;
}

export function Button({
  title,
  variant = 'filled',
  radius = 'md',
  style,
  disabled,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const container: ViewStyle = {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii[radius],
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
  };
  const filled: ViewStyle = { backgroundColor: colors.primary };
  const outline: ViewStyle = {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  };
  const ghost: ViewStyle = { backgroundColor: 'transparent' };

  // Filled → onPrimary (white text on the primary fill); outline/ghost → primary
  // (the outline/border is also primary, so the label reads in the same hue).
  const tone = variant === 'filled' ? 'onPrimary' : 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        container,
        variant === 'filled' && filled,
        variant === 'outline' && outline,
        variant === 'ghost' && ghost,
        pressed && { opacity: 0.7 },
        style as ViewStyle,
      ]}
      disabled={disabled}
      {...props}
    >
      <Text
        variant="small"
        tone={tone}
        style={{ fontWeight: '600' } as TextStyle}
      >
        {title}
      </Text>
    </Pressable>
  );
}
