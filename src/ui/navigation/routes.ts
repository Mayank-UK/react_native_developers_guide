/**
 * RoutePaths — the single source of truth for the app's routes. Mirrors the
 * sibling guides' `RoutePaths` / Flutter `RoutePaths`.
 *
 * Note (RN vs web reference): the web guide uses a pure-data route table that
 * *is* the router. RN's standard is Expo Router (file-based routing). We keep a
 * data-driven route table as the SSOT for screen *metadata* (path, title,
 * description, icon) consumed by the hub grid and drawer, while Expo Router
 * owns the file convention that resolves those paths. Each entry here must map
 * 1:1 to a file under `app/`.
 */
export const RoutePaths = {
  home: '/',
  about: '/about',
  reactFundamentals: '/react-fundamentals',
  tsJsFundamentals: '/typescript-javascript-fundamentals',
  ui: '/ui',
  layoutStructure: '/ui/layout',
  styling: '/ui/styling',
  interactive: '/ui/interactive',
  responsive: '/ui/responsive',
  designSystem: '/ui/design-system',
  lifecycle: '/lifecycle',
  navigation: '/navigation-routing',
  stateManagement: '/state-management',
  localState: '/state-management/local-state',
  zustand: '/state-management/zustand',
  redux: '/state-management/redux',
  serverState: '/state-management/server-state',
  apiHandling: '/api-handling',
  databaseHandling: '/database-handling',
  exceptionHandling: '/exception-handling',
  dependencyManagement: '/dependency-management',
  architecture: '/architecture',
  testing: '/testing',
  debugging: '/debugging',
  environments: '/environments',
  bestPractices: '/best-practices',
  formsValidation: '/forms-validation',
  animationsGestures: '/animations-gestures',
  deviceFeatures: '/device-features',
  platformSpecific: '/platform-specific',
  buildDeployment: '/build-deployment',
  internationalization: '/internationalization',
  notifications: '/notifications',
  appState: '/app-state',
  offline: '/offline',
  thirdPartyServices: '/third-party-services',
  imagesAssets: '/images-assets',
} as const;

export type RoutePath = (typeof RoutePaths)[keyof typeof RoutePaths];

/**
 * Route metadata for the hub grid + drawer. Grouping mirrors the Flutter guide's
 * topic sections. `enabled` marks screens still on the backlog (content-topic
 * screens come after this architecture-setup run).
 */
export interface RouteMeta {
  path: string;
  title: string;
  description: string;
  group: string;
  enabled: boolean;
  /** Whether this route appears as a shortcut in the root Drawer. */
  inDrawer?: boolean;
}

