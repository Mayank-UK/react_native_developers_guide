import { useCallback, useState } from 'react';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';
import { requireHead } from '../../../core/utils/arrays';
import { usePosts } from '../../hooks/use-posts';

/**
 * Dependency Management view logic — owns the three LIVE interactive demos'
 * state + behaviour so the view stays a dumb structure. Grounded in the real
 * files:
 *   core/container.ts                 (the Container / `container` singleton)
 *   core/config/app-config.ts         (AppConfig — the root of the graph)
 *   app/_layout.tsx                   (container.initialize(createAppConfig()))
 *   ui/hooks/use-posts.ts             (resolves GetPostsUseCase via container)
 *
 * Pure helpers that touch the container (readLiveGraph, resolveClassName,
 * accessorFor) live here too so the view stays free of `container.` calls.
 */

/* ------------------------------------------------------------------ */
/* 4. LIVE registration graph — resolve every accessor                 */
/* ------------------------------------------------------------------ */

export interface GraphRow {
  name: string;
  cls: string;
  source: string;
}

/** Resolve each public accessor on the REAL container and capture its class. */
export function readLiveGraph(): ReadonlyArray<GraphRow> {
  const resolve = (v: unknown): string => {
    if (v === null || v === undefined) return '—';
    const proto = Object.getPrototypeOf(v);
    return proto?.constructor?.name ?? typeof v;
  };
  return [
    { name: 'AppConfig', cls: 'AppConfig (object)', source: JSON.stringify({ env: container.appConfig.environment, useFakeApi: container.appConfig.useFakeApi }) },
    { name: 'Logger', cls: resolve(container.logger), source: container.logger.constructor.name },
    { name: 'HttpClient', cls: resolve(container.httpClient), source: 'createHttpClient factory' },
    { name: 'PostRemoteDataSource', cls: resolve(container.postRemoteDataSource), source: container.getUseFakeApi() ? 'FakeApi (canned)' : 'live jsonplaceholder' },
    { name: 'AppDatabase', cls: resolve(container.appDatabase), source: container.appConfig.useFakeDatabase ? 'FakeAppDatabase' : 'AppDatabaseImpl' },
    { name: 'PostRepository', cls: resolve(container.postRepository), source: 'PostRepositoryImpl' },
    { name: 'GetPostsUseCase', cls: resolve(container.getPostsUseCase), source: 'GetPostsUseCase' },
  ];
}

export function useLiveGraphDemo() {
  const [tick, setTick] = useState(0);
  const graph = readLiveGraph();
  const reResolve = () => setTick((t) => t + 1);
  return { tick, graph, reResolve };
}

/* ------------------------------------------------------------------ */
/* 6. LIVE toggle — swap impl behind the same use case                 */
/* ------------------------------------------------------------------ */

export function useLiveToggleDemo() {
  const { state, fetch } = usePosts();
  const [useFake, setUseFake] = useState(container.getUseFakeApi());

  const toggle = useCallback(() => {
    const next = !container.getUseFakeApi();
    container.setUseFakeApi(next);
    // reset to a safe scenario so the new source can demonstrate success
    container.setApiScenario(ApiScenario.Success);
    container.setDbScenario(DbScenario.Success);
    setUseFake(next);
    fetch();
  }, [fetch]);

  return { state, fetch, useFake, toggle };
}

/* ------------------------------------------------------------------ */
/* 7. Resolve inspector + scenario knobs                               */
/* ------------------------------------------------------------------ */

export function useResolveInspectorDemo(graphRowNames: ReadonlyArray<{ name: string }>) {
  const [entry, setEntry] = useState(requireHead(graphRowNames).name);
  const [api, setApiState] = useState(container.getApiScenario());
  const [db, setDbState] = useState(container.getDbScenario());

  const applyApi = (s: ApiScenario) => {
    container.setApiScenario(s);
    setApiState(s);
  };
  const applyDb = (s: DbScenario) => {
    container.setDbScenario(s);
    setDbState(s);
  };

  return { entry, setEntry, api, db, applyApi, applyDb };
}

/** Resolve a registered name to its concrete class name via the real container. */
export function resolveClassName(name: string): string {
  try {
    switch (name) {
      case 'AppConfig':
        return 'AppConfig (object)';
      case 'Logger':
        return container.logger.constructor.name;
      case 'HttpClient':
        return Object.getPrototypeOf(container.httpClient)?.constructor?.name ?? 'HttpClient';
      case 'PostRemoteDataSource':
        return container.postRemoteDataSource.constructor.name;
      case 'AppDatabase':
        return container.appDatabase.constructor.name;
      case 'PostRepository':
        return container.postRepository.constructor.name;
      case 'GetPostsUseCase':
        return container.getPostsUseCase.constructor.name;
      default:
        return '(not registered)';
    }
  } catch {
    return '(resolve threw)';
  }
}

/** Map a registered name to its container accessor name. */
export function accessorFor(name: string): string {
  switch (name) {
    case 'AppConfig':
      return 'appConfig';
    case 'Logger':
      return 'logger';
    case 'HttpClient':
      return 'httpClient';
    case 'PostRemoteDataSource':
      return 'postRemoteDataSource';
    case 'AppDatabase':
      return 'appDatabase';
    case 'PostRepository':
      return 'postRepository';
    case 'GetPostsUseCase':
      return 'getPostsUseCase';
    default:
      return '?';
  }
}
