# AI defined section:

## Current state
- TS conventions: strict + `noUncheckedIndexedAccess` + `erasableSyntaxOnly` + `jsx: react-jsx`; const-object + literal union instead of `enum`; co-located `*.spec.ts(x)` (jest-expo preset);
  DRY/KISS/SOLID, reuse over duplication; naming/layering mirrors `react_developers_guide`.
- Component placement: single-file components = local fns in the view; ALL multi-file components in `src/ui/components/` (incl. design-system primitives Box/Text/Button/Card);
  `src/ui/design-system/` holds ONLY tokens + theme + ThemeProvider.
- View/hooks/spec convention (logic↔UI separation): each topic dir `src/ui/views/<topic>/` (snake_case) contains `<topic>_view.tsx` (DUMB UI — no useState/useEffect/useCallback/container calls;
  only renders, imports logic from the hooks file) + `<topic>.spec.tsx` (RNTL renderHook for the hook + `render(<View/>)` smoke test that mocks `screen-scaffold` so expo-router/SafeArea contexts
  aren't needed).
  Add `<topic>_hooks.ts` (custom `use…` hooks + pure domain helpers) ONLY if the screen has state/effects/container/other-hook calls; static teaching screens omit it. Expo Router route
  `app/<route>.tsx` = thin `<XxxView/>` wrapper. UI-section sub-screens under `src/ui/views/ui_hub/sub_views/<topic>/`. EXEMPLAR to copy structure-for-structure:
  `src/ui/views/exception_handling/`.
  jest.mock factories cannot reference imported values — `require()` them inside the factory (see the exemplar's screen-scaffold mock); the jest-hoist babel plugin flags identifiers in factory TYPE
  annotations — use `mock`-prefixed param names (expo-sensors mock).
- Architecture (invariant: deps point inward): `domain/` (pure) ← `data/` (remote+local+repos+fakes) ← `core/` (result, error-handling, container, config, scenario); `ui/` depends on domain+core
  and on data only via the container. Full doc: `ARCHITECTURE.md`.
  Error pipeline: engine error → `AppException` (typed, `.cause`-chained) → `mapExceptionToFailure` → `Failure` (kind+severity+message, chained) → `safeRepositoryCall` → `Result<T>`
  (`Success<T,warning?>` | `Failed`). Severity drives UI: Critical = full-screen `<ShowError/>`; Warning/Info = non-blocking toast.
  Offline-first severity: `serveFromCache` maps AppException→Failure exactly ONCE, downgrades the stale-cache Failure to Warning via `Failure.withSeverity` (returns a `SeverityOverrideFailure`
  decorator delegating kind/message/chain/cause BY REFERENCE — never copied) attached as `Success.warning` (renders amber, not blue). `forwardNetworkFailure`/`chainedCacheFailure` accept the
  already-mapped Failure — no double `mapExceptionToFailure`, no dead `CacheFailure`.
  DI: hand-rolled service locator `core/container.ts`. Bootstrap runs SYNCHRONOUSLY at module eval: `src/core/container/bootstrap.ts` (`container.initialize(createAppConfig())`)
  side-effect-imported by `app/_layout.tsx` BEFORE the Drawer mounts (the old useEffect init raced bottom-up effects → child hit "Dependency … is not registered"; expo-constants/`EXPO_PUBLIC_*`
  are sync at module eval). `initialize` is idempotent; `resolve()` enforces init with a clear error. Registry = typed fields (7 singletons known up front; string-keyed Map + symbol casts
  removed); `setUseFakeApi` + `dispose()` unchanged.
- RN-standard choices (vs web ref): Expo managed + TS + Expo Router (file-based) · HTTP = built-in `fetch` + interceptor pipeline (auth/retry/failure-injection), not axios · AsyncStorage behind a
  DAO (relational swap target: expo-sqlite / WatermelonDB) · routing = Expo Router files + data-driven `ui/navigation/routes.ts` SSOT · design system = TS tokens + StyleSheet + ThemeProvider
  (light/dark via AsyncStorage + useColorScheme), not CSS vars/Tailwind · envs = `app.config.ts` + `EXPO_PUBLIC_*` + EAS profiles → expo-constants → `core/config`.
- Token-usage discipline: no raw numbers/colors in views where a token exists (`Card` gained `mb?: SpacingKey`); one-off illustration dims extracted to named local consts; deliberately NO
  parallel Size/dimension scale (remaining values matched existing tokens or were genuine one-offs). Untagged hex literals left as-is (out of scope / dark-mode rendering).
- Native device features: `device_features` is a section HUB (`/device-features`) linking 6 sub-screens (permissions, haptics, geolocation, camera, secure_storage, sensors), mirroring the
  `ui_hub` → `sub_views/` pattern + exemplar convention. Shared permission kernel (`PERMISSION_STATUS`, `permissionLabel`, `statusOfPermission`) + `deviceInfo()` live in hub-level
  `device_features_hooks.ts` (SSOT); each feature's native calls in its own `<feature>_hooks.ts`. Expo Router folder `app/device-features/` (`_layout.tsx` Stack + `index.tsx` + one file per
  feature). `expo-sensors` added; global `jest.mocks.ts` covers it + camera permissions.
- Review-findings rules in force (F6–F12): HttpClient `request`/`get` = named closures in the factory (no object-literal methods, no `this` — `const { get } = client` and callback-passing are
  safe) · text tone→colour via `Record<TextTone, keyof Palette>` lookup (single source of truth) · `ScreenScaffold` has NO `subtitle` prop (removed from all 41 call sites) · `Code`'s `tone` prop
  kept but narrowed + documented (react_fundamentals uses it) · `src/core/utils/arrays.ts` `requireHead`/`requireAt` satisfy `noUncheckedIndexedAccess` without `!` · `assertNever`
  (core/utils/types.ts) for reducer exhaustiveness (`usePosts` `default: assertNever(action)`) · warning-toast effect centralized in `src/ui/hooks/use-warning-toast.ts`, deduped on STABLE key
  `${kind}:${message}` (ref-identity re-toasted every fetch), spec covers the dedup regression.

## Bug History (Do Not Reintroduce)
(AI-supervised section — add entries freely, keep concise.)
- `JSON.stringify(bigint)` THROWS (`TypeError: Do not know how to serialize a BigInt`), likewise symbol/function. Fix: `safeStringify()` helper (bigint → `` `${v}n` ``). Never pass
  BigInt/Symbol/Function to JSON.stringify for display.
- React-19 anti-patterns that red-screen/warn under StrictMode: (1) calling another component's setState inside a setState UPDATER (updater must be pure — side effect goes in the enclosing async
  callback + a ref); (2) setState inside `useMemo` (→ `useEffect` keyed on the memo result); (3) `useLayoutEffect` with no dep array + imperative `ref.measure` (thrashes Fabric — use a dep array
  + `onLayout`).
