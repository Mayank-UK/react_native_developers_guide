import { StyleSheet, TextInput } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Card, Text, useTheme } from '../../design-system';
import { Section, Code, Pill } from '../../components';
import {
  useVarLetConstDemo,
  useEqualityDemo,
  useTruthyFalsyDemo,
  useTemplateLiteralsDemo,
  useDestructuringDemo,
  useSpreadRestDemo,
  useOptionalChainingDemo,
  useArrayMethodsDemo,
  ARRAY_DATASET,
  ARRAY_METHODS,
  useControlFlowDemo,
  useFunctionsDemo,
  useClosuresDemo,
  useObjectsAndClassesDemo,
  useAsyncAwaitDemo,
  useTimersDemo,
  useUnionIntersectionDemo,
  useGenericsDemo,
  useNarrowingDemo,
  useConstObjectDemo,
  ApiStatus,
  useUnknownAnyDemo,
  safeStringify,
  parseValue,
  describe,
  type ArrayMethodName,
  type ControlFlowMode,
} from './ts_js_fundamentals_hooks';

/**
 * TsJsFundamentalsView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (ts_js_fundamentals_hooks.ts); this file only renders.
 *
 * A single, genuinely useful teaching artifact covering the JS + TS
 * fundamentals this RN app uses. Every concept ships with a LIVE, interactive
 * demo rendered in-screen (not just a code snippet): tap, toggle, or type to
 * watch the concept behave. Built only from the existing design-system
 * primitives + plain React.
 *
 * Convention (per project rules): single-file helpers (`Section`, `Code`,
 * `Pill`, demo sub-components) stay as local functions; only multi-file pieces
 * would graduate to global `ui/components`.
 *
 * TypeScript note: this project compiles with `erasableSyntaxOnly`, so we use
 * const-object + literal unions INSTEAD of enums everywhere (see the dedicated
 * card). No `any` is used; `unknown` + narrowing is preferred.
 */
