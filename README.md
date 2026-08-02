# React Native Developer's Guide

A teaching app whose own codebase demonstrates how a React Native app can be
structured: clean architecture (domain → data → ui), a two-stage error pipeline,
a hand-rolled service locator, and a token-driven design system. Mirrors the
sibling [React (web)](../react_developers_guide) and [Flutter](../flutter_developers_guide)
guides concept-for-concept, choosing the React Native standard wherever it
differs. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full rationale.

## Stack

- **Expo** (managed) + **TypeScript** + **Expo Router** (file-based routing)
- **fetch**-based HTTP client with an interceptor pipeline (auth / retry / failure-injection)
- **AsyncStorage** behind a DAO for local persistence (offline-first)
- **Jest** + **React Native Testing Library** (`jest-expo` preset)

## Getting started

```bash
npm install
npm start           # expo start — press i / a / w for iOS / Android / web
```

## Commands

```bash
npm start           # start the Expo dev server
npm run ios         # open in iOS simulator
npm run android     # open in Android emulator
npm run web         # open in a browser
npm test            # run the Jest test suite
npm run typecheck   # tsc --noEmit
```

## Environments

`app.config.ts` reads `APP_ENV` (set per EAS build profile in `eas.json`) and
`EXPO_PUBLIC_*` vars. `.env.example` lists the available knobs. The DI container
reads the resolved config via `expo-constants` (`core/config/index.ts`).

## The live demo

Open the **API Handling** tile from the hub. It runs the full pipeline
(`usePosts` hook → `GetPostsUseCase` → `PostRepository` → remote/local →
`Result`) and exposes the dev failure-injection knobs so you can exercise every
state — success, network/timeout/server/bad-JSON failures, and the offline-first
stale-cache path — without a real failing server.

## Project layout

```
app/            Expo Router routes (file-based)
src/core/       result, error-handling pipeline, container, config, scenarios
src/domain/     models, repository contracts, use cases (pure)
src/data/       remote (http + DTOs), local (DAO), repository impl, fakes
src/ui/         design-system, navigation routes, components, hooks, screens
```
