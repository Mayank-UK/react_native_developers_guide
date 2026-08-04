import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { DatabaseHandlingView } from './database_handling_view';

// The dumb view is wrapped in ScreenScaffold, which needs expo-router nav +
// SafeAreaProvider contexts. For this smoke test we only care that the view's
// own composition renders, so mock the scaffold to pass children through.
jest.mock('../../components/screen-scaffold', () => {
  const { View } = require('react-native');
  return {
    ScreenScaffold: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});
import {
  useLiveCrudDemo,
  useNotesList,
  useOfflineFirstDemo,
  offlineStatusLabel,
  offlineStatusPill,
  NoteDao,
  noteFromJson,
  NOTES_KEY,
  OfflinePreset,
  OFFLINE_PRESETS,
} from './database_handling_hooks';
import { container } from '../../../core/container';
import { ApiScenario } from '../../../core/scenario/api-scenario';
import { DbScenario } from '../../../core/scenario/db-scenario';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tests for the database-handling view's LOGIC (the co-located hooks + DAO +
 * pure helpers) and a smoke render of the dumb view. The global jest.setup.ts
 * wires the container with fakes (Success) before each test, and AsyncStorage
 * is mocked in-memory.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(async () => {
  await AsyncStorage.removeItem(NOTES_KEY);
});

describe('noteFromJson', () => {
  it('parses a well-formed record', () => {
    expect(noteFromJson({ id: 1, title: 't', body: 'b' })).toEqual({
      id: 1,
      title: 't',
      body: 'b',
    });
  });

  it('throws when id is not a finite number', () => {
    expect(() => noteFromJson({ id: 'x', title: 't', body: 'b' })).toThrow(/id/);
    expect(() => noteFromJson({ id: NaN, title: 't', body: 'b' })).toThrow(/id/);
  });

  it('throws when title or body are not strings', () => {
    expect(() => noteFromJson({ id: 1, title: 2, body: 'b' })).toThrow(/strings/);
  });
});

describe('NoteDao (against the in-memory AsyncStorage mock)', () => {
  it('getAll returns [] when nothing is stored', async () => {
    const dao = new NoteDao(AsyncStorage, NOTES_KEY);
    expect(await dao.getAll()).toEqual([]);
  });

  it('upsert inserts, then replaces by id, sorted ascending', async () => {
    const dao = new NoteDao(AsyncStorage, NOTES_KEY);
    await dao.upsert({ id: 2, title: 'two', body: 'b2' });
    await dao.upsert({ id: 1, title: 'one', body: 'b1' });
    let all = await dao.getAll();
    expect(all.map((n) => n.id)).toEqual([1, 2]);
    // replace id=1
    await dao.upsert({ id: 1, title: 'ONE', body: 'b1' });
    all = await dao.getAll();
    expect(all).toHaveLength(2);
    expect(all.find((n) => n.id === 1)?.title).toBe('ONE');
  });

  it('remove deletes by id and clear empties the store', async () => {
    const dao = new NoteDao(AsyncStorage, NOTES_KEY);
    await dao.upsert({ id: 1, title: 'a', body: 'b' });
    await dao.upsert({ id: 2, title: 'c', body: 'd' });
    expect((await dao.remove(1)).map((n) => n.id)).toEqual([2]);
    await dao.clear();
    expect(await dao.getAll()).toEqual([]);
  });

  it('getAll throws on a non-array payload', async () => {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify({ not: 'array' }));
    const dao = new NoteDao(AsyncStorage, NOTES_KEY);
    await expect(dao.getAll()).rejects.toThrow(/not an array/);
  });
});