export function TsJsFundamentalsView() {
  return (
    <ScreenScaffold
      title="TypeScript & JavaScript Fundamentals"
      subtitle="The JS + TS this React Native app is built from"
    >
      {/* JS core */}
      <IntroCard />
      <VarLetConstCard />
      <PrimitiveTypesCard />
      <EqualityCard />
      <TruthyFalsyCard />
      <TemplateLiteralsCard />
      <DestructuringCard />
      <SpreadRestCard />
      <OptionalChainingCard />
      <ArrayMethodsCard />
      <ControlFlowCard />
      <FunctionsCard />
      <ClosuresCard />
      <ObjectsAndClassesCard />
      <AsyncAwaitCard />
      <TimersCard />
      <ModulesCard />
      {/* TS core */}
      <WhyTsCard />
      <InterfacesVsTypesCard />
      <UnionIntersectionCard />
      <GenericsCard />
      <UtilityTypesCard />
      <NarrowingCard />
      <ConstObjectVsEnumCard />
      <UnknownAnyNeverCard />
    </ScreenScaffold>
  );
}
function IntroCard() {
  return (
    <Section title="JavaScript & TypeScript">
      <Text variant="body">
        JavaScript is the language; TypeScript is a static layer on top that
        catches mistakes before runtime. React Native code is written in TSX
        (TypeScript + JSX) and bundled down to plain JS. This single screen
        walks through everything this app actually uses — each concept paired
        with a working demo you can drive.
      </Text>
      <Text variant="small" tone="muted">
        Two halves below: JS core (how the language behaves) then TS core
        (how types describe and constrain it). Tap every demo.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* var / let / const                                                   */
/* ------------------------------------------------------------------ */

function VarLetConstCard() {
  // `let` reassigns; `const` binds once. Reassigning a const is a compile
  // error (TS) and a TypeError at runtime. Mutating a const *object* is fine —
  // const is the binding, not the value.
  const {
    letValue,
    constValue,
    items,
    constObjectAttempt,
    bumpLet,
    tryReassignConst,
    push,
    resetItems,
  } = useVarLetConstDemo();

  return (
    <Section
      title="var / let / const"
      explanation="Prefer `const` by default — a binding that can't be reassigned. Use `let` only when you must reassign. Never use `var` (function-scoped, hoisted, leaks out of blocks). `const` freezes the binding, NOT the contents: a const array/object can still be mutated."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Pill label="let" value={String(letValue)} tone="primary" />
          <Pill label="const" value={String(constValue)} tone="primary" />
        </Box>
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Button title="let = let + 1" onPress={bumpLet} />
          <Button title="const = const + 1" variant="outline" onPress={tryReassignConst} />
        </Box>
        {constObjectAttempt.current ? (
          <Text variant="caption" tone="danger">
            {constObjectAttempt.current}
          </Text>
        ) : null}
        <Text variant="small" tone="muted">
          But the const *array* below can grow — `const` only blocks reassigning
          the variable, not mutating the value it holds.
        </Text>
        <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
          <Text variant="small">items = [{items.join(', ')}]</Text>
          <Box row gap="xs">
            <Button title="push" variant="outline" onPress={push} />
            <Button title="reset" variant="ghost" onPress={resetItems} />
          </Box>
        </Box>
        <Code>{`let counter = 0;        counter = counter + 1; // OK
const limit = 10;       // limit = 11;          // ERROR
const tags = ['a'];     tags.push('b');        // OK (value, not binding)`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Primitive types                                                     */
/* ------------------------------------------------------------------ */

const PRIMITIVE_SAMPLES: ReadonlyArray<readonly [string, unknown, string]> = [
  ['number', 42, 'all numbers are IEEE-754 doubles (no int/float split)'],
  ['string', 'hi', 'immutable UTF-16 sequence'],
  ['boolean', true, 'true | false'],
  ['null', null, 'explicit "no value"'],
  ['undefined', undefined, 'uninitialized (default)'],
  ['bigint', 9007199254740993n, 'arbitrary-precision integers'],
  ['symbol', Symbol('id'), 'unique, often used as object keys'],
];

function PrimitiveTypesCard() {
  return (
    <Section
      title="Primitive types"
      explanation="Seven primitives: number, string, boolean, null, undefined, bigint, symbol. Everything else (arrays, functions, dates, objects) is an Object. `typeof` reveals the primitive kind."
    >
      <Box gap="xs">
        {PRIMITIVE_SAMPLES.map(([name, value, note]) => (
          <Box key={name} gap="xxs">
            <Box row gap="sm" center style={{ flexWrap: 'wrap' }}>
              <Pill label="typeof" value={String(typeof value)} tone="primary" />
              <Text variant="small" tone="muted">
                {name}
              </Text>
              <Text variant="caption">{safeStringify(value)}</Text>
            </Box>
            <Text variant="caption" tone="muted">
              {note}
            </Text>
          </Box>
        ))}
        <Code>{`typeof 42        // 'number'
typeof 'hi'     // 'string'
typeof null     // 'object'  ← famous JS quirk, use \`value === null\`
typeof undefined // 'undefined'`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* == vs ===                                                           */
/* ------------------------------------------------------------------ */

function EqualityCard() {
  const { theme } = useTheme();
  const { aRaw, setARaw, bRaw, setBRaw, a, b, loose, strict } = useEqualityDemo();

  return (
    <Section
      title="== vs === (and != vs !==)"
      explanation="Always use === / !==. == performs type coercion (0 == '' == false == null-ish traps), so two values of different types can compare equal. === requires same type AND same value."
    >
      <Box gap="sm">
        <Box row gap="sm">
          <TextInput
            value={aRaw}
            onChangeText={setARaw}
            placeholder="a: 0, '', null…"
            placeholderTextColor={theme.colors.textMuted}
            style={StyleSheet.flatten([
              styles.input,
              { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.background },
            ])}
          />
          <TextInput
            value={bRaw}
            onChangeText={setBRaw}
            placeholder="b: false, '', …"
            placeholderTextColor={theme.colors.textMuted}
            style={StyleSheet.flatten([
              styles.input,
              { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.background },
            ])}
          />
        </Box>
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Pill label="a =" value={describe(a)} />
          <Pill label="b =" value={describe(b)} />
        </Box>
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Pill
            label="a == b"
            value={String(loose)}
            tone={loose ? 'primary' : 'muted'}
          />
          <Pill
            label="a === b"
            value={String(strict)}
            tone={strict ? 'primary' : 'muted'}
          />
        </Box>
        <Text variant="caption" tone="muted">
          Tip: try a = 0, b = false; or a = '', b = 0. Notice == says equal but
          === does not. Coercion is the source of countless bugs.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Truthy / falsy                                                      */
/* ------------------------------------------------------------------ */

const FALSY_DISPLAY: ReadonlyArray<readonly [unknown, string]> = [
  [false, 'false'],
  [0, '0'],
  [-0, '-0'],
  [0n, '0n'],
  ['', '""'],
  [null, 'null'],
  [undefined, 'undefined'],
  [NaN, 'NaN'],
];

function TruthyFalsyCard() {
  const { theme } = useTheme();
  const { raw, setRaw, value, truthy } = useTruthyFalsyDemo();

  return (
    <Section
      title="Truthy & falsy"
      explanation="In a boolean context (if, &&, ||, !), JS treats exactly 8 values as falsy: false, 0, -0, 0n, '', null, undefined, NaN. EVERYTHING ELSE is truthy — including '0', [], {}, and 'false' (non-empty string). This drives if-checks and short-circuit defaults."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {FALSY_DISPLAY.map(([v, label]) => (
            <Pill key={label} label="" value={label} tone="danger" />
          ))}
        </Box>
        <TextInput
          value={raw}
          onChangeText={setRaw}
          placeholder="try '0', [], 'false', 0…"
          placeholderTextColor={theme.colors.textMuted}
          style={StyleSheet.flatten([
            styles.input,
            { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.background },
          ])}
        />
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Pill label="value" value={JSON.stringify(value) || '""'} />
          <Pill
            label="Boolean(value)"
            value={String(truthy)}
            tone={truthy ? 'primary' : 'danger'}
          />
          <Pill
            label="value || 'default'"
            value={truthy ? JSON.stringify(value) : "'default'"}
          />
        </Box>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Template literals                                                   */
/* ------------------------------------------------------------------ */

function TemplateLiteralsCard() {
  const { theme } = useTheme();
  const { name, setName, count, buy, sell } = useTemplateLiteralsDemo();

  return (
    <Section
      title="Template literals"
      explanation="Backticks let you interpolate expressions in ${} and span multiple lines. Far clearer than string concatenation, especially for JSX-ish strings."
    >
      <Box gap="sm">
        <Box row gap="sm">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="name"
            placeholderTextColor={theme.colors.textMuted}
            style={StyleSheet.flatten([
              styles.input,
              { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.background },
            ])}
          />
          <Button title="buy" onPress={buy} />
          <Button title="sell" variant="outline" onPress={sell} />
        </Box>
        <Code>{`const greeting = \`Hi \${name}, you have \${count} item(s)\`;\n// => "Hi ${name}, you have ${count} item(s)"`}</Code>
        <Text variant="caption" tone="muted">
          Tagged templates (`tag\`...\``) are also how styled-components-like
          libraries work, though this app uses plain StyleSheet.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Destructuring                                                       */
/* ------------------------------------------------------------------ */

function DestructuringCard() {
  const { user, randomize } = useDestructuringDemo();

  // Object destructuring with rename + default
  const { name, age, city: hometown = 'unknown', role = 'engineer' } = user;

  // Array destructuring with skip + rest
  const [first, second, ...rest] = [10, 20, 30, 40, 50];

  return (
    <Section
      title="Destructuring (objects & arrays)"
      explanation="Unpack exactly the fields you want in one shot. Rename on the fly (`city: hometown`), default missing fields (`role = 'engineer'`), and skip array slots with commas. Props in this app are destructured the same way — see any screen's signature."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Button title="Randomize" variant="outline" onPress={randomize} />
        </Box>
        <Box gap="xs">
          <Text variant="small" tone="muted">
            Object destructure: const {'{ name, age, city: hometown = "unknown", role = "engineer" }'} = user
          </Text>
          <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
            <Pill label="name" value={name} />
            <Pill label="age" value={String(age)} />
            <Pill label="hometown" value={hometown} />
            <Pill label="role (defaulted)" value={role} tone="primary" />
          </Box>
        </Box>
        <Box gap="xs">
          <Text variant="small" tone="muted">
            Array destructure: const [first, second, ...rest] = [10,20,30,40,50]
          </Text>
          <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
            <Pill label="first" value={String(first)} tone="primary" />
            <Pill label="second" value={String(second)} tone="primary" />
            <Pill label="rest" value={`[${rest.join(', ')}]`} />
          </Box>
        </Box>
        <Code>{`// Swapping without a temp variable
let a = 1, b = 2;
[a, b] = [b, a]; // a === 2, b === 1`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Spread / rest                                                       */
/* ------------------------------------------------------------------ */

function SpreadRestCard() {
  const { base, overrides, merged, combined, sum, flipBase, flipOverride } = useSpreadRestDemo();

  return (
    <Section
      title="Spread & rest (...)"
      explanation="Same `...` syntax, two roles: SPREAD expands an iterable/object into individual elements; REST collects many arguments into one array. Object spread is right-wins (great for overrides). This app's container spreads config the same way."
    >
      <Box gap="sm">
        <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
          <Text variant="small" tone="muted">
            base: {JSON.stringify(base)}
          </Text>
          <Button title="flip base" variant="outline" onPress={flipBase} />
        </Box>
        <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
          <Text variant="small" tone="muted">
            overrides: {JSON.stringify(overrides)}
          </Text>
          <Button title="flip override" variant="outline" onPress={flipOverride} />
        </Box>
        <Pill label="{ ...base, ...overrides }" value={JSON.stringify(merged)} tone="primary" />
        <Pill label="[ ...a, ...b ]" value={`[${combined.join(', ')}]`} tone="primary" />
        <Text variant="small" tone="muted">
          Rest params: sum(1, 2, 3, 4) = {String(sum(1, 2, 3, 4))}
        </Text>
        <Code>{`function logAll(label: string, ...rest: unknown[]) {
  console.log(label, rest); // rest is always an array
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Optional chaining & nullish coalescing                              */
/* ------------------------------------------------------------------ */

function OptionalChainingCard() {
  const { profile, toggleAddress, clearCity, city, zip, display } = useOptionalChainingDemo();

  return (
    <Section
      title="Optional chaining ?. & nullish ?? "
      explanation="?.' safely drills into possibly-null/undefined values, returning undefined instead of throwing. '??' provides a fallback ONLY for null/undefined (unlike ||, which also swallows 0, '', false). Together they replace verbose manual null-checks."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Button title="toggle address" onPress={toggleAddress} />
          <Button title="clear city" variant="outline" onPress={clearCity} />
        </Box>
        <Text variant="small" tone="muted">
          profile = {JSON.stringify(profile)}
        </Text>
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Pill label="address?.city ?? 'city missing'" value={city} tone="primary" />
          <Pill label="address?.zip ?? '—'" value={zip} />
          <Pill label="address?.city?.toUpperCase() ?? 'NO CITY'" value={display} />
        </Box>
        <Code>{`const zip = profile.address?.zip ?? '0000';
// equivalent to:
//   profile && profile.address != null && profile.address.zip != null
//     ? profile.address.zip : '0000'`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Array methods sandbox                                               */
/* ------------------------------------------------------------------ */

function ArrayMethodsCard() {
  const { method, setMethod, result } = useArrayMethodsDemo();

  return (
    <Section
      title="Array methods: map / filter / reduce / find / some / every"
      explanation="The functional toolkit. `map` transforms each item (new array, same length); `filter` keeps items passing a test (new array, ≤ length); `reduce` folds the array into one value; `find` returns the first match or undefined; `some`/`every` return booleans. None mutate the original — they return new values (purity matters for React state)."
    >
      <Box gap="sm">
        <Text variant="small" tone="muted">
          dataset = [{ARRAY_DATASET.join(', ')}]
        </Text>
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {(Object.keys(ARRAY_METHODS) as ArrayMethodName[]).map((m) => (
            <Button
              key={m}
              title={m}
              variant={method === m ? 'filled' : 'outline'}
              onPress={() => setMethod(m)}
            />
          ))}
        </Box>
        <Text variant="small">{ARRAY_METHODS[method]}</Text>
        <Pill label="result" value={JSON.stringify(result)} tone="primary" />
        <Code>{`const doubled = nums.map(n => n * 2);
const evens   = nums.filter(n => n % 2 === 0);
const total   = nums.reduce((acc, n) => acc + n, 0);
const first   = nums.find(n => n > 5);     // 6 or undefined
const anyBig  = nums.some(n => n > 8);     // boolean
const allPos  = nums.every(n => n > 0);    // boolean`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Control flow                                                        */
/* ------------------------------------------------------------------ */

function ControlFlowCard() {
  const { mode, setMode, value } = useControlFlowDemo();

  return (
    <Section
      title="Control flow: if/else, switch, ternary, for-of, while"
      explanation="The branching & looping primitives. `if/else` and `switch` for multi-way; ternary `? :` for expressions (e.g. inside JSX); `for-of` iterates values of an iterable (preferred over for-in which iterates keys); `while` for condition loops. for-in over arrays is a footgun — use for-of."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {(['if', 'switch', 'ternary', 'forOf', 'while'] as const).map((m: ControlFlowMode) => (
            <Button
              key={m}
              title={m}
              variant={mode === m ? 'filled' : 'outline'}
              onPress={() => setMode(m)}
            />
          ))}
        </Box>
        <Pill label="result" value={value} tone="primary" />
        <Code>{`if (n > 2) { … } else if (n > 0) { … } else { … }

switch (day) {
  case 'Sat': case 'Sun': return 'weekend';
  default: return 'weekday';
}

const label = active ? 'Online' : 'Offline';   // ternary expression
for (const item of list) { … }                 // values (use this)
// for (const key in obj) { … }                // KEYS (objects only)
while (n > 0) { n--; }`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Functions (declarations vs arrow)                                   */
/* ------------------------------------------------------------------ */

function FunctionsCard() {
  // Hoisting demo: declarations are hoisted; arrow expressions are not.
  const { picked, setPicked } = useFunctionsDemo();

  return (
    <Section
      title="Functions: declarations vs arrow"
      explanation="Two ways to define a function. Function DECLARATIONS (`function f()`) are hoisted — usable before their line. Arrow functions (`const f = () => {}`) are expressions: not usable before definition, AND they have no own `this`/`arguments` (they close over the enclosing scope). Use arrows for callbacks and short helpers; their `this`-binding is exactly what you want in React components."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title="declaration" variant={picked === 'decl' ? 'filled' : 'outline'} onPress={() => setPicked('decl')} />
          <Button title="arrow" variant={picked === 'arrow' ? 'filled' : 'outline'} onPress={() => setPicked('arrow')} />
        </Box>
        {picked === 'decl' ? (
          <Code>{`// Declaration — hoisted: callable above its line
function greet(name: string): string {
  return 'Hi ' + name;
}`}</Code>
        ) : (
          <Code>{`// Arrow expression — not hoisted, no own \`this\`
const greet = (name: string): string => 'Hi ' + name;

// Implicit return for one-liners; preserves outer \`this\`
class Counter {
  private n = 0;
  bump = () => { this.n += 1; }; // safe to pass as callback
}`}</Code>
        )}
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Closures                                                            */
/* ------------------------------------------------------------------ */

function ClosuresCard() {
  const { peek, next, reset } = useClosuresDemo();

  return (
    <Section
      title="Closures"
      explanation="A closure is a function that remembers the variables from where it was created. Here, `next`/`reset`/`peek` close over `count` — it's fully private (no other code can touch it). Hooks like useState/useMemo are closures over your component's render scope; that's why stale-closure bugs happen."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Button title="next()" onPress={next} />
          <Button title="reset()" variant="outline" onPress={reset} />
        </Box>
        <Pill label="counter.peek()" value={String(peek)} tone="primary" />
        <Code>{`function makeCounter(start: number) {
  let count = start;                 // captured, private
  return {
    next:  () => ++count,
    reset: () => { count = start; },
  };
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Objects & classes, `this`                                           */
/* ------------------------------------------------------------------ */

function ObjectsAndClassesCard() {
  const { viaArrow, setArrow, setRegular, who, detached } = useObjectsAndClassesDemo();

  return (
    <Section
      title="Objects & classes (brief) + the `this` nuance"
      explanation="Objects group named fields; classes are sugar over prototype-based constructors for grouping state + methods. The sharp edge is `this`: a regular method loses its `this` when torn off and passed as a callback. Arrow fields bind `this` lexically and are the standard fix in React class components (and RN callbacks)."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title="arrow method" variant={viaArrow ? 'filled' : 'outline'} onPress={setArrow} />
          <Button title="regular method" variant={!viaArrow ? 'filled' : 'outline'} onPress={setRegular} />
        </Box>
        <Pill label="logger.who()" value={who} tone="primary" />
        <Pill label="detached (torn-off)" value={detached} tone="primary" />
        <Code>{`class Widget {
  private id = 'widget';
  // arrow FIELD — \`this\` stays bound when torn off
  getId = () => this.id;
  // regular METHOD — \`this\` is lost if you pass \`w.report\` as a callback
  report() { return this.id; }
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Promises & async/await, try/catch                                  */
/* ------------------------------------------------------------------ */

function AsyncAwaitCard() {
  const { state, runSuccess, runFailure, reset } = useAsyncAwaitDemo();

  return (
    <Section
      title="Promises & async/await, try/catch"
      explanation="A Promise is a value that resolves (or rejects) later. `async/await` makes promise chains read like straight-line code; wrap awaits in try/catch to handle rejection. This app's data layer wraps fetch in promises and converts errors to Result<T> at the boundary."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title="await success()" onPress={runSuccess} disabled={state.status === 'loading'} />
          <Button title="await failure()" variant="outline" onPress={runFailure} disabled={state.status === 'loading'} />
          <Button title="reset" variant="ghost" onPress={reset} />
        </Box>
        <Box gap="xs">
          <Pill label="status" value={state.status} tone={state.status === 'error' ? 'danger' : 'primary'} />
          {state.status === 'loading' ? <Text variant="small" tone="muted">spinner… (wait ~900ms)</Text> : null}
          {state.status === 'success' ? (
            <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
              <Pill label="value" value={state.value} />
              <Pill label="elapsed" value={`${state.ms}ms`} />
            </Box>
          ) : null}
          {state.status === 'error' ? (
            <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
              <Pill label="caught" value={state.message} tone="danger" />
              <Pill label="elapsed" value={`${state.ms}ms`} />
            </Box>
          ) : null}
        </Box>
        <Code>{`async function load(): Promise<string> {
  try {
    const res = await fetch('/api/posts');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } catch (err) {
    // becomes AppException in the data layer, then Result<Failed>
    throw err;
  }
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* setTimeout / setInterval                                            */
/* ------------------------------------------------------------------ */

function TimersCard() {
  const { ticks, running, ping, toggle, reset, fireOnce } = useTimersDemo();

  return (
    <Section
      title="setTimeout / setInterval"
      explanation="`setTimeout(fn, ms)` runs fn ONCE after a delay; `setInterval` repeats every ms until cleared. ALWAYS clear them (the effect-cleanup pattern) when the component unmounts — otherwise the callback fires on a dead component and leaks. React Native also exposes these (not requestAnimationFrame for non-animation work)."
    >
      <Box gap="sm">
        <Box row gap="sm" center>
          <Text variant="h2" tone="primary">{ticks}</Text>
          <Text variant="caption" tone="muted">ticks (500ms)</Text>
        </Box>
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title={running ? 'stop' : 'start'} variant={running ? 'outline' : 'filled'} onPress={toggle} />
          <Button title="reset" variant="ghost" onPress={reset} />
        </Box>
        <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
          <Text variant="small" tone="muted">setTimeout demo</Text>
          <Button title="fire once (600ms)" variant="outline" onPress={fireOnce} />
        </Box>
        <Pill label="ping" value={ping} tone="primary" />
        <Code>{`useEffect(() => {
  const id = setInterval(() => setTicks(t => t + 1), 500);
  return () => clearInterval(id);   // ← never skip this
}, []);`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Modules (import / export)                                           */
/* ------------------------------------------------------------------ */

function ModulesCard() {
  return (
    <Section
      title="Modules: import / export"
      explanation="Each file is a module. `export` exposes a binding; `import` brings it in. Named imports (in braces) pick specific exports; a `default` export is the single main thing a module offers. React Native (Metro bundler) follows ES module semantics — the whole graph is bundled into one file at build time. This app uses named exports for screens/components and re-exports a public surface via barrel files like design-system/index.ts."
    >
      <Box gap="sm">
        <Code>{`// math.ts
export const add = (a: number, b: number) => a + b;   // named
export type Vec = { x: number; y: number };
export default function distance(v: Vec): number { … } // default

// consumer.ts
import distance, { add, type Vec } from './math';     // default + named
import * as Math from './math';                        // namespace
import type { Vec } from './math';                     // type-only (erased)`}</Code>
        <Text variant="caption" tone="muted">
          `import type` is erased at compile time — use it for type-only imports
          (this app sets `verbatimModuleSyntax`-friendly habits).
        </Text>
      </Box>
    </Section>
  );
}

/* ================================================================== */
/* TS CORE                                                            */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/* Why TS + basic types                                                */
/* ------------------------------------------------------------------ */

function WhyTsCard() {
  return (
    <Section
      title="Why TypeScript + basic types"
      explanation="TS adds static types to JS: mistakes (wrong arg, missing field, typo'd property) fail at compile time instead of at runtime on a user's phone. This entire app compiles under strict mode + erasableSyntaxOnly. The basic types: number, string, boolean, null, undefined, bigint, symbol, plus arrays (T[]) and tuples ([T, U])."
    >
      <Box gap="sm">
        <Code>{`let n: number = 42;
let s: string = 'hi';
let flags: boolean[] = [true, false];
let pair: [string, number] = ['age', 30]; // fixed-length tuple
let nothing: null = null;
let maybe: string | null = null;           // union (covered below)`}</Code>
        <Text variant="caption" tone="muted">
          Inference is strong — annotate function PARAMETERS and returns, but
          let `const`/`let` locals infer. This screen uses almost no explicit
          annotations on locals for that reason.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* interfaces vs type aliases                                          */
/* ------------------------------------------------------------------ */

function InterfacesVsTypesCard() {
  return (
    <Section
      title="Interfaces vs type aliases"
      explanation="Both describe object shapes. `interface` is extendable (declaration merging, `extends`) and shows cleaner error messages; `type` can express unions, intersections, tuples, primitives, and mapped types. This app prefers `interface` for object contracts (e.g. repositories in domain/) and `type` for unions/aliases."
    >
      <Box gap="sm">
        <Code>{`// Object shape — either works
interface User { id: number; name: string; }
type TUser   = { id: number; name: string; };

// interface extends interface
interface Admin extends User { permissions: string[]; }

// type can do unions / tuples — interface cannot
type Status = 'idle' | 'loading' | 'error';
type Point  = [number, number];`}</Code>
        <Text variant="caption" tone="muted">
          Rule of thumb in this repo: `interface` for things other code will
          implement (PostRepository), `type` for data shapes and unions.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Union / intersection, literals, as const                            */
/* ------------------------------------------------------------------ */

function UnionIntersectionCard() {
  type WithTimestamp<T> = T & { createdAt: number }; // intersection demo inline
  const { role, setRole } = useUnionIntersectionDemo();

  const record: WithTimestamp<{ name: string }> = {
    name: 'doc.md',
    createdAt: Date.now(),
  };

  return (
    <Section
      title="Unions, intersections, literals & as const"
      explanation="UNION (A | B) = a value is one of these types (great for finite option sets + discriminated unions). INTERSECTION (A & B) = combine shapes into one. LITERAL types narrow to exact values; literal unions like `Status = 'idle' | 'loading' | 'error'` replace enums. `as const` makes an object's properties readonly literal types — the backbone of this project's const-object pattern."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {(['admin', 'editor', 'viewer'] as const).map((r) => (
            <Button key={r} title={r} variant={role === r ? 'filled' : 'outline'} onPress={() => setRole(r)} />
          ))}
        </Box>
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Pill label="role: 'admin'|'editor'|'viewer'" value={role} tone="primary" />
          <Pill label="intersect { name } & { createdAt }" value={record.name} />
        </Box>
        <Code>{`type Role = 'admin' | 'editor' | 'viewer';        // literal union
type Audit = Event & { createdAt: number };        // intersection

const Colors = { bg: '#fff', text: '#000' } as const;
//   → { readonly bg: '#fff'; readonly text: '#000' }`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Generics                                                            */
/* ------------------------------------------------------------------ */

function GenericsCard() {
  const { box, bump, reset, identity } = useGenericsDemo();

  return (
    <Section
      title="Generics"
      explanation="A generic lets one definition work for many types while keeping each call site fully typed — `<T>` is a type parameter. This app's `Result<T>`, `Success<T>`, `useReducer`, and the design-system `Box`'s extensions all lean on generics. Write the constraint once; specialize at each call."
    >
      <Box gap="sm">
        <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
          <Text variant="small" tone="muted">Box&lt;number&gt;.value</Text>
          <Text variant="h2" tone="primary">{box.value}</Text>
        </Box>
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title="+10" onPress={bump} />
          <Button title="reset" variant="outline" onPress={reset} />
        </Box>
        <Code>{`function identity<T>(x: T): T { return x; }
const n = identity(42);      // T inferred as number
const s = identity('hi');    // T inferred as string

// generic data structure — this app's Result<T>:
type Result<T> = { ok: true; value: T } | { ok: false; error: string };`}</Code>
        <Text variant="caption" tone="muted">
          identity({String(box.value)}) returned the {typeof identity(box.value)} {String(identity(box.value))}.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Utility types                                                       */
/* ------------------------------------------------------------------ */

type FullUser = {
  id: number;
  name: string;
  email?: string;
  role: 'admin' | 'viewer';
};

const UtilityTypesCard = () => {
  const full: FullUser = { id: 1, name: 'Mak', role: 'admin' };
  // Partial<T> — every field optional (great for patches)
  const patch: Partial<FullUser> = { name: 'Updated' };
  // Pick<T, K> — keep only listed keys
  const preview: Pick<FullUser, 'id' | 'name'> = { id: full.id, name: full.name };
  // Omit<T, K> — drop listed keys
  const safe: Omit<FullUser, 'email'> = { id: full.id, name: full.name, role: full.role };
  // Record<K, V> — map keys → value type
  const counts: Record<FullUser['role'], number> = { admin: 1, viewer: 5 };

  return (
    <Section
      title="Utility types: Partial / Pick / Omit / Record"
      explanation="TS ships type-level helpers that derive new shapes from existing ones — no duplication. `Partial<T>` = all-optional (for PATCH updates). `Pick<T,K>` = keep these keys. `Omit<T,K>` = drop these keys. `Record<K,V>` = a map from K to V. They keep your types DRY when one shape feeds several use-cases."
    >
      <Box gap="xs">
        <Pill label="FullUser" value={JSON.stringify(full)} tone="primary" />
        <Pill label="Partial (patch)" value={JSON.stringify(patch)} />
        <Pill label="Pick<id|name>" value={JSON.stringify(preview)} />
        <Pill label="Omit<email>" value={JSON.stringify(safe)} />
        <Pill label="Record<role,number>" value={JSON.stringify(counts)} />
        <Code>{`type FullUser = { id: number; name: string; email?: string; role: 'admin' | 'viewer' };

type UserPatch   = Partial<FullUser>;                 // all optional
type UserPreview = Pick<FullUser, 'id' | 'name'>;     // subset
type SafeUser    = Omit<FullUser, 'email'>;           // minus email
type RoleCounts  = Record<FullUser['role'], number>;  // keyed map`}</Code>
      </Box>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Narrowing (typeof / in / instanceof, discriminated unions)          */
/* ------------------------------------------------------------------ */

function NarrowingCard() {
  const { shape, setCircle, setSquare, setRect, a } = useNarrowingDemo();

  return (
    <Section
      title="Narrowing & discriminated unions"
      explanation="Narrowing is TS tracking a value's type within a branch. `typeof` narrows primitives; `in` checks for a property; `instanceof` checks class identity. The killer pattern is a DISCRIMINATED UNION: each variant carries a shared literal tag (here `kind`); inside a switch on the tag, TS knows EXACTLY which fields exist. This app's `Result<T>` and `ApiScenario` both use this shape."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title="circle r=3" variant={shape.kind === 'circle' ? 'filled' : 'outline'} onPress={setCircle} />
          <Button title="square s=4" variant={shape.kind === 'square' ? 'filled' : 'outline'} onPress={setSquare} />
          <Button title="rect 4x5" variant={shape.kind === 'rect' ? 'filled' : 'outline'} onPress={setRect} />
        </Box>
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Pill label="shape.kind" value={shape.kind} tone="primary" />
          <Pill label="area()" value={a.toFixed(2)} tone="primary" />
        </Box>
        <Code>{`type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rect';   w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {            // ← TS narrows in each case
    case 'circle': return Math.PI * s.radius ** 2;   // s.radius OK
    case 'square': return s.side ** 2;               // s.side OK
    case 'rect':   return s.w * s.h;                 // s.w, s.h OK
  }
}`}</Code>
        <Text variant="caption" tone="muted">
          Other narrowing forms: `typeof x === 'string'`, `'zip' in address`,
          `err instanceof Error`.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* const-object vs enum (project pattern)                              */
/* ------------------------------------------------------------------ */

function ConstObjectVsEnumCard() {
  const { status, setStatus } = useConstObjectDemo();
  return (
    <Section
      title="const-object + literal union INSTEAD of enum"
      explanation="This project compiles with `erasableSyntaxOnly`: TypeScript features that emit runtime code (enums, parameter properties, namespaces) are banned — only type-level syntax that's safely erasable is allowed. An `enum` generates a real JS object, so it's not erasable. The project pattern instead: a `const` object (runtime values) + a type alias deriving a literal union from it. You get runtime values AND a typed union, with zero emitted syntax."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          {(Object.values(ApiStatus) as ApiStatus[]).map((s) => (
            <Button key={s} title={s} variant={status === s ? 'filled' : 'outline'} onPress={() => setStatus(s)} />
          ))}
        </Box>
        <Pill label="ApiStatus value" value={status} tone="primary" />
        <Code>{`// ❌ enum — banned (not erasable; emits a runtime object)
// enum ApiStatus { Idle, Loading, Success, Error }

// ✅ const-object + literal union — the project pattern
const ApiStatus = {
  Idle: 'idle',
  Loading: 'loading',
  Success: 'success',
  Error: 'error',
} as const;
type ApiStatus = (typeof ApiStatus)[keyof typeof ApiStatus];
//   → 'idle' | 'loading' | 'success' | 'error'

const ALL: readonly ApiStatus[] = Object.values(ApiStatus);`}</Code>
        <Text variant="caption" tone="muted">
          Used throughout this codebase — see `core/result.ts` (Success/Failed),
          `core/scenario/api-scenario.ts` (ApiScenario), and the design-system
          component variant unions.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* unknown vs any vs never                                             */
/* ------------------------------------------------------------------ */

function UnknownAnyNeverCard() {
  const { raw, setRaw, handled } = useUnknownAnyDemo();

  return (
    <Section
      title="unknown vs any vs never"
      explanation="`unknown` is the type-safe alternative to `any`: you MUST narrow it (typeof, instanceof, in) before using it — the compiler forces a check. `any` disables checking entirely and is FORBIDDEN in this project. `never` is the type of values that can't occur: a function that always throws, an unreachable switch branch, or the empty type — used here for exhaustiveness checks."
    >
      <Box gap="sm">
        <TextInput
          value={raw}
          onChangeText={setRaw}
          placeholder="type something…"
          placeholderTextColor="#999"
        />
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Pill label="narrowed (unknown → …)" value={handled} tone="primary" />
        </Box>
        <Code>{`function parse(raw: unknown): string {
  // raw.x ← ERROR: must narrow first
  if (typeof raw === 'string') return raw.toUpperCase();
  if (typeof raw === 'number') return String(raw);
  throw new Error('unsupported'); // returns \`never\`
}

// exhaustiveness via never:
type Shape = { kind: 'circle' } | { kind: 'square' };
function assertNever(x: never): never { throw new Error('unhandled'); }
function handle(s: Shape) {
  switch (s.kind) {
    case 'circle': return 0;
    case 'square': return 1;
    default: return assertNever(s); // compile error if a variant is missing
  }
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* shared styles                                                       */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    flex: 1,
    minWidth: 120,
  },
});
