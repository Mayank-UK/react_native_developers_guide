import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import type { SpacingKey, RadiusKey } from '../tokens';

/**
 * Card — surface container with padding, rounded corners, and a subtle border.
 * The grouping primitive for content blocks throughout the app.
 */
export interface CardProps extends ViewProps {
  p?: SpacingKey;
  radius?: RadiusKey;
}

export function Card({
  p = 'md',
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
  };
  return <View style={[cardStyle, style as ViewStyle]} {...props} />;
}