describe('useLiveCrudDemo', () => {
  it('starts empty with remountKey 0 and a stable dao instance', () => {
    const { result, rerender } = renderHook(() => useLiveCrudDemo(), { wrapper });
    expect(result.current.count).toBe(0);
    expect(result.current.remountKey).toBe(0);
    expect(result.current.hint).toBeNull();
    expect(result.current.title).toBe('');
    const dao = result.current.dao;
    rerender(undefined);
    expect(result.current.dao).toBe(dao); // stable across renders
  });

  it('addNote persists via the DAO, bumps remountKey and count', async () => {
    const { result } = renderHook(() => useLiveCrudDemo(), { wrapper });
    await act(async () => {
      result.current.setTitle('hello');
    });
    expect(result.current.title).toBe('hello');
    await act(async () => {
      await result.current.addNote();
    });
    expect(result.current.title).toBe(''); // cleared after add
    expect(result.current.count).toBe(1);
    expect(result.current.remountKey).toBe(1);
    expect(await result.current.dao.getAll()).toHaveLength(1);
  });

  it('addNote ignores an empty/whitespace title', async () => {
    const { result } = renderHook(() => useLiveCrudDemo(), { wrapper });
    await act(async () => {
      result.current.setTitle('   ');
      await result.current.addNote();
    });
    expect(result.current.count).toBe(0);
    expect(result.current.remountKey).toBe(0);
  });

  it('clearAll empties storage and bumps the remountKey', async () => {
    const { result } = renderHook(() => useLiveCrudDemo(), { wrapper });
    await act(async () => {
      result.current.setTitle('n');
    });
    await act(async () => {
      await result.current.addNote();
    });
    await act(async () => {
      await result.current.clearAll();
    });
    expect(result.current.count).toBe(0);
    expect(await result.current.dao.getAll()).toEqual([]);
  });

  it('remount sets a hint and bumps remountKey without touching storage', async () => {
    const { result } = renderHook(() => useLiveCrudDemo(), { wrapper });
    await act(async () => {
      result.current.setTitle('n');
    });
    await act(async () => {
      await result.current.addNote();
    });
    const before = result.current.remountKey;
    act(() => result.current.remount());
    expect(result.current.remountKey).toBe(before + 1);
    expect(result.current.hint).toMatch(/remounted/);
    expect(await result.current.dao.getAll()).toHaveLength(1);
  });
});

describe('useNotesList', () => {
  it('reads the stored notes on mount and reports the count', async () => {
    const dao = new NoteDao(AsyncStorage, NOTES_KEY);
    await dao.upsert({ id: 1, title: 'a', body: 'b' });
    await dao.upsert({ id: 2, title: 'c', body: 'd' });
    const onCountChange = jest.fn();
    const { result } = renderHook(() => useNotesList(dao, onCountChange), { wrapper });
    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });
    expect(result.current.notes).toHaveLength(2);
    expect(onCountChange).toHaveBeenLastCalledWith(2);
  });

  it('reports the error phase when storage is corrupt', async () => {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify({ not: 'array' }));
    const dao = new NoteDao(AsyncStorage, NOTES_KEY);
    const onCountChange = jest.fn();
    const { result } = renderHook(() => useNotesList(dao, onCountChange), { wrapper });
    await waitFor(() => {
      expect(result.current.phase).toBe('error');
    });
    expect(result.current.error).toMatch(/not an array/);
  });

  it('startEdit / saveEdit / cancelEdit drive the editing flow', async () => {
    const dao = new NoteDao(AsyncStorage, NOTES_KEY);
    await dao.upsert({ id: 1, title: 'orig', body: 'b' });
    const onCountChange = jest.fn();
    const { result } = renderHook(() => useNotesList(dao, onCountChange), { wrapper });
    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });
    await act(async () => {
      result.current.startEdit(result.current.notes[0]!);
    });
    await act(async () => {
      result.current.setDraft('edited');
    });
    await act(async () => {
      await result.current.saveEdit();
    });
    expect(result.current.editingId).toBeNull();
    expect((await dao.getAll()).find((n) => n.id === 1)?.title).toBe('edited');
  });

  it('cancelEdit resets editingId and draft without writing', async () => {
    const dao = new NoteDao(AsyncStorage, NOTES_KEY);
    await dao.upsert({ id: 1, title: 'orig', body: 'b' });
    const onCountChange = jest.fn();
    const { result } = renderHook(() => useNotesList(dao, onCountChange), { wrapper });
    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });
    await act(async () => {
      result.current.startEdit(result.current.notes[0]!);
    });
    await act(async () => {
      result.current.cancelEdit();
    });
    expect(result.current.editingId).toBeNull();
    expect(result.current.draft).toBe('');
    expect((await dao.getAll()).find((n) => n.id === 1)?.title).toBe('orig');
  });

  it('saveEdit keeps the original title when draft is blank', async () => {
    const dao = new NoteDao(AsyncStorage, NOTES_KEY);
    await dao.upsert({ id: 1, title: 'keep', body: 'b' });
    const onCountChange = jest.fn();
    const { result } = renderHook(() => useNotesList(dao, onCountChange), { wrapper });
    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });
    await act(async () => {
      result.current.startEdit(result.current.notes[0]!);
    });
    await act(async () => {
      result.current.setDraft('   ');
    });
    await act(async () => {
      await result.current.saveEdit();
    });
    expect((await dao.getAll()).find((n) => n.id === 1)?.title).toBe('keep');
  });

  it('removeNote deletes by id and clears an active edit on that id', async () => {
    const dao = new NoteDao(AsyncStorage, NOTES_KEY);
    await dao.upsert({ id: 1, title: 'a', body: 'b' });
    const onCountChange = jest.fn();
    const { result } = renderHook(() => useNotesList(dao, onCountChange), { wrapper });
    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });
    await act(async () => {
      result.current.startEdit(result.current.notes[0]!);
    });
    await act(async () => {
      await result.current.removeNote(1);
    });
    expect(result.current.editingId).toBeNull();
    expect(result.current.notes).toEqual([]);
    expect(await dao.getAll()).toEqual([]);
  });
});

