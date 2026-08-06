import { Drawer } from 'expo-router/drawer';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/ui/design-system';
import { useAppFonts } from '../src/ui/design-system/fonts';
// Side-effect import: wires the DI container synchronously at module-eval time,
// before the Drawer (and any child screen) can mount. See bootstrap.ts.
import '../src/core/container/bootstrap';
import { AppDrawerContent } from '../src/ui/components';

/**
 * Root layout — wires global providers (theme, safe-area, gesture handler). The
 * DI container is initialized synchronously at module-eval time via the
 * side-effect import of `src/core/container/bootstrap.ts` (see that file for
 * why this replaced the old `useEffect` initialization). Hosts an Expo Router
 * Drawer as the root navigator so the app has a swipeable side menu (Home,
 * About, and section shortcuts) reachable from every screen via the hamburger
 * in ScreenScaffold or an edge swipe. The drawer uses a themed custom content
 * component; every screen keeps headerShown:false because ScreenScaffold owns
 * the per-screen chrome.
 *
 * (RN vs web reference): the web guide uses a pure-data route table that *is*
 * the router. RN's standard is Expo Router (file-based). The root navigator is
 * a Drawer here so a single side menu can host the About link + section
 * shortcuts; route resolution still comes from the files under app/, and the
 * data-driven routes.ts remains the SSOT for the drawer's menu items.
 */
function Bootstrap() {
  const { theme } = useTheme();
  const [fontsLoaded] = useAppFonts();

  // Hold first paint until the bundled font families are registered, so text
  // never flashes the system font.
  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }} />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerType: 'slide',
          drawerStyle: {
            width: 286,
            backgroundColor: theme.colors.surface,
          },
          overlayColor: 'rgba(0,0,0,0.4)',
        }}
        drawerContent={(props) => <AppDrawerContent {...props} />}
      >
        <Drawer.Screen name="index" />
        <Drawer.Screen name="about" />
        <Drawer.Screen name="best-practices" />
        <Drawer.Screen name="architecture" />
        <Drawer.Screen name="testing" />
        <Drawer.Screen name="api-handling" />
      </Drawer>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Bootstrap />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
