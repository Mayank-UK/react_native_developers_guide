import { useCallback, useEffect, useRef, useState } from 'react';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';
import { requireHead } from '../../../core/utils/arrays';
import { usePosts } from '../../hooks/use-posts';

/**
 * Architecture view logic — owns the three LIVE interactive demos' state +
 * behaviour so the view stays a dumb structure. Grounded in the real folder
 * structure under src/{domain,data,core,ui} + app/.
 *
 * Three hooks:
 *  - useInvariantExplorer: which layer row is selected in the import matrix.
 *  - useLayerExplorer: which layer + folder are drilled into in the file tree.
 *  - useLiveTrace: a real posts fetch through the container + usePosts,
 *    annotated at each layer transition.
 *
 * Pure helpers (isAllowed) compute the dependency-direction invariant.
 */

/* ------------------------------------------------------------------ */
/* 3. The invariant — dependency-direction validator                   */
/* ------------------------------------------------------------------ */

export const LAYER_NAMES = ['domain', 'data', 'core', 'ui'] as const;
export type LayerName = (typeof LAYER_NAMES)[number];

export function useInvariantExplorer() {
  const [row, setRow] = useState<LayerName>('ui');
  return { row, setRow };
}

/** The dependency-direction invariant: who may import what. */
export function isAllowed(layer: LayerName, target: string): boolean {
  switch (layer) {
    case 'domain':
      if (target === 'core/result') return true;
      if (target === 'core/error-handling') return true; // Failure type only
      return false;
    case 'data':
      if (target === 'domain/*') return true;
      if (target === 'core/result' || target === 'core/error-handling') return true;
      return false;
    case 'core':
      // core is shared infra; it does not depend on domain/data/ui
      return false;
    case 'ui':
      if (target === 'domain/*') return true;
      if (target === 'core/result' || target === 'core/error-handling') return true;
      if (target === 'react / react-native') return true;
      if (target === 'container (resolve)') return true;
      if (target === 'data/* internals') return false; // the key rule
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* 5. Interactive layer explorer                                       */
/* ------------------------------------------------------------------ */

export interface FolderNode {
  folder: string;
  responsibility: string;
  files: ReadonlyArray<{ name: string; role: string }>;
}

export function useLayerExplorer(
  tree: ReadonlyArray<{ layer: string; nodes: ReadonlyArray<FolderNode> }>,
) {
  const [openLayer, setOpenLayer] = useState<string>('domain/');
  const [openFolder, setOpenFolder] = useState<string>('models/');
  const layer = tree.find((l) => l.layer === openLayer) ?? requireHead(tree);
  const folder = layer.nodes.find((n) => n.folder === openFolder) ?? requireHead(layer.nodes);

  const pickLayer = (l: string) => {
    const found = tree.find((x) => x.layer === l) ?? requireHead(tree);
    setOpenLayer(l);
    setOpenFolder(requireHead(found.nodes).folder);
  };

  return { openLayer, openFolder, setOpenLayer, setOpenFolder, pickLayer, layer, folder };
}

/* ------------------------------------------------------------------ */
/* 6. LIVE trace — one request through every layer                     */
/* ------------------------------------------------------------------ */

export interface TraceEntry {
  id: number;
  at: string;
  layer: string;
  event: string;
}

export function useLiveTrace() {
  const { state, fetch } = usePosts();
  const [log, setLog] = useState<TraceEntry[]>([]);
  const nextId = useRef(0);
  const startedRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const stamp = () => new Date().toLocaleTimeString();

  const push = useCallback((layer: string, event: string) => {
    setLog((prev) => [
      ...prev,
      { id: nextId.current++, at: stamp(), layer, event },
    ].slice(-8));
  }, []);

  // Observe the usePosts state machine and annotate which layer is active.
  useEffect(() => {
    if (state.status === 'loading') {
      if (!startedRef.current) {
        startedRef.current = true;
        setLog([]);
        push('ui/hooks', 'usePosts() → dispatch(fetch); GetPostsUseCase.execute() called');
        push('domain/usecases', 'GetPostsUseCase → repository.getPosts()');
        push('data/repositories', 'PostRepositoryImpl: safeRepositoryCall → remote.getPosts()');
      }
      setBusy(true);
    } else if (state.status === 'loaded') {
      if (state.warning) {
        push('data/repositories', `serveFromCache → Success(posts, warning=${state.warning.kind})`);
      } else {
        push('data/remote', 'remote resolved PostDTO[] → cached locally (best-effort)');
        push('data/repositories', 'remote.map(toPost) → Success(posts)');
      }
      push('domain/usecases', 'Result<Post[]> returned to the use case');
      push('ui/hooks', `dispatch(loaded) → ${state.posts.length} posts render`);
      startedRef.current = false;
      setBusy(false);
    } else if (state.status === 'error') {
      push('core/error-handling', `mapped → Failure(kind=${state.failure.kind}, severity=${state.failure.severity})`);
      push('ui/hooks', `dispatch(error) → UI branches on severity`);
      startedRef.current = false;
      setBusy(false);
    }
  }, [state, push]);

  const run = (api: ApiScenario, db: DbScenario) => {
    container.setApiScenario(api);
    container.setDbScenario(db);
    startedRef.current = false;
    fetch();
  };

  return { state, fetch, log, busy, run };
}
