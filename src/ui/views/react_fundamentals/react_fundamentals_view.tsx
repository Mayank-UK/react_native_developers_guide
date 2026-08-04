import { type ReactNode } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Text, useTheme } from '../../design-system';
import { Section, Code } from '../../components';
import {
  useCounterState,
  useControlledInput,
  CONTROLLED_INPUT_MAX,
  useConditionalToggle,
  useTaskList,
  useEffectTimer,
  useMemoUseRefDemo,
  useReducerCounter,
  useToggle,
  type Task,
} from './react_fundamentals_hooks';

/**
 * ReactFundamentalsView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (react_fundamentals_hooks.ts); this file only renders.
 *
 * A genuinely useful teaching artifact: every concept below ships with a LIVE,
 * interactive demo rendered in-screen (not just a code snippet): the user can
 * tap, toggle, and type to watch the concept behave. Built only from the
 * existing design-system primitives + plain React.
 *
 * Note on style: single-file reuse (small demo sub-components, the local
 * `useToggle` hook) stays as local functions per project convention; only
 * multi-file pieces graduate to global `ui/components`.
 */
export function ReactFundamentalsView() {
  return (
    <ScreenScaffold
      title="React Fundamentals"
      subtitle="The mental model behind every screen in this app"
    >
      <IntroCard />
      <ReactVsRnCard />
      <JsxAndComponentsCard />
      <PropsCard />
      <UseStateCard />
      <ControlledInputCard />
      <ConditionalRenderingCard />
      <ListsCard />
      <UseEffectCard />
      <UseMemoUseRefCard />
      <UseReducerCard />
      <CustomHookCard />
      <CompositionCard />
    </ScreenScaffold>
  );
}
function IntroCard() {
  return (
    <Section
      title="What is React?"
      explanation="The mental model this whole app is built on."
    >
      <Text variant="body">
        React is a library for building UIs out of small, composable pieces
        called components. A component is a plain function that takes data
        (props) and returns what should appear on screen (JSX). When its data
        changes, React re-runs the function and updates only what changed.
      </Text>
      <Text variant="small" tone="muted">
        In React Native the same model drives native views — you write the
        same components, the same hooks, the same mental model; only the
        primitive tags differ (see the next card).
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. React vs React Native                                            */
/* ------------------------------------------------------------------ */

const RN_MAPPING: ReadonlyArray<readonly [string, string, string]> = [
  ['<div>', '<View>', 'flexbox container (the layout primitive)'],
  ['<p>, <span>', '<Text>', 'ALL text MUST live inside <Text>'],
  ['onClick', 'onPress', 'touch is the primary input'],
  ['CSS / className', 'StyleSheet', 'no CSS; styles are plain JS objects'],
  ['<img>', '<Image>', 'source is a uri or required asset'],
  ['<input>', '<TextInput>', 'controlled via value + onChangeText'],
];

function ReactVsRnCard() {
  return (
    <Section
      title="React vs React Native"
      explanation="The same React — different host primitives. Web renders HTML elements; RN renders native views. Learn the React concepts once, then map the tags. This app uses the RN-native set throughout."
    >
      <Box gap="xs">
        {RN_MAPPING.map(([web, rn, note]) => (
          <Box key={web} gap="xxs">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Code>{web}</Code>
              <Text variant="caption" tone="muted">
                →
              </Text>
              <Code tone="primary">{rn}</Code>
            </Box>
            <Text variant="caption" tone="muted">
              {note}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. JSX & components                                                  */
/* ------------------------------------------------------------------ */

function JsxAndComponentsCard() {
  return (
    <Section
      title="JSX & function components"
      explanation="JSX looks like HTML but is syntactic sugar for function calls. A function component is just a function returning JSX. Expressions in {braces} are evaluated as JS."
    >
      <Box gap="xs">
        <Text variant="body">
          Hello — this entire screen is one function component rendering many
          smaller ones. Each card you see is itself a function component.
        </Text>
        <Code>{`function Greeting({ name }: { name: string }) {
  return <Text>Hello, {name}!</Text>;
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Props (passing, destructuring, children)                          */
/* ------------------------------------------------------------------ */

/** Local demo child — receives props and `children`. */
function Badge({ label, children }: { label: string; children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <Box
      row
      center
      gap="sm"
      p="sm"
      radius="md"
      bg="surfaceVariant"
      style={{ borderWidth: 1, borderColor: theme.colors.border }}
    >
      <Text variant="small" tone="primary" style={{ fontWeight: '600' }}>
        {label}
      </Text>
      <Text variant="small">{children}</Text>
    </Box>
  );
}

function PropsCard() {
  return (
    <Section
      title="Props: passing, destructuring, children"
      explanation="Props are read-only inputs passed from a parent to a child. Destructure them in the signature. `children` is a special prop letting a parent inject arbitrary JSX between the opening and closing tags."
    >
      <Box gap="xs">
        <Badge label="DEMO">This text was passed as children.</Badge>
        <Badge label="DEMO">So was this — same component, different content.</Badge>
        <Text variant="caption" tone="muted">
          The parent (this card) owns the data; the child just renders what it's
          given. Props flow down.
        </Text>
        <Code>{`function Badge({ label, children }: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Box>
      <Text>{label}</Text>
      {children}
    </Box>
  );
}

// Parent passes props AND JSX between the tags:
<Badge label="DEMO">This text is children.</Badge>`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. useState — counter                                               */
/* ------------------------------------------------------------------ */

function UseStateCard() {
  const { count, decrement, increment, reset } = useCounterState();
  return (
    <Section
      title="useState — component memory"
      explanation="State is data a component owns and can change over time. Calling the setter queues a re-render with the new value. Use state for data that changes in response to user input (props are for data handed down; state is for data a component controls)."
    >
      <Box gap="sm" center>
        <Text variant="h2" tone="primary">
          {count}
        </Text>
        <Box row gap="sm" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button title="− Decrement" onPress={decrement} />
          <Button title="Reset" variant="outline" onPress={reset} />
          <Button title="+ Increment" onPress={increment} />
        </Box>
        <Text variant="caption" tone="muted">
          Updaters `setCount((c) =&gt; c + 1)` are preferred — they always
          compute from the latest value.
        </Text>
        <Code>{`function useCounterState() {
  const [count, setCount] = useState(0);
  const decrement = () => setCount((c) => c - 1);
  const increment = () => setCount((c) => c + 1);
  const reset = () => setCount(0);
  return { count, decrement, increment, reset };
}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Controlled input                                                 */
/* ------------------------------------------------------------------ */

function ControlledInputCard() {
  const { theme } = useTheme();
  const { text, setText, over } = useControlledInput();
  return (
    <Section
      title="Controlled input"
      explanation="A controlled input's value is driven by state. Each keystroke updates state, which re-renders the input with the new value — making the component the single source of truth. Ideal for validation, formatting, or derived UI."
    >
      <Box gap="sm">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type here…"
          placeholderTextColor={theme.colors.textMuted}
          style={StyleSheet.flatten([
            styles.input,
            {
              borderColor: over ? theme.colors.danger : theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.background,
            },
          ])}
        />
        <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
          <Text variant="body">{text.length === 0 ? '—' : text}</Text>
          <Text variant="small" tone={over ? 'danger' : 'muted'}>
            {text.length}/{CONTROLLED_INPUT_MAX}
          </Text>
        </Box>
        <Text variant="caption" tone="muted">
          The echo and the counter are both derived from the same single piece
          of state — one source of truth.
        </Text>
        <Code>{`function useControlledInput() {
  const [text, setText] = useState('');
  const over = text.length > 20; // derived, not stored
  return { text, setText, over };
}

// The input's value is driven by state:
<TextInput value={text} onChangeText={setText} />`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Conditional rendering                                            */
/* ------------------------------------------------------------------ */

function ConditionalRenderingCard() {
  const { on, toggle } = useConditionalToggle();
  return (
    <Section
      title="Conditional rendering"
      explanation="Render different JSX based on state. `&&` shows something only when true; the ternary `a ? b : c` picks between two branches. Avoid nesting ternaries — extract a component instead."
    >
      <Box gap="sm">
        <Button
          title={on ? 'Switch OFF' : 'Switch ON'}
          variant={on ? 'filled' : 'outline'}
          onPress={toggle}
        />
        <Box gap="xs">
          {on ? (
            <Text variant="body" tone="primary">
              The light is ON (ternary branch).
            </Text>
          ) : (
            <Text variant="body" tone="muted">
              The light is OFF (ternary branch).
            </Text>
          )}
          {on && (
            <Text variant="caption" tone="muted">
              This sentence appears via `{`on && <Text/>`}` — only when on.
            </Text>
          )}
        </Box>
        <Code>{`function useConditionalToggle() {
  const [on, setOn] = useState(false);
  const toggle = () => setOn((v) => !v);
  return { on, toggle };
}

// Ternary: pick one of two branches:
{on ? <On /> : <Off />}

// AND: show only when truthy:
{on && <Details />}`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Lists — .map + key                                               */
/* ------------------------------------------------------------------ */

function ListsCard() {
  const { tasks, add, remove } = useTaskList();
  return (
    <Section
      title="Lists: .map + key"
      explanation="Render a collection by mapping data to elements. A stable, unique `key` lets React match items across renders so it can add/remove efficiently without re-creating siblings. Avoid using the array index as key when items can reorder."
    >
      <Box gap="xs">
        {tasks.length === 0 ? (
          <Text variant="small" tone="muted">
            List is empty — add a task.
          </Text>
        ) : (
          tasks.map((t: Task) => (
            <Box
              key={t.id}
              row
              center
              gap="sm"
              p="sm"
              radius="sm"
              bg="surfaceVariant"
              style={{ justifyContent: 'space-between' }}
            >
              <Text variant="small">
                #{t.id} — {t.label}
              </Text>
              <Button title="Remove" variant="ghost" onPress={() => remove(t.id)} />
            </Box>
          ))
        )}
        <Box mt="xs">
          <Button title="+ Add task" onPress={add} />
        </Box>
        <Code>{`tasks.map((t: Task) => (
  <Box key={t.id}>
    <Text>#{t.id} - {t.label}</Text>
  </Box>
))
// key must be stable + unique (not the array index) so React can
// match items across renders without re-creating siblings.`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 9. useEffect with cleanup                                           */
/* ------------------------------------------------------------------ */

function UseEffectCard() {
  const { running, ticks, toggle, reset } = useEffectTimer();
  return (
    <Section
      title="useEffect — sync to the outside world"
      explanation="Effects run after render to reach outside React: subscriptions, timers, fetching. Return a cleanup function that tears down whatever you set up. It re-runs whenever a value in the dependency array changes."
    >
      <Box gap="sm" center>
        <Text variant="h2" tone="primary">
          {ticks}s
        </Text>
        <Box row gap="sm">
          <Button
            title={running ? 'Stop' : 'Start'}
            variant={running ? 'outline' : 'filled'}
            onPress={toggle}
          />
          <Button title="Reset" variant="ghost" onPress={reset} />
        </Box>
        <Text variant="caption" tone="muted">
          Stopping or unmounting clears the interval via the returned cleanup —
          no leaked timers.
        </Text>
        <Code>{`useEffect(() => {
  if (!running) return;
  const id = setInterval(() => setTicks((t) => t + 1), 1000);
  return () => clearInterval(id); // cleanup on re-run/unmount
}, [running]);`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 10. useMemo + useRef                                                */
/* ------------------------------------------------------------------ */

function UseMemoUseRefCard() {
  const {
    size,
    unrelated,
    renderCount,
    sum,
    decrementSize,
    incrementSize,
    bumpUnrelated,
  } = useMemoUseRefDemo();
  return (
    <Section
      title="useMemo + useRef"
      explanation="useMemo caches a computed value between renders until a dependency changes — useful for expensive work. useRef holds a mutable value that survives renders WITHOUT triggering re-renders (handy for timers, DOM-ish refs, or render counters)."
    >
      <Box gap="sm">
        <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
          <Text variant="small" tone="muted">
            Memoized sum(size={size}):{' '}
          </Text>
          <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
            {sum}
          </Text>
        </Box>
        <Box row gap="sm">
          <Button title="size −50" variant="outline" onPress={decrementSize} />
          <Button title="size +50" variant="outline" onPress={incrementSize} />
        </Box>
        <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
          <Text variant="small" tone="muted">
            Unrelated state: {unrelated}
          </Text>
          <Button title="bump unrelated" variant="ghost" onPress={bumpUnrelated} />
        </Box>
        <Text variant="caption" tone="muted">
          Render #{renderCount} (held in a ref, no re-render). Bumping
          "unrelated" re-renders but the expensive sum is reused from the cache —
          only changing `size` recomputes it.
        </Text>
        <Code>{`const renderCount = useRef(0);
renderCount.current += 1; // survives renders, NO re-render

// Recomputed only when 'size' changes, not on every render:
const sum = useMemo(() => expensiveSum(size), [size]);`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 11. useReducer (brief)                                              */
/* ------------------------------------------------------------------ */

function UseReducerCard() {
  const { count, decrement, reset, increment } = useReducerCounter();
  return (
    <Section
      title="useReducer (brief)"
      explanation="When one event changes several related pieces of state, or when the next state depends on a complex set of actions, a reducer centralizes the transitions: (state, action) → state. The full treatment lives on the State Management screen."
    >
      <Box gap="sm" center>
        <Text variant="h2" tone="primary">
          {count}
        </Text>
        <Box row gap="sm">
          <Button title="−" onPress={decrement} />
          <Button title="Reset" variant="outline" onPress={reset} />
          <Button title="+" onPress={increment} />
        </Box>
        <Text variant="caption" tone="muted">
          All transitions live in `counterReducer`; the component just dispatches
          intents.
        </Text>
        <Code>{`function counterReducer(state: number, action: CounterAction) {
  switch (action.type) {
    case 'increment': return state + 1;
    case 'decrement': return state - 1;
    case 'reset':     return 0;
  }
}

const [count, dispatch] = useReducer(counterReducer, 0);
dispatch({ type: 'increment' });`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 12. Custom hook                                                     */
/* ------------------------------------------------------------------ */

function CustomHookCard() {
  const [liked, toggleLiked] = useToggle(false);
  const [bookmarked, toggleBookmarked] = useToggle(false);
  return (
    <Section
      title="Custom hooks"
      explanation="Extract reusable stateful logic into a function named `useX`. It composes the built-in hooks. Below, two independent booleans share the same `useToggle` logic — no duplication."
    >
      <Box gap="sm">
        <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
          <Text variant="body">{liked ? '❤️ Liked' : '♡ Not liked'}</Text>
          <Button
            title={liked ? 'Unlike' : 'Like'}
            variant={liked ? 'filled' : 'outline'}
            onPress={toggleLiked}
          />
        </Box>
        <Box row gap="sm" center style={{ justifyContent: 'space-between' }}>
          <Text variant="body">
            {bookmarked ? '🔖 Bookmarked' : '○ Not bookmarked'}
          </Text>
          <Button
            title={bookmarked ? 'Remove' : 'Bookmark'}
            variant={bookmarked ? 'filled' : 'outline'}
            onPress={toggleBookmarked}
          />
        </Box>
        <Text variant="caption" tone="muted">
          Same hook, two independent states — each call owns its own value.
        </Text>
        <Code>{`function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = () => setValue((v) => !v);
  return [value, toggle] as const;
}

// Two independent booleans, same reusable logic:
const [liked, toggleLiked] = useToggle(false);
const [bookmarked, toggleBookmarked] = useToggle(false);`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 13. Composition & lifting state                                    */
/* ------------------------------------------------------------------ */

function CompositionCard() {
  return (
    <Section
      title="Composition & lifting state"
      explanation="When two siblings need the same data, lift that state to their nearest common parent and pass it down as props. Prefer composition (passing components/children) over deep prop-drilling or inheritance — React has no component inheritance."
    >
      <Box gap="xs">
        <Text variant="body">
          Pattern: child A changes state → parent owns it → child B reads it via
          props. Data flows down; events flow up via callbacks.
        </Text>
        <Code>{`<Parent>        // owns 'selected'
  <Picker onSelect={setSelected} />
  <Summary value={selected} />
</Parent>`}</Code>
        <Text variant="caption" tone="muted">
          Controlled vs uncontrolled: a controlled component receives its value
          from props (like the TextInput above); an uncontrolled one keeps its
          own internal state. Prefer controlled for predictable, testable UIs.
        </Text>
      </Box>
    </Section>
  );
}
const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