describe('useOfflineFirstDemo', () => {
  it('starts on PrimeCache and resolves the live fetch to loaded', async () => {
    const { result } = renderHook(() => useOfflineFirstDemo(), { wrapper });
    expect(result.current.active).toBe(OfflinePreset.PrimeCache);
    await waitFor(() => {
      expect(result.current.state.status).toBe('loaded');
    });
  });

  it('run() drives the container knobs and moves to a blocking error on empty cache', async () => {
    const setApiSpy = jest.spyOn(container, 'setApiScenario');
    const setDbSpy = jest.spyOn(container, 'setDbScenario');
    const { result } = renderHook(() => useOfflineFirstDemo(), { wrapper });

    act(() => result.current.run(OfflinePreset.OfflineCacheMiss, ApiScenario.NetworkError, DbScenario.Empty));

    expect(result.current.active).toBe(OfflinePreset.OfflineCacheMiss);
    expect(setApiSpy).toHaveBeenCalledWith(ApiScenario.NetworkError);
    expect(setDbSpy).toHaveBeenCalledWith(DbScenario.Empty);
    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    setApiSpy.mockRestore();
    setDbSpy.mockRestore();
  });

  it('exposes four presets that each carry api/db/branch', () => {
    expect(OFFLINE_PRESETS).toHaveLength(4);
    for (const p of OFFLINE_PRESETS) {
      expect(typeof p.api).toBe('string');
      expect(typeof p.db).toBe('string');
      expect(p.branch.length).toBeGreaterThan(0);
    }
  });
});

describe('pure helpers (offlineStatusPill / offlineStatusLabel)', () => {
  it('pill is muted while idle/loading', () => {
    expect(offlineStatusPill({ status: 'idle' } as never)).toBe('muted');
    expect(offlineStatusPill({ status: 'loading' } as never)).toBe('muted');
  });

  it('pill is primary on loaded, danger on error', () => {
    const loaded = { status: 'loaded', posts: [], warning: null } as never;
    const errored = { status: 'error', failure: { kind: 'NetworkFailure' } } as never;
    expect(offlineStatusPill(loaded)).toBe('primary');
    expect(offlineStatusPill(errored)).toBe('danger');
  });

  it('label formats each status', () => {
    expect(offlineStatusLabel({ status: 'idle' } as never)).toBe('idle');
    expect(offlineStatusLabel({ status: 'loading' } as never)).toBe('loading');
    expect(
      offlineStatusLabel({ status: 'loaded', posts: [{ id: 1 }, { id: 2 }] } as never),
    ).toBe('loaded · 2 posts');
    expect(
      offlineStatusLabel({ status: 'error', failure: { kind: 'ServerFailure' } } as never),
    ).toBe('error · ServerFailure');
  });
});

describe('DatabaseHandlingView (smoke)', () => {
  it('renders without crashing', async () => {
    const { toJSON, unmount } = render(<DatabaseHandlingView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    // The view mounts a live usePosts fetch (offline-first demo); unmount to
    // avoid leaking the underlying async work into the jest worker.
    unmount();
  });
});
