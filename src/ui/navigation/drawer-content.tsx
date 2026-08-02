import { Pressable, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box, Text, useTheme } from '../design-system';
import { ROUTES, RoutePaths, type RouteMeta } from './routes';

/**
 * AppDrawerContent — the themed side menu rendered inside the root Drawer.
 * Per the review requirement the drawer lists ONLY the About link (the rest of
 * the app is reached via the home grid + the AppBar back-arrow). Home itself is
 * reachable via the back-arrow from any nested screen, and the hamburger only
 * appears on Home, so no Home entry is needed here.
 *
 * The menu navigates by the Drawer screen's route NAME, which for Expo Router
 * is the file slug ('about', 'index', …) — matching the path slug, except Home
 * whose file is `index.tsx`.
 */
export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const entries = buildDrawerEntries();
  const activeName = state.routes[state.index]?.name;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <Box
        p="md"
        bg="surface"
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Text variant="h2">Developer&apos;s Guide</Text>
        <Text variant="caption" tone="muted" mt="xxs">
          React Native · Expo Router
        </Text>
      </Box>

      <Box p="sm" gap="xxs">
        {entries.map((e) => {
          const active = e.name === activeName;
          return (
            <Pressable
              key={e.name}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={e.title}
              onPress={() => {
                navigation.navigate(e.name as never);
                navigation.closeDrawer();
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Box
                p="sm"
                radius="md"
                bg={active ? 'primary' : 'surface'}
                style={
                  active
                    ? undefined
                    : { borderWidth: 1, borderColor: theme.colors.border }
                }
              >
                <Text variant="small" tone={active ? 'onPrimary' : 'default'} style={{ fontWeight: '600' }}>
                  {e.title}
                </Text>
                <Text
                  variant="caption"
                  tone={active ? 'onPrimary' : 'muted'}
                  mt="xxs"
                >
                  {e.description}
                </Text>
              </Box>
            </Pressable>
          );
        })}
      </Box>
    </View>
  );
}

interface DrawerEntry {
  name: string;
  title: string;
  description: string;
}

/** Convert a route path like `/best-practices` to the Expo Router screen name. */
function pathToName(path: string): string {
  if (path === RoutePaths.home) return 'index';
  return path.replace(/^\//, '');
}

function buildDrawerEntries(): ReadonlyArray<DrawerEntry> {
  // Drawer lists ONLY About (review requirement). Everything else is reached
  // via the home grid + the AppBar back-arrow.
  const about = ROUTES.find((r: RouteMeta) => r.path === RoutePaths.about);
  if (!about) return [];
  return [
    {
      name: pathToName(about.path),
      title: about.title,
      description: about.description,
    },
  ];
}
