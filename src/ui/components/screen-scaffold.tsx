import { type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box, Text, useTheme } from '../design-system';
import { ThemeToggle } from './theme-toggle';

/**
 * ScreenScaffold — the per-screen app shell: a STICKY AppBar above a scrollable
 * (or plain) body. Ports the sibling web guide's `RootLayout` header:
 *
 *  - The header sits OUTSIDE the body ScrollView, so it stays pinned at the top
 *    while the content scrolls (RN has no CSS `sticky`).
 *  - Left affordance: a back-arrow on any nested screen and the ☰ hamburger
 *    ONLY on the home screen. Back-vs-home is decided by the current route
 *    (`usePathname() === '/'`), NOT `navigation.canGoBack()` — the latter
 *    returns false at a section hub (the initial screen of its nested Stack),
 *    which would wrongly hide the back arrow there. The hamburger opens the
 *    root Drawer.
 *  - Title only — no subtitle (kept as an accepted-but-ignored prop so existing
 *    call sites don't break during the refactor).
 *  - Right: a single `ThemeToggle` icon (light/dark).
 *
 * `scrollable={false}` renders the body in a plain `<View>` for screens that
 * embed their own virtualized list (avoids the nested-ScrollView warning).
 */
export interface ScreenScaffoldProps {
  title: string;
  /** Accepted for backward compatibility; NOT rendered (title-only header). */
  subtitle?: string;
  scrollable?: boolean;
  children: ReactNode;
}

type NavigationLike = {
  goBack?: () => void;
  openDrawer?: () => void;
  canGoBack?: () => boolean;
};

export function ScreenScaffold({
  title,
  subtitle,
  scrollable = true,
  children,
}: ScreenScaffoldProps) {
  void subtitle; // title-only header by design
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation() as NavigationLike;
  // Back-arrow on every non-home screen; hamburger on home. Route-based (not
  // canGoBack) so a section hub — the initial screen of its nested Stack —
  // still shows the back arrow.
  const isHome = usePathname() === '/';
  const showBack = !isHome;

  const openDrawer = () => navigation.openDrawer?.();
  const goBack = () => navigation.goBack?.();

  const contentPadding = {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: insets.bottom + theme.spacing.xl,
    paddingTop: theme.spacing.md,
  };

  return (
    <Box flex={1} bg="background">
      {/* Sticky AppBar — pinned because it is a sibling of, not a child of, the scroller. */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Box
          row
          gap="sm"
          center
          px="md"
          py="sm"
          style={{ justifyContent: 'space-between', minHeight: 48 }}
        >
          <Box row gap="sm" center style={{ flexShrink: 1 }}>
            <Pressable
              onPress={showBack ? goBack : openDrawer}
              accessibilityRole="button"
              accessibilityLabel={showBack ? 'Go back' : 'Open navigation menu'}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text variant="h2" tone="primary">
                {showBack ? '←' : '☰'}
              </Text>
            </Pressable>
            <Text variant="h1" style={{ flexShrink: 1 }} numberOfLines={1}>
              {title}
            </Text>
          </Box>
          <ThemeToggle />
        </Box>
      </View>

      {scrollable ? (
        <ScrollView contentContainerStyle={contentPadding}>{children}</ScrollView>
      ) : (
        <View style={contentPadding}>{children}</View>
      )}
    </Box>
  );
}
