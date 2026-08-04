import { TextInput } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Section, Code, Pill } from '../../components';
import { Box, Button, Text } from '../../design-system';
import {
  CACHE_STRATEGIES,
  SYNC_STATE,
  cacheStrategyLabel,
  cacheStrategyMatrix,
  syncStateLabel,
  useNetInfoDemo,
  useOptimisticListDemo,
  type SyncState,
} from './offline_hooks';

/**
 * OfflineView — a dumb structure. All state/behaviour lives in the co-located
 * hooks (offline_hooks.ts); this file only renders.
 *
 * Teaching artifact for the RN-standard offline pattern set: network detection
 * via `@react-native-community/netinfo`, the five cache strategies, the app's
 * existing cache seam (the DAO + repository in `src/data/`), optimistic UI with
 * pending-state + rollback, and the background-sync queue pattern. Cites the
 * REAL local-layer artifacts in collapsible `<Code>`; the read-through variant
 * and the sync queue are illustrative teaching extensions (marked as such).
 *
 * No `any`; strict + erasure-clean. Inside `<Code>{`...`}</Code>` there are no
 * nested template literals (no `${` parse trap).
 */
export function OfflineView() {
  return (
    <ScreenScaffold
      title="Offline Support"
      subtitle="Cache-first strategies, network detection, optimistic UI, background sync."
    >
      <IntroCard />
      <WhyOfflineCard />
      <NetworkDetectionCard />
      <CacheStrategiesCard />
      <CacheSeamCard />
      <OptimisticUiCard />
      <BackgroundSyncCard />
      <ProductionNotesCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* 1. What this screen is about                                       */
/* ------------------------------------------------------------------ */

function IntroCard() {
  return (
    <Section
      title="Offline-first in React Native"
      explanation="Mobile networks are lossy by default. An offline-aware RN app degrades gracefully instead of crashing or freezing — it keeps serving cached data, queues writes, and syncs when connectivity returns."
    >
      <Box gap="sm">
        <Text variant="body">
          The pattern has four primitives, and this screen walks through each
          with a live demo or a real-source citation:
        </Text>
        <Box gap="xs">
          <Pill label="1" value="Network detection" tone="primary" />
          <Pill label="2" value="Cache strategies" tone="primary" />
          <Pill label="3" value="Optimistic UI" tone="primary" />
          <Pill label="4" value="Background sync" tone="primary" />
        </Box>
        <Text variant="caption" tone="muted">
          This screen TEACHES the RN-standard patterns; it does not add a new
          app-wide capability. The single dep added is{' '}
          <Text style={{ fontFamily: 'monospace' }}>
            @react-native-community/netinfo
          </Text>
          , scoped to this view only. The app&rsquo;s EXISTING local cache seam
          (the DAO + repository) is cited verbatim below.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Why offline matters                                             */
/* ------------------------------------------------------------------ */

function WhyOfflineCard() {
  return (
    <Section
      title="Why offline matters in RN"
      explanation="A phone is not a desktop. Connections drop, tunnels end, airplane mode happens — and your fetch will reject. Design for that, not against it."
    >
      <Box gap="sm">
        <Text variant="body">
          RN apps run on devices where the network is a{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            best-effort resource
          </Text>
          : wifi handoff, cellular dead zones, captive portals, low-data mode,
          and background suspension all break it. A naive app freezes the UI on
          a rejected fetch and loses the user&rsquo;s in-flight work. An
          offline-aware app treats the cache as the source of truth for reads
          and a queue for writes.
        </Text>
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" tone="muted">
            Cross-link: the exception-handling pipeline classifies these
            failures. A network error that hits the cache is a non-blocking{' '}
            <Text style={{ fontFamily: 'monospace' }}>Warning</Text> (stale
            data + a toast); a network error with no cache escalates to a
            blocking{' '}
            <Text style={{ fontFamily: 'monospace' }}>Critical</Text>{' '}
            full-screen error. See the Exception Handling screen — the{' '}
            <Text style={{ fontFamily: 'monospace' }}>Failure</Text> severity
            drives that choice.
          </Text>
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Network detection (LIVE)                                        */
/* ------------------------------------------------------------------ */

function NetworkDetectionCard() {
  const net = useNetInfoDemo();
  const reachLabel =
    net.isInternetReachable === null
      ? 'unknown'
      : net.isInternetReachable
        ? 'reachable'
        : 'unreachable';
  return (
    <Section
      title="Network detection — NetInfo (LIVE)"
      explanation="@react-native-community/netinfo is the RN-standard library. addEventListener gives you LIVE transitions; fetch gives you a one-shot read for startup. The readout below is wired to the real subscription."
    >
      <Box gap="sm">
        <Box
          p="sm"
          radius="md"
          bg="surfaceVariant"
          row
          gap="sm"
          style={{ flexWrap: 'wrap', alignItems: 'center' }}
        >
          <Pill
            tone={net.online ? 'success' : 'danger'}
            value={net.online ? 'online' : 'offline'}
          />
          <Pill label="type" value={net.type} />
          <Pill
            label="isConnected"
            value={String(net.isConnected ?? 'null')}
          />
          <Pill label="internet" value={reachLabel} />
        </Box>
        <Text variant="caption" tone="muted">
          {net.ready
            ? 'Live readout — toggle Airplane Mode / wifi to see the values flip (in Expo Go on a device).'
            : 'Seeding from NetInfo.fetch()… (under jest the mock fires the stable online state immediately.)'}
        </Text>
        <Code>{`// src/ui/views/offline/offline_hooks.ts
import NetInfo from '@react-native-community/netinfo';

export function useNetInfoDemo(): NetInfoSnapshot {
  const [net, setNet] = useState<NetInfoSnapshot>(() => toSnapshot(null));

  useEffect(() => {
    // One-shot read so the UI is populated before the first transition.
    NetInfo.fetch().then((s) => setNet(toSnapshot(s)));
    // LIVE transitions — addEventListener returns an unsubscribe fn.
    const unsub = NetInfo.addEventListener((next) => {
      setNet(toSnapshot(next));   // setState in the LISTENER CALLBACK,
    });                            // not inside another setState updater
    return () => unsub();          // cleanup on unmount
  }, []);

  return net;
}`}</Code>
        <Text variant="caption" tone="muted">
          React-19-safe: the updater passed to{' '}
          <Text style={{ fontFamily: 'monospace' }}>setNet</Text> is pure — the
          snapshot is computed OUTSIDE the updater, mirroring the{' '}
          <Text style={{ fontFamily: 'monospace' }}>useAppStateLog</Text> guard
          (see App State screen).
        </Text>
        <Text variant="caption" tone="muted">
          Note: under Expo Go this works out of the box. On a bare workflow
          (no Expo Go) the netinfo native module needs a dev build — see the
          production-notes section. No{' '}
          <Text style={{ fontFamily: 'monospace' }}>app.config.ts</Text> change
          is required for Expo Go.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Cache strategies — comparison matrix                            */
/* ------------------------------------------------------------------ */

function CacheStrategiesCard() {
  const rows = cacheStrategyMatrix();
  return (
    <Section
      title="Cache strategies — when to pick which"
      explanation="Five canonical read strategies. The right pick is a function of how stale-tolerant the surface is versus how fresh it must be."
    >
      <Box gap="xs">
        {rows.map((r) => (
          <Box key={r.strategy} p="sm" radius="sm" bg="surfaceVariant">
            <Box
              row
              gap="sm"
              style={{ flexWrap: 'wrap', alignItems: 'baseline' }}
            >
              <Pill tone="primary" value={r.strategy} />
              <Pill label="optimises" value={r.optimises} />
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {cacheStrategyLabel(r.strategy)}. {r.when}
            </Text>
          </Box>
        ))}
        <Text variant="caption" tone="muted">
          This app&rsquo;s repository currently uses a network-first variant:
          try the network, cache the result, and fall back to the cache on
          failure (cited in the next section). A stale-while-revalidate layer
          is the natural upgrade for list screens.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. This app's cache seam — REAL artifacts                          */
/* ------------------------------------------------------------------ */

function CacheSeamCard() {
  return (
    <Section
      title="This app's cache seam"
      explanation="The app already has the seam an offline layer plugs into: an AsyncStorage-backed connection (app-database) + a per-entity DAO (post-dao) consumed by the repository. These are the REAL artifacts below."
    >
      <Box gap="sm">
        <Text variant="body">
          The local layer separates{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            connection/provider
          </Text>{' '}
          from{' '}
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            per-entity queries
          </Text>
          , mirroring how the remote layer splits{' '}
          <Text style={{ fontFamily: 'monospace' }}>http-client</Text> from{' '}
          <Text style={{ fontFamily: 'monospace' }}>*-remote-data-source</Text>.
          That seam is what lets the repository transparently swap source
          (network → cache) without the UI knowing.
        </Text>
        <Code language="app-database.ts">{`// src/data/local/app-database.ts (REAL)
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PostDTO } from '../remote/dtos/post-dto';
import { PostDao } from './daos/post-dao';

// The connection/provider — owns the storage + DAO instances. Equivalent to
// the remote layer's http-client.
export abstract class AppDatabase {
  abstract insertPosts(posts: PostDTO[]): Promise<void>;
  abstract getPosts(): Promise<PostDTO[]>;
}

const STORAGE_KEY = 'rndg.posts';

export class AppDatabaseImpl extends AppDatabase {
  private readonly postDao: PostDao;
  constructor(storage: typeof AsyncStorage = AsyncStorage) {
    super();
    this.postDao = new PostDao(storage, STORAGE_KEY);
  }
  insertPosts(posts: PostDTO[]) { return this.postDao.replaceAll(posts); }
  getPosts()                     { return this.postDao.getAll(); }
}`}</Code>
        <Code language="post-dao.ts">{`// src/data/local/daos/post-dao.ts (REAL)
// Per-entity queries — owns read/write of the posts collection against the KV
// store. Any storage/parse failure is wrapped in AppDatabaseException so the
// guards pipeline maps it to a DatabaseFailure / CacheFailure consistently.
export class PostDao {
  async getAll(): Promise<PostDTO[]> {
    const raw = await this.storage.getItem(this.key);  // JSON array
    if (!raw) return [];
    return JSON.parse(raw).map(postDtoFromJson);
  }
  async replaceAll(posts: PostDTO[]) {
    await this.storage.setItem(this.key, JSON.stringify(posts));
  }
}`}</Code>
        <Text variant="small" style={{ fontWeight: '600' }}>
          What the repository already does (network-first + cache fallback)
        </Text>
        <Code language="post-repository-impl.ts">{`// src/data/repositories/post-repository-impl.ts (REAL — current behaviour)
async getPosts() {
  return safeRepositoryCall<Post[]>({
    call: async () => {
      const remotePosts = await this.remote.getPosts();
      try { await this.local.insertPosts(remotePosts); } // cache on success
      catch (e) { this.logger.warning('Failed to cache posts', e); }
      return remotePosts.map(toPost);
    },
    onNetworkError: (cause) => this.serveFromCache(cause), // fall back to cache
    onServerError: (cause) => this.serveFromCache(cause),
  });
}
// serveFromCache: cache hit -> Success(posts, warning) [non-blocking];
//                 cache miss -> Failed(networkFailure) [blocking].`}</Code>
        <Text variant="small" style={{ fontWeight: '600' }}>
          Teaching extension — read-through (cache-first)
        </Text>
        <Text variant="caption" tone="muted">
          The snippet below is ILLUSTRATIVE — it is NOT current behaviour. It
          shows how the existing repo would gain a cache-first strategy for an
          offline-heavy surface, slotting into the same{' '}
          <Text style={{ fontFamily: 'monospace' }}>this.local</Text> seam
          without touching the UI or the remote source.
        </Text>
        <Code language="illustrative">{`// ILLUSTRATIVE — a cache-first read that WOULD slot into PostRepositoryImpl.
// (Teaching extension, not current behaviour.)
async getPostsCacheFirst() {
  // 1. Read from the cache synchronously (instant render).
  let cached: PostDTO[] = [];
  try { cached = await this.local.getPosts(); } catch { /* ignore */ }
  // 2. Hand the caller the stale list immediately (non-blocking).
  const stale = cached.map(toPost);
  // 3. Revalidate in the background; refresh the cache on success.
  this.remote.getPosts()
    .then((fresh) => this.local.insertPosts(fresh).then(() => fresh))
    .catch((e) => this.logger.warning('Revalidate failed', e));
  return success(stale);   // caller renders now; next mount sees fresh data
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Optimistic UI (LIVE demo)                                       */
/* ------------------------------------------------------------------ */

function OptimisticUiCard() {
  const demo = useOptimisticListDemo();
  return (
    <Section
      title="Optimistic UI — pending-state + rollback (LIVE)"
      explanation="Show the change instantly with a pending marker; confirm or roll back when the async commit resolves. This is the pattern that keeps the UI responsive while a write is in flight."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill
            tone={demo.forceFail ? 'danger' : 'success'}
            label="commit knob"
            value={demo.forceFail ? 'force-fail (rollback)' : 'succeed (confirm)'}
          />
          <Button
            title="Toggle knob"
            variant="outline"
            onPress={demo.toggleForceFail}
          />
        </Box>
        <Box
          row
          gap="xs"
          p="xs"
          radius="sm"
          bg="surfaceVariant"
          style={{ alignItems: 'center' }}
        >
          <TextInput
            value={demo.draft}
            onChangeText={demo.setDraft}
            placeholder="Add a task…"
            onSubmitEditing={demo.submitDraft}
            style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 8 }}
          />
          <Button title="Add" onPress={demo.submitDraft} />
        </Box>
        <Box gap="xs">
          {demo.items.length === 0 ? (
            <Text variant="caption" tone="muted">
              No items yet. Add one — it appears instantly as{' '}
              <Text style={{ fontFamily: 'monospace' }}>pending</Text>, then
              the simulated commit (~1.2s) confirms or rolls it back based on
              the knob above.
            </Text>
          ) : (
            demo.items.map((it) => (
              <OptimisticRow key={it.id} label={it.label} state={it.syncState} />
            ))
          )}
        </Box>
        <Code>{`// src/ui/views/offline/offline_hooks.ts — useOptimisticListDemo
// 1. Append optimistically in the 'pending' state (UI updates immediately).
setItems((prev) => [...prev, { id, label, syncState: 'pending' }]);
// 2. Simulate an async commit; on success promote, on failure roll back.
setTimeout(() => {
  if (willFail) {
    setItems((prev) => prev.map((it) =>
      it.id === id ? { ...it, syncState: 'error' } : it));
    // ...then drop the row after a brief beat so the user sees the red flash.
  } else {
    setItems((prev) => prev.map((it) =>
      it.id === id ? { ...it, syncState: 'synced' } : it));
  }
}, 1200);`}</Code>
        <Text variant="caption" tone="muted">
          The pure-updater rule still holds: every{' '}
          <Text style={{ fontFamily: 'monospace' }}>setItems</Text> updater
          returns the next list from{' '}
          <Text style={{ fontFamily: 'monospace' }}>prev</Text> + values
          captured OUTSIDE the updater (id/label/willFail). No setState nested
          inside another updater.
        </Text>
      </Box>
    </Section>
  );
}

function OptimisticRow({ label, state }: { label: string; state: SyncState }) {
  const tone =
    state === SYNC_STATE.SYNCED
      ? 'success'
      : state === SYNC_STATE.ERROR
        ? 'danger'
        : 'primary';
  return (
    <Box p="sm" radius="sm" bg="surfaceVariant" row gap="sm" style={{ alignItems: 'center' }}>
      <Box flex={1}>
        <Text variant="small" style={{ fontWeight: '600' }}>
          {label}
        </Text>
        <Text variant="caption" tone="muted">
          {syncStateLabel(state)}
        </Text>
      </Box>
      <Pill tone={tone} value={state} />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Background sync / queue                                         */
/* ------------------------------------------------------------------ */

function BackgroundSyncCard() {
  return (
    <Section
      title="Background sync — the mutation queue"
      explanation="While offline, persist each mutation to a queue (AsyncStorage or SQLite); drain it when NetInfo fires a 'back-online' transition. For work that must run while the app is suspended, the platform background-task APIs are the escape hatch."
    >
      <Box gap="sm">
        <Text variant="body">
          The shape: a write goes into a durable queue immediately (with a
          client id + the payload), the UI shows it as{' '}
          <Text style={{ fontFamily: 'monospace' }}>pending</Text>, and a{' '}
          <Text style={{ fontFamily: 'monospace' }}>NetInfo</Text> listener
          drains the queue on reconnect. Each drained mutation is then handed
          to the repository, which retries with backoff.
        </Text>
        <Code language="illustrative">{`// ILLUSTRATIVE — a durable mutation queue + drain-on-reconnect.
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QKEY = 'rndg.pending-mutations';

async function enqueue(mutation: Mutation) {
  const raw = await AsyncStorage.getItem(QKEY);
  const q: Mutation[] = raw ? JSON.parse(raw) : [];
  q.push(mutation);
  await AsyncStorage.setItem(QKEY, JSON.stringify(q));
}

async function drain(repo: PostRepository) {
  const raw = await AsyncStorage.getItem(QKEY);
  const q: Mutation[] = raw ? JSON.parse(raw) : [];
  const remaining: Mutation[] = [];
  for (const m of q) {
    try { await repo.apply(m); }            // idempotent, retried w/ backoff
    catch { remaining.push(m); }            // stay queued on failure
  }
  await AsyncStorage.setItem(QKEY, JSON.stringify(remaining));
}

// Drain whenever the device comes back online.
NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) drain(container.postRepo);
});`}</Code>
        <Text variant="caption" tone="muted">
          For TRUE background (the app suspended), wrap that drain in{' '}
          <Text style={{ fontFamily: 'monospace' }}>expo-task-manager</Text> +{' '}
          <Text style={{ fontFamily: 'monospace' }}>expo-background-fetch</Text>{' '}
          — the platform BGTaskScheduler (iOS) / WorkManager (Android)
          primitives, taught on the App State screen. Those packages are NOT
          installed here; the snippet is illustrative.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Production notes — DO / AVOID                                   */
/* ------------------------------------------------------------------ */

const DO_ROWS: ReadonlyArray<{ tone: 'success' | 'danger'; label: string; body: string }> = [
  {
    tone: 'success',
    label: 'DO make mutations idempotent',
    body: 'A retried POST must not double-charge or duplicate. Use a client-generated idempotency key so the server can dedupe across retries.',
  },
  {
    tone: 'success',
    label: 'DO surface sync errors non-blockingly',
    body: 'A failed queued write is a Warning (toast + retry affordance), not a Critical full-screen error. The exception-handling severity model drives this.',
  },
  {
    tone: 'success',
    label: 'DO retry with exponential backoff',
    body: 'Drain failures should back off (e.g. 1s, 2s, 4s, capped) with jitter to avoid a thundering herd on reconnect.',
  },
  {
    tone: 'success',
    label: 'DO pick a conflict-resolution policy',
    body: 'Decide up front: last-write-wins (simplest, loses concurrent edits) vs server-authoritative (server is the SSOT, client reconciles). Document it.',
  },
  {
    tone: 'danger',
    label: 'AVOID trusting isConnected alone',
    body: 'A captive portal or a router with no upstream leaves isConnected true but isInternetReachable false. Check both before declaring "online".',
  },
  {
    tone: 'danger',
    label: 'AVOID unbounded queues',
    body: 'A queue with no cap will grow forever in a permanently-offline device. Cap it (drop oldest, or fail-fast) and persist only what you will actually retry.',
  },
  {
    tone: 'danger',
    label: 'AVOID netinfo on bare without a dev build',
    body: 'Under Expo Go netinfo works out of the box. On a bare workflow (no Expo Go) it ships native code — build a custom dev/EAS build; do NOT assume the JS-only path works in a store build.',
  },
];

function ProductionNotesCard() {
  return (
    <Section
      title="Production notes"
      explanation="The offline pattern is a system, not a single hook. These are the decisions that bite in production."
    >
      <Box gap="xs">
        {DO_ROWS.map((r) => (
          <Box key={r.label} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
            <Pill tone={r.tone} value={r.tone === 'success' ? 'DO' : 'AVOID'} />
            <Box flex={1}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.label}
              </Text>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.body}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}
