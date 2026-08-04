import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFailureToast } from '../../hooks/use-failure-toast';
import { usePosts } from '../../hooks/use-posts';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';

/**
 * Database-handling view logic — owns the two LIVE demos' state + behaviour so
 * the view stays a dumb structure. Grounded in the app's real persistence layer
 * (data/local AppDatabase + PostDao, data/repositories PostRepositoryImpl).
 *
 * Three hooks:
 *  - useNotesList: the keyed child's read/edit/delete state against the demo
 *    NoteDao (re-reads from storage on mount).
 *  - useLiveCrudDemo: the parent CRUD playground's dao instance + remount key +
 *    add/clear/remount handlers (drives the keyed child).
 *  - useOfflineFirstDemo: the offline-first repository demo — drives the real
 *    container + usePosts through the four (ApiScenario, DbScenario) presets and
 *    surfaces the non-blocking warning exactly once per value.
 *
 * Pure helpers: offlineStatusLabel / offlineStatusPill derive the pill state
 * from the live usePosts state.
 *
 * Plus the self-contained NoteDao (mirrors PostDao: defensive parse, typed
 * failures) and the OFFLINE_PRESETS table.
 */

/* -------------------------------------------------------------------------- */
/* Demo DAO — mirrors the app's real PostDao (AsyncStorage + JSON + validate) */
/* -------------------------------------------------------------------------- */

export interface NoteDTO {
  id: number;
  title: string;
  body: string;
}

export const NOTES_KEY = 'rndg.demo.notes';

export function noteFromJson(json: Record<string, unknown>): NoteDTO {
  const { id, title, body } = json;
  if (typeof id !== 'number' || !Number.isFinite(id)) {
    throw new Error(`Invalid note: id must be a number, got ${id}`);
  }
  if (typeof title !== 'string' || typeof body !== 'string') {
    throw new Error(`Invalid note ${id}: title and body must be strings`);
  }
  return { id, title, body };
}

/**
 * A self-contained DAO for the demo — mirrors PostDao's shape (constructor
 * takes a storage backend + key; getAll/upsert/remove/clear; defensive parse)
 * but adds per-row CRUD so add/edit/delete is observable. It uses the REAL
 * AsyncStorage, so data genuinely survives a remount (not just component state).
 */
export class NoteDao {
  private readonly storage: typeof AsyncStorage;
  private readonly key: string;

  constructor(storage: typeof AsyncStorage, key: string) {
    this.storage = storage;
    this.key = key;
  }

