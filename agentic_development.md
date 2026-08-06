# AI defined section:

## Conventions

- TS strict + `noUncheckedIndexedAccess` + `erasableSyntaxOnly` + `jsx: react-jsx`.
- Const-object + literal union instead of `enum` (erasableSyntaxOnly).
- Co-located `*.spec.ts` test style; `jest-expo` preset.
- Const-object + literal union, DRY/KISS/SOLID, reuse over duplication. Single-file components stay as local fns; ALL multi-file components go in `src/ui/components/` (including the design-system primitives Box/Text/Button/Card). `src/ui/design-system/` holds only tokens + theme + ThemeProvider.
- Naming/layering mirrors `react_developers_guide`.
- **View/hooks/spec convention (logic↔UI separation, in progress).** Each topic is a directory `src/ui/views/<topic>/` (snake_case) containing: `<topic>_view.tsx` (DUMB UI — no `useState`/`useEffect`/`useCallback`/container calls; only renders, imports logic from the hooks file), and `<topic>.spec.tsx` (RNTL `renderHook` for the hook + a `render(<View/>)` smoke test that mocks `screen-scaffold` so it doesn't need expo-router/SafeArea contexts). If and ONLY if the screen has state/effects/container/other-hook calls, also add `<topic>_hooks.ts` exporting custom hook(s) (`use…`) + pure domain helpers; static teaching screens omit the hooks file. The Expo Router route `app/<route>.tsx` is a thin `<XxxView/>` wrapper importing the view. UI-section sub-screens live under `src/ui/views/ui_hub/sub_views/<topic>/`. EXEMPLAR (the reference implementation to copy structure-for-structure): `src/ui/views/exception_handling/`. NOTE: jest.mock factories cannot reference imported values — `require()` them inside the factory (see the exemplar spec's screen-scaffold mock).

## Architecture

- Layering (invariant: deps point inward): `domain/` (pure) ← `data/` (remote+local+repos+fakes) ← `core/` (result, error-handling, container, config, scenario); `ui/` depends on domain+core and on data only via the container. Full doc: `ARCHITECTURE.md`.
- Error pipeline: engine error → `AppException` (data, typed, `.cause`-chained) → `mapExceptionToFailure` → `Failure` (kind+severity+message, chained) → `safeRepositoryCall` → `Result<T>` (`Success<T,warning?>` | `Failed`). Severity drives UI (Critical=full-screen `<ShowError/>`; Warning/Info=non-blocking toast).
- DI: hand-rolled service locator `core/container.ts` (getIt-equivalent). Screens resolve use cases only through `container`.

## RN-standard choices (vs web reference)

- Expo managed + TypeScript + Expo Router (file-based) — 2026 RN standard.
- HTTP: built-in `fetch` + interceptor pipeline (auth/retry/failure-injection) — web ref uses axios.
- Local storage: AsyncStorage behind a DAO (portable; web ref uses Dexie/IndexedDB, Flutter uses sqflite). Swap target for relational data: expo-sqlite / WatermelonDB.
- Routing: Expo Router files + data-driven `ui/navigation/routes.ts` (route metadata SSOT for hub/drawer); web ref's route table _is_ the router.
- Design system: TS theme tokens (`design-system/tokens.ts`) + StyleSheet + ThemeProvider context (light/dark via AsyncStorage + useColorScheme); web ref uses CSS vars + Tailwind.
- Environments: `app.config.ts` + `EXPO_PUBLIC_*` + EAS profiles → `expo-constants` → `core/config/index.ts`; web ref uses Vite `import.meta.env`.

## Decision logs

- Error-pipeline severity model: severity drives presentation (Critical → full-screen `<ShowError/>`; Warning/Info → non-blocking toast). The offline-first served-from-cache path now honors this: `serveFromCache` downgrades the already-mapped upstream Failure to Warning via `Failure.withSeverity(Warning)` before attaching it as a `Result.Success.warning`, so a stale-cache warning renders amber (toast) instead of blue. `Failure.withSeverity` returns a `SeverityOverrideFailure` decorator that delegates `kind`/`message`/`chain`/`cause` to the original (cause chain preserved BY REFERENCE, never copied/remapped). Guards helpers `forwardNetworkFailure` / `chainedCacheFailure` now accept the already-mapped `Failure` (and a db message string) instead of an `AppException` — the upstream `AppException`→`Failure` mapping happens exactly once in `serveFromCache` and is reused across the warning / forward / chained branches (no double `mapExceptionToFailure`, no dead/discarded `CacheFailure`).

