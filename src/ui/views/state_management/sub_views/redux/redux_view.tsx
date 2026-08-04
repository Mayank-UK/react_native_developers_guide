import { ScreenScaffold } from '../../../../components/screen-scaffold';
import { Box, Button, Text } from '../../../../design-system';
import { Section, Code } from '../../../../components';
import {
  ReduxProvider,
  demoStore,
  useReduxControls,
  useReduxCountDisplay,
} from './redux_hooks';

/**
 * ReduxView — a dumb structure. All state/behaviour lives in the co-located
 * hooks (redux_hooks.ts); this file only renders.
 *
 * Redux Toolkit + react-redux demo. The <Provider store={demoStore}> wraps ONLY
 * this view's demo subtree — NOT _layout, NOT the section hub. The app itself
 * remains a DI-service-locator + usecases + useReducer-hook app; Redux is a
 * teaching artifact scoped to this subtree (see the decision log: "State libs
 * added for the state-management teaching screen"). No `any`; strict +
 * erasableSyntaxOnly-clean.
 */
export function ReduxView() {
  return (
    <ScreenScaffold title="Redux Toolkit" subtitle="A single scoped store + unidirectional flow.">
      <ReduxCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* SHARED client state — Redux Toolkit + react-redux (LIVE)         */
/* ------------------------------------------------------------------ */

function ReduxCountDisplay() {
  const { count } = useReduxCountDisplay();
  return (
    <Box p="sm" radius="md" bg="surfaceVariant" row gap="sm" center>
      <Text variant="h3" tone="primary" style={{ fontWeight: '700' }}>
        {count}
      </Text>
      <Text variant="caption" tone="muted">
        {'useSelector(state => state.demoCounter.count)'}
      </Text>
    </Box>
  );
}

function ReduxControls() {
  const { increment, decrement, addBy5 } = useReduxControls();
  return (
    <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
      <Button title="dispatch(incremented())" variant="filled" onPress={increment} />
      <Button title="dispatch(decremented())" variant="outline" onPress={decrement} />
      <Button title="dispatch(addedBy(5))" variant="outline" onPress={addBy5} />
    </Box>
  );
}

function ReduxCard() {
  return (
    <Section
      title="Shared client state — Redux Toolkit + react-redux"
      explanation="Redux is the most opinionated client-state library: a single global store, actions → reducer → next state, with time-travel debugging. Redux Toolkit (RTK) is the modern, official, low-boilerplate way to write it. It shines for LARGE apps with many engineers who want strict unidirectional flow and tooling. Here the store is scoped to this subtree via a <Provider>."
    >
      {/* Provider scoped to this view's demo only — NOT in _layout */}
      <ReduxProvider store={demoStore}>
        <Box gap="sm">
          <ReduxCountDisplay />
          <ReduxControls />
          <Code>{`import { configureStore, createSlice } from '@reduxjs/toolkit';
import { useSelector, useDispatch, Provider } from 'react-redux';

const slice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    incremented(state) { state.count += 1; }, // Immer: safe to "mutate"
  },
});
const store = configureStore({ reducer: { counter: slice.reducer } });

// inside a component under <Provider store={store}>:
const count = useSelector((s) => s.counter.count);
const dispatch = useDispatch();
dispatch(slice.actions.incremented());`}</Code>
          <Text variant="caption" tone="muted">
            Zustand vs Redux: Zustand is minimal (a hook per store, selectors,
            no provider). Redux Toolkit gives you a single source of truth, the
            DevTools time-travel, middleware (thunk/saga), and stricter
            conventions — at the cost of more ceremony. For most apps today,
            Zustand + TanStack Query covers what Redux used to be brought in
            for; reach for Redux when the team specifically wants its model.
          </Text>
        </Box>
      </ReduxProvider>
    </Section>
  );
}
