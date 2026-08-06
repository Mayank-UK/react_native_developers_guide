import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../design-system/theme';
import type { SpacingKey, RadiusKey } from '../design-system/tokens';

/**
 * Card — surface container with padding, rounded corners, and a subtle border.
 * The grouping primitive for content blocks throughout the app.
 */
export interface CardProps extends ViewProps {
  p?: SpacingKey;
  /** Bottom margin using a spacing token key — the common stack-rhythm need. */
  mb?: SpacingKey;
  radius?: RadiusKey;
}

export function Card({
  p = 'md',
  mb,
  radius = 'lg',
  style,
  ...props
}: CardProps) {
  const { theme } = useTheme();
  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii[radius],
    padding: theme.spacing[p],
    ...(mb !== undefined && { marginBottom: theme.spacing[mb] }),
  };
  return <View style={[cardStyle, style as ViewStyle]} {...props} />;
}
