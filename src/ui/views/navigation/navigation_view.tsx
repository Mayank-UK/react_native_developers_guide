import { StyleSheet, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Text } from '../../components';
import { useTheme } from '../../design-system';
import { Section, Code, Pill } from '../../components';
import {
  useImperativeNav,
  useDynamicParams,
  useFocusLog,
  type LogEntry,
} from './navigation_hooks';

/**
 * NavigationRoutingView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (navigation_hooks.ts); this file only renders.
 *
 * Teaching artifact for Expo Router — file-based routing, the React Native
 * standard since 2023. The demos navigate to REAL routes in this app (About, a
 * UI sub-screen, and a dedicated dynamic `[id]` route at
 * `app/navigation-routing/[id].tsx`). The file-based routing table in the first
 * card cites this app's own files.
 *
 * `useTheme` (design-system context, no state) is kept in the view per the
 * exemplar's presentational exception. Single-file helpers stay local per
 * convention. No `any`; strict + erasure-clean.
 */
export function NavigationRoutingView() {
  return (
    <ScreenScaffold
      title="Navigation & Routing"
    >
      <IntroCard />
      <FileBasedRoutingCard />
      <ImperativeNavCard />
      <DeclarativeLinkCard />
      <DynamicParamsCard />
      <NavigatorTypesCard />
      <GroupingAndLayoutsCard />
      <DeepLinkingCard />
      <FocusEffectCard />
      <ProgrammaticPatternsCard />
      <VersusReactNavigationCard />
    </ScreenScaffold>
  );
}

