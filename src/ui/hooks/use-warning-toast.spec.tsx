import { act, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../design-system/theme-provider';
import { useWarningToast } from './use-warning-toast';
import { NetworkFailure, UnknownFailure } from '../../core/error-handling/failures';

/**
 * useWarningToast — dedup logic tests. The toast store itself is exercised by
 * use-failure-toast; here we only assert the STABLE-KEY dedup behaviour added
 * in this hook (semantically-equal warnings don't re-toast).
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

it('toasts a warning exactly once on first sight', () => {
  const { result } = renderHook(
    ({ warning }) => useWarningToast(warning),
    {
      initialProps: { warning: new NetworkFailure('no internet') as unknown as undefined },
      wrapper,
    },
  );
  expect(result.current.entries).toHaveLength(1);
  expect(result.current.entries[0]?.failure.kind).toBe('network');
});

it('does not toast when there is no warning', () => {
  const { result } = renderHook(() => useWarningToast(undefined), { wrapper });
  expect(result.current.entries).toHaveLength(0);
});

it('toasts again when the warning changes to a different kind+message', () => {
  const { result, rerender } = renderHook(
    ({ warning }) => useWarningToast(warning),
    {
      initialProps: {
        warning: new NetworkFailure('no internet') as unknown as undefined,
      },
      wrapper,
    },
  );
  expect(result.current.entries).toHaveLength(1);

  // Different message → new toast.
  rerender({
    warning: new UnknownFailure('something else broke') as unknown as undefined,
  });
  expect(result.current.entries).toHaveLength(2);
  expect(result.current.entries[1]?.failure.kind).toBe('unknown');
});

it('does NOT re-toast when a fresh Failure has the same kind+message (the regression)', () => {
  // The historical ref-identity comparison re-fired the toast on every fetch
  // because the repository builds a brand-new Failure object each time. The
  // stable key (`${kind}:${message}`) collapses those duplicates.
  const { result, rerender } = renderHook(
    ({ warning }) => useWarningToast(warning),
    {
      initialProps: {
        warning: new NetworkFailure('no internet') as unknown as undefined,
      },
      wrapper,
    },
  );
  expect(result.current.entries).toHaveLength(1);

  act(() => {
    rerender({
      warning: new NetworkFailure('no internet') as unknown as undefined,
    });
  });
  expect(result.current.entries).toHaveLength(1);

  // And again — still one.
  act(() => {
    rerender({
      warning: new NetworkFailure('no internet') as unknown as undefined,
    });
  });
  expect(result.current.entries).toHaveLength(1);
});