- `VirtualizedLists should never be nested inside plain ScrollViews` — `ScreenScaffold` wraps children in a ScrollView; in-screen FlatLists need the non-scrollable path + `nestedScrollEnabled` +
  a bounded-height container.
- Badge/chip sizing: never put long content text inside the same element as a short label/chip (release-checklist pills grew with the title). Fixed-`minWidth` `StepBadge` holds ONLY "step N";
  descriptive text is always a flex sibling.
- Hermes (RN 0.79 / Expo SDK 53) ships `Intl.NumberFormat`/`DateTimeFormat` but NOT `Intl.PluralRules` — `new Intl.PluralRules(tag)` throws on-device while Node/jest passes. Fix:
  `selectPluralCategory()` guards via `HAS_INTL_PLURAL_RULES` with a CLDR `fallbackPluralCategory()`; prod-standard = `@formatjs/intl-pluralrules` polyfill at app root (teach both).

## Active tasks
- (none open in the AI section — pending items live in the Developer section below)

# Developer defined section

- Project requirements
    - I want to implement a react native project following the code architecture similar to Development/personal/react/react_developers_guide, separating ui, domain, data layer, error handling, state management, etc
    - Although I want similar implementation, but I prefer domain specificity, for example if something is done in react native in standard way that is different from the reference project, then better point it out the standard way rather than forcing it like the reference project
    - I will add my requirements to this file marked as "⏳" and you will keep finishing them and marking them "✅" on completion

