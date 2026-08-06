import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../design-system/theme';
import type { Palette, SpacingKey, TextVariantName } from '../design-system/tokens';

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

/** tone → palette key. Single source of truth for text colour mapping. */
const TONE_TO_COLOR: Record<TextTone, keyof Palette> = {
  default: 'text',
  muted: 'textMuted',
  primary: 'primary',
  onPrimary: 'onPrimary',
  danger: 'danger',
};

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
    color: theme.colors[TONE_TO_COLOR[tone]],
  };
  return <RNText style={[textStyle, style]} {...props} />;
}
