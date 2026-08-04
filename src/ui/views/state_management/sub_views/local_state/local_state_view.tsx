import { type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { ScreenScaffold } from '../../../../components/screen-scaffold';
import { Box, Button, Text, useTheme } from '../../../../design-system';
import { Section, Code, Pill } from '../../../../components';
import {
  CounterActionType,
  FavoritesContext,
  useCounterDemo,
  useFavorites,
  useFavoritesState,
} from './local_state_hooks';

/**
 * LocalStateView — a dumb structure. All state/behaviour lives in the co-located
 * hooks (local_state_hooks.ts); this file only renders.
 *
 * Covers the BUILT-IN React primitives for state that lives inside one
 * component tree: (a) LOCAL state via useState + useReducer, and (b) SHARED
 * client state via React Context. Both ship a LIVE, interactive demo built with
 * this app's design-system primitives. No `any`; strict + erasableSyntaxOnly.
 */
export function LocalStateView() {
  return (
    <ScreenScaffold title="Local State" subtitle="useState, useReducer & Context — the built-in primitives.">
      <LocalStateCard />
      <ContextCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* LOCAL state — useState + useReducer (LIVE)                       */
/* ------------------------------------------------------------------ */

function LocalStateCard() {
  const { count, dispatch, step, setStep } = useCounterDemo();

  return (
    <Section
      title="Local state — useState & useReducer"
      explanation="State that only ONE component (and maybe its children) needs. useState is the daily driver; useReducer shines when the next state depends on a typed action (a finite-state machine) — several actions, one transition function. This is exactly the pattern this app's own use-posts hook uses."
    >
      <Box gap="sm">
        <Box row gap="sm" style={{ alignItems: 'center' }}>
          <Text variant="small" tone="muted">
            count =
          </Text>
          <Text variant="h2" tone="primary" style={{ fontWeight: '700' }}>
            {count}
          </Text>
        </Box>

        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button
            title="dispatch increment"
            variant="filled"
            onPress={() => dispatch({ type: CounterActionType.Increment })}
          />
          <Button
            title="dispatch decrement"
            variant="outline"
            onPress={() => dispatch({ type: CounterActionType.Decrement })}
          />
          <Button
            title={`addBy(step=${step})`}
            variant="outline"
            onPress={() => dispatch({ type: CounterActionType.AddBy, by: step })}
          />
          <Button
            title="reset"
            variant="ghost"
            onPress={() => dispatch({ type: CounterActionType.Reset })}
          />
        </Box>

        <Box row gap="sm" style={{ alignItems: 'center' }}>
          <Button title="step +1" variant="ghost" onPress={() => setStep((s) => s + 1)} />
          <Pill tone="primary">{`useState step = ${step}`}</Pill>
        </Box>

        <Code>{`// const-object + literal union (this project's pattern, NOT enum)
const CounterActionType = {
  Increment: 'increment', Decrement: 'decrement',
  Reset: 'reset', AddBy: 'addBy',
} as const;
type CounterAction =
  | { type: typeof CounterActionType.Increment }
  | { type: typeof CounterActionType.AddBy; by: number };

const [count, dispatch] = useReducer(counterReducer, 0);
dispatch({ type: CounterActionType.AddBy, by: 5 });`}</Code>
        <Text variant="caption" tone="muted">
          Rule of thumb: start with useState; promote to useReducer when you have
          3+ related setters, when state transitions have rules, or when you want
          the state machine to be testable in isolation (the reducer is a pure
          function — easy to unit test). This app's{' '}
          <Text style={{ fontFamily: 'monospace' }}>usePosts</Text> hook is a
          real example: an idle/loading/loaded/error machine driven by a reducer.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* SHARED client state — Context (LIVE)                             */
/* ------------------------------------------------------------------ */

const FAV_ITEMS: ReadonlyArray<{ id: number; title: string }> = [
  { id: 1, title: 'State is just data' },
  { id: 2, title: 'Pick the tool by the shape' },
  { id: 3, title: 'Server state ≠ client state' },
];

/** The provider component — state lives in the co-located useFavoritesState hook. */
function FavoritesProvider({ children }: { children: ReactNode }) {
  const value = useFavoritesState();
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

/** A sibling that WRITES to the shared state. */
function FavoritesPicker() {
  const { ids, toggle } = useFavorites();
  const { theme } = useTheme();
  return (
    <Box gap="xs">
      {FAV_ITEMS.map((item) => {
        const fav = ids.includes(item.id);
        return (
          <Pressable
            key={item.id}
            onPress={() => toggle(item.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: theme.spacing.sm,
              borderRadius: theme.radii.sm,
              borderWidth: 1,
              borderColor: fav ? theme.colors.primary : theme.colors.border,
              backgroundColor: fav ? theme.colors.primary : theme.colors.background,
            }}
          >
            <Text
              variant="small"
              tone={fav ? 'onPrimary' : 'default'}
            >
              {item.title}
            </Text>
            <Text
              variant="caption"
              tone={fav ? 'onPrimary' : 'muted'}
              style={{ fontWeight: '600' }}
            >
              {fav ? '★ fav' : '☆ tap'}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
}

/** A DIFFERENT sibling that only READS the shared state — no prop-drilling. */
function FavoritesBadge() {
  const { count } = useFavorites();
  return (
    <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" center>
      <Text variant="h3" tone="primary" style={{ fontWeight: '700' }}>
        {count}
      </Text>
      <Text variant="small" tone="muted">
        favorites (sibling reads via context)
      </Text>
    </Box>
  );
}

function ContextCard() {
  return (
    <Section
      title="Shared client state — Context"
      explanation="When several components on different branches need the same client-side value (cart, theme, auth), prop-drilling is painful. React's built-in Context lets a Provider hold the value and any descendant read/update it. This app's own ThemeProvider is a production Context example."
    >
      <FavoritesProvider>
        <Box gap="sm">
          <FavoritesBadge />
          <FavoritesPicker />
          <Text variant="caption" tone="muted">
            Tap items: the badge (a separate sibling) updates instantly through
            context — neither component was passed props. The provider owns the
            state; both consumers reach it via{' '}
            <Text style={{ fontFamily: 'monospace' }}>useContext</Text>.
          </Text>
          <Code>{`const FavoritesContext = createContext<FavoritesValue | null>(null);

function FavoritesProvider({ children }) {
  const [ids, setIds] = useState<number[]>([]);
  // ... build value, memoized
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

// any descendant:
const { toggle, count } = useContext(FavoritesContext);`}</Code>
          <Text variant="caption" tone="muted">
            Caveat: when the context value changes, EVERY consumer re-renders,
            even ones that only use one field. For high-frequency or large trees,
            split contexts or reach for Zustand (next). Context is best for
            low-frequency, app-wide values (theme, locale, auth session).
          </Text>
        </Box>
      </FavoritesProvider>
    </Section>
  );
}
