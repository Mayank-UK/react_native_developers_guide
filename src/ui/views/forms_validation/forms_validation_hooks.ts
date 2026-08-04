import { useCallback, useState } from 'react';
import { useForm, type Control, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Forms & validation view logic — owns the state/behaviour for the two LIVE
 * demos (manual controlled form + react-hook-form) so the view stays a dumb
 * structure. The pure helpers (`validateManualForm`, `signupSchema`) are the
 * artefacts the view cites via `<Code>` excerpts.
 *
 *  - Manual demo: useState + a pure `validateManualForm` helper (the foundation
 *    pattern every RN form is built on, since there is no DOM <form>).
 *  - Schema demo: a pure `z.object` schema + `z.infer` type — no React.
 *  - RHF demo: `useForm` wired to the schema via `zodResolver`, exposing
 *    `{ control }` for the `<Controller>` pattern (preferred in RN over the
 *    DOM-centric `register`).
 *
 * No `any`; strict + erasure-clean.
 */

/* -------------------------------------------------------------------------- */
/* 1. Manual form — pure validation helper + hook                             */
/* -------------------------------------------------------------------------- */

/**
 * Manual form values. `age` is kept as the raw string the TextInput emits; the
 * validator parses it. Mirrors the schema demo so the two can be contrasted.
 */
export interface ManualFormValues {
  name: string;
  email: string;
  age: string;
}

export type ManualFormErrors = Partial<Record<keyof ManualFormValues, string>>;

export const MANUAL_DEFAULTS: ManualFormValues = { name: '', email: '', age: '' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pure validation helper — no React, no side-effects. Given a values object,
 * returns a field-keyed map of error strings (empty object = valid). This is
 * the function the "Manual validation" `<Code>` block cites verbatim.
 */
export function validateManualForm(values: ManualFormValues): ManualFormErrors {
  const errors: ManualFormErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = 'Name is required';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters';

  const email = values.email.trim();
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';

  const ageRaw = values.age.trim();
  if (!ageRaw) errors.age = 'Age is required';
  else if (!/^\d+$/.test(ageRaw)) errors.age = 'Age must be a whole number';
  else {
    const n = Number(ageRaw);
    if (n < 13) errors.age = 'Must be at least 13';
    else if (n > 130) errors.age = 'Age looks too high';
  }

  return errors;
}

export interface ManualFormDemo {
  values: ManualFormValues;
  errors: ManualFormErrors;
  isValid: boolean;
  /** True once submit has been attempted — gates whether errors render. */
  submitted: boolean;
  setField: (key: keyof ManualFormValues, value: string) => void;
  /** Returns the error string for a field when it should be shown, else undefined. */
  fieldError: (key: keyof ManualFormValues) => string | undefined;
  submit: () => boolean;
  reset: () => void;
}

/**
 * Manual controlled-form demo. All React state lives here; the view is a dumb
 * structure that calls `setField`/`submit`/`reset` and reads `fieldError`.
 */
export function useManualFormDemo(): ManualFormDemo {
  const [values, setValues] = useState<ManualFormValues>(MANUAL_DEFAULTS);
  const [touched, setTouched] = useState<Record<keyof ManualFormValues, boolean>>({
    name: false,
    email: false,
    age: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const errors = validateManualForm(values);
  const isValid = Object.keys(errors).length === 0;

  const setField = useCallback((key: keyof ManualFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  // An error shows once the field has been edited OR the user pressed submit.
  const fieldError = useCallback(
    (key: keyof ManualFormValues): string | undefined => {
      if (!touched[key] && !submitted) return undefined;
      return errors[key];
    },
    [errors, touched, submitted],
  );

  const submit = useCallback((): boolean => {
    setSubmitted(true);
    return isValid;
  }, [isValid]);

  const reset = useCallback(() => {
    setValues(MANUAL_DEFAULTS);
    setTouched({ name: false, email: false, age: false });
    setSubmitted(false);
  }, []);

  return { values, errors, isValid, submitted, setField, fieldError, submit, reset };
}

/* -------------------------------------------------------------------------- */
/* 2. Schema validation — pure zod (no React)                                 */
/* -------------------------------------------------------------------------- */

/**
 * The signup schema — a pure zod object. This is the artefact the "Schema
 * validation with zod" `<Code>` block cites. `age` is validated as the string
 * the TextInput emits (regex + range), so the inferred `SignupValues` matches
 * what react-hook-form stores — no number/string impedance mismatch.
 *
 * Note: `z.string().email()` is deprecated in zod v4 in favour of `z.email()`
 * but remains functional; this is the shape the teaching excerpt uses.
 */
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  age: z
    .string()
    .regex(/^\d+$/, 'Age must be a whole number')
    .refine((v) => {
      const n = Number(v);
      return n >= 13 && n <= 130;
    }, 'Must be between 13 and 130'),
});

export type SignupValues = z.infer<typeof signupSchema>;

export const SIGNUP_DEFAULTS: SignupValues = { name: '', email: '', age: '' };

/* -------------------------------------------------------------------------- */
/* 3. react-hook-form + zodResolver demo                                      */
/* -------------------------------------------------------------------------- */

export interface RhfFormDemo {
  control: Control<SignupValues>;
  errors: FieldErrors<SignupValues>;
  isSubmitting: boolean;
  /** True once submit has been attempted. */
  submitted: boolean;
  /** Call from the view's submit button — runs schema validation first. */
  submit: () => Promise<void>;
  reset: () => void;
}

/**
 * react-hook-form demo wired to `signupSchema` via `zodResolver`. Exposes
 * `{ control }` for the `<Controller>` pattern (RN-preferred over `register`,
 * which is DOM-centric). The view stays dumb: it renders Controllers and calls
 * `submit()` / `reset()`.
 */
export function useRhfFormDemo(): RhfFormDemo {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset: rhfReset,
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: SIGNUP_DEFAULTS,
    mode: 'onBlur',
  });
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = useCallback(async () => {
    // A real submit would call a usecase through the container; this is a
    // teaching hook, so we just record that a valid submission landed.
    setSubmitted(true);
  }, []);

  const submit = handleSubmit(onSubmit);

  const reset = useCallback(() => {
    rhfReset(SIGNUP_DEFAULTS);
    setSubmitted(false);
  }, [rhfReset]);

  return { control, errors, isSubmitting, submitted, submit, reset };
}
