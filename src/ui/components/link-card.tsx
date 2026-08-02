import { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Box, Text, useTheme } from '../design-system';

/**
 * LinkCard — a topic/section navigation card. Ports the sibling web guide's
 * `LinkCard`: title row with an inline `→` glyph that nudges right on press,
 * plus an optional description. Navigates via Expo Router (`href` = path) or a
 * custom `onPress`.
 *
 * Used by the home hub and section landing pages instead of an "Open" button.
 */
export interface LinkCardProps {
  title: string;
  description?: string;
  /** Expo Router path to navigate to. */
  href?: string;
  onPress?: () => void;
}

export function LinkCard({ title, description, href, onPress }: LinkCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const translate = useRef(new Animated.Value(0)).current;

  const handlePressIn = () =>
    Animated.timing(translate, { toValue: 4, duration: 120, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.timing(translate, { toValue: 0, duration: 120, useNativeDriver: true }).start();

  const handlePress = () => {
    if (onPress) return onPress();
    if (href) router.push(href);
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        {
          borderWidth: 1,
          borderColor: pressed ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radii.lg,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.md,
          opacity: pressed ? 0.95 : 1,
        },
      ]}
    >
      <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
        <Text variant="h3" style={{ flexShrink: 1 }}>
          {title}
        </Text>
        <Animated.Text
          style={{
            color: theme.colors.primary,
            transform: [{ translateX: translate }],
            fontSize: 18,
          }}
        >
          →
        </Animated.Text>
      </Box>
      {description ? (
        <Text variant="small" tone="muted" mt="xs">
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}
