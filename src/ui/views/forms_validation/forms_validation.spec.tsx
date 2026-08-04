import { act, render, renderHook, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../design-system/theme-provider';
import { FormsValidationView } from './forms_validation_view';

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
  useManualFormDemo,
  useRhfFormDemo,
  validateManualForm,
  signupSchema,
  MANUAL_DEFAULTS,
} from './forms_validation_hooks';

/**
 * Tests for the forms-validation view's LOGIC (the co-located hooks + pure
 * helpers) and a smoke render of the dumb view. react-hook-form works in jest
 * without mocks.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

/* -------------------------------------------------------------------------- */
/* pure helper — validateManualForm                                           */
/* -------------------------------------------------------------------------- */

describe('validateManualForm', () => {
  it('returns no errors for a fully valid values object', () => {
    expect(
      validateManualForm({ name: 'Ada', email: 'ada@x.io', age: '30' }),
    ).toEqual({});
  });

  it('flags required fields when empty', () => {
    const errors = validateManualForm(MANUAL_DEFAULTS);
    expect(errors.name).toBe('Name is required');
    expect(errors.email).toBe('Email is required');
    expect(errors.age).toBe('Age is required');
  });

  it('rejects malformed emails with the friendly message', () => {
    expect(validateManualForm({ name: 'Bo', email: 'nope', age: '20' }).email).toBe(
      'Enter a valid email address',
    );
    expect(validateManualForm({ name: 'Bo', email: 'a@b', age: '20' }).email).toBe(
      'Enter a valid email address',
    );
  });

  it('enforces the name length boundary (2 chars passes, 1 fails)', () => {
    expect(validateManualForm({ name: 'Al', email: 'a@b.io', age: '20' })).toEqual({});
    expect(
      validateManualForm({ name: 'A', email: 'a@b.io', age: '20' }).name,
    ).toBe('Name must be at least 2 characters');
  });

  it('enforces the numeric + range boundaries on age', () => {
    expect(
      validateManualForm({ name: 'Cy', email: 'cy@x.io', age: 'abc' }).age,
    ).toBe('Age must be a whole number');
    expect(
      validateManualForm({ name: 'Cy', email: 'cy@x.io', age: '8' }).age,
    ).toBe('Must be at least 13');
    expect(
      validateManualForm({ name: 'Cy', email: 'cy@x.io', age: '200' }).age,
    ).toBe('Age looks too high');
    expect(
      validateManualForm({ name: 'Cy', email: 'cy@x.io', age: '13' }),
    ).toEqual({});
  });

  it('trims whitespace before validating', () => {
    expect(
      validateManualForm({ name: '  Ada  ', email: '  ada@x.io  ', age: '  30  ' }),
    ).toEqual({});
  });
});

/* -------------------------------------------------------------------------- */
/* pure helper — signupSchema.safeParse                                       */
/* -------------------------------------------------------------------------- */