- Design-system primitives (Box/Text/Button/Card) moved into `src/ui/components/` so all components share one home; `src/ui/design-system/` is now tokens + theme + ThemeProvider only.
- Token-usage discipline pass (review Finding 3): views no longer drop to raw numbers/colors where a token exists. `Card` gained `mb?: SpacingKey` (the common stack-rhythm need, previously the only gap in the primitive). Magic numbers replaced at: `api_handling_view` (mb=8→`<Card mb="sm">`), `camera_view` (180→`DEMO_ASSET_PREVIEW_HEIGHT`, radius 8→`Radii.md`), `images_assets_view` (200→`DEMO_IMAGE_HEIGHT`, radius 8→`Radii.md`, literal `#0b1220`→`DarkPalette.background`, progress-bar 8→`Spacing.sm`; lines 63/77 left as they are inside `<Code>` illustrative template strings), `lifecycle_view` (44→`TOUCH_TARGET_HEIGHT` const, radius 8→`theme.radii.md`), `animations_gestures_view` (96/110/96→`ANIMATED_API_TILE`/`REANIMATED_TILE`/`PAN_CARD_TILE`), `layout_view` (180/60/110→`FLEX_PLAYGROUND_HEIGHT`/`FLEX_GROW_TRACK_HEIGHT`/`POSITION_PLAYGROUND_HEIGHT`), `design_system_view` (48→`Spacing.xxl`, 24→`Spacing.lg`, 12→`SPACING_BAR_HEIGHT`, 52→`RADIUS_SWATCH_SIZE`). Primitive-internal: `section.tsx` accent (24→`spacing.lg`, 4→`spacing.xs`), `screen-scaffold.tsx` (`minHeight:48`→`spacing.xxl`). Decision: did NOT add a parallel `Size`/dimension scale — every remaining magic number was either an exact match for an existing Spacing/Radii token or a genuinely one-off illustration dimension (extracted to a named local const per the directive), so a new scale would be over-engineering against the existing const-object + literal-union model. `#0b1220` was the only duplicated palette literal; other untagged hex values (`#1f2a3d`, `#3b82f6`, `#2b6cb0`) were left untouched (out of scope / would change dark-mode rendering). Pixel-identical: every numeric substitution resolves to the same px. Verified `npx tsc --noEmit` clean + `npx jest` 50 suites / 432 tests green.
- Native device features split: the single `device_features` screen is now a section HUB (`/device-features`, `src/ui/views/device_features/device_features_view.tsx`) linking to six per-feature sub-screens mirroring the `ui_hub` → `sub_views/` pattern + the `exception_handling` exemplar's view/hooks/spec convention. Sub-screens: `permissions` (model teaching, no hooks file), `haptics`, `geolocation`, `camera` (picker + camera capture, two permission hooks), `secure_storage`, `sensors` (NEW — expo-sensors accelerometer). The shared permission kernel (`PERMISSION_STATUS`, `PermStatus`, `permissionLabel`, `statusOfPermission`) + `deviceInfo()` live in the hub-level `device_features_hooks.ts` as the SSOT every permissioned sub-view consumes; each feature's own native calls live in its own `<feature>_hooks.ts`. Expo Router folder `app/device-features/` (`_layout.tsx` Stack + `index.tsx` + one file per feature). `expo-sensors` added; the global `jest.mocks.ts` got `expo-sensors` + `useCameraPermissions`/`launchCameraAsync` additions. NOTE: the jest-hoist babel plugin flags identifiers in factory type annotations — the `expo-sensors` mock uses a `mock`-prefixed param name in the listener type (the only shape the plugin permits).

- DI container bootstrap + typed registry (review Findings 2 + 11): the container is now initialized SYNCHRONOUSLY at module-eval via `src/core/container/bootstrap.ts` (`container.initialize(createAppConfig())`), imported once as a side-effect by `app/_layout.tsx` before the Drawer — and therefore any child screen — can mount. This replaces the old `useEffect(() => container.initialize(...))` in Bootstrap, which raced bottom-up-firing effects: a child resolving a use case during render hit "Dependency … is not registered". `expo-constants`/`EXPO_PUBLIC_*` are available synchronously at module eval (no bridge call), so `createAppConfig()` is safe here; `initialize` is idempotent and jest.setup re-runs it per test. `Container.resolve()` enforces the invariant with a clear "call initialize(createAppConfig()) before resolving X" error. The string-keyed `Map<symbol, unknown>` registry + per-accessor `as` casts were replaced by typed fields (`private readonly`-style optionals wired in `initialize`) — the 7 singletons are all known up front, so the registry abstraction wasn't earning its keep. `setUseFakeApi` fake/live swap and `dispose()` unchanged.

## Bug History (Do Not Reintroduce)

