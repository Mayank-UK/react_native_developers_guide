import { TextInput, View } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { ShowError } from '../../components/show-error';
import { ToastStack } from '../../components/toast';
import { isBlocking } from '../../hooks/use-posts';
import { Box, Button, Text, useTheme } from '../../design-system';
import { Section, Code, Pill } from '../../components';
import {
  useLiveCrudDemo,
  useNotesList,
  useOfflineFirstDemo,
  offlineStatusLabel,
  offlineStatusPill,
  OFFLINE_PRESETS,
  NOTES_KEY,
  type PostsState,
} from './database_handling_hooks';

/**
 * DatabaseHandlingView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (database_handling_hooks.ts); this file only renders.
 *
 * Teaching artifact for LOCAL PERSISTENCE in React Native, grounded in THIS
 * app's actual implementation.
 *
 * The spine the screen explains (read the real files):
 *   domain Post (pure)  ←  data/local AppDatabase + PostDao (AsyncStorage + JSON)
 *                        ←  data/repositories PostRepositoryImpl (offline-first:
 *                           remote → cache; on failure serve cache + a non-blocking
 *                           Result.Success warning, else a blocking chained Failure)
 *
 * Every concept ships with a LIVE, interactive demo:
 *   1. CRUD playground on a self-contained NoteDao (mirrors PostDao) using the
 *      REAL AsyncStorage — add / edit / delete / clear, then "force remount" to
 *      prove the data survived in storage (not just in component state).
 *   2. Offline-first demo wired to the app's own container + usePosts hook +
 *      dev scenario knobs (ApiScenario + DbScenario): success caches → network
 *      down serves cached posts WITH a non-blocking warning → empty cache is a
 *      blocking failure → cache-read error is a chained Failure.
 *
 * Single-file helpers stay local per convention. No `any`; strict +
 * `erasableSyntaxOnly`-clean.
 */
export function DatabaseHandlingView() {
  return (
    <ScreenScaffold
      title="Database Handling"
      subtitle="Local persistence behind a DAO — the offline-first seam."
    >
      <IntroCard />
      <ArchitectureSpineCard />
      <ThisAppStorageCard />
      <DaoPatternCard />
      <LiveCrudCard />
      <OfflineFirstCard />
      <StorageEngineCard />
      <AdvancedCard />
      <RecapCard />
    </ScreenScaffold>
  );
}
function IntroCard() {
  return (
    <Section title="Local persistence">
      <Text variant="body">
        Local persistence in this app is NOT a screen concern and NOT a
        repository concern — it is a{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          pluggable seam
        </Text>{' '}
        owned by one layer (`data/local`) and hidden behind a DAO. The domain
        model has no idea storage exists; the repository only knows "I can ask
        the cache for posts"; the storage engine is an implementation detail
        you can swap without touching anyone above it.
      </Text>
      <Box gap="xs">
        {LAYER_ROWS.map((r) => (
          <Box key={r.layer} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.layer}
              </Text>
              <Text variant="small" tone="primary" style={{ fontFamily: 'monospace' }}>
                {r.files}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.role}
            </Text>
          </Box>
        ))}
      </Box>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          The dependency arrow only points inward/downward. A screen imports a
          use case, the use case imports a repository interface, the repository
          implementation owns the DAO, the DAO owns the storage engine. Nothing
          above the DAO knows whether that engine is AsyncStorage, SQLite, or
          MMKV — which is exactly why this app can swap it (see ARCHITECTURE.md).
        </Text>
      </Box>
    </Section>
  );
}

