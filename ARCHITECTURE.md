# Architecture

This app is a **teaching artifact**: a small, production-shaped React Native
app whose own codebase demonstrates how an RN app can be structured. It mirrors
a sibling React (web) guide and a Flutter guide concept-for-concept. The hard
parts — layering, error handling, dependency wiring — are done the way they are
on purpose, and this document records *why*, including where React Native's
standard differs from the web reference.

## Layering

```
domain/        ← pure business models + contracts. No framework, no I/O.
  models/         value objects (Post)
  repositories/   interfaces (PostRepository) — the seam data implements
  usecases/       application logic (GetPostsUseCase)

data/          ← implements the domain contracts. Talks to the outside world.
  remote/         fetch-based HTTP client + DTOs + interceptors
  local/          AsyncStorage + DAOs
  repositories/   PostRepositoryImpl — orchestrates remote + local, offline-first
  fake/           in-memory fakes for dev + tests

core/          ← cross-cutting infra shared by every layer.
  result.ts       Result<T> — the domain return type for fallible work
  error-handling/ AppException (data) → Failure (domain) pipeline
  container.ts    service locator (hand-rolled, getIt-equivalent)
  config/         AppConfig from Expo env vars (app.config.ts + expo-constants)
  scenario/       dev-only failure-injection knobs

ui/            ← presentation. Reads domain + core, never data internals.
  navigation/     routes.ts (route table as data) + Expo Router files
  design-system/  tokens (TS theme) + ThemeProvider + primitives
  components/     ShowError, Toast, ScreenScaffold
  hooks/          useReducer state machines, failure toast
  screens/        placeholder for not-yet-built topic screens

app/           ← Expo Router entry. File-based routes (the RN standard).
  _layout.tsx     root: ThemeProvider + SafeArea + DI bootstrap + Stack
  index.tsx       hub: data-driven grid of routes
  api-handling.tsx functional posts pipeline demo
  about.tsx       about
  [...rest].tsx   catch-all placeholder so every hub link resolves
```

**Invariant:** dependencies point inward/downward. `domain` depends on nothing
but `core/result`. `data` depends on `domain` + `core`. `ui` depends on
`domain` + `core`, and on `data` *only* through the container. A screen never
imports a DTO, a DAO, or the http client.

## The error pipeline

This is the part most teams get wrong, so it is the spine of the app.

```
engine error (fetch / storage / JSON)
   │  guardedApiCall / DAO catch
   ▼
AppException   (data-layer only; typed, chained via .cause)
   │  mapExceptionToFailure   (recursive over the cause chain)
   ▼
Failure        (domain/presentation; kind + severity + user message)
   │  safeRepositoryCall       (with optional per-error fallbacks)
   ▼
Result<T>      (Success<T, warning?> | Failed)  — the value the UI consumes
```

- **Two stages, not one.** `AppException` is technical (what broke: network,
  server, db). `Failure` is semantic (what to show the user, how loudly). They
  are decoupled so the UI reasons only about `Failure.kind` / `severity` and
  never imports HTTP concepts.
