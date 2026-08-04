import { useState, type ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import { TextInput } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Text, useTheme } from '../../design-system';
import { Section, Code, Pill } from '../../components';
import {
  useManualFormDemo,
  useRhfFormDemo,
  signupSchema,
} from './forms_validation_hooks';

/**
 * FormsValidationView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (`forms_validation_hooks.ts`); this file only renders.
 *
 * Teaches forms in React Native: there is no DOM <form>/onSubmit/register, so
 * controlled components are the baseline. Two LIVE demos (manual controlled
 * form + react-hook-form + zod) prove the patterns. Each `<Code>` cites a REAL
 * artefact (`validateManualForm`, `signupSchema`, `useRhfFormDemo`).
 *
 * Single-file helpers stay local per convention. No `any`; strict + erasure-clean.
 */
export function FormsValidationView() {
  return (
    <ScreenScaffold
      title="Forms & Validation"
      subtitle="Controlled inputs, schema validation, react-hook-form."
    >
      <WhyDifferentCard />
      <ControlledFoundationCard />
      <ManualDemoCard />
      <SchemaCard />
      <RhfDemoCard />
      <AccessibilityCard />
      <DecisionMatrixCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* Local helpers — a labelled TextInput used by both live demos.       */
/* ------------------------------------------------------------------ */

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  accessibilityLabel: string;
  testID: string;
}

function Field({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  placeholder,
  keyboardType = 'default',
  accessibilityLabel,
  testID,
}: FieldProps) {
  const { theme } = useTheme();
  const hasError = Boolean(error);
  // Real RN a11y: announce the error via an alert role, and fold it into the
  // field's label so screen readers hear it on focus. (There is no built-in
  // accessibilityErrorMessage prop on RN — see the Accessibility section.)
  const labelled = hasError ? accessibilityLabel + ', error: ' + error : accessibilityLabel;
  return (
    <Box gap="xxs">
      <Text variant="caption" style={{ fontWeight: '600' }}>
        {label}
      </Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        autoCorrect={false}
        accessibilityLabel={labelled}
        style={{
          borderWidth: 1,
          borderColor: hasError ? theme.colors.danger : theme.colors.border,
          borderRadius: theme.radii.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          color: theme.colors.text,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
        }}
      />
      {hasError ? (
        <Text variant="caption" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Why forms are different in RN                                    */
/* ------------------------------------------------------------------ */

function WhyDifferentCard() {
  return (
    <Section
      title="Why forms are different in React Native"
      explanation="No DOM <form>, no onSubmit event bubbling, no HTML validation attributes. RN owns its own input story."
    >
      <Text variant="body">
        On the web, a <Text style={{ fontFamily: 'monospace' }}>{'<form onSubmit>'}</Text>{' '}
        collects named inputs and the browser serialises them on submit. React
        Native has none of that — there is no DOM, no form element, and{' '}
        <Text style={{ fontFamily: 'monospace' }}>register</Text>-style ref
        registration (the default react-hook-form API) is built for{' '}
        <Text style={{ fontFamily: 'monospace' }}>input ref</Text> on the DOM.
        In RN, you drive inputs explicitly: each{' '}
        <Text style={{ fontFamily: 'monospace' }}>TextInput</Text> is a
        controlled component whose <Text style={{ fontFamily: 'monospace' }}>value</Text>{' '}
        mirrors state and whose{' '}
        <Text style={{ fontFamily: 'monospace' }}>onChangeText</Text> writes back
        to it. Validation is whatever function you choose (hand-rolled or a
        schema lib), and "submit" is just a button onPress.
      </Text>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          <Text style={{ fontWeight: '600' }}>The mental model.</Text> State is
          the source of truth; the input is a view of it. Validation is a pure
          function of that state. The submit handler reads state, runs the
          validator, and either proceeds or surfaces errors. Everything below is
          a variation on that loop — manual first, then declarative via a schema
          library.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Controlled inputs (the foundation)                               */
/* ------------------------------------------------------------------ */

function ControlledFoundationCard() {
  const { theme } = useTheme();
  return (
    <Section
      title="Controlled inputs — the foundation"
      explanation="A controlled TextInput holds no state of its own; it reads from yours and writes back on every keystroke. This is the baseline every RN form is built on."
    >
      <Code>{`import { useState } from 'react';
import { TextInput } from 'react-native';

// Controlled input: value comes from state, onChangeText writes back.
function ControlledInput() {
  const [email, setEmail] = useState('');
  return (
    <TextInput
      value={email}
      onChangeText={setEmail}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel="Email"
    />
  );
}`}</Code>
      <Text variant="caption" tone="muted">
        The same shape this screen's manual demo uses — see the hook source
        below. <Text style={{ fontWeight: '600' }}>onChangeText</Text> fires on
        every keystroke, so the state object always mirrors the field. Derived
        values (like an error map) recompute from that state on each render.
      </Text>
      <Code language="useManualFormDemo (excerpt)" caption="src/ui/views/forms_validation/forms_validation_hooks.ts">{`export function useManualFormDemo() {
  const [values, setValues] = useState(MANUAL_DEFAULTS);
  const [submitted, setSubmitted] = useState(false);

  const errors = validateManualForm(values);   // pure helper, derived each render
  const isValid = Object.keys(errors).length === 0;

  const setField = (key, value) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const submit = () => { setSubmitted(true); return isValid; };

  return { values, errors, isValid, submitted, setField, submit };
}`}</Code>
      <Box p="sm" radius="sm" bg="surfaceVariant">
        <Text variant="small" style={{ fontWeight: '600' }}>
          Why derive errors on each render?
        </Text>
        <Text variant="caption" tone="muted" mt="xxs">
          Validation is a pure function of state. Computing{' '}
          <Text style={{ fontFamily: 'monospace' }}>errors</Text> from{' '}
          <Text style={{ fontFamily: 'monospace' }}>values</Text> directly inside
          the body (no useEffect) means it can never drift from the truth. For a
          handful of fields this is essentially free; the schema lib further down
          uses the same idea.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Manual validation — LIVE                                         */
/* ------------------------------------------------------------------ */

function ManualDemoCard() {
  const demo = useManualFormDemo();
  const { theme } = useTheme();
  return (
    <Section
      title="LIVE — manual validation"
      explanation="A small controlled form (name + email + age) validated by a pure helper. Type, then press Submit — errors clear as you fix them, and a valid submit flips to the success state."
    >
      <Box gap="sm">
        <Field
          testID="manual-name"
          label="Name"
          placeholder="Ada Lovelace"
          value={demo.values.name}
          onChangeText={(v) => demo.setField('name', v)}
          error={demo.fieldError('name')}
          accessibilityLabel="Name"
        />
        <Field
          testID="manual-email"
          label="Email"
          placeholder="ada@example.com"
          keyboardType="email-address"
          value={demo.values.email}
          onChangeText={(v) => demo.setField('email', v)}
          error={demo.fieldError('email')}
          accessibilityLabel="Email"
        />
        <Field
          testID="manual-age"
          label="Age"
          placeholder="30"
          keyboardType="numeric"
          value={demo.values.age}
          onChangeText={(v) => demo.setField('age', v)}
          error={demo.fieldError('age')}
          accessibilityLabel="Age"
        />

        <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            testID="manual-submit"
            title={demo.submitted && demo.isValid ? 'Submitted ✓' : 'Submit'}
            onPress={demo.submit}
            disabled={demo.submitted && demo.isValid}
          />
          <Button title="Reset" variant="outline" onPress={demo.reset} />
          {demo.submitted && demo.isValid ? (
            <Pill tone="success">valid</Pill>
          ) : (
            <Pill>{demo.isValid ? 'valid' : 'incomplete'}</Pill>
          )}
        </Box>

        {demo.submitted && demo.isValid ? (
          <Box p="sm" radius="md" bg="primary">
            <Text variant="small" tone="onPrimary">
              Submitted: {demo.values.name} / {demo.values.email} / age {demo.values.age}
            </Text>
          </Box>
        ) : null}
      </Box>

      <Code language="validateManualForm" caption="the pure helper the form above runs">{`export function validateManualForm(values) {
  const errors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Name is required';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters';

  const email = values.email.trim();
  if (!email) errors.email = 'Email is required';
  else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))
    errors.email = 'Enter a valid email address';

  const ageRaw = values.age.trim();
  if (!ageRaw) errors.age = 'Age is required';
  else if (!/^\\d+$/.test(ageRaw)) errors.age = 'Age must be a whole number';
  else {
    const n = Number(ageRaw);
    if (n < 13) errors.age = 'Must be at least 13';
    else if (n > 130) errors.age = 'Age looks too high';
  }
  return errors;   // {} means valid
}`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Schema validation with zod                                       */
/* ------------------------------------------------------------------ */

function SchemaCard() {
  const examples = useSchemaExamples();
  return (
    <Section
      title="Schema validation with zod"
      explanation="Hand-rolled rules scale poorly. A schema library declares the shape once; the same schema drives client validation, a resolver for react-hook-form, and (ideally) your server boundary."
    >
      <Text variant="body">
        <Text style={{ fontWeight: '600' }}>Zod</Text> is the 2026 TS standard:
        you author a schema as a plain value, then derive both the validator and
        the TS type from it. One source of truth — the type can never drift from
        the runtime check. The snippet below is the REAL schema this screen's
        react-hook-form demo uses.
      </Text>
      <Code language="signupSchema" caption="src/ui/views/forms_validation/forms_validation_hooks.ts">{`import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  age: z.string()
    .regex(/^\\d+$/, 'Age must be a whole number')
    .refine((v) => {
      const n = Number(v);
      return n >= 13 && n <= 130;
    }, 'Must be between 13 and 130'),
});

// The TS type is DERIVED from the schema — no parallel interface to keep in sync.
export type SignupValues = z.infer<typeof signupSchema>;`}</Code>

      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" style={{ fontWeight: '600' }}>
          LIVE — safeParse probe
        </Text>
        <Text variant="caption" tone="muted" mt="xxs">
          Try the boundary cases. Each row runs the real{' '}
          <Text style={{ fontFamily: 'monospace' }}>signupSchema.safeParse</Text>{' '}
          on a canned value and shows whether it passed and the first error if
          not.
        </Text>
        <Box gap="xs" mt="sm">
          {examples.rows.map((r) => (
            <Box key={r.label} p="xs" radius="sm" bg="background">
              <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <Pill tone={r.ok ? 'success' : 'danger'}>{r.ok ? 'PASS' : 'FAIL'}</Pill>
                <Text variant="caption" style={{ fontFamily: 'monospace' }}>
                  {r.label}
                </Text>
              </Box>
              {!r.ok ? (
                <Text variant="caption" tone="danger" mt="xxs">
                  {r.error}
                </Text>
              ) : null}
            </Box>
          ))}
        </Box>
      </Box>
    </Section>
  );
}

/* The schema probe is a tiny presentational lookup — a local hook keeps it out
 * of the view body. Static canned values + the real safeParse result. */
const SCHEMA_PROBES: ReadonlyArray<{ label: string; input: unknown }> = [
  { label: 'valid: name=Ada, email=ada@x.io, age=30', input: { name: 'Ada', email: 'ada@x.io', age: '30' } },
  { label: 'bad email: name=Bo, email=nope, age=20', input: { name: 'Bo', email: 'nope', age: '20' } },
  { label: 'too young: name=Cy, email=cy@x.io, age=8', input: { name: 'Cy', email: 'cy@x.io', age: '8' } },
  { label: 'short name: name=A, email=a@x.io, age=40', input: { name: 'A', email: 'a@x.io', age: '40' } },
  { label: 'non-numeric age: name=Di, email=di@x.io, age=abc', input: { name: 'Di', email: 'di@x.io', age: 'abc' } },
];

function useSchemaExamples(): { rows: ReadonlyArray<{ label: string; ok: boolean; error?: string }> } {
  const [rows] = useState(() =>
    SCHEMA_PROBES.map((p) => {
      const r = signupSchema.safeParse(p.input);
      if (r.success) return { label: p.label, ok: true };
      const first = r.error.issues[0];
      return { label: p.label, ok: false, error: first ? first.message : 'invalid' };
    }),
  );
  return { rows };
}

/* ------------------------------------------------------------------ */
/* 5. react-hook-form + zodResolver — LIVE                             */
/* ------------------------------------------------------------------ */

function RhfDemoCard() {
  const demo = useRhfFormDemo();
  return (
    <Section
      title="LIVE — react-hook-form + zodResolver"
      explanation="react-hook-form manages field state, tracking touched/dirty, and submit lifecycle; zodResolver wires your zod schema in as the validator. The Controller pattern (below) is the RN-friendly replacement for the DOM-centric register API."
    >
      <Box gap="sm">
        <Controller
          control={demo.control}
          name="name"
          render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
            <Field
              testID="rhf-name"
              label="Name"
              placeholder="Ada Lovelace"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              accessibilityLabel="Name"
            />
          )}
        />
        <Controller
          control={demo.control}
          name="email"
          render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
            <Field
              testID="rhf-email"
              label="Email"
              placeholder="ada@example.com"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              accessibilityLabel="Email"
            />
          )}
        />
        <Controller
          control={demo.control}
          name="age"
          render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
            <Field
              testID="rhf-age"
              label="Age"
              placeholder="30"
              keyboardType="numeric"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              accessibilityLabel="Age"
            />
          )}
        />

        <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            title={demo.submitted ? 'Submitted ✓' : 'Submit'}
            onPress={() => void demo.submit()}
            disabled={demo.isSubmitting || demo.submitted}
          />
          <Button title="Reset" variant="outline" onPress={demo.reset} />
          {demo.submitted ? <Pill tone="success">submitted</Pill> : null}
        </Box>

        {demo.submitted ? (
          <Box p="sm" radius="md" bg="primary">
            <Text variant="small" tone="onPrimary">
              react-hook-form validated the values against the zod schema and
              ran the submit handler.
            </Text>
          </Box>
        ) : null}
      </Box>

      <Code language="useRhfFormDemo (excerpt)" caption="the hook the form above uses">{`import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function useRhfFormDemo() {
  const {
    control,                       // pass to <Controller>
    handleSubmit,                  // wraps your onSubmit in validation
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),   // schema = the validator
    defaultValues: SIGNUP_DEFAULTS,
    mode: 'onBlur',
  });

  const onSubmit = async (values: SignupValues) => {
    // validated against signupSchema before reaching here
  };

  return { control, errors, isSubmitting, submit: handleSubmit(onSubmit) };
}`}</Code>
      <Code language="<Controller> usage" caption="the RN-friendly replacement for register">{`import { Controller } from 'react-hook-form';

<Controller
  control={control}
  name="email"
  render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      accessibilityLabel="Email"
    />
  )}
/>`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Accessibility & UX                                               */
/* ------------------------------------------------------------------ */

function AccessibilityCard() {
  return (
    <Section
      title="Accessibility & UX"
      explanation="Forms are where assistive-tech users get stuck first. Label every field, announce errors, disable submit meaningfully, and surface a clear success state."
    >
      <Box gap="xs">
        <A11yRow title="accessibilityLabel on every input">
          Name the field for screen readers. Fold the current error into the label so it is read on focus (RN has no built-in accessibilityErrorMessage prop — see snippet).
        </A11yRow>
        <A11yRow title="Error text with accessibilityRole='alert'">
          The alert role makes TalkBack/VoiceOver announce the message when it appears, not just when the field is focused.
        </A11yRow>
        <A11yRow title="keyboardType matches the input">
          email-address, numeric, phone-pad — picks the right soft keyboard and reduces typo friction. Set autoCapitalize='none' / autoCorrect={false} on emails.
        </A11yRow>
        <A11yRow title="Disable submit until it can do something">
          But only when invalid AND touched/submitted — disabling from the first paint blocks discovery. The live demos here keep submit enabled and reveal errors on blur/submit.
        </A11yRow>
        <A11yRow title="Show a clear success state">
          A submitted flag that swaps the submit button for a confirmation (the green pills + banners above) closes the loop and stops double-submits.
        </A11yRow>
      </Box>
      <Code language="accessible field pattern">{`// RN has no built-in accessibilityErrorMessage. The pattern is to fold
// the error into the label and give the error text the alert role:
const label = hasError
  ? accessibilityLabel + ', error: ' + error
  : accessibilityLabel;

<TextInput
  accessibilityLabel={label}
  ...
/>
{hasError ? (
  <Text accessibilityRole="alert">{error}</Text>
) : null}`}</Code>
    </Section>
  );
}

function A11yRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box p="sm" radius="sm" bg="surfaceVariant">
      <Text variant="small" style={{ fontWeight: '600' }}>
        {title}
      </Text>
      <Text variant="caption" tone="muted" mt="xxs">
        {children}
      </Text>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Decision matrix                                                  */
/* ------------------------------------------------------------------ */

interface MatrixRow {
  approach: string;
  useWhen: string;
  cost: string;
  tone: 'default' | 'primary' | 'success';
}

const MATRIX_ROWS: ReadonlyArray<MatrixRow> = [
  {
    approach: 'Manual useState + validator',
    useWhen: '1–3 fields, no reuse, learning the foundation.',
    cost: 'You own every rule and every re-render. Fastest to start, slowest to scale.',
    tone: 'default',
  },
  {
    approach: 'zod schema (standalone)',
    useWhen: 'You want a shared contract between client, server, and form lib.',
    cost: 'One schema, one inferred type. Free at the type level; pair with a form lib for state.',
    tone: 'primary',
  },
  {
    approach: 'react-hook-form + zodResolver',
    useWhen: '3+ fields, async submit, touched/dirty tracking, or reuse across screens.',
    cost: 'A dependency (pure JS, Expo Go + jest friendly). Pays off fast as fields grow.',
    tone: 'success',
  },
];

function DecisionMatrixCard() {
  return (
    <Section
      title="Decision matrix — which approach when"
      explanation="All three are correct for some screen. Pick the lightest one that fits; reaching for react-hook-form on a single-field search bar is over-engineering."
    >
      <Box gap="xs">
        {MATRIX_ROWS.map((r) => (
          <Box key={r.approach} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.approach}
              </Text>
              <Pill tone={r.tone}>{r.tone === 'success' ? 'scales' : r.tone === 'primary' ? 'shared' : 'simple'}</Pill>
            </Box>
            <Text variant="caption" style={{ fontWeight: '600' }} mt="xxs">
              Use when
            </Text>
            <Text variant="caption" tone="muted">
              {r.useWhen}
            </Text>
            <Text variant="caption" style={{ fontWeight: '600' }} mt="xxs">
              Cost
            </Text>
            <Text variant="caption" tone="muted">
              {r.cost}
            </Text>
          </Box>
        ))}
      </Box>
      <Box p="sm" radius="md" bg="background">
        <Text variant="small" style={{ fontWeight: '600' }}>
          How this app does it
        </Text>
        <Text variant="caption" tone="muted" mt="xxs">
          The architecture's spine is DI + usecases returning{' '}
          <Text style={{ fontFamily: 'monospace' }}>Result&lt;T&gt;</Text>; form
          state is local to whichever screen needs it. zod, react-hook-form, and{' '}
          <Text style={{ fontFamily: 'monospace' }}>@hookform/resolvers</Text> are
          teaching artifacts scoped to THIS screen — same rationale as the state
          libs on the state-management screen. The submit handler is where you
          would hand validated values to a usecase via the container.
        </Text>
      </Box>
    </Section>
  );
}