function NavLogPanel({
  entries,
  onClear,
  emptyHint = 'Tap a navigation button above to record an action…',
}: {
  entries: readonly LogEntry[];
  onClear?: () => void;
  emptyHint?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radii.sm,
        padding: theme.spacing.sm,
        minHeight: 120,
      }}
    >
      {entries.length === 0 ? (
        <Text variant="caption" tone="muted">
          {emptyHint}
        </Text>
      ) : (
        <Box gap="xxs">
          {entries.map((e) => (
            <Box key={e.id} row gap="xs" style={{ alignItems: 'baseline' }}>
              <Text
                variant="caption"
                tone={e.tone === 'danger' ? 'danger' : e.tone === 'primary' ? 'primary' : 'muted'}
                style={{ fontFamily: 'monospace' }}
              >
                •
              </Text>
              <Text
                variant="caption"
                tone={
                  e.tone === 'danger'
                    ? 'danger'
                    : e.tone === 'primary'
                      ? 'primary'
                      : e.tone === 'muted'
                        ? 'muted'
                        : 'default'
                }
                style={{ fontFamily: 'monospace' }}
              >
                {e.text}
              </Text>
            </Box>
          ))}
        </Box>
      )}
      {onClear ? (
        <Box mt="sm">
          <Button title="Clear log" variant="ghost" onPress={onClear} />
        </Box>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Intro — Expo Router is the standard                              */
/* ------------------------------------------------------------------ */

function IntroCard() {
  return (
    <Section
      title="Navigation & routing"
      explanation="File-based routing on top of React Navigation. Files under app/ become routes automatically — like Next.js for native. It powers deep linking and web export for free."
    >
      <Box gap="xs">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Pill tone="primary">File-based</Pill>
          <Pill>Deep links</Pill>
          <Pill>Web export</Pill>
          <Pill>Typed routes</Pill>
          <Pill>Stack / Tabs / Drawer</Pill>
        </Box>
        <Text variant="small" tone="muted">
          This app uses a root Stack (see app/_layout.tsx). The hub at app/index.tsx
          renders the route table from src/ui/navigation/routes.ts — Expo Router
          owns the files, routes.ts owns the metadata.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. File-based routing concept — mapped to THIS app                  */
/* ------------------------------------------------------------------ */

const FILE_RULES: ReadonlyArray<{
  pattern: string;
  means: string;
  example: string;
}> = [
  { pattern: 'app/index.tsx', means: 'The home route "/"', example: 'this app’s hub' },
  { pattern: 'app/about.tsx', means: 'Static route "/about"', example: 'About screen' },
  { pattern: 'app/ui/index.tsx', means: 'Folder root "/ui"', example: 'UI section landing' },
  { pattern: 'app/ui/layout.tsx', means: 'Nested route "/ui/layout"', example: 'Layout screen' },
  { pattern: 'app/_layout.tsx', means: 'Navigator layout (wraps siblings)', example: 'root Stack' },
  {
    pattern: 'app/navigation-routing/[id].tsx',
    means: 'Dynamic route "/navigation-routing/:id"',
    example: 'param detail (built below)',
  },
  {
    pattern: 'app/[...rest].tsx',
    means: 'Catch-all (splat) — matches anything unmatched',
    example: 'placeholder for unbuilt topics',
  },
];

function FileBasedRoutingCard() {
  return (
    <Section
      title="Files under app/ ARE the routes"
      explanation="No central router config to register paths — the filesystem is the config. Special filenames carry meaning."
    >
      <Box gap="xs">
        {FILE_RULES.map((r) => (
          <Box key={r.pattern} gap="xxs">
            <Text variant="small" style={{ fontFamily: 'monospace' }}>
              {r.pattern}
            </Text>
            <Text variant="caption" tone="muted">
              {r.means} — e.g. {r.example}
            </Text>
          </Box>
        ))}
      </Box>
      <Code>{`app/
  _layout.tsx              ← root navigator (Stack)
  index.tsx                ← "/"            (hub)
  about.tsx                ← "/about"
  ui/
    index.tsx              ← "/ui"          (folder root)
    layout.tsx             ← "/ui/layout"
  navigation-routing.tsx   ← "/navigation-routing"  (THIS screen)
  navigation-routing/
    [id].tsx               ← "/navigation-routing/:id"
  [...rest].tsx            ← "*"  catch-all placeholder`}</Code>
      <Text variant="small" tone="muted">
        Dynamic segments use [brackets]; catch-alls use [...splat]. Route groups
        use (parentheses) — see the Grouping card.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Imperative navigation — useRouter playground (LIVE)              */
/* ------------------------------------------------------------------ */

function ImperativeNavCard() {
  const { entries, clear, go } = useImperativeNav();

  return (
    <Section
      title="Imperative navigation: useRouter()"
      explanation="useRouter() returns the router object with push / replace / back / navigate. Tap these to navigate to REAL routes and watch the log."
    >
      <Code>{`const router = useRouter();
router.push('/about');        // add to stack
router.replace('/about');     // swap top (no back)
router.back();                // pop
router.navigate('/about');    // push if new, pop-to if on stack`}</Code>
      <Text variant="small" tone="muted">
        Targets below are real routes in this app. You will leave this screen —
        the log survives because Stack keeps mounted screens alive underneath.
      </Text>
      <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
        <Button title="push /about" variant="filled" onPress={() => go('push', '/about')} />
        <Button
          title="push /ui/design-system"
          variant="outline"
          onPress={() => go('push', '/ui/design-system')}
        />
        <Button
          title="replace /about"
          variant="ghost"
          onPress={() => go('replace', '/about')}
        />
        <Button title="back()" variant="ghost" onPress={() => go('back', '')} />
      </Box>
      <NavLogPanel entries={entries} onClear={clear} />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Declarative <Link> (LIVE)                                        */
/* ------------------------------------------------------------------ */

function DeclarativeLinkCard() {
  const { theme } = useTheme();
  return (
    <Section
      title="Declarative navigation: <Link>"
      explanation="For pure navigation, prefer the declarative <Link> (renders an underlined tappable text) over an onPress + router.push."
    >
      <Code>{`import { Link } from 'expo-router';

<Link href="/about">Go to About</Link>
<Link href="/ui/layout">Layout screen</Link>`}</Code>
      <Text variant="small" tone="muted">
        Tap a link — it pushes the route just like router.push, with no handler
        boilerplate. On web it renders a real {'<a>'}.
      </Text>
      <Box
        gap="xs"
        p="sm"
        radius="sm"
        bg="surfaceVariant"
        style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }}
      >
        <Link href="/about">
          <Text variant="small" tone="primary" style={{ textDecorationLine: 'underline' }}>
            Go to About →
          </Text>
        </Link>
        <Link href="/ui/layout">
          <Text variant="small" tone="primary" style={{ textDecorationLine: 'underline' }}>
            Go to Layout & Structure →
          </Text>
        </Link>
        <Link href="/lifecycle">
          <Text variant="small" tone="primary" style={{ textDecorationLine: 'underline' }}>
            Go to Lifecycle →
          </Text>
        </Link>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Dynamic routes & params (LIVE playground)                        */
/* ------------------------------------------------------------------ */

function DynamicParamsCard() {
  const { value, setValue, global, navigateToDetail } = useDynamicParams();
  const { theme } = useTheme();

  return (
    <Section
      title="Dynamic routes & params"
      explanation="A [param].tsx file captures a URL segment. The detail route app/navigation-routing/[id].tsx was built for this demo — enter a value and navigate."
    >
      <Code>{`// app/navigation-routing/[id].tsx
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();

// push with the typed pathname form:
router.push({
  pathname: '/navigation-routing/[id]',
  params: { id: 'post-42' },
});`}</Code>
      <Text variant="small" tone="muted">
        Enter an id, tap Navigate, then read the value on the detail screen via
        useLocalSearchParams. The detail screen also surfaces a back button.
      </Text>
      <Box row gap="xs" style={{ alignItems: 'center' }}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="enter an id"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.sm,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            color: theme.colors.text,
            fontFamily: 'monospace',
          }}
        />
        <Button title="Navigate →" onPress={navigateToDetail} />
      </Box>
      <Box gap="xxs">
        <Text variant="caption" tone="muted">
          useGlobalSearchParams() — every active param, app-wide:
        </Text>
        <Code>{JSON.stringify(global, null, 0) || '{}'}</Code>
      </Box>
      <Text variant="small" tone="muted">
        useLocalSearchParams reads THIS screen’s own params (preferred inside a
        screen); useGlobalSearchParams reads the merged params across the whole
        app (handy for deeply-shared values, but it re-renders on any param
        change app-wide).
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Navigator types — Stack / Tabs / Drawer                          */
/* ------------------------------------------------------------------ */

function NavigatorTypesCard() {
  return (
    <Section
      title="Navigator types: Stack / Tabs / Drawer"
      explanation="A navigator is declared in a _layout.tsx by rendering <Stack />, <Tabs />, or <Drawer />. This app uses a single root Stack."
    >
      <Box gap="xs">
        <Box>
          <Text variant="small" style={{ fontWeight: '600' }}>
            Stack (this app’s root)
          </Text>
          <Code>{`// app/_layout.tsx
<Stack screenOptions={{ headerShown: false }} />`}</Code>
          <Text variant="caption" tone="muted">
            Push/pop, like a browser history. One screen visible at a time.
          </Text>
        </Box>
        <Box>
          <Text variant="small" style={{ fontWeight: '600' }}>
            Tabs
          </Text>
          <Code>{`// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
<Tabs screenOptions={{ tabBarActiveTintColor: '#2b6cb0' }}>
  <Tabs.Screen name="index" options={{ title: 'Home' }} />
  <Tabs.Screen name="search" options={{ title: 'Search' }} />
</Tabs>`}</Code>
          <Text variant="caption" tone="muted">
            Bottom-tab switcher. Put screens in an app/(tabs)/ folder.
          </Text>
        </Box>
        <Box>
          <Text variant="small" style={{ fontWeight: '600' }}>
            Drawer
          </Text>
          <Code>{`import { Drawer } from 'expo-router';
<Drawer screenOptions={{ drawerPosition: 'left' }}>
  <Drawer.Screen name="index" options={{ title: 'Home' }} />
</Drawer>`}</Code>
          <Text variant="caption" tone="muted">
            Side drawer. Requires react-native-gesture-handler + reanimated
            (already installed in this app). The project backlog adds a drawer
            linking to About.
          </Text>
        </Box>
      </Box>
      <Text variant="small" tone="muted">
        screenOptions at the navigator level applies to all children; each
        Tabs/Drawer/Stack.Screen can override via its own options prop.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Grouping, shared layouts, hidden routes                          */
/* ------------------------------------------------------------------ */

function GroupingAndLayoutsCard() {
  return (
    <Section
      title="Grouping, shared layouts & hidden routes"
      explanation="Route groups (folder) don’t affect the URL — they exist only to share a _layout.tsx. href:null hides a route from links/Tabs while keeping it navigable."
    >
      <Code>{`app/
  (auth)/                 ← group; URL is NOT /auth/...
    _layout.tsx           ← shared header/auth-guard for the group
    sign-in.tsx           ← "/sign-in"
    sign-up.tsx           ← "/sign-up"
  (tabs)/
    _layout.tsx           ← the tab bar
    index.tsx             ← "/"
    profile.tsx           ← "/profile"

// Hide a tab/screen from the bar but keep the route reachable:
<Tabs.Screen name="settings" options={{ href: null }} />`}</Code>
      <Text variant="small" tone="muted">
        In this app, the UI sub-screens (app/ui/*) share the root Stack — they
        have no dedicated _layout.tsx, so they inherit the root. Adding one
        would give just that section a shared header or transition.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Deep linking & web URL mapping                                   */
/* ------------------------------------------------------------------ */

function DeepLinkingCard() {
  return (
    <Section
      title="Deep links & web URL mapping"
      explanation="Expo Router maps each file to a URL automatically — the same path works as a deep link on device and as the URL on web."
    >
      <Code>{`// this very screen
app/navigation-routing.tsx        →  /navigation-routing

// nested + dynamic
app/ui/layout.tsx                 →  /ui/layout
app/navigation-routing/[id].tsx   →  /navigation-routing/:id`}</Code>
      <Text variant="small" tone="muted">
        On web (npx expo export --platform web), navigating to
        /navigation-routing renders this screen directly in the browser — no
        extra config. On device, a deep link into /navigation-routing/post-42
        opens the [id] detail screen. Configure a custom scheme/prefix in
        app.config.ts under scheme.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 9. useFocusEffect (LIVE)                                           */
/* ------------------------------------------------------------------ */

function FocusEffectCard() {
  const { entries, clear } = useFocusLog();

  return (
    <Section
      title="useFocusEffect — run code on screen focus"
      explanation="From @react-navigation/native. Like useEffect, but fires every time THIS screen becomes active (navigation focus), not just on mount. (Lifecycle screen covers it in depth.)"
    >
      <Code>{`import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    // screen became active — refetch, log, start timers…
    return () => { /* blur cleanup */ };
  }, []),
);`}</Code>
      <Text variant="small" tone="muted">
        Navigate away (e.g. push /about) and come back — you’ll see a new focus
        entry each time, plus a blur entry when you left.
      </Text>
      <NavLogPanel entries={entries} onClear={clear} emptyHint="Leave and return to this screen…" />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 10. Programmatic patterns: params, redirect, typed routes           */
/* ------------------------------------------------------------------ */

function ProgrammaticPatternsCard() {
  return (
    <Section
      title="Programmatic patterns"
      explanation="Passing params, redirecting on mount, and type-safe Hrefs — the three things you reach for once push/replace isn’t enough."
    >
      <Box gap="xs">
        <Box>
          <Text variant="small" style={{ fontWeight: '600' }}>
            Pass params (object form is checked)
          </Text>
          <Code>{`router.push({
  pathname: '/navigation-routing/[id]',
  params: { id: 'post-42', from: 'hub' },
});
// read: const { id, from } = useLocalSearchParams<{id:string; from:string}>();`}</Code>
        </Box>
        <Box>
          <Text variant="small" style={{ fontWeight: '600' }}>
            Redirect on mount
          </Text>
          <Code>{`import { Redirect } from 'expo-router';

// declarative — render instead of the screen:
<Redirect href="/sign-in" />

// or imperative inside an effect:
useEffect(() => { router.replace('/sign-in'); }, []);`}</Code>
        </Box>
        <Box>
          <Text variant="small" style={{ fontWeight: '600' }}>
            Type-safe routes (Href)
          </Text>
          <Code>{`import type { Href } from 'expo-router';

// With typed routes enabled (app.config extra-router.typedRoutes),
// 'href' only accepts real paths — typos fail at compile time:
const target: Href = '/about';
<Link href={target}>…</Link>

// This app casts (router.push(path as never)) in the hub because routes.ts
// paths are runtime strings; a typed entry point would narrow them.`}</Code>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 11. Expo Router vs classic React Navigation                         */
/* ------------------------------------------------------------------ */

function VersusReactNavigationCard() {
  return (
    <Section
      title="Expo Router vs classic React Navigation"
      explanation="You’ll see both in the wild. Expo Router is a thin layer over React Navigation — same engines under the hood, config-free file-based API on top."
    >
      <Code>{`// CLASSIC react-navigation (imperative config) — still common pre-2023
const Stack = createNativeStackNavigator();
<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Detail" component={DetailScreen} />
</Stack.Navigator>
// navigate:
navigation.navigate('Detail', { id: '42' });`}</Code>
      <Code>{`// EXPO ROUTER (2023+, the standard) — files ARE the config
// app/detail/[id].tsx  →  route "/detail/:id"
router.push({ pathname: '/detail/[id]', params: { id: '42' } });`}</Code>
      <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
        <Pill tone="primary">Same core (React Navigation v6/v7)</Pill>
        <Pill>File-based config</Pill>
        <Pill>Auto deep links + web</Pill>
        <Pill>Typed routes</Pill>
      </Box>
      <Text variant="small" tone="muted">
        Reach for Expo Router on any new Expo project. The classic
        createXNavigator APIs remain valid for non-Expo or pre-existing bare
        RN apps — but you get Expo Router’s ergonomics for free in any Expo app.
      </Text>
    </Section>
  );
}
