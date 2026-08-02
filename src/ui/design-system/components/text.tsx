import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import type { SpacingKey, TextVariantName } from '../tokens';

/**
 * Text — typography primitive. Variants map to the design-system type scale
 * (`typography` in `tokens.ts`): each carries its own fontFamily (a registered
 * weight file), fontSize, lineHeight, letterSpacing, fontWeight, and optional
 * uppercase. Use this instead of raw `Text` so colour + typography stay
 * consistent across the app.
 */
export type TextVariant = TextVariantName;
export type TextTone = 'default' | 'muted' | 'primary' | 'onPrimary' | 'danger';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  mt?: SpacingKey;
  mb?: SpacingKey;
}

export function Text({
  variant = 'body',
  tone = 'default',
  mt,
  mb,
  style,
  ...props
}: AppTextProps) {
  const { theme } = useTheme();
  const s = theme.spacing;
  const v = theme.typography[variant];
  const textStyle: TextStyle = {
    fontFamily: v.fontFamily,
    fontSize: v.fontSize,
    lineHeight: v.lineHeight,
    fontWeight: v.fontWeight,
    ...(v.letterSpacing !== undefined && { letterSpacing: v.letterSpacing }),
    ...(v.uppercase && { textTransform: 'uppercase' }),
    ...(mt !== undefined && { marginTop: s[mt] }),
    ...(mb !== undefined && { marginBottom: s[mb] }),
    color:
      tone === 'muted'
        ? theme.colors.textMuted
        : tone === 'primary'
          ? theme.colors.primary
          : tone === 'onPrimary'
            ? theme.colors.onPrimary
            : tone === 'danger'
              ? theme.colors.danger
              : theme.colors.text,
  };
  return <RNText style={[textStyle, style]} {...props} />;
}