describe('signupSchema.safeParse', () => {
  it('accepts valid input', () => {
    const r = signupSchema.safeParse({ name: 'Ada', email: 'ada@x.io', age: '30' });
    expect(r.success).toBe(true);
  });

  it('rejects a malformed email', () => {
    const r = signupSchema.safeParse({ name: 'Bo', email: 'nope', age: '20' });
    expect(r.success).toBe(false);
  });

  it('rejects a name shorter than 2 chars (boundary)', () => {
    const r1 = signupSchema.safeParse({ name: 'A', email: 'a@x.io', age: '40' });
    expect(r1.success).toBe(false);
    const r2 = signupSchema.safeParse({ name: 'Al', email: 'a@x.io', age: '40' });
    expect(r2.success).toBe(true);
  });

  it('rejects age below 13 and above 130 (boundaries)', () => {
    expect(
      signupSchema.safeParse({ name: 'Cy', email: 'cy@x.io', age: '12' }).success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({ name: 'Cy', email: 'cy@x.io', age: '13' }).success,
    ).toBe(true);
    expect(
      signupSchema.safeParse({ name: 'Cy', email: 'cy@x.io', age: '130' }).success,
    ).toBe(true);
    expect(
      signupSchema.safeParse({ name: 'Cy', email: 'cy@x.io', age: '131' }).success,
    ).toBe(false);
  });

  it('rejects a non-numeric age string', () => {
    const r = signupSchema.safeParse({ name: 'Di', email: 'di@x.io', age: 'abc' });
    expect(r.success).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* useManualFormDemo                                                          */
/* -------------------------------------------------------------------------- */

describe('useManualFormDemo', () => {
  it('starts empty, invalid, and hides errors (nothing touched/submitted)', () => {
    const { result } = renderHook(() => useManualFormDemo(), { wrapper });
    expect(result.current.values).toEqual(MANUAL_DEFAULTS);
    expect(result.current.isValid).toBe(false);
    expect(result.current.submitted).toBe(false);
    // Nothing touched yet → errors do not render.
    expect(result.current.fieldError('name')).toBeUndefined();
    expect(result.current.fieldError('email')).toBeUndefined();
    expect(result.current.fieldError('age')).toBeUndefined();
  });

  it('setField updates values and reveals that field error live', () => {
    const { result } = renderHook(() => useManualFormDemo(), { wrapper });
    act(() => result.current.setField('email', 'nope'));
    expect(result.current.values.email).toBe('nope');
    // Touched → error shows even before submit.
    expect(result.current.fieldError('email')).toBe('Enter a valid email address');
    // Untouched fields still hide their errors.
    expect(result.current.fieldError('name')).toBeUndefined();
  });

  it('submit() flips submitted=true and returns the validity at call time', () => {
    const { result } = renderHook(() => useManualFormDemo(), { wrapper });
    act(() => {
      const ok = result.current.submit();
      expect(ok).toBe(false); // empty → invalid
    });
    expect(result.current.submitted).toBe(true);
    // After submit, every error shows.
    expect(result.current.fieldError('name')).toBe('Name is required');
  });

  it('filling valid values then submit returns true and exposes no errors', () => {
    const { result } = renderHook(() => useManualFormDemo(), { wrapper });
    act(() => {
      result.current.setField('name', 'Ada');
      result.current.setField('email', 'ada@x.io');
      result.current.setField('age', '30');
    });
    expect(result.current.isValid).toBe(true);
    let ok = false;
    act(() => {
      ok = result.current.submit();
    });
    expect(ok).toBe(true);
    expect(result.current.fieldError('email')).toBeUndefined();
  });

  it('reset() restores defaults and clears the submitted flag', () => {
    const { result } = renderHook(() => useManualFormDemo(), { wrapper });
    act(() => {
      result.current.setField('name', 'Ada');
      result.current.submit();
    });
    act(() => result.current.reset());
    expect(result.current.values).toEqual(MANUAL_DEFAULTS);
    expect(result.current.submitted).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* useRhfFormDemo                                                             */
/* -------------------------------------------------------------------------- */

describe('useRhfFormDemo', () => {
  it('exposes control + errors + a submit handler', () => {
    const { result } = renderHook(() => useRhfFormDemo(), { wrapper });
    expect(result.current.control).toBeDefined();
    expect(typeof result.current.submit).toBe('function');
    expect(result.current.submitted).toBe(false);
  });

  it('rejects an invalid submit (schema blocks it; submitted stays false)', async () => {
    const { result } = renderHook(() => useRhfFormDemo(), { wrapper });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.submitted).toBe(false);
    // Schema-driven errors land in formState.errors.
    expect(result.current.errors.email?.message).toBeTruthy();
  });

  it('reset() clears errors + the submitted flag', async () => {
    const { result } = renderHook(() => useRhfFormDemo(), { wrapper });
    await act(async () => {
      await result.current.submit();
    });
    act(() => result.current.reset());
    expect(result.current.submitted).toBe(false);
    expect(result.current.errors.email).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/* View smoke render + live demo interaction                                 */
/* -------------------------------------------------------------------------- */

describe('FormsValidationView (smoke)', () => {
  it('renders without crashing', () => {
    const { toJSON, unmount } = render(<FormsValidationView />, { wrapper });
    expect(toJSON()).toBeTruthy();
    unmount();
  });

  it('manual demo: typing then pressing submit reveals the success banner', async () => {
    const { getByTestId, getByText, queryByText, unmount } = render(
      <FormsValidationView />,
      { wrapper },
    );

    // Type valid values into the manual demo's fields.
    fireEvent.changeText(getByTestId('manual-name'), 'Ada');
    fireEvent.changeText(getByTestId('manual-email'), 'ada@x.io');
    fireEvent.changeText(getByTestId('manual-age'), '30');

    // Before submit, no success banner.
    expect(queryByText(/Submitted:/)).toBeNull();

    fireEvent.press(getByTestId('manual-submit'));

    await waitFor(() => {
      expect(getByText(/Submitted: Ada/)).toBeTruthy();
    });
    unmount();
  });
});
