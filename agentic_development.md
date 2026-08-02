# AI defined section:

## Conventions

- TS strict + `noUncheckedIndexedAccess` + `erasableSyntaxOnly` + `jsx: react-jsx`.
- Const-object + literal union instead of `enum` (erasableSyntaxOnly).
- Co-located `*.spec.ts` test style; `jest-expo` preset.
- Const-object + literal union, DRY/KISS/SOLID, reuse over duplication. Single-file components stay as local fns; multi-file ones go in `src/ui/components` (or `design-system/components` for primitives).
- Naming/layering mirrors `react_developers_guide`.

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

- `react-test-renderer` pinned to `19.0.0` to match Expo SDK 53's React pin (avoids peer conflict).
- Four cross-cutting explainer screens (exception-handling, dependency-management, architecture, environments) are read-only over the existing infrastructure — they cite the real artifacts (`exceptions.ts`/`failures.ts`/`guards.ts`, `container.ts`, `ARCHITECTURE.md`, `app.config.ts`/`eas.json`) and drive the REAL container/usePosts/expo-constants live. No architecture/data-layer/core behaviour was changed. (`Section`/`Code`/`Pill` are now SHARED in `ui/components` — see that entry; small one-off demo sub-components still stay local to their screen.) Note for `Code` usage: inside a JSX `<Code>{`...`}</Code>` template literal, escape any nested backticks/`${}` (illustrative code that contains template literals must use string concatenation or single quotes, not nested backticks) — a real `tsc` parse failure, not the stale IDE `--jsx` lag.
- State libs added for the state-management teaching screen: `zustand`, `@tanstack/react-query`, `@reduxjs/toolkit`, `react-redux`. Scoped to that screen ONLY — Redux `<Provider>` + React Query `<QueryClientProvider>` wrap the demo subtree inside `state-management-screen.tsx`, NOT `_layout`. The app itself remains a DI-service-locator + usecases + `useReducer`-hook app (no global store); the libs are teaching artifacts, not the architecture's spine.
- Jest: native-module mocks in `jest.mocks.ts` (`setupFiles`, runs before module graph), per-test container reset in `jest.setup.ts` (`setupFilesAfterEnv`, where `beforeEach` exists). AsyncStorage mocked in-memory.
- Retry lives in the fetch dispatcher (`RetryPolicy`), not a response interceptor — the natural place for fetch (web ref uses an axios response interceptor).
- Hub uses a `[...rest].tsx` catch-all so every not-yet-built topic route resolves to a placeholder (avoids 15+ stub files during content build-out).
- Nested section pattern: a topic section is an `app/<section>/` folder with an `index.tsx` (section landing) + one file per sub-screen; the section index filters `ROUTES` by path to render its grid (now as `LinkCard`s). Adding one = flip the parent route `enabled` true + add sub-route entries to `ROUTES` (see the UI section: `app/ui/*`, `ui-section-screen.tsx`). Back-navigation is handled by the AppBar back-arrow (see Foundation pass) — do NOT re-add per-screen back buttons.
- Button primitive gained `accessibilityRole="button"` + `accessibilityState={{ disabled }}` (Testing screen work). Genuine a11y improvement AND enables RNTL `getByRole('button', { name, disabled })` accessibility assertions — the pattern the Testing screen teaches. No visual/behaviour change.
- Testing screen is self-documenting: the NEW specs it cites (`button.spec.tsx`, `use-posts.spec.tsx`) are real and run in `npm test` — they double as live examples. When adding a NEW design-system primitive or hook, add a co-located `*.spec.ts(x)` so the test explorer stays honest.
- Best Practices screen + root Drawer (final content batch). (1) `best-practices-screen.tsx` ships three LIVE demos: a virtualization lab (naive `.map` vs `FlatList` with a live row-MOUNT counter + render-time readout — its embedded `FlatList`s now use `nestedScrollEnabled` + a bounded-height container; see Foundation pass for the `scrollable` scaffold prop), a `React.memo`+`useCallback` re-render lab (live child render counter), and an accessibility lab. Coverage: performance, a11y, maintainability, TS discipline, security, state hygiene, error hygiene. No `any`; strict + erasure-clean. (2) Root navigator is a real Expo Router Drawer (`app/_layout.tsx`) with a themed custom `drawer-content.tsx` built from `ROUTES`; installed `@react-navigation/drawer` (gesture-handler + reanimated already present — works in Expo Go + web export). Every existing route still resolves (`expo export` green); `headerShown:false` preserved (ScreenScaffold owns chrome). NOTE: the Drawer is now **About-only** and the hamburger is home-only (back-arrow elsewhere) — see Foundation pass; the earlier `inDrawer` shortcuts + everywhere-reachable hamburger are superseded.
- Box primitive has NO `pt`/`pb` props (only `p`/`px`/`py`/`m`/`mt`/`mb`/`gap`); use `style.paddingTop` for safe-area top inset.
- Promoted the per-screen `Section`/`Code`/`Pill` helpers (duplicated across 18 topic screens) to shared components in `src/ui/components/` (`section.tsx`, `code.tsx`, `pill.tsx`), re-exported from the `components/index.ts` barrel. All 18 screens now `import { Section, Code, Pill } from '../components';`. The shared `Section` renders the title as `variant="h2"` (was `h3`) with a left accent bar, and the shared `Code` is collapsed-by-default with a copy button + language toggle (was always-visible inline) — both INTENTIONAL visual upgrades, call sites left as-is. The shared `PillTone` is `'default'|'muted'|'primary'|'danger'|'success'` — it has NO `'warning'`; `debugging-screen.tsx` had a local `'warning'` tone and was remapped to `'danger'` (closest semantic fit, with a code comment). Trimmed now-unused imports (`ReactNode`/`useTheme`/`View`/`Card`) per file where they were only used by the deleted local defs. `tsc --noEmit` green; all 42 tests pass.
- **Foundation pass (post-review).** UI/typography + crash fixes; the screen→view + logic-separation refactor is a SEPARATE follow-up (JSX written now survives it). (1) Typography: `tokens.ts` `Typography` is now a per-variant record (`fontFamily`/`fontSize`/`lineHeight`/`letterSpacing`/`fontWeight`/`uppercase`), not bare sizes; `Text` applies them all. Bundled real font families via `expo-font` (`fonts.ts` + `src/assets/fonts/*.ttf`) — **Inter** (body), **Montserrat** (display/headings), **JetBrains Mono** (code); `_layout.tsx` gates first paint on `useAppFonts()` so no system-font flash. Each `fontFamily` points at a specific registered weight file (e.g. `Inter_600SemiBold`) so the exact weight renders. Added `overline` + `mono` text variants. Added deps `expo-font`/`expo-asset`/`expo-clipboard` + the `expo-font` plugin in `app.config.ts`. (2) AppBar: `ScreenScaffold` is now a STICKY header (a `View` sibling of the body `ScrollView`, not inside it) + a `scrollable` prop (default `true`; `false` renders a plain `View` for screens with their own virtualized list — fixes the best-practices nested-list warning path). Header = back-arrow on nested screens (`navigation.canGoBack()`), ☰ hamburger ONLY on home, **title only** (`subtitle` accepted but ignored for back-compat), `ThemeToggle` (☾/☀) on the right. Removed every manual back affordance (the 5 UI sub-screens' `BackButton` ghost buttons + the home theme-toggle button). (3) Drawer is **About-only** now (`drawer-content.tsx` lists only About; everything else via home grid + AppBar back-arrow). (4) Home (`app/index.tsx`) is a FLAT `LinkCard` list (no group headings), no About card, and a single "UI Section" card (the 5 UI sub-screens live only under `/ui`); `LinkCard` shows a `→` glyph (not an "Open" button). (5) tsconfig: added `"types": ["jest","node"]` + `@types/node` to devDeps (fixes VSCode "Cannot find name describe/expect/process"); overrode `exclude` to stop excluding `jest.config.js`. `tsc --noEmit` green; 42 tests pass; `expo export` green.
- **16 KB Android ELF alignment dialog** (deferred — NOT code-fixable): the flagged `.so` (`libhermes`, `libreactnative`, `libreanimated`, `libexpo-sqlite`, …) ship INSIDE Expo Go, not the JS bundle, so the dialog appears under Expo Go and can't be rebuilt from the managed workflow. Fix path = move to a custom dev build / EAS build with AGP 8.5.1+ / NDK r27+ + `extractNativeLibs="false"` and upgrade older native libs. Currently a WARNING only (targetSdk < 35); becomes a hard install block at targetSdk ≥ 35. No action needed for now.
- **Back navigation & nested Stack layouts.** Root navigator is a Drawer; without per-folder layouts, a folder's routes (e.g. `app/ui/*`) flatten into the Drawer and "back" jumps straight to home, skipping the section hub. Added `app/ui/_layout.tsx` + `app/navigation-routing/_layout.tsx` as `Stack`s (`headerShown:false`) so each section is a nested stack — back from a sub-screen pops to the section hub, then to home. Also resolved the `navigation-routing.tsx` file + `navigation-routing/` folder conflict by moving the file to `navigation-routing/index.tsx`. AppBar back-vs-home is decided by ROUTE (`usePathname() === '/'`), NOT `navigation.canGoBack()` — the latter returns false at a section hub (initial screen of its nested Stack) and would wrongly hide the back arrow there. Section hubs (UI section) now also use the shared `Section` for their intro heading (was a bare inline `Card`).
- **IntroCard → Section consistency pass.** Every topic screen's `IntroCard` now opens with a proper `<Section title="...">` heading (h2 + left accent bar), matching the react-fundamentals exemplar and the sibling web guide. 13 screens touched; the previous bare `<Card style={{marginBottom:16}}><Box gap="sm">…` wrapper was replaced with `<Section>` and the body `<Text>`/`<Box>` children kept verbatim. `styling-screen.tsx` and `navigation-routing-screen.tsx` already used `<Section>` in their IntroCard — only their titles were normalised to the screen-topic short titles ("Styling in React Native", "Navigation & routing"). `Card`/`Box` imports left intact — both are still used by other cards in every file. `tsc --noEmit` green; 42 tests pass.

## Bug History (Do Not Reintroduce)

- `JSON.stringify(bigint)` THROWS (`TypeError: Do not know how to serialize a BigInt`). The TS/JS Fundamentals screen rendered a primitive-types table incl. a BigInt and crashed on open. Fix: a `safeStringify()` helper (bigint → `` `${v}n` ``, symbol/function handled). Never pass a BigInt/Symbol/Function to `JSON.stringify` for display.
- React-19 anti-patterns that red-screen / warn under StrictMode (Lifecycle screen): (1) calling another component's setState from inside a `setState` *updater* (must be pure) — moved the side effect into the enclosing async callback + a ref for the latest value; (2) `setState` inside `useMemo` — moved to a `useEffect` keyed on the memo result; (3) `useLayoutEffect` with NO dep array + imperative `ref.measure` (thrashes layout on Fabric) — added a dep array and switched to `onLayout`. Updaters and the memo body must be pure; setState belongs in effects or event handlers.
- `VirtualizedLists should never be nested inside plain ScrollViews` — `ScreenScaffold` wrapped all children in a `ScrollView`, so any in-screen `FlatList` (Best Practices) warned. Fix: the `scrollable` prop; embedded lists also take `nestedScrollEnabled` and a bounded-height container.

- The above are just placeholders, add as you wish, this section comes under your direct supervision, just keep it concise and don't bloat this file

# Developer defined section

- Project requirements
    - I want to implement a react native project following the code architecture similar to Development/personal/react/react_developers_guide, separating ui, domain, data layer, error handling, state management, etc
    - Although I want similar implementation, but I prefer domain specificity, for example if something is done in react native in standard way that is different from the reference project, then better point it out the standard way rather than forcing it like the reference project
    - I will add my requirements to this file marked as "Pending" and you will keep finishing them and marking them "✅" on completion

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
        - Engeneering principles
            - Unix philosophy (composable tools beat monoliths)
        - Performance
            - Right algorithms, Right datastructures, Caching, Batching
    - Keep "agentic_development.md" for this project as lean as possible without compromising it's primary purpose to high quality consistent development, optimize token efficiency and seemless development across sessions. Remove the information inside the "AI defined section" that is no longer relevant and will not be usefull in future to save tokens

- Development tasks:
    - Update the development tasks based on your expertise ⏳
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
    - Architecture screen ✅
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

- Updates requested based on review
    - UI updates
        - The typography is very ugly right now, text looks ugly, too congested based on line height and word spacing, and so on while react_developers_guide has very good typography, something is really off in our react_native_developers_guide typography, please go and research maybe we are not doing it properly or something similar ✅ (Foundation pass: per-variant lineHeight/letterSpacing/fontWeight + bundled Inter/Montserrat/JetBrainsMono via expo-font)
        - There is no back button in appbar or header when I visit nested screens, the hamburger icon for drawer should be only visible on home page, rest the header should show a back arrow icon based on navigation stack, you have added navigation like showing text to go back somewhere at top, sometimes at bottom, but I don't want that way, I want a consistent appbar way ✅ (AppBar back-arrow on nested, ☰ home-only; removed all manual back buttons)
        - Appbar tries to include sub-text too, which is not required, just include the main title in the appbar to keep it simple and aesthetic ✅
        - Toggle to switch between dark/light should be present as a single icon which is tappable just like react_developers_guide on the right side of the header ✅ (ThemeToggle ☾/☀)
        - The component which shows a section link like "React Fundamentals", "UI Section", etc include "open" button, instead of open button, I want want it to be an arrow pointing right like react_developers_guide ✅ (LinkCard with →)
        - For the the component which displays sections like "what is react?" in react_developers_guide, every section has heading, the styling is very good, how a style bar is added to the left of the heading ✅ (shared Section with left accent bar)
            - Some sections in react_native_developers_guide don't even have a heading, they just start with body text or maybe they make heading text so long that it don'es feel like heading anymore, you have to check ⏳ (per-screen content audit — refactor pass)
        - The section which shows relevant code is not similar to react_developers_guide, in react_developers_guide that section is present and is togglable, while react_native_developer_guide at a lot of places don't show any code, when it shows, it just shows without togglable section and also the indentation and organization to display that code is just messed up specially for those sections which includes arrows, etc ✅ (shared Code: collapsed-by-default toggle + copy + horizontal scroll preserves formatting). "Places that don't show code" = content-completeness → refactor pass.
        - Drawer should include link for about only, remove all other links ✅
        - About is not to be included on home screen ✅
        - Appbar or header is not sticking at the top, when user scrolls down, it's no longer visible like on android and ios ✅ (header is a sibling of the ScrollView, not inside it)
        - A lot of screens are incomplete, for example api handling screen only shows demo, what about explanation, what about part where code is shown, etc ⏳ (refactor pass — content completeness)
        - Not sure if lifecycle and navigation & routing sections should come under UI ✅ (resolved: home is flat; the UI section hub contains ONLY layout/styling/interactive/responsive/design-system; lifecycle & navigation-routing are top-level cards, NOT under /ui)
        - You have listed UI section 2 times, first directly inside UI section, then on home page under UI, remove their direct listing from home page, UI section contains "layout&structure", "styling", "interactive behaviours", "responsive layout", and "design system" ✅ (home shows a single "UI Section" card; the 5 sub-screens live only under /ui)
    - Code structuring and architecture issues
        - Why have you not created parent directory for files that include both itself and it's test counterpart like /guards containing both guards.ts and guards.spec.ts, /container containing both container.ts and container.spec.ts and so on for every file that has it's test counterpart ⏳
        - Don't aggregate sections under different heading like fundamentals, UI, state & data, cross-cutting, etc, just list normally like in react_developers_guide ✅ (home is now a flat list, no group headings)
        - Not having separate screens for state management sub sections like react_developers_guide and putting all things at one screen ⏳
        - All the reusable components that are used across multiple screens like buttons, cards, etc are to be present in /ui/components, but I don't see many there, maybe you have scattered them out and made it messy ⏳ (partial: Section/Code/Pill/LinkCard/ThemeToggle promoted to ui/components; buttons/cards are design-system primitives — broader cleanup in refactor pass)
        - You have named "screen" instead of "view" like we have done in react_developers_guide, please replace "screen" with "view" ⏳
        - The biggest and most important issue
            - Right now our screens are a giant mess of UI and logic, but as you will find in my flutter_developers_guide, android_developers_guide, ios_developers_guide and even in react_developers_guide, we have separated the logic from the UI to the point where our component is just a dump UI structure with no logic at all ⏳
            - This is an anti pattern, we need to fix this ⏳
            - Due to this you have crated only a single file for that screen instead of creating a directory and then having separate view file, custom hook file, and test file like in react_developers_guide ⏳
            - We have to separate logic from UI in most standard react way possible that is done by 10+ years of react developers ⏳
            - If few screens come under a section like ui section, then those screens are put inside sub_views directory of that section like done for ui section in react_developers_guide ⏳
            - There are no tests for screens or views because you never separated the logic from UI ⏳
    - Crashes and issues
        - When I launch the app for the first time, it shows me a long list of issues in a dialog ⏳ (16 KB ELF alignment — NOT code-fixable in Expo Go; the .so ship inside Expo Go. Needs a custom dev/EAS build with AGP 8.5.1+/NDK r27+ + extractNativeLibs="false". Warning only until targetSdk ≥ 35. Deferred — see Decision logs)
            - Android App Compatibility (16 KB alignment dialog — libhermes/libreactnative/libreanimated/libexpo-sqlite/… not 16 KB aligned)
              This app isn't 16 KB compatible. ELF alignment check failed.
              This app will be run using page size compatible mode.
              For best compatibility, please recompile the application with 16 KB support.
              For more information, see:
              https://developer.android.com/16kb-page-size
              The following libraries are not 16 KB aligned:
              • lib/arm64-v8a/libgesturehandler.so : Unknown error
              • lib/arm64-v8a/librnskia.so : LOAD segment not aligned
              • lib/arm64-v8a/libexpo-sqlite.so : Unknown error
              • lib/arm64-v8a/libbarhopper_v3.so : Unknown error
              • lib/arm64-v8a/libexpo-modules-core.so : Unknown error
              • lib/arm64-v8a/libhermes.so : Unknown error
              • lib/arm64-v8a/libreact_codegen_rnsvg.so : Unknown error
              • lib/arm64-v8a/libgifimage.so : LOAD segment not aligned
              • lib/arm64-v8a/libcrashlytics-common.so : Unknown error
              • lib/arm64-v8a/libreact_codegen_safeareacontext.so : Unknown error
              • lib/arm64-v8a/libsurface_util_jni.so : Unknown error
              • lib/arm64-v8a/libexpo-av.so : Unknown error
              • lib/arm64-v8a/libimage_processing_util_jni.so : Unknown error
              • lib/arm64-v8a/libandroidx.graphics.path.so : Unknown error
              • lib/arm64-v8a/libcrashlytics-handler.so : Unknown error
              • lib/arm64-v8a/libnative-imagetranscoder.so : Unknown error
              • lib/arm64-v8a/libimagepipeline.so : Unknown error
              • lib/arm64-v8a/libreact_codegen_rnpicker.so : Unknown error
              • lib/arm64-v8a/libcrashlytics-trampoline.so : Unknown error
              • lib/arm64-v8a/libjsi.so : Unknown error
              • lib/arm64-v8a/libanimation-decoder-gif.so : Unknown error
              • lib/arm64-v8a/libnative-filters.so : Unknown error
              • lib/arm64-v8a/libavif_android.so : Unknown error
              • lib/arm64-v8a/libworklets.so : Unknown error
              • lib/arm64-v8a/libc++\_shared.so : Unknown error
              • lib/arm64-v8a/libexpo-gl.so : Unknown error
              • lib/arm64-v8a/libreanimated.so : Unknown error
              • lib/arm64-v8a/libreact_codegen_RNCSlider.so : Unknown error
              • lib/arm64-v8a/libcrashlytics.so : Unknown error
              • lib/arm64-v8a/libappmodules.so : Unknown error
              • lib/arm64-v8a/libhermestooling.so : Unknown error
              • lib/arm64-v8a/librnscreens.so : Unknown error
              • lib/arm64-v8a/libstatic-webp.so : LOAD segment not aligned
              • lib/arm64-v8a/libreactnative.so : Unknown error
              • lib/arm64-v8a/libfbjni.so : Unknown error
              • lib/arm64-v8a/libreact_codegen_rnscreens.so : Unknown error
        - When I open javascript/typescript section, lifecycle section then application crashes, check the issue and also if same issue is there for any other app ✅ (BigInt+JSON.stringify crash fixed; three React-19 anti-patterns in Lifecycle fixed — see Bug History)
        - There is an error named "virtualizationLists should never be nested inside plain ScrollViews...." when I open best practices section ✅ (ScreenScaffold scrollable prop + nestedScrollEnabled + bounded-height container)
        - A lot of files are showing ar red in vscode with issues like ✅ (added @types/node + tsconfig "types": ["jest","node"]; stopped excluding jest.config.js):
            - Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.
            - Cannot find name 'expect'.
            - Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
    - Rate this app after all the changes that are asked are implemented ⏳