- One time setup for application architecture
    - Most standard and optimium (for react native) navigation and routing implementation ✅
    - Most standard and optimum (for react native) Full clean architecture pipeline implementation from fetching posts usecase, repository, dto's, dao's, remote, local, etc; check react_developers_guide for reference ✅
    - Dependency management setup implementation ✅
    - Exception handling implementation, take reference from react_developers_guide and flutter_developers_guide ✅
        - How it chains multiple exceptions, how it show in multiple ways like blocking, non-blocking, etc based on exception severity
    - Design system implementation ✅
        - Implement the design system in the most standard way of react native
        - Look for reference implementation in react_developers_guide and flutter_developers_guide
        - This has to be used through out the UI implementation
    - Environments/flavours setup ✅
    - Testing infrastructure ✅

- Generic instructions:
    - You have to build UI using the design system implemented in the application
    - You have to follow the proper architecture that is followed in the application, for example, having use cases, repositories, repositoriesImpl, remote, DTOs, local, DAOs, exception handling, and so on
    - You have to check if existing components can be reused instead of creating new ones. If a component is to be used in a single file, then better to make it a function inside that view. If a component is to be used in multiple files, then create it inside the global ui/components
    - If feeling confused about how to do things, you are free to check how it's done in other parts of this app; the goal is to maintain consistency throughout the app
    - You have to follow few principles to write quality code, but these are not to be forced as some technologies have their standards, for example react uses hooks and other technologies use their own standards:
        - Core programming principles:
            - DRY, KISS, YAGNI, SOLID, Separation of concerns, Single source of truth
        - Object oriented design if required
            - Encapsulation, Abstraction, Inheritance, Polymorphism, Composition over inheritance, Command query separation, Law of Demeter, Dependency Injection, Inversion of control, High cohesion, Low coupling
        - Software design
            - Modularity, Maintainability, Readibility, Extensibility, Defensive programming (input is hostile), Immutability, Pure functions, Referential Transparency, Composition, Lazy evaluation
        - Code quality
            - Self documenting (descriptive naming), Consistent formatting, Error handling
        - Concurrency
            - Thread safety, Synchronization, Immutability
        - Security
            - Least priviledge, Input validation, Secret management
        - Testing
            - Unit tests, Test behaviour not implementation
        - Refactoring
            - Incremental refactoring, remove duplication
        - Engineering principles
            - Unix philosophy (composable tools beat monoliths)
        - Performance
            - Right algorithms, Right datastructures, Caching, Batching
    - You have to follow react native best practices:
        -
    - Keep "agentic_development.md" for this project as lean as possible without compromising it's primary purpose to high quality consistent development, optimize token efficiency and seemless development across sessions. Remove the information inside the "AI defined section" that is no longer relevant and will not be usefull in future to save tokens