  async getAll(): Promise<NoteDTO[]> {
    const raw = await this.storage.getItem(this.key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Cached notes payload was not an array');
    return parsed.map((item) => noteFromJson(item as Record<string, unknown>));
  }

  /** Insert-or-replace by id (the "upsert" a per-row DAO exposes). */
  async upsert(note: NoteDTO): Promise<NoteDTO[]> {
    const all = await this.getAll();
    const without = all.filter((n) => n.id !== note.id);
    const next = [...without, note].sort((a, b) => a.id - b.id);
    await this.storage.setItem(this.key, JSON.stringify(next));
    return next;
  }

  async remove(id: number): Promise<NoteDTO[]> {
    const all = await this.getAll();
    const next = all.filter((n) => n.id !== id);
    await this.storage.setItem(this.key, JSON.stringify(next));
    return next;
  }

  async clear(): Promise<void> {
    await this.storage.removeItem(this.key);
  }
}

/* -------------------------------------------------------------------------- */
/* useNotesList — the keyed child's read/edit/delete state                    */
/* -------------------------------------------------------------------------- */

export type NotesPhase = 'loading' | 'ready' | 'error';

export interface NotesListState {
  notes: NoteDTO[];
  phase: NotesPhase;
  error: string | null;
  editingId: number | null;
  draft: string;
  setDraft: (s: string) => void;
  startEdit: (note: NoteDTO) => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  removeNote: (id: number) => Promise<void>;
}

export function useNotesList(dao: NoteDao, onCountChange: (n: number) => void): NotesListState {
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [phase, setPhase] = useState<NotesPhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  const reload = useCallback(async () => {
    setPhase('loading');
    try {
      const all = await dao.getAll();
      setNotes(all);
      onCountChange(all.length);
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [dao, onCountChange]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startEdit = (note: NoteDTO) => {
    setEditingId(note.id);
    setDraft(note.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    const target = notes.find((n) => n.id === editingId);
    if (target) {
      const next = await dao.upsert({ ...target, title: draft.trim() || target.title });
      setNotes(next);
      onCountChange(next.length);
    }
    setEditingId(null);
    setDraft('');
  };

  const removeNote = async (id: number) => {
    const next = await dao.remove(id);
    setNotes(next);
    onCountChange(next.length);
    if (editingId === id) {
      setEditingId(null);
      setDraft('');
    }
  };

  return { notes, phase, error, editingId, draft, setDraft, startEdit, cancelEdit, saveEdit, removeNote };
}

/* -------------------------------------------------------------------------- */
/* useLiveCrudDemo — the CRUD playground parent                               */
/* -------------------------------------------------------------------------- */

export interface LiveCrudDemo {
  dao: NoteDao;
  remountKey: number;
  count: number;
  setCount: (n: number) => void;
  title: string;
  setTitle: (s: string) => void;
  hint: string | null;
  addNote: () => Promise<void>;
  clearAll: () => Promise<void>;
  remount: () => void;
}

export function useLiveCrudDemo(): LiveCrudDemo {
  // ONE dao instance for the demo's lifetime.
  const [dao] = useState(() => new NoteDao(AsyncStorage, NOTES_KEY));
  const [remountKey, setRemountKey] = useState(0);
  const [count, setCount] = useState(0);
  const [title, setTitle] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  const addNote = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const note: NoteDTO = {
      id: Date.now(),
      title: trimmed,
      body: `written via NoteDao.upsert at ${new Date().toLocaleTimeString()}`,
    };
    await dao.upsert(note);
    setTitle('');
    setCount((await dao.getAll()).length);
    setRemountKey((k) => k + 1); // remount so the list reflects storage
  };

  const clearAll = async () => {
    await dao.clear();
    setCount(0);
    setRemountKey((k) => k + 1);
  };

  const remount = () => {
    setHint('component was unmounted + remounted — list re-read from storage');
    setRemountKey((k) => k + 1);
  };

  return { dao, remountKey, count, setCount, title, setTitle, hint, addNote, clearAll, remount };
}

/* -------------------------------------------------------------------------- */
/* useOfflineFirstDemo — the offline-first repository demo                   */
/* -------------------------------------------------------------------------- */

/**
 * Preset combos of (ApiScenario, DbScenario) that walk through the repository's
 * offline-first branches. Each sets both knobs, refetches via usePosts, and the
 * resulting state demonstrates one branch of PostRepositoryImpl.serveFromCache.
 */
export const OfflinePreset = {
  PrimeCache: 'primeCache',
  OfflineCacheHit: 'offlineCacheHit',
  OfflineCacheMiss: 'offlineCacheMiss',
  CacheReadFails: 'cacheReadFails',
} as const;
export type OfflinePreset = (typeof OfflinePreset)[keyof typeof OfflinePreset];

export const OFFLINE_PRESETS: ReadonlyArray<{
  preset: OfflinePreset;
  label: string;
  api: ApiScenario;
  db: DbScenario;
  branch: string;
}> = [
  {
    preset: OfflinePreset.PrimeCache,
    label: '1 · online (prime cache)',
    api: ApiScenario.Success,
    db: DbScenario.Success,
    branch: 'remote ok → cache posts locally',
  },
  {
    preset: OfflinePreset.OfflineCacheHit,
    label: '2 · offline → serve cache',
    api: ApiScenario.NetworkError,
    db: DbScenario.Success,
    branch: 'remote fails, cache hit → Success(posts, warning)',
  },
  {
    preset: OfflinePreset.OfflineCacheMiss,
    label: '3 · offline + empty cache',
    api: ApiScenario.NetworkError,
    db: DbScenario.Empty,
    branch: 'remote fails, cache empty → blocking NetworkFailure',
  },
  {
    preset: OfflinePreset.CacheReadFails,
    label: '4 · offline + cache read fails',
    api: ApiScenario.NetworkError,
    db: DbScenario.ReadError,
    branch: 'remote fails, cache read throws → chained CacheFailure',
  },
];

export interface OfflineFirstDemo {
  state: ReturnType<typeof usePosts>['state'];
  fetch: () => void;
  toast: ReturnType<typeof useFailureToast>;
  active: OfflinePreset;
  run: (preset: OfflinePreset, api: ApiScenario, db: DbScenario) => void;
}

export function useOfflineFirstDemo(): OfflineFirstDemo {
  const { state, fetch } = usePosts();
  const toast = useFailureToast();
  const [active, setActive] = useState<OfflinePreset>(OfflinePreset.PrimeCache);
  const lastWarningRef = useRef<unknown>(null);

  // Surface a non-blocking warning exactly once per warning value.
  useEffect(() => {
    if (state.status === 'loaded' && state.warning && state.warning !== lastWarningRef.current) {
      toast.show(state.warning);
      lastWarningRef.current = state.warning;
    }
  }, [state, toast]);

  const run = useCallback(
    (preset: OfflinePreset, api: ApiScenario, db: DbScenario) => {
      container.setApiScenario(api);
      container.setDbScenario(db);
      setActive(preset);
      fetch();
    },
    [fetch],
  );

  return { state, fetch, toast, active, run };
}

/* -------------------------------------------------------------------------- */
/* Pure helpers — derive the offline demo's pill from the live state          */
/* -------------------------------------------------------------------------- */

export type PostsState = ReturnType<typeof usePosts>['state'];

export function offlineStatusPill(state: PostsState): 'primary' | 'danger' | 'muted' {
  if (state.status === 'loaded') return 'primary';
  if (state.status === 'error') return 'danger';
  return 'muted';
}

export function offlineStatusLabel(state: PostsState): string {
  switch (state.status) {
    case 'idle':
      return 'idle';
    case 'loading':
      return 'loading';
    case 'loaded':
      return `loaded · ${state.posts.length} posts`;
    case 'error':
      return `error · ${state.failure.kind}`;
  }
}