- **Causality is preserved.** Both `AppException.cause` and `Failure.cause`
  chain, so a compound failure ("served stale cache *because* the network
  failed *because* the request timed out") reconstructs the whole story for
  logs (`Failure.chain`).
- **Severity drives presentation.** Critical → full-screen `<ShowError/>`;
  Warning/Info → non-blocking toast. `Result.Success` may carry a non-blocking
  `warning` (stale data + network failure in one value) — the offline-first
  pattern.

## Key decisions

These are the RN-standard choices made for this app, with where and why they
differ from the React (web) reference.

### Tooling: Expo (managed) + TypeScript + Expo Router
The 2026 standard for RN. Managed Expo gives the cleanest DX, Expo Router gives
file-based routing with deep-link + web export support, and EAS handles
dev/staging/prod builds. No bare RN CLI is warranted for a teaching app.

### HTTP: built-in `fetch` + a small interceptor pipeline (not axios)
The web reference uses `axios` with request/response interceptor managers. RN's
standard HTTP engine is the built-in `fetch`, so this app wraps `fetch` with a
small explicit interceptor pipeline (`data/remote/http-client.ts`):
request interceptors (auth, failure-injection) → dispatch (timeout via
`AbortController` + bounded retry) → response → JSON parse → status guard.
The two-stage error mapping is identical; only the engine adapter differs —
`guards.ts` keys off `TypeError` (fetch's network-failure signature),
`SyntaxError` (bad JSON), `DOMException` (abort/timeout), and a status-to-
exception mapper instead of `axios.isAxiosError`.

### Local storage: AsyncStorage behind a DAO
The web guide uses IndexedDB via Dexie; the Flutter guide uses `sqflite`. For RN
we pick `@react-native-async-storage/async-storage` — the most portable
RN-standard KV store (works in Expo Go, iOS, Android, and web) — behind a
`PostDao` that (de)serializes the posts collection to JSON. This keeps the DAO
seam the architecture teaches while staying dependency-light. For relational /
query-heavy data, `expo-sqlite` or WatermelonDB would be the production choice;
the DAO abstraction makes that swap invisible to the repository.

### Routing: Expo Router (file-based) + a data-driven route table
The web reference uses a pure-data route table that *is* the router. RN's
standard is Expo Router (file-based). We keep a data-driven route table
(`ui/navigation/routes.ts`) as the single source of truth for screen
*metadata* (path, title, description, group, enabled) consumed by the hub grid
and (future) drawer, while Expo Router owns the file convention that resolves
those paths. Each enabled entry maps 1:1 to a file under `app/`; not-yet-built
routes resolve to a `[...rest]` catch-all placeholder.

### Dependency injection: hand-rolled service locator
Mirrors the web reference's `container.ts` and Flutter's `get_it`. Neither RN
nor React has a standard DI container with codegen, so a small explicit registry
keeps wiring in one debuggable place and lets screens resolve dependencies
without prop-drilling. Dev builds swap in fakes via the same knob.

### Design system: TS theme tokens + StyleSheet + ThemeProvider context
The web guide bridges CSS custom properties to Tailwind via `@theme inline`. RN
has no CSS variables and Tailwind-for-RN (NativeWind) is optional, so the
RN-native standard here is a plain TS theme object (`design-system/tokens.ts`)
consumed directly by `StyleSheet.create` and read through a `ThemeProvider`
context (light/dark, persisted in AsyncStorage, falling back to
`useColorScheme`). Primitives: `Text` (variants + tones), `Box` (spacing-aware
`View`), `Button` (variants + pressed state), `Card`. This is the most
dependency-light, instructive choice.

#### Two component tiers — why `design-system/components` and `ui/components` are separate
The app deliberately keeps **two** component folders, not one. They are different
layers with different consumers and should not be collapsed:

- **`ui/design-system/components/`** — **primitives**. The raw, theme-token-backed
  building blocks (`Text`, `Box`, `Button`, `Card`). They know nothing about the
  app's domain or screens — only about tokens, typography, spacing, and the theme
  context. This is the equivalent of a publishable component library: generic,
  stable, and consumed by *everything* above. They live under `design-system/`
  because they ARE the design system — inseparable from `tokens.ts` /
  `theme-provider.tsx`. Putting them in `ui/components` would imply they are
  app-specific compositions, which they are not.
- **`ui/components/`** — **app-level composites**. Higher-order components built
  *on top of* the primitives for this app's screens: `Section`, `Code`, `Pill`,
  `LinkCard`, `ScreenScaffold`, `ShowError`, `ToastStack`, `ThemeToggle`,
  `AppDrawerContent`. They encode app conventions (an accent-bar section header,
  a collapsible code block with copy, a themed drawer) and are free to combine
  multiple primitives + hooks + domain types. If a component is used by ≥2
  screens it lives here; if it is used by one screen only it stays a local fn in
  that view.

Rule of thumb: a primitive answers "what does the theme say this looks like?";
a composite answers "what does *this app* need on screen?". The dependency arrow
is one-way — `ui/components` imports from `design-system`, never the reverse.

### Environments: `app.config.ts` + `EXPO_PUBLIC_*` + EAS profiles
The web guide resolves env from Vite's `import.meta.env` per `--mode`. Expo's
standard is `app.config.ts` reading `process.env` (set per EAS build profile via
`APP_ENV`) and forwarding values through `extra`, surfaced in-app via
`expo-constants`. `AppConfig` is built from that in `core/config/index.ts`.

### `Result<T>` instead of exceptions across the domain boundary
Forces every fallible call site to acknowledge failure at the type level; no
forgotten `try/catch`. Exceptions still exist *inside* `data/` (typed
`AppException`s) but are converted to `Result` before crossing into the domain.

### Const-object + literal union instead of `enum`
The project compiles with `erasableSyntaxOnly`; enums aren't erasable.
`const Foo = {...} as const; type Foo = (typeof Foo)[keyof typeof Foo]` gives
runtime values + a literal union with no syntax that survives compilation.

### Strict TypeScript
`strict` + `noUncheckedIndexedAccess` + `erasableSyntaxOnly` + `jsx:
react-jsx`. The hub/placeholder UI is the only place that legitimately needs
the dynamic `router.push(path as never)` cast (Expo Router's `Href` type is
generated from files; a data-driven route table can't satisfy it without a
generated manifest), and it is annotated as such.

## Testing posture

Jest + React Native Testing Library (the RN standard), via the `jest-expo`
preset. Specs mirror the reference's co-located `*.spec.ts` style:

- `core/result.spec.ts` — the Result constructors
- `core/error-handling/guards.spec.ts` — the full engine-error → Failure mapping
- `core/config/config.spec.ts` — env resolution + scenario parsing
- `core/container.spec.ts` — the DI graph + fake/live swapping
- `data/repositories/post-repository-impl.spec.ts` — the offline-first fallback
  matrix using the fakes (success, stale-cache-with-warning, empty-cache
  blocking failure, cache-read-also-fails chained failure, defensive untyped
  bucketing)
- `domain/usecases/get-posts-usecase.spec.ts` — the use-case seam with an inline
  fake repository

Shared setup (AsyncStorage mock, container reset) lives in `jest.mocks.ts` +
`jest.setup.ts` so individual specs stay focused on behaviour.
