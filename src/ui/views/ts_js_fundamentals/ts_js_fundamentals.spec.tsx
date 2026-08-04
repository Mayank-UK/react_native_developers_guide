import { act, render, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { TsJsFundamentalsView } from './ts_js_fundamentals_view';

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
  useVarLetConstDemo,
  useEqualityDemo,
  useTruthyFalsyDemo,
  useTemplateLiteralsDemo,
  useDestructuringDemo,
  useSpreadRestDemo,
  useOptionalChainingDemo,
  useArrayMethodsDemo,
  useControlFlowDemo,
  useFunctionsDemo,
  useClosuresDemo,
  useObjectsAndClassesDemo,
  useUnionIntersectionDemo,
  useGenericsDemo,
  useNarrowingDemo,
  useConstObjectDemo,
  useUnknownAnyDemo,
  safeStringify,
  parseValue,
  describe as describeValue,
  area,
  makeCounter,
  ApiStatus,
} from './ts_js_fundamentals_hooks';

/**
 * Tests for the TS/JS Fundamentals view's LOGIC (co-located hooks + pure
 * helpers) and a smoke render of the dumb view.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('pure helpers', () => {
  it('safeStringify handles bigint/symbol/function without throwing', () => {
    expect(safeStringify(1n)).toBe('1n');
    expect(safeStringify(Symbol('id'))).toMatch(/Symbol\(id\)/);
    expect(safeStringify(() => 0)).toBe('[Function]');
    expect(safeStringify(42)).toBe('42');
    expect(safeStringify({ a: 1 })).toBe('{"a":1}');
  });

  it('parseValue coerces literals and numbers', () => {
    expect(parseValue('null')).toBeNull();
    expect(parseValue('undefined')).toBeUndefined();
    expect(parseValue('true')).toBe(true);
    expect(parseValue('false')).toBe(false);
    expect(parseValue('42')).toBe(42);
    expect(parseValue('hello')).toBe('hello');
    expect(parseValue('  ')).toBe('');
  });

  it('describe formats null/undefined/empty distinctly', () => {
    expect(describeValue(null)).toBe('null');
    expect(describeValue(undefined)).toBe('undefined');
    expect(describeValue('')).toBe('"" (empty string)');
    expect(describeValue(5)).toBe('number: 5');
  });

  it('makeCounter captures private state', () => {
    const c = makeCounter(10);
    expect(c.peek()).toBe(10);
    expect(c.next()).toBe(11);
    expect(c.peek()).toBe(11);
    c.reset();
    expect(c.peek()).toBe(10);
  });

  it('area computes each shape variant', () => {
    expect(area({ kind: 'circle', radius: 1 })).toBeCloseTo(Math.PI);
    expect(area({ kind: 'square', side: 3 })).toBe(9);
    expect(area({ kind: 'rect', w: 4, h: 5 })).toBe(20);
  });
});

describe('useVarLetConstDemo', () => {
  it('bumps let, pushes/resets items, records the const error', () => {
    const { result } = renderHook(() => useVarLetConstDemo(), { wrapper });
    act(() => result.current.bumpLet());
    expect(result.current.letValue).toBe(1);
    expect(result.current.constValue).toBe(0);
    act(() => result.current.push());
    expect(result.current.items).toHaveLength(3);
    act(() => result.current.resetItems());
    expect(result.current.items).toHaveLength(2);
    act(() => result.current.tryReassignConst());
    expect(result.current.constObjectAttempt.current).toContain('const');
  });
});

describe('useEqualityDemo', () => {
  it('distinguishes == from === for 0 and false', () => {
    const { result } = renderHook(() => useEqualityDemo(), { wrapper });
    act(() => result.current.setARaw('0'));
    act(() => result.current.setBRaw('false'));
    expect(result.current.loose).toBe(true);
    expect(result.current.strict).toBe(false);
  });
});

describe('useTruthyFalsyDemo', () => {
  it('flags truthiness from raw input', () => {
    const { result } = renderHook(() => useTruthyFalsyDemo(), { wrapper });
    expect(result.current.truthy).toBe(true);
    act(() => result.current.setRaw('0'));
    expect(result.current.truthy).toBe(false);
  });
});

describe('useTemplateLiteralsDemo', () => {
  it('buys and sells', () => {
    const { result } = renderHook(() => useTemplateLiteralsDemo(), { wrapper });
    expect(result.current.count).toBe(3);
    act(() => result.current.buy());
    act(() => result.current.sell());
    expect(result.current.count).toBe(3);
  });
});

describe('useDestructuringDemo', () => {
  it('starts with Ada', () => {
    const { result } = renderHook(() => useDestructuringDemo(), { wrapper });
    expect(result.current.user.name).toBe('Ada');
  });
});

describe('useSpreadRestDemo', () => {
  it('merges and combines, right-wins', () => {
    const { result } = renderHook(() => useSpreadRestDemo(), { wrapper });
    expect(result.current.merged.theme).toBe('light');
    expect(result.current.combined).toEqual([1, 2, 3, 4, 5]);
    expect(result.current.sum(1, 2, 3, 4)).toBe(10);
  });
});

describe('useOptionalChainingDemo', () => {
  it('falls back when address is cleared', () => {
    const { result } = renderHook(() => useOptionalChainingDemo(), { wrapper });
    expect(result.current.city).toBe('Sydney');
    act(() => result.current.clearCity());
    expect(result.current.city).toBe('city missing');
    act(() => result.current.toggleAddress());
    expect(result.current.display).toBe('NO CITY');
  });
});

describe('useArrayMethodsDemo', () => {
  it('switches the method result', () => {
    const { result } = renderHook(() => useArrayMethodsDemo(), { wrapper });
    expect(result.current.result).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    act(() => result.current.setMethod('filter'));
    expect(result.current.result).toEqual([2, 4, 6, 8, 10]);
    act(() => result.current.setMethod('reduce'));
    expect(result.current.result).toBe(55);
  });
});

describe('useControlFlowDemo', () => {
  it('renders a result per mode', () => {
    const { result } = renderHook(() => useControlFlowDemo(), { wrapper });
    expect(result.current.value).toContain('big');
    act(() => result.current.setMode('switch'));
    expect(result.current.value).toContain('weekday');
  });
});

describe('useFunctionsDemo', () => {
  it('toggles between decl and arrow', () => {
    const { result } = renderHook(() => useFunctionsDemo(), { wrapper });
    expect(result.current.picked).toBe('decl');
    act(() => result.current.setPicked('arrow'));
    expect(result.current.picked).toBe('arrow');
  });
});

describe('useClosuresDemo', () => {
  it('increments the private counter', () => {
    const { result } = renderHook(() => useClosuresDemo(), { wrapper });
    expect(result.current.peek).toBe(10);
    act(() => result.current.next());
    expect(result.current.peek).toBe(11);
    act(() => result.current.reset());
    expect(result.current.peek).toBe(10);
  });
});

describe('useObjectsAndClassesDemo', () => {
  it('returns the owner either way (lexical this/closure)', () => {
    const { result } = renderHook(() => useObjectsAndClassesDemo(), { wrapper });
    expect(result.current.who).toBe('widget');
    act(() => result.current.setRegular());
    expect(result.current.who).toBe('widget');
  });
});

describe('useUnionIntersectionDemo', () => {
  it('sets a role', () => {
    const { result } = renderHook(() => useUnionIntersectionDemo(), { wrapper });
    expect(result.current.role).toBe('viewer');
    act(() => result.current.setRole('admin'));
    expect(result.current.role).toBe('admin');
  });
});

describe('useGenericsDemo', () => {
  it('bumps and resets the box value', () => {
    const { result } = renderHook(() => useGenericsDemo(), { wrapper });
    expect(result.current.box.value).toBe(7);
    act(() => result.current.bump());
    expect(result.current.box.value).toBe(17);
    act(() => result.current.reset());
    expect(result.current.box.value).toBe(0);
  });
});

describe('useNarrowingDemo', () => {
  it('switches shapes and computes area', () => {
    const { result } = renderHook(() => useNarrowingDemo(), { wrapper });
    expect(result.current.shape.kind).toBe('circle');
    act(() => result.current.setSquare());
    expect(result.current.a).toBe(16);
  });
});

describe('useConstObjectDemo', () => {
  it('cycles ApiStatus values', () => {
    const { result } = renderHook(() => useConstObjectDemo(), { wrapper });
    expect(result.current.status).toBe(ApiStatus.Idle);
    act(() => result.current.setStatus(ApiStatus.Loading));
    expect(result.current.status).toBe('loading');
  });
});

describe('useUnknownAnyDemo', () => {
  it('narrows string vs number', () => {
    const { result } = renderHook(() => useUnknownAnyDemo(), { wrapper });
    expect(result.current.handled).toBe('string: hello');
    act(() => result.current.setRaw('42'));
    expect(result.current.handled).toBe('number: 42');
  });
});

describe('TsJsFundamentalsView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<TsJsFundamentalsView />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
