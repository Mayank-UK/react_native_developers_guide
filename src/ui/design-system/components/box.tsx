import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import type { SpacingKey, RadiusKey } from '../tokens';

/**
 * Box — the layout primitive (a themed `View` that knows about the spacing
 * scale). Use `p` / `m` / `gap` with token keys for consistent rhythm instead
 * of magic numbers. Mirrors the design-system "Box/spacing" primitive from the
 * sibling guides.
 */

type ColorKey =
  | 'background'
  | 'surface'
  | 'surfaceVariant'
  | 'border'
  | 'primary';

export interface BoxProps extends ViewProps {
  p?: SpacingKey;
  px?: SpacingKey;
  py?: SpacingKey;
  m?: SpacingKey;
  mt?: SpacingKey;
  mb?: SpacingKey;
  gap?: SpacingKey;
  bg?: ColorKey;
  row?: boolean;
  center?: boolean;
  radius?: RadiusKey;
  flex?: number;
}

export function Box({
  p,
  px,
  py,
  m,
  mt,
  mb,
  gap,
  bg,
  row,
  center,
  radius,
  flex,
  style,
  ...props
}: BoxProps) {
  const { theme } = useTheme();
  const s = theme.spacing;
  const viewStyle: ViewStyle = {
    ...(p !== undefined && { padding: s[p] }),
    ...(px !== undefined && { paddingHorizontal: s[px] }),
    ...(py !== undefined && { paddingVertical: s[py] }),
    ...(m !== undefined && { margin: s[m] }),
    ...(mt !== undefined && { marginTop: s[mt] }),
    ...(mb !== undefined && { marginBottom: s[mb] }),
    ...(gap !== undefined && { gap: s[gap] }),
    ...(bg !== undefined && { backgroundColor: theme.colors[bg] }),
    ...(radius !== undefined && { borderRadius: theme.radii[radius] }),
    ...(row !== undefined && { flexDirection: 'row' }),
    ...(center !== undefined && center
      ? { alignItems: 'center', justifyContent: 'center' }
      : {}),
    ...(flex !== undefined && { flex }),
  };
  return <View style={[viewStyle, style]} {...props} />;
}