- Development tasks:
    - Update the development tasks based on your expertise ✅
        - Currently as I am very new to react native, I may not even have idea that some topics exist for me to even put in this list of tasks, you have to put the list of screens, sub sections etc into this file under Development tasks, I have tried to put some there in a hurry, but you have to update it to cover every point
        - Please go through react_developers_guide, flutter_developers_guide, android_developers_guide, ios_developers_guide, as 3 of these projects are dedicated for native development; these all are present inside /Development/personal/
    - React native fundamentals screen ✅
        - Include everything fundamental to react
    - Typescript/Javascript fundamentals screen ✅
        - Include all things like variables, consts, lool, conditions, etc
        - Put all typescript/javascript fundamentals in a single screen instead of separate screens like flutter
    - UI section ✅
        - UI manipulation section ✅
            - Layout and structure screen ✅
            - Styling ✅
            - Interactive behaviours screen ✅
                - Like click, hover, focus, etc
        - Responsive layout screen ✅
            - How responsiveness is implemented in react in standard way like using bootstrap, tailwind, etc
        - Design system screen ✅
    - Lifecycle screen ✅
        - Show how each and every lifecyle method is used
    - Navigation and routing screen ✅
    - State management section ✅
        - I don't know in detail how these state managment solutions are used, but I know that they are popular, maybe they are not even used for what I am asking, I will let you reason and inform me
    - API handling ✅
        - Implement a simple fetching of posts and displaying like done in the reference projects with full pipeline like usecase, repository, etc, however it's done in the most standard way in react native
        - Implement API handling screen where an example is implemented to fetch and show posts explaining how it's done
    - Database handling ✅
    - Exception handling ✅
        - Although I assume it's also done during the API handling
    - Dependency management ✅
    - Architecture screen ✅ (see above)
    - Testing ✅
        - Implement tests ✅
        - Implement testing screen explaining how it's done in react native ✅
    - Debugging screen ✅
        - Explaining how debugging is done in react native ✅
    - Environments/Flavours for dev, staging, and prod ✅
    - Best practices screen ✅
        - Explaining how things are done in best way in react for performance, efficiency, maintainance, etc
    - Drawer ✅
        - This has link to about screen ✅
    - Candidate future topics (not yet built — surfaced so nothing is missed; build on demand)
        - Native device features — camera, geolocation, permissions, haptics, sensors, secure storage ✅
        - Notifications — local + push (`expo-notifications`); ✅
        - Animations & gestures — `Animated` API, `react-native-reanimated`, `react-native-gesture-handler` (reanimated/gesture-handler are already deps via the Drawer) ✅
        - Forms & validation — controlled-form patterns, schema validation (zod/yup), react-hook-form ✅
        - Internationalization (i18n) — `expo-localization` + i18n-js/FormatJS, RTL ✅
        - Offline support — cache-first strategies, background sync, optimistic UI (extends the existing DAO cache) ✅
        - Third-party services — analytics, crash reporting (Sentry/Firebase), auth providers (OAuth), payments; flutter guide's `third_party_services` screen ✅
        - Production build & deployment — EAS Build/Submit, app signing, store submission, OTA updates (EAS Update); flutter guide's `production_build_deployment` screen. ✅
        - Platform-specific code — `Platform.OS`, `*.android.tsx`/`*.ios.tsx` file extensions, native modules, config plugins ✅
        - App state & backgrounding — `AppState`, background tasks (`expo-background-fetch`/`expo-task-manager`) ✅
        - Images, icons, splash & assets — `expo-image`, app icon, splash screen, dynamic asset loading ✅

- Updates requested based on review
    - UI updates
        - Please move images, icons, splash and assets link from home to UI section ✅
        - For native device features, please move each to their separate screens with samples included ✅
        - In build & deployment screen, please fix this unusual UI inside release checklist, step 1, step 2, and so on with each step the container size is going big, just keep the text "step 1", "step 2", etc and not including long text ✅
    - Code structuring and architecture issues
        -
    - Crashes and issues
        - Internationalization throws an error, please check ✅
    - Review code and refactor to take implementation to 10/10 ✅
        - Review from the perspective of a developer who has 10 years of experience in react native and 30 years of experience in Software development, who knows all the best practices and bad practices, whose code is simple to understand yet robust
        - Review how architecture is implemented
        - Review how design system is implemented
        - Review how hook files and logic inside them are implemented, if this is even standard or just spaghetti code
        - Review all other aspects
        - This particular task has to be taken up after all other tasks and pending items are cleared