- `JSON.stringify(bigint)` THROWS (`TypeError: Do not know how to serialize a BigInt`). The TS/JS Fundamentals screen rendered a primitive-types table incl. a BigInt and crashed on open. Fix: a `safeStringify()` helper (bigint → `` `${v}n` ``, symbol/function handled). Never pass a BigInt/Symbol/Function to `JSON.stringify` for display.
- React-19 anti-patterns that red-screen / warn under StrictMode (Lifecycle screen): (1) calling another component's setState from inside a `setState` _updater_ (must be pure) — moved the side effect into the enclosing async callback + a ref for the latest value; (2) `setState` inside `useMemo` — moved to a `useEffect` keyed on the memo result; (3) `useLayoutEffect` with NO dep array + imperative `ref.measure` (thrashes layout on Fabric) — added a dep array and switched to `onLayout`. Updaters and the memo body must be pure; setState belongs in effects or event handlers.
- `VirtualizedLists should never be nested inside plain ScrollViews` — `ScreenScaffold` wrapped all children in a `ScrollView`, so any in-screen `FlatList` (Best Practices) warned. Fix: the `scrollable` prop; embedded lists also take `nestedScrollEnabled` and a bounded-height container.
- Badge/chip sizing: never put long content text inside the same element as a short label/chip. The build_deployment release checklist rendered `<Pill label="step N" value={title}/>` — the long step title lived INSIDE the pill, so every step's number chip grew wider as the title grew. Fix: a fixed-`minWidth` `StepBadge` holding ONLY "step N", with the title/detail in a separate flex sibling. Rule: a numbered/labelled badge is a fixed-size element; descriptive text is always a sibling, never chip content.
- Hermes (RN 0.79 / Expo SDK 53) ships `Intl.NumberFormat` + `Intl.DateTimeFormat` but NOT `Intl.PluralRules` — `new Intl.PluralRules(tag)` throws `TypeError: Cannot read property 'prototype' of undefined` on-device. The Internationalization screen's `pluralize()` hit this and red-screened on open; Node/jest has PluralRules so the spec passed. Fix: `selectPluralCategory()` uses `Intl.PluralRules` when `HAS_INTL_PLURAL_RULES` and otherwise falls back to `fallbackPluralCategory()` (CLDR cardinal rules for the taught locales). Prod-standard fix is `@formatjs/intl-pluralrules` polyfill at app root; teach both.

- The above are just placeholders, add as you wish, this section comes under your direct supervision, just keep it concise and don't bloat this file

## Review-findings cleanup pass (mechanical, behavior-preserving)

Findings addressed (verify `npx tsc --noEmit` clean + `npx jest` 51 suites / 436 tests green):

- **F6 — HttpClient `this` footgun:** `createHttpClient` now declares `request`/`get` as named closures inside the factory (no object-literal method, no `this`). `const { get } = client` / passing `get` as a callback is now safe. Interceptor pipeline + retry + failure-injection unchanged.
- **F7 — ternaries:** `button.tsx` dead `outline ? 'primary' : 'primary'` collapsed to `variant === 'filled' ? 'onPrimary' : 'primary'` (intent: filled→onPrimary white-on-fill; outline/ghost→primary, matching the border hue). `text.tsx` 4-level nested tone→colour ternary replaced by a `Record<TextTone, keyof Palette>` lookup indexed into `theme.colors` (single source of truth).
- **F8 — dead props:** removed `subtitle` from `ScreenScaffold` and ALL 41 call sites (`src/ui/views/**`, `app/about.tsx`) — was accepted-but-ignored, now gone from the type. `Code`'s `tone` prop KEPT (one view, `react_fundamentals_view.tsx`, meaningfully highlights inline RN tokens); narrowed + documented.
- **F9 — non-null assertions:** added `src/core/utils/arrays.ts` (`requireHead`, `requireAt` — typed accessors that satisfy `noUncheckedIndexedAccess` without `!`, with clear runtime messages). Replaced `arr[i]!` at `testing_hooks`, `architecture_hooks`, `dependency_management_hooks`, `exception_handling_hooks`. `post-repository-impl.spec.ts:29` now uses `expect(first).toBeDefined(); first?.title`.
- **F10 — reducer exhaustiveness:** added `src/core/utils/types.ts` `assertNever` (real one; the `ts_js_fundamentals_view` local copy stays as a teaching example). `usePosts` reducer now `default: assertNever(action)` — adding a new `PostsAction` variant without handling it is a compile error.
- **F12 — duplicated warning-toast effect:** lifted the "surface each warning once" effect into `src/ui/hooks/use-warning-toast.ts` (`useWarningToast(warning)`). Dedups on a STABLE key `${kind}:${message}` (was ref-identity → re-toasted on every fetch because the repo builds a fresh Failure each time). Returns the underlying `useFailureToast` store so the views' toast rendering is unchanged. Both `api_handling_hooks` and `exception_handling_hooks` consume it; their per-hook `lastWarningRef` + effect deleted. New spec `use-warning-toast.spec.tsx` covers the stable-key dedup regression (4 tests).

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