export const ROUTES: readonly RouteMeta[] = [
  {
    path: RoutePaths.reactFundamentals,
    title: 'React Fundamentals',
    description: 'Components, props, state, hooks, JSX.',
    group: 'Fundamentals',
    enabled: true,
  },
  {
    path: RoutePaths.tsJsFundamentals,
    title: 'TypeScript & JavaScript Fundamentals',
    description: 'Variables, control flow, types, async.',
    group: 'Fundamentals',
    enabled: true,
  },
  {
    path: RoutePaths.ui,
    title: 'UI Section',
    description: 'Layout, styling, interaction, responsiveness.',
    group: 'UI',
    enabled: true,
  },
  {
    path: RoutePaths.layoutStructure,
    title: 'Layout & Structure',
    description: 'Flexbox, View, justifyContent/alignItems, lists.',
    group: 'UI',
    enabled: true,
  },
  {
    path: RoutePaths.styling,
    title: 'Styling',
    description: 'StyleSheet, tokens, themes, pitfalls.',
    group: 'UI',
    enabled: true,
  },
  {
    path: RoutePaths.interactive,
    title: 'Interactive Behaviours',
    description: 'Pressable, focus, hover, gestures.',
    group: 'UI',
    enabled: true,
  },
  {
    path: RoutePaths.responsive,
    title: 'Responsive Layout',
    description: 'useWindowDimensions, breakpoints, keyboard.',
    group: 'UI',
    enabled: true,
  },
  {
    path: RoutePaths.designSystem,
    title: 'Design System',
    description: 'Tokens → theme → primitives (this app).',
    group: 'UI',
    enabled: true,
  },
  {
    path: RoutePaths.lifecycle,
    title: 'Lifecycle',
    description: 'Mount, update, unmount and effect phases.',
    group: 'UI',
    enabled: true,
  },
  {
    path: RoutePaths.navigation,
    title: 'Navigation & Routing',
    description: 'Expo Router: stacks, tabs, deep links.',
    group: 'UI',
    enabled: true,
  },
  {
    path: RoutePaths.stateManagement,
    title: 'State Management',
    description: 'useReducer, Context, Zustand, TanStack Query.',
    group: 'State & Data',
    enabled: true,
  },
  {
    path: RoutePaths.localState,
    title: 'Local State (useState/useReducer)',
    description: 'Local component state + shared client state via Context.',
    group: 'State & Data',
    enabled: true,
  },
  {
    path: RoutePaths.zustand,
    title: 'Zustand',
    description: 'Tiny selector-based shared client state store.',
    group: 'State & Data',
    enabled: true,
  },
  {
    path: RoutePaths.redux,
    title: 'Redux Toolkit',
    description: 'Opinionated single store + unidirectional flow.',
    group: 'State & Data',
    enabled: true,
  },
  {
    path: RoutePaths.serverState,
    title: 'Server State (TanStack Query)',
    description: 'Async/cache server state — cache, retry, invalidation.',
    group: 'State & Data',
    enabled: true,
  },
  {
    path: RoutePaths.apiHandling,
    title: 'API Handling',
    description: 'Full clean-architecture posts pipeline (live demo).',
    group: 'State & Data',
    enabled: true,
    inDrawer: true,
  },
  {
    path: RoutePaths.databaseHandling,
    title: 'Database Handling',
    description: 'Local persistence via the DAO + repository seam.',
    group: 'State & Data',
    enabled: true,
  },
  {
    path: RoutePaths.exceptionHandling,
    title: 'Exception Handling',
    description: 'AppException → Failure → Result pipeline.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.dependencyManagement,
    title: 'Dependency Management',
    description: 'The service-locator container.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.architecture,
    title: 'Architecture',
    description: 'Layering, invariants, the error pipeline.',
    group: 'Cross-cutting',
    enabled: true,
    inDrawer: true,
  },
  {
    path: RoutePaths.testing,
    title: 'Testing',
    description: 'Jest + React Native Testing Library.',
    group: 'Cross-cutting',
    enabled: true,
    inDrawer: true,
  },
  {
    path: RoutePaths.debugging,
    title: 'Debugging',
    description: 'Flipper, DevTools, logs, scenarios.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.environments,
    title: 'Environments / Flavours',
    description: 'dev / staging / prod via Expo + EAS.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.bestPractices,
    title: 'Best Practices',
    description: 'Performance, accessibility, maintainability.',
    group: 'Cross-cutting',
    enabled: true,
    inDrawer: true,
  },
  {
    path: RoutePaths.formsValidation,
    title: 'Forms & Validation',
    description: 'Controlled inputs, schema validation, react-hook-form.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.animationsGestures,
    title: 'Animations & Gestures',
    description: 'Animated API, Reanimated, gesture handling.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.deviceFeatures,
    title: 'Native Device Features',
    description: 'Permissions, haptics, location, media, secure storage.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.platformSpecific,
    title: 'Platform-Specific Code',
    description: 'Platform.OS, .ios/.android extensions, config plugins.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.buildDeployment,
    title: 'Build & Deployment',
    description: 'EAS Build/Submit, signing, OTA updates, store release.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.internationalization,
    title: 'Internationalization (i18n)',
    description: 'Locales, translations, formatting, RTL.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.appState,
    title: 'App State & Backgrounding',
    description: 'AppState, background tasks, OS lifecycle.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.notifications,
    title: 'Notifications',
    description: 'Local + push notifications, permissions, channels.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.offline,
    title: 'Offline Support',
    description: 'Cache-first, network detection, optimistic UI, sync.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.thirdPartyServices,
    title: 'Third-party Services',
    description: 'Analytics, crash reporting, auth, payments — behind ports.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.imagesAssets,
    title: 'Images, Icons, Splash & Assets',
    description: 'expo-image, app icon, splash, dynamic asset loading.',
    group: 'Cross-cutting',
    enabled: true,
  },
  {
    path: RoutePaths.about,
    title: 'About',
    description: 'About this guide.',
    group: 'About',
    enabled: true,
    inDrawer: true,
  },
];