const LAYER_ROWS: ReadonlyArray<{ layer: string; files: string; role: string }> = [
  {
    layer: 'domain (pure)',
    files: 'models/Post, repositories/PostRepository',
    role: 'Knows NOTHING about storage. PostRepository is just an interface — the seam data implements.',
  },
  {
    layer: 'data/local',
    files: 'AppDatabase + daos/PostDao',
    role: 'Owns persistence. AppDatabase is the abstract contract; PostDao does the actual (de)serialize + read/write.',
  },
  {
    layer: 'data/repositories',
    files: 'PostRepositoryImpl',
    role: 'Orchestrates remote + local. Offline-first: fetch remote → cache; on failure serve local cache + a warning.',
  },
  {
    layer: 'storage engine',
    files: '@react-native-async-storage/async-storage',
    role: 'The concrete KV store. Portable across Expo Go / iOS / Android / web. The only file that imports it is PostDao.',
  },
];

/* ------------------------------------------------------------------ */
/* 2. Architecture spine — the real flow, annotated                    */
/* ------------------------------------------------------------------ */

function ArchitectureSpineCard() {
  return (
    <Section
      title="The spine — AppDatabase → PostDao → PostRepositoryImpl"
      explanation="This is the real code path a `getPosts` call takes through the app's persistence layer. Read each file; the demo further down exercises exactly this."
    >
      <Box gap="sm">
        <Code>{`// domain/repositories/post-repository.ts — the SEAM (interface only)
interface PostRepository {
  getPosts(): Promise<Result<Post[]>>;   // no storage types leak here
}

// data/local/app-database.ts — abstract contract + concrete impl
abstract class AppDatabase {
  abstract insertPosts(posts: PostDTO[]): Promise<void>;
  abstract getPosts(): Promise<PostDTO[]>;
}
class AppDatabaseImpl extends AppDatabase {
  private readonly postDao: PostDao;          // delegates to a DAO
  getPosts()        { return this.postDao.getAll(); }
  insertPosts(dtos) { return this.postDao.replaceAll(dtos); }
}

// data/local/daos/post-dao.ts — owns the storage + (de)serialize
class PostDao {
  async getAll(): Promise<PostDTO[]> { /* AsyncStorage.getItem + JSON.parse */ }
  async replaceAll(dtos: PostDTO[])  { /* JSON.stringify + setItem */ }
  async clear()                      { /* removeItem */ }
}

// data/repositories/post-repository-impl.ts — orchestrates remote + local
class PostRepositoryImpl implements PostRepository {
  async getPosts() {
    return safeRepositoryCall({
      call: async () => {
        const remote = await this.remote.getPosts();   // 1. remote-first
        await this.local.insertPosts(remote);          // 2. cache (best-effort)
        return remote.map(toPost);
      },
      onNetworkError: (c) => this.serveFromCache(c),   // 3. fallback on failure
      onServerError:  (c) => this.serveFromCache(c),
    });
  }
}`}</Code>
        <Text variant="caption" tone="muted">
          Three things to notice. (1) The repository depends on the{' '}
          <Text style={{ fontFamily: 'monospace' }}>AppDatabase</Text> abstract,
          not on AsyncStorage — swapping engines stops at the DAO. (2) The DAO
          works in <Text style={{ fontFamily: 'monospace' }}>PostDTO</Text>s,
          not domain <Text style={{ fontFamily: 'monospace' }}>Post</Text>s —
          serialization is a data-layer concern, kept out of the domain. (3) The
          cache write on the success path is best-effort: a write failure is only
          logged, never surfaced to the user (you already have the data).
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. What this app uses + why                                         */
/* ------------------------------------------------------------------ */

function ThisAppStorageCard() {
  return (
    <Section
      title="What this app uses — AsyncStorage behind a DAO"
      explanation="The web guide uses IndexedDB via Dexie; the Flutter guide uses sqflite. For RN this app picks @react-native-async-storage/async-storage — and the WHY matters more than the what."
    >
      <Box gap="xs">
        {ASYNC_REASONS.map((r) => (
          <Box key={r.headline} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {r.headline}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" tone="muted">
            <Text style={{ fontWeight: '600' }}>Swap target:</Text> AsyncStorage
            is a flat key-value store — no querying, no relational joins, and the
            whole posts collection lives under one key. That is fine for this
            cache. ARCHITECTURE.md calls out that for relational / query-heavy
            data the production choice is{' '}
            <Text style={{ fontFamily: 'monospace' }}>expo-sqlite</Text> or
            WatermelonDB — and because the engine sits behind the DAO, that swap
            changes ONE file without rippling up to the repository or UI.
          </Text>
        </Box>
      </Box>
    </Section>
  );
}

const ASYNC_REASONS: ReadonlyArray<{ headline: string; body: string }> = [
  {
    headline: 'Portable across every RN target',
    body: 'Works in Expo Go, bare iOS, bare Android, AND web (where it backs onto localStorage/IndexedDB). One code path, no platform branching — important for a teaching app that also exports to web.',
  },
  {
    headline: 'Dependency-light + Expo Go friendly',
    body: 'No native module to compile, no prebuild, no New Architecture headache. It ships with the Expo managed workflow out of the box. Heavier engines (sqlite/rrealm/mmkv) need native builds.',
  },
  {
    headline: 'Simple API, simple failure model',
    body: 'Just getItem / setItem / removeItem of string→string. The DAO serializes the collection to JSON. Failures are caught and wrapped in a typed AppDatabaseException → mapped to a CacheFailure by the guards pipeline.',
  },
  {
    headline: 'Honest about its limits',
    body: '~6MB default per-platform, string-only, synchronous-ish JSON parsing, no indexes. Perfect for a small cache of posts; wrong for thousands of queryable rows. The decision matrix below picks the right engine when those limits bite.',
  },
];

/* ------------------------------------------------------------------ */
/* 4. The DAO pattern                                                  */
/* ------------------------------------------------------------------ */

function DaoPatternCard() {
  return (
    <Section
      title="The DAO pattern — decoupling the repository from the engine"
      explanation="A Data Access Object is a small class that owns ALL the read/write of one entity against a storage backend. The repository talks to the DAO interface, never to the engine. That is what makes the engine swappable and the repository testable with a fake DAO."
    >
      <Box gap="sm">
        <Box gap="xs">
          {DAO_POINTS.map((p) => (
            <Box key={p.title} p="sm" radius="sm" bg="surfaceVariant">
              <Text variant="small" style={{ fontWeight: '600' }}>
                {p.title}
              </Text>
              <Text variant="caption" tone="muted" mt="xxs">
                {p.body}
              </Text>
            </Box>
          ))}
        </Box>
        <Code>{`// PostDao's three responsibilities, on this app's real shape:

// 1. CRUD. getAll / replaceAll / clear map to storage ops.
async getAll(): Promise<PostDTO[]> {
  const raw = await this.storage.getItem(this.key);   // read string
  if (!raw) return [];                                 // cache miss = empty
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new AppDatabaseException(...);
  return parsed.map((item) => postDtoFromJson(item));  // validate + shape
}

// 2. Validate on the way OUT (defensive — the cache can corrupt).
//    postDtoFromJson throws on non-integer id / non-string title,
//    so a corrupted cache becomes a typed AppDatabaseException,
//    not a NaN id reaching the UI.

// 3. Map domain <-> storage shape. The DAO works in PostDTO; the
//    repository calls .map(toPost) to hand the UI plain Posts.
//    Post never learns that JSON exists.`}</Code>
        <Text variant="caption" tone="muted">
          Notice the DAO never returns a{' '}
          <Text style={{ fontFamily: 'monospace' }}>Result&lt;T&gt;</Text> or a{' '}
          <Text style={{ fontFamily: 'monospace' }}>Failure</Text>. It throws
          typed <Text style={{ fontFamily: 'monospace' }}>AppDatabaseException</Text>s;
          the repository's{' '}
          <Text style={{ fontFamily: 'monospace' }}>safeRepositoryCall</Text>{' '}
          catches those and converts them into the domain{' '}
          <Text style={{ fontFamily: 'monospace' }}>Result</Text>. Exceptions
          stay inside <Text style={{ fontFamily: 'monospace' }}>data/</Text>;
          the UI only ever sees <Text style={{ fontFamily: 'monospace' }}>Result</Text>.
        </Text>
      </Box>
    </Section>
  );
}

const DAO_POINTS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Why a DAO (not just calling AsyncStorage from the repo)',
    body: 'Single Responsibility: the repository orchestrates remote+local STRATEGY; the DAO knows the TACTICS of one storage engine. Swap AsyncStorage → SQLite? You rewrite the DAO, the repository is untouched. Test the repo? Inject a fake DAO.',
  },
  {
    title: 'CRUD shape',
    body: 'A DAO exposes Create/Read/Update/Delete verbs for one entity. This app\'s PostDao is cache-shaped: getAll (read all), replaceAll (write/overwrite), clear (delete all). A per-row DAO would add upsert(id) and remove(id) — exactly what the live NoteDao demo below does.',
  },
  {
    title: 'Domain ↔ storage mapping lives in the DAO',
    body: 'Stored form (PostDTO, JSON) and domain form (Post) are deliberately different types. The DAO (de)serializes; `postDtoFromJson` validates; `toPost`/`fromPost` convert. The domain model stays persistence-agnostic.',
  },
];

/* ------------------------------------------------------------------ */
/* 5. LIVE CRUD playground — a self-contained NoteDao (mirrors PostDao)*/
/* ------------------------------------------------------------------ */

/**
 * The list component. It is KEYED from the parent — bumping the key unmounts
 * and remounts it, so it re-reads from storage on mount. If the notes survive
 * that remount, persistence is proven (they came from AsyncStorage, not state).
 * All state/behaviour is delegated to the co-located useNotesList hook; this
 * component only renders.
 */
function NotesList({ dao, onCountChange }: { dao: ReturnType<typeof useLiveCrudDemo>['dao']; onCountChange: (n: number) => void }) {
  const { theme } = useTheme();
  const { notes, phase, error, editingId, draft, setDraft, startEdit, cancelEdit, saveEdit, removeNote } =
    useNotesList(dao, onCountChange);

  if (phase === 'loading') {
    return (
      <Text variant="small" tone="muted">
        reading from AsyncStorage…
      </Text>
    );
  }

  if (phase === 'error') {
    return (
      <Box p="sm" radius="sm" bg="surfaceVariant">
        <Text variant="small" tone="danger" style={{ fontWeight: '600' }}>
          DAO read failed: {error ?? 'unknown'}
        </Text>
      </Box>
    );
  }

  if (notes.length === 0) {
    return (
      <Box p="sm" radius="sm" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          (no notes stored) — add one above, then tap “Force remount”.
        </Text>
      </Box>
    );
  }

  return (
    <Box gap="xs">
      {notes.map((note) => (
        <Box key={note.id} p="sm" radius="sm" bg="surfaceVariant">
          {editingId === note.id ? (
            <Box gap="xs">
              <TextInput
                value={draft}
                onChangeText={setDraft}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                  borderRadius: theme.radii.sm,
                  padding: theme.spacing.sm,
                  color: theme.colors.text,
                }}
                placeholder="edit title"
                placeholderTextColor={theme.colors.textMuted}
              />
              <Box row gap="xs">
                <Button title="save (upsert)" variant="filled" onPress={() => void saveEdit()} />
                <Button title="cancel" variant="ghost" onPress={cancelEdit} />
              </Box>
            </Box>
          ) : (
            <>
              <Box row gap="sm" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="small" style={{ fontWeight: '600', flexShrink: 1 }}>
                  #{note.id} · {note.title}
                </Text>
                <Text variant="caption" tone="muted">
                  persisted
                </Text>
              </Box>
              <Text variant="caption" tone="muted" mt="xxs">
                {note.body}
              </Text>
              <Box row gap="xs" mt="xs">
                <Button title="edit" variant="outline" onPress={() => startEdit(note)} />
                <Button title="delete" variant="ghost" onPress={() => void removeNote(note.id)} />
              </Box>
            </>
          )}
        </Box>
      ))}
    </Box>
  );
}

function LiveCrudCard() {
  const { theme } = useTheme();
  const { dao, remountKey, count, setCount, title, setTitle, hint, addNote, clearAll, remount } =
    useLiveCrudDemo();

  return (
    <Section
      title="LIVE — CRUD playground on a real DAO (AsyncStorage)"
      explanation="This is a self-contained NoteDao that mirrors PostDao's pattern but adds per-row CRUD (upsert/remove) so add/edit/delete are observable. It writes to the REAL AsyncStorage — so tap “Force remount” and watch the notes come straight back from storage, proving they survived outside component state."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill tone="primary">{`${count} stored`}</Pill>
          <Pill>{`storage key: ${NOTES_KEY}`}</Pill>
        </Box>

        <Box gap="xs">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="note title → dao.upsert({ id, title, body })"
            placeholderTextColor={theme.colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.sm,
              padding: theme.spacing.sm,
              color: theme.colors.text,
            }}
          />
          <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
            <Button title="add (upsert)" variant="filled" onPress={() => void addNote()} />
            <Button title="Force remount" variant="outline" onPress={remount} />
            <Button title="clear (removeItem)" variant="ghost" onPress={() => void clearAll()} />
          </Box>
        </Box>

        {/*
          Keyed child: bumping remountKey fully unmounts + remounts this subtree.
          On remount it re-runs dao.getAll() — if rows reappear, they came from
          AsyncStorage, not from React state. That is the persistence proof.
        */}
        <View key={remountKey}>
          <NotesList dao={dao} onCountChange={setCount} />
        </View>

        <Box p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="caption" tone="muted">
            {hint ??
              'The list above is a keyed child. Edit/delete act on storage then reload; “Force remount” throws the component away and recreates it — yet the rows reappear, because NoteDao reads them back from AsyncStorage on mount.'}
          </Text>
        </Box>

        <Code>{`// The demo's NoteDao is the same pattern as the app's real PostDao:
class NoteDao {
  constructor(private storage: typeof AsyncStorage, private key: string) {}
  async getAll()                  { /* getItem + JSON.parse + validate */ }
  async upsert(note: NoteDTO)     { /* read, filter out old id, write back */ }
  async remove(id: number)        { /* read, filter out id, write back */ }
  async clear()                   { /* removeItem */ }
}
// add/edit/delete all flow through the DAO; the component never touches
// AsyncStorage directly — exactly the seam PostDao gives the repository.`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. LIVE offline-first — the cache-fallback strategy, exercised      */
/* ------------------------------------------------------------------ */

function OfflineFirstCard() {
  const { state, fetch, toast, active, run } = useOfflineFirstDemo();

  return (
    <Section
      title="LIVE — offline-first repository (cache + non-blocking warning)"
      explanation="This wires the app's real container + usePosts hook to the dev scenario knobs. Walk the presets left-to-right: online caches the posts; going offline serves that cache WITH a non-blocking warning (Result.Success carries a warning); an empty cache is a blocking failure; a cache read error is a CHAINED failure. This is exactly PostRepositoryImpl.serveFromCache."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {OFFLINE_PRESETS.map((p) => (
            <Button
              key={p.preset}
              title={p.label}
              variant={active === p.preset ? 'filled' : 'outline'}
              onPress={() => run(p.preset, p.api, p.db)}
            />
          ))}
          <Button title="refetch" variant="ghost" onPress={fetch} />
        </Box>

        <Box row gap="sm" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill tone={offlineStatusPill(state)}>{offlineStatusLabel(state)}</Pill>
          {state.status === 'loaded' && state.warning ? (
            <Pill tone="danger">{`warning: ${state.warning.kind}`}</Pill>
          ) : null}
        </Box>

        <OfflineBody state={state} onRetry={fetch} />

        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" tone="muted">
            <Text style={{ fontWeight: '600' }}>Active branch: </Text>
            {OFFLINE_PRESETS.find((p) => p.preset === active)?.branch}
          </Text>
        </Box>

        <Code>{`// PostRepositoryImpl — the offline-first contract this demo exercises:
async getPosts() {
  return safeRepositoryCall({
    call: async () => {
      const remote = await this.remote.getPosts();   // (1) remote-first
      await this.local.insertPosts(remote);          // (2) cache (best-effort)
      return remote.map(toPost);
    },
    onNetworkError: (c) => this.serveFromCache(c),   // (3) fallback
  });
}
// serveFromCache: cache hit  → success(posts, networkFailure) // NON-blocking
//                 cache empty → failed(networkFailure)         // blocking
//                 cache read throws → chainedCacheFailure       // blocking`}</Code>
        <Text variant="caption" tone="muted">
          The key idea: a network failure is NOT necessarily an error the user
          must deal with. If a cache exists, the call still{' '}
          <Text style={{ fontFamily: 'monospace' }}>succeeds</Text> — it just
          carries a non-blocking{' '}
          <Text style={{ fontFamily: 'monospace' }}>warning</Text> so the UI can
          toast “showing offline data”. That is the{' '}
          <Text style={{ fontFamily: 'monospace' }}>Result.Success&lt;T,warning?&gt;</Text>{' '}
          pattern: one value carries both the data and the soft notice, instead
          of forcing a hard error.
        </Text>
      </Box>
      <ToastStack entries={toast.entries} onDismiss={toast.dismiss} />
    </Section>
  );
}

function OfflineBody({ state, onRetry }: { state: PostsState; onRetry: () => void }) {
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <Box p="sm" radius="sm" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          fetching through the usecase → repository → remote/local…
        </Text>
      </Box>
    );
  }
  if (state.status === 'error') {
    if (isBlocking(state.failure)) {
      return <ShowError message={state.failure.message} onRetry={onRetry} />;
    }
    return (
      <Box p="sm" radius="sm" bg="surfaceVariant">
        <Text variant="small" tone="danger">
          non-blocking error: {state.failure.message}
        </Text>
      </Box>
    );
  }
  // loaded (possibly with warning)
  return (
    <Box gap="xs">
      {state.posts.slice(0, 3).map((p) => (
        <Box key={p.id} p="sm" radius="sm" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            #{p.id} {p.title}
          </Text>
        </Box>
      ))}
      <Text variant="caption" tone="muted">
        {state.posts.length} posts {state.warning ? '(served from cache)' : '(fresh from remote)'}
      </Text>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Storage engine landscape + decision matrix                       */
/* ------------------------------------------------------------------ */

function StorageEngineCard() {
  return (
    <Section
      title="Storage engines in RN — pick by the shape of your data"
      explanation="AsyncStorage is this app's choice, but it is one of several. Each engine exists because a different access pattern (querying, throughput, blob storage, secrets) demands it. Read the matrix as need → engine."
    >
      <Box gap="xs">
        {ENGINE_ROWS.map((r) => (
          <Box key={r.engine} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.engine}
              </Text>
              <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                {r.shape}
              </Text>
              {r.thisApp ? <Pill tone="primary">this app</Pill> : null}
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.note}
            </Text>
          </Box>
        ))}

        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" style={{ fontWeight: '600' }}>
            Decision matrix — need → engine
          </Text>
          <Box gap="xs" mt="xs">
            {MATRIX_ROWS.map((m) => (
              <Box key={m.need} p="xs" radius="sm" bg="background">
                <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <Text variant="caption" style={{ fontWeight: '600' }}>
                    {m.need}
                  </Text>
                  <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                    {m.pick}
                  </Text>
                </Box>
                <Text variant="caption" tone="muted" mt="xxs">
                  {m.why}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Section>
  );
}

const ENGINE_ROWS: ReadonlyArray<{
  engine: string;
  shape: string;
  note: string;
  thisApp?: boolean;
}> = [
  {
    engine: 'AsyncStorage',
    shape: 'key-value (string→string)',
    note: 'The portable RN default. Works on iOS/Android/web/Expo Go. No querying, ~6MB, serializes the whole value. Best for simple caches, flags, single-blob collections. This app caches posts here.',
    thisApp: true,
  },
  {
    engine: 'expo-sqlite / react-native-quick-sqlite',
    shape: 'relational (SQL)',
    note: 'A real SQLite database: tables, indexes, JOINs, transactions. The upgrade path when AsyncStorage can no longer query your data. expo-sqlite is the Expo-blessed, synchronous-API-capable option; quick-sqlite is the faster JSI-based variant.',
  },
  {
    engine: 'react-native-mmkv',
    shape: 'key-value (native, JSI)',
    note: 'Drop-in replacement for AsyncStorage that is an order of magnitude faster (C++ JSI, no bridge, no serialization overhead). Same KV model, near-instant reads/writes. The default high-performance KV in modern RN apps.',
  },
  {
    engine: 'WatermelonDB',
    shape: 'offline-first relational ORM',
    note: 'Built on SQLite, designed for LARGE offline datasets (tens of thousands of rows). Lazy-loaded, reactive queries, sync engine. Reach for it when "offline-first" is the whole app (a field-data collector, a mail client).',
  },
  {
    engine: 'Realm (realm-js)',
    shape: 'object database',
    note: 'No SQL — you store live objects and query them reactively. Excellent DX and a built-in sync (Atlas Device Sync). Heavier native dependency; historically version-fragile across RN upgrades. Strong for rich local domains.',
  },
  {
    engine: 'expo-file-system',
    shape: 'files / blobs / logs',
    note: 'Read/write real files. Use for things that are not structured records: downloaded images, audio blobs, append-only logs, exported JSON. Usually wrapped by a small DAO like the others.',
  },
];

const MATRIX_ROWS: ReadonlyArray<{ need: string; pick: string; why: string }> = [
  { need: 'A few flags / a small cache / theme', pick: 'AsyncStorage', why: 'Simplest; portable; already in this app.' },
  { need: 'Need it FAST, same KV model', pick: 'react-native-mmkv', why: 'JSI-native; near-zero overhead vs AsyncStorage.' },
  { need: 'Query/join/transaction over rows', pick: 'expo-sqlite', why: 'Real SQL; the documented swap target for this app\'s DAO.' },
  { need: 'Huge offline dataset + sync', pick: 'WatermelonDB', why: 'Lazy loading + reactive queries + a sync engine.' },
  { need: 'Rich object graph, reactive', pick: 'Realm', why: 'Object DB; query results update observers automatically.' },
  { need: 'Files, blobs, append-only logs', pick: 'expo-file-system', why: 'Real files; wrap in a DAO like any other engine.' },
  { need: 'Secrets (tokens, keys)', pick: 'expo-secure-store', why: 'Encrypted by the Keychain/Keystore; never plaintext AsyncStorage.' },
];

/* ------------------------------------------------------------------ */
/* 8. Migrations, schema versioning, encryption (best practices)       */
/* ------------------------------------------------------------------ */

function AdvancedCard() {
  return (
    <Section
      title="Migrations, schema versioning & secrets"
      explanation="Once you persist data, you owe users a story for changing that shape and for protecting sensitive values. These are prose-level practices — the concepts transfer to whichever engine the matrix above led you to."
    >
      <Box gap="xs">
        {ADVANCED_ROWS.map((r) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {r.title}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
        <Box p="sm" radius="md" bg="surfaceVariant">
          <Text variant="small" tone="muted">
            <Text style={{ fontWeight: '600' }}>In THIS app:</Text> the cached
            shape is a versioned DTO (<Text style={{ fontFamily: 'monospace' }}>PostDTO</Text>)
            validated by <Text style={{ fontFamily: 'monospace' }}>postDtoFromJson</Text> on
            read — so an unexpected shape becomes a typed{' '}
            <Text style={{ fontFamily: 'monospace' }}>AppDatabaseException</Text>{' '}
            rather than corrupting the UI. When the schema grows, that validate-on-read
            seam is where a migration/upgrade step would hook in.
          </Text>
        </Box>
      </Box>
    </Section>
  );
}

const ADVANCED_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Version the schema from day one',
    body: 'Store a schema version alongside the data (a `schema_version` key, or the SQLite user_version pragma). On open, compare stored version to the code\'s current version and run migrations. A flat KV store keeps this in a sentinel key; SQLite has it built in. Doing this from v1 costs nothing; adding it later is a rewrite.',
  },
  {
    title: 'Migrations are forward-only + idempotent',
    body: 'Each migration is a function v(n) → v(n+1): add the column with a default, backfill, rename the key. Never mutate downward. Run them in a transaction so a mid-migration crash rolls back. Test them against a fixture of the OLD shape — exactly how this app\'s repo-impl spec tests the cache-fallback matrix.',
  },
  {
    title: 'AsyncStorage: version the JSON blob',
    body: 'KV stores have no schema, so YOU encode it: `{ version: 2, items: [...] }`. On read, switch on `version` and transform. If the parse/validate throws (corruption), surface it as a typed cache failure and fall back to an empty collection rather than crashing — this is what PostDao\'s try/catch + postDtoFromJson already do.',
  },
  {
    title: 'Encrypt sensitive data',
    body: 'AsyncStorage is NOT encrypted — it is plaintext on disk. For auth tokens, refresh tokens, PII, use expo-secure-store (iOS Keychain / Android Keystore, with `requireAuthentication` for high-value secrets) or wrap storage in an encryption layer (react-native-mmkv with encryption mode, SQLCipher for SQLite). Never store a secret in plain AsyncStorage.',
  },
  {
    title: 'Beware the serialization cost',
    body: 'AsyncStorage serializes the WHOLE value on every write and parses the whole thing on every read. For a growing collection that is O(n) per op. The DAO hides this, but if the cache grows, that is the signal to move the entity to SQLite/MMKV — and the swap is contained to one file because of the DAO seam.',
  },
];

/* ------------------------------------------------------------------ */
/* 9. Recap — ties back to this app                                    */
/* ------------------------------------------------------------------ */

function RecapCard() {
  return (
    <Section
      title="Recap — the persistence story in one breath"
      explanation="Everything above reduces to four invariants. They are why local persistence in this app looks the way it does."
    >
      <Box gap="xs">
        {RECAP_ROWS.map((r, i) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
            <Text variant="small" tone="primary" style={{ fontWeight: '700' }}>
              {i + 1}.
            </Text>
            <Box flex={1}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.title}
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

const RECAP_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Persistence is a seam, not a feature',
    body: 'The domain knows nothing of storage. A DAO owns one entity\'s read/write behind an abstract AppDatabase; the repository orchestrates it. Swap the engine, change one file.',
  },
  {
    title: 'The repository is offline-first',
    body: 'Remote is the source of truth; the cache is the fallback. A network failure with a cache hit is a SUCCESS with a warning, not an error — the user keeps working.',
  },
  {
    title: 'Exceptions stay inside data/',
    body: 'The DAO throws typed AppDatabaseExceptions; the repository\'s safeRepositoryCall converts them to Result<T>. The UI only ever switches on Result + Failure.severity.',
  },
  {
    title: 'Pick the engine by the data shape',
    body: 'AsyncStorage for simple/portable (this app). MMKV for fast KV. SQLite/WatermelonDB for queryable offline data. expo-secure-store for secrets. The DAO makes the choice reversible.',
  },
];
